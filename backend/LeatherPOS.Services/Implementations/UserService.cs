using System.Data;
using LeatherPOS.Models.Common;
using LeatherPOS.Models.Security;
using LeatherPOS.Services.Interfaces;
using Microsoft.AspNetCore.Identity;

namespace LeatherPOS.Services.Implementations
{
    public class UserService : IUserService
    {
        private readonly ILeatherPOSUnitOfWork _unitOfWork;
        private readonly PasswordHasher<User> _passwordHasher = new();

        public UserService(ILeatherPOSUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        public async Task<LeatherPOSResponse> GetAllUsersAsync(int groupId)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(groupId.ToString(), DbType.Int32, ParameterDirection.Input) }
            };
            var result = await _unitOfWork.Repository().GetEntitiesBySPAsync<User>("Security.GetAllUsers", parameters);
            return LeatherPOSResponse.Success(result);
        }

        public async Task<LeatherPOSResponse> GetUserByIdAsync(int userId)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@UserID", new Tuple<string, DbType, ParameterDirection>(userId.ToString(), DbType.Int32, ParameterDirection.Input) }
            };
            var result = await _unitOfWork.Repository().GetEntityBySPAsync<User>("Security.GetUserByID", parameters);
            return result is null ? LeatherPOSResponse.Fail("User not found") : LeatherPOSResponse.Success(result);
        }

        public async Task<LeatherPOSResponse> SaveUserAsync(UserSaveModel model)
        {
            // Never persist plaintext passwords - hash before the SP call (FR-SEC-01)
            var passwordHash = _passwordHasher.HashPassword(null!, model.Password);

            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(model.GroupID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@RoleID", new Tuple<string, DbType, ParameterDirection>(model.RoleID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Username", new Tuple<string, DbType, ParameterDirection>(model.Username, DbType.String, ParameterDirection.Input) },
                { "@Email", new Tuple<string, DbType, ParameterDirection>(model.Email ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@PasswordHash", new Tuple<string, DbType, ParameterDirection>(passwordHash, DbType.String, ParameterDirection.Input) },
                { "@FullName", new Tuple<string, DbType, ParameterDirection>(model.FullName, DbType.String, ParameterDirection.Input) },
                { "@CreatedBy", new Tuple<string, DbType, ParameterDirection>(model.CreatedBy.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Result", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Output) }
            };
            var output = await _unitOfWork.Repository().ExecuteSPWithInputOutputAsync("Security.SaveUser", parameters);
            return MapResult(Convert.ToInt32(output["@Result"]), isUpdate: false);
        }

        public async Task<LeatherPOSResponse> UpdateUserAsync(UserUpdateModel model)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@UserID", new Tuple<string, DbType, ParameterDirection>(model.UserID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@RoleID", new Tuple<string, DbType, ParameterDirection>(model.RoleID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Email", new Tuple<string, DbType, ParameterDirection>(model.Email ?? string.Empty, DbType.String, ParameterDirection.Input) },
                { "@FullName", new Tuple<string, DbType, ParameterDirection>(model.FullName, DbType.String, ParameterDirection.Input) },
                { "@IsActive", new Tuple<string, DbType, ParameterDirection>(model.IsActive.ToString(), DbType.Boolean, ParameterDirection.Input) },
                { "@ModifiedBy", new Tuple<string, DbType, ParameterDirection>(model.ModifiedBy.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Result", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Output) }
            };
            var output = await _unitOfWork.Repository().ExecuteSPWithInputOutputAsync("Security.UpdateUser", parameters);
            return MapResult(Convert.ToInt32(output["@Result"]), isUpdate: true);
        }

        private static LeatherPOSResponse MapResult(int resultCode, bool isUpdate) => resultCode switch
        {
            1 when isUpdate => LeatherPOSResponse.Success(resultCode, "User updated successfully"),
            > 0 when !isUpdate => LeatherPOSResponse.Success(resultCode, "User saved successfully"),
            -1 => LeatherPOSResponse.Fail("A user with this username already exists in this group"),
            -3 => LeatherPOSResponse.Fail("The selected role does not exist or is inactive"),
            _ => LeatherPOSResponse.Fail("An unexpected error occurred while saving the user")
        };
    }
}
