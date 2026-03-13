using Ledger.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ledger.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class EquipmentController : ControllerBase {
    private readonly AppDbContext _db;

    public EquipmentController(AppDbContext db) {
        _db = db;
    }
}