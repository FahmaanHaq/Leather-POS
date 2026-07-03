/* =========================================================================
   Billing / POS Stored Procedures (FR-POS)
   ========================================================================= */

/* -------------------------------------------------------------------------
   TVP types for the line-item and split-payment grids submitted from the
   Billing screen in a single atomic call.
   ------------------------------------------------------------------------- */
CREATE TYPE Sales.InvoiceLineType AS TABLE (
    ItemID          INT,
    UOMID           INT,
    Quantity        DECIMAL(18,3),
    UnitPrice       DECIMAL(18,2),
    Discount        DECIMAL(18,2)
);
GO

-- Flattened: mode-specific columns are NULL unless PaymentMode matches them.
CREATE TYPE Sales.PaymentType AS TABLE (
    PaymentMode     TINYINT,          -- 1=Cash,2=Card,3=Cheque,4=Credit
    Amount          DECIMAL(18,2),
    TenderedAmount  DECIMAL(18,2) NULL,
    ChangeGiven     DECIMAL(18,2) NULL,
    ChequeNo        NVARCHAR(50) NULL,
    Bank            NVARCHAR(100) NULL,
    Branch          NVARCHAR(100) NULL,
    ChequeDate      DATE NULL,
    CardType        NVARCHAR(30) NULL,
    Last4Digits     CHAR(4) NULL,
    ApprovalCode    NVARCHAR(50) NULL,
    TerminalID      NVARCHAR(50) NULL
);
GO

CREATE TYPE Sales.ReturnLineType AS TABLE (
    InvoiceLineID   INT,
    QuantityToReturn DECIMAL(18,3)
);
GO

