namespace LouBarbershop.Infrastructure.DemoData;

/// <summary>
/// Small deterministic generator (xorshift64*) so the same seed always produces the
/// same demo data. Not for security purposes.
/// </summary>
public sealed class DemoRandom(ulong seed)
{
    private ulong state = seed == 0 ? 0x9E3779B97F4A7C15UL : seed;

    public ulong NextUInt64()
    {
        state ^= state >> 12;
        state ^= state << 25;
        state ^= state >> 27;
        return state * 0x2545F4914F6CDD1DUL;
    }

    /// <summary>Returns an integer in [0, maxExclusive).</summary>
    public int Next(int maxExclusive)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(maxExclusive);
        return (int)(NextUInt64() % (ulong)maxExclusive);
    }

    /// <summary>Returns true with the given probability expressed in percent.</summary>
    public bool Chance(int percent) => Next(100) < percent;

    public T Pick<T>(IReadOnlyList<T> items) => items[Next(items.Count)];
}
