using LouBarbershop.Application.Reporting;
using Microsoft.AspNetCore.Mvc;

namespace LouBarbershop.Api.Controllers;

public abstract class ReportingControllerBase : ControllerBase
{
    protected ActionResult<T> Respond<T>(ReportingResult<T> result) => result.Status switch
    {
        ReportingStatus.Success => Ok(result.Value),
        ReportingStatus.Forbidden => Problem(statusCode: 403, title: result.Message, extensions: new Dictionary<string, object?> { ["code"] = result.Code }),
        _ => Problem(statusCode: 400, title: result.Message, extensions: new Dictionary<string, object?> { ["code"] = result.Code }),
    };
}
