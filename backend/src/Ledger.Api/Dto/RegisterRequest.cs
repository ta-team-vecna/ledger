namespace Ledger.Api.Dto;

public sealed record RegisterRequest(
    string FirstName,
    string LastName,
    string Email,
    string Password
);