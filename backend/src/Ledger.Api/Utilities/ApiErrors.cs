using Microsoft.AspNetCore.Mvc;

namespace Ledger.Api.Utilities;

public static class ApiErrors {
    public static ProblemDetails Unauthorized => new() {
        Detail = "Unauthorized.",
        Status = StatusCodes.Status401Unauthorized,
    };

    public static ProblemDetails BadRequest(string title, string detail) {
        return new ProblemDetails {
            Title = title,
            Detail = detail,
            Status = StatusCodes.Status400BadRequest,
        };
    }

    public static ProblemDetails NotFound(string detail) {
        return new ProblemDetails {
            Detail = detail,
            Status = StatusCodes.Status404NotFound,
        };
    }

    public static ProblemDetails Conflict(string detail) {
        return new ProblemDetails {
            Detail = detail,
            Status = StatusCodes.Status409Conflict,
        };
    }

    public static ProblemDetails Forbidden(string detail) {
        return new ProblemDetails {
            Title = "Forbidden",
            Detail = detail,
            Status = StatusCodes.Status403Forbidden,
        };
    }
}