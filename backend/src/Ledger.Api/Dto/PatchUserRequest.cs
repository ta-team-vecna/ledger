using System.ComponentModel.DataAnnotations;
using Ledger.Api.Domain;
using Ledger.Api.Utilities;

namespace Ledger.Api.Dto;

public sealed record PatchUserRequest(
    [MaxLength(InputValidator.NameMaxLength), MinLength(1)]
    [RegularExpression(InputValidator.NamePattern, ErrorMessage = InputValidator.NameErrorMessage)]
    string? FirstName,

    [MaxLength(InputValidator.NameMaxLength), MinLength(1)]
    [RegularExpression(InputValidator.NamePattern, ErrorMessage = InputValidator.NameErrorMessage)]
    string? LastName,

    [MaxLength(InputValidator.EmailMaxLength), MinLength(1)]
    [RegularExpression(InputValidator.EmailPattern, ErrorMessage = InputValidator.EmailErrorMessage)]
    string? Email,

    UserRole? Role
);
