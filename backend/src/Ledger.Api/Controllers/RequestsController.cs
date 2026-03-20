using System.Linq.Expressions;
using System.Security.Claims;
using Ledger.Api.Data;
using Ledger.Api.Domain;
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
    /// <returns>A list of the current user's equipment requests.</returns>
    /// <response code="200">Returns the list of requests.</response>
    /// <response code="401">If the user is not authenticated.</response>
    [HttpGet("me")]
    [ProducesResponseType(typeof(IEnumerable<EquipmentRequestResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<EquipmentRequestResponse>>> GetMyRequests() {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim is null) {
            return Unauthorized(ApiErrors.Unauthorized);
        }

        var userId = Guid.Parse(userIdClaim);
        var requests = await _db.EquipmentRequests
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .Select(ResponseFromEntity)
            .ToListAsync();

        return Ok(requests);
    }

    /// <summary>
    /// Retrieves equipment requests filtered by status.
    /// </summary>
    /// <param name="status">The optional status to filter requests by.</param>
    /// <returns>A list of filtered equipment requests.</returns>
    /// <response code="200">Returns the filtered list of requests.</response>
    /// <response code="401">If the user is not authenticated.</response>
    /// <response code="403">If the user does not have StrictAdmin privileges.</response>
    [HttpGet("filtered")]
    [Authorize(Policy = "StrictAdmin")]
    [ProducesResponseType(typeof(IEnumerable<EquipmentRequestResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IEnumerable<EquipmentRequestResponse>>> GetFilteredRequests(
        [FromQuery] RequestStatus? status = null
    ) {
        var query = _db.EquipmentRequests.AsNoTracking().AsQueryable();
        if (status.HasValue) {
            query = query.Where(x => x.Status == status.Value);
        }

        var requests = await query
            .Select(ResponseFromEntity)
            .ToListAsync();

        return Ok(requests);
    }

    /// <summary>
    /// Retrieves a complete list of all equipment requests in the system.
    /// </summary>
    /// <returns>A list of all equipment requests.</returns>
    /// <response code="200">Returns the list of all requests.</response>
    /// <response code="401">If the user is not authenticated.</response>
    /// <response code="403">If the user does not have StrictAdmin privileges.</response>
    [HttpGet("all")]
    [Authorize(Policy = "StrictAdmin")]
    [ProducesResponseType(typeof(IEnumerable<EquipmentRequestResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IEnumerable<EquipmentRequestResponse>>> GetAllRequests() {
        var requests = await _db.EquipmentRequests.AsNoTracking()
            .Select(ResponseFromEntity)
            .ToListAsync();

        return Ok(requests);
    }

    /// <summary>
    /// Creates a new request to borrow equipment. If the equipment doesn't require admin approval, the request is marked as approved automatically.
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
            RequestedToUtc = request.RequestedToUtc
        };

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
    public async Task<ActionResult> Approve(Guid id) {
        var request = await _db.EquipmentRequests
            .Include(r => r.Equipment)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (request is null) {
            return NotFound(ApiErrors.NotFound("Request was not found."));
        }

        if (request.Status != RequestStatus.Pending) {
            return BadRequest(ApiErrors.BadRequest("Invalid state", "Only pending requests can be approved."));
        }

        request.Status = RequestStatus.Approved;
        request.Equipment.Status = EquipmentStatus.Reserved;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Rejects a pending equipment request.
    /// </summary>
    /// <param name="id">The unique identifier of the request to reject.</param>
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
    public async Task<ActionResult> Reject(Guid id) {
        var request = await _db.EquipmentRequests
            .FirstOrDefaultAsync(x => x.Id == id);

        if (request is null) {
            return NotFound(ApiErrors.NotFound("Request was not found."));
        }

        if (request.Status != RequestStatus.Pending) {
            return BadRequest(ApiErrors.BadRequest("Invalid state", "Only pending requests can be rejected."));
        }

        request.Status = RequestStatus.Rejected;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Processes the return of borrowed equipment.
    /// </summary>
    /// <param name="id">The unique identifier of the equipment request.</param>
    /// <param name="payload">The return details, including condition notes.</param>
    /// <returns>An empty success response.</returns>
    /// <response code="204">Successfully marked the equipment as returned.</response>
    /// <response code="400">If the request is not in an approved or checked-out state.</response>
    /// <response code="404">If the request could not be found.</response>
    /// <response code="401">If the user is not authenticated.</response>
    /// <response code="403">If the user does not have StrictAdmin privileges.</response>
    [HttpPut("{id:guid}/return")]
    [Authorize(Policy = "StrictAdmin")]
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

        if (request.Status is not (RequestStatus.Approved or RequestStatus.CheckedOut)) {
            return BadRequest(ApiErrors.BadRequest("Invalid state", "Only approved or checked out equipment can be returned."));
        }

        request.Status = RequestStatus.Returned;
        request.ReturnedAtUtc = DateTime.UtcNow;
        request.ReturnConditionNotes = payload.ReturnConditionNotes;
        request.Equipment.Status = EquipmentStatus.Available;

        // I: if time, query a free ai to check if notes indicate damage and mark for repair xD

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