/* -------------------------------------------------------------------------
   Invoice numbering (FR-POS-09) - sequential per Group per financial year.
   Called only from inside SaveInvoice's transaction, with UPDLOCK/HOLDLOCK
   to serialize concurrent sales and prevent duplicate numbers.
   ------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE Sales.GetNextInvoiceNumber
    @GroupID INT,
    @InvoiceDate DATETIME,
    @InvoiceNo NVARCHAR(50) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @FYStartMonth TINYINT = ISNULL((SELECT FinancialYearStartMonth FROM Administration.Groups WHERE GroupID = @GroupID), 1);
    DECLARE @FY INT = YEAR(DATEADD(MONTH, 1 - @FYStartMonth, @InvoiceDate));
    DECLARE @NewSeq INT;

    IF EXISTS (SELECT 1 FROM Administration.InvoiceSequence WITH (UPDLOCK, HOLDLOCK) WHERE GroupID = @GroupID AND FinancialYear = @FY)
    BEGIN
        UPDATE Administration.InvoiceSequence
        SET LastSequence = LastSequence + 1
        WHERE GroupID = @GroupID AND FinancialYear = @FY;

        SELECT @NewSeq = LastSequence FROM Administration.InvoiceSequence WHERE GroupID = @GroupID AND FinancialYear = @FY;
    END
    ELSE
    BEGIN
        INSERT INTO Administration.InvoiceSequence (GroupID, FinancialYear, LastSequence)
        VALUES (@GroupID, @FY, 1);
        SET @NewSeq = 1;
    END

    -- Fixed format for now (INV-{FY}-{6-digit sequence}); NumberFormat column
    -- is reserved for a future configurable-template enhancement.
    SET @InvoiceNo = 'INV-' + CAST(@FY AS VARCHAR(4)) + '-' + RIGHT('000000' + CAST(@NewSeq AS VARCHAR(6)), 6);
END
GO

/* -------------------------------------------------------------------------
   SearchItemsForBilling (FR-POS-01) - fast lookup by code/name/barcode for
   the Billing screen's item search box.
   ------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE Sales.SearchItemsForBilling
    @GroupID INT,
    @SearchTerm NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP (50)
        i.ItemID, i.ItemCode, i.ItemName, i.Barcode, i.BaseUOMID, u.UOMCode,
        i.SellingPrice,
        ISNULL((SELECT SUM(CASE WHEN TransactionType = 1 THEN Quantity
                                 WHEN TransactionType = 2 THEN -Quantity
                                 ELSE Quantity END)
                FROM Inventory.StockLedger sl WHERE sl.ItemID = i.ItemID), 0) AS OnHandQuantity
    FROM Inventory.Items i
    JOIN Inventory.UOM u ON u.UOMID = i.BaseUOMID
    WHERE i.GroupID = @GroupID AND i.IsActive = 1
      AND (i.ItemCode LIKE @SearchTerm + '%' OR i.ItemName LIKE '%' + @SearchTerm + '%' OR i.Barcode = @SearchTerm)
    ORDER BY
        CASE WHEN i.Barcode = @SearchTerm THEN 0
             WHEN i.ItemCode LIKE @SearchTerm + '%' THEN 1
             ELSE 2 END,
        i.ItemName;
END
GO

/* -------------------------------------------------------------------------
   SaveInvoice - the single transactional entry point for the Billing screen.
   Handles both Hold (draft, no stock/ledger effect) and Complete (real sale)
   in one call, since the UI flow is: build lines -> either "Hold" or "Pay &
   Complete". Held bills can be re-saved (edited) by passing the same
   @InvoiceID back in.

   Guard result codes:
     -1  Payment total does not equal invoice total (only checked when completing)
     -2  Insufficient stock on at least one line (only checked when completing)
     -3  Credit limit would be exceeded by the Credit-mode portion of payment
     -4  A Credit-mode or Debt payment was submitted for a Walk-in customer
         (or with no customer selected at all)
     >0  InvoiceID (whether held or completed)
   ------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE Sales.SaveInvoice
    @GroupID INT,
    @InvoiceID INT = NULL,             -- pass in to update an existing Held invoice
    @CustomerID INT = NULL,
    @InvoiceDate DATETIME,
    @IsHeld BIT,
    @PassToAccounting BIT = 1,
    @Lines Sales.InvoiceLineType READONLY,
    @Payments Sales.PaymentType READONLY,
    @CreatedBy INT,
    @Result INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM @Lines)
    BEGIN
        SET @Result = -5; -- an invoice must have at least one line
        RETURN;
    END

    DECLARE @SubTotal DECIMAL(18,2), @DiscountTotal DECIMAL(18,2), @TotalAmount DECIMAL(18,2);
    SELECT
        @SubTotal = SUM(Quantity * UnitPrice),
        @DiscountTotal = SUM(Discount),
        @TotalAmount = SUM(Quantity * UnitPrice) - SUM(Discount)
    FROM @Lines;

    DECLARE @CustomerType TINYINT = NULL;
    IF @CustomerID IS NOT NULL
        SELECT @CustomerType = CustomerType FROM Sales.Customers WHERE CustomerID = @CustomerID;

    -- FR-POS-04/FR-CUS: Credit-mode payment requires a Regular (credit-eligible) customer
    IF EXISTS (SELECT 1 FROM @Payments WHERE PaymentMode = 4) AND (@CustomerID IS NULL OR @CustomerType <> 1)
    BEGIN
        SET @Result = -4;
        RETURN;
    END

    BEGIN TRANSACTION;

    BEGIN TRY
        IF @IsHeld = 1
        BEGIN
            -- Held bills never touch stock, ledger, or invoice numbering.
            IF @InvoiceID IS NULL
            BEGIN
                INSERT INTO Sales.Invoices (GroupID, CustomerID, InvoiceDate, Status, SubTotal, DiscountTotal, TotalAmount, PassToAccounting, CreatedBy, CreatedDate)
                VALUES (@GroupID, @CustomerID, @InvoiceDate, 1, @SubTotal, @DiscountTotal, @TotalAmount, @PassToAccounting, @CreatedBy, GETDATE());
                SET @InvoiceID = SCOPE_IDENTITY();
            END
            ELSE
            BEGIN
                UPDATE Sales.Invoices
                SET CustomerID = @CustomerID, InvoiceDate = @InvoiceDate, SubTotal = @SubTotal,
                    DiscountTotal = @DiscountTotal, TotalAmount = @TotalAmount,
                    ModifiedBy = @CreatedBy, ModifiedDate = GETDATE()
                WHERE InvoiceID = @InvoiceID AND Status = 1;

                DELETE FROM Sales.InvoiceLines WHERE InvoiceID = @InvoiceID;
            END

            INSERT INTO Sales.InvoiceLines (GroupID, InvoiceID, ItemID, UOMID, Quantity, UnitPrice, Discount, LineTotal, CreatedDate)
            SELECT @GroupID, @InvoiceID, ItemID, UOMID, Quantity, UnitPrice, Discount, (Quantity * UnitPrice) - Discount, GETDATE()
            FROM @Lines;

            COMMIT TRANSACTION;
            SET @Result = @InvoiceID;
            RETURN;
        END

        -- ===================== Completing the sale =====================

        DECLARE @PaymentTotal DECIMAL(18,2) = ISNULL((SELECT SUM(Amount) FROM @Payments), 0);
        IF ABS(@PaymentTotal - @TotalAmount) > 0.01
        BEGIN
            ROLLBACK TRANSACTION;
            SET @Result = -1;
            RETURN;
        END

        -- Stock availability guard (FR-ITM-07 / prevents overselling)
        IF EXISTS (
            SELECT 1
            FROM @Lines l
            CROSS APPLY (
                SELECT ISNULL(SUM(CASE WHEN TransactionType = 1 THEN Quantity
                                        WHEN TransactionType = 2 THEN -Quantity
                                        ELSE Quantity END), 0) AS OnHand
                FROM Inventory.StockLedger sl WHERE sl.ItemID = l.ItemID
            ) stock
            WHERE stock.OnHand < l.Quantity
        )
        BEGIN
            ROLLBACK TRANSACTION;
            SET @Result = -2;
            RETURN;
        END

        -- Credit limit guard (only the Credit-mode portion of this sale counts)
        DECLARE @CreditPortion DECIMAL(18,2) = ISNULL((SELECT SUM(Amount) FROM @Payments WHERE PaymentMode = 4), 0);
        IF @CreditPortion > 0
        BEGIN
            DECLARE @CreditLimit DECIMAL(18,2) = (SELECT CreditLimit FROM Sales.Customers WHERE CustomerID = @CustomerID);
            DECLARE @CurrentBalance DECIMAL(18,2) = ISNULL((
                SELECT TOP 1 Balance FROM Sales.CustomerLedger WHERE CustomerID = @CustomerID ORDER BY LedgerID DESC
            ), 0);

            IF @CreditLimit IS NOT NULL AND (@CurrentBalance + @CreditPortion) > @CreditLimit
            BEGIN
                ROLLBACK TRANSACTION;
                SET @Result = -3;
                RETURN;
            END
        END

        DECLARE @InvoiceNo NVARCHAR(50);
        EXEC Sales.GetNextInvoiceNumber @GroupID = @GroupID, @InvoiceDate = @InvoiceDate, @InvoiceNo = @InvoiceNo OUTPUT;

        IF @InvoiceID IS NULL
        BEGIN
            INSERT INTO Sales.Invoices (GroupID, InvoiceNo, CustomerID, InvoiceDate, Status, SubTotal, DiscountTotal, TotalAmount, PassToAccounting, CreatedBy, CreatedDate)
            VALUES (@GroupID, @InvoiceNo, @CustomerID, @InvoiceDate, 2, @SubTotal, @DiscountTotal, @TotalAmount, @PassToAccounting, @CreatedBy, GETDATE());
            SET @InvoiceID = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            UPDATE Sales.Invoices
            SET InvoiceNo = @InvoiceNo, CustomerID = @CustomerID, InvoiceDate = @InvoiceDate, Status = 2,
                SubTotal = @SubTotal, DiscountTotal = @DiscountTotal, TotalAmount = @TotalAmount,
                ModifiedBy = @CreatedBy, ModifiedDate = GETDATE()
            WHERE InvoiceID = @InvoiceID;

            DELETE FROM Sales.InvoiceLines WHERE InvoiceID = @InvoiceID;
        END

        INSERT INTO Sales.InvoiceLines (GroupID, InvoiceID, ItemID, UOMID, Quantity, UnitPrice, Discount, LineTotal, CreatedDate)
        SELECT @GroupID, @InvoiceID, ItemID, UOMID, Quantity, UnitPrice, Discount, (Quantity * UnitPrice) - Discount, GETDATE()
        FROM @Lines;

        -- Decrement stock, one StockLedger "Out" row per line
        INSERT INTO Inventory.StockLedger (GroupID, ItemID, TransactionType, Quantity, RefTable, RefID, TransactionDate, CreatedBy, CreatedDate)
        SELECT @GroupID, ItemID, 2, Quantity, 'InvoiceLines', @InvoiceID, @InvoiceDate, @CreatedBy, GETDATE()
        FROM @Lines;

        -- Record each split-payment row, plus its mode-specific detail row
        DECLARE @PaymentID INT;
        DECLARE payment_cursor CURSOR LOCAL FAST_FORWARD FOR
            SELECT PaymentMode, Amount, TenderedAmount, ChangeGiven, ChequeNo, Bank, Branch, ChequeDate, CardType, Last4Digits, ApprovalCode, TerminalID
            FROM @Payments;

        DECLARE @pMode TINYINT, @pAmount DECIMAL(18,2), @pTendered DECIMAL(18,2), @pChange DECIMAL(18,2),
                @pChequeNo NVARCHAR(50), @pBank NVARCHAR(100), @pBranch NVARCHAR(100), @pChequeDate DATE,
                @pCardType NVARCHAR(30), @pLast4 CHAR(4), @pApproval NVARCHAR(50), @pTerminal NVARCHAR(50);

        OPEN payment_cursor;
        FETCH NEXT FROM payment_cursor INTO @pMode, @pAmount, @pTendered, @pChange, @pChequeNo, @pBank, @pBranch, @pChequeDate, @pCardType, @pLast4, @pApproval, @pTerminal;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            INSERT INTO Sales.Payments (GroupID, InvoiceID, CustomerID, PaymentMode, Amount, TenderedAmount, ChangeGiven, IsDebtSettlement, CreatedBy, CreatedDate)
            VALUES (@GroupID, @InvoiceID, @CustomerID, @pMode, @pAmount, @pTendered, @pChange, 0, @CreatedBy, GETDATE());
            SET @PaymentID = SCOPE_IDENTITY();

            IF @pMode = 3 -- Cheque
                INSERT INTO Sales.ChequeDetails (GroupID, PaymentID, ChequeNo, Bank, Branch, ChequeDate, Status)
                VALUES (@GroupID, @PaymentID, @pChequeNo, @pBank, @pBranch, @pChequeDate, 1);

            IF @pMode = 2 -- Card
                INSERT INTO Sales.CardDetails (GroupID, PaymentID, CardType, Last4Digits, ApprovalCode, TerminalID)
                VALUES (@GroupID, @PaymentID, @pCardType, @pLast4, @pApproval, @pTerminal);

            FETCH NEXT FROM payment_cursor INTO @pMode, @pAmount, @pTendered, @pChange, @pChequeNo, @pBank, @pBranch, @pChequeDate, @pCardType, @pLast4, @pApproval, @pTerminal;
        END
        CLOSE payment_cursor;
        DEALLOCATE payment_cursor;

        -- Only the Credit-mode portion creates customer debt
        IF @CreditPortion > 0
        BEGIN
            DECLARE @PriorBalance DECIMAL(18,2) = ISNULL((
                SELECT TOP 1 Balance FROM Sales.CustomerLedger WHERE CustomerID = @CustomerID ORDER BY LedgerID DESC
            ), 0);

            INSERT INTO Sales.CustomerLedger (GroupID, CustomerID, InvoiceID, DebitAmount, CreditAmount, Balance, TransactionDate, Narration, CreatedBy, CreatedDate)
            VALUES (@GroupID, @CustomerID, @InvoiceID, @CreditPortion, 0, @PriorBalance + @CreditPortion, @InvoiceDate, 'Invoice ' + @InvoiceNo, @CreatedBy, GETDATE());
        END

        COMMIT TRANSACTION;
        SET @Result = @InvoiceID;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

/* -------------------------------------------------------------------------
   ReturnInvoice (FR-POS-07) - full or partial reversal. Reverses stock and,
   where the original sale included a Credit-mode portion, reduces the
   customer's debt by the refunded amount (capped at that credit portion -
   any refund beyond that is assumed handed back as cash, which doesn't
   touch the ledger).
   ------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE Sales.ReturnInvoice
    @InvoiceID INT,
    @ReturnLines Sales.ReturnLineType READONLY,
    @CreatedBy INT,
    @Result INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM @ReturnLines)
    BEGIN
        SET @Result = -1; -- must specify at least one line to return
        RETURN;
    END

    DECLARE @GroupID INT, @CustomerID INT, @InvoiceDate DATETIME, @InvoiceNo NVARCHAR(50);
    SELECT @GroupID = GroupID, @CustomerID = CustomerID, @InvoiceDate = InvoiceDate, @InvoiceNo = InvoiceNo
    FROM Sales.Invoices WHERE InvoiceID = @InvoiceID AND Status IN (2, 4);

    IF @GroupID IS NULL
    BEGIN
        SET @Result = -2; -- invoice not found, or not in a returnable state
        RETURN;
    END

    -- Guard: can't return more than what's left on any line
    IF EXISTS (
        SELECT 1 FROM @ReturnLines rl
        JOIN Sales.InvoiceLines il ON il.InvoiceLineID = rl.InvoiceLineID AND il.InvoiceID = @InvoiceID
        WHERE rl.QuantityToReturn <= 0 OR rl.QuantityToReturn > (il.Quantity - il.QuantityReturned)
    )
    BEGIN
        SET @Result = -3;
        RETURN;
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @TotalRefund DECIMAL(18,2) = 0;

        -- Reverse stock: one StockLedger "In" row per returned line
        INSERT INTO Inventory.StockLedger (GroupID, ItemID, TransactionType, Quantity, RefTable, RefID, TransactionDate, CreatedBy, CreatedDate)
        SELECT @GroupID, il.ItemID, 1, rl.QuantityToReturn, 'InvoiceReturn', @InvoiceID, GETDATE(), @CreatedBy, GETDATE()
        FROM @ReturnLines rl
        JOIN Sales.InvoiceLines il ON il.InvoiceLineID = rl.InvoiceLineID;

        -- Proportional refund value per line, accumulated
        SELECT @TotalRefund = SUM((rl.QuantityToReturn / il.Quantity) * il.LineTotal)
        FROM @ReturnLines rl
        JOIN Sales.InvoiceLines il ON il.InvoiceLineID = rl.InvoiceLineID;

        UPDATE il
        SET il.QuantityReturned = il.QuantityReturned + rl.QuantityToReturn
        FROM Sales.InvoiceLines il
        JOIN @ReturnLines rl ON rl.InvoiceLineID = il.InvoiceLineID;

        DECLARE @FullyReturned BIT = CASE WHEN NOT EXISTS (
            SELECT 1 FROM Sales.InvoiceLines WHERE InvoiceID = @InvoiceID AND QuantityReturned < Quantity
        ) THEN 1 ELSE 0 END;

        UPDATE Sales.Invoices
        SET Status = CASE WHEN @FullyReturned = 1 THEN 3 ELSE 4 END,
            ModifiedBy = @CreatedBy, ModifiedDate = GETDATE()
        WHERE InvoiceID = @InvoiceID;

        -- Reduce debt by the refund, capped at how much Credit-mode money was
        -- actually taken on this invoice in the first place.
        DECLARE @CreditTaken DECIMAL(18,2) = ISNULL((
            SELECT SUM(Amount) FROM Sales.Payments WHERE InvoiceID = @InvoiceID AND PaymentMode = 4 AND IsVoided = 0
        ), 0);

        IF @CreditTaken > 0 AND @CustomerID IS NOT NULL
        BEGIN
            DECLARE @LedgerRefund DECIMAL(18,2) = CASE WHEN @TotalRefund > @CreditTaken THEN @CreditTaken ELSE @TotalRefund END;
            DECLARE @PriorBalance DECIMAL(18,2) = ISNULL((
                SELECT TOP 1 Balance FROM Sales.CustomerLedger WHERE CustomerID = @CustomerID ORDER BY LedgerID DESC
            ), 0);

            INSERT INTO Sales.CustomerLedger (GroupID, CustomerID, InvoiceID, DebitAmount, CreditAmount, Balance, TransactionDate, Narration, CreatedBy, CreatedDate)
            VALUES (@GroupID, @CustomerID, @InvoiceID, 0, @LedgerRefund, @PriorBalance - @LedgerRefund, GETDATE(), 'Return against ' + @InvoiceNo, @CreatedBy, GETDATE());
        END

        COMMIT TRANSACTION;
        SET @Result = @InvoiceID;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

/* -------------------------------------------------------------------------
   Retrieval procedures
   ------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE Sales.GetAllInvoices
    @GroupID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i.InvoiceID, i.InvoiceNo, i.CustomerID, c.Name AS CustomerName, i.InvoiceDate,
           i.Status, i.TotalAmount, i.PassToAccounting
    FROM Sales.Invoices i
    LEFT JOIN Sales.Customers c ON c.CustomerID = i.CustomerID
    WHERE i.GroupID = @GroupID AND i.Status <> 1
    ORDER BY i.InvoiceID DESC;
END
GO

CREATE OR ALTER PROCEDURE Sales.GetHeldInvoices
    @GroupID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i.InvoiceID, i.CustomerID, c.Name AS CustomerName, i.InvoiceDate, i.TotalAmount,
           (SELECT COUNT(*) FROM Sales.InvoiceLines il WHERE il.InvoiceID = i.InvoiceID) AS LineCount
    FROM Sales.Invoices i
    LEFT JOIN Sales.Customers c ON c.CustomerID = i.CustomerID
    WHERE i.GroupID = @GroupID AND i.Status = 1
    ORDER BY i.InvoiceID DESC;
END
GO

-- Multi-result-set: header, lines, payments (mirrors GetContainerByID's pattern)
CREATE OR ALTER PROCEDURE Sales.GetInvoiceByID
    @InvoiceID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT i.InvoiceID, i.GroupID, i.InvoiceNo, i.CustomerID, c.Name AS CustomerName,
           i.InvoiceDate, i.Status, i.SubTotal, i.DiscountTotal, i.TotalAmount, i.PassToAccounting
    FROM Sales.Invoices i
    LEFT JOIN Sales.Customers c ON c.CustomerID = i.CustomerID
    WHERE i.InvoiceID = @InvoiceID;

    SELECT il.InvoiceLineID, il.ItemID, it.ItemName, il.UOMID, u.UOMCode, il.Quantity,
           il.UnitPrice, il.Discount, il.LineTotal, il.QuantityReturned
    FROM Sales.InvoiceLines il
    JOIN Inventory.Items it ON it.ItemID = il.ItemID
    JOIN Inventory.UOM u ON u.UOMID = il.UOMID
    WHERE il.InvoiceID = @InvoiceID;

    SELECT p.PaymentID, p.PaymentMode, p.Amount, p.TenderedAmount, p.ChangeGiven, p.IsVoided,
           cd.ChequeNo, cd.Bank, cd.Branch, cd.ChequeDate, cd.Status AS ChequeStatus,
           ca.CardType, ca.Last4Digits, ca.ApprovalCode, ca.TerminalID
    FROM Sales.Payments p
    LEFT JOIN Sales.ChequeDetails cd ON cd.PaymentID = p.PaymentID
    LEFT JOIN Sales.CardDetails ca ON ca.PaymentID = p.PaymentID
    WHERE p.InvoiceID = @InvoiceID;
END
GO
