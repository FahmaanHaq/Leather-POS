using LeatherPOS.Models.Administration;
using LeatherPOS.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LeatherPOS.API.Areas.Security.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class GroupsController : ControllerBase
    {
        private readonly IGroupService _groupService;
        public GroupsController(IGroupService groupService) => _groupService = groupService;

        [HttpGet("GetAll")]
        public async Task<IActionResult> GetAll() => Ok(await _groupService.GetAllGroupsAsync());

        [HttpPost("Save")]
        public async Task<IActionResult> Save([FromBody] GroupSaveModel model) => Ok(await _groupService.SaveGroupAsync(model));

        [HttpPost("Update")]
        public async Task<IActionResult> Update([FromBody] GroupUpdateModel model) => Ok(await _groupService.UpdateGroupAsync(model));
    }
}
