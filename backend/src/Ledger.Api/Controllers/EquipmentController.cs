using Ledger.Api.Data;
using Ledger.Api.Domain;
using Ledger.Api.Dto;
using Ledger.Api.Utilities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ledger.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class EquipmentController : ControllerBase {
    private readonly AppDbContext _db;

    public EquipmentController(AppDbContext db) {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<EquipmentResponse>>> GetAll() {
        var items = await _db.Equipment
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => ResponseFromEntity(x))
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<EquipmentResponse>> GetById(Guid id) {
        var item = await _db.Equipment
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => ResponseFromEntity(x))
            .FirstOrDefaultAsync();

        if (item is null) {
            return NotFound(ApiErrors.NotFound("Equipment was not found."));
        }

        return Ok(item);
    }

    [HttpPost]
    [Authorize(Policy = "StrictAdmin")]
    public async Task<ActionResult<EquipmentResponse>> Create(CreateEquipmentRequest request) {
        var serialExists = await _db.Equipment
            .AnyAsync(x => x.SerialNumber == request.SerialNumber);

        if (serialExists) {
            return Conflict(ApiErrors.Conflict("An equipment item with the provided serial number already exists."));
        }

        var entity = new Equipment {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Type = request.Type.Trim(),
            SerialNumber = request.SerialNumber.Trim(),
            Condition = request.Condition.Trim(),
            Status = EquipmentStatus.Available,
            Location = request.Location.Trim(),
            PhotoUrl = string.IsNullOrWhiteSpace(request.PhotoUrl) ? null : request.PhotoUrl.Trim(),
            RequiresAdminApproval = request.RequiresAdminApproval,
        };

        _db.Equipment.Add(entity);
        await _db.SaveChangesAsync();

        var response = ResponseFromEntity(entity);

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, response);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "StrictAdmin")]
    public async Task<ActionResult<EquipmentResponse>> Update(Guid id, UpdateEquipmentRequest request) {
        var entity = await _db.Equipment.FirstOrDefaultAsync(x => x.Id == id);
        if (entity is null) {
            return NotFound(ApiErrors.NotFound("Equipment was not found."));
        }

        entity.Name = request.Name.Trim();
        entity.Type = request.Type.Trim();
        entity.Condition = request.Condition.Trim();
        entity.Location = request.Location.Trim();
        entity.PhotoUrl = string.IsNullOrWhiteSpace(request.PhotoUrl) ? null : request.PhotoUrl.Trim();
        entity.RequiresAdminApproval = request.RequiresAdminApproval;
        entity.Status = request.Status;

        await _db.SaveChangesAsync();

        return Ok(ResponseFromEntity(entity));
    }

    [HttpPut("{id:guid}/status")]
    [Authorize(Policy = "StrictAdmin")]
    public async Task<IActionResult> UpdateStatus(Guid id, UpdateEquipmentStatusRequest request) {
        var entity = await _db.Equipment.FirstOrDefaultAsync(x => x.Id == id);
        if (entity is null) {
            return NotFound(ApiErrors.NotFound("Equipment was not found."));
        }

        entity.Status = request.Status;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "StrictAdmin")]
    public async Task<IActionResult> Delete(Guid id) {
        var entity = await _db.Equipment.FirstOrDefaultAsync(x => x.Id == id);
        if (entity is null) {
            return NotFound(ApiErrors.NotFound("Equipment was not found."));
        }

        _db.Remove(entity);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static EquipmentResponse ResponseFromEntity(Equipment x) => new(
        x.Id,
        x.Name,
        x.Type,
        x.SerialNumber,
        x.Condition,
        x.Status.ToString(),
        x.Location,
        x.PhotoUrl,
        x.RequiresAdminApproval
    );
}