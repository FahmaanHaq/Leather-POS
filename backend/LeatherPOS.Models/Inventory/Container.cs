namespace LeatherPOS.Models.Inventory
{
    public class Supplier
    {
        public int SupplierID { get; set; }
        public int GroupID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? ContactInfo { get; set; }
        public string? PaymentTerms { get; set; }
        public bool IsActive { get; set; }
    }

    public class SupplierSaveModel
    {
        public int GroupID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? ContactInfo { get; set; }
        public string? PaymentTerms { get; set; }
        public int CreatedBy { get; set; }
    }

    public class Container
    {
        public int ContainerID { get; set; }
        public int GroupID { get; set; }
        public int SupplierID { get; set; }
        public string SupplierName { get; set; } = string.Empty;
        public string ReferenceNo { get; set; } = string.Empty;
        public DateTime ReceivedDate { get; set; }
        public int LineCount { get; set; }
        public bool IsActive { get; set; }
    }

    public class ContainerLine
    {
        public int ItemID { get; set; }
        public string? ItemName { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitCost { get; set; }
    }

    public class ContainerSaveModel
    {
        public int GroupID { get; set; }
        public int SupplierID { get; set; }
        public string ReferenceNo { get; set; } = string.Empty;
        public DateTime ReceivedDate { get; set; }
        public List<ContainerLine> Lines { get; set; } = new();
        public int CreatedBy { get; set; }
    }
}
