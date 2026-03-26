using Ledger.Api.Data;
using Ledger.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ledger.Api.Email;

public sealed class NotificationService : INotificationService {
    private readonly AppDbContext _db;
    private readonly IEmailSender _email;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(AppDbContext db, IEmailSender email, ILogger<NotificationService> logger) {
        _db = db;
        _email = email;
        _logger = logger;
    }

    // ── Immediate notifications ──────────────────────────────────────────

    public async Task NotifyApprovalNeededAsync(Guid requestId, CancellationToken ct = default) {
        var now = DateTime.UtcNow;
        var cutoff = now.AddHours(-3);

        var recentlySent = await _db.EmailNotifications.AnyAsync(
            n => n.NotificationType == "ApprovalNeeded" && n.SentAtUtc > cutoff, ct);
        if (recentlySent) return;

        var request = await _db.EquipmentRequests
            .Include(r => r.User)
            .Include(r => r.Equipment)
            .FirstOrDefaultAsync(r => r.Id == requestId, ct);
        if (request is null) return;

        var admins = await _db.Users
            .Where(u => u.Role == UserRole.Admin)
            .Select(u => new { u.Email, u.FullName })
            .ToListAsync(ct);

        var subject = $"[Ledger] {request.Equipment.Name} — New request pending";
        var threadId = $"request-{request.Id}";
        var html = EmailTemplates.ApprovalNeeded(request.User.FullName, request.Equipment.Name,
            request.RequestedFromUtc, request.RequestedToUtc);

        foreach (var admin in admins) {
            await _email.SendAsync(admin.Email, admin.FullName, subject, html, threadId, ct);
            await RecordAsync(admin.Email, request.Id, "ApprovalNeeded", subject, threadId, ct);
        }
    }

    public async Task NotifyRequestDecisionAsync(Guid requestId, string decision,
        CancellationToken ct = default) {
        var request = await _db.EquipmentRequests
            .Include(r => r.User)
            .Include(r => r.Equipment)
            .FirstOrDefaultAsync(r => r.Id == requestId, ct);
        if (request is null) return;

        var subject = $"[Ledger] {request.Equipment.Name} — Request {decision.ToLower()}";
        var threadId = $"request-{request.Id}";
        var html = EmailTemplates.RequestDecision(decision, request.Equipment.Name,
            request.RequestedFromUtc, request.RequestedToUtc, request.AdminComment);

        await _email.SendAsync(request.User.Email, request.User.FullName, subject, html, threadId, ct);
        await RecordAsync(request.User.Email, request.Id, $"Request{decision}", subject, threadId, ct);
    }

    public async Task NotifyRequestCancelledAsync(Guid requestId, CancellationToken ct = default) {
        var request = await _db.EquipmentRequests
            .Include(r => r.User)
            .Include(r => r.Equipment)
            .FirstOrDefaultAsync(r => r.Id == requestId, ct);
        if (request is null) return;

        var subject = $"[Ledger] {request.Equipment.Name} — Request cancelled";
        var threadId = $"request-{request.Id}";
        var html = EmailTemplates.RequestCancelled(request.Equipment.Name,
            request.RequestedFromUtc, request.RequestedToUtc);

        await _email.SendAsync(request.User.Email, request.User.FullName, subject, html, threadId, ct);
        await RecordAsync(request.User.Email, request.Id, "RequestCancelled", subject, threadId, ct);
    }

    public async Task NotifyPasswordResetAsync(Guid userId, string resetToken,
        CancellationToken ct = default) {
        var user = await _db.Users.FindAsync([userId], ct);
        if (user is null) return;

        var subject = "[Ledger] Password reset requested";
        var threadId = $"security-{user.Id}-{DateTime.UtcNow:yyyyMMdd}";
        var html = EmailTemplates.PasswordReset(resetToken);

        await _email.SendAsync(user.Email, user.FullName, subject, html, threadId, ct);
        await RecordAsync(user.Email, null, "PasswordReset", subject, threadId, ct);
    }

    public async Task NotifyPasswordChangedAsync(Guid userId, CancellationToken ct = default) {
        var user = await _db.Users.FindAsync([userId], ct);
        if (user is null) return;

        var subject = "[Ledger] Password changed";
        var threadId = $"security-{user.Id}-{DateTime.UtcNow:yyyyMMdd}";
        var html = EmailTemplates.PasswordChanged();

        await _email.SendAsync(user.Email, user.FullName, subject, html, threadId, ct);
        await RecordAsync(user.Email, null, "PasswordChanged", subject, threadId, ct);
    }

    public async Task NotifyRoleChangedAsync(Guid userId, string oldRole, string newRole,
        CancellationToken ct = default) {
        var user = await _db.Users.FindAsync([userId], ct);
        if (user is null) return;

        var subject = "[Ledger] Your account role has been changed";
        var threadId = $"security-{user.Id}-{DateTime.UtcNow:yyyyMMdd}";
        var html = EmailTemplates.RoleChanged(oldRole, newRole);

        await _email.SendAsync(user.Email, user.FullName, subject, html, threadId, ct);
        await RecordAsync(user.Email, null, "RoleChanged", subject, threadId, ct);
    }

