namespace Ledger.Api.Dto.Equipment;

public sealed record CreateEquipmentRequestRequest(
    Guid EquipmentId,
    DateTime RequestedFromUtc,
    DateTime RequestedToUtc
);