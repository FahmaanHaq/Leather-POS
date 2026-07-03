namespace LeatherPOS.Models.Sales
{
    public class Invoice
    {
        public int InvoiceID { get; set; }
        public string? InvoiceNo { get; set; }
        public int? CustomerID { get; set; }
        public string? CustomerName { get; set; }
        public DateTime InvoiceDate { get; set; }
        public byte Status { get; set; }              // 1=Held,2=Completed,3=Reversed,4=PartiallyReversed
        public decimal SubTotal { get; set; }
        public decimal DiscountTotal { get; set; }
        public decimal TotalAmount { get; set; }
        public bool PassToAccounting { get; set; }
    }

    public class HeldInvoice
    {
        public int InvoiceID { get; set; }
        public int? CustomerID { get; set; }
        public string? CustomerName { get; set; }
        public DateTime InvoiceDate { get; set; }
        public decimal TotalAmount { get; set; }
        public int LineCount { get; set; }
    }

    public class InvoiceLineDetail
    {
        public int InvoiceLineID { get; set; }
        public int ItemID { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public int UOMID { get; set; }
        public string UOMCode { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Discount { get; set; }
        public decimal LineTotal { get; set; }
        public decimal QuantityReturned { get; set; }
    }

    public class PaymentDetail
    {
        public int PaymentID { get; set; }
        public byte PaymentMode { get; set; }
        public decimal Amount { get; set; }
        public decimal? TenderedAmount { get; set; }
        public decimal? ChangeGiven { get; set; }
        public bool IsVoided { get; set; }
        public string? ChequeNo { get; set; }
        public string? Bank { get; set; }
        public string? Branch { get; set; }
        public DateTime? ChequeDate { get; set; }
        public byte? ChequeStatus { get; set; }
        public string? CardType { get; set; }
        public string? Last4Digits { get; set; }
        public string? ApprovalCode { get; set; }
        public string? TerminalID { get; set; }
    }

    /// <summary>Combines the three result sets from Sales.GetInvoiceByID.</summary>
    public class InvoiceDetail
    {
        public Invoice? Header { get; set; }
        public List<InvoiceLineDetail> Lines { get; set; } = new();
        public List<PaymentDetail> Payments { get; set; } = new();
    }

    public class InvoiceLineInput
    {
        public int ItemID { get; set; }
        public int UOMID { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal Discount { get; set; }
    }

    /// <summary>
    /// Flattened split-payment row submitted from the Billing screen. Only the
    /// fields relevant to PaymentMode need to be populated - matches the TVP
    /// shape in Sales.PaymentType exactly.
    /// </summary>
    public class PaymentInput
    {
        public byte PaymentMode { get; set; }          // 1=Cash,2=Card,3=Cheque,4=Credit
        public decimal Amount { get; set; }
        public decimal? TenderedAmount { get; set; }
        public decimal? ChangeGiven { get; set; }
        public string? ChequeNo { get; set; }
        public string? Bank { get; set; }
        public string? Branch { get; set; }
        public DateTime? ChequeDate { get; set; }
        public string? CardType { get; set; }
        public string? Last4Digits { get; set; }
        public string? ApprovalCode { get; set; }
        public string? TerminalID { get; set; }
    }

    public class SaveInvoiceModel
    {
        public int GroupID { get; set; }
        public int? InvoiceID { get; set; }             // set when updating a Held invoice
        public int? CustomerID { get; set; }
        public DateTime InvoiceDate { get; set; }
        public bool IsHeld { get; set; }
        public bool PassToAccounting { get; set; } = true;
        public List<InvoiceLineInput> Lines { get; set; } = new();
        public List<PaymentInput> Payments { get; set; } = new();
        public int CreatedBy { get; set; }
    }

    public class ReturnLineInput
    {
        public int InvoiceLineID { get; set; }
        public decimal QuantityToReturn { get; set; }
    }

    public class ReturnInvoiceModel
    {
        public int InvoiceID { get; set; }
        public List<ReturnLineInput> ReturnLines { get; set; } = new();
        public int CreatedBy { get; set; }
    }

    public class BillingItemSearchResult
    {
        public int ItemID { get; set; }
        public string ItemCode { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public string? Barcode { get; set; }
        public int BaseUOMID { get; set; }
        public string UOMCode { get; set; } = string.Empty;
        public decimal SellingPrice { get; set; }
        public decimal OnHandQuantity { get; set; }
    }

    /// <summary>
    /// Not in the original SRS - added so a returning customer's unit price
    /// for an item they've bought before can default to what they actually
    /// paid last time, rather than the catalogue SellingPrice.
    /// </summary>
    public class CustomerItemPriceHistory
    {
        public decimal UnitPrice { get; set; }
        public decimal Discount { get; set; }
        public DateTime LastPurchaseDate { get; set; }
        public string? LastInvoiceNo { get; set; }
    }
}
