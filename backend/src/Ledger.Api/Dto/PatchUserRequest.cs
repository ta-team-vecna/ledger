using System.ComponentModel.DataAnnotations;
using Ledger.Api.Domain;

namespace Ledger.Api.Dto;

public sealed record PatchUserRequest(
    [MaxLength(100), MinLength(1)] string? FirstName,
    [MaxLength(100), MinLength(1)] string? LastName,
    [MaxLength(256), MinLength(1), EmailAddress] string? Email,
    UserRole? Role
);