# Runbooks de operación y recuperación

## Principios

- Sólo el proxy web es público; API y PostgreSQL permanecen privados.
- No ejecutar migraciones desde cada réplica: el job `migrate` termina antes de iniciar API.
- No revertir historia económica ni migraciones destructivamente; volver a una imagen compatible o restaurar una copia verificada.
- Cada incidente registra hora, versión/SHA, `requestId`, decisión, resultado y responsable; nunca contraseñas, cookies, tokens ni teléfonos.

## Preflight de despliegue

1. CI verde: formato, build, pruebas, arquitectura, audit, imágenes y SBOM.
2. Imagen identificada por SHA/digest, no sólo por tag mutable.
3. Variables obligatorias desde secretos: conexión PostgreSQL, claves persistentes, dominio/hosts; DSN/OTLP si se habilitan.
4. `Security__RequireSecureCookies=true`, redirección HTTPS activa, `AllowedHosts` exacto y `Http__TrustForwardedHeaders=true` sólo si API es privada tras un único proxy.
5. Backup reciente verificado antes de migración; revisar si la migración es compatible con la versión anterior.
6. Ejecutar migración una vez, comprobar `/health/ready`, desplegar web/API y realizar smoke de login, agenda, cobro y reserva pública.
7. Observar errores/latencia durante 15 minutos; conservar versión anterior para rollback.

## API o web caídos

1. Consultar liveness y readiness por separado.
2. Correlacionar error por `requestId` y SHA; revisar JSON logs/Sentry sin habilitar cuerpo de petición.
3. Si liveness falla, reiniciar una réplica; si se repite, volver a la última imagen compatible.
4. Si web falla pero API está sana, restaurar sólo la imagen web anterior; el service worker pedirá actualizar sin interrumpir formularios.
5. Confirmar agenda/cobro y cerrar incidente con causa y acción preventiva.

## PostgreSQL no disponible

1. Liveness debe seguir 200 y readiness pasar a 503; detener temporalmente mutaciones.
2. Revisar estado, volumen, conexiones y cuota del proveedor. No inicializar una base nueva sobre el volumen afectado.
3. Recuperar servicio o restaurar el último backup en instancia aislada.
4. Comparar migraciones y huella de tablas críticas; cambiar conexión sólo después de validar.
5. Verificar cobros/idempotencia/auditoría recientes y documentar posible pérdida según RPO.

## Rollback de aplicación o migración

- Aplicación: desplegar la imagen anterior únicamente si el esquema nuevo sigue siendo compatible.
- Migración: preferir expandir/migrar/contraer. Una corrección usa migración compensatoria probada.
- Si el esquema/datos quedaron corruptos: detener escrituras, preservar evidencia, restaurar backup en nueva base y cambiar conexión. Nunca usar `database update 0`, `git reset --hard` ni borrar el volumen productivo.

Ensayar el cambio de imagen y retorno a la versión sana en un entorno desechable:

```powershell
.\deploy\verify-application-rollback.ps1
```

El script etiqueta las imágenes locales actuales como versión conocida, inicia el entorno aislado, sustituye web por un candidato deliberadamente inválido, verifica que no permanezca en ejecución y restaura la imagen sana. Al terminar elimina únicamente el proyecto, volumen y etiquetas temporales. Esto prueba la mecánica; antes de producción debe repetirse con los dos SHA reales y el esquema representativo.

## Usuario bloqueado o único OWNER inaccesible

1. Confirmar identidad fuera de la aplicación.
2. Para lockout temporal, esperar o desbloquear mediante procedimiento del proveedor/Identity autorizado.
3. Para recuperar OWNER, inyectar `BootstrapOwner__UserName` y `BootstrapOwner__Password` como secretos efímeros y ejecutar una sola vez `--recover-owner`.
4. Eliminar variables, comprobar roles `OWNER + BARBER`, iniciar sesión y rotar la contraseña.
5. Revisar auditoría y revocar accesos abandonados.

## Backup y ensayo de restauración

Crear una copia local explícita:

```powershell
New-Item -ItemType Directory -Force backups
.\deploy\backup.ps1 -OutputPath .\backups\lou-$(Get-Date -Format yyyyMMdd-HHmmss).dump
```

`backups/` está ignorado. El archivo contiene PII y economía: cifrarlo, limitar acceso y moverlo fuera del host. Nunca adjuntarlo al repositorio o a un ticket.

Ensayar T-018 sin tocar la base operativa:

```powershell
.\deploy\verify-backup-restore.ps1
```

El script genera un dump, inicia PostgreSQL temporal sobre `tmpfs`, restaura, compara una huella de migraciones/tablas críticas y elimina contenedor/archivo temporal. En producción: backup diario, alerta por antigüedad/error y ensayo mensual contra una copia del almacenamiento externo.

## Alertas mínimas

| Señal | Condición inicial | Acción |
|---|---|---|
| readiness | 2 fallos consecutivos | incidente DB/dependencia |
| 5xx | >1 % durante 5 min | revisar SHA/request IDs y rollback |
| latencia | p95 >2 s API habitual o >3 s disponibilidad | inspeccionar DB/CPU/trazas |
| login | pico de 401/429 | posible fuerza bruta o credencial rota |
| reserva pública | pico de 404/409/429 | abuso, enlace inválido o saturación |
| backup | error o antigüedad >26 h | bloquear despliegues y recuperar tarea |
| almacenamiento | >80 % | ampliar/depurar según retención aprobada |

Los umbrales se calibran con tráfico real; no se envían teléfonos, cuerpos, cookies ni tokens como etiquetas de métricas.

## Benchmark local aislado

```powershell
.\deploy\benchmark-100k.ps1
```

Restaura una copia en PostgreSQL temporal, añade 100.000 operaciones sintéticas distribuidas en cinco años, analiza tablas y mide una consulta anual agregada. No modifica la base operativa. Su resultado detecta regresiones de índices/consulta, pero no sustituye latencia end-to-end, concurrencia ni recursos equivalentes de staging.
