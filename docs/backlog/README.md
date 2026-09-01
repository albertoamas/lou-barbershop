# Backlog importable

`backlog-mvp.csv` contiene el baseline del backlog para importarlo a un gestor de trabajo.

## Columnas

- `id`: identificador estable.
- `type`: `technical`, `functional` u `operations`.
- `epic`: agrupación principal.
- `title`: nombre resumido.
- `priority`: P0, P1 o P2.
- `phase`: fase de aceptación.
- `size`: S, M, L o XL.
- `status`: estado inicial.
- `depends_on`: IDs o puerta necesaria separados por `;`.
- `acceptance_gate`: puerta donde debe quedar aceptado.
- `source`: documento fuente.

Al importar, no sustituir los identificadores por números automáticos sin conservar `id` como campo o etiqueta.

