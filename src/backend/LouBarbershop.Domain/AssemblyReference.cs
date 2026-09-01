namespace LouBarbershop.Domain;

/// <summary>
/// Provides a stable reference to the Domain assembly without exposing infrastructure concerns.
/// </summary>
public static class AssemblyReference
{
    public static System.Reflection.Assembly Assembly => typeof(AssemblyReference).Assembly;
}
