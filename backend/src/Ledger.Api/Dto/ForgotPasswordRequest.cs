using System.ComponentModel.DataAnnotations;
using Ledger.Api.Utilities;

namespace Ledger.Api.Dto;

public sealed class ForgotPasswordRequest {
    [Required]
    [MaxLength(InputValidator.EmailMaxLength, ErrorMessage = "Email must not exceed 256 characters.")]
    [RegularExpression(InputValidator.EmailPattern, ErrorMessage = "Invalid email format.")]
    public string Email { get; set; } = null!;
}