    // ── Scheduled notifications (called by background service) ───────────

    public async Task SendPickupRemindersAsync(CancellationToken ct = default) {
        var now = DateTime.UtcNow;

        // Approved requests with pickup within 24h that haven't been checked out yet
        var upcoming = await _db.EquipmentRequests
            .Include(r => r.User)
            .Include(r => r.Equipment)
            .Where(r => r.Status == RequestStatus.Approved
                && r.RequestedFromUtc > now
                && r.RequestedFromUtc <= now.AddHours(24))
            .ToListAsync(ct);

        foreach (var request in upcoming) {
            var sentCount = await _db.EmailNotifications.CountAsync(
                n => n.EquipmentRequestId == request.Id && n.NotificationType == "PickupReminder", ct);
            if (sentCount >= 2) continue;

            var isDueToday = request.RequestedFromUtc.Date == now.Date;
            var subject = $"[Ledger] {request.Equipment.Name} — {(isDueToday ? "Pickup due today" : "Pickup reminder")}";
            var threadId = $"request-{request.Id}";
            var html = EmailTemplates.PickupReminder(request.Equipment.Name, request.RequestedFromUtc, isDueToday);

            await _email.SendAsync(request.User.Email, request.User.FullName, subject, html, threadId, ct);
            await RecordAsync(request.User.Email, request.Id, "PickupReminder", subject, threadId, ct);
        }
    }

    public async Task SendReturnRemindersAsync(CancellationToken ct = default) {
        var now = DateTime.UtcNow;

        // Only future due dates — past-due items are handled exclusively by SendOverdueNoticesAsync
        var checkedOut = await _db.EquipmentRequests
            .Include(r => r.User)
            .Include(r => r.Equipment)
            .Where(r => r.Status == RequestStatus.CheckedOut
                && r.RequestedToUtc > now
                && r.RequestedToUtc <= now.AddHours(24))
            .ToListAsync(ct);

        foreach (var request in checkedOut) {
            var sentCount = await _db.EmailNotifications.CountAsync(
                n => n.EquipmentRequestId == request.Id && n.NotificationType == "ReturnReminder", ct);
            if (sentCount >= 2) continue;

            var isDueToday = request.RequestedToUtc.Date == now.Date;
            var subject = $"[Ledger] {request.Equipment.Name} — {(isDueToday ? "Return due today" : "Return reminder")}";
            var threadId = $"request-{request.Id}";
            var html = EmailTemplates.ReturnReminder(request.Equipment.Name, request.RequestedToUtc, isDueToday);

            await _email.SendAsync(request.User.Email, request.User.FullName, subject, html, threadId, ct);
            await RecordAsync(request.User.Email, request.Id, "ReturnReminder", subject, threadId, ct);
        }
    }

    public async Task SendOverdueNoticesAsync(CancellationToken ct = default) {
        var now = DateTime.UtcNow;

        var overdue = await _db.EquipmentRequests
            .Include(r => r.User)
            .Include(r => r.Equipment)
            .Where(r => r.Status == RequestStatus.CheckedOut && r.RequestedToUtc < now)
            .ToListAsync(ct);

        foreach (var request in overdue) {
            // Notify borrower (once)
            var borrowerSent = await _db.EmailNotifications.AnyAsync(
                n => n.EquipmentRequestId == request.Id && n.NotificationType == "OverdueBorrower", ct);

            if (!borrowerSent) {
                var subject = $"[Ledger] {request.Equipment.Name} — Overdue";
                var threadId = $"request-{request.Id}";
                var html = EmailTemplates.OverdueBorrower(request.Equipment.Name, request.RequestedToUtc);

                await _email.SendAsync(request.User.Email, request.User.FullName, subject, html, threadId, ct);
                await RecordAsync(request.User.Email, request.Id, "OverdueBorrower", subject, threadId, ct);
            }

            // Escalate to admins after 1 day overdue
            var daysOverdue = (int)(now - request.RequestedToUtc).TotalDays;
            if (daysOverdue >= 1) {
                var adminSent = await _db.EmailNotifications.AnyAsync(
                    n => n.EquipmentRequestId == request.Id && n.NotificationType == "OverdueAdmin", ct);

                if (!adminSent) {
                    var admins = await _db.Users
                        .Where(u => u.Role == UserRole.Admin)
                        .Select(u => new { u.Email, u.FullName })
                        .ToListAsync(ct);

                    var subject = $"[Ledger] {request.Equipment.Name} — Overdue escalation";
                    var threadId = $"request-{request.Id}";
                    var html = EmailTemplates.OverdueAdmin(request.User.FullName, request.User.Email,
                        request.Equipment.Name, request.RequestedToUtc, daysOverdue);

                    foreach (var admin in admins) {
                        await _email.SendAsync(admin.Email, admin.FullName, subject, html, threadId, ct);
                        await RecordAsync(admin.Email, request.Id, "OverdueAdmin", subject, threadId, ct);
                    }
                }
            }
        }
    }

