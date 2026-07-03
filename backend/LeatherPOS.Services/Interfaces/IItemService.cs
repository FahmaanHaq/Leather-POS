using LeatherPOS.Models.Common;
using LeatherPOS.Models.Inventory;

namespace LeatherPOS.Services.Interfaces
{
    public interface IItemService
    {
        Task<LeatherPOSResponse> GetAllItemsAsync(int groupId);
        Task<LeatherPOSResponse> GetItemByIdAsync(int itemId);
        Task<LeatherPOSResponse> SaveItemAsync(ItemSaveModel model);
        Task<LeatherPOSResponse> UpdateItemAsync(ItemUpdateModel model);
        Task<LeatherPOSResponse> ValidateImportBatchAsync(int groupId, List<ItemImportRow> rows);
        Task<LeatherPOSResponse> GetLowStockItemsAsync(int groupId);
    }

    public interface IUOMService
    {
        Task<LeatherPOSResponse> GetAllUOMAsync();
    }
}
