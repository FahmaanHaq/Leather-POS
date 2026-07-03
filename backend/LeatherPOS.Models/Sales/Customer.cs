namespace LeatherPOS.Models.Sales
{
    public class Customer
    {
        public int CustomerID { get; set; }
        public int GroupID { get; set; }
        public byte CustomerType { get; set; }   // 1 = Regular, 2 = Walk-in
        public string Name { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public decimal? CreditLimit { get; set; }
        public int? CreditDays { get; set; }
        public decimal OutstandingBalance { get; set; }
        public bool IsActive { get; set; }
        public int CreatedBy { get; set; }
        public DateTime CreatedDate { get; set; }
        public int? ModifiedBy { get; set; }
        public DateTime? ModifiedDate { get; set; }
    }

    public class CustomerSaveModel
    {
        public int GroupID { get; set; }
        public byte CustomerType { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public decimal? CreditLimit { get; set; }
        public int? CreditDays { get; set; }
        public int CreatedBy { get; set; }
    }

    public class CustomerUpdateModel
    {
        public int CustomerID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public decimal? CreditLimit { get; set; }
        public int? CreditDays { get; set; }
        public bool IsActive { get; set; }
        public int ModifiedBy { get; set; }
    }

    public class CustomerLedgerEntry
    {
        public long LedgerID { get; set; }
        public DateTime TransactionDate { get; set; }
        public string? Narration { get; set; }
        public decimal DebitAmount { get; set; }
        public decimal CreditAmount { get; set; }
        public decimal Balance { get; set; }
    }
}
