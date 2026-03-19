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

    /// <summary>
    /// Retrieves a complete list of all users in the system.
    /// </summary>
    /// <returns>A list of user records ordered alphabetically by name.</returns>
    /// <response code="200">Returns the list of users.</response>
    /// <response code="401">If the user is not authenticated.</response>
    /// <response code="403">If the user does not have StrictAdmin privileges.</response>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<UserResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> GetAll() {
        var users = await _db.Users
            .AsNoTracking()
            .OrderBy(x => x.FirstName)
            .ThenBy(x => x.LastName)
            .Select(x => ResponseFromEntity(x))
            .ToListAsync();

        return Ok(users);
    }

    /// <summary>
    /// Retrieves a specific user by their unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the user.</param>
    /// <returns>The requested user's details.</returns>
    /// <response code="200">Returns the requested user.</response>
    /// <response code="404">If the user could not be found.</response>
    /// <response code="401">If the user is not authenticated.</response>
    /// <response code="403">If the user does not have StrictAdmin privileges.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<UserResponse>> GetById(Guid id) {
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

    /// <summary>
    /// Administratively creates a new user account.
    /// </summary>
    /// <param name="request">The details required to create the user.</param>
    /// <returns>The newly created user.</returns>
    /// <response code="201">Returns the newly created user details.</response>
    /// <response code="409">If the provided email is already in use.</response>
    /// <response code="401">If the user is not authenticated.</response>
    /// <response code="403">If the user does not have StrictAdmin privileges.</response>
    [HttpPost]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
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

    /// <summary>
    /// Deletes a user account from the system.
    /// </summary>
    /// <param name="id">The unique identifier of the user to delete.</param>
    /// <returns>An empty success response.</returns>
    /// <response code="204">Successfully deleted the user.</response>
    /// <response code="404">If the user could not be found.</response>
    /// <response code="401">If the user is not authenticated.</response>
    /// <response code="403">If the user does not have StrictAdmin privileges.</response>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
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

    /// <summary>
    /// Partially updates an existing user's details.
    /// </summary>
    /// <param name="id">The unique identifier of the user to update.</param>
    /// <param name="request">The fields to update.</param>
    /// <returns>An empty success response.</returns>
    /// <response code="204">Successfully updated the user.</response>
    /// <response code="404">If the user could not be found.</response>
    /// <response code="409">If updating the email results in a conflict with an existing user.</response>
    /// <response code="401">If the user is not authenticated.</response>
    /// <response code="403">If the user does not have StrictAdmin privileges.</response>
    [HttpPatch("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
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