    public async Task SendApprovalBatchDigestAsync(CancellationToken ct = default) {
        var now = DateTime.UtcNow;
        var cutoff = now.AddHours(-3);

        // Check if a batch digest was sent recently
        var recentDigest = await _db.EmailNotifications.AnyAsync(
            n => n.NotificationType == "ApprovalBatchDigest" && n.SentAtUtc > cutoff, ct);
        if (recentDigest) return;

        // Find pending requests that haven't had any approval notification
        var notifiedRequestIds = await _db.EmailNotifications
            .Where(n => n.NotificationType == "ApprovalNeeded" || n.NotificationType == "ApprovalBatchDigest")
            .Where(n => n.EquipmentRequestId != null)
            .Select(n => n.EquipmentRequestId!.Value)
            .Distinct()
            .ToListAsync(ct);

        var pendingRequests = await _db.EquipmentRequests
            .Include(r => r.User)
            .Include(r => r.Equipment)
            .Where(r => r.Status == RequestStatus.Pending && !notifiedRequestIds.Contains(r.Id))
            .ToListAsync(ct);

        if (pendingRequests.Count == 0) return;

        var admins = await _db.Users
            .Where(u => u.Role == UserRole.Admin)
            .Select(u => new { u.Email, u.FullName })
            .ToListAsync(ct);

        var items = pendingRequests.Select(r =>
            (r.User.FullName, r.Equipment.Name, r.RequestedFromUtc, r.RequestedToUtc)).ToList();

        var totalPending = await _db.EquipmentRequests.CountAsync(r => r.Status == RequestStatus.Pending, ct);
        var subject = $"[Ledger] {totalPending} request(s) pending approval";
        var threadId = $"approval-digest-{now:yyyyMMdd}";
        var html = EmailTemplates.ApprovalBatchDigest(totalPending, items);

        foreach (var admin in admins) {
            await _email.SendAsync(admin.Email, admin.FullName, subject, html, threadId, ct);
        }

        // Record each request as notified
        foreach (var request in pendingRequests) {
            await RecordAsync("digest", request.Id, "ApprovalBatchDigest", subject, threadId, ct);
        }
    }

    public async Task SendInventoryRiskDigestAsync(CancellationToken ct = default) {
        var now = DateTime.UtcNow;
        var todayStart = now.Date;

        // Check if digest was already sent today
        var sentToday = await _db.EmailNotifications.AnyAsync(
            n => n.NotificationType == "InventoryRisk" && n.SentAtUtc >= todayStart, ct);
        if (sentToday) return;

        // Find equipment marked UnderRepair or Retired that hasn't been reported yet
        var reportedEquipmentIds = await _db.EmailNotifications
            .Where(n => n.NotificationType == "InventoryRisk")
            .Select(n => n.ThreadId)
            .Distinct()
            .ToListAsync(ct);

        var flaggedItems = await _db.Equipment
            .Where(e => e.Status == EquipmentStatus.UnderRepair || e.Status == EquipmentStatus.Retired)
            .Where(e => !reportedEquipmentIds.Contains($"inventory-{e.Id}"))
            .ToListAsync(ct);

        if (flaggedItems.Count == 0) return;

        var admins = await _db.Users
            .Where(u => u.Role == UserRole.Admin)
            .Select(u => new { u.Email, u.FullName })
            .ToListAsync(ct);

        var items = flaggedItems.Select(e =>
            (e.Name, e.SerialNumber, e.Status.ToString())).ToList();

        var subject = $"[Ledger] Inventory risk alert — {flaggedItems.Count} item(s)";
        var threadId = $"inventory-digest-{now:yyyyMM}";
        var html = EmailTemplates.InventoryRiskDigest(items);

        foreach (var admin in admins) {
            await _email.SendAsync(admin.Email, admin.FullName, subject, html, threadId, ct);
        }

        // Record each item as reported using its own threadId for tracking
        foreach (var item in flaggedItems) {
            await RecordAsync("digest", null, "InventoryRisk", subject, $"inventory-{item.Id}", ct);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private async Task RecordAsync(string recipientEmail, Guid? requestId,
        string type, string subject, string threadId, CancellationToken ct) {
        _db.EmailNotifications.Add(new EmailNotification {
            Id = Guid.NewGuid(),
            RecipientEmail = recipientEmail,
            EquipmentRequestId = requestId,
            NotificationType = type,
            Subject = subject,
            ThreadId = threadId,
            SentAtUtc = DateTime.UtcNow,
            Status = "Sent",
        });
        await _db.SaveChangesAsync(ct);
    }
}
