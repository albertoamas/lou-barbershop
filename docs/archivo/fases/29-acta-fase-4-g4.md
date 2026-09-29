# Acta de Fase 4 y puerta G4 — R1

**Fecha:** 2 de septiembre de 2026  
**Estado:** `DONE`  
**Puerta:** G4 aprobada para iniciar Fase 5  
**Dependencia:** G3 aprobada; G1 conserva la excepción local por staging diferido

## 1. Resultado

El dueño ya puede configurar los maestros operativos de una sola sucursal: persona, perfil de barbero, tipo laboral, servicio, oferta específica, producto, condición de comisión y categoría de gasto. La solución separa identidad técnica de perfil humano y conserva cada condición histórica mediante vigencias y desactivación lógica.

La regla efectiva de un servicio se reproduce para cualquier fecha: una oferta activa del barbero prevalece sobre precio y duración de referencia sin modificar el servicio base. Sólo un contratado admite reglas `SERVICE` o `PRODUCT`; un dueño-barbero conserva su producción y nunca origina deuda de comisión.

## 2. Entregables

| Entregable | Resultado | Evidencia principal |
|---|---|---|
| ENT-04-01 Personal/barberos | Cuenta → perfil único → barbero único; OWNER/CONTRACTOR, frecuencia, color y estado | `StaffProfile`, `BarberProfile`, `StaffController`, `BarbersController` y PWA |
| ENT-04-02 Servicios/ofertas | referencia editable y oferta versionada por barbero/fecha; resolución efectiva | `Service`, `BarberServiceOffering`, `ConfigurationService` y endpoints `/services`/`offerings` |
| ENT-04-03 Productos | marca, SKU opcional único, precio, costo promedio inicial cero, stock mínimo y estado | `Product`, `ProductsController` y pantalla Productos |
| ENT-04-04 Comisiones | tipos SERVICE/PRODUCT, puntos base, sólo contratado y vigencias no solapadas | `CommissionRule`, restricciones PostgreSQL y prueba HTTP |
| ENT-04-05 Categorías de gasto | alta/edición/desactivación y cinco categorías iniciales no personales | `ExpenseCategory`, migración y pantalla Gastos |
| ENT-04-06 Contrato/pruebas | DTOs HTTP separados, enum como texto, ProblemDetails, concurrencia y suites | `docs/tecnica/08-api.md`, 51 pruebas backend y 7 frontend |

## 3. Criterios de aceptación

| Criterio | Estado | Demostración |
|---|---|---|
| AC-04-01 oferta específica prevalece sin cambiar base | Cumple | endpoint `offerings/effective` devuelve 7.000 centavos/60 min mientras el servicio conserva 6.000/45 |
| AC-04-02 desactivar conserva historia | Cumple | todos los maestros usan `active`; ofertas/tasas sólo se desactivan y sus filas permanecen |
| AC-04-03 tasas del mismo tipo no se solapan | Cumple | validación Application y `ex_commission_rules_no_overlap` en PostgreSQL; prueba de límite inclusivo devuelve 409 |
| AC-04-04 sólo contratado admite comisión | Cumple | intento de tasa para OWNER devuelve 409; contratado admite 5.000 puntos base |
| AC-04-05 cambios actuales no alteran instantáneas pasadas | Cumple | catálogos no participan como importes históricos; contratos de futuras operaciones conservan snapshots y las condiciones se versionan |
| AC-04-06 sólo dueño cambia precio/tasa | Cumple | política `manage-catalog` en cada mutación; BARBER autenticado recibe 403 en prueba HTTP |
| AC-04-07 carga, vacío, validación y desactivación móvil/tablet | Cumple | estados explícitos, formularios etiquetados, acciones online-only y Playwright 390×844/1024×768; sin overflow ni mensajes de consola |

## 4. Persistencia, concurrencia y auditoría

Las migraciones `20260902193625_AddPhaseFourMasterData` y `20260902203000_ProtectCommissionRuleHistory` crean y refuerzan:

- `staff_profiles`, `barber_profiles`, `services`, `barber_service_offerings`;
- `products`, `commission_rules`, `expense_categories`;
- claves foráneas restrictivas, SKU único opcional y control optimista mediante `xmin`;
- checks de importes, duración, stock mínimo, tasa, enums y período;
- exclusiones GiST por barbero/servicio activo y por todo el historial barbero/tipo para impedir solapamientos incluso tras desactivar o ante concurrencia;
- snapshots JSONB `before_data`/`after_data` en auditoría;
- categorías iniciales: Alquiler, Servicios básicos, Insumos, Mantenimiento y Otros.

Los conflictos optimistas, SKU duplicado y exclusiones concurrentes se traducen a `409 ProblemDetails` sin exponer SQL ni detalles internos. La auditoría registra actor, entidad, acción y valores anterior/posterior; no registra contraseñas, cookies ni tokens.

## 5. Superficie API y PWA

La API incorpora `/staff`, `/barbers`, `/services`, `/products`, `/expense-categories`, `/barbers/{id}/offerings` y `/barbers/{id}/commission-rules`. Los controladores sólo traducen DTOs y resultados; no acceden a `DbContext`. Application depende del puerto `IConfigurationStore` e Infrastructure aporta EF Core.

La ruta PWA `/configuration`, visible sólo para OWNER, ofrece cuatro secciones: Personal, Servicios y tasas, Productos y Gastos. La UI representa estados de carga, fallo, vacío, validación y confirmación; una pérdida de conectividad bloquea la escritura. La conversión de bolivianos ocurre en el borde y el contrato conserva centavos enteros.

La inspección autenticada utilizó datos visuales sintéticos interceptados exclusivamente en Playwright; no insertó personas, precios ni credenciales en la base local. El flujo API autenticado completo sí se probó por `WebApplicationFactory` contra una base PostgreSQL efímera.

## 6. Validación ejecutada

```text
.NET Release: 0 advertencias, 0 errores
Backend: 39 Domain + 1 Application + 2 arquitectura + 9 integración = 51/51
Frontend: format + ESLint/Oxlint + 7/7 pruebas + TypeScript/Vite/PWA build
PostgreSQL 18: migración desde cero y sobre volumen local; dos exclusiones verificadas
Compose: migrate exit 0; db/api/web healthy
Playwright: redirección anónima real; UI OWNER sintética 390×844 y 1024×768
Viewport móvil: scrollWidth 390 = clientWidth 390
Consola de UI autenticada: 0 errores, 0 advertencias
```

Evidencia visual local:

- `output/playwright/fase-4/configuration-mobile.png`
- `output/playwright/fase-4/services-tablet.png`

## 7. Decisión G4

G4 queda **aprobada**. El dueño puede configurar los maestros requeridos y reproducir qué oferta o tasa está vigente en una fecha. No se incorporaron datos reales ni secretos y el despliegue Railway continúa aplazado por la excepción ya registrada.

La próxima fase autorizada es **Fase 5 — Horarios y motor de disponibilidad**.
