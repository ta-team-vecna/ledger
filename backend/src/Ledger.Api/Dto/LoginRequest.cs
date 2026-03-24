using System.ComponentModel.DataAnnotations;
using Ledger.Api.Utilities;

namespace Ledger.Api.Dto;

public sealed record LoginRequest(
    [Required, MaxLength(InputValidator.EmailMaxLength)]
    string Email,

    [Required, MaxLength(InputValidator.PasswordMaxLength)]
    string Password
);
