using System.Security.Cryptography;
using System.Text;
using LouBarbershop.Application.PublicBooking;

namespace LouBarbershop.Infrastructure.Security;

public sealed class PublicManagementTokenService : IPublicManagementTokenService
{
    private const int TokenBytes = 32;

    public ManagementToken Issue()
    {
        var plainText = ToBase64Url(RandomNumberGenerator.GetBytes(TokenBytes));
        return new ManagementToken(plainText, ComputeHash(plainText));
    }

    public string? Hash(string? plainText)
    {
        if (string.IsNullOrWhiteSpace(plainText) || plainText.Length != 43 || plainText.Any(x => !char.IsAsciiLetterOrDigit(x) && x is not '-' and not '_'))
            return null;
        try
        {
            var padded = plainText.Replace('-', '+').Replace('_', '/') + "=";
            if (Convert.FromBase64String(padded).Length != TokenBytes) return null;
        }
        catch (FormatException)
        {
            return null;
        }
        return ComputeHash(plainText);
    }

    private static string ComputeHash(string value) => Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    private static string ToBase64Url(byte[] bytes) => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
