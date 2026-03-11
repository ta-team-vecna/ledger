namespace Ledger.Api.Domain;

public enum RequestStatus {
    Pending,
    Approved,
    Rejected,
    CheckedOut,
    Returned,
    Cancelled,
    Overdue,
}