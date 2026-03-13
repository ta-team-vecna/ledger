using Ledger.Api.Data;
using Ledger.Api.Domain;
using Ledger.Api.Dto;
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
            .Select(x => new EquipmentResponse(
                x.Id,
                x.Name,
                x.Type,
                x.SerialNumber,
                x.Condition,
                x.Status.ToString(),
                x.Location,
                x.PhotoUrl,
                x.RequiresAdminApproval
            ))
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
            return NotFound(new ProblemDetails {
                Detail = "Equipment was not found.",
                Status = StatusCodes.Status404NotFound,
            });
        }

        return Ok(item);
    }

    private EquipmentResponse ResponseFromEntity(Equipment x) => new(
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