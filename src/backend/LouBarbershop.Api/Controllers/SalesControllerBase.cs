using LouBarbershop.Application.Sales;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

public abstract class SalesControllerBase : ControllerBase
{
    protected ActionResult<T> Respond<T>(SalesResult<T> result) => result.Status switch
    { SalesStatus.Success => Ok(result.Value), SalesStatus.Forbidden => Forbid(), SalesStatus.NotFound => NotFound(), _ => Problem(statusCode: result.Status == SalesStatus.Conflict ? 409 : 400, title: "La solicitud no puede procesarse.", detail: result.Message, extensions: new Dictionary<string, object?> { ["code"] = result.Code }) };
}
