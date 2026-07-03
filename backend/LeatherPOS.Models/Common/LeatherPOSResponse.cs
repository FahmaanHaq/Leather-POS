namespace LeatherPOS.Models.Common
{
    /// <summary>
    /// Mirrors the existing AgriGenERPResponse wrapper used across the client's
    /// other ERP products, so CommonGet/CommonPost on the frontend need no changes.
    /// If your solution already defines this class, delete this file and reference
    /// the existing one instead.
    /// </summary>
    public class LeatherPOSResponse
    {
        public bool Status { get; set; }
        public string Message { get; set; } = string.Empty;
        public object? Data { get; set; }

        public static LeatherPOSResponse Success(object? data, string message = "Success")
            => new LeatherPOSResponse { Status = true, Message = message, Data = data };

        public static LeatherPOSResponse Fail(string message)
            => new LeatherPOSResponse { Status = false, Message = message, Data = null };
    }

    /// <summary>Placeholder generic argument for GetThreeResultSetsBySPAsync when an
    /// SP only returns two result sets - the third list is simply never populated.</summary>
    public class EmptyResultSet { }
}
