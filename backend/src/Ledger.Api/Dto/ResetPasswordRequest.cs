using System.ComponentModel.DataAnnotations;
using Ledger.Api.Utilities;

namespace Ledger.Api.Dto;

public sealed class ResetPasswordRequest {
    [Required]
    public string Token { get; set; } = null!;

    [Required]
    [MinLength(InputValidator.PasswordMinLength, ErrorMessage = "Password must be at least 8 characters.")]
    [MaxLength(InputValidator.PasswordMaxLength, ErrorMessage = "Password must not exceed 128 characters.")]
    public string NewPassword { get; set; } = null!;
}
