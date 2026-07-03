using LeatherPOS.Models.Administration;
using LeatherPOS.Models.Common;

namespace LeatherPOS.Services.Interfaces
{
    public interface IGroupService
    {
        Task<LeatherPOSResponse> GetAllGroupsAsync();
        Task<LeatherPOSResponse> SaveGroupAsync(GroupSaveModel model);
        Task<LeatherPOSResponse> UpdateGroupAsync(GroupUpdateModel model);
    }
}
