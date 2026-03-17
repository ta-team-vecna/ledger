using System.IdentityModel.Tokens.Jwt;
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
public sealed class AuthController : ControllerBase {
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

    private void SetTokenCookies(string accessToken, string refreshToken) {
        // ReSharper disable once UseObjectOrCollectionInitializer
        var cookieOptions = new CookieOptions {
            HttpOnly = true,
            Secure = false, // Set to true in production with HTTPS
            SameSite = SameSiteMode.Lax,
        };

        cookieOptions.Expires = DateTimeOffset.UtcNow.AddMinutes(15);
        Response.Cookies.Append("token", accessToken, cookieOptions);

        cookieOptions.Expires = DateTimeOffset.UtcNow.AddDays(7);
        Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);
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

        var accessToken = _jwtTokenService.CreateToken(user);
        var refreshToken = _jwtTokenService.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        SetTokenCookies(accessToken, refreshToken);

        return Ok(new AuthResponse(
            accessToken,
            refreshToken,
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

        var accessToken = _jwtTokenService.CreateToken(user);
        var refreshToken = _jwtTokenService.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);

        await _db.SaveChangesAsync();

        SetTokenCookies(accessToken, refreshToken);

        return Ok(new AuthResponse(
            accessToken,
            refreshToken,
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            user.Role.ToString()
        ));
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout() {
        Response.Cookies.Delete("token");
        Response.Cookies.Delete("refreshToken");

        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId)) return Ok();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return Ok();

        user.RefreshToken = null;
        user.RefreshTokenExpiryTime = null;
        await _db.SaveChangesAsync();

        return Ok();
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] TokenRefreshRequest request) {
        var principal = _jwtTokenService.GetPrincipalFromExpiredToken(request.AccessToken);
        if (principal == null) {
            return BadRequest(new ProblemDetails {
                Detail = "Invalid access token or refresh token.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        var userIdString = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (!Guid.TryParse(userIdString, out var userId)) {
            return BadRequest(new ProblemDetails {
                Detail = "Invalid token claims.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null ||
            user.RefreshToken != request.RefreshToken ||
            user.RefreshTokenExpiryTime <= DateTime.UtcNow
        ) {
            return BadRequest(new ProblemDetails {
                Detail = "Invalid access token or refresh token.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        var newAccessToken = _jwtTokenService.CreateToken(user);
        var newRefreshToken = _jwtTokenService.GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        await _db.SaveChangesAsync();

        return Ok(new TokenRefreshResponse(
            newAccessToken,
            newRefreshToken
        ));
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