/* =========================================================================
   tSQLt tests - Phase 1 guard rules
   Run once against a dedicated TestLeatherPOS database with tSQLt installed:
       EXEC tSQLt.NewTestClass 'Test_Security';
       EXEC tSQLt.NewTestClass 'Test_Customers';
       EXEC tSQLt.NewTestClass 'Test_Items';
       EXEC tSQLt.NewTestClass 'Test_Containers';
   then run this file, then EXEC tSQLt.RunAll;
   ========================================================================= */

EXEC tSQLt.NewTestClass 'Test_Security';
GO
EXEC tSQLt.NewTestClass 'Test_Customers';
GO
EXEC tSQLt.NewTestClass 'Test_Items';
GO
EXEC tSQLt.NewTestClass 'Test_Containers';
GO

/* ---------------- Security.UpdateRole guard ---------------- */

CREATE OR ALTER PROCEDURE Test_Security.[test UpdateRole rejects deactivation when active users exist]
AS
BEGIN
    EXEC tSQLt.FakeTable 'Security.Roles';
    EXEC tSQLt.FakeTable 'Security.Users';

    INSERT INTO Security.Roles (RoleID, GroupID, RoleName, IsActive, CreatedBy, CreatedDate)
    VALUES (1, 1, 'Cashier', 1, 1, GETDATE());

    INSERT INTO Security.Users (UserID, GroupID, RoleID, Username, PasswordHash, FullName, IsActive, CreatedBy, CreatedDate)
    VALUES (1, 1, 1, 'jdoe', 'hash', 'John Doe', 1, 1, GETDATE());

    DECLARE @Result INT;
    EXEC Security.UpdateRole @RoleID = 1, @RoleName = 'Cashier', @Description = NULL,
                              @IsActive = 0, @ModifiedBy = 1, @Result = @Result OUTPUT;

    EXEC tSQLt.AssertEquals @Expected = -2, @Actual = @Result,
        @Message = 'Expected guard code -2 when deactivating a role with active users';
END
GO

CREATE OR ALTER PROCEDURE Test_Security.[test UpdateRole allows deactivation when no active users]
AS
BEGIN
    EXEC tSQLt.FakeTable 'Security.Roles';
    EXEC tSQLt.FakeTable 'Security.Users';

    INSERT INTO Security.Roles (RoleID, GroupID, RoleName, IsActive, CreatedBy, CreatedDate)
    VALUES (1, 1, 'Obsolete Role', 1, 1, GETDATE());

    DECLARE @Result INT;
    EXEC Security.UpdateRole @RoleID = 1, @RoleName = 'Obsolete Role', @Description = NULL,
                              @IsActive = 0, @ModifiedBy = 1, @Result = @Result OUTPUT;

    EXEC tSQLt.AssertEquals @Expected = 1, @Actual = @Result;
END
GO

/* ---------------- Sales.SaveCustomer guard: walk-in cannot have credit terms ---------------- */

CREATE OR ALTER PROCEDURE Test_Customers.[test SaveCustomer rejects credit terms for walk-in]
AS
BEGIN
    EXEC tSQLt.FakeTable 'Sales.Customers';

    DECLARE @Result INT;
    EXEC Sales.SaveCustomer @GroupID = 1, @CustomerType = 2, @Name = 'Walk-in Guy',
                             @CreditLimit = 5000, @CreditDays = 30, @CreatedBy = 1, @Result = @Result OUTPUT;

    EXEC tSQLt.AssertEquals @Expected = -4, @Actual = @Result,
        @Message = 'Walk-in customers must not be saveable with credit terms';
END
GO

CREATE OR ALTER PROCEDURE Test_Customers.[test SaveCustomer allows credit terms for regular customer]
AS
BEGIN
    EXEC tSQLt.FakeTable 'Sales.Customers', @Identity = 1;

    DECLARE @Result INT;
    EXEC Sales.SaveCustomer @GroupID = 1, @CustomerType = 1, @Name = 'Regular Co',
                             @CreditLimit = 50000, @CreditDays = 30, @CreatedBy = 1, @Result = @Result OUTPUT;

    EXEC tSQLt.AssertEquals @Expected = 1, @Actual = @Result,
        @Message = 'Expected new CustomerID 1 for first insert';
END
GO

