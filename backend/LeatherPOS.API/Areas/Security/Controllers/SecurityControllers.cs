using LeatherPOS.Models.Security;
using LeatherPOS.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LeatherPOS.API.Areas.Security.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // FR-SEC-08: enforced server-side, not just UI menu hiding
    public class RolesController : ControllerBase
    {
        private readonly IRoleService _roleService;
        public RolesController(IRoleService roleService) => _roleService = roleService;

        [HttpGet("GetAll/{groupId}")]
        public async Task<IActionResult> GetAll(int groupId) => Ok(await _roleService.GetAllRolesAsync(groupId));

        [HttpGet("GetByID/{roleId}")]
        public async Task<IActionResult> GetById(int roleId) => Ok(await _roleService.GetRoleByIdAsync(roleId));

        [HttpPost("Save")]
        public async Task<IActionResult> Save([FromBody] RoleSaveModel model) => Ok(await _roleService.SaveRoleAsync(model));

        [HttpPost("Update")]
        public async Task<IActionResult> Update([FromBody] RoleUpdateModel model) => Ok(await _roleService.UpdateRoleAsync(model));
    }

    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;
        public UsersController(IUserService userService) => _userService = userService;

        [HttpGet("GetAll/{groupId}")]
        public async Task<IActionResult> GetAll(int groupId) => Ok(await _userService.GetAllUsersAsync(groupId));

        [HttpGet("GetByID/{userId}")]
        public async Task<IActionResult> GetById(int userId) => Ok(await _userService.GetUserByIdAsync(userId));

        [HttpPost("Save")]
        public async Task<IActionResult> Save([FromBody] UserSaveModel model) => Ok(await _userService.SaveUserAsync(model));

        [HttpPost("Update")]
        public async Task<IActionResult> Update([FromBody] UserUpdateModel model) => Ok(await _userService.UpdateUserAsync(model));
    }

    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PermissionsController : ControllerBase
    {
        private readonly IPermissionService _permissionService;
        public PermissionsController(IPermissionService permissionService) => _permissionService = permissionService;

        [HttpGet("Screens")]
        public async Task<IActionResult> Screens() => Ok(await _permissionService.GetAllScreensAsync());

        [HttpGet("RolePermissions/{roleId}")]
        public async Task<IActionResult> RolePermissions(int roleId) => Ok(await _permissionService.GetRolePermissionsAsync(roleId));

        [HttpPost("SaveRolePermission")]
        public async Task<IActionResult> SaveRolePermission([FromBody] RolePermissionSaveModel model)
            => Ok(await _permissionService.SaveRolePermissionAsync(model));

        [HttpGet("Effective/{userId}")]
        public async Task<IActionResult> Effective(int userId) => Ok(await _permissionService.GetEffectivePermissionsAsync(userId));
    }
}
