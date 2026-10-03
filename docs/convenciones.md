# Convenciones de trabajo y código

## 1. Lenguaje

- Código, nombres técnicos, commits y contratos: inglés.
- Interfaz y mensajes al usuario: español claro.
- Documentación de negocio: español; ADR puede usar términos técnicos estándar.
- Conservar vocabulario: appointment/cita, operation/atención económica, commission/comisión y settlement/liquidación.

## 2. C# y backend

- .NET 10, nullable habilitado y warnings como errores.
- Namespaces file-scoped; un tipo público principal por archivo.
- Tipos `sealed` por defecto cuando no se diseñan para herencia.
- Records para contratos/valores inmutables; entidades con comportamiento y setters privados.
- `CancellationToken` en operaciones async de I/O; sufijo `Async` en implementaciones públicas asíncronas.
- Nunca `DateTime.Now`, `Guid.NewGuid()` o acceso al usuario dentro del dominio: usar puertos.
- Nunca `double`/`float` para dinero o tasas.
- No repositorio genérico universal, service locator, clase `Helper` o `Manager` sin responsabilidad concreta.
- Controllers sin lógica de negocio y sin `DbContext`.
- DTO HTTP, modelo EF y dominio son tipos diferentes cuando cruzar la frontera los acoplaría.
- Excepciones para fallos inesperados; resultados explícitos para conflicto, validación o estado inválido.
- Consultas con `AsNoTracking` cuando sean solo lectura; evitar N+1 y materialización temprana.

## 3. TypeScript y frontend

- `strict`, `noUncheckedIndexedAccess` y sin `any` salvo justificación localizada.
- Componentes pequeños con una responsabilidad y props explícitas.
- React solo en Presentation/Composition.
- TanStack Query administra estado remoto; no copiarlo globalmente sin razón.
- Zod valida contratos/bordes, no reemplaza reglas del servidor.
- Formularios accesibles con etiquetas, mensajes asociados y teclado adecuado.
- Ningún token sensible en localStorage/sessionStorage.
- Estados loading/empty/error/offline/update para cada flujo remoto.
- Un componente no llama `fetch` directamente; usa un puerto/cliente del adaptador.
- Storybook documenta estados reutilizables, no páginas ficticias sin consumidor.

## 4. API

- Prefijo `/api/v1` y rutas sustantivas estables.
- JSON camelCase, fechas ISO 8601 e importes en centavos.
- `ProblemDetails` con `code`, mensaje seguro y `requestId`.
- Códigos HTTP explícitos; no devolver 200 para errores.
- DTOs de entrada no aceptan precios, tasas, permisos o totales autoritativos.
- Mutaciones críticas idempotentes donde un reintento pueda duplicar efecto.
- OpenAPI actualizado en el mismo cambio.

## 5. Datos y migraciones

- Nombres SQL snake_case y restricciones con nombres descriptivos.
- Toda migración tiene camino de upgrade probado; producción no aplica cambios destructivos automáticamente al arrancar réplicas.
- Dinero `BIGINT` en centavos, tasa en puntos base e instantes `TIMESTAMPTZ`.
- No borrar historial económico; usar estados/reversos/ajustes.
- Índices se justifican por consultas o restricciones reales.
- JSONB solo para snapshots/auditoría, no para evitar modelado relacional.

## 6. Pruebas

- Nombre describe condición y resultado.
- Arrange/Act/Assert visible sin duplicación excesiva.
- Domain/Application: unitarias puras.
- Persistencia/concurrencia: PostgreSQL real con Testcontainers.
- API: `WebApplicationFactory` y cliente HTTP.
- UI: Testing Library orientada a comportamiento.
- Flujos: Playwright con selectores por rol/nombre accesible, no clases CSS.
- Un bug corregido añade una prueba que fallaba antes.

## 7. Git y revisión

- Conventional Commits: `feat`, `fix`, `test`, `docs`, `refactor`, `build`, `ci`, `chore`.
- Scopes sugeridos: `agenda`, `sales`, `inventory`, `commissions`, `auth`, `pwa`, `infra`.
- Una intención principal por commit/PR.
- PR incluye: propósito, alcance, riesgos, migración, pruebas y capturas si cambia UI.
- No mezclar refactor masivo con función nueva salvo dependencia necesaria.
- No omitir CI ni bajar reglas para hacer pasar un cambio.

## 8. Revisión obligatoria

- Regla/criterio satisfecho.
- Dependencias apuntan hacia dentro.
- Permisos probados en servidor.
- Dinero/tiempo/concurrencia correctos.
- Transacción y efecto parcial considerados.
- Historial y auditoría preservados.
- Error y mala conexión resueltos.
- Accesibilidad y dispositivo móvil verificados.
- Documentación y OpenAPI sincronizados.

