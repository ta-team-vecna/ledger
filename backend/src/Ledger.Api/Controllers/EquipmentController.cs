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
public sealed class EquipmentController : ControllerBase {
    private readonly AppDbContext _db;

    public EquipmentController(AppDbContext db) {
        _db = db;
    }

    /// <summary>
    /// Retrieves a complete list of all equipment.
    /// </summary>
    /// <returns>A collection of equipment records ordered by name.</returns>
    /// <param name="pagination">Pagination parameters (page, pageSize — default 20, max 100).</param>
    /// <response code="200">Returns the list of equipment.</response>
    /// <response code="401">If the user is not authenticated.</response>
    [HttpGet]
    [ProducesResponseType(typeof(PaginatedResponse<EquipmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PaginatedResponse<EquipmentResponse>>> GetAll([FromQuery] PaginationParams pagination) {
        var query = _db.Equipment.AsNoTracking().OrderBy(x => x.Name);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.ValidPageSize)
            .Select(x => ResponseFromEntity(x))
            .ToListAsync();

        return Ok(new PaginatedResponse<EquipmentResponse>(items, totalCount, pagination.ValidPage, pagination.ValidPageSize));
    }

    /// <summary>
    /// Retrieves a specific equipment item by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the equipment.</param>
    /// <returns>The requested equipment details.</returns>
    /// <response code="200">Returns the requested equipment.</response>
    /// <response code="404">If the equipment could not be found.</response>
    /// <response code="401">If the user is not authenticated.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(EquipmentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
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

    /// <summary>
    /// Returns active reservations (date ranges) for a specific equipment item.
    /// </summary>
    [HttpGet("{id:guid}/reservations")]
    [ProducesResponseType(typeof(IReadOnlyList<EquipmentReservationResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<EquipmentReservationResponse>>> GetReservations(Guid id) {
        var exists = await _db.Equipment.AnyAsync(x => x.Id == id);
        if (!exists) {
            return NotFound(ApiErrors.NotFound("Equipment was not found."));
        }

        var reservations = await _db.EquipmentRequests
            .AsNoTracking()
            .Where(r => r.EquipmentId == id
                && r.Status != RequestStatus.Rejected
                && r.Status != RequestStatus.Returned
                && r.Status != RequestStatus.Cancelled)
            .OrderBy(r => r.RequestedFromUtc)
            .Select(r => new EquipmentReservationResponse(
                r.RequestedFromUtc,
                r.RequestedToUtc,
                r.Status.ToString()
            ))
            .ToListAsync();

        return Ok(reservations);
    }

    /// <summary>
    /// Creates a new equipment record.
    /// </summary>
    /// <param name="request">The details of the equipment to create.</param>
    /// <returns>The newly created equipment item.</returns>
    /// <response code="201">Returns the newly created equipment.</response>
    /// <response code="409">If an equipment item with the provided serial number already exists.</response>
    /// <response code="401">If the user is not authenticated.</response>
    /// <response code="403">If the user does not have StrictAdmin privileges.</response>
    [HttpPost]
    [Authorize(Policy = "StrictAdmin")]
    [ProducesResponseType(typeof(EquipmentResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
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

    /// <summary>
    /// Updates an existing equipment record.
    /// </summary>
    /// <param name="id">The unique identifier of the equipment to update.</param>
    /// <param name="request">The updated equipment details.</param>
    /// <returns>The updated equipment item.</returns>
    /// <response code="200">Returns the updated equipment details.</response>
    /// <response code="404">If the equipment could not be found.</response>
    /// <response code="401">If the user is not authenticated.</response>
    /// <response code="403">If the user does not have StrictAdmin privileges.</response>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "StrictAdmin")]
    [ProducesResponseType(typeof(EquipmentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
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

    /// <summary>
    /// Updates only the status of an existing equipment item.
    /// </summary>
    /// <param name="id">The unique identifier of the equipment.</param>
    /// <param name="request">The new status to apply.</param>
    /// <returns>An empty success response.</returns>
    /// <response code="204">Successfully updated the equipment status.</response>
    /// <response code="404">If the equipment could not be found.</response>
    /// <response code="401">If the user is not authenticated.</response>
    /// <response code="403">If the user does not have StrictAdmin privileges.</response>
    [HttpPut("{id:guid}/status")]
    [Authorize(Policy = "StrictAdmin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> UpdateStatus(Guid id, UpdateEquipmentStatusRequest request) {
        var entity = await _db.Equipment.FirstOrDefaultAsync(x => x.Id == id);
        if (entity is null) {
            return NotFound(ApiErrors.NotFound("Equipment was not found."));
        }

        entity.Status = request.Status;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Deletes an equipment record from the system.
    /// </summary>
    /// <param name="id">The unique identifier of the equipment to delete.</param>
    /// <returns>An empty success response.</returns>
    /// <response code="204">Successfully deleted the equipment.</response>
    /// <response code="404">If the equipment could not be found.</response>
    /// <response code="409">If the equipment cannot be deleted because it has related requests.</response>
    /// <response code="401">If the user is not authenticated.</response>
    /// <response code="403">If the user does not have StrictAdmin privileges.</response>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "StrictAdmin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Delete(Guid id) {
        var entity = await _db.Equipment.FirstOrDefaultAsync(x => x.Id == id);
        if (entity is null) {
            return NotFound(ApiErrors.NotFound("Equipment was not found."));
        }

        var hasRelatedRequests = await _db.EquipmentRequests
            .AnyAsync(x => x.EquipmentId == id);

        if (hasRelatedRequests) {
            return Conflict(ApiErrors.Conflict(
                "Cannot delete equipment that has request history. Consider marking it as Retired instead."
            ));
        }

        try {
            _db.Remove(entity);
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException) {
            return Conflict(ApiErrors.Conflict(
                "Cannot delete equipment because it is referenced by other records."
            ));
        }

        return NoContent();
    }

    /// <summary>
    /// Retrieves the full borrowing history for a specific equipment item.
    /// </summary>
    /// <param name="id">The unique identifier of the equipment.</param>
    /// <returns>A list of all requests (borrowing history) for this equipment.</returns>
    /// <response code="200">Returns the borrowing history.</response>
    /// <param name="pagination">Pagination parameters (page, pageSize).</param>
    /// <response code="404">If the equipment could not be found.</response>
    /// <response code="401">If the user is not authenticated.</response>
    [HttpGet("{id:guid}/history")]
    [ProducesResponseType(typeof(PaginatedResponse<EquipmentRequestResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PaginatedResponse<EquipmentRequestResponse>>> GetHistory(Guid id, [FromQuery] PaginationParams pagination) {
        var exists = await _db.Equipment.AnyAsync(x => x.Id == id);
        if (!exists) {
            return NotFound(ApiErrors.NotFound("Equipment was not found."));
        }

        var query = _db.EquipmentRequests
            .AsNoTracking()
            .Where(r => r.EquipmentId == id)
            .OrderByDescending(r => r.RequestedAtUtc);

        var totalCount = await query.CountAsync();
        var history = await query
            .Skip(pagination.Skip)
            .Take(pagination.ValidPageSize)
            .Select(r => new EquipmentRequestResponse(
                r.Id,
                r.UserId,
                r.User.FullName,
                r.EquipmentId,
                r.Equipment.Name,
                r.Equipment.SerialNumber,
                r.Status.ToString(),
                r.RequestedAtUtc,
                r.RequestedFromUtc,
                r.RequestedToUtc,
                r.ReviewedAtUtc,
                r.CheckedOutAtUtc,
                r.ReturnedAtUtc,
                r.AdminComment,
                r.ReturnConditionNotes
            ))
            .ToListAsync();

        return Ok(new PaginatedResponse<EquipmentRequestResponse>(history, totalCount, pagination.ValidPage, pagination.ValidPageSize));
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