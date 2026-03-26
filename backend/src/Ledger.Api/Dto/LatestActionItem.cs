namespace Ledger.Api.Dto;

public record LatestActionItem(
    string Type,
    string Icon,
    string IconColor,
    string Text,
    DateTime Timestamp
);
