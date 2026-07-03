/* =========================================================================
   tSQLt tests - customer item pricing memory
   ========================================================================= */

EXEC tSQLt.NewTestClass 'Test_CustomerPricing';
GO

CREATE OR ALTER PROCEDURE Test_CustomerPricing.[test GetCustomerItemLastPrice returns the most recent completed purchase price]
AS
BEGIN
    EXEC tSQLt.FakeTable 'Sales.Invoices';
    EXEC tSQLt.FakeTable 'Sales.InvoiceLines';

    -- Older sale at 900
    INSERT INTO Sales.Invoices (InvoiceID, GroupID, InvoiceNo, CustomerID, InvoiceDate, Status, SubTotal, DiscountTotal, TotalAmount, PassToAccounting, CreatedBy, CreatedDate)
    VALUES (1, 1, 'INV-2026-000001', 1, '2026-01-01', 2, 900, 0, 900, 1, 1, GETDATE());
    INSERT INTO Sales.InvoiceLines (InvoiceLineID, GroupID, InvoiceID, ItemID, UOMID, Quantity, UnitPrice, Discount, LineTotal, QuantityReturned, CreatedDate)
    VALUES (1, 1, 1, 5, 1, 1, 900, 0, 900, 0, GETDATE());

    -- More recent sale at 850 (a better price the customer negotiated later)
    INSERT INTO Sales.Invoices (InvoiceID, GroupID, InvoiceNo, CustomerID, InvoiceDate, Status, SubTotal, DiscountTotal, TotalAmount, PassToAccounting, CreatedBy, CreatedDate)
    VALUES (2, 1, 'INV-2026-000002', 1, '2026-06-01', 2, 850, 0, 850, 1, 1, GETDATE());
    INSERT INTO Sales.InvoiceLines (InvoiceLineID, GroupID, InvoiceID, ItemID, UOMID, Quantity, UnitPrice, Discount, LineTotal, QuantityReturned, CreatedDate)
    VALUES (2, 1, 2, 5, 1, 1, 850, 0, 850, 0, GETDATE());

    -- Actually capture the real stored procedure's output, not a re-derived query
    CREATE TABLE #Actual (UnitPrice DECIMAL(18,2), Discount DECIMAL(18,2), LastPurchaseDate DATETIME, LastInvoiceNo NVARCHAR(50));
    INSERT INTO #Actual EXEC Sales.GetCustomerItemLastPrice @CustomerID = 1, @ItemID = 5;

    DECLARE @ActualPrice DECIMAL(18,2) = (SELECT UnitPrice FROM #Actual);
    EXEC tSQLt.AssertEquals @Expected = 850, @Actual = @ActualPrice,
        @Message = 'Expected the most recent purchase price (850), not the older one (900)';
END
GO

CREATE OR ALTER PROCEDURE Test_CustomerPricing.[test GetCustomerItemLastPrice ignores held and fully reversed invoices]
AS
BEGIN
    EXEC tSQLt.FakeTable 'Sales.Invoices';
    EXEC tSQLt.FakeTable 'Sales.InvoiceLines';

    -- A held (draft) invoice at 700 must not count as purchase history
    INSERT INTO Sales.Invoices (InvoiceID, GroupID, InvoiceNo, CustomerID, InvoiceDate, Status, SubTotal, DiscountTotal, TotalAmount, PassToAccounting, CreatedBy, CreatedDate)
    VALUES (1, 1, NULL, 1, '2026-06-15', 1, 700, 0, 700, 1, 1, GETDATE()); -- Status 1 = Held
    INSERT INTO Sales.InvoiceLines (InvoiceLineID, GroupID, InvoiceID, ItemID, UOMID, Quantity, UnitPrice, Discount, LineTotal, QuantityReturned, CreatedDate)
    VALUES (1, 1, 1, 5, 1, 1, 700, 0, 700, 0, GETDATE());

    -- A fully reversed invoice at 600 must not count either
    INSERT INTO Sales.Invoices (InvoiceID, GroupID, InvoiceNo, CustomerID, InvoiceDate, Status, SubTotal, DiscountTotal, TotalAmount, PassToAccounting, CreatedBy, CreatedDate)
    VALUES (2, 1, 'INV-2026-000002', 1, '2026-06-20', 3, 600, 0, 600, 1, 1, GETDATE()); -- Status 3 = Reversed
    INSERT INTO Sales.InvoiceLines (InvoiceLineID, GroupID, InvoiceID, ItemID, UOMID, Quantity, UnitPrice, Discount, LineTotal, QuantityReturned, CreatedDate)
    VALUES (2, 1, 2, 5, 1, 1, 600, 0, 600, 1, GETDATE());

    -- The only real completed sale, at 950
    INSERT INTO Sales.Invoices (InvoiceID, GroupID, InvoiceNo, CustomerID, InvoiceDate, Status, SubTotal, DiscountTotal, TotalAmount, PassToAccounting, CreatedBy, CreatedDate)
    VALUES (3, 1, 'INV-2026-000003', 1, '2026-05-01', 2, 950, 0, 950, 1, 1, GETDATE());
    INSERT INTO Sales.InvoiceLines (InvoiceLineID, GroupID, InvoiceID, ItemID, UOMID, Quantity, UnitPrice, Discount, LineTotal, QuantityReturned, CreatedDate)
    VALUES (3, 1, 3, 5, 1, 1, 950, 0, 950, 0, GETDATE());

    CREATE TABLE #Actual (UnitPrice DECIMAL(18,2), Discount DECIMAL(18,2), LastPurchaseDate DATETIME, LastInvoiceNo NVARCHAR(50));
    INSERT INTO #Actual EXEC Sales.GetCustomerItemLastPrice @CustomerID = 1, @ItemID = 5;

    DECLARE @ActualPrice DECIMAL(18,2) = (SELECT UnitPrice FROM #Actual);
    EXEC tSQLt.AssertEquals @Expected = 950, @Actual = @ActualPrice,
        @Message = 'Held and reversed invoices must not count as purchase history';
END
GO

CREATE OR ALTER PROCEDURE Test_CustomerPricing.[test GetCustomerItemLastPrice returns no rows for a customer with no history]
AS
BEGIN
    EXEC tSQLt.FakeTable 'Sales.Invoices';
    EXEC tSQLt.FakeTable 'Sales.InvoiceLines';

    CREATE TABLE #Actual (UnitPrice DECIMAL(18,2), Discount DECIMAL(18,2), LastPurchaseDate DATETIME, LastInvoiceNo NVARCHAR(50));
    INSERT INTO #Actual EXEC Sales.GetCustomerItemLastPrice @CustomerID = 999, @ItemID = 999;

    DECLARE @RowCount INT = (SELECT COUNT(*) FROM #Actual);
    EXEC tSQLt.AssertEquals @Expected = 0, @Actual = @RowCount,
        @Message = 'A customer/item combo with no purchase history should return no rows';
END
GO
