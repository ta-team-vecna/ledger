namespace Ledger.Api.Domain;

public class EmailNotification {
    public Guid Id { get; set; }
    public string RecipientEmail { get; set; } = null!;
    public Guid? EquipmentRequestId { get; set; }
    public EquipmentRequest? EquipmentRequest { get; set; }
    public string NotificationType { get; set; } = null!;
    public string Subject { get; set; } = null!;
    public string ThreadId { get; set; } = null!;
    public DateTime SentAtUtc { get; set; }
    public string Status { get; set; } = null!;
    public string? ErrorMessage { get; set; }
}
