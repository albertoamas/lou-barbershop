# Datos ficticios y escenarios de aceptación

## 1. Propósito

Este conjunto permite desarrollar, demostrar y probar sin utilizar información real. Ningún nombre, teléfono, precio o porcentaje representa una condición vigente de Lou Barbershop.

Los seeds se separarán en:

- `Development/Demo`: dataset completo de este documento.
- `Test`: builders deterministas por escenario.
- `Production`: únicamente roles/categorías técnicas y proceso seguro para crear dueño; nunca personas o precios ficticios.

## 2. Identidades ficticias

| Código | Nombre visible | Roles | Tipo barbero | Usuario ficticio |
|---|---|---|---|---|
| STF-OWN | Alex Demo | OWNER, BARBER | OWNER | `owner.demo` |
| STF-ADM | Carla Demo | ADMIN | — | `admin.demo` |
| STF-B01 | Diego Demo | BARBER | CONTRACTOR | `barber.diego` |
| STF-B02 | Mateo Demo | BARBER | CONTRACTOR | `barber.mateo` |

Las contraseñas no se documentan. Desarrollo las recibe por Secret Manager/variables locales y producción crea su usuario por comando/proceso seguro.

## 3. Clientes ficticios

| Código | Nombre | Teléfono de prueba | Caso |
|---|---|---|---|
| CLI-001 | Ana Prueba | `+59170000001` | reserva normal |
| CLI-002 | Bruno Prueba | `+59170000002` | llegada directa |
| CLI-003 | Camila Prueba | `+59170000003` | cortesía |
| CLI-004 | Daniel Prueba | `+59170000004` | no-show |
| CLI-005 | Elena Prueba | `+59170000005` | pago mixto |
| CLI-006 | Familia Prueba A | `+59170000006` | teléfono compartido |
| CLI-007 | Familia Prueba B | `+59170000006` | advertencia, no bloqueo |

Los números pertenecen al rango reservado conceptualmente para pruebas internas; nunca se usan para enviar mensajes.

## 4. Servicios ficticios

| Código | Servicio | Duración referencia | Precio referencia |
|---|---|---:|---:|
| SRV-001 | Corte clásico demo | 45 min | 60,00 Bs |
| SRV-002 | Barba demo | 30 min | 35,00 Bs |
| SRV-003 | Corte y barba demo | 75 min | 90,00 Bs |
| SRV-004 | Diseño demo | 30 min | 30,00 Bs |

### Ofertas por barbero

| Barbero | Servicio | Duración | Precio | Propósito de prueba |
|---|---|---:|---:|---|
| Alex | Corte clásico | 45 min | 70,00 Bs | dueño con precio distinto |
| Diego | Corte clásico | 45 min | 50,00 Bs | contratado |
| Mateo | Corte clásico | 60 min | 55,00 Bs | duración por barbero |
| Diego | Barba | 30 min | 35,00 Bs | segundo servicio |
| Mateo | Corte y barba | 75 min | 90,00 Bs | oferta no universal |

Son valores sintéticos inspirados en los ejemplos del análisis, no tarifas aprobadas.

## 5. Comisiones ficticias

| Barbero | Tipo | Vigencia | Tasa |
|---|---|---|---:|
| Diego | SERVICE | 2026-01-01 a 2026-09-15 | 50,00 % |
| Diego | SERVICE | desde 2026-09-16 | 55,00 % |
| Diego | PRODUCT | desde 2026-01-01 | 10,00 % |
| Mateo | SERVICE | desde 2026-01-01 | 45,00 % |
| Mateo | PRODUCT | desde 2026-01-01 | 8,00 % |

Alex no tiene reglas de comisión. El cambio de Diego prueba preservación histórica.

## 6. Horarios ficticios

- Alex: lunes–viernes 09:00–13:00 y 15:00–19:00.
- Diego: martes–sábado 10:00–14:00 y 15:00–19:00.
- Mateo: lunes, miércoles y viernes 09:00–17:00.
- Excepción: Diego no disponible 2026-09-10 15:00–17:00.
- Excepción: Mateo disponible adicionalmente 2026-09-12 09:00–12:00.

## 7. Productos ficticios

| Código | Producto | Marca | Costo inicial | Venta | Stock inicial | Mínimo |
|---|---|---|---:|---:|---:|---:|
| PRD-001 | Gel demo 100 ml | Marca Demo A | 20,00 Bs | 35,00 Bs | 5 | 2 |
| PRD-002 | Cera demo 80 g | Marca Demo B | 28,00 Bs | 45,00 Bs | 3 | 1 |
| PRD-003 | Shampoo demo | Marca Demo A | 32,00 Bs | 55,00 Bs | 1 | 1 |

Recepción adicional para costo promedio: 5 unidades de PRD-001 a 22,00 Bs.

## 8. Gastos ficticios

| Fecha | Categoría | Concepto | Medio | Importe |
|---|---|---|---|---:|
| 2026-09-01 | Limpieza | Material demo | CASH | 40,00 Bs |
| 2026-09-02 | Servicios básicos | Internet demo | QR | 180,00 Bs |
| 2026-09-03 | Mantenimiento | Ajuste herramienta demo | CASH | 75,00 Bs |

## 9. Escenarios deterministas

### ESC-001 — Doble reserva

Dos solicitudes intentan reservar a Diego el 2026-09-08 10:00 para corte de 45 minutos. Exactamente una confirma; la otra recibe `SLOT_TAKEN`.

### ESC-002 — Cambio de servicio

Ana reserva corte con Diego por 50 Bs. En atención agrega barba de 35 Bs. La cita conserva lo informado y la operación registra 85 Bs reales.

### ESC-003 — Pago mixto

Elena debe 70 Bs y paga 30 Bs CASH + 40 Bs QR. Se crean dos componentes y un único cierre.

### ESC-004 — Cortesía de contratado

Camila recibe corte de Diego, precio 50 Bs, cortesía total autorizada. Cliente paga cero; comisión usa base 50 Bs y tasa vigente.

### ESC-005 — Dueño barbero

Alex realiza corte de 70 Bs. Aparece en producción y cobro, pero no crea comisión.

### ESC-006 — Última unidad

Dos ventas intentan consumir la única unidad de PRD-003. Una cierra; otra recibe `OUT_OF_STOCK` sin pago ni salida parcial.

### ESC-007 — Cambio de tasa

Una operación de Diego del 15 de septiembre usa 50 %; otra del 16 usa 55 %. Cambiar la regla no recalcula la primera.

### ESC-008 — Reverso posterior

Una comisión ya pagada se origina en operación revertida. La liquidación permanece; se crea ajuste negativo para la siguiente.

### ESC-009 — Costo promedio

PRD-001 tiene 5 unidades a 20 Bs y recibe 5 a 22 Bs. El promedio pasa a 21 Bs; una venta conserva ese costo asignado.

### ESC-010 — Teléfono compartido

Se busca `+59170000006`; aparecen dos clientes y administración elige la persona correcta. No se fusionan automáticamente.

## 10. Reglas para tests

- Reloj e IDs inyectables y deterministas.
- Cada test crea solo los datos necesarios.
- No depender del orden de ejecución.
- Instantes UTC con presentación America/La_Paz.
- Builders expresan intención (`AConfirmedAppointment`, `APaidCourtesyOperation`).
- No reutilizar la base de desarrollo para integración automatizada.

