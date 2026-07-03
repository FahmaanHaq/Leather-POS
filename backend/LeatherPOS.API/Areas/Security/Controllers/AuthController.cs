using LeatherPOS.Models.Security;
using LeatherPOS.Services.Implementations;
using Microsoft.AspNetCore.Mvc;

namespace LeatherPOS.API.Areas.Security.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        public AuthController(IAuthService authService) => _authService = authService;

        [HttpPost("Login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
            => Ok(await _authService.LoginAsync(request));

        // Only succeeds once, while the Users table is empty. Used by the
        // frontend's first-run setup screen to create Group + Admin Role + first User.
        [HttpPost("Bootstrap")]
        public async Task<IActionResult> Bootstrap([FromBody] BootstrapRequest request)
            => Ok(await _authService.BootstrapAsync(request));

        [HttpGet("SetupRequired")]
        public async Task<IActionResult> SetupRequired()
        {
            var response = await _authService.GetUserCountAsync();
            var count = Convert.ToInt32(response.Data);
            return Ok(new { setupRequired = count == 0 });
        }
    }
}
