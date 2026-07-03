using LeatherPOS.Models.Common;
using LeatherPOS.Models.Sales;

namespace LeatherPOS.Services.Interfaces
{
    public interface ICustomerService
    {
        Task<LeatherPOSResponse> GetAllCustomersAsync(int groupId);
        Task<LeatherPOSResponse> GetCustomerByIdAsync(int customerId);
        Task<LeatherPOSResponse> SaveCustomerAsync(CustomerSaveModel model);
        Task<LeatherPOSResponse> UpdateCustomerAsync(CustomerUpdateModel model);
        Task<LeatherPOSResponse> GetCustomerStatementAsync(int customerId, DateTime fromDate, DateTime toDate);
        Task<LeatherPOSResponse> GetReceivablesAgeingAsync(int groupId);
    }
}
