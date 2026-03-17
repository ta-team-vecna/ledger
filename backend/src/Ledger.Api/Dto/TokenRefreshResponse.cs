namespace Ledger.Api.Dto;

public sealed record TokenRefreshResponse(
    string AccessToken,
    string RefreshToken
);