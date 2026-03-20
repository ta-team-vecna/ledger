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
            Expires = DateTimeOffset.UtcNow.AddDays(7),
        };

        Response.Cookies.Append("token", accessToken, cookieOptions);
        Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);
    }

    /// <summary>
    /// Registers a new user in the system.
    /// </summary>
    /// <param name="request">The user's registration details.</param>
    /// <returns>The registered user's authentication details and tokens.</returns>
    /// <response code="200">Returns the newly registered user's details and sets HTTP-only cookies.</response>
    /// <response code="409">If a user with the provided email already exists.</response>
    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
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

    /// <summary>
    /// Authenticates a user and issues JWT and refresh tokens.
    /// </summary>
    /// <param name="request">The user's login credentials.</param>
    /// <returns>The authenticated user's details and tokens.</returns>
    /// <response code="200">Returns the user's details and sets HTTP-only cookies for tokens.</response>
    /// <response code="401">If the email or password is incorrect.</response>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
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

    /// <summary>
    /// Logs out the current user by clearing their token cookies and invalidating the refresh token in the database.
    /// </summary>
    /// <returns>An empty success response.</returns>
    /// <response code="200">Successfully logged out.</response>
    [HttpPost("logout")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
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

    /// <summary>
    /// Refreshes the user's access token using their valid refresh token.
    /// </summary>
    /// <remarks>
    /// This endpoint expects the access and refresh tokens to be present in the HTTP-only cookies.
    /// </remarks>
    /// <returns>An empty success response, with newly issued token cookies.</returns>
    /// <response code="200">Successfully refreshed tokens.</response>
    /// <response code="400">If the tokens are missing, invalid, or expired.</response>
    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Refresh() {
        var accessOk = Request.Cookies.TryGetValue("token", out var accessToken);
        var refreshOk = Request.Cookies.TryGetValue("refreshToken", out var refreshToken);
        if (!accessOk || !refreshOk) {
            return BadRequest(new ProblemDetails {
                Detail = "Missing access or refresh token.",
                Status = StatusCodes.Status400BadRequest,
            });
        }

        var principal = _jwtTokenService.GetPrincipalFromExpiredToken(accessToken!);
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
            user.RefreshToken != refreshToken! ||
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

        SetTokenCookies(newAccessToken, newRefreshToken);

        return Ok();
    }

    /// <summary>
    /// Retrieves the profile information of the currently authenticated user.
    /// </summary>
    /// <returns>The current user's profile details.</returns>
    /// <response code="200">Returns the user's profile information.</response>
    /// <response code="401">If the user is not authenticated.</response>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(CurrentUserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
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