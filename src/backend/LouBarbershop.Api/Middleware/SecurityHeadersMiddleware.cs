namespace LouBarbershop.Api.Middleware;

public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    private static readonly PathString PublicCatalogPath = new("/api/v1/public/catalog");
    private static readonly PathString PublicAvailabilityPath = new("/api/v1/public/availability");

    public async Task InvokeAsync(HttpContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers.TryAdd("X-Content-Type-Options", "nosniff");
            headers.TryAdd("X-Frame-Options", "DENY");
            headers.TryAdd("Referrer-Policy", "no-referrer");
            headers.TryAdd("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");

            if (IsSensitiveResponse(context.Request.Path))
            {
                headers.CacheControl = "no-store, max-age=0";
                headers.Pragma = "no-cache";
            }

            return Task.CompletedTask;
        });

        await next(context);
    }

    private static bool IsSensitiveResponse(PathString path) =>
        (path.StartsWithSegments("/api")
            && !path.StartsWithSegments(PublicCatalogPath)
            && !path.StartsWithSegments(PublicAvailabilityPath))
        || path.StartsWithSegments("/health");
}
