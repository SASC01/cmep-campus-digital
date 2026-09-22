# workers/

Consumidores de la cola (pg-boss). Un error se deja propagar para que pg-boss reintente (3 veces,
con espera exponencial) y después lo mande a la cola de fallidos; nunca se traga en silencio.

Vacía hasta el primer trabajo real. El arranque del proceso vive en `src/worker.ts`.
