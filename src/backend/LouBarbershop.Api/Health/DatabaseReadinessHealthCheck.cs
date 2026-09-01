using LouBarbershop.Infrastructure.Persistence;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace LouBarbershop.Api.Health;

public sealed partial class DatabaseReadinessHealthCheck(
    AppDbContext dbContext,
    ILogger<DatabaseReadinessHealthCheck> logger) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return await dbContext.Database.CanConnectAsync(cancellationToken)
                ? HealthCheckResult.Healthy("Database connection is available.")
                : HealthCheckResult.Unhealthy("Database connection is unavailable.");
        }
        catch (Exception exception)
        {
            LogDatabaseReadinessFailure(logger, exception);
            return HealthCheckResult.Unhealthy("Database connection is unavailable.");
        }
    }

    [LoggerMessage(EventId = 1001, Level = LogLevel.Warning, Message = "Database readiness check failed.")]
    private static partial void LogDatabaseReadinessFailure(ILogger logger, Exception exception);
}
