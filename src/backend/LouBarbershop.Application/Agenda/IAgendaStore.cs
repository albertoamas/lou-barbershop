using LouBarbershop.Domain.Appointments;
using LouBarbershop.Domain.Customers;

namespace LouBarbershop.Application.Agenda;

public interface IAgendaTransaction : IAsyncDisposable
{
    Task CommitAsync(CancellationToken ct);
}

public interface IAgendaStore
{
    Task<IAgendaTransaction> BeginAsync(CancellationToken ct);
    Task<IReadOnlyCollection<Customer>> SearchCustomersAsync(string query, PhoneNumber? phone, CancellationToken ct);
    Task<Customer?> FindCustomerAsync(Guid id, CancellationToken ct);
    void Add(Customer customer);
    Task<Guid?> FindOwnBarberAsync(Guid userId, CancellationToken ct);
    Task<IReadOnlyCollection<AppointmentView>> ListAsync(DateTimeOffset startsAt, DateTimeOffset endsAt, Guid? barberId, CancellationToken ct);
    Task<Appointment?> FindAsync(Guid id, CancellationToken ct);
    Task<AppointmentView?> ReadAsync(Guid id, CancellationToken ct);
    void Add(Appointment appointment);
    void Add(AgendaEvent appointmentEvent);
    Task<IReadOnlyCollection<AgendaEvent>> HistoryAsync(Guid appointmentId, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}
