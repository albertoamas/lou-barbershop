using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace LouBarbershop.Api.Errors;

public sealed class PersistenceConflictExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var isConcurrencyConflict = exception is DbUpdateConcurrencyException;
        var isConstraintConflict = exception is DbUpdateException { InnerException: PostgresException postgres }
            && postgres.SqlState is PostgresErrorCodes.ExclusionViolation or PostgresErrorCodes.UniqueViolation;
        if (!isConcurrencyConflict && !isConstraintConflict) return false;

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status409Conflict,
            Title = "El registro entró en conflicto con otro cambio.",
            Detail = isConcurrencyConflict
                ? "Recargue los datos antes de guardar nuevamente."
                : "Ya existe una condición o identificador que se solapa con este cambio.",
            Type = "https://lou-barbershop.local/errors/version.conflict",
        };
        problem.Extensions["code"] = isConcurrencyConflict ? "version.conflict" : "catalog.constraint_conflict";
        problem.Extensions["requestId"] = httpContext.TraceIdentifier;
        httpContext.Response.StatusCode = StatusCodes.Status409Conflict;
        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
        return true;
    }
}
