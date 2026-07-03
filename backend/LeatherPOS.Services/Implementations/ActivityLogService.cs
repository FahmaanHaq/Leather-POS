using System.Data;
using LeatherPOS.Models.Common;
using LeatherPOS.Models.Security;
using LeatherPOS.Services.Interfaces;

namespace LeatherPOS.Services.Implementations
{
    public class ActivityLogService : IActivityLogService
    {
        private readonly ILeatherPOSUnitOfWork _unitOfWork;
        public ActivityLogService(ILeatherPOSUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        public async Task<LeatherPOSResponse> GetActivityLogAsync(int groupId, int top = 200)
        {
            var parameters = new Dictionary<string, Tuple<string, DbType, ParameterDirection>>
            {
                { "@GroupID", new Tuple<string, DbType, ParameterDirection>(groupId.ToString(), DbType.Int32, ParameterDirection.Input) },
                { "@Top", new Tuple<string, DbType, ParameterDirection>(top.ToString(), DbType.Int32, ParameterDirection.Input) }
            };
            var result = await _unitOfWork.Repository().GetEntitiesBySPAsync<ActivityLogEntry>("Security.GetActivityLog", parameters);
            return LeatherPOSResponse.Success(result);
        }
    }
}
