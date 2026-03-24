using System.ComponentModel.DataAnnotations;
using Ledger.Api.Utilities;

namespace Ledger.Api.Dto.Equipment;

public record ReturnEquipmentRequest(
    [MaxLength(InputValidator.NotesMaxLength)]
    string? ReturnConditionNotes,

    bool WantsRepair
);
