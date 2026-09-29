# Comprobación humana en navegador — AUTH-03

Lo registra el orquestador con el resultado que reportó el humano.

- **Fecha:** 2026-09-29.
- **Quién:** el humano, en su equipo, con la API, el worker y la SPA en local (`npm run dev` en `backend/` y en `frontend/`, `npm run dev:worker` en `backend/`, `docker compose up -d` en `infra/`).
- **Hoja:** la versión final del manager, en `revision.md`, "Revisión final — AUTH-03c". Tiene 6 puntos y dura como máximo 10 minutos (`AGENTS.md`, "Trabajo visual").
- **Base:** el árbol de trabajo de 03c antes de su commit, con el cambio del carril trivial (singular del cupo) ya aplicado.

| Punto | Qué comprueba | Resultado |
|---|---|---|
| H-1 | El cambio obligatorio después de un restablecimiento pide solo la contraseña nueva y su confirmación, y lleva al inicio del estudiante. Es el único punto que prueba la cookie de refresco real (B-03). | Bien. El humano comprobó también el caso con una segunda pestaña |
| H-2 | La invitación individual muestra el nombre en `/establecer-contrasena`, el nombre se puede corregir y la barra superior muestra el nombre corregido | Bien |
| H-3 | El enlace de registro se genera y se copia, sirve para registrarse en una ventana privada y la lista muestra al registrado. Revocado, deja de ser válido | Bien |
| H-4 | La invitación masiva con una lista mixta da 2 enviadas, 1 que ya tenía cuenta y 2 no válidas. Solo aparecen 2 correos, y la línea sin nombre usa el nombre provisional | Bien |
| H-5 | A 360 px, en `/admin/maestros`, la tabla se desplaza dentro de su contenedor, la barra inferior muestra "Cuentas" y "Maestros" y el panel de la masiva se lee completo | Bien |
| H-6 | En un solo navegador, el gestor de contraseñas sugiere una contraseña nueva en `/registro-maestro` y `/cambiar-contrasena`, y no rellena los formularios del admin. Con esto se cierra N-02 de AUTH-02b | Bien |

Lo demás queda "no verificado por decisión del humano, cubierto por pruebas automáticas". El contraste lo cubre `tokens.test.ts`.

Las cuentas `@pruebas.local` que se crearon durante la comprobación quedan en `campus_dev`.
