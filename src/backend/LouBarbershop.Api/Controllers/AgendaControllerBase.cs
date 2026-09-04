using LouBarbershop.Application.Agenda;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

public abstract class AgendaControllerBase : ControllerBase
{
    protected ActionResult<T> Respond<T>(AgendaResult<T> result) => result.Status switch
    {
        AgendaStatus.Success => Ok(result.Value),
        AgendaStatus.Forbidden => Forbid(),
        AgendaStatus.NotFound => NotFound(),
        _ => Problem(statusCode: result.Status == AgendaStatus.Conflict ? 409 : 400, title: "La solicitud no puede procesarse.", detail: result.Message,
            extensions: new Dictionary<string, object?> { ["code"] = result.Code }),
    };
}
