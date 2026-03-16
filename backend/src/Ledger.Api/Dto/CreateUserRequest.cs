using System.ComponentModel.DataAnnotations;
using Ledger.Api.Domain;

namespace Ledger.Api.Dto;

public sealed record CreateUserRequest(
    [Required, MaxLength(100), MinLength(1)]
    string FirstName,
    [Required, MaxLength(100), MinLength(1)]
    string LastName,
    [Required, MaxLength(256), MinLength(1), EmailAddress]
    string Email,
    [Required, MinLength(6)] string Password,
    [Required] UserRole Role
);