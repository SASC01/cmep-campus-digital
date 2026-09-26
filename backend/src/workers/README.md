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
