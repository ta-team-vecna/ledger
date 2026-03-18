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

    [HttpPost]
    public async Task<ActionResult<EquipmentRequestResponse>> Create(CreateEquipmentRequestRequest request) {
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
            .Select(x => new EquipmentRequestResponse(
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
            ))
            .FirstAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, response);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<EquipmentRequestResponse>> GetById(Guid id) {
        var request = await _db.EquipmentRequests
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new EquipmentRequestResponse(
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
            ))
            .FirstOrDefaultAsync();

        if (request is null) {
            return NotFound(ApiErrors.NotFound("Request was not found."));
        }

        return Ok(request);
    }
}