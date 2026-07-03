using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using LeatherPOS.Models.Common;
using LeatherPOS.Models.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace LeatherPOS.Services.Implementations
{
    public interface IAuthService
    {
        Task<LeatherPOSResponse> LoginAsync(LoginRequest request);
        Task<LeatherPOSResponse> BootstrapAsync(BootstrapRequest request);
        Task<LeatherPOSResponse> GetUserCountAsync();
    }

    public class AuthService : IAuthService
    {
        private readonly ILeatherPOSUnitOfWork _unitOfWork;
        private readonly IConfiguration _configuration;
        private readonly PasswordHasher<UserForLogin> _passwordHasher = new();

        public AuthService(ILeatherPOSUnitOfWork unitOfWork, IConfiguration configuration)
        {
            _unitOfWork = unitOfWork;
            _configuration = configuration;
        }

        public async Task<LeatherPOSResponse> LoginAsync(LoginRequest request)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@Username", new Tuple<string, DbType, ParameterDirection>(request.Username, DbType.String, ParameterDirection.Input) }
            };

            var user = await _unitOfWork.Repository().GetEntityBySPAsync<UserForLogin>("Security.GetUserForLogin", parameters);
            if (user is null)
                return LeatherPOSResponse.Fail("Incorrect username or password.");

            var verifyResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
            if (verifyResult == PasswordVerificationResult.Failed)
                return LeatherPOSResponse.Fail("Incorrect username or password.");

            var token = GenerateToken(user);

            var logParams = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(user.GroupID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@UserID", new Tuple<string, DbType, ParameterDirection>(user.UserID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Action", new Tuple<string, DbType, ParameterDirection>("Login", DbType.String, ParameterDirection.Input) },
                { "@EntityName", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.String, ParameterDirection.Input) },
                { "@EntityID", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Input) },
                { "@BeforeValue", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.String, ParameterDirection.Input) },
                { "@AfterValue", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.String, ParameterDirection.Input) }
            };
            await _unitOfWork.Repository().ExecuteSPWithInputOutputAsync("Security.LogActivity", logParams);

            return LeatherPOSResponse.Success(new LoginResult
            {
                Token = token,
                Username = user.Username,
                FullName = user.FullName,
                RoleName = user.RoleName,
                GroupID = user.GroupID
            }, "Login successful");
        }

        public async Task<LeatherPOSResponse> BootstrapAsync(BootstrapRequest request)
        {
            var countResult = await GetUserCountAsync();
            var userCount = Convert.ToInt32(countResult.Data);
            if (userCount > 0)
                return LeatherPOSResponse.Fail("Setup has already been completed. Please log in instead.");

            // Create Group
            var groupParams = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupName", new Tuple<string, DbType, ParameterDirection>(request.GroupName, DbType.String, ParameterDirection.Input) },
                { "@Result", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Output) }
            };
            var groupOutput = await _unitOfWork.Repository().ExecuteSPWithInputOutputAsync("Administration.SaveGroup", groupParams);
            var groupId = Convert.ToInt32(groupOutput["@Result"]);
            if (groupId <= 0)
                return LeatherPOSResponse.Fail("Unable to create the initial group - it may already exist.");

            // Create "Administrator" role
            var roleParams = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(groupId.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@RoleName", new Tuple<string, DbType, ParameterDirection>("Administrator", DbType.String, ParameterDirection.Input) },
                { "@Description", new Tuple<string, DbType, ParameterDirection>("Full system access", DbType.String, ParameterDirection.Input) },
                { "@CreatedBy", new Tuple<string, DbType, ParameterDirection>("1", DbType.Int32, ParameterDirection.Input) },
                { "@Result", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Output) }
            };
            var roleOutput = await _unitOfWork.Repository().ExecuteSPWithInputOutputAsync("Security.SaveRole", roleParams);
            var roleId = Convert.ToInt32(roleOutput["@Result"]);
            if (roleId <= 0)
                return LeatherPOSResponse.Fail("Unable to create the initial administrator role.");

            // Create the first user
            var passwordHash = _passwordHasher.HashPassword(null!, request.Password);
            var userParams = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(groupId.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@RoleID", new Tuple<string, DbType, ParameterDirection>(roleId.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Username", new Tuple<string, DbType, ParameterDirection>(request.Username, DbType.String, ParameterDirection.Input) },
                { "@Email", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.String, ParameterDirection.Input) },
                { "@PasswordHash", new Tuple<string, DbType, ParameterDirection>(passwordHash, DbType.String, ParameterDirection.Input) },
                { "@FullName", new Tuple<string, DbType, ParameterDirection>(request.FullName, DbType.String, ParameterDirection.Input) },
                { "@CreatedBy", new Tuple<string, DbType, ParameterDirection>("1", DbType.Int32, ParameterDirection.Input) },
                { "@Result", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Output) }
            };
            var userOutput = await _unitOfWork.Repository().ExecuteSPWithInputOutputAsync("Security.SaveUser", userParams);
            var userId = Convert.ToInt32(userOutput["@Result"]);
            if (userId <= 0)
                return LeatherPOSResponse.Fail("Unable to create the initial administrator user.");

            // Grant the new Administrator role full access to every existing screen,
            // so the nav isn't empty the moment permission-based filtering kicks in.
            var screens = await _unitOfWork.Repository().GetEntitiesBySPAsync<Screen>(
                "Security.GetAllScreens", new Dictionary<string, Tuple<string, DbType, ParameterDirection>>());

            foreach (var screen in screens)
            {
                var permParams = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
                {
                    { "@GroupID", new Tuple<string, DbType, ParameterDirection>(groupId.ToString(), DbType.Int32, ParameterDirection.Input) },
                    { "@RoleID", new Tuple<string, DbType, ParameterDirection>(roleId.ToString(), DbType.Int32, ParameterDirection.Input) },
                    { "@ScreenID", new Tuple<string, DbType, ParameterDirection>(screen.ScreenID.ToString(), DbType.Int32, ParameterDirection.Input) },
                    { "@CanView", new Tuple<string, DbType, ParameterDirection>("true", DbType.Boolean, ParameterDirection.Input) },
                    { "@CanAdd", new Tuple<string, DbType, ParameterDirection>("true", DbType.Boolean, ParameterDirection.Input) },
                    { "@CanEdit", new Tuple<string, DbType, ParameterDirection>("true", DbType.Boolean, ParameterDirection.Input) },
                    { "@CanDelete", new Tuple<string, DbType, ParameterDirection>("true", DbType.Boolean, ParameterDirection.Input) },
                    { "@CanExport", new Tuple<string, DbType, ParameterDirection>("true", DbType.Boolean, ParameterDirection.Input) },
                    { "@CanApprove", new Tuple<string, DbType, ParameterDirection>("true", DbType.Boolean, ParameterDirection.Input) },
                    { "@CreatedBy", new Tuple<string, DbType, ParameterDirection>(userId.ToString(), DbType.Int32, ParameterDirection.Input) },
                    { "@Result", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Output) }
                };
                await _unitOfWork.Repository().ExecuteSPWithInputOutputAsync("Security.SaveRolePermission", permParams);
            }

            return LeatherPOSResponse.Success(null, "Setup complete. You can now log in.");
        }

        public async Task<LeatherPOSResponse> GetUserCountAsync()
        {
            var result = await _unitOfWork.Repository().GetEntitiesBySPAsync<UserCountRow>(
                "Security.GetUserCount", new Dictionary<string, Tuple<string, DbType, ParameterDirection>>());
            return LeatherPOSResponse.Success(result.FirstOrDefault()?.UserCount ?? 0);
        }

        private string GenerateToken(UserForLogin user)
        {
            var claims = new[]
            {
                new Claim("UserID", user.UserID.ToString()),
                new Claim("Username", user.Username),
                new Claim("GroupID", user.GroupID.ToString()),
                new Claim("RoleID", user.RoleID.ToString()),
                new Claim("Role", user.RoleName),
            };

            var jwtKey = _configuration["Jwt:Key"] ?? "DEV-ONLY-PLACEHOLDER-KEY-CHANGE-ME-1234567890";
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(12),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public class UserCountRow
    {
        public int UserCount { get; set; }
    }
}
