using LeatherPOS.Models.Inventory;
using LeatherPOS.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LeatherPOS.API.Areas.Inventory.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ContainersController : ControllerBase
    {
        private readonly IContainerService _containerService;
        public ContainersController(IContainerService containerService) => _containerService = containerService;

        [HttpGet("GetAll/{groupId}")]
        public async Task<IActionResult> GetAll(int groupId) => Ok(await _containerService.GetAllContainersAsync(groupId));

        [HttpGet("GetByID/{containerId}")]
        public async Task<IActionResult> GetById(int containerId) => Ok(await _containerService.GetContainerByIdAsync(containerId));

        // FR-ITM-05: single transactional entry point - header + lines + StockLedger "In" postings
        [HttpPost("Save")]
        public async Task<IActionResult> Save([FromBody] ContainerSaveModel model) => Ok(await _containerService.SaveContainerAsync(model));

        [HttpGet("Suppliers/{groupId}")]
        public async Task<IActionResult> Suppliers(int groupId) => Ok(await _containerService.GetAllSuppliersAsync(groupId));
    }
}
