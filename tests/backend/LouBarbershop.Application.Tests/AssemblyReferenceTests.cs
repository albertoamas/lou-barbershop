namespace LouBarbershop.Application.Tests;

public sealed class AssemblyReferenceTests
{
    [Fact]
    public void ApplicationAssemblyReferencePointsToApplicationAssembly()
    {
        Assert.Equal("LouBarbershop.Application", Application.AssemblyReference.Assembly.GetName().Name);
    }
}
