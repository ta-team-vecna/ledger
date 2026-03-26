namespace Ledger.Api.Email;

public static class EmailTemplates {
    private static string Wrap(string title, string bodyHtml) =>
        $"""
        <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#1a1a1a;border-bottom:2px solid #2563eb;padding-bottom:8px">{title}</h2>
          {bodyHtml}
          <hr style="margin-top:24px;border:none;border-top:1px solid #e5e7eb"/>
          <p style="font-size:12px;color:#6b7280">Ledger Equipment System &mdash; automated notification</p>
        </div>
        """;

    public static string ApprovalNeeded(string requesterName, string equipmentName,
        DateTime from, DateTime to) =>
        Wrap("New Request Pending Approval", $"""
            <p>A new equipment request requires your review.</p>
            <table style="border-collapse:collapse;width:100%;margin:12px 0">
              <tr><td style="padding:6px 12px;color:#6b7280">Requester</td><td style="padding:6px 12px;font-weight:600">{requesterName}</td></tr>
              <tr style="background:#f9fafb"><td style="padding:6px 12px;color:#6b7280">Equipment</td><td style="padding:6px 12px;font-weight:600">{equipmentName}</td></tr>
              <tr><td style="padding:6px 12px;color:#6b7280">Period</td><td style="padding:6px 12px">{from:MMM dd, yyyy} &mdash; {to:MMM dd, yyyy}</td></tr>
            </table>
            <p>Please log in to the Ledger system to approve or reject this request.</p>
            """);

    public static string ApprovalBatchDigest(int pendingCount,
        List<(string Requester, string Equipment, DateTime From, DateTime To)> items) {
        var rows = string.Join("\n", items.Select(i =>
            $"""<tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">{i.Requester}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">{i.Equipment}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">{i.From:MMM dd} &mdash; {i.To:MMM dd}</td></tr>"""));

        return Wrap($"{pendingCount} Requests Pending Approval", $"""
            <p>The following requests are awaiting your review:</p>
            <table style="border-collapse:collapse;width:100%;margin:12px 0">
              <tr style="background:#f1f5f9"><th style="padding:6px 12px;text-align:left">Requester</th><th style="padding:6px 12px;text-align:left">Equipment</th><th style="padding:6px 12px;text-align:left">Period</th></tr>
              {rows}
            </table>
            <p>Please log in to the Ledger system to review these requests.</p>
            """);
    }

    public static string RequestDecision(string decision, string equipmentName,
        DateTime from, DateTime to, string? comment) {
        var commentHtml = string.IsNullOrWhiteSpace(comment)
            ? ""
            : $"""<tr style="background:#f9fafb"><td style="padding:6px 12px;color:#6b7280">Admin Comment</td><td style="padding:6px 12px;font-style:italic">{comment}</td></tr>""";

        var color = decision == "Approved" ? "#16a34a" : "#dc2626";

        return Wrap($"Request {decision}", $"""
            <p>Your equipment request has been <strong style="color:{color}">{decision.ToLower()}</strong>.</p>
            <table style="border-collapse:collapse;width:100%;margin:12px 0">
              <tr><td style="padding:6px 12px;color:#6b7280">Equipment</td><td style="padding:6px 12px;font-weight:600">{equipmentName}</td></tr>
              <tr style="background:#f9fafb"><td style="padding:6px 12px;color:#6b7280">Period</td><td style="padding:6px 12px">{from:MMM dd, yyyy} &mdash; {to:MMM dd, yyyy}</td></tr>
              {commentHtml}
            </table>
            """);
    }

    public static string RequestCancelled(string equipmentName, DateTime from, DateTime to) =>
        Wrap("Request Cancelled", $"""
            <p>An equipment request has been cancelled.</p>
            <table style="border-collapse:collapse;width:100%;margin:12px 0">
              <tr><td style="padding:6px 12px;color:#6b7280">Equipment</td><td style="padding:6px 12px;font-weight:600">{equipmentName}</td></tr>
              <tr style="background:#f9fafb"><td style="padding:6px 12px;color:#6b7280">Period</td><td style="padding:6px 12px">{from:MMM dd, yyyy} &mdash; {to:MMM dd, yyyy}</td></tr>
            </table>
            """);

    public static string PickupReminder(string equipmentName, DateTime pickupDate, bool isDueToday) =>
        Wrap(isDueToday ? "Pickup Due Today" : "Pickup Reminder", $"""
            <p>{(isDueToday
                ? $"Your reservation for <strong>{equipmentName}</strong> starts today. Please pick up the item."
                : $"Reminder: your reservation for <strong>{equipmentName}</strong> starts tomorrow.")}</p>
            <p><strong>Pickup date:</strong> {pickupDate:MMM dd, yyyy}</p>
            """);

    public static string ReturnReminder(string equipmentName, DateTime dueDate, bool isDueToday) =>
        Wrap(isDueToday ? "Return Due Today" : "Return Reminder", $"""
            <p>{(isDueToday
                ? $"Your reservation for <strong>{equipmentName}</strong> is due for return <strong>today</strong>. Please return the item."
                : $"Reminder: your reservation for <strong>{equipmentName}</strong> is due for return tomorrow.")}</p>
            <p><strong>Due date:</strong> {dueDate:MMM dd, yyyy}</p>
            """);

    public static string OverdueBorrower(string equipmentName, DateTime dueDate) =>
        Wrap("Item Overdue", $"""
            <p style="color:#dc2626">Your reservation for <strong>{equipmentName}</strong> is <strong>overdue</strong>.</p>
            <p>The item was due on <strong>{dueDate:MMM dd, yyyy}</strong>. Please return it as soon as possible.</p>
            """);

    public static string OverdueAdmin(string borrowerName, string borrowerEmail,
        string equipmentName, DateTime dueDate, int daysOverdue) =>
        Wrap("Overdue Escalation", $"""
            <p style="color:#dc2626">An item is overdue and requires attention.</p>
            <table style="border-collapse:collapse;width:100%;margin:12px 0">
              <tr><td style="padding:6px 12px;color:#6b7280">Borrower</td><td style="padding:6px 12px;font-weight:600">{borrowerName} ({borrowerEmail})</td></tr>
              <tr style="background:#f9fafb"><td style="padding:6px 12px;color:#6b7280">Equipment</td><td style="padding:6px 12px;font-weight:600">{equipmentName}</td></tr>
              <tr><td style="padding:6px 12px;color:#6b7280">Due date</td><td style="padding:6px 12px">{dueDate:MMM dd, yyyy}</td></tr>
              <tr style="background:#f9fafb"><td style="padding:6px 12px;color:#6b7280">Days overdue</td><td style="padding:6px 12px;color:#dc2626;font-weight:600">{daysOverdue}</td></tr>
            </table>
            """);

    public static string OverdueAdminDigest(
        List<(string BorrowerName, string BorrowerEmail, string EquipmentName, DateTime DueDate, int DaysOverdue)> items) {
        var rows = string.Join("\n", items.Select(i =>
            $"""<tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">{i.BorrowerName} ({i.BorrowerEmail})</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">{i.EquipmentName}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">{i.DueDate:MMM dd, yyyy}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;color:#dc2626;font-weight:600">{i.DaysOverdue}d</td></tr>"""));

        return Wrap($"Overdue Escalation — {items.Count} Item(s)", $"""
            <p style="color:#dc2626">The following items are overdue and require your attention.</p>
            <table style="border-collapse:collapse;width:100%;margin:12px 0">
              <tr style="background:#f1f5f9"><th style="padding:6px 12px;text-align:left">Borrower</th><th style="padding:6px 12px;text-align:left">Equipment</th><th style="padding:6px 12px;text-align:left">Due date</th><th style="padding:6px 12px;text-align:left">Overdue</th></tr>
              {rows}
            </table>
            <p>Please follow up with the borrowers listed above.</p>
            """);
    }

    public static string PasswordReset(string resetToken) =>
        Wrap("Password Reset Requested", $"""
            <p>A password reset was requested for your account.</p>
            <p>Your reset token is:</p>
            <div style="background:#f1f5f9;padding:12px 16px;border-radius:6px;font-family:monospace;font-size:16px;margin:12px 0;word-break:break-all">
              {resetToken}
            </div>
            <p style="font-size:13px;color:#6b7280">This token expires in 15 minutes. If you did not request this, please ignore this email.</p>
            """);

    public static string PasswordChanged() =>
        Wrap("Password Changed", """
            <p>Your password has been successfully changed.</p>
            <p style="font-size:13px;color:#6b7280">If you did not make this change, please contact an administrator immediately.</p>
            """);

    public static string RoleChanged(string oldRole, string newRole) =>
        Wrap("Account Role Changed", $"""
            <p>Your account role has been updated.</p>
            <table style="border-collapse:collapse;width:100%;margin:12px 0">
              <tr><td style="padding:6px 12px;color:#6b7280">Previous role</td><td style="padding:6px 12px">{oldRole}</td></tr>
              <tr style="background:#f9fafb"><td style="padding:6px 12px;color:#6b7280">New role</td><td style="padding:6px 12px;font-weight:600">{newRole}</td></tr>
            </table>
            <p style="font-size:13px;color:#6b7280">If this change was unexpected, please contact an administrator.</p>
            """);

    public static string InventoryRiskDigest(
        List<(string Name, string SerialNumber, string Status)> items) {
        var rows = string.Join("\n", items.Select(i =>
            $"""<tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">{i.Name}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">{i.SerialNumber}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">{i.Status}</td></tr>"""));

        return Wrap($"Inventory Risk Alert — {items.Count} Item(s)", $"""
            <p>The following items have been flagged:</p>
            <table style="border-collapse:collapse;width:100%;margin:12px 0">
              <tr style="background:#f1f5f9"><th style="padding:6px 12px;text-align:left">Item</th><th style="padding:6px 12px;text-align:left">Serial</th><th style="padding:6px 12px;text-align:left">Status</th></tr>
              {rows}
            </table>
            """);
    }
}
