/* =========================================================================
   Payment Handling Stored Procedures (FR-PAY)
   ========================================================================= */

ALTER TABLE Sales.Customers ADD HasBouncedCheque BIT NOT NULL DEFAULT 0;
GO

/* -------------------------------------------------------------------------
   SaveDebtSettlement (FR-POS-04) - a payment purely against existing debt,
   independent of any new sale. InvoiceID is left NULL on the Payments row.
   ------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE Sales.SaveDebtSettlement
    @GroupID INT,
    @CustomerID INT,
    @PaymentMode TINYINT,
    @Amount DECIMAL(18,2),
    @TenderedAmount DECIMAL(18,2) = NULL,
    @ChangeGiven DECIMAL(18,2) = NULL,
    @ChequeNo NVARCHAR(50) = NULL,
    @Bank NVARCHAR(100) = NULL,
    @Branch NVARCHAR(100) = NULL,
    @ChequeDate DATE = NULL,
    @CardType NVARCHAR(30) = NULL,
    @Last4Digits CHAR(4) = NULL,
    @ApprovalCode NVARCHAR(50) = NULL,
    @TerminalID NVARCHAR(50) = NULL,
    @CreatedBy INT,
    @Result INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Amount <= 0
    BEGIN
        SET @Result = -1; -- settlement amount must be positive
        RETURN;
    END

    IF @PaymentMode = 4 -- Credit isn't a valid way to pay OFF credit
    BEGIN
        SET @Result = -2;
        RETURN;
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @PaymentID INT;

        INSERT INTO Sales.Payments (GroupID, InvoiceID, CustomerID, PaymentMode, Amount, TenderedAmount, ChangeGiven, IsDebtSettlement, CreatedBy, CreatedDate)
        VALUES (@GroupID, NULL, @CustomerID, @PaymentMode, @Amount, @TenderedAmount, @ChangeGiven, 1, @CreatedBy, GETDATE());
        SET @PaymentID = SCOPE_IDENTITY();

        IF @PaymentMode = 3
            INSERT INTO Sales.ChequeDetails (GroupID, PaymentID, ChequeNo, Bank, Branch, ChequeDate, Status)
            VALUES (@GroupID, @PaymentID, @ChequeNo, @Bank, @Branch, @ChequeDate, 1);

        IF @PaymentMode = 2
            INSERT INTO Sales.CardDetails (GroupID, PaymentID, CardType, Last4Digits, ApprovalCode, TerminalID)
            VALUES (@GroupID, @PaymentID, @CardType, @Last4Digits, @ApprovalCode, @TerminalID);

        DECLARE @PriorBalance DECIMAL(18,2) = ISNULL((
            SELECT TOP 1 Balance FROM Sales.CustomerLedger WHERE CustomerID = @CustomerID ORDER BY LedgerID DESC
        ), 0);

        INSERT INTO Sales.CustomerLedger (GroupID, CustomerID, PaymentID, DebitAmount, CreditAmount, Balance, TransactionDate, Narration, CreatedBy, CreatedDate)
        VALUES (@GroupID, @CustomerID, @PaymentID, 0, @Amount, @PriorBalance - @Amount, GETDATE(), 'Debt settlement', @CreatedBy, GETDATE());

        COMMIT TRANSACTION;
        SET @Result = @PaymentID;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

/* -------------------------------------------------------------------------
   UpdateChequeStatus (FR-PAY-03/04) - a bounce automatically re-instates the
   customer's debt and flags the account.
   ------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE Sales.UpdateChequeStatus
    @ChequeDetailID INT,
    @NewStatus TINYINT,
    @ChangedBy INT,
    @Result INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @PaymentID INT, @CustomerID INT, @Amount DECIMAL(18,2), @GroupID INT, @PreviousStatus TINYINT;

    SELECT @PaymentID = cd.PaymentID, @PreviousStatus = cd.Status, @GroupID = cd.GroupID,
           @CustomerID = p.CustomerID, @Amount = p.Amount
    FROM Sales.ChequeDetails cd
    JOIN Sales.Payments p ON p.PaymentID = cd.PaymentID
    WHERE cd.ChequeDetailID = @ChequeDetailID;

    IF @PaymentID IS NULL
    BEGIN
        SET @Result = -1; -- cheque not found
        RETURN;
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        UPDATE Sales.ChequeDetails
        SET Status = @NewStatus, StatusChangedDate = GETDATE(), StatusChangedBy = @ChangedBy
        WHERE ChequeDetailID = @ChequeDetailID;

        -- Bounce (4): re-instate debt and flag the account, only once (guard
        -- against double-processing if someone sets Bounced -> Bounced again)
        IF @NewStatus = 4 AND @PreviousStatus <> 4 AND @CustomerID IS NOT NULL
        BEGIN
            DECLARE @PriorBalance DECIMAL(18,2) = ISNULL((
                SELECT TOP 1 Balance FROM Sales.CustomerLedger WHERE CustomerID = @CustomerID ORDER BY LedgerID DESC
            ), 0);

            INSERT INTO Sales.CustomerLedger (GroupID, CustomerID, PaymentID, DebitAmount, CreditAmount, Balance, TransactionDate, Narration, CreatedBy, CreatedDate)
            VALUES (@GroupID, @CustomerID, @PaymentID, @Amount, 0, @PriorBalance + @Amount, GETDATE(), 'Cheque bounced - debt re-instated', @ChangedBy, GETDATE());

            UPDATE Sales.Customers SET HasBouncedCheque = 1 WHERE CustomerID = @CustomerID;
        END

        COMMIT TRANSACTION;
        SET @Result = 1;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

/* -------------------------------------------------------------------------
   GetChequeRegister (FR-PAY-03) - due-date-based register/reminder view.
   ------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE Sales.GetChequeRegister
    @GroupID INT,
    @StatusFilter TINYINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT cd.ChequeDetailID, cd.ChequeNo, cd.Bank, cd.Branch, cd.ChequeDate, cd.Status,
           p.Amount, p.CustomerID, c.Name AS CustomerName, p.InvoiceID, i.InvoiceNo,
           DATEDIFF(DAY, GETDATE(), cd.ChequeDate) AS DaysUntilDue
    FROM Sales.ChequeDetails cd
    JOIN Sales.Payments p ON p.PaymentID = cd.PaymentID
    LEFT JOIN Sales.Customers c ON c.CustomerID = p.CustomerID
    LEFT JOIN Sales.Invoices i ON i.InvoiceID = p.InvoiceID
    WHERE cd.GroupID = @GroupID
      AND (@StatusFilter IS NULL OR cd.Status = @StatusFilter)
    ORDER BY cd.ChequeDate;
END
GO

/* -------------------------------------------------------------------------
   Daily reconciliation reports (FR-PAY-01/02)
   ------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE Sales.GetCashRegisterReport
    @GroupID INT,
    @ReportDate DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        COUNT(*) AS TransactionCount,
        SUM(Amount) AS TotalCash,
        SUM(ISNULL(TenderedAmount, Amount)) AS TotalTendered,
        SUM(ISNULL(ChangeGiven, 0)) AS TotalChangeGiven
    FROM Sales.Payments
    WHERE GroupID = @GroupID AND PaymentMode = 1 AND IsVoided = 0
      AND CAST(CreatedDate AS DATE) = @ReportDate;

    SELECT PaymentID, InvoiceID, CustomerID, Amount, TenderedAmount, ChangeGiven, CreatedDate
    FROM Sales.Payments
    WHERE GroupID = @GroupID AND PaymentMode = 1 AND IsVoided = 0
      AND CAST(CreatedDate AS DATE) = @ReportDate
    ORDER BY CreatedDate;
END
GO

CREATE OR ALTER PROCEDURE Sales.GetCardSettlementReport
    @GroupID INT,
    @ReportDate DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ca.CardType, COUNT(*) AS TransactionCount, SUM(p.Amount) AS TotalAmount
    FROM Sales.Payments p
    JOIN Sales.CardDetails ca ON ca.PaymentID = p.PaymentID
    WHERE p.GroupID = @GroupID AND p.PaymentMode = 2 AND p.IsVoided = 0
      AND CAST(p.CreatedDate AS DATE) = @ReportDate
    GROUP BY ca.CardType;

    SELECT p.PaymentID, p.InvoiceID, p.Amount, ca.CardType, ca.Last4Digits, ca.ApprovalCode, ca.TerminalID, p.CreatedDate
    FROM Sales.Payments p
    JOIN Sales.CardDetails ca ON ca.PaymentID = p.PaymentID
    WHERE p.GroupID = @GroupID AND p.PaymentMode = 2 AND p.IsVoided = 0
      AND CAST(p.CreatedDate AS DATE) = @ReportDate
    ORDER BY p.CreatedDate;
END
GO
