using System.Linq.Expressions;
using System.Security.Claims;
using Ledger.Api.Data;
using Ledger.Api.Domain;
using Ledger.Api.Dto;
using Ledger.Api.Dto.Equipment;
using Ledger.Api.Utilities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ledger.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class RequestsController : ControllerBase {
    private readonly AppDbContext _db;

    public RequestsController(AppDbContext db) {
        _db = db;
    }

    /// <summary>
    /// Retrieves a specific equipment request by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the request.</param>
    /// <returns>The equipment request details.</returns>
    /// <response code="200">Returns the requested equipment request.</response>
    /// <response code="404">If the request could not be found.</response>
    /// <response code="401">If the user is not authenticated.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(EquipmentRequestResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<EquipmentRequestResponse>> GetById(Guid id) {
        var request = await _db.EquipmentRequests
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(ResponseFromEntity)
            .FirstOrDefaultAsync();

        if (request is null) {
            return NotFound(ApiErrors.NotFound("Request was not found."));
        }

        return Ok(request);
    }

    /// <summary>
    /// Retrieves all equipment requests made by the currently authenticated user.
    /// </summary>
    /// <param name="pagination">Pagination parameters (page, pageSize — default 20, max 100).</param>
    /// <returns>A paginated list of the current user's equipment requests.</returns>
    /// <response code="200">Returns the paginated list of requests.</response>
    /// <response code="401">If the user is not authenticated.</response>
    [HttpGet("me")]
    [ProducesResponseType(typeof(PaginatedResponse<EquipmentRequestResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PaginatedResponse<EquipmentRequestResponse>>> GetMyRequests([FromQuery] PaginationParams pagination) {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim is null) {
            return Unauthorized(ApiErrors.Unauthorized);
        }

        var userId = Guid.Parse(userIdClaim);
        var query = _db.EquipmentRequests
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.RequestedAtUtc);

        var totalCount = await query.CountAsync();
        var requests = await query
            .Skip(pagination.Skip)
            .Take(pagination.ValidPageSize)
            .Select(ResponseFromEntity)
            .ToListAsync();

        return Ok(new PaginatedResponse<EquipmentRequestResponse>(requests, totalCount, pagination.ValidPage, pagination.ValidPageSize));
    }

    /// <summary>
    /// Retrieves equipment requests filtered by status.
    /// </summary>
    /// <param name="status">The optional status to filter requests by (e.g. Pending, Approved, CheckedOut).</param>
    /// <param name="pagination">Pagination parameters (page, pageSize — default 20, max 100).</param>
    /// <returns>A paginated list of filtered equipment requests.</returns>
    /// <response code="200">Returns the paginated filtered list of requests.</response>
    /// <response code="400">If the provided status value is not valid.</response>
    /// <response code="401">If the user is not authenticated.</response>
    /// <response code="403">If the user does not have StrictAdmin privileges.</response>
    [HttpGet("filtered")]
    [Authorize(Policy = "StrictAdmin")]
    [ProducesResponseType(typeof(PaginatedResponse<EquipmentRequestResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PaginatedResponse<EquipmentRequestResponse>>> GetFilteredRequests(
        [FromQuery] string? status = null,
        [FromQuery] PaginationParams? pagination = null
    ) {
        pagination ??= new PaginationParams();
        var query = _db.EquipmentRequests.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(status)) {
            if (!Enum.TryParse<RequestStatus>(status, ignoreCase: true, out var parsedStatus)) {
                var validValues = string.Join(", ", Enum.GetNames<RequestStatus>());
                return BadRequest(ApiErrors.BadRequest("Invalid status",
                    $"'{status}' is not a valid status. Valid values: {validValues}"));
            }
            query = query.Where(x => x.Status == parsedStatus);
        }

        var orderedQuery = query.OrderByDescending(x => x.RequestedAtUtc);
        var totalCount = await orderedQuery.CountAsync();
        var requests = await orderedQuery
            .Skip(pagination.Skip)
            .Take(pagination.ValidPageSize)
            .Select(ResponseFromEntity)
            .ToListAsync();

        return Ok(new PaginatedResponse<EquipmentRequestResponse>(requests, totalCount, pagination.ValidPage, pagination.ValidPageSize));
    }

    /// <summary>
    /// Retrieves a complete list of all equipment requests in the system.
    /// </summary>
    /// <param name="pagination">Pagination parameters (page, pageSize — default 20, max 100).</param>
    /// <returns>A paginated list of all equipment requests.</returns>
    /// <response code="200">Returns the paginated list of all requests.</response>
    /// <response code="401">If the user is not authenticated.</response>
    /// <response code="403">If the user does not have StrictAdmin privileges.</response>
    [HttpGet("all")]
    [Authorize(Policy = "StrictAdmin")]
    [ProducesResponseType(typeof(PaginatedResponse<EquipmentRequestResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PaginatedResponse<EquipmentRequestResponse>>> GetAllRequests([FromQuery] PaginationParams pagination) {
        var query = _db.EquipmentRequests.AsNoTracking()
            .OrderByDescending(x => x.RequestedAtUtc);

        var totalCount = await query.CountAsync();
        var requests = await query
            .Skip(pagination.Skip)
            .Take(pagination.ValidPageSize)
            .Select(ResponseFromEntity)
            .ToListAsync();

        return Ok(new PaginatedResponse<EquipmentRequestResponse>(requests, totalCount, pagination.ValidPage, pagination.ValidPageSize));
    }

    /// <summary>
    /// Creates a new request to borrow equipment. If the equipment doesn't require admin approval,
    /// the request is marked as approved automatically.
    /// </summary>
    /// <param name="request">The details of the equipment request.</param>
    /// <returns>The newly created equipment request.</returns>
    /// <response code="201">Returns the newly created request.</response>
    /// <response code="400">If the requested dates are invalid.</response>
    /// <response code="404">If the requested equipment could not be found.</response>
    /// <response code="409">If the requested equipment is not currently available.</response>
    /// <response code="401">If the user is not authenticated.</response>
    [HttpPost]
    [ProducesResponseType(typeof(EquipmentRequestResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<EquipmentRequestResponse>> Create([FromBody] CreateEquipmentRequestRequest request) {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim is null) {
            return Unauthorized(ApiErrors.Unauthorized);
        }

        var userId = Guid.Parse(userIdClaim);
        if (request.RequestedToUtc <= request.RequestedFromUtc) {
            return BadRequest(ApiErrors.BadRequest("Invalid request dates", "RequestedToUtc must be after RequestedFromUtc."));
        }

        var equipment = await _db.Equipment.FirstOrDefaultAsync(x => x.Id == request.EquipmentId);
        if (equipment is null) {
            return NotFound(ApiErrors.NotFound("Equipment was not found."));
        }

        if (equipment.Status != EquipmentStatus.Available) {
            return Conflict(ApiErrors.Conflict("Equipment is not currently available."));
        }

        var initialStatus = equipment.RequiresAdminApproval ? RequestStatus.Pending : RequestStatus.Approved;
        var entity = new EquipmentRequest {
            Id = Guid.NewGuid(),
            UserId = userId,
            EquipmentId = equipment.Id,
            Status = initialStatus,
            RequestedAtUtc = DateTime.UtcNow,
            RequestedFromUtc = request.RequestedFromUtc,
            RequestedToUtc = request.RequestedToUtc,
        };

        if (initialStatus == RequestStatus.Approved) {
            equipment.Status = EquipmentStatus.Reserved;
        }

        _db.EquipmentRequests.Add(entity);
        await _db.SaveChangesAsync();

        var response = await _db.EquipmentRequests
            .AsNoTracking()
            .Where(x => x.Id == entity.Id)
            .Select(ResponseFromEntity)
            .FirstAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, response);
    }

    /// <summary>
    /// Approves a pending equipment request and marks the equipment as reserved.
    /// </summary>
    /// <param name="id">The unique identifier of the request to approve.</param>
    /// <param name="payload">Optional review details including admin comment.</param>
    /// <returns>An empty success response.</returns>
    /// <response code="204">Successfully approved the request.</response>
    /// <response code="400">If the request is not in a pending state.</response>
    /// <response code="404">If the request could not be found.</response>
    /// <response code="401">If the user is not authenticated.</response>
    /// <response code="403">If the user is not an admin.</response>
    [HttpPut("{id:guid}/approve")]
    [Authorize(Policy = "StrictAdmin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult> Approve(Guid id, [FromBody] ReviewRequest? payload) {
        var request = await _db.EquipmentRequests
            .Include(r => r.Equipment)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (request is null) {
            return NotFound(ApiErrors.NotFound("Request was not found."));
        }

        if (request.Status != RequestStatus.Pending) {
            return BadRequest(ApiErrors.BadRequest("Invalid state", "Only pending requests can be approved."));
        }

        // Check for overlapping approved/checked-out reservations for the same equipment
        var hasOverlap = await _db.EquipmentRequests.AnyAsync(x =>
            x.EquipmentId == request.EquipmentId
            && x.Id != request.Id
            && (x.Status == RequestStatus.Approved || x.Status == RequestStatus.CheckedOut)
            && x.RequestedFromUtc < request.RequestedToUtc
            && x.RequestedToUtc > request.RequestedFromUtc);

        if (hasOverlap) {
            return Conflict(ApiErrors.Conflict(
                "Cannot approve: another reservation already exists for this equipment during the requested period."));
        }

        var adminIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (adminIdClaim is null) {
            return Unauthorized(ApiErrors.Unauthorized);
        }

        request.ReviewedByAdminId = Guid.Parse(adminIdClaim);
        request.ReviewedAtUtc = DateTime.UtcNow;
        request.Status = RequestStatus.Approved;
        request.Equipment.Status = EquipmentStatus.Reserved;
        request.AdminComment = payload?.Comment is not null ? InputValidator.Sanitize(payload.Comment) : null;

        await _db.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Rejects a pending equipment request.
    /// </summary>
    /// <param name="id">The unique identifier of the request to reject.</param>
    /// <param name="payload">Optional review details including admin comment.</param>
    /// <returns>An empty success response.</returns>
    /// <response code="204">Successfully rejected the request.</response>
    /// <response code="400">If the request is not in a pending state.</response>
    /// <response code="404">If the request could not be found.</response>
    /// <response code="401">If the user is not authenticated.</response>
    /// <response code="403">If the user does not have StrictAdmin privileges.</response>
    [HttpPut("{id:guid}/reject")]
    [Authorize(Policy = "StrictAdmin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult> Reject(Guid id, [FromBody] ReviewRequest? payload) {
        var request = await _db.EquipmentRequests
            .FirstOrDefaultAsync(x => x.Id == id);

        if (request is null) {
            return NotFound(ApiErrors.NotFound("Request was not found."));
        }

        if (request.Status != RequestStatus.Pending) {
            return BadRequest(ApiErrors.BadRequest("Invalid state", "Only pending requests can be rejected."));
        }

        var adminIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (adminIdClaim is null) {
            return Unauthorized(ApiErrors.Unauthorized);
        }

        request.ReviewedByAdminId = Guid.Parse(adminIdClaim);
        request.ReviewedAtUtc = DateTime.UtcNow;
        request.Status = RequestStatus.Rejected;
        request.AdminComment = payload?.Comment is not null ? InputValidator.Sanitize(payload.Comment) : null;

        await _db.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Processes the return of borrowed equipment.
    /// </summary>
    /// <param name="id">The unique identifier of the request to return.</param>
    /// <param name="payload">Return details including condition notes and repair flag.</param>
    /// <returns>An empty success response.</returns>
    /// <response code="204">Successfully returned the equipment.</response>
    /// <response code="400">If the request is not in a checked-out state.</response>
    /// <response code="404">If the request could not be found.</response>
    /// <response code="401">If the user is not authenticated.</response>
    /// <response code="403">If the user is not the request owner or an admin.</response>
    [HttpPut("{id:guid}/return")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult> Return(Guid id, [FromBody] ReturnEquipmentRequest payload) {
        var request = await _db.EquipmentRequests
            .Include(r => r.Equipment)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (request is null) {
            return NotFound(ApiErrors.NotFound("Request was not found."));
        }

        var currentUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (currentUserIdClaim is null) {
            return Unauthorized(ApiErrors.Unauthorized);
        }

        var currentUserId = Guid.Parse(currentUserIdClaim);
        var isAdmin = await _db.Users
            .AnyAsync(x => x.Id == currentUserId && x.Role == UserRole.Admin);

        if (request.UserId != currentUserId && !isAdmin) {
            return Forbid();
        }

        if (request.Status != RequestStatus.CheckedOut) {
            return BadRequest(ApiErrors.BadRequest("Invalid state", "Only checked out equipment can be returned."));
        }

        request.ReturnedAtUtc = DateTime.UtcNow;
        request.ReturnConditionNotes = InputValidator.Sanitize(payload.ReturnConditionNotes ?? string.Empty);
        request.Status = RequestStatus.Returned;
        if (payload.WantsRepair) {
            request.Equipment.Status = EquipmentStatus.UnderRepair;
        } else {
            var hasOtherCheckedOut = await _db.EquipmentRequests
                .AnyAsync(x => x.EquipmentId == request.EquipmentId
                    && x.Id != request.Id
                    && x.Status == RequestStatus.CheckedOut
                    && x.ReturnedAtUtc == null);

            if (hasOtherCheckedOut) {
                request.Equipment.Status = EquipmentStatus.CheckedOut;
            } else {
                var now = DateTime.UtcNow;
                var hasOtherApprovedReservation = await _db.EquipmentRequests
                    .AnyAsync(x => x.EquipmentId == request.EquipmentId
                        && x.Id != request.Id
                        && x.Status == RequestStatus.Approved
                        && x.ReturnedAtUtc == null
                        && x.RequestedToUtc >= now);

                request.Equipment.Status = hasOtherApprovedReservation
                    ? EquipmentStatus.Reserved
                    : EquipmentStatus.Available;
            }
        }

        // I: if time, query a free ai to check if notes indicate damage and mark for repair xD

        await _db.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Checks out the equipment from a request, marking it that it is in someone's hands now.
    /// </summary>
    /// <param name="id">The unique identifier of the request to check out.</param>
    /// <returns>An empty success response.</returns>
    /// <response code="204">Successfully checked out the equipment.</response>
    /// <response code="400">If the request is not approved or outside the reservation window.</response>
    /// <response code="404">If the request could not be found.</response>
    /// <response code="401">If the user is not authenticated.</response>
    /// <response code="403">If the user is not the request owner or an admin.</response>
    [HttpPut("{id:guid}/checkout")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult> Checkout(Guid id) {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim is null) {
            return Unauthorized(ApiErrors.Unauthorized);
        }

        var currentUserId = Guid.Parse(userIdClaim);
        var request = await _db.EquipmentRequests
            .Include(r => r.Equipment)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (request is null) {
            return NotFound(ApiErrors.NotFound("Request was not found."));
        }

        // Allow checkout by request owner or admin
        var isAdmin = await _db.Users
            .AnyAsync(x => x.Id == currentUserId && x.Role == UserRole.Admin);
        if (request.UserId != currentUserId && !isAdmin) {
            return Forbid();
        }

        if (request.Status != RequestStatus.Approved) {
            return BadRequest(ApiErrors.BadRequest("Invalid state", "Only approved requests can be checked out."));
        }

        // Only allow checkout within the reservation window (inclusive of both start and end day).
        // Dates from the frontend may carry a timezone offset, so we add a full day of buffer
        // to the end to ensure the entire last calendar day is valid.
        var now = DateTime.UtcNow;
        if (now < request.RequestedFromUtc.Date) {
            return BadRequest(ApiErrors.BadRequest("Too early", "Equipment can only be checked out on or after the reservation start date."));
        }

        if (now >= request.RequestedToUtc.Date.AddDays(2)) {
            return BadRequest(ApiErrors.BadRequest("Too late", "The reservation period has already ended."));
        }

        request.Status = RequestStatus.CheckedOut;
        request.Equipment.Status = EquipmentStatus.CheckedOut;
        request.CheckedOutAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Cancels a pending or approved request, freeing the equipment reservation if applicable.
    /// </summary>
    /// <param name="id">The unique identifier of the request to cancel.</param>
    /// <returns>An empty success response.</returns>
    /// <response code="204">Successfully cancelled the request.</response>
    /// <response code="400">If the request is not in a cancellable state.</response>
    /// <response code="404">If the request could not be found.</response>
    /// <response code="401">If the user is not authenticated.</response>
    /// <response code="403">If the user is not the request owner or an admin.</response>
    [HttpPut("{id:guid}/cancel")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult> Cancel(Guid id) {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim is null) return Unauthorized(ApiErrors.Unauthorized);

        var currentUserId = Guid.Parse(userIdClaim);
        var request = await _db.EquipmentRequests
            .Include(r => r.Equipment)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (request is null) return NotFound(ApiErrors.NotFound("Request was not found."));

        var isAdmin = await _db.Users.AnyAsync(x => x.Id == currentUserId && x.Role == UserRole.Admin);
        if (request.UserId != currentUserId && !isAdmin) return Forbid();

        if (request.Status != RequestStatus.Pending && request.Status != RequestStatus.Approved) {
            return BadRequest(ApiErrors.BadRequest("Invalid state", "Only pending or approved requests can be cancelled."));
        }

        request.Status = RequestStatus.Cancelled;

        // Free equipment if it was reserved by this request
        if (request.Equipment.Status == EquipmentStatus.Reserved) {
            var now = DateTime.UtcNow;
            var hasOtherReservation = await _db.EquipmentRequests.AnyAsync(x =>
                x.EquipmentId == request.EquipmentId
                && x.Id != request.Id
                && x.Status == RequestStatus.Approved
                && x.RequestedToUtc >= now);

            request.Equipment.Status = hasOtherReservation ? EquipmentStatus.Reserved : EquipmentStatus.Available;
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static Expression<Func<EquipmentRequest, EquipmentRequestResponse>> ResponseFromEntity => x => new EquipmentRequestResponse(
        x.Id,
        x.UserId,
        x.User.FullName,
        x.EquipmentId,
        x.Equipment.Name,
        x.Equipment.SerialNumber,
        x.Status.ToString(),
        x.RequestedAtUtc,
        x.RequestedFromUtc,
        x.RequestedToUtc,
        x.ReviewedAtUtc,
        x.CheckedOutAtUtc,
        x.ReturnedAtUtc,
        x.AdminComment,
        x.ReturnConditionNotes
    );
}