CREATE OR ALTER PROCEDURE Test_Customers.[test UpdateCustomer rejects deactivation with outstanding balance]
AS
BEGIN
    EXEC tSQLt.FakeTable 'Sales.Customers';
    EXEC tSQLt.FakeTable 'Sales.CustomerLedger';

    INSERT INTO Sales.Customers (CustomerID, GroupID, CustomerType, Name, IsActive, CreatedBy, CreatedDate)
    VALUES (1, 1, 1, 'Regular Co', 1, 1, GETDATE());

    INSERT INTO Sales.CustomerLedger (LedgerID, GroupID, CustomerID, DebitAmount, CreditAmount, Balance, TransactionDate, CreatedBy, CreatedDate)
    VALUES (1, 1, 1, 10000, 0, 10000, GETDATE(), 1, GETDATE());

    DECLARE @Result INT;
    EXEC Sales.UpdateCustomer @CustomerID = 1, @Name = 'Regular Co', @IsActive = 0,
                               @ModifiedBy = 1, @Result = @Result OUTPUT;

    EXEC tSQLt.AssertEquals @Expected = -2, @Actual = @Result;
END
GO

/* ---------------- Inventory.SaveItem guard: duplicate item code ---------------- */

CREATE OR ALTER PROCEDURE Test_Items.[test SaveItem rejects duplicate item code within group]
AS
BEGIN
    EXEC tSQLt.FakeTable 'Inventory.Items';
    EXEC tSQLt.FakeTable 'Inventory.UOM';

    INSERT INTO Inventory.UOM (UOMID, UOMCode, UOMName, UOMType, IsActive, CreatedBy, CreatedDate)
    VALUES (1, 'm', 'Metre', 1, 1, 1, GETDATE());

    INSERT INTO Inventory.Items (ItemID, GroupID, ItemCode, ItemName, BaseUOMID, CostPrice, SellingPrice, IsActive, CreatedBy, CreatedDate)
    VALUES (1, 1, 'HIDE-001', 'Cow Hide Full', 1, 1000, 1500, 1, 1, GETDATE());

    DECLARE @Result INT;
    EXEC Inventory.SaveItem @GroupID = 1, @ItemCode = 'HIDE-001', @ItemName = 'Duplicate Hide',
                             @BaseUOMID = 1, @CostPrice = 1000, @SellingPrice = 1500, @CreatedBy = 1, @Result = @Result OUTPUT;

    EXEC tSQLt.AssertEquals @Expected = -1, @Actual = @Result;
END
GO

/* ---------------- Inventory.SaveContainer: transactional stock-in ---------------- */

CREATE OR ALTER PROCEDURE Test_Containers.[test SaveContainer rejects empty line set]
AS
BEGIN
    EXEC tSQLt.FakeTable 'Inventory.Containers';
    EXEC tSQLt.FakeTable 'Inventory.ContainerItems';
    EXEC tSQLt.FakeTable 'Inventory.StockLedger';

    DECLARE @Lines Inventory.ContainerItemType;
    DECLARE @Result INT;
    EXEC Inventory.SaveContainer @GroupID = 1, @SupplierID = 1, @ReferenceNo = 'GRN-001',
                                  @ReceivedDate = '2026-07-01', @Lines = @Lines, @CreatedBy = 1, @Result = @Result OUTPUT;

    EXEC tSQLt.AssertEquals @Expected = -5, @Actual = @Result;
END
GO

CREATE OR ALTER PROCEDURE Test_Containers.[test SaveContainer posts one StockLedger IN row per line]
AS
BEGIN
    EXEC tSQLt.FakeTable 'Inventory.Containers';
    EXEC tSQLt.FakeTable 'Inventory.ContainerItems';
    EXEC tSQLt.FakeTable 'Inventory.StockLedger';

    DECLARE @Lines Inventory.ContainerItemType;
    INSERT INTO @Lines (ItemID, Quantity, UnitCost) VALUES (1, 100.5, 850.00), (2, 50.0, 300.00);

    DECLARE @Result INT;
    EXEC Inventory.SaveContainer @GroupID = 1, @SupplierID = 1, @ReferenceNo = 'GRN-002',
                                  @ReceivedDate = '2026-07-01', @Lines = @Lines, @CreatedBy = 1, @Result = @Result OUTPUT;

    DECLARE @ActualCount INT = (SELECT COUNT(*) FROM Inventory.StockLedger WHERE TransactionType = 1);
    EXEC tSQLt.AssertEquals @Expected = 2, @Actual = @ActualCount,
        @Message = 'Expected one StockLedger IN row per container line';
END
GO
