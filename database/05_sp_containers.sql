/* =========================================================================
   Inventory schema - Containers / GRN Stock Intake Stored Procedures
   ========================================================================= */

CREATE OR ALTER PROCEDURE Inventory.GetAllSuppliers
    @GroupID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT SupplierID, GroupID, Name, ContactInfo, PaymentTerms, IsActive
    FROM Inventory.Suppliers WHERE GroupID = @GroupID AND IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE Inventory.SaveSupplier
    @GroupID INT,
    @Name NVARCHAR(150),
    @ContactInfo NVARCHAR(255) = NULL,
    @PaymentTerms NVARCHAR(100) = NULL,
    @CreatedBy INT,
    @Result INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Inventory.Suppliers (GroupID, Name, ContactInfo, PaymentTerms, CreatedBy, CreatedDate)
    VALUES (@GroupID, @Name, @ContactInfo, @PaymentTerms, @CreatedBy, GETDATE());
    SET @Result = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE Inventory.GetAllContainers
    @GroupID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.ContainerID, c.GroupID, c.SupplierID, s.Name AS SupplierName,
           c.ReferenceNo, c.ReceivedDate, c.IsActive,
           (SELECT COUNT(*) FROM Inventory.ContainerItems ci WHERE ci.ContainerID = c.ContainerID) AS LineCount
    FROM Inventory.Containers c
    JOIN Inventory.Suppliers s ON s.SupplierID = c.SupplierID
    WHERE c.GroupID = @GroupID AND c.IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE Inventory.GetContainerByID
    @ContainerID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ContainerID, GroupID, SupplierID, ReferenceNo, ReceivedDate, IsActive
    FROM Inventory.Containers WHERE ContainerID = @ContainerID;

    SELECT ci.ContainerItemID, ci.ItemID, i.ItemName, ci.Quantity, ci.UnitCost
    FROM Inventory.ContainerItems ci
    JOIN Inventory.Items i ON i.ItemID = ci.ItemID
    WHERE ci.ContainerID = @ContainerID;
END
GO

/* FR-ITM-05: creates the container header, its line items, and posts a StockLedger
   "In" transaction per line — this is the single transactional entry point for
   stock intake so on-hand quantity and cost are always updated together. */
CREATE TYPE Inventory.ContainerItemType AS TABLE (
    ItemID      INT,
    Quantity    DECIMAL(18,3),
    UnitCost    DECIMAL(18,2)
);
GO

CREATE OR ALTER PROCEDURE Inventory.SaveContainer
    @GroupID INT,
    @SupplierID INT,
    @ReferenceNo NVARCHAR(50),
    @ReceivedDate DATETIME,
    @Lines Inventory.ContainerItemType READONLY,
    @CreatedBy INT,
    @Result INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM @Lines)
    BEGIN
        SET @Result = -5; -- container must have at least one line
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM @Lines WHERE Quantity <= 0 OR UnitCost < 0)
    BEGIN
        SET @Result = -6; -- invalid quantity/cost
        RETURN;
    END

    BEGIN TRANSACTION;

    DECLARE @ContainerID INT;

    INSERT INTO Inventory.Containers (GroupID, SupplierID, ReferenceNo, ReceivedDate, CreatedBy, CreatedDate)
    VALUES (@GroupID, @SupplierID, @ReferenceNo, @ReceivedDate, @CreatedBy, GETDATE());
    SET @ContainerID = SCOPE_IDENTITY();

    INSERT INTO Inventory.ContainerItems (GroupID, ContainerID, ItemID, Quantity, UnitCost, CreatedBy, CreatedDate)
    SELECT @GroupID, @ContainerID, ItemID, Quantity, UnitCost, @CreatedBy, GETDATE()
    FROM @Lines;

    INSERT INTO Inventory.StockLedger (GroupID, ItemID, TransactionType, Quantity, RefTable, RefID, TransactionDate, CreatedBy, CreatedDate)
    SELECT @GroupID, ItemID, 1, Quantity, 'ContainerItems', @ContainerID, @ReceivedDate, @CreatedBy, GETDATE()
    FROM @Lines;

    COMMIT TRANSACTION;

    SET @Result = @ContainerID;
END
GO

-- FR-ITM-06: weighted average cost, used by the Sales/COGS calc built in Phase 2
CREATE OR ALTER PROCEDURE Inventory.GetWeightedAverageCost
    @ItemID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        CASE WHEN SUM(Quantity) = 0 THEN 0 ELSE SUM(Quantity * UnitCost) / SUM(Quantity) END AS WeightedAverageCost
    FROM Inventory.ContainerItems
    WHERE ItemID = @ItemID;
END
GO
