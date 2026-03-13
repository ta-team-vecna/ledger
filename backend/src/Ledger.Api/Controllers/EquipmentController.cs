using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Ledger.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class EquipmentController : ControllerBase {
    
}