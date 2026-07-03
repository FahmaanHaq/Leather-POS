/* =========================================================================
   Security schema - Stored Procedures
   Result code convention (matches UpdateMasterGroup pattern):
     0        = generic error
     negative = specific validation failure
     positive = new ID (Save) / 1 = success (Update)
   ========================================================================= */

/* ---------------- ROLES ---------------- */

CREATE OR ALTER PROCEDURE Security.GetAllRoles
    @GroupID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT RoleID, GroupID, RoleName, Description, IsActive, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
    FROM Security.Roles
    WHERE GroupID = @GroupID AND IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE Security.GetRoleByID
    @RoleID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT RoleID, GroupID, RoleName, Description, IsActive, CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
    FROM Security.Roles
    WHERE RoleID = @RoleID;
END
GO

CREATE OR ALTER PROCEDURE Security.SaveRole
    @GroupID INT,
    @RoleName NVARCHAR(100),
    @Description NVARCHAR(255) = NULL,
    @CreatedBy INT,
    @Result INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM Security.Roles WHERE GroupID = @GroupID AND RoleName = @RoleName AND IsActive = 1)
    BEGIN
        SET @Result = -1; -- duplicate role name within group
        RETURN;
    END

    INSERT INTO Security.Roles (GroupID, RoleName, Description, CreatedBy, CreatedDate)
    VALUES (@GroupID, @RoleName, @Description, @CreatedBy, GETDATE());

    SET @Result = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE Security.UpdateRole
    @RoleID INT,
    @RoleName NVARCHAR(100),
    @Description NVARCHAR(255) = NULL,
    @IsActive BIT,
    @ModifiedBy INT,
    @Result INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF @IsActive = 0 AND EXISTS (SELECT 1 FROM Security.Users WHERE RoleID = @RoleID AND IsActive = 1)
    BEGIN
        SET @Result = -2; -- cannot deactivate a role with active users assigned
        RETURN;
    END

    IF EXISTS (
        SELECT 1 FROM Security.Roles
        WHERE RoleName = @RoleName AND IsActive = 1 AND RoleID <> @RoleID
          AND GroupID = (SELECT GroupID FROM Security.Roles WHERE RoleID = @RoleID)
    )
    BEGIN
        SET @Result = -1; -- duplicate role name within group
        RETURN;
    END

    UPDATE Security.Roles
    SET RoleName = @RoleName, Description = @Description, IsActive = @IsActive,
        ModifiedBy = @ModifiedBy, ModifiedDate = GETDATE()
    WHERE RoleID = @RoleID;

    SET @Result = 1;
END
GO

/* ---------------- SCREENS ---------------- */

CREATE OR ALTER PROCEDURE Security.GetAllScreens
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ScreenID, ScreenName, RouteKey, ParentScreenID, DisplayOrder, IsActive
    FROM Security.Screens
    WHERE IsActive = 1
    ORDER BY DisplayOrder;
END
GO

/* ---------------- USERS ---------------- */

CREATE OR ALTER PROCEDURE Security.GetAllUsers
    @GroupID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT u.UserID, u.GroupID, u.RoleID, r.RoleName, u.Username, u.Email, u.FullName,
           u.IsActive, u.CreatedBy, u.CreatedDate, u.ModifiedBy, u.ModifiedDate
    FROM Security.Users u
    JOIN Security.Roles r ON r.RoleID = u.RoleID
    WHERE u.GroupID = @GroupID AND u.IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE Security.GetUserByID
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT UserID, GroupID, RoleID, Username, Email, FullName, IsActive,
           CreatedBy, CreatedDate, ModifiedBy, ModifiedDate
    FROM Security.Users
    WHERE UserID = @UserID;
END
GO

