# Skills oficiales instaladas para el desarrollo

Las siguientes skills se instalaron mediante el instalador oficial desde el repositorio `openai/skills`. No fueron creadas ni copiadas manualmente.

| Skill | Uso previsto |
|---|---|
| `aspnet-core` | Implementación y revisión idiomática del backend ASP.NET Core |
| `playwright` | Pruebas E2E y verificación de flujos móviles de la PWA |
| `security-best-practices` | Revisión segura de backend, frontend, autenticación y configuración |
| `security-threat-model` | Modelo de amenazas de agenda, datos personales y operaciones económicas |
| `sentry` | Instrumentación y diagnóstico de errores sin acoplar el núcleo |

Ubicación de instalación del usuario: `%USERPROFILE%/.codex/skills/<nombre>`.

## Uso

Las skills están instaladas y disponibles. Se invocan cuando la tarea coincide con su alcance; no son dependencias del código ni se despliegan con la aplicación.

## Criterio de selección

Se instalaron solo capacidades oficiales directamente relacionadas con el stack y los riesgos del proyecto. No se instaló una skill frontend/PWA porque el catálogo oficial consultado no ofrecía una específica. El catálogo experimental tampoco estaba disponible en la ruta oficial al momento de la consulta.

## Regla para futuras skills

- Preferir el catálogo oficial o un repositorio explícitamente aprobado.
- Leer instrucciones antes de usar.
- No instalar skills redundantes o sin un caso de uso.
- Registrar por qué se instaló y qué permisos/herramientas utiliza.
- Las decisiones de arquitectura permanecen en `docs`; una skill ayuda a ejecutar, pero no se convierte en fuente de verdad del proyecto.
