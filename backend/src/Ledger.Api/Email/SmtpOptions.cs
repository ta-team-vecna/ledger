namespace Ledger.Api.Email;

public sealed class SmtpOptions {
    public const string SectionName = "Smtp";

    public string Host { get; set; } = null!;
    public int Port { get; set; } = 587;
    public string Username { get; set; } = null!;
    public string Password { get; set; } = null!;
    public string FromAddress { get; set; } = null!;
    public string FromName { get; set; } = "Ledger System";
    public bool EnableSsl { get; set; } = true;
    public bool Enabled { get; set; } = true;
}
