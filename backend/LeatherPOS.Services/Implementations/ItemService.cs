using System.Data;
using LeatherPOS.Models.Common;
using LeatherPOS.Models.Inventory;
using LeatherPOS.Services.Interfaces;

namespace LeatherPOS.Services.Implementations
{
    public class ItemService : IItemService
    {
        private readonly ILeatherPOSUnitOfWork _unitOfWork;
        public ItemService(ILeatherPOSUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        public async Task<LeatherPOSResponse> GetAllItemsAsync(int groupId)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(groupId.ToString(), DbType.Int32, ParameterDirection.Input) }
            };
            var result = await _unitOfWork.Repository().GetEntitiesBySPAsync<Item>("Inventory.GetAllItems", parameters);
            return LeatherPOSResponse.Success(result);
        }

        public async Task<LeatherPOSResponse> GetItemByIdAsync(int itemId)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@ItemID", new Tuple<string, DbType, ParameterDirection>(itemId.ToString(), DbType.Int32, ParameterDirection.Input) }
            };
            var result = await _unitOfWork.Repository().GetEntityBySPAsync<Item>("Inventory.GetItemByID", parameters);
            return result is null ? LeatherPOSResponse.Fail("Item not found") : LeatherPOSResponse.Success(result);
        }

        public async Task<LeatherPOSResponse> SaveItemAsync(ItemSaveModel model)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(model.GroupID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@ItemCode", new Tuple<string, DbType, ParameterDirection>(model.ItemCode, DbType.String, ParameterDirection.Input) },
                { "@ItemName", new Tuple<string, DbType, ParameterDirection>(model.ItemName, DbType.String, ParameterDirection.Input) },
                { "@CategoryID", new Tuple<string, DbType, ParameterDirection>(model.CategoryID?.ToString() ?? string.Empty, DbType.Int32, ParameterDirection.Input) },
                { "@BaseUOMID", new Tuple<string, DbType, ParameterDirection>(model.BaseUOMID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Barcode", new Tuple<string, DbType, ParameterDirection>(model.Barcode ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@Description", new Tuple<string, DbType, ParameterDirection>(model.Description ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@CostPrice", new Tuple<string, DbType, ParameterDirection>(model.CostPrice.ToString(), DbType.Decimal, ParameterDirection.Input) },
                { "@SellingPrice", new Tuple<string, DbType, ParameterDirection>(model.SellingPrice.ToString(), DbType.Decimal, ParameterDirection.Input) },
                { "@ReorderLevel", new Tuple<string, DbType, ParameterDirection>(model.ReorderLevel.ToString(), DbType.Decimal, ParameterDirection.Input) },
                { "@ImagePath", new Tuple<string, DbType, ParameterDirection>(model.ImagePath ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@CreatedBy", new Tuple<string, DbType, ParameterDirection>(model.CreatedBy.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Result", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Output) }
            };
            var output = await _unitOfWork.Repository().ExecuteSPWithInputOutputAsync("Inventory.SaveItem", parameters);
            return MapResult(Convert.ToInt32(output["@Result"]), isUpdate: false);
        }

        public async Task<LeatherPOSResponse> UpdateItemAsync(ItemUpdateModel model)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@ItemID", new Tuple<string, DbType, ParameterDirection>(model.ItemID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@ItemName", new Tuple<string, DbType, ParameterDirection>(model.ItemName, DbType.String, ParameterDirection.Input) },
                { "@CategoryID", new Tuple<string, DbType, ParameterDirection>(model.CategoryID?.ToString() ?? string.Empty, DbType.Int32, ParameterDirection.Input) },
                { "@Barcode", new Tuple<string, DbType, ParameterDirection>(model.Barcode ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@Description", new Tuple<string, DbType, ParameterDirection>(model.Description ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@CostPrice", new Tuple<string, DbType, ParameterDirection>(model.CostPrice.ToString(), DbType.Decimal, ParameterDirection.Input) },
                { "@SellingPrice", new Tuple<string, DbType, ParameterDirection>(model.SellingPrice.ToString(), DbType.Decimal, ParameterDirection.Input) },
                { "@ReorderLevel", new Tuple<string, DbType, ParameterDirection>(model.ReorderLevel.ToString(), DbType.Decimal, ParameterDirection.Input) },
                { "@ImagePath", new Tuple<string, DbType, ParameterDirection>(model.ImagePath ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@IsActive", new Tuple<string, DbType, ParameterDirection>(model.IsActive.ToString(), DbType.Boolean, ParameterDirection.Input) },
                { "@ModifiedBy", new Tuple<string, DbType, ParameterDirection>(model.ModifiedBy.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Result", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Output) }
            };
            var output = await _unitOfWork.Repository().ExecuteSPWithInputOutputAsync("Inventory.UpdateItem", parameters);
            return MapResult(Convert.ToInt32(output["@Result"]), isUpdate: true);
        }

        public async Task<LeatherPOSResponse> ValidateImportBatchAsync(int groupId, List<ItemImportRow> rows)
        {
            var table = new DataTable();
            table.Columns.Add("RowNumber", typeof(int));
            table.Columns.Add("ItemCode", typeof(string));
            table.Columns.Add("ItemName", typeof(string));
            table.Columns.Add("UOMCode", typeof(string));
            table.Columns.Add("CostPrice", typeof(decimal));
            table.Columns.Add("SellingPrice", typeof(decimal));

            foreach (var row in rows)
                table.Rows.Add(row.RowNumber, row.ItemCode, row.ItemName, row.UOMCode, row.CostPrice, row.SellingPrice);

            var scalarParameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(groupId.ToString(), DbType.Int32, ParameterDirection.Input) }
            };

            var result = await _unitOfWork.Repository().GetEntitiesBySPWithTableValuedParameterAsync<ItemImportRowResult>(
                "Inventory.ValidateItemImportBatch", "@Rows", "Inventory.ItemImportRowType", table, scalarParameters);

            return LeatherPOSResponse.Success(new ItemImportBatchResult
            {
                Rows = result,
                ValidCount = result.Count(r => r.IsValid),
                ErrorCount = result.Count(r => !r.IsValid)
            });
        }

        public async Task<LeatherPOSResponse> GetLowStockItemsAsync(int groupId)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(groupId.ToString(), DbType.Int32, ParameterDirection.Input) }
            };
            var result = await _unitOfWork.Repository().GetEntitiesBySPAsync<Item>("Inventory.GetLowStockItems", parameters);
            return LeatherPOSResponse.Success(result);
        }

        private static LeatherPOSResponse MapResult(int resultCode, bool isUpdate) => resultCode switch
        {
            1 when isUpdate => LeatherPOSResponse.Success(resultCode, "Item updated successfully"),
            > 0 when !isUpdate => LeatherPOSResponse.Success(resultCode, "Item saved successfully"),
            -1 => LeatherPOSResponse.Fail("An item with this code already exists in this group"),
            -3 => LeatherPOSResponse.Fail("The selected unit of measurement is invalid or inactive"),
            _ => LeatherPOSResponse.Fail("An unexpected error occurred while saving the item")
        };
    }

    public class UOMService : IUOMService
    {
        private readonly ILeatherPOSUnitOfWork _unitOfWork;
        public UOMService(ILeatherPOSUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        public async Task<LeatherPOSResponse> GetAllUOMAsync()
        {
            var result = await _unitOfWork.Repository().GetEntitiesBySPAsync<UOM>(
                "Inventory.GetAllUOM", new Dictionary<string, Tuple<string, DbType, ParameterDirection>>());
            return LeatherPOSResponse.Success(result);
        }
    }
}
