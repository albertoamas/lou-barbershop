using LouBarbershop.Api.Errors;
using LouBarbershop.Domain.Common;
using Microsoft.AspNetCore.Http;

namespace LouBarbershop.Integration.Tests;

public sealed class DomainProblemDetailsFactoryTests
{
    [Fact]
    public void CreateWhenStateTransitionIsInvalidReturnsConflictProblemDetails()
    {
        var httpContext = new DefaultHttpContext { TraceIdentifier = "request-123" };

        var result = DomainProblemDetailsFactory.Create(DomainErrors.InvalidStateTransition, httpContext);

        Assert.Equal(StatusCodes.Status409Conflict, result.Status);
        Assert.Equal("state.invalid_transition", result.Extensions["code"]);
        Assert.Equal("request-123", result.Extensions["requestId"]);
    }
}
