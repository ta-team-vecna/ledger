using System.ComponentModel.DataAnnotations;
using Ledger.Api.Domain;
using Ledger.Api.Utilities;

namespace Ledger.Api.Dto;

public sealed record CreateUserRequest(
    [Required, MaxLength(InputValidator.NameMaxLength), MinLength(1)]
    [RegularExpression(InputValidator.NamePattern, ErrorMessage = InputValidator.NameErrorMessage)]
    string FirstName,

    [Required, MaxLength(InputValidator.NameMaxLength), MinLength(1)]
    [RegularExpression(InputValidator.NamePattern, ErrorMessage = InputValidator.NameErrorMessage)]
    string LastName,

    [Required, MaxLength(InputValidator.EmailMaxLength), MinLength(1)]
    [RegularExpression(InputValidator.EmailPattern, ErrorMessage = InputValidator.EmailErrorMessage)]
    string Email,

    [Required, MinLength(InputValidator.PasswordMinLength), MaxLength(InputValidator.PasswordMaxLength)]
    string Password,

    [Required] UserRole Role
);
