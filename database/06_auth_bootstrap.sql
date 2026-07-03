IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'Administration') EXEC('CREATE SCHEMA Administration');
GO

CREATE TABLE Administration.Groups (
    GroupID         INT IDENTITY(1,1) PRIMARY KEY,
    GroupName       NVARCHAR(150) NOT NULL UNIQUE,
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedDate     DATETIME NOT NULL DEFAULT GETDATE()
);
GO

CREATE OR ALTER PROCEDURE Administration.GetAllGroups
AS
BEGIN
    SET NOCOUNT ON;
    SELECT GroupID, GroupName, IsActive FROM Administration.Groups WHERE IsActive = 1;
END
GO

CREATE OR ALTER PROCEDURE Administration.SaveGroup
    @GroupName NVARCHAR(150),
    @Result INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM Administration.Groups WHERE GroupName = @GroupName)
    BEGIN
        SET @Result = -1;
        RETURN;
    END
    INSERT INTO Administration.Groups (GroupName) VALUES (@GroupName);
    SET @Result = SCOPE_IDENTITY();
END
GO

/* Login lookup - returns the row needed to verify a password and issue a JWT.
   Username is looked up globally (not scoped to a group) since the person
   logging in doesn't know their GroupID yet - that comes back as part of the
   result once the password is verified in the API layer. */
CREATE OR ALTER PROCEDURE Security.GetUserForLogin
    @Username NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT u.UserID, u.GroupID, u.RoleID, r.RoleName, u.Username, u.PasswordHash, u.FullName, u.IsActive
    FROM Security.Users u
    JOIN Security.Roles r ON r.RoleID = u.RoleID
    WHERE u.Username = @Username AND u.IsActive = 1;
END
GO

/* Bootstrap check - the "first run" screen only works while this is 0 */
CREATE OR ALTER PROCEDURE Security.GetUserCount
AS
BEGIN
    SET NOCOUNT ON;
    SELECT COUNT(*) AS UserCount FROM Security.Users;
END
GO
