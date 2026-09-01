using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;

namespace LouBarbershop.Architecture.Tests;

public sealed class DependencyRulesTests
{
    private static readonly string[] ForbiddenCoreDependencies =
    [
        "Microsoft.AspNetCore",
        "Microsoft.EntityFrameworkCore",
        "Npgsql",
        "LouBarbershop.Infrastructure",
        "LouBarbershop.Api",
    ];

    [Fact]
    public void DomainHasNoFrameworkOrOuterLayerReferences()
    {
        AssertHasNoForbiddenReferences("LouBarbershop.Domain.dll");
    }

    [Fact]
    public void ApplicationHasNoFrameworkOrOuterLayerReferences()
    {
        AssertHasNoForbiddenReferences("LouBarbershop.Application.dll");
    }

    private static void AssertHasNoForbiddenReferences(string assemblyFileName)
    {
        var assemblyPath = Path.Combine(AppContext.BaseDirectory, assemblyFileName);

        using var stream = File.OpenRead(assemblyPath);
        using var peReader = new PEReader(stream);
        var metadataReader = peReader.GetMetadataReader();

        var forbiddenReferences = metadataReader
            .AssemblyReferences
            .Select(handle => metadataReader.GetAssemblyReference(handle))
            .Select(reference => metadataReader.GetString(reference.Name))
            .Where(name => ForbiddenCoreDependencies.Any(
                forbidden => name.StartsWith(forbidden, StringComparison.Ordinal)))
            .ToArray();

        Assert.Empty(forbiddenReferences);
    }
}
