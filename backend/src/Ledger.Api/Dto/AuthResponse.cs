namespace Ledger.Api.Dto;

public sealed record AuthResponse(
    string Token,
    string RefreshToken,
    Guid UserId,
    string FirstName,
    string LastName,
    string Email,
    string Role
);