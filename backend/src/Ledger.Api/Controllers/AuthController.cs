using System.Security.Claims;
using Ledger.Api.Auth;
using Ledger.Api.Data;
using Ledger.Api.Domain;
using Ledger.Api.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ledger.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase {
    private readonly AppDbContext _db;
    private readonly IPasswordHasher<ApplicationUser> _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthController(
        AppDbContext db,
        IPasswordHasher<ApplicationUser> passwordHasher,
        IJwtTokenService jwtTokenService
    ) {
        _db = db;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
    }

    private void SetTokenCookie(string token) {
        Response.Cookies.Append("token", token, new CookieOptions {
            HttpOnly = true,
            Secure = false, // Set to true in production with HTTPS
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddDays(7),
        });
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request) {
        var email = request.Email.Trim().ToLowerInvariant();
        var exists = await _db.Users.AnyAsync(x => x.Email == email);
        if (exists) {
            return Conflict(new ProblemDetails {
                Detail = "Email already exists.",
                Status = StatusCodes.Status409Conflict,
            });
        }

        var user = new ApplicationUser {
            Id = Guid.NewGuid(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = email,
            Role = UserRole.User,
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var token = _jwtTokenService.CreateToken(user);
        SetTokenCookie(token);

        return Ok(new AuthResponse(
            token,
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            user.Role.ToString()
        ));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request) {
        var email = request.Email.Trim().ToLowerInvariant();

        var user = await _db.Users.FirstOrDefaultAsync(x => x.Email == email);
        if (user is null) {
            return Unauthorized(new ProblemDetails {
                Detail = "Invalid credentials.",
                Status = StatusCodes.Status401Unauthorized,
            });
        }

        var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result is PasswordVerificationResult.Failed) {
            return Unauthorized(new ProblemDetails {
                Detail = "Invalid credentials.",
                Status = StatusCodes.Status401Unauthorized,
            });
        }

        var token = _jwtTokenService.CreateToken(user);
        SetTokenCookie(token);

        return Ok(new AuthResponse(
            token,
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            user.Role.ToString()
        ));
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public IActionResult Logout() {
        Response.Cookies.Delete("token");
        return Ok();
    }

    [HttpGet("me")]
    [Authorize]
    public ActionResult<CurrentUserResponse> Me() {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var email = User.FindFirst(ClaimTypes.Email)!.Value;
        var fullName = User.FindFirst(ClaimTypes.Name)?.Value ?? "";
        var role = User.FindFirst(ClaimTypes.Role)!.Value;

        var parts = fullName.Split(' ', 2, StringSplitOptions.TrimEntries);
        var firstName = parts.Length > 0 ? parts[0] : "";
        var lastName = parts.Length > 1 ? parts[1] : "";

        return Ok(new CurrentUserResponse(
            userId,
            firstName,
            lastName,
            email,
            role
        ));
    }
}