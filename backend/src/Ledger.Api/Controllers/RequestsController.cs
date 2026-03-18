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

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<EquipmentRequestResponse>> GetById(Guid id) {
        var request = await _db.EquipmentRequests
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => ResponseFromEntity(x))
            .FirstOrDefaultAsync();

        if (request is null) {
            return NotFound(ApiErrors.NotFound("Request was not found."));
        }

        return Ok(request);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<EquipmentRequestResponse>>> GetMyRequests() {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim is null) {
            return Unauthorized(ApiErrors.Unauthorized);
        }

        var userId = Guid.Parse(userIdClaim);
        var requests = await _db.EquipmentRequests
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .Select(x => ResponseFromEntity(x))
            .ToListAsync();

        return Ok(requests);
    }

    [HttpGet("filtered")]
    [Authorize(Policy = "StrictAdmin")]
    public async Task<ActionResult<IEnumerable<EquipmentRequestResponse>>> GetFilteredRequests(
        [FromQuery] RequestStatus? status = null
    ) {
        var query = _db.EquipmentRequests.AsNoTracking().AsQueryable();
        if (status.HasValue) {
            query = query.Where(x => x.Status == status.Value);
        }

        var requests = await query
            .Select(x => ResponseFromEntity(x))
            .ToListAsync();

        return Ok(requests);
    }

    [HttpGet("all")]
    [Authorize(Policy = "StrictAdmin")]
    public async Task<ActionResult<IEnumerable<EquipmentRequestResponse>>> GetAllRequests() {
        var requests = await _db.EquipmentRequests.AsNoTracking()
            .Select(x => ResponseFromEntity(x))
            .ToListAsync();

        return Ok(requests);
    }

    [HttpPost]
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

        var entity = new EquipmentRequest {
            Id = Guid.NewGuid(),
            UserId = userId,
            EquipmentId = equipment.Id,
            Status = RequestStatus.Pending,
            RequestedAtUtc = DateTime.UtcNow,
            RequestedFromUtc = request.RequestedFromUtc,
            RequestedToUtc = request.RequestedToUtc
        };

        _db.EquipmentRequests.Add(entity);
        await _db.SaveChangesAsync();

        var response = await _db.EquipmentRequests
            .AsNoTracking()
            .Where(x => x.Id == entity.Id)
            .Select(x => ResponseFromEntity(x))
            .FirstAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, response);
    }

    [HttpPut("{id:guid}/approve")]
    [Authorize(Policy = "StrictAdmin")]
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

    [HttpPut("{id:guid}/reject")]
    [Authorize(Policy = "StrictAdmin")]
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

    [HttpPut("{id:guid}/return")]
    [Authorize(Policy = "StrictAdmin")]
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

    private static EquipmentRequestResponse ResponseFromEntity(EquipmentRequest x) => new(
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