CREATE OR ALTER PROCEDURE Security.SaveUser
    @GroupID INT,
    @RoleID INT,
    @Username NVARCHAR(100),
    @Email NVARCHAR(255) = NULL,
    @PasswordHash NVARCHAR(255),
    @FullName NVARCHAR(150),
    @CreatedBy INT,
    @Result INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM Security.Users WHERE GroupID = @GroupID AND Username = @Username AND IsActive = 1)
    BEGIN
        SET @Result = -1; -- duplicate username within group
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM Security.Roles WHERE RoleID = @RoleID AND IsActive = 1)
    BEGIN
        SET @Result = -3; -- role does not exist / inactive
        RETURN;
    END

    INSERT INTO Security.Users (GroupID, RoleID, Username, Email, PasswordHash, FullName, CreatedBy, CreatedDate)
    VALUES (@GroupID, @RoleID, @Username, @Email, @PasswordHash, @FullName, @CreatedBy, GETDATE());

    SET @Result = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE Security.UpdateUser
    @UserID INT,
    @RoleID INT,
    @Email NVARCHAR(255) = NULL,
    @FullName NVARCHAR(150),
    @IsActive BIT,
    @ModifiedBy INT,
    @Result INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE Security.Users
    SET RoleID = @RoleID, Email = @Email, FullName = @FullName, IsActive = @IsActive,
        ModifiedBy = @ModifiedBy, ModifiedDate = GETDATE()
    WHERE UserID = @UserID;

    SET @Result = 1;
END
GO

/* ---------------- ROLE / USER PERMISSIONS ---------------- */

CREATE OR ALTER PROCEDURE Security.GetRolePermissionsByRoleID
    @RoleID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT rp.RolePermissionID, rp.RoleID, rp.ScreenID, s.ScreenName, s.RouteKey,
           rp.CanView, rp.CanAdd, rp.CanEdit, rp.CanDelete, rp.CanExport, rp.CanApprove
    FROM Security.RolePermissions rp
    JOIN Security.Screens s ON s.ScreenID = rp.ScreenID
    WHERE rp.RoleID = @RoleID AND rp.IsActive = 1;
END
GO

-- Upsert one row per screen; called once per checkbox-grid save from the UI
CREATE OR ALTER PROCEDURE Security.SaveRolePermission
    @GroupID INT,
    @RoleID INT,
    @ScreenID INT,
    @CanView BIT, @CanAdd BIT, @CanEdit BIT, @CanDelete BIT, @CanExport BIT, @CanApprove BIT,
    @CreatedBy INT,
    @Result INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM Security.RolePermissions WHERE RoleID = @RoleID AND ScreenID = @ScreenID)
    BEGIN
        UPDATE Security.RolePermissions
        SET CanView = @CanView, CanAdd = @CanAdd, CanEdit = @CanEdit,
            CanDelete = @CanDelete, CanExport = @CanExport, CanApprove = @CanApprove,
            ModifiedBy = @CreatedBy, ModifiedDate = GETDATE()
        WHERE RoleID = @RoleID AND ScreenID = @ScreenID;
        SET @Result = 1;
    END
    ELSE
    BEGIN
        INSERT INTO Security.RolePermissions
            (GroupID, RoleID, ScreenID, CanView, CanAdd, CanEdit, CanDelete, CanExport, CanApprove, CreatedBy, CreatedDate)
        VALUES
            (@GroupID, @RoleID, @ScreenID, @CanView, @CanAdd, @CanEdit, @CanDelete, @CanExport, @CanApprove, @CreatedBy, GETDATE());
        SET @Result = SCOPE_IDENTITY();
    END
END
GO

-- Resolves effective permission for a user on a screen: user override wins, else role default (FR-SEC-04)
CREATE OR ALTER PROCEDURE Security.GetEffectivePermissionsByUserID
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @RoleID INT = (SELECT RoleID FROM Security.Users WHERE UserID = @UserID);

    SELECT
        s.ScreenID, s.ScreenName, s.RouteKey, s.ParentScreenID,
        COALESCE(up.CanView, rp.CanView, 0)       AS CanView,
        COALESCE(up.CanAdd, rp.CanAdd, 0)         AS CanAdd,
        COALESCE(up.CanEdit, rp.CanEdit, 0)       AS CanEdit,
        COALESCE(up.CanDelete, rp.CanDelete, 0)   AS CanDelete,
        COALESCE(up.CanExport, rp.CanExport, 0)   AS CanExport,
        COALESCE(up.CanApprove, rp.CanApprove, 0) AS CanApprove
    FROM Security.Screens s
    LEFT JOIN Security.RolePermissions rp ON rp.ScreenID = s.ScreenID AND rp.RoleID = @RoleID AND rp.IsActive = 1
    LEFT JOIN Security.UserPermissions up ON up.ScreenID = s.ScreenID AND up.UserID = @UserID AND up.IsActive = 1
    WHERE s.IsActive = 1
      AND (COALESCE(up.CanView, rp.CanView, 0) = 1)
    ORDER BY s.DisplayOrder;
END
GO
