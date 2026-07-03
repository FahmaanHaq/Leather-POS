namespace LeatherPOS.Models.Sales
{
    public class DebtSettlementModel
    {
        public int GroupID { get; set; }
        public int CustomerID { get; set; }
        public byte PaymentMode { get; set; }          // 1=Cash,2=Card,3=Cheque (not Credit - can't pay debt with more debt)
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
        public int CreatedBy { get; set; }
    }

    public class ChequeRegisterEntry
    {
        public int ChequeDetailID { get; set; }
        public string ChequeNo { get; set; } = string.Empty;
        public string Bank { get; set; } = string.Empty;
        public string? Branch { get; set; }
        public DateTime ChequeDate { get; set; }
        public byte Status { get; set; }               // 1=Pending,2=Deposited,3=Cleared,4=Bounced,5=Cancelled
        public decimal Amount { get; set; }
        public int? CustomerID { get; set; }
        public string? CustomerName { get; set; }
        public int? InvoiceID { get; set; }
        public string? InvoiceNo { get; set; }
        public int DaysUntilDue { get; set; }
    }

    public class ChequeStatusUpdateModel
    {
        public int ChequeDetailID { get; set; }
        public byte NewStatus { get; set; }
        public int ChangedBy { get; set; }
    }

    public class CashRegisterSummary
    {
        public int TransactionCount { get; set; }
        public decimal TotalCash { get; set; }
        public decimal TotalTendered { get; set; }
        public decimal TotalChangeGiven { get; set; }
    }

    public class CashRegisterTransaction
    {
        public int PaymentID { get; set; }
        public int? InvoiceID { get; set; }
        public int? CustomerID { get; set; }
        public decimal Amount { get; set; }
        public decimal? TenderedAmount { get; set; }
        public decimal? ChangeGiven { get; set; }
        public DateTime CreatedDate { get; set; }
    }

    public class CardSettlementSummary
    {
        public string CardType { get; set; } = string.Empty;
        public int TransactionCount { get; set; }
        public decimal TotalAmount { get; set; }
    }

    public class CardSettlementTransaction
    {
        public int PaymentID { get; set; }
        public int? InvoiceID { get; set; }
        public decimal Amount { get; set; }
        public string CardType { get; set; } = string.Empty;
        public string Last4Digits { get; set; } = string.Empty;
        public string? ApprovalCode { get; set; }
        public string? TerminalID { get; set; }
        public DateTime CreatedDate { get; set; }
    }

    public class CashRegisterReport
    {
        public CashRegisterSummary Summary { get; set; } = new();
        public List<CashRegisterTransaction> Transactions { get; set; } = new();
    }

    public class CardSettlementReport
    {
        public List<CardSettlementSummary> SummaryByCardType { get; set; } = new();
        public List<CardSettlementTransaction> Transactions { get; set; } = new();
    }
}
