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
[Authorize(Policy = "StrictAdmin")]
public class UsersController : ControllerBase {
    private readonly AppDbContext _db;
    private readonly IPasswordHasher<ApplicationUser> _passwordHasher;

    public UsersController(AppDbContext db, IPasswordHasher<ApplicationUser> hasher) {
        _db = db;
        _passwordHasher = hasher;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> GetAll() {
        var users = await _db.Users
            .AsNoTracking()
            .OrderBy(x => x.FirstName)
            .ThenBy(x => x.LastName)
            .Select(x => ResponseFromEntity(x))
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> GetById(Guid id) {
        var user = await _db.Users
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => ResponseFromEntity(x))
            .FirstOrDefaultAsync();

        if (user is null) {
            return NotFound(new ProblemDetails {
                Detail = "User was not found.",
                Status = StatusCodes.Status404NotFound,
            });
        }

        return Ok(user);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateUserRequest request) {
        var email = request.Email.Trim();
        var exists = await _db.Users.AnyAsync(x => x.Email == email);
        if (exists) {
            return Conflict(new ProblemDetails {
                Detail = "Email is already in use.",
                Status = StatusCodes.Status409Conflict,
            });
        }

        var user = new ApplicationUser {
            Id = Guid.NewGuid(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = email,
            Role = request.Role,
            CreatedAtUtc = DateTime.UtcNow,
        };

        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = user.Id }, new UserResponse(
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            user.Role.ToString(),
            user.CreatedAtUtc
        ));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id) {
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == id);
        if (user is null) {
            return NotFound(new ProblemDetails {
                Detail = "User was not found.",
                Status = StatusCodes.Status404NotFound,
            });
        }

        _db.Remove(user);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Patch(Guid id, PatchUserRequest request) {
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == id);
        if (user is null) {
            return NotFound(new ProblemDetails {
                Detail = "User was not found.",
                Status = StatusCodes.Status404NotFound,
            });
        }

        if (request.FirstName is not null) {
            user.FirstName = request.FirstName.Trim();
        }

        if (request.LastName is not null) {
            user.LastName = request.LastName.Trim();
        }

        if (request.Email is not null) {
            var normalizedEmail = request.Email.Trim();
            var emailTaken = await _db.Users.AnyAsync(x => x.Email == normalizedEmail && x.Id != id);
            if (emailTaken) {
                return Conflict(new ProblemDetails {
                    Detail = "Provided email is already in use.",
                    Status = StatusCodes.Status409Conflict,
                });
            }

            user.Email = normalizedEmail;
        }

        if (request.Role is not null) {
            user.Role = request.Role.Value;
        }

        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static UserResponse ResponseFromEntity(ApplicationUser x) => new(
        x.Id,
        x.FirstName,
        x.LastName,
        x.Email,
        x.Role.ToString(),
        x.CreatedAtUtc
    );
}