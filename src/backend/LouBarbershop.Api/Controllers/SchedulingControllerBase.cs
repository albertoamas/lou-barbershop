using LouBarbershop.Application.Scheduling;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

public abstract class SchedulingControllerBase : ControllerBase
{
    protected ActionResult<TResponse> ToResponse<TEntity, TResponse>(SchedulingResult<TEntity> result, Func<TEntity, IReadOnlyCollection<AppointmentConflict>, TResponse> map) where TEntity : class => result.Status switch
    {
        SchedulingStatus.Success => Ok(map(result.Value!, result.Conflicts ?? [])),
        SchedulingStatus.NotFound => NotFound(),
        SchedulingStatus.Conflict => Conflict(Problem(result.Code, result.Message, StatusCodes.Status409Conflict)),
        _ => BadRequest(Problem(result.Code, result.Message, StatusCodes.Status400BadRequest)),
    };

    private ProblemDetails Problem(string? code, string? message, int status) => new()
    {
        Status = status,
        Title = "La solicitud no puede procesarse.",
        Detail = message,
        Type = $"https://lou-barbershop.local/errors/{code}",
        Extensions = { ["code"] = code, ["requestId"] = HttpContext.TraceIdentifier },
    };
}
