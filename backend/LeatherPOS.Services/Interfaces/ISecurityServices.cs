using LeatherPOS.Models.Common;
using LeatherPOS.Models.Security;

namespace LeatherPOS.Services.Interfaces
{
    public interface IRoleService
    {
        Task<LeatherPOSResponse> GetAllRolesAsync(int groupId);
        Task<LeatherPOSResponse> GetRoleByIdAsync(int roleId);
        Task<LeatherPOSResponse> SaveRoleAsync(RoleSaveModel model);
        Task<LeatherPOSResponse> UpdateRoleAsync(RoleUpdateModel model);
    }

    public interface IUserService
    {
        Task<LeatherPOSResponse> GetAllUsersAsync(int groupId);
        Task<LeatherPOSResponse> GetUserByIdAsync(int userId);
        Task<LeatherPOSResponse> SaveUserAsync(UserSaveModel model);
        Task<LeatherPOSResponse> UpdateUserAsync(UserUpdateModel model);
    }

    public interface IPermissionService
    {
        Task<LeatherPOSResponse> GetAllScreensAsync();
        Task<LeatherPOSResponse> GetRolePermissionsAsync(int roleId);
        Task<LeatherPOSResponse> SaveRolePermissionAsync(RolePermissionSaveModel model);
        Task<LeatherPOSResponse> GetEffectivePermissionsAsync(int userId);
    }
}
