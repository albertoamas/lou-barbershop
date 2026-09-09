using LouBarbershop.Application.Abstractions;
using Microsoft.AspNetCore.Http;

namespace LouBarbershop.Infrastructure.CurrentActor;

public sealed class HttpRequestContext(IHttpContextAccessor httpContextAccessor) : IRequestContext
{
    public string? RequestId
    {
        get
        {
            var requestId = httpContextAccessor.HttpContext?.TraceIdentifier;
            return string.IsNullOrWhiteSpace(requestId) ? null : requestId[..Math.Min(requestId.Length, 128)];
        }
    }
}
