# workers/

Consumidores de la cola (pg-boss). Un error se deja propagar para que pg-boss reintente (3 veces,
con espera exponencial) y después lo mande a la cola de fallidos; nunca se traga en silencio.

## `correo-de-cuenta.ts` y `index.ts` (AUTH-02)

`procesarCorreoDeCuenta` consume `CORREO_DE_CUENTA` (recuperación e invitación): decide si envía
(`decidirEnvioDeRecuperacion` para recuperación), prepara el token cuando falta
(`prepararTokenDeRecuperacion`, idempotente por id), construye el enlace y llama a
`adapters/notifier`. Un fallo transitorio del notifier se deja propagar (pg-boss reintenta según la
política de `CORREO_DE_CUENTA`: 3 reintentos, espera exponencial desde 30 s, y después la cola de
fallidos `CORREO_DE_CUENTA_FALLIDO`, sin reintentos). Un rechazo permanente se completa sin lanzar.

Las dos colas retienen sus trabajos 1 día (`retentionSeconds`/`deleteAfterSeconds`, N-02): un correo
pendiente más de un día se descarta sin enviarse.

`registrarConsumidores(deps, colas?)` registra el consumidor de `CORREO_DE_CUENTA` (`batchSize: 1`:
un correo a la vez) y el de su cola de fallidos, que solo registra `log.error` con el evento
`correo_de_cuenta_fallido` y completa. Las colas son un parámetro para que las pruebas usen colas
propias, sin competir por los trabajos de otros archivos.

En desarrollo y en pruebas, el canal es `registro`: cada correo queda como HTML en
`backend/tmp/correos/`, nunca se llama a Resend.

`src/worker.ts` es el arranque del proceso.

## Ritmo del worker (AUTH-03c, §D-C5)

`registrarConsumidores` envuelve el `notifier` que recibe con un ritmo mínimo de
`INTERVALO_MINIMO_ENTRE_CORREOS_MS` (250 ms, `core/correo/ritmo.ts`) entre dos intentos de envío a
Resend (que admite 10 peticiones por segundo por equipo). Antes de procesar cada trabajo espera lo
que falte desde el último intento que llegó al notifier, y **cuentan también los intentos que
lanzaron** (un 429 o un 5xx de Resend), no solo los que se enviaron o se rechazaron: el envoltorio
registra la marca de tiempo en un `finally` y no atrapa el error, que sigue propagándose para que
pg-boss reintente con su espera exponencial. Un trabajo omitido nunca llama al notifier y por eso no
cuenta. La espera va antes del trabajo siguiente, nunca después de enviar, para no alargar la
ventana de reenvío si el worker cae justo tras un envío exitoso. `esperar` es una inyección
explícita para las pruebas (`DependenciasCorreoDeCuentaConRitmo`); por defecto espera de verdad.
`workers/correo-de-cuenta.ts` no cambia: el ritmo vive solo en `workers/index.ts`.

## Colas de TAREAS-01b sin consumidor (TAREAS-01b, §D-5)

`TAREA_CREADA` y `RECORDATORIO_24H` los encola la API (`handlers/tareas/tareas.ts`) y esperan en la
cola, con la política de los avisos del muro, hasta que NOTIFICACIONES agregue sus consumidores. El
consumidor de ambas carga la tarea por id y termina sin avisar si ya no existe; el de
`RECORDATORIO_24H`, además, descarta un trabajo cuyo id ya no es `tareas.trabajo_id` (quedó viejo).

## Objetos del almacén (ADMIN-01b, §D-4 a §D-6)

`objetos.ts` consume `COPIAR_OBJETOS`, `BORRAR_OBJETOS` y `COPIAR_OBJETOS_FALLIDO`;
`registrarConsumidoresDeObjetos(deps, colas?)` se llama desde `src/worker.ts` después de
`registrarConsumidores` (que no cambia). Las colas son un parámetro para que las pruebas usen las
suyas.

- `COPIAR_OBJETOS` (M-03): una lectura (`leerCopiasPendientes`); en el ciclo solo el almacén
  (`copiar`, del lado del almacén); después, `terminarCopias` y `descartarCopias` en lote. Un error a
  mitad escribe lo ya hecho (`finally`) y se relanza para que pg-boss reintente; el reintento solo copia
  lo pendiente. Un original sin objeto deja la copia `descartado`.
- `BORRAR_OBJETOS`: borra las claves en lote; borrar una clave que no existe no falla. Sus trabajos
  nacen diferidos 10 min (N-09). `BORRAR_OBJETOS_FALLIDO` no tiene consumidor.
- `COPIAR_OBJETOS_FALLIDO` (N-02): lee los `archivoIds` de los datos del trabajo y descarta las copias
  que siguen en curso; registra `warn` con el `trabajoId` original. Datos fuera del esquema: `warn`.
- Sin `STORAGE_*` (fuera de production), cada trabajo falla con `ALMACEN_NO_CONFIGURADO` hasta su
  cola de fallidos.
