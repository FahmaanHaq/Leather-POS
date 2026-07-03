using System.Data;
using LeatherPOS.Models.Common;
using LeatherPOS.Models.Security;
using LeatherPOS.Services.Interfaces;

namespace LeatherPOS.Services.Implementations
{
    public class RoleService : IRoleService
    {
        private readonly ILeatherPOSUnitOfWork _unitOfWork;

        public RoleService(ILeatherPOSUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        public async Task<LeatherPOSResponse> GetAllRolesAsync(int groupId)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(groupId.ToString(), DbType.Int32, ParameterDirection.Input) }
            };
            var result = await _unitOfWork.Repository().GetEntitiesBySPAsync<Role>("Security.GetAllRoles", parameters);
            return LeatherPOSResponse.Success(result);
        }

        public async Task<LeatherPOSResponse> GetRoleByIdAsync(int roleId)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@RoleID", new Tuple<string, DbType, ParameterDirection>(roleId.ToString(), DbType.Int32, ParameterDirection.Input) }
            };
            var result = await _unitOfWork.Repository().GetEntityBySPAsync<Role>("Security.GetRoleByID", parameters);
            return result is null ? LeatherPOSResponse.Fail("Role not found") : LeatherPOSResponse.Success(result);
        }

        public async Task<LeatherPOSResponse> SaveRoleAsync(RoleSaveModel model)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(model.GroupID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@RoleName", new Tuple<string, DbType, ParameterDirection>(model.RoleName, DbType.String, ParameterDirection.Input) },
                { "@Description", new Tuple<string, DbType, ParameterDirection>(model.Description ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@CreatedBy", new Tuple<string, DbType, ParameterDirection>(model.CreatedBy.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Result", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Output) }
            };
            var output = await _unitOfWork.Repository().ExecuteSPWithInputOutputAsync("Security.SaveRole", parameters);
            return MapResult(Convert.ToInt32(output["@Result"]), isUpdate: false);
        }

        public async Task<LeatherPOSResponse> UpdateRoleAsync(RoleUpdateModel model)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@RoleID", new Tuple<string, DbType, ParameterDirection>(model.RoleID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@RoleName", new Tuple<string, DbType, ParameterDirection>(model.RoleName, DbType.String, ParameterDirection.Input) },
                { "@Description", new Tuple<string, DbType, ParameterDirection>(model.Description ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@IsActive", new Tuple<string, DbType, ParameterDirection>(model.IsActive.ToString(), DbType.Boolean, ParameterDirection.Input) },
                { "@ModifiedBy", new Tuple<string, DbType, ParameterDirection>(model.ModifiedBy.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Result", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Output) }
            };
            var output = await _unitOfWork.Repository().ExecuteSPWithInputOutputAsync("Security.UpdateRole", parameters);
            return MapResult(Convert.ToInt32(output["@Result"]), isUpdate: true);
        }

        private static LeatherPOSResponse MapResult(int resultCode, bool isUpdate) => resultCode switch
        {
            1 when isUpdate => LeatherPOSResponse.Success(resultCode, "Role updated successfully"),
            > 0 when !isUpdate => LeatherPOSResponse.Success(resultCode, "Role saved successfully"),
            -1 => LeatherPOSResponse.Fail("A role with this name already exists in this group"),
            -2 => LeatherPOSResponse.Fail("Cannot deactivate a role that has active users assigned"),
            _ => LeatherPOSResponse.Fail("An unexpected error occurred while saving the role")
        };
    }
}
