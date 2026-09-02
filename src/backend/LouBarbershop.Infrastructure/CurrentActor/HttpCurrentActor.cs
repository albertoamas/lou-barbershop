using System.Security.Claims;
using LouBarbershop.Application.Abstractions;
using Microsoft.AspNetCore.Http;

namespace LouBarbershop.Infrastructure.CurrentActor;

public sealed class HttpCurrentActor(IHttpContextAccessor httpContextAccessor) : ICurrentActor
{
    public Guid? UserId
    {
        get
        {
            var value = httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(value, out var userId) ? userId : null;
        }
    }
}
