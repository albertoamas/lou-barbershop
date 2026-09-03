using System.Text;
using System.Text.Json;

namespace LouBarbershop.Api.Serialization;

public sealed class UpperSnakeCaseJsonNamingPolicy : JsonNamingPolicy
{
    public override string ConvertName(string name)
    {
        var converted = new StringBuilder(name.Length + 4);
        for (var index = 0; index < name.Length; index++)
        {
            var current = name[index];
            if (index > 0 && char.IsUpper(current) && char.IsLower(name[index - 1]))
            {
                converted.Append('_');
            }

            converted.Append(char.ToUpperInvariant(current));
        }

        return converted.ToString();
    }
}
