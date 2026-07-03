namespace LeatherPOS.Models.Security
{
    public class ActivityLogEntry
    {
        public long ActivityLogID { get; set; }
        public int UserID { get; set; }
        public string? Username { get; set; }
        public string Action { get; set; } = string.Empty;
        public string? EntityName { get; set; }
        public int? EntityID { get; set; }
        public string? BeforeValue { get; set; }
        public string? AfterValue { get; set; }
        public DateTime CreatedDate { get; set; }
    }
}
