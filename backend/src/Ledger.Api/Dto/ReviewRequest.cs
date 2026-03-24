using System.ComponentModel.DataAnnotations;
using Ledger.Api.Utilities;

namespace Ledger.Api.Dto;

public sealed record ReviewRequest(
    [MaxLength(InputValidator.CommentMaxLength)]
    string? Comment
);
