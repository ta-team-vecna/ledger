namespace Ledger.Api.Domain;

public sealed class Equipment {
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;
    public string Type { get; set; } = null!;
    public string SerialNumber { get; set; } = null!;

    public string Condition { get; set; } = null!;
    public EquipmentStatus Status { get; set; } = EquipmentStatus.Available;

    public string Location { get; set; } = null!;
    public string? PhotoUrl { get; set; }

    public bool RequiresAdminApproval { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<EquipmentRequest> Requests { get; set; } = new List<EquipmentRequest>();
}