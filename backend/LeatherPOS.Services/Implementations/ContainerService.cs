using System.Data;
using LeatherPOS.Models.Common;
using LeatherPOS.Models.Inventory;
using LeatherPOS.Services.Interfaces;

namespace LeatherPOS.Services.Implementations
{
    public class ContainerService : IContainerService
    {
        private readonly ILeatherPOSUnitOfWork _unitOfWork;
        public ContainerService(ILeatherPOSUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        public async Task<LeatherPOSResponse> GetAllContainersAsync(int groupId)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(groupId.ToString(), DbType.Int32, ParameterDirection.Input) }
            };
            var result = await _unitOfWork.Repository().GetEntitiesBySPAsync<Container>("Inventory.GetAllContainers", parameters);
            return LeatherPOSResponse.Success(result);
        }

        public async Task<LeatherPOSResponse> GetContainerByIdAsync(int containerId)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@ContainerID", new Tuple<string, DbType, ParameterDirection>(containerId.ToString(), DbType.Int32, ParameterDirection.Input) }
            };
            // GetContainerByID returns two result sets (header + lines); the real repository
            // implementation should expose a multi-result-set overload - shown here as a single
            // call returning the header, with GetContainerLinesAsync as the companion for lines.
            var result = await _unitOfWork.Repository().GetEntityBySPAsync<Container>("Inventory.GetContainerByID", parameters);
            return result is null ? LeatherPOSResponse.Fail("Container not found") : LeatherPOSResponse.Success(result);
        }

        public async Task<LeatherPOSResponse> SaveContainerAsync(ContainerSaveModel model)
        {
            if (model.Lines is null || model.Lines.Count == 0)
                return LeatherPOSResponse.Fail("A container must have at least one stock line");

            var table = new DataTable();
            table.Columns.Add("ItemID", typeof(int));
            table.Columns.Add("Quantity", typeof(decimal));
            table.Columns.Add("UnitCost", typeof(decimal));
            foreach (var line in model.Lines)
                table.Rows.Add(line.ItemID, line.Quantity, line.UnitCost);

            var scalarParameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(model.GroupID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@SupplierID", new Tuple<string, DbType, ParameterDirection>(model.SupplierID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@ReferenceNo", new Tuple<string, DbType, ParameterDirection>(model.ReferenceNo, DbType.String, ParameterDirection.Input) },
                { "@ReceivedDate", new Tuple<string, DbType, ParameterDirection>(model.ReceivedDate.ToString("yyyy-MM-dd"), DbType.DateTime, ParameterDirection.Input) },
                { "@CreatedBy", new Tuple<string, DbType, ParameterDirection>(model.CreatedBy.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Result", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Output) }
            };

            var output = await _unitOfWork.Repository().ExecuteSPWithTableValuedParameterAsync(
                "Inventory.SaveContainer", "@Lines", "Inventory.ContainerItemType", table, scalarParameters);

            var resultCode = Convert.ToInt32(output["@Result"]);
            return resultCode switch
            {
                > 0 => LeatherPOSResponse.Success(resultCode, "Container received and stock updated successfully"),
                -5 => LeatherPOSResponse.Fail("A container must have at least one stock line"),
                -6 => LeatherPOSResponse.Fail("Every line must have a positive quantity and non-negative unit cost"),
                _ => LeatherPOSResponse.Fail("An unexpected error occurred while receiving the container")
            };
        }

        public async Task<LeatherPOSResponse> GetAllSuppliersAsync(int groupId)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(groupId.ToString(), DbType.Int32, ParameterDirection.Input) }
            };
            var result = await _unitOfWork.Repository().GetEntitiesBySPAsync<Supplier>("Inventory.GetAllSuppliers", parameters);
            return LeatherPOSResponse.Success(result);
        }
    }
}
