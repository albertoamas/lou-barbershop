namespace LouBarbershop.Application;

/// <summary>
/// Provides a stable reference to the Application assembly.
/// </summary>
public static class AssemblyReference
{
    public static System.Reflection.Assembly Assembly => typeof(AssemblyReference).Assembly;
}
