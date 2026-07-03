using LeatherPOS.Models.Sales;
using LeatherPOS.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LeatherPOS.API.Areas.Sales.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class InvoicesController : ControllerBase
    {
        private readonly IInvoiceService _invoiceService;
        public InvoicesController(IInvoiceService invoiceService) => _invoiceService = invoiceService;

        [HttpPost("Save")]
        public async Task<IActionResult> Save([FromBody] SaveInvoiceModel model) => Ok(await _invoiceService.SaveInvoiceAsync(model));

        [HttpPost("Return")]
        public async Task<IActionResult> Return([FromBody] ReturnInvoiceModel model) => Ok(await _invoiceService.ReturnInvoiceAsync(model));

        [HttpGet("GetAll/{groupId}")]
        public async Task<IActionResult> GetAll(int groupId) => Ok(await _invoiceService.GetAllInvoicesAsync(groupId));

        [HttpGet("Held/{groupId}")]
        public async Task<IActionResult> Held(int groupId) => Ok(await _invoiceService.GetHeldInvoicesAsync(groupId));

        [HttpGet("GetByID/{invoiceId}")]
        public async Task<IActionResult> GetById(int invoiceId) => Ok(await _invoiceService.GetInvoiceByIdAsync(invoiceId));

        // FR-POS-01: fast item search for the Billing screen
        [HttpGet("SearchItems/{groupId}")]
        public async Task<IActionResult> SearchItems(int groupId, [FromQuery] string term)
            => Ok(await _invoiceService.SearchItemsForBillingAsync(groupId, term ?? string.Empty));
    }
}
