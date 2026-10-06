using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;

namespace LouBarbershop.Infrastructure.Persistence;

public static class PostgreSqlOptions
{
    // The first migration ran before the "lou" schema existed, so the history table was
    // created in "public". Without pinning it, a database user named "lou" resolves
    // "$user" to the "lou" schema on later runs, EF finds no history there and replays
    // every migration against existing tables.
    public const string MigrationsHistorySchema = "public";

    public static DbContextOptionsBuilder UseLouPostgreSql(
        this DbContextOptionsBuilder builder,
        string connectionString) =>
        builder.UseNpgsql(
            connectionString,
            npgsql => npgsql
                .MigrationsAssembly(typeof(AppDbContext).Assembly.FullName)
                .MigrationsHistoryTable(HistoryRepository.DefaultTableName, MigrationsHistorySchema));
}
