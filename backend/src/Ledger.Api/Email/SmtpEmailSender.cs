using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Ledger.Api.Email;

public sealed class SmtpEmailSender : IEmailSender {
    private readonly SmtpOptions _options;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IOptions<SmtpOptions> options, ILogger<SmtpEmailSender> logger) {
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(string toAddress, string toName, string subject, string htmlBody,
        string? threadId = null, CancellationToken ct = default) {
        if (!_options.Enabled) {
            _logger.LogDebug("Email disabled — would send to {To}: {Subject}", toAddress, subject);
            return;
        }

        try {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_options.FromName, _options.FromAddress));
            message.To.Add(new MailboxAddress(toName, toAddress));
            message.Subject = subject;

            if (!string.IsNullOrEmpty(threadId)) {
                var rootId = $"{threadId}@ledger";
                message.MessageId = $"{threadId}.{DateTime.UtcNow.Ticks}@ledger";
                message.InReplyTo = rootId;
                message.References.Add(rootId);
            }

            message.Body = new TextPart("html") { Text = htmlBody };

            using var client = new SmtpClient();
            await client.ConnectAsync(_options.Host, _options.Port, SecureSocketOptions.Auto, ct);

            if (!string.IsNullOrEmpty(_options.Username)) {
                await client.AuthenticateAsync(_options.Username, _options.Password, ct);
            }

            await client.SendAsync(message, ct);
            await client.DisconnectAsync(true, ct);

            _logger.LogInformation("Email sent to {To}: {Subject}", toAddress, subject);
        } catch (Exception ex) {
            _logger.LogError(ex, "Failed to send email to {To}: {Subject}", toAddress, subject);
        }
    }
}
