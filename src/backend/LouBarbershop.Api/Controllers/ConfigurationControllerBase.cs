using LouBarbershop.Application.Configuration;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

public abstract class ConfigurationControllerBase : ControllerBase
{
    protected ActionResult<TResponse> ToResponse<TEntity, TResponse>(ConfigurationResult<TEntity> result, Func<TEntity, TResponse> map) where TEntity : class => result.Status switch
    {
        ConfigurationStatus.Success => Ok(map(result.Value!)),
        ConfigurationStatus.NotFound => NotFound(),
        ConfigurationStatus.Conflict => Conflict(Problem(result, StatusCodes.Status409Conflict)),
        _ => BadRequest(Problem(result, StatusCodes.Status400BadRequest)),
    };

    protected IActionResult ToNoContent<TEntity>(ConfigurationResult<TEntity> result) where TEntity : class => result.Status switch
    {
        ConfigurationStatus.Success => NoContent(),
        ConfigurationStatus.NotFound => NotFound(),
        ConfigurationStatus.Conflict => Conflict(Problem(result, StatusCodes.Status409Conflict)),
        _ => BadRequest(Problem(result, StatusCodes.Status400BadRequest)),
    };

    private ProblemDetails Problem<TEntity>(ConfigurationResult<TEntity> result, int status) => new()
    {
        Status = status,
        Title = "La solicitud no puede procesarse.",
        Detail = result.Message,
        Type = $"https://lou-barbershop.local/errors/{result.Code}",
        Extensions = { ["code"] = result.Code, ["requestId"] = HttpContext.TraceIdentifier },
    };
}
