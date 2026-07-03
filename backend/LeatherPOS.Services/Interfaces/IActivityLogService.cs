using LeatherPOS.Models.Common;

namespace LeatherPOS.Services.Interfaces
{
    public interface IActivityLogService
    {
        Task<LeatherPOSResponse> GetActivityLogAsync(int groupId, int top = 200);
    }
}
