using LeatherPOS.Models.Sales;
using LeatherPOS.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LeatherPOS.API.Areas.Sales.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PaymentsController : ControllerBase
    {
        private readonly IPaymentService _paymentService;
        public PaymentsController(IPaymentService paymentService) => _paymentService = paymentService;

        [HttpPost("DebtSettlement")]
        public async Task<IActionResult> DebtSettlement([FromBody] DebtSettlementModel model)
            => Ok(await _paymentService.SaveDebtSettlementAsync(model));

        [HttpGet("ChequeRegister/{groupId}")]
        public async Task<IActionResult> ChequeRegister(int groupId, [FromQuery] byte? status)
            => Ok(await _paymentService.GetChequeRegisterAsync(groupId, status));

        [HttpPost("ChequeStatus")]
        public async Task<IActionResult> ChequeStatus([FromBody] ChequeStatusUpdateModel model)
            => Ok(await _paymentService.UpdateChequeStatusAsync(model));

        [HttpGet("CashRegister/{groupId}")]
        public async Task<IActionResult> CashRegister(int groupId, [FromQuery] DateTime date)
            => Ok(await _paymentService.GetCashRegisterReportAsync(groupId, date));

        [HttpGet("CardSettlement/{groupId}")]
        public async Task<IActionResult> CardSettlement(int groupId, [FromQuery] DateTime date)
            => Ok(await _paymentService.GetCardSettlementReportAsync(groupId, date));
    }
}
