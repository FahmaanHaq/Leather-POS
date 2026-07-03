using LeatherPOS.Models.Common;
using LeatherPOS.Models.Sales;

namespace LeatherPOS.Services.Interfaces
{
    public interface IInvoiceService
    {
        Task<LeatherPOSResponse> SaveInvoiceAsync(SaveInvoiceModel model);
        Task<LeatherPOSResponse> ReturnInvoiceAsync(ReturnInvoiceModel model);
        Task<LeatherPOSResponse> GetAllInvoicesAsync(int groupId);
        Task<LeatherPOSResponse> GetHeldInvoicesAsync(int groupId);
        Task<LeatherPOSResponse> GetInvoiceByIdAsync(int invoiceId);
        Task<LeatherPOSResponse> SearchItemsForBillingAsync(int groupId, string searchTerm);
        Task<LeatherPOSResponse> GetCustomerItemLastPriceAsync(int customerId, int itemId);
    }
}
