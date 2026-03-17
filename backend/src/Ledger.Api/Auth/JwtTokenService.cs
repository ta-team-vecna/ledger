using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Ledger.Api.Domain;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Ledger.Api.Auth;

public interface IJwtTokenService {
    string CreateToken(ApplicationUser user);
    string GenerateRefreshToken();

    ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
}

public sealed class JwtTokenService : IJwtTokenService {
    private readonly JwtOptions _options;
    private readonly ILogger<JwtTokenService> _logger;

    public JwtTokenService(IOptions<JwtOptions> options, ILogger<JwtTokenService> logger) {
        _options = options.Value;
        _logger = logger;
    }

    public string CreateToken(ApplicationUser user) {
        List<Claim> claims = [
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Name, $"{user.FirstName} {user.LastName}"),
            new("role", user.Role.ToString()),
        ];

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(issuer: _options.Issuer, audience: _options.Audience, claims: claims, expires: DateTime.UtcNow.AddMinutes(15), signingCredentials: creds);

        _logger.LogDebug("Created Jwt token for {Email}", user.Email);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public ClaimsPrincipal? GetPrincipalFromExpiredToken(string token) {
        var tokenValidationParameters = new TokenValidationParameters {
            ValidateAudience = true,
            ValidAudience = _options.Audience,
            ValidateIssuer = true,
            ValidIssuer = _options.Issuer,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key)),
            ValidateLifetime = false,
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out SecurityToken securityToken);

        if (
            securityToken is not JwtSecurityToken jwtSecurityToken ||
            !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase)
        ) {
            throw new SecurityTokenException("Invalid token");
        }

        return principal;
    }

    public string GenerateRefreshToken() {
        Span<byte> randomNumber = stackalloc byte[32];
        using var rng = RandomNumberGenerator.Create();

        rng.GetBytes(randomNumber);

        return Convert.ToBase64String(randomNumber);
    }
}