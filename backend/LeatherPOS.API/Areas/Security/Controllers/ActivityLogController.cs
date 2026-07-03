using LeatherPOS.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LeatherPOS.API.Areas.Security.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ActivityLogController : ControllerBase
    {
        private readonly IActivityLogService _activityLogService;
        public ActivityLogController(IActivityLogService activityLogService) => _activityLogService = activityLogService;

        [HttpGet("GetAll/{groupId}")]
        public async Task<IActionResult> GetAll(int groupId) => Ok(await _activityLogService.GetActivityLogAsync(groupId));
    }
}
