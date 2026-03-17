using System.Security.Claims;
using Ledger.Api.Data;
using Ledger.Api.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace Ledger.Api.Auth;

public sealed class StrictAdminRequirement : IAuthorizationRequirement;

public sealed class StrictAdminHandler : AuthorizationHandler<StrictAdminRequirement> {
    private readonly AppDbContext _db;
    private readonly ILogger<StrictAdminHandler> _logger;

    public StrictAdminHandler(AppDbContext db, ILogger<StrictAdminHandler> logger) {
        _db = db;
        _logger = logger;
    }

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, StrictAdminRequirement requirement) {
        var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier) ?? context.User.FindFirst("id") ?? context.User.FindFirst("sub");
        if (userIdClaim is null || !Guid.TryParse(userIdClaim.Value, out var userId)) {
            _logger.LogDebug("Unable to get user's id claim or parse the provided claim to a GUID");

            return;
        }

        var userRole = await _db.Users
            .AsNoTracking()
            .Where(x => x.Id == userId)
            .Select(x => x.Role)
            .FirstOrDefaultAsync();

        if (userRole == UserRole.Admin) {
            context.Succeed(requirement);
        }

        return;
    }
}