/* =========================================================================
   tSQLt tests - Phase 2 guard rules (Billing/POS, Payments)
   Run: EXEC tSQLt.NewTestClass 'Test_Billing'; EXEC tSQLt.NewTestClass 'Test_Payments';
   then this file, then EXEC tSQLt.RunAll;
   ========================================================================= */

EXEC tSQLt.NewTestClass 'Test_Billing';
GO
EXEC tSQLt.NewTestClass 'Test_Payments';
GO

/* ---------------- Sales.SaveInvoice guards ---------------- */

CREATE OR ALTER PROCEDURE Test_Billing.[test SaveInvoice rejects mismatched payment total]
AS
BEGIN
    EXEC tSQLt.FakeTable 'Sales.Invoices';
    EXEC tSQLt.FakeTable 'Sales.InvoiceLines';
    EXEC tSQLt.FakeTable 'Sales.Payments';
    EXEC tSQLt.FakeTable 'Sales.ChequeDetails';
    EXEC tSQLt.FakeTable 'Sales.CardDetails';
    EXEC tSQLt.FakeTable 'Inventory.StockLedger';
    EXEC tSQLt.FakeTable 'Sales.CustomerLedger';
    EXEC tSQLt.FakeTable 'Administration.InvoiceSequence';
    EXEC tSQLt.FakeTable 'Administration.Groups';

    INSERT INTO Inventory.StockLedger (StockLedgerID, GroupID, ItemID, TransactionType, Quantity, RefTable, RefID, TransactionDate, CreatedBy, CreatedDate)
    VALUES (1, 1, 1, 1, 100, 'Seed', 1, GETDATE(), 1, GETDATE());

    DECLARE @Lines Sales.InvoiceLineType;
    INSERT INTO @Lines (ItemID, UOMID, Quantity, UnitPrice, Discount) VALUES (1, 1, 1, 100, 0);

    DECLARE @Payments Sales.PaymentType;
    INSERT INTO @Payments (PaymentMode, Amount) VALUES (1, 50); -- short-paying a 100 total

    DECLARE @Result INT;
    EXEC Sales.SaveInvoice @GroupID = 1, @InvoiceDate = '2026-07-04', @IsHeld = 0,
        @Lines = @Lines, @Payments = @Payments, @CreatedBy = 1, @Result = @Result OUTPUT;

    EXEC tSQLt.AssertEquals @Expected = -1, @Actual = @Result;
END
GO

CREATE OR ALTER PROCEDURE Test_Billing.[test SaveInvoice rejects insufficient stock]
AS
BEGIN
    EXEC tSQLt.FakeTable 'Sales.Invoices';
    EXEC tSQLt.FakeTable 'Sales.InvoiceLines';
    EXEC tSQLt.FakeTable 'Sales.Payments';
    EXEC tSQLt.FakeTable 'Inventory.StockLedger';
    EXEC tSQLt.FakeTable 'Sales.CustomerLedger';
    EXEC tSQLt.FakeTable 'Administration.InvoiceSequence';
    EXEC tSQLt.FakeTable 'Administration.Groups';

    INSERT INTO Inventory.StockLedger (StockLedgerID, GroupID, ItemID, TransactionType, Quantity, RefTable, RefID, TransactionDate, CreatedBy, CreatedDate)
    VALUES (1, 1, 1, 1, 2, 'Seed', 1, GETDATE(), 1, GETDATE()); -- only 2 on hand

    DECLARE @Lines Sales.InvoiceLineType;
    INSERT INTO @Lines (ItemID, UOMID, Quantity, UnitPrice, Discount) VALUES (1, 1, 10, 100, 0); -- selling 10

    DECLARE @Payments Sales.PaymentType;
    INSERT INTO @Payments (PaymentMode, Amount) VALUES (1, 1000);

    DECLARE @Result INT;
    EXEC Sales.SaveInvoice @GroupID = 1, @InvoiceDate = '2026-07-04', @IsHeld = 0,
        @Lines = @Lines, @Payments = @Payments, @CreatedBy = 1, @Result = @Result OUTPUT;

    EXEC tSQLt.AssertEquals @Expected = -2, @Actual = @Result;
END
GO

CREATE OR ALTER PROCEDURE Test_Billing.[test SaveInvoice rejects credit payment for walk-in customer]
AS
BEGIN
    EXEC tSQLt.FakeTable 'Sales.Invoices';
    EXEC tSQLt.FakeTable 'Sales.InvoiceLines';
    EXEC tSQLt.FakeTable 'Sales.Payments';
    EXEC tSQLt.FakeTable 'Sales.Customers';
    EXEC tSQLt.FakeTable 'Inventory.StockLedger';
    EXEC tSQLt.FakeTable 'Sales.CustomerLedger';

    INSERT INTO Sales.Customers (CustomerID, GroupID, CustomerType, Name, IsActive, CreatedBy, CreatedDate)
    VALUES (1, 1, 2, 'Walk-in Guy', 1, 1, GETDATE()); -- CustomerType 2 = Walk-in

    DECLARE @Lines Sales.InvoiceLineType;
    INSERT INTO @Lines (ItemID, UOMID, Quantity, UnitPrice, Discount) VALUES (1, 1, 1, 100, 0);

    DECLARE @Payments Sales.PaymentType;
    INSERT INTO @Payments (PaymentMode, Amount) VALUES (4, 100); -- Credit mode

    DECLARE @Result INT;
    EXEC Sales.SaveInvoice @GroupID = 1, @CustomerID = 1, @InvoiceDate = '2026-07-04', @IsHeld = 0,
        @Lines = @Lines, @Payments = @Payments, @CreatedBy = 1, @Result = @Result OUTPUT;

    EXEC tSQLt.AssertEquals @Expected = -4, @Actual = @Result;
END
GO

CREATE OR ALTER PROCEDURE Test_Billing.[test SaveInvoice holds a bill without touching stock]
AS
BEGIN
    EXEC tSQLt.FakeTable 'Sales.Invoices';
    EXEC tSQLt.FakeTable 'Sales.InvoiceLines';
    EXEC tSQLt.FakeTable 'Sales.Payments';
    EXEC tSQLt.FakeTable 'Inventory.StockLedger';

    DECLARE @Lines Sales.InvoiceLineType;
    INSERT INTO @Lines (ItemID, UOMID, Quantity, UnitPrice, Discount) VALUES (1, 1, 5, 100, 0);

    DECLARE @Payments Sales.PaymentType; -- empty - held bills take no payments yet

    DECLARE @Result INT;
    EXEC Sales.SaveInvoice @GroupID = 1, @InvoiceDate = '2026-07-04', @IsHeld = 1,
        @Lines = @Lines, @Payments = @Payments, @CreatedBy = 1, @Result = @Result OUTPUT;

    EXEC tSQLt.AssertEquals @Expected = 1, @Actual = @Result, @Message = 'Expected new held InvoiceID 1';

    DECLARE @StockRows INT = (SELECT COUNT(*) FROM Inventory.StockLedger);
    EXEC tSQLt.AssertEquals @Expected = 0, @Actual = @StockRows, @Message = 'Held bills must not touch stock';
END
GO

/* ---------------- Sales.ReturnInvoice guards ---------------- */

CREATE OR ALTER PROCEDURE Test_Billing.[test ReturnInvoice rejects returning more than remaining quantity]
AS
BEGIN
    EXEC tSQLt.FakeTable 'Sales.Invoices';
    EXEC tSQLt.FakeTable 'Sales.InvoiceLines';
    EXEC tSQLt.FakeTable 'Inventory.StockLedger';
    EXEC tSQLt.FakeTable 'Sales.Payments';
    EXEC tSQLt.FakeTable 'Sales.CustomerLedger';

    INSERT INTO Sales.Invoices (InvoiceID, GroupID, InvoiceNo, CustomerID, InvoiceDate, Status, SubTotal, DiscountTotal, TotalAmount, PassToAccounting, CreatedBy, CreatedDate)
    VALUES (1, 1, 'INV-2026-000001', NULL, GETDATE(), 2, 100, 0, 100, 1, 1, GETDATE());

    INSERT INTO Sales.InvoiceLines (InvoiceLineID, GroupID, InvoiceID, ItemID, UOMID, Quantity, UnitPrice, Discount, LineTotal, QuantityReturned, CreatedDate)
    VALUES (1, 1, 1, 1, 1, 5, 20, 0, 100, 0, GETDATE());

    DECLARE @ReturnLines Sales.ReturnLineType;
    INSERT INTO @ReturnLines (InvoiceLineID, QuantityToReturn) VALUES (1, 10); -- more than the 5 sold

    DECLARE @Result INT;
    EXEC Sales.ReturnInvoice @InvoiceID = 1, @ReturnLines = @ReturnLines, @CreatedBy = 1, @Result = @Result OUTPUT;

    EXEC tSQLt.AssertEquals @Expected = -3, @Actual = @Result;
END
GO

/* ---------------- Sales.UpdateChequeStatus bounce guard ---------------- */

CREATE OR ALTER PROCEDURE Test_Payments.[test UpdateChequeStatus reinstates debt and flags customer on bounce]
AS
BEGIN
    EXEC tSQLt.FakeTable 'Sales.ChequeDetails';
    EXEC tSQLt.FakeTable 'Sales.Payments';
    EXEC tSQLt.FakeTable 'Sales.Customers';
    EXEC tSQLt.FakeTable 'Sales.CustomerLedger';

    INSERT INTO Sales.Customers (CustomerID, GroupID, CustomerType, Name, IsActive, HasBouncedCheque, CreatedBy, CreatedDate)
    VALUES (1, 1, 1, 'Regular Co', 1, 0, 1, GETDATE());

    INSERT INTO Sales.Payments (PaymentID, GroupID, InvoiceID, CustomerID, PaymentMode, Amount, IsDebtSettlement, CreatedBy, CreatedDate)
    VALUES (1, 1, NULL, 1, 3, 5000, 0, 1, GETDATE());

    INSERT INTO Sales.ChequeDetails (ChequeDetailID, GroupID, PaymentID, ChequeNo, Bank, ChequeDate, Status)
    VALUES (1, 1, 1, '000123', 'Test Bank', '2026-07-01', 1); -- Pending

    DECLARE @Result INT;
    EXEC Sales.UpdateChequeStatus @ChequeDetailID = 1, @NewStatus = 4, @ChangedBy = 1, @Result = @Result OUTPUT; -- Bounced

    EXEC tSQLt.AssertEquals @Expected = 1, @Actual = @Result;

    DECLARE @Flagged BIT = (SELECT HasBouncedCheque FROM Sales.Customers WHERE CustomerID = 1);
    EXEC tSQLt.AssertEquals @Expected = 1, @Actual = @Flagged, @Message = 'Customer should be flagged after a bounced cheque';

    DECLARE @LedgerDebit DECIMAL(18,2) = (SELECT DebitAmount FROM Sales.CustomerLedger WHERE CustomerID = 1);
    EXEC tSQLt.AssertEquals @Expected = 5000, @Actual = @LedgerDebit, @Message = 'Bounced cheque amount should re-instate as debt';
END
GO

CREATE OR ALTER PROCEDURE Test_Payments.[test SaveDebtSettlement rejects credit as a settlement mode]
AS
BEGIN
    EXEC tSQLt.FakeTable 'Sales.Payments';
    EXEC tSQLt.FakeTable 'Sales.CustomerLedger';

    DECLARE @Result INT;
    EXEC Sales.SaveDebtSettlement @GroupID = 1, @CustomerID = 1, @PaymentMode = 4, @Amount = 1000, @CreatedBy = 1, @Result = @Result OUTPUT;

    EXEC tSQLt.AssertEquals @Expected = -2, @Actual = @Result;
END
GO
