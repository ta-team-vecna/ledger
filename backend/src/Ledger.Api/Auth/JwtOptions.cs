namespace Ledger.Api.Auth;

public sealed class JwtOptions {
    public const string SectionName = "Jwt";
        
    public string Issuer { get; set; } = null!;
    public string Audience { get; set; } = null!;
    public string Key { get; set; } = null!;
}