namespace LeatherPOS.Models.Security
{
    public class Role
    {
        public int RoleID { get; set; }
        public int GroupID { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsActive { get; set; }
    }

    public class RoleSaveModel
    {
        public int GroupID { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int CreatedBy { get; set; }
    }

    public class RoleUpdateModel
    {
        public int RoleID { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public int ModifiedBy { get; set; }
    }

    public class User
    {
        public int UserID { get; set; }
        public int GroupID { get; set; }
        public int RoleID { get; set; }
        public string RoleName { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string FullName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    public class UserSaveModel
    {
        public int GroupID { get; set; }
        public int RoleID { get; set; }
        public string Username { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string Password { get; set; } = string.Empty; // hashed by the service before SP call
        public string FullName { get; set; } = string.Empty;
        public int CreatedBy { get; set; }
    }

    public class UserUpdateModel
    {
        public int UserID { get; set; }
        public int RoleID { get; set; }
        public string? Email { get; set; }
        public string FullName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public int ModifiedBy { get; set; }
    }

    public class Screen
    {
        public int ScreenID { get; set; }
        public string ScreenName { get; set; } = string.Empty;
        public string RouteKey { get; set; } = string.Empty;
        public int? ParentScreenID { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class RolePermission
    {
        public int RolePermissionID { get; set; }
        public int RoleID { get; set; }
        public int ScreenID { get; set; }
        public string ScreenName { get; set; } = string.Empty;
        public bool CanView { get; set; }
        public bool CanAdd { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
        public bool CanExport { get; set; }
        public bool CanApprove { get; set; }
    }

    public class RolePermissionSaveModel
    {
        public int GroupID { get; set; }
        public int RoleID { get; set; }
        public int ScreenID { get; set; }
        public bool CanView { get; set; }
        public bool CanAdd { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
        public bool CanExport { get; set; }
        public bool CanApprove { get; set; }
        public int CreatedBy { get; set; }
    }

    public class EffectivePermission
    {
        public int ScreenID { get; set; }
        public string ScreenName { get; set; } = string.Empty;
        public string RouteKey { get; set; } = string.Empty;
        public int? ParentScreenID { get; set; }
        public bool CanView { get; set; }
        public bool CanAdd { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
        public bool CanExport { get; set; }
        public bool CanApprove { get; set; }
    }
}
