using Ledger.Api.Domain;

namespace Ledger.Api.Dto;

public sealed record UpdateEquipmentStatusRequest(
    EquipmentStatus Status
);