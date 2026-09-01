namespace LouBarbershop.Domain.Tests;

public sealed class AssemblyReferenceTests
{
    [Fact]
    public void DomainAssemblyReferencePointsToDomainAssembly()
    {
        Assert.Equal("LouBarbershop.Domain", Domain.AssemblyReference.Assembly.GetName().Name);
    }
}
