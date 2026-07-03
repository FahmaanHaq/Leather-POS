using LeatherPOS.Models.Inventory;
using LeatherPOS.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LeatherPOS.API.Areas.Inventory.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ItemsController : ControllerBase
    {
        private readonly IItemService _itemService;
        public ItemsController(IItemService itemService) => _itemService = itemService;

        [HttpGet("GetAll/{groupId}")]
        public async Task<IActionResult> GetAll(int groupId) => Ok(await _itemService.GetAllItemsAsync(groupId));

        [HttpGet("GetByID/{itemId}")]
        public async Task<IActionResult> GetById(int itemId) => Ok(await _itemService.GetItemByIdAsync(itemId));

        [HttpPost("Save")]
        public async Task<IActionResult> Save([FromBody] ItemSaveModel model) => Ok(await _itemService.SaveItemAsync(model));

        [HttpPost("Update")]
        public async Task<IActionResult> Update([FromBody] ItemUpdateModel model) => Ok(await _itemService.UpdateItemAsync(model));

        // FR-ITM-02: preview step before commit - parses the uploaded Excel client-side/server-side
        // into rows, then returns per-row validation results for the AddEdit/BulkImport grid.
        [HttpPost("ValidateImportBatch/{groupId}")]
        public async Task<IActionResult> ValidateImportBatch(int groupId, [FromBody] List<ItemImportRow> rows)
            => Ok(await _itemService.ValidateImportBatchAsync(groupId, rows));

        [HttpGet("LowStock/{groupId}")]
        public async Task<IActionResult> LowStock(int groupId) => Ok(await _itemService.GetLowStockItemsAsync(groupId));
    }

    [ApiController]
    [Route("api/[controller]")]
    public class UOMController : ControllerBase
    {
        private readonly IUOMService _uomService;
        public UOMController(IUOMService uomService) => _uomService = uomService;

        [HttpGet("GetAll")]
        public async Task<IActionResult> GetAll() => Ok(await _uomService.GetAllUOMAsync());
    }
}
