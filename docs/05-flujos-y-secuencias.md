# Flujos y diagramas de secuencia

## 1. Contexto del sistema

```mermaid
flowchart LR
    Cliente[Cliente] -->|reserva pública o WhatsApp| App[Aplicación Lou Barbershop]
    Admin[Administración] -->|agenda, atención, cobro| App
    Barbero[Barbero] -->|agenda y operaciones propias| App
    Dueno[Dueño] -->|configura, autoriza, liquida y analiza| App
    App --> DB[(Base de datos)]
    Admin -. comunicación manual .-> WA[WhatsApp]
    App -. vista/sincronización posterior .-> GC[Google Calendar]
```

WhatsApp continúa como canal humano. Google Calendar no es fuente editable paralela en el MVP.

## 2. Reserva interna

```mermaid
sequenceDiagram
    actor C as Cliente
    participant A as Administración
    participant S as Aplicación
    participant DB as Base de datos

    C->>A: Consulta por WhatsApp o presencial
    A->>S: Selecciona servicio y preferencia
    S->>DB: Lee oferta, turnos, excepciones y citas
    DB-->>S: Intervalos ocupados y condiciones
    S-->>A: Horarios disponibles
    A-->>C: Presenta alternativas
    C->>A: Elige horario
    A->>S: Confirma cliente y horario
    S->>DB: Inicia transacción y bloquea/verifica intervalo
    alt Sigue disponible
        S->>DB: Crea cita + instantáneas + auditoría
        DB-->>S: Cita confirmada
        S-->>A: Resumen
        A-->>C: Confirmación por WhatsApp
    else Fue ocupado
        DB-->>S: Conflicto
        S-->>A: Pedir otro horario
    end
```

## 3. Reserva pública sin cuenta

```mermaid
sequenceDiagram
    actor C as Cliente
    participant W as Web pública
    participant S as Backend
    participant DB as Base de datos

    C->>W: Elige servicio, barbero/cualquiera y fecha
    W->>S: Solicita disponibilidad
    S->>DB: Calcula intervalos válidos
    DB-->>S: Alternativas
    S-->>W: Horarios
    C->>W: Selecciona, ingresa nombre y teléfono
    W->>S: Crear reserva
    S->>DB: Normaliza cliente y revalida transaccionalmente
    alt Disponible
        S->>DB: Crea cita y token hash de gestión
        S-->>W: Confirmación + enlace de gestión
    else Conflicto
        S-->>W: Horario tomado + nuevas alternativas
    end
```

El token en claro solo se entrega al crearlo; la base conserva su hash. No se utiliza el teléfono como autorización.

## 4. Atención reservada y cobro mixto

```mermaid
sequenceDiagram
    actor B as Barbero/Admin
    participant S as Aplicación
    participant DB as Base de datos

    B->>S: Marca llegada e inicia atención
    S->>DB: Crea atención DRAFT desde cita
    B->>S: Confirma servicios y añade productos
    S->>DB: Valida catálogo y existencia preliminar
    B->>S: Aplica trato autorizado si corresponde
    S-->>B: Total neto y desglose
    B->>S: Registra efectivo + QR
    S->>DB: Inicia transacción
    S->>DB: Bloquea operación e inventario
    S->>DB: Verifica total y existencias
    S->>DB: Guarda pagos
    S->>DB: Crea salidas de inventario
    S->>DB: Calcula/congela comisiones
    S->>DB: Marca operación PAID y cita COMPLETED
    DB-->>S: Commit
    S-->>B: Cobro confirmado
```

Si cualquier validación falla, se revierte toda la transacción: no puede existir pago sin comisión o salida de inventario correspondiente.

## 5. Llegada directa

```mermaid
flowchart TD
    A[Cliente llega sin reserva] --> B{¿Barbero disponible durante la duración?}
    B -- No --> C{¿Acepta esperar u otro barbero?}
    C -- No --> D[Se retira; sin atención]
    C -- Sí --> B
    B -- Sí --> E[Buscar o crear cliente]
    E --> F[Crear atención origen WALK_IN]
    F --> G[Registrar lo realizado]
    G --> H[Cobrar y cerrar]
```

Registrar que alguien se retiró sin atención queda fuera del MVP; podría añadirse después para medir demanda perdida.

## 6. Cortesía de servicio de barbero contratado

```mermaid
sequenceDiagram
    actor A as Dueño/Admin
    participant S as Aplicación
    participant DB as Base de datos

    A->>S: Selecciona detalle y cortesía total
    S->>A: Solicita motivo y confirmación
    A->>S: Confirma autorización
    S->>DB: Guarda precio referencia y cortesía
    S-->>A: Total cliente = 0
    A->>S: Cierra operación
    S->>DB: Genera comisión sobre precio antes de cortesía
    S->>DB: Marca PAID sin componente de pago
    S-->>A: Atención registrada y comisión pendiente
```

## 7. Liquidación

```mermaid
sequenceDiagram
    actor D as Dueño
    participant S as Aplicación
    participant DB as Base de datos

    D->>S: Selecciona barbero y fecha de corte
    S->>DB: Busca comisiones AVAILABLE con bloqueo lógico
    DB-->>S: Detalle y total
    S-->>D: Borrador de liquidación
    opt Existe corrección justificada
        D->>S: Añade ajuste y motivo
        S->>DB: Guarda ajuste auditado
    end
    D->>S: Cierra liquidación
    S->>DB: Vincula comisiones y cambia a SETTLED
    D->>S: Registra pago total y medio
    S->>DB: Transacción: liquidación/comisiones a PAID
    S-->>D: Comprobante interno
```

## 8. Reverso de operación pagada

```mermaid
flowchart TD
    A[Dueño solicita reverso] --> B[Mostrar servicios, pagos, inventario y comisiones]
    B --> C{¿Comisiones ya pagadas?}
    C -- No --> D[Anular comisiones disponibles]
    C -- Sí --> E[Crear ajuste negativo para próxima liquidación]
    D --> F[Crear movimientos inversos de inventario]
    E --> F
    F --> G[Registrar reverso de pago como efecto contable interno]
    G --> H[Marcar operación REVERSED y auditar]
```

La devolución efectiva de dinero al cliente no se automatiza en el MVP; el sistema deja constancia del reverso y el dueño gestiona la entrega.

## 9. Flujo diario recomendado

```mermaid
flowchart LR
    A[Inicio del día: revisar agenda y ausencias] --> B[Recibir reservas y llegadas]
    B --> C[Marcar llegada/iniciar atención]
    C --> D[Confirmar servicios/productos]
    D --> E[Cobrar y cerrar]
    E --> B
    E --> F[Fin del día: revisar atenciones y cobros]
    F --> G[Corregir pendientes antes de liquidaciones]
```

No se exige un cierre de caja formal en el MVP, pero el panel diario muestra efectivo y QR para comparación manual.

