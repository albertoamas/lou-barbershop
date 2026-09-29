# Excepción única — trabajo local de Fase 2 antes de G1

**Fecha:** 1 de septiembre de 2026  
**Estado de G1:** `ACCEPTANCE`; CI remoto y ejecución local verificados, staging e instalación manual pendientes.

## Decisión

El dueño del producto autorizó iniciar la Fase 2 exclusivamente en el entorno local antes de aprobar G1. Esta es una excepción única al orden de dependencias del plan maestro.

## Límites

- No se declara G1 como `DONE`.
- No se habilita despliegue en Railway ni ningún entorno externo.
- No se liberan funciones para operación real ni se cargan datos reales.
- Cada cambio de Fase 2 mantiene pruebas, migraciones y documentación actualizadas.
- Antes de cualquier fase posterior que dependa de G2, se revisarán G1 y G2 conforme a sus puertas de salida.

## Motivo

Mantener el avance de modelado y pruebas locales mientras la decisión de staging se aplaza, sin ocultar la deuda operativa pendiente.
