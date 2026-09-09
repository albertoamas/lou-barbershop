using LouBarbershop.Api.Controllers;
using LouBarbershop.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;

namespace LouBarbershop.Architecture.Tests;

public sealed class SecurityBoundaryTests
{
    private static readonly Type[] ControllerTypes = typeof(AuthController).Assembly
        .GetTypes()
        .Where(type => !type.IsAbstract && typeof(ControllerBase).IsAssignableFrom(type))
        .ToArray();

    [Fact]
    public void EveryHttpActionHasAnExplicitAuthenticationDecision()
    {
        var unprotected = ControllerTypes
            .SelectMany(type => type.GetMethods().Select(method => new { Controller = type, Method = method }))
            .Where(x => x.Method.GetCustomAttributes(true).OfType<IActionHttpMethodProvider>().Any())
            .Where(x => !HasAttribute<AuthorizeAttribute>(x.Controller)
                && !HasAttribute<IAllowAnonymous>(x.Controller)
                && !HasAttribute<AuthorizeAttribute>(x.Method)
                && !HasAttribute<IAllowAnonymous>(x.Method))
            .Select(x => $"{x.Controller.Name}.{x.Method.Name}")
            .ToArray();

        Assert.Empty(unprotected);
    }

    [Fact]
    public void AnonymousActionsAreLimitedToAuthenticationBootstrapAndPublicBooking()
    {
        var unexpected = ControllerTypes
            .SelectMany(type => type.GetMethods().Select(method => new { Controller = type, Method = method }))
            .Where(x => x.Method.GetCustomAttributes(true).OfType<IActionHttpMethodProvider>().Any())
            .Where(x => HasAttribute<IAllowAnonymous>(x.Controller) || HasAttribute<IAllowAnonymous>(x.Method))
            .Where(x => x.Controller != typeof(AuthController) && x.Controller != typeof(PublicBookingController))
            .Select(x => $"{x.Controller.Name}.{x.Method.Name}")
            .ToArray();

        Assert.Empty(unexpected);
    }

    [Fact]
    public void ControllersDoNotReceiveDbContextDirectly()
    {
        var violations = ControllerTypes
            .SelectMany(type => type.GetConstructors().SelectMany(constructor => constructor.GetParameters()
                .Where(parameter => parameter.ParameterType == typeof(AppDbContext)
                    || parameter.ParameterType.Namespace?.StartsWith("Microsoft.EntityFrameworkCore", StringComparison.Ordinal) == true)
                .Select(parameter => $"{type.Name}:{parameter.ParameterType.Name}")))
            .ToArray();

        Assert.Empty(violations);
    }

    private static bool HasAttribute<T>(System.Reflection.MemberInfo member) =>
        member.GetCustomAttributes(true).OfType<T>().Any();
}
