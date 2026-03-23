namespace Ledger.Api.Dto;

public sealed record EquipmentReservationResponse(
    DateTime FromUtc,
    DateTime ToUtc,
    string Status
);
