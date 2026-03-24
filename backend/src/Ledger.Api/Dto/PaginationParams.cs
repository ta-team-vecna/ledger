namespace Ledger.Api.Dto;

public record PaginationParams {
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;

    public int ValidPage => Math.Max(1, Page);
    public int ValidPageSize => Math.Clamp(PageSize, 1, 100);
    public int Skip => (ValidPage - 1) * ValidPageSize;
}
