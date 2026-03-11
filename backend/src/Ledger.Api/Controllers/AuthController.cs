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

        return Ok(new AuthResponse(
            token,
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            user.Role.ToString()
        ));
    }
}