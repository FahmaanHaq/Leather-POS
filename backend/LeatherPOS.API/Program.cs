using System.Text;
using LeatherPOS.Models.Common;
using LeatherPOS.Services.Implementations;
using LeatherPOS.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS - allow the frontend (Vercel) to call this API. Update the origins list
// once you have your real production/preview URLs.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
                origin == "http://localhost:3000" ||
                origin.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase))
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Data access - real ADO.NET implementation against Azure SQL, reading
// the "DefaultConnection" connection string from App Service configuration.
builder.Services.AddScoped<ILeatherPOSRepository, LeatherPOSRepository>();
builder.Services.AddScoped<ILeatherPOSUnitOfWork, LeatherPOSUnitOfWork>();

// Register Phase 1 services - one line per module, mirrors existing DI registration pattern.
builder.Services.AddScoped<ICustomerService, CustomerService>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddScoped<IItemService, ItemService>();
builder.Services.AddScoped<IUOMService, UOMService>();
builder.Services.AddScoped<IContainerService, ContainerService>();
builder.Services.AddScoped<IAuthService, AuthService>();

// JWT auth - Issuer/Audience/Key come from App Service Application settings
// (Jwt__Issuer, Jwt__Audience, Jwt__Key), never hardcoded.
var jwtKey = builder.Configuration["Jwt:Key"];
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Keep the claim names exactly as issued (UserID, GroupID, Role) rather
        // than letting .NET remap short JWT claim names to long ClaimTypes URIs.
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(string.IsNullOrEmpty(jwtKey) ? "DEV-ONLY-PLACEHOLDER-KEY-CHANGE-ME-1234567890" : jwtKey)),
            RoleClaimType = "Role",
            NameClaimType = "Username"
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

// Swagger enabled in all environments for now so you can sanity-check the
// deployed API directly - restrict this to Development before going live.
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseRouting();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

// Exposed for WebApplicationFactory<Program> in integration tests
public partial class Program { }
