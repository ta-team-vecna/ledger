namespace Ledger.Api.Domain;

public sealed class EquipmentRequest {
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;

    public Guid EquipmentId { get; set; }
    public Equipment Equipment { get; set; } = null!;

    public Guid? ReviewedByAdminId { get; set; }
    public ApplicationUser? ReviewedByAdmin { get; set; }

    public RequestStatus Status { get; set; } = RequestStatus.Pending;

    public DateTime RequestedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime RequestedFromUtc { get; set; }
    public DateTime RequestedToUtc { get; set; }

    public DateTime? ReviewedAtUtc { get; set; }
    public DateTime? CheckedOutAtUtc { get; set; }
    public DateTime? ReturnedAtUtc { get; set; }

    public string? AdminComment { get; set; }
    public string? ReturnConditionNotes { get; set; }
}