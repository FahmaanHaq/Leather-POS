namespace LeatherPOS.Models.Inventory
{
    public class Item
    {
        public int ItemID { get; set; }
        public int GroupID { get; set; }
        public string ItemCode { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public int? CategoryID { get; set; }
        public string? CategoryName { get; set; }
        public int BaseUOMID { get; set; }
        public string UOMCode { get; set; } = string.Empty;
        public string? Barcode { get; set; }
        public string? Description { get; set; }
        public decimal CostPrice { get; set; }
        public decimal SellingPrice { get; set; }
        public decimal ReorderLevel { get; set; }
        public string? ImagePath { get; set; }
        public decimal OnHandQuantity { get; set; }
        public bool IsActive { get; set; }
    }

    public class ItemSaveModel
    {
        public int GroupID { get; set; }
        public string ItemCode { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public int? CategoryID { get; set; }
        public int BaseUOMID { get; set; }
        public string? Barcode { get; set; }
        public string? Description { get; set; }
        public decimal CostPrice { get; set; }
        public decimal SellingPrice { get; set; }
        public decimal ReorderLevel { get; set; }
        public string? ImagePath { get; set; }
        public int CreatedBy { get; set; }
    }

    public class ItemUpdateModel
    {
        public int ItemID { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public int? CategoryID { get; set; }
        public string? Barcode { get; set; }
        public string? Description { get; set; }
        public decimal CostPrice { get; set; }
        public decimal SellingPrice { get; set; }
        public decimal ReorderLevel { get; set; }
        public string? ImagePath { get; set; }
        public bool IsActive { get; set; }
        public int ModifiedBy { get; set; }
    }

    public class ItemImportRow
    {
        public int RowNumber { get; set; }
        public string? ItemCode { get; set; }
        public string? ItemName { get; set; }
        public string? UOMCode { get; set; }
        public decimal CostPrice { get; set; }
        public decimal SellingPrice { get; set; }
    }

    public class ItemImportRowResult : ItemImportRow
    {
        public string? ErrorMessage { get; set; }
        public bool IsValid => string.IsNullOrEmpty(ErrorMessage);
    }

    public class ItemImportBatchResult
    {
        public List<ItemImportRowResult> Rows { get; set; } = new();
        public int ValidCount { get; set; }
        public int ErrorCount { get; set; }
    }

    public class UOM
    {
        public int UOMID { get; set; }
        public string UOMCode { get; set; } = string.Empty;
        public string UOMName { get; set; } = string.Empty;
        public byte UOMType { get; set; }
    }
}
