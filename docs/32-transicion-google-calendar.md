# Transición de Google Calendar a la agenda de Lou

**Estado:** guía preparada; no ejecutada. No se importaron eventos ni se modificó Calendar.

## Antes del cambio

1. Dueño y administración acuerdan el día de corte y quién verificará las citas.
2. Validar cuentas, barberos activos, servicios, precios/duraciones y horarios en Lou.
3. Completar la simulación de G6: buscar/crear cliente, reservar, reprogramar, cancelar, marcar inasistencia y registrar llegada/inicio con cuenta de barbero.
4. Exportar una copia de Calendar y conservarla fuera del repositorio, con acceso restringido. Preparar backup/restauración de Lou según la fase de operación, antes de cualquier migración real.

## Conciliación de futuras reservas

- Listar solo citas futuras relevantes: fecha/hora, persona, teléfono, barbero y servicio.
- Resolver manualmente eventos ambiguos o sin teléfono. No inventar clientes, duración, servicio o barbero para conseguir una importación.
- Buscar cliente por nombre/teléfono en Lou; un teléfono compartido no identifica de forma única a la persona.
- Registrar cada cita con disponibilidad válida y comprobar horario, zona `America/La_Paz`, precio informado y duración.
- Si el precio acordado históricamente difiere del vigente, detener esa cita para revisión: esta fase no incluye importador ni edición libre de snapshots.
- Comparar cantidad y detalle por día/barbero; mantener una lista de pendientes fuera del repositorio sin exponer datos personales.

## Día de corte (requiere autorización posterior)

- Un solo sistema recibe cambios: Lou. Calendar queda como referencia de solo lectura acordada por el equipo, no sincronización bidireccional.
- Administración confirma quién atiende nuevas reservas y comunica el cambio al equipo.
- Cualquier corrección se registra en Lou con motivo; no duplicarla editando Calendar.
- Durante el piloto, comparar el inicio y el final de cada jornada y documentar diferencias.

## Contingencia

Si Lou no está disponible, no confirmar horarios apoyándose solo en una pantalla sin conexión. Administración centraliza solicitudes pendientes de confirmación y comprueba disponibilidad al recuperar servicio. No hay cola offline de reservas. Un retorno temporal a Calendar requiere decisión del dueño, corte horario explícito y conciliación previa a retomar Lou; nunca dos fuentes editables simultáneas.

## Lista de salida

- [ ] G6 aprobada y roles capacitados.
- [ ] Backup y restauración verificados.
- [ ] Citas futuras conciliadas, sin dudas pendientes.
- [ ] Responsable y fecha de corte aprobados.
- [ ] Fuente única comunicada.
- [ ] Plan de contingencia entendido.

La migración operativa y el piloto continúan en Fase 13. Preparar esta guía no autoriza ni ejecuta ese cambio.
