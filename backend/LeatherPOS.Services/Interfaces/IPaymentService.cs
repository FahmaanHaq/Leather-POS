using LeatherPOS.Models.Common;
using LeatherPOS.Models.Sales;

namespace LeatherPOS.Services.Interfaces
{
    public interface IPaymentService
    {
        Task<LeatherPOSResponse> SaveDebtSettlementAsync(DebtSettlementModel model);
        Task<LeatherPOSResponse> GetChequeRegisterAsync(int groupId, byte? statusFilter);
        Task<LeatherPOSResponse> UpdateChequeStatusAsync(ChequeStatusUpdateModel model);
        Task<LeatherPOSResponse> GetCashRegisterReportAsync(int groupId, DateTime reportDate);
        Task<LeatherPOSResponse> GetCardSettlementReportAsync(int groupId, DateTime reportDate);
    }
}
