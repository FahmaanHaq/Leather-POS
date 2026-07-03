using System.Data;
using LeatherPOS.Models.Common;
using LeatherPOS.Models.Security;
using LeatherPOS.Services.Interfaces;

namespace LeatherPOS.Services.Implementations
{
    public class PermissionService : IPermissionService
    {
        private readonly ILeatherPOSUnitOfWork _unitOfWork;

        public PermissionService(ILeatherPOSUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        public async Task<LeatherPOSResponse> GetAllScreensAsync()
        {
            var result = await _unitOfWork.Repository().GetEntitiesBySPAsync<Screen>(
                "Security.GetAllScreens", new Dictionary<string, Tuple<string, DbType, ParameterDirection>>());
            return LeatherPOSResponse.Success(result);
        }

        public async Task<LeatherPOSResponse> GetRolePermissionsAsync(int roleId)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@RoleID", new Tuple<string, DbType, ParameterDirection>(roleId.ToString(), DbType.Int32, ParameterDirection.Input) }
            };
            var result = await _unitOfWork.Repository().GetEntitiesBySPAsync<RolePermission>("Security.GetRolePermissionsByRoleID", parameters);
            return LeatherPOSResponse.Success(result);
        }

        public async Task<LeatherPOSResponse> SaveRolePermissionAsync(RolePermissionSaveModel model)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(model.GroupID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@RoleID", new Tuple<string, DbType, ParameterDirection>(model.RoleID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@ScreenID", new Tuple<string, DbType, ParameterDirection>(model.ScreenID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@CanView", new Tuple<string, DbType, ParameterDirection>(model.CanView.ToString(), DbType.Boolean, ParameterDirection.Input) },
                { "@CanAdd", new Tuple<string, DbType, ParameterDirection>(model.CanAdd.ToString(), DbType.Boolean, ParameterDirection.Input) },
                { "@CanEdit", new Tuple<string, DbType, ParameterDirection>(model.CanEdit.ToString(), DbType.Boolean, ParameterDirection.Input) },
                { "@CanDelete", new Tuple<string, DbType, ParameterDirection>(model.CanDelete.ToString(), DbType.Boolean, ParameterDirection.Input) },
                { "@CanExport", new Tuple<string, DbType, ParameterDirection>(model.CanExport.ToString(), DbType.Boolean, ParameterDirection.Input) },
                { "@CanApprove", new Tuple<string, DbType, ParameterDirection>(model.CanApprove.ToString(), DbType.Boolean, ParameterDirection.Input) },
                { "@CreatedBy", new Tuple<string, DbType, ParameterDirection>(model.CreatedBy.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Result", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Output) }
            };
            var output = await _unitOfWork.Repository().ExecuteSPWithInputOutputAsync("Security.SaveRolePermission", parameters);
            var resultCode = Convert.ToInt32(output["@Result"]);

            if (resultCode > 0)
            {
                var logParams = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
                {
                    { "@GroupID", new Tuple<string, DbType, ParameterDirection>(model.GroupID.ToString(), DbType.Int32, ParameterDirection.Input) },
                    { "@UserID", new Tuple<string, DbType, ParameterDirection>(model.CreatedBy.ToString(), DbType.Int32, ParameterDirection.Input) },
                    { "@Action", new Tuple<string, DbType, ParameterDirection>("PermissionChange", DbType.String, ParameterDirection.Input) },
                    { "@EntityName", new Tuple<string, DbType, ParameterDirection>("RolePermission", DbType.String, ParameterDirection.Input) },
                    { "@EntityID", new Tuple<string, DbType, ParameterDirection>(model.ScreenID.ToString(), DbType.Int32, ParameterDirection.Input) },
                    { "@BeforeValue", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.String, ParameterDirection.Input) },
                    { "@AfterValue", new Tuple<string, DbType, ParameterDirection>(
                        $"RoleID={model.RoleID}, View={model.CanView}, Add={model.CanAdd}, Edit={model.CanEdit}, Delete={model.CanDelete}, Export={model.CanExport}, Approve={model.CanApprove}",
                        DbType.String, ParameterDirection.Input) }
                };
                await _unitOfWork.Repository().ExecuteSPWithInputOutputAsync("Security.LogActivity", logParams);
            }

            return resultCode > 0
                ? LeatherPOSResponse.Success(resultCode, "Permission saved successfully")
                : LeatherPOSResponse.Fail("An unexpected error occurred while saving the permission");
        }

        public async Task<LeatherPOSResponse> GetEffectivePermissionsAsync(int userId)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@UserID", new Tuple<string, DbType, ParameterDirection>(userId.ToString(), DbType.Int32, ParameterDirection.Input) }
            };
            // FR-SEC-06: drives the dynamically generated left navigation menu
            var result = await _unitOfWork.Repository().GetEntitiesBySPAsync<EffectivePermission>("Security.GetEffectivePermissionsByUserID", parameters);
            return LeatherPOSResponse.Success(result);
        }
    }
}
