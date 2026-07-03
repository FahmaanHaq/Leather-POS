using LeatherPOS.Models.Common;
using LeatherPOS.Models.Inventory;

namespace LeatherPOS.Services.Interfaces
{
    public interface IContainerService
    {
        Task<LeatherPOSResponse> GetAllContainersAsync(int groupId);
        Task<LeatherPOSResponse> GetContainerByIdAsync(int containerId);
        Task<LeatherPOSResponse> SaveContainerAsync(ContainerSaveModel model);
        Task<LeatherPOSResponse> GetAllSuppliersAsync(int groupId);
        Task<LeatherPOSResponse> SaveSupplierAsync(SupplierSaveModel model);
    }
}
