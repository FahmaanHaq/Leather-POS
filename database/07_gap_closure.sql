/* =========================================================================
   Phase 1 gap-closure: Groups CRUD completion, Screens seed data,
   ActivityLog write helper.
   ========================================================================= */

CREATE OR ALTER PROCEDURE Administration.UpdateGroup
    @GroupID INT,
    @GroupName NVARCHAR(150),
    @IsActive BIT,
    @Result INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM Administration.Groups WHERE GroupName = @GroupName AND GroupID <> @GroupID)
    BEGIN
        SET @Result = -1; -- duplicate group name
        RETURN;
    END

    -- Guard: don't deactivate a group that still has active users in it
    IF @IsActive = 0 AND EXISTS (SELECT 1 FROM Security.Users WHERE GroupID = @GroupID AND IsActive = 1)
    BEGIN
        SET @Result = -2;
        RETURN;
    END

    UPDATE Administration.Groups SET GroupName = @GroupName, IsActive = @IsActive WHERE GroupID = @GroupID;
    SET @Result = 1;
END
GO

/* -------------------------------------------------------------------------
   Screens seed data - drives both the permissions matrix and (eventually)
   the dynamically-generated nav menu via GetEffectivePermissionsByUserID.
   Safe to re-run: skips rows that already exist by RouteKey.
   ------------------------------------------------------------------------- */
INSERT INTO Security.Screens (ScreenName, RouteKey, DisplayOrder, CreatedBy)
SELECT v.ScreenName, v.RouteKey, v.DisplayOrder, 1
FROM (VALUES
    ('Dashboard',   'dashboard',   0),
    ('Customers',   'customers',   1),
    ('Items',       'items',       2),
    ('Containers',  'containers',  3),
    ('Users',       'users',       4),
    ('Roles',       'roles',       5),
    ('Permissions', 'permissions', 6),
    ('Groups',      'groups',      7),
    ('Activity Log','activitylog', 8)
) AS v(ScreenName, RouteKey, DisplayOrder)
WHERE NOT EXISTS (SELECT 1 FROM Security.Screens s WHERE s.RouteKey = v.RouteKey);
GO

/* -------------------------------------------------------------------------
   ActivityLog write helper - single entry point so both the API and any
   future SP-level triggers log consistently.
   ------------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE Security.LogActivity
    @GroupID INT,
    @UserID INT,
    @Action NVARCHAR(100),
    @EntityName NVARCHAR(100) = NULL,
    @EntityID INT = NULL,
    @BeforeValue NVARCHAR(MAX) = NULL,
    @AfterValue NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Security.ActivityLog (GroupID, UserID, Action, EntityName, EntityID, BeforeValue, AfterValue, CreatedDate)
    VALUES (@GroupID, @UserID, @Action, @EntityName, @EntityID, @BeforeValue, @AfterValue, GETDATE());
END
GO

/* -------------------------------------------------------------------------
   Grandfather clause - the permissions matrix is about to start being
   enforced by the frontend nav. Without this, any role created before that
   (e.g. the Administrator role from initial /Auth/Bootstrap) has zero
   RolePermissions rows and would suddenly see an empty nav. This grants
   full access to every existing role on every existing screen. Safe to
   re-run - only inserts combinations that don't already exist.
   ------------------------------------------------------------------------- */
INSERT INTO Security.RolePermissions (GroupID, RoleID, ScreenID, CanView, CanAdd, CanEdit, CanDelete, CanExport, CanApprove, CreatedBy, CreatedDate)
SELECT r.GroupID, r.RoleID, s.ScreenID, 1, 1, 1, 1, 1, 1, 1, GETDATE()
FROM Security.Roles r
CROSS JOIN Security.Screens s
WHERE NOT EXISTS (
    SELECT 1 FROM Security.RolePermissions rp WHERE rp.RoleID = r.RoleID AND rp.ScreenID = s.ScreenID
);
GO

CREATE OR ALTER PROCEDURE Security.GetActivityLog
    @GroupID INT,
    @Top INT = 200
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP (@Top) al.ActivityLogID, al.UserID, u.Username, al.Action, al.EntityName, al.EntityID,
           al.BeforeValue, al.AfterValue, al.CreatedDate
    FROM Security.ActivityLog al
    LEFT JOIN Security.Users u ON u.UserID = al.UserID
    WHERE al.GroupID = @GroupID
    ORDER BY al.CreatedDate DESC;
END
GO

