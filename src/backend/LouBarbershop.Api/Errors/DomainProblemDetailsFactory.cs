using LouBarbershop.Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Errors;

public static class DomainProblemDetailsFactory
{
    public static ProblemDetails Create(DomainError error, HttpContext httpContext)
    {
        ArgumentNullException.ThrowIfNull(error);
        ArgumentNullException.ThrowIfNull(httpContext);

        var status = error.Code switch
        {
            "state.invalid_transition" => StatusCodes.Status409Conflict,
            "money.overflow" => StatusCodes.Status422UnprocessableEntity,
            _ => StatusCodes.Status400BadRequest,
        };

        var problemDetails = new ProblemDetails
        {
            Status = status,
            Title = "La solicitud no puede procesarse.",
            Detail = error.Message,
            Type = $"https://lou-barbershop.local/errors/{error.Code}",
        };

        problemDetails.Extensions["code"] = error.Code;
        problemDetails.Extensions["requestId"] = httpContext.TraceIdentifier;

        return problemDetails;
    }
}
