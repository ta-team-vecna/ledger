using Ledger.Api.Domain;
using System.ComponentModel.DataAnnotations;

namespace Ledger.Api.Dto;

public sealed record UpdateEquipmentRequest(
    [Required, MaxLength(200)] string Name,
    [Required, MaxLength(100)] string Type,
    [Required, MaxLength(100)] string Condition,
    [Required, MaxLength(200)] string Location,
    string? PhotoUrl,
    bool RequiresAdminApproval,
    EquipmentStatus Status
);