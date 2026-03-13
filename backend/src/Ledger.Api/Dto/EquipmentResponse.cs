namespace Ledger.Api.Dto;

public sealed record EquipmentResponse(
    Guid Id,
    string Name,
    string Type,
    string SerialNumber,
    string Condition,
    string Status,
    string Location,
    string? PhotoUrl,
    bool RequiresAdminApproval
);