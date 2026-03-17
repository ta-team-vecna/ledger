namespace Ledger.Api.Dto;

public sealed record TokenRefreshRequest(
    string AccessToken,
    string RefreshToken
);