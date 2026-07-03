using System.Data;
using LeatherPOS.Models.Administration;
using LeatherPOS.Models.Common;
using LeatherPOS.Services.Interfaces;

namespace LeatherPOS.Services.Implementations
{
    public class GroupService : IGroupService
    {
        private readonly ILeatherPOSUnitOfWork _unitOfWork;
        public GroupService(ILeatherPOSUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        public async Task<LeatherPOSResponse> GetAllGroupsAsync()
        {
            var result = await _unitOfWork.Repository().GetEntitiesBySPAsync<Group>(
                "Administration.GetAllGroups", new Dictionary<string, Tuple<string, DbType, ParameterDirection>>());
            return LeatherPOSResponse.Success(result);
        }

        public async Task<LeatherPOSResponse> SaveGroupAsync(GroupSaveModel model)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupName", new Tuple<string, DbType, ParameterDirection>(model.GroupName, DbType.String, ParameterDirection.Input) },
                { "@Result", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Output) }
            };
            var output = await _unitOfWork.Repository().ExecuteSPWithInputOutputAsync("Administration.SaveGroup", parameters);
            var resultCode = Convert.ToInt32(output["@Result"]);
            return resultCode > 0
                ? LeatherPOSResponse.Success(resultCode, "Group created successfully")
                : LeatherPOSResponse.Fail("A group with this name already exists.");
        }

        public async Task<LeatherPOSResponse> UpdateGroupAsync(GroupUpdateModel model)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(model.GroupID.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@GroupName", new Tuple<string, DbType, ParameterDirection>(model.GroupName, DbType.String, ParameterDirection.Input) },
                { "@IsActive", new Tuple<string, DbType, ParameterDirection>(model.IsActive.ToString(), DbType.Boolean, ParameterDirection.Input) },
                { "@Result", new Tuple<string, DbType, ParameterDirection>(string.Empty, DbType.Int32, ParameterDirection.Output) }
            };
            var output = await _unitOfWork.Repository().ExecuteSPWithInputOutputAsync("Administration.UpdateGroup", parameters);
            var resultCode = Convert.ToInt32(output["@Result"]);
            return resultCode switch
            {
                1 => LeatherPOSResponse.Success(resultCode, "Group updated successfully"),
                -1 => LeatherPOSResponse.Fail("A group with this name already exists."),
                -2 => LeatherPOSResponse.Fail("Cannot deactivate a group that still has active users."),
                _ => LeatherPOSResponse.Fail("An unexpected error occurred while updating the group.")
            };
        }
    }
}
