using LeatherPOS.Models.Sales;
using LeatherPOS.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LeatherPOS.API.Areas.Sales.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CustomersController : ControllerBase
    {
        private readonly ICustomerService _customerService;

        public CustomersController(ICustomerService customerService)
        {
            _customerService = customerService;
        }

        [HttpGet("GetAll/{groupId}")]
        public async Task<IActionResult> GetAll(int groupId)
            => Ok(await _customerService.GetAllCustomersAsync(groupId));

        [HttpGet("GetByID/{customerId}")]
        public async Task<IActionResult> GetById(int customerId)
            => Ok(await _customerService.GetCustomerByIdAsync(customerId));

        [HttpPost("Save")]
        public async Task<IActionResult> Save([FromBody] CustomerSaveModel model)
            => Ok(await _customerService.SaveCustomerAsync(model));

        [HttpPost("Update")]
        public async Task<IActionResult> Update([FromBody] CustomerUpdateModel model)
            => Ok(await _customerService.UpdateCustomerAsync(model));

        [HttpGet("Statement/{customerId}")]
        public async Task<IActionResult> Statement(int customerId, [FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
            => Ok(await _customerService.GetCustomerStatementAsync(customerId, fromDate, toDate));

        [HttpGet("ReceivablesAgeing/{groupId}")]
        public async Task<IActionResult> ReceivablesAgeing(int groupId)
            => Ok(await _customerService.GetReceivablesAgeingAsync(groupId));
    }
}
