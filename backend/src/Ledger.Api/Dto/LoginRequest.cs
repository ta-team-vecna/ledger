namespace Ledger.Api.Dto;

public sealed record LoginRequest(
    string Email,
    string Password
);