using Ledger.Api.Data;
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
}