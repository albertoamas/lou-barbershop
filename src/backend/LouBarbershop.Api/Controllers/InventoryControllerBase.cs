using LouBarbershop.Application.Inventory;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

public abstract class InventoryControllerBase : ControllerBase
{
    protected ActionResult<T> Respond<T>(InventoryResult<T> result) => result.Status switch
    {
        InventoryStatus.Success => Ok(result.Value),
        InventoryStatus.Invalid => Problem(statusCode: 400, title: result.Message, extensions: new Dictionary<string, object?> { ["code"] = result.Code }),
        InventoryStatus.Forbidden => Problem(statusCode: 403, title: "No tienes permiso para esta acción.", extensions: new Dictionary<string, object?> { ["code"] = "FORBIDDEN" }),
        InventoryStatus.NotFound => Problem(statusCode: 404, title: "No se encontró el recurso.", extensions: new Dictionary<string, object?> { ["code"] = "NOT_FOUND" }),
        _ => Problem(statusCode: 409, title: result.Message, extensions: new Dictionary<string, object?> { ["code"] = result.Code }),
    };
}
