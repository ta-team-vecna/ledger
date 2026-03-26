namespace Ledger.Api.Email;

public interface INotificationService {
    // Immediate — called from controllers (pass IDs so the service fetches from its own DbContext)
    Task NotifyApprovalNeededAsync(Guid requestId, CancellationToken ct = default);
    Task NotifyRequestDecisionAsync(Guid requestId, string decision, CancellationToken ct = default);
    Task NotifyRequestCancelledAsync(Guid requestId, CancellationToken ct = default);
    Task NotifyPasswordResetAsync(Guid userId, string resetToken, CancellationToken ct = default);
    Task NotifyPasswordChangedAsync(Guid userId, CancellationToken ct = default);
    Task NotifyRoleChangedAsync(Guid userId, string oldRole, string newRole, CancellationToken ct = default);

    // Scheduled — called from background service
    Task SendPickupRemindersAsync(CancellationToken ct = default);
    Task SendReturnRemindersAsync(CancellationToken ct = default);
    Task SendOverdueNoticesAsync(CancellationToken ct = default);
    Task SendApprovalBatchDigestAsync(CancellationToken ct = default);
    Task SendInventoryRiskDigestAsync(CancellationToken ct = default);
}
