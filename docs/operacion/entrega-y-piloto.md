# Checklist de entrega al cliente y piloto

Este documento separa lo ya terminado de las decisiones que requieren al dueño, la barbería o el proveedor. No introducir datos reales antes de completar la sección de preproducción.

## 1. Preparación técnica en staging

- [ ] Crear proyecto Railway/staging y base PostgreSQL administrada.
- [ ] Configurar dominio, HTTPS y `AllowedHosts` exacto.
- [ ] Mantener API/DB privadas; documentar proxy y declarar sólo sus IP/redes conocidas.
- [ ] Crear contraseña y usuario OWNER nuevos mediante variables efímeras.
- [ ] Activar `Security__RequireOwnerMfa=true`, registrar TOTP y guardar recovery codes fuera del equipo.
- [ ] Persistir Data Protection y proteger las claves con certificado.
- [ ] Crear rol de migración con DDL y rol runtime con DML; probar que runtime no modifica esquema.
- [ ] Configurar enlaces sociales oficiales en el build; dejar ausentes los no confirmados.
- [ ] Ejecutar migrador una vez y comprobar que API/web quedan saludables.

## 2. Recuperación y observabilidad

- [ ] Programar backup diario cifrado fuera de Railway.
- [ ] Alertar si el backup falla o supera la antigüedad acordada.
- [ ] Restaurar una copia de staging en una base aislada y guardar la evidencia.
- [ ] Configurar Sentry/OTLP sin PII y enviar un error controlado de prueba.
- [ ] Crear alertas de indisponibilidad, errores 5xx, latencia y fallo de migración/job.
- [ ] Ensayar rollback de web/API sin revertir destructivamente la base.

## 3. Datos y decisiones del negocio

- [ ] Confirmar servicios, precios, duraciones, ofertas por barbero y comisiones reales.
- [ ] Confirmar horarios, descansos, excepciones y responsables.
- [ ] Contar inventario físico y acordar saldos iniciales.
- [ ] Revisar usuarios y aplicar mínimo privilegio; retirar cuentas demo.
- [ ] Aprobar aviso de privacidad, retención, canal de solicitudes y responsables.
- [ ] Confirmar Facebook, Instagram, TikTok y número WhatsApp oficiales.

## 4. Prueba humana

- [ ] Cliente reserva, copia/recibe su enlace, reprograma y cancela sin explicación.
- [ ] Administración crea cita, registra llegada, cobra CASH/QR/mixto y resuelve conflicto.
- [ ] Barbero consulta su día, abre atención propia y revisa su comisión sin ver datos ajenos.
- [ ] Dueño configura, revierte una operación, liquida comisión y reconcilia reporte.
- [ ] Instalar y actualizar PWA en Android, iOS y tablet; verificar offline seguro.
- [ ] Validar navegación por teclado, zoom y lector de pantalla básico.

## 5. Piloto y aceptación

- [ ] Definir fecha de corte, responsable técnico y responsable del negocio.
- [ ] Ejecutar dos ensayos de carga/migración y reconciliar resultados.
- [ ] Operar piloto 3–5 días con revisión diaria de citas, caja, inventario y comisiones.
- [ ] Registrar incidencias por severidad y corregir críticas antes del siguiente cierre.
- [ ] Verificar soporte, contingencia manual y recuperación de OWNER.
- [ ] Firmar G12 antes de datos definitivos y G13 cuando cada rol acepte la operación.

## Condición comercial honesta

La aplicación está lista para demostración y piloto técnico, no para prometer operación productiva sin configurar los servicios anteriores. Se entrega al cliente cuando el software, el entorno, los datos, la capacitación y la recuperación están aprobados en conjunto.
