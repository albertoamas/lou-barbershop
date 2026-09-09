using LouBarbershop.Application.Commissions;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

public abstract class CommissionControllerBase : ControllerBase
{
    protected ActionResult<T> Respond<T>(CommissionResult<T> result) => result.Status switch
    {
        CommissionStatus.Success => Ok(result.Value),
        CommissionStatus.Forbidden => Forbid(),
        CommissionStatus.NotFound => NotFound(),
        _ => Problem(statusCode: result.Status == CommissionStatus.Conflict ? 409 : 400, title: "La solicitud no puede procesarse.", detail: result.Message, extensions: new Dictionary<string, object?> { ["code"] = result.Code }),
    };
}
