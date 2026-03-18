namespace Ledger.Api.Dto.Equipment;

public sealed record EquipmentRequestResponse(
    Guid Id,
    Guid UserId,
    string UserFullName,
    Guid EquipmentId,
    string EquipmentName,
    string EquipmentSerialNumber,
    string Status,
    DateTime RequestedAtUtc,
    DateTime RequestedFromUtc,
    DateTime RequestedToUtc,
    DateTime? ReviewedAtUtc,
    DateTime? CheckedOutAtUtc,
    DateTime? ReturnedAtUtc,
    string? AdminComment,
    string? ReturnConditionNotes
);