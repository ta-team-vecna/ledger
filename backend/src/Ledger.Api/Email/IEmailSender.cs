namespace Ledger.Api.Email;

public interface IEmailSender {
    Task SendAsync(string toAddress, string toName, string subject, string htmlBody,
        string? threadId = null, CancellationToken ct = default);
}
