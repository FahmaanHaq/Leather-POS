/* =========================================================================
   Inventory schema - Items / UOM Stored Procedures
   ========================================================================= */

CREATE OR ALTER PROCEDURE Inventory.GetAllUOM
AS
BEGIN
    SET NOCOUNT ON;
    SELECT UOMID, UOMCode, UOMName, UOMType, IsActive FROM Inventory.UOM WHERE IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE Inventory.GetAllCategories
    @GroupID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CategoryID, GroupID, CategoryName, IsActive FROM Inventory.Categories
    WHERE GroupID = @GroupID AND IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE Inventory.GetAllItems
    @GroupID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i.ItemID, i.GroupID, i.ItemCode, i.ItemName, i.CategoryID, c.CategoryName,
           i.BaseUOMID, u.UOMCode, i.Barcode, i.Description, i.CostPrice, i.SellingPrice,
           i.ReorderLevel, i.ImagePath, i.IsActive,
           ISNULL((SELECT SUM(CASE WHEN TransactionType = 1 THEN Quantity
                                    WHEN TransactionType = 2 THEN -Quantity
                                    ELSE Quantity END)
                   FROM Inventory.StockLedger sl WHERE sl.ItemID = i.ItemID), 0) AS OnHandQuantity
    FROM Inventory.Items i
    LEFT JOIN Inventory.Categories c ON c.CategoryID = i.CategoryID
    JOIN Inventory.UOM u ON u.UOMID = i.BaseUOMID
    WHERE i.GroupID = @GroupID AND i.IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE Inventory.GetItemByID
    @ItemID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ItemID, GroupID, ItemCode, ItemName, CategoryID, BaseUOMID, Barcode,
           Description, CostPrice, SellingPrice, ReorderLevel, ImagePath, IsActive
    FROM Inventory.Items WHERE ItemID = @ItemID;
END
GO

CREATE OR ALTER PROCEDURE Inventory.SaveItem
    @GroupID INT,
    @ItemCode NVARCHAR(50),
    @ItemName NVARCHAR(150),
    @CategoryID INT = NULL,
    @BaseUOMID INT,
    @Barcode NVARCHAR(50) = NULL,
    @Description NVARCHAR(255) = NULL,
    @CostPrice DECIMAL(18,2),
    @SellingPrice DECIMAL(18,2),
    @ReorderLevel DECIMAL(18,3) = 0,
    @ImagePath NVARCHAR(255) = NULL,
    @CreatedBy INT,
    @Result INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM Inventory.Items WHERE GroupID = @GroupID AND ItemCode = @ItemCode AND IsActive = 1)
    BEGIN
        SET @Result = -1; -- duplicate item code within group
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM Inventory.UOM WHERE UOMID = @BaseUOMID AND IsActive = 1)
    BEGIN
        SET @Result = -3; -- invalid UOM
        RETURN;
    END

    INSERT INTO Inventory.Items
        (GroupID, ItemCode, ItemName, CategoryID, BaseUOMID, Barcode, Description,
         CostPrice, SellingPrice, ReorderLevel, ImagePath, CreatedBy, CreatedDate)
    VALUES
        (@GroupID, @ItemCode, @ItemName, @CategoryID, @BaseUOMID, @Barcode, @Description,
         @CostPrice, @SellingPrice, @ReorderLevel, @ImagePath, @CreatedBy, GETDATE());

    SET @Result = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE Inventory.UpdateItem
    @ItemID INT,
    @ItemName NVARCHAR(150),
    @CategoryID INT = NULL,
    @Barcode NVARCHAR(50) = NULL,
    @Description NVARCHAR(255) = NULL,
    @CostPrice DECIMAL(18,2),
    @SellingPrice DECIMAL(18,2),
    @ReorderLevel DECIMAL(18,3),
    @ImagePath NVARCHAR(255) = NULL,
    @IsActive BIT,
    @ModifiedBy INT,
    @Result INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- FR-ITM-09: never hard-delete once referenced by a transaction; deactivation is fine either way
    UPDATE Inventory.Items
    SET ItemName = @ItemName, CategoryID = @CategoryID, Barcode = @Barcode, Description = @Description,
        CostPrice = @CostPrice, SellingPrice = @SellingPrice, ReorderLevel = @ReorderLevel,
        ImagePath = @ImagePath, IsActive = @IsActive, ModifiedBy = @ModifiedBy, ModifiedDate = GETDATE()
    WHERE ItemID = @ItemID;

    SET @Result = 1;
END
GO

/* FR-ITM-02: bulk import validation - called once per staged row before commit.
   The API stages parsed Excel rows into a TVP-backed temp table and calls this
   per-row (or as a TVP set) to return per-row validation results for the preview grid. */
CREATE TYPE Inventory.ItemImportRowType AS TABLE (
    RowNumber   INT,
    ItemCode    NVARCHAR(50),
    ItemName    NVARCHAR(150),
    UOMCode     NVARCHAR(10),
    CostPrice   DECIMAL(18,2),
    SellingPrice DECIMAL(18,2)
);
GO

CREATE OR ALTER PROCEDURE Inventory.ValidateItemImportBatch
    @GroupID INT,
    @Rows Inventory.ItemImportRowType READONLY
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        r.RowNumber, r.ItemCode, r.ItemName, r.UOMCode,
        CASE
            WHEN r.ItemCode IS NULL OR r.ItemName IS NULL OR r.UOMCode IS NULL THEN 'Missing mandatory field'
            WHEN EXISTS (SELECT 1 FROM Inventory.Items i WHERE i.GroupID = @GroupID AND i.ItemCode = r.ItemCode AND i.IsActive = 1)
                THEN 'Duplicate item code'
            WHEN NOT EXISTS (SELECT 1 FROM Inventory.UOM u WHERE u.UOMCode = r.UOMCode AND u.IsActive = 1)
                THEN 'Invalid UOM code'
            WHEN r.CostPrice < 0 OR r.SellingPrice < 0 THEN 'Negative price'
            ELSE NULL
        END AS ErrorMessage
    FROM @Rows r;
END
GO

-- FR-ITM-08: reorder alert feed for dashboard
CREATE OR ALTER PROCEDURE Inventory.GetLowStockItems
    @GroupID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i.ItemID, i.ItemCode, i.ItemName, i.ReorderLevel,
           ISNULL(sl.OnHand, 0) AS OnHandQuantity
    FROM Inventory.Items i
    CROSS APPLY (
        SELECT SUM(CASE WHEN TransactionType = 1 THEN Quantity
                        WHEN TransactionType = 2 THEN -Quantity
                        ELSE Quantity END) AS OnHand
        FROM Inventory.StockLedger sl WHERE sl.ItemID = i.ItemID
    ) sl
    WHERE i.GroupID = @GroupID AND i.IsActive = 1 AND ISNULL(sl.OnHand, 0) <= i.ReorderLevel;
END
GO
