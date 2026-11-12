# Resumen del programador — CHORE-04 · guardas de doble clic

Cada entrega del programador agrega su sección al final de este archivo, por partes (`cat >>`), sin reescribirlo.

## CHORE-04 — Implementación (2026-11-11)

Plan: `docs/trabajo/CHORE-04-guardas-de-doble-clic/plan.md` (651 líneas, SHA-256 `75e9179fc4c3bae39e1da38a323a254e4c547da8019ba4d2a9130f0f253e3e1c`, Enmiendas 1 a 3). Base `9b6953c`. Equipo conectado a la corriente (`Win32_Battery.BatteryStatus` = 2). La otra copia de trabajo no se usa (respuesta del humano por medio del orquestador); corrí una suite a la vez.

**Estado: pasos 2 a 11 hechos, con una PARADA parcial (P-1, abajo) sobre dos viñetas de pruebas requeridas: CH4-30 (c) y CH4-31 (c).** El resto del plan está implementado y en verde.

### Al arrancar
- C-1 presente: `frontend/src/lib/estatico-ch3-r2.ataque.test.ts` con SHA-256 `151dbd75f845cb2315fc2774e061404b9275e5dc4fde37801fabb4e88377fa0c` (comprobado con `sha256sum`). `git status --porcelain` solo mostraba ese `*.ataque` y los tres sin seguimiento de `docs/trabajo/`.
- No volví a correr el rojo de C-1 por separado: el tester lo dejó en `Tests  6 failed | 10 passed (16)`; tras el paso 3 queda en verde dentro de la suite del paso 10.

### PARADA P-1 (plan contradictorio con el código; la decide el arquitecto o el manager)
CH4-30 (c) y CH4-31 (c) piden: "Si la página falla, el botón sale de la espera y otro clic la vuelve a pedir". Con el código de hoy, que este encargo no toca, eso no puede pasar: cuando falla `fetchNextPage`, la consulta infinita queda en `isError` y la vista reemplaza la lista entera por su `MensajeError`, así que el botón «Ver más» ya no está:
- `features/clases/components/comentarios-de-publicacion.tsx`, `contenido()`: `if (comentarios.isError) return <MensajeError mensaje={mensajeDeErrorDeLista(…)} />`.
- `features/clases/components/panel-mis-clases.tsx`, `contenidoPanel`: `if (props.isError) return <MensajeError mensaje={props.errorMensaje} />`.

Comprobado en la corrida del rojo (paso 7): los tres casos fallaron con `TestingLibraryElementError: Unable to find role="button" and name "Ver más comentarios"` (o `"Ver más clases"`) después de que la página respondiera `500` dos veces (`retry: 1`). No escribí una aserción sustituta (sería improvisar el requisito) y **quité esos tres casos del archivo**; las demás viñetas de CH4-30 y CH4-31 sí están. Cambiar la conducta (conservar la lista y el botón tras el fallo de una página) sería tocar la renovación de las listas, fuera del alcance de §D-3. Toca al arquitecto decidir si la viñeta cambia (por ejemplo, "si la página falla, la lista se reemplaza por su mensaje y nada queda en espera") o si entra un cambio de conducta.

### Verificación (comando exacto y última línea)
- `npm run lint` (desde `frontend/`): exit 0; última línea `> tsc -b` (ESLint sin errores; Prettier "All matched files use Prettier code style!"). Antes, dos rondas: Prettier pidió formato en mis cuatro archivos nuevos (`npx prettier --write` sobre esos cuatro archivos solamente) y `tsc` marcó un tipo en `features/auth/guardas-ch4.test.tsx` (`exito` pasó a `() => Response`).
- `npx vitest run src/features/auth src/features/clases src/lib src/app src/components/layout`: `Test Files  200 passed (200)` · `Tests  4377 passed (4377)` (Duration 460.02s).
- `npm run build` y la suite completa: no los corrí (los corre el manager, según el encargo).
- `prisma validate`: n/a (no se toca el backend).

### Conteos
- `npx vitest list src/features/auth/guardas-ch4.test.tsx src/features/clases/guardas-ch4.test.tsx src/features/clases/ver-mas-y-orden-ch4.test.tsx src/lib/guardas-de-doble-clic-estatico.test.ts`, contado con `grep -a -c`: **202 casos** = 92 (`features/auth/guardas-ch4.test.tsx`) + 79 (`features/clases/guardas-ch4.test.tsx`) + 26 (`features/clases/ver-mas-y-orden-ch4.test.tsx`) + 5 (`lib/guardas-de-doble-clic-estatico.test.ts`).
- Por id (mismo listado, `grep -a -c "CH4-xx"`): CH4-01 2 (la regla y su control), CH4-02 1, CH4-03 1, CH4-04 1; CH4-10 14, CH4-11 14, CH4-12 7, CH4-13 7, CH4-14 36, CH4-15 6, CH4-16 7 (más 1 caso de precondición: 92); CH4-20 9, CH4-21 16, CH4-22 8, CH4-23 8, CH4-24 5, CH4-25 16, CH4-26 1, CH4-27 5, CH4-28 4, CH4-29 1, CH4-40 6 (79); CH4-30 2, CH4-31 6, CH4-32 2, CH4-33 1, CH4-34 2, CH4-35 1, CH4-36 6, CH4-37 3, CH4-38 1, CH4-39 2 (26).
- Llamadas a una mutación en producción (grep `\b\w+\.(mutate|mutateAsync)\(` sin `*.test.*`): 68 en 58 archivos, como el inventario del plan; CH4-01 exige al menos 60.

### Rojo primero
- **Paso 2, auth** (antes de tocar `features/auth`): `npx vitest run src/features/auth/guardas-ch4.test.tsx` → `Tests  8 failed | 84 passed (92)`. En rojo: CH4-10 (a) y (b) de `recuperar`, CH4-13 de `recuperar` y los cinco CH4-15 (marco de `/estudiante`, `/maestro`, `/admin`, `/acceso-restringido` y `/cambiar-contrasena`: `expected 2 to be 1`). En verde antes del cambio, contra lo que esperaba el plan: CH4-10 y CH4-13 de los otros seis formularios (login, los dos registros, restablecer, establecer y cambio obligatorio). Lo investigué con dos pruebas temporales (las borré y quedó comprobado con `ls`): en restablecer los dos `submit` llegan al manejador (`subs=2`), pero la caché de mutaciones solo construye una mutación; en recuperar, dos. Así que en esos seis el segundo `handleSubmit` del mismo `act` ya salía por su guarda `isPending`. Los seis ganchos tienen `mutationKey` y `gcTime: 0`, y `useRecuperar` no; no determiné el mecanismo exacto de la librería. La técnica de §D-1 reproduce "el mismo render" (recuperar y «Cerrar sesión» quedan en rojo), así que no lo traté como PA-7. Lo que fija la ref en esos seis formularios lo vigilan CH4-01, C-1 y CH3-C13.
- **Paso 2, clases**: escribí `features/clases/guardas-ch4.test.tsx` después de aplicar §D-2 en clases (ver "Desviaciones"). Para el rojo respaldé en el scratchpad los 11 archivos de producción de clases ya cambiados, los devolví a `9b6953c` con `git show`, corrí `npx vitest run src/features/clases/guardas-ch4.test.tsx` → `Tests  14 failed | 65 passed (79)` y los restauré (después: `79 passed`). En rojo: los ocho CH4-20 de dos clics, CH4-20 de dos `submit`, CH4-28 (c) "misma instancia, otra clase" y CH4-40 (a), (b) y los dos (b′)/(c). En verde en la base: CH4-21 a CH4-27, CH4-29, CH4-28 (a), (b) y la vuelta a A, y CH4-40 (d) y (e).
- **Paso 7, orden y «Ver más»** (con `types.ts` y `lib.ts` ya hechos; sin `data.ts`, `hooks.ts`, `trabajo-view.tsx` ni el paso 8): `npx vitest run src/features/clases/ver-mas-y-orden-ch4.test.tsx` → `Tests  15 failed | 14 passed (29)`. En rojo por la razón esperada: CH4-30 (b), las cuatro CH4-31 (b), las dos CH4-34, CH4-35 y CH4-37 (b) (`expected [] to have a length of 1`: B esperaba por A). En rojo por otra razón: CH4-30 (c) y CH4-31 (c) ×2, por P-1. Y tres CH4-36 con `500`, por un error de mi cálculo esperado (leía el estado del doble después del segundo `PUT`); los corregí con el orden fijo. Hoy el archivo tiene 26 casos (29 − 3 de P-1).

### Pruebas requeridas → archivo y título exacto
Los títulos con `%s` o `$x` son plantillas de `it.each`; las instancias concretas están en `npx vitest list`. Rutas relativas a `frontend/src/`.
- **CH4-01** → `lib/guardas-de-doble-clic-estatico.test.ts`: "CH4-01: toda llamada a una mutación tiene su guarda: una ref que el manejador toma y que se comprueba antes, en el mismo manejador o en el que lo llama" y "CH4-01 (control): la regla falla sin guarda, con la guarda después de tomar la ref y con la guarda de otra ref; pasa con la forma de §D-1, la de dos fases y la de §D-4 bis".
- **CH4-02** → mismo archivo: "CH4-02: ninguna mutación se llama desde una flecha en línea".
- **CH4-03** → mismo archivo: "CH4-03: los «Ver más» y los botones que piden una consulta no cancelan la petición en vuelo".
- **CH4-04** → mismo archivo: "CH4-04: ningún botón espera solo la página siguiente; isFetchingNextPage solo guarda efectos de foco".
- **CH4-10** → `features/auth/guardas-ch4.test.tsx`: "CH4-10 (a): %s, dos clics en el mismo render mandan una sola petición y el botón espera hasta la respuesta" y "CH4-10 (b): %s, dos submit en el mismo render mandan una sola petición, el segundo con defaultPrevented y el botón en espera" (7 formularios cada uno).
- **CH4-11** → mismo archivo: "CH4-11: %s con %s: un solo MensajeError, lo escrito se conserva, el botón sale de la espera y un clic más manda la segunda petición y llega al destino" (7 formularios × `500` y red).
- **CH4-12** → mismo archivo:
  - "CH4-12: $nombre, tras el 500, ir a $destinoDelEnlace y volver con el historial monta el formulario sin la frase; un envío válido manda una petición nueva" (login, registro de estudiante y recuperar);
  - "CH4-12: $nombre, el camino no existe: al volver con el historial, la pantalla es la del enlace inválido, sin el formulario" (restablecer, establecer y registro de maestro);
  - "CH4-12: cambio obligatorio, el camino no existe: ir a otra ruta devuelve a /cambiar-contrasena".

  Con el router real (`rutas`) y las `defaultOptions` de `app/providers.tsx`.
- **CH4-13** → mismo archivo: "CH4-13: %s, tras un 500, dos submit válidos en el mismo render mandan una sola petición; espera hasta la respuesta, sale con un solo MensajeError y un clic más manda la tercera" (las 7 entradas, que son los seis componentes con la línea de T-05).
- **CH4-14** → mismo archivo:
  - "CH4-14: %s con %s: un solo mensaje legible, lo escrito se conserva, el botón sale de la espera y un envío válido después manda otra petición" (por formulario: campo no pintado, solo espacios, vacío y prefijo con ruta; restablecer suma `nombre:`);
  - "CH4-14: %s, rechazo del servidor y después un envío que la validación local rechaza: un solo mensaje, el local, y ninguna petición nueva".

  **Casos existentes**, en `features/auth/formularios-ch3.test.tsx`:
  - las tres primeras propiedades: "CH3-C03: %s con %s («%s») da un solo MensajeError legible, sin toast ni ErrorDeCampo; lo escrito se conserva y el botón sale de la espera";
  - la secuencia servidor → local: "CH3-C10: %s, rechazo del servidor %s y después rechazo local (%s): solo el error local, sin petición; repetir el control corregido manda una petición nueva (F1 otra vez y luego el destino de siempre)".
- **CH4-15** → mismo archivo: "CH4-15: $nombre, dos clics en el mismo render mandan un solo POST /api/auth/logout y la pantalla termina en /login" (el marco de `/estudiante`, `/maestro` y `/admin`, `/acceso-restringido` y `/cambiar-contrasena`) y "CH4-15: cambio obligatorio, con el cambio de contraseña en vuelo, «Cerrar sesión» manda su petición (guardas independientes)".
- **CH4-16** → mismo archivo: "CH4-16: %s, un envío que la validación local rechaza, se corrige el campo y un solo clic manda la petición".
- **CH4-20** → `features/clases/guardas-ch4.test.tsx`: "CH4-20: %s, dos clics en el mismo render mandan una sola petición y el control espera hasta la respuesta" (8 controles) y "CH4-20: «Unirme a la clase», dos submit en el mismo render mandan una sola petición, el segundo con defaultPrevented".
- **CH4-21** → mismo archivo: "CH4-21: %s con %s, un solo aviso, el control sale de la espera y repetirlo manda la segunda petición" (8 controles × `500` y red).
- **CH4-22** → mismo archivo: "CH4-22: %s, tras el 500, pulsar la sección activa (otra location.key en la misma ruta) y repetir el control manda la segunda petición sin repetir el aviso viejo".
- **CH4-23** → mismo archivo: "CH4-23: %s, tras el 500, ir a otra sección y volver antes de que venza el staleTime y repetir el control manda la segunda petición".
- **CH4-24** → mismo archivo: "CH4-24: %s, «Cancelar», volver a pedir la acción y pulsar «Sí, …»: el botón está en espera y no sale otra petición; al responder, un solo aviso" (5 controles).
- **CH4-25** → mismo archivo: "CH4-25: %s con %s, el aviso de hoy (ninguno en «Sí, regenerar», uno en los demás) y, con el control montado, otro clic manda la petición" (8 controles × `403 ACCESO_RESTRINGIDO` y `401` sin refresco). En «Unirme a la clase» afirma además el campo sin marcar.
- **CH4-26** → mismo archivo: "CH4-26: con dos maestros y el retiro del primero en vuelo, «Sí, quitar» del segundo está en espera y su clic no manda nada".
- **CH4-27** → mismo archivo:
  - "CH4-27: con %s, un solo mensaje legible, lo escrito se conserva, el botón sale de la espera y un envío válido después manda otra petición" (campo no pintado, solo espacios, vacío y `codigo.0.x:`);
  - "CH4-27: rechazo del servidor y después un envío que la validación local rechaza: un solo mensaje, el local, y ninguna petición nueva".

  **Caso existente** de las tres primeras propiedades, en `features/clases/formularios-ch3.test.tsx` (formulario "unirse a una clase"):
  - "CH3-B07: $formulario.nombre con $nombre da un solo aviso legible, ningún ErrorDeCampo, conserva lo escrito y el botón sale de la espera";
  - "CH3-B07: $formulario.nombre con F2 en $campo.prefijo ($resto) marca el campo con el genérico, sin aviso, conserva lo escrito y el botón sale de la espera".
- **CH4-28** → mismo archivo:
  - "CH4-28 (a): dos clics en el mismo render mandan una sola petición y el botón espera hasta la respuesta";
  - "CH4-28 (b): tras un 500, un solo aviso y otro clic manda la segunda petición";
  - "CH4-28 (c): misma instancia, otra clase: B no espera por A, la respuesta de A solo renueva A y nada de B queda en espera";
  - "CH4-28 (c): volver a A por el historial con su restauración retenida: «Restaurar» de A espera y sale de la espera al soltarla".

  En (c), "la lista de A renovada" se afirma como `getQueryState(claveClaseDetalle(A)).isInvalidated` igual a `true`: estando en B, nadie observa el detalle de A, y `renovarTrasGestionar` lo invalida sin pedirlo.
- **CH4-29** → mismo archivo: "CH4-29: «Sí, quitar» de un maestro, con el retiro de A retenido, saltar a B y soltar: nada queda en espera en B y su «Sí, quitar» manda la petición de B".
- **CH4-40** → mismo archivo:
  - "CH4-40 (a): dos clics en «Sí, regenerar» en el mismo render mandan una sola petición y el botón espera hasta la respuesta";
  - "CH4-40 (b): la respuesta de A llega estando en B: B no tiene la confirmación abierta ni espera, conserva su código y regenerar en B manda el POST de B";
  - "CH4-40 (b′) y (c): con el foco en %s antes del salto, en B el foco queda en el título de B; al volver a A la confirmación no reaparece, el foco sigue en el título y «Sí, regenerar» reabierto espera sin mandar otro POST" (dos casos: el foco en «Sí, regenerar» y en «Cancelar»);
  - "CH4-40 (d): el POST de A falla estando en B: un solo aviso, nada en espera en B, B conserva su código; al volver a A la confirmación está cerrada y repetir manda el POST de A";
  - "CH4-40 (e): con el POST de A retenido, ir al inicio y soltar: un solo aviso, sin excepciones; al volver a A se ve el código nuevo y nada espera".
- **CH4-30** → `features/clases/ver-mas-y-orden-ch4.test.tsx`:
  - (a) "CH4-30 (a): dos clics en el mismo render piden una sola página";
  - (b) "CH4-30 (b): con la lista recargándose, el botón espera y su clic no pide página; al soltar la recarga, un clic pide la página con el cursor de la lista renovada";
  - **(c): no cubierta (P-1).**
- **CH4-31** → mismo archivo:
  - (a) "CH4-31 (a): $rol, dos clics en el mismo render piden una sola página";
  - (b) "CH4-31 (b): $rol, con la lista recargándose por invalidateQueries, el botón espera y su clic no pide página; al soltar, un clic pide la página con el cursor renovado";
  - (b) "CH4-31 (b): $rol, salir del inicio, marcar vieja la lista y volver con la recarga retenida: el inicio pinta la lista de la caché, el botón espera y su clic no pide página";
  - **(c): no cubierta (P-1).**

  Las de (a) y (b) corren para estudiante y para maestro.
- **CH4-32** → mismo archivo: "CH4-32: $rol, con la consulta en error y la nueva petición retenida, dos clics en el mismo render mandan un solo GET; al responder, la lista aparece".
- **CH4-33** → mismo archivo: "CH4-33: el tema y el control salen de las variables de un orden; cualquier otra forma da null".
- **CH4-34** → mismo archivo: "CH4-34: con el PUT en vuelo, %s: «Subir» de origen espera, ningún orden manda otro PUT; al soltar, nada espera, se ve el orden nuevo y el siguiente parte de él" (otra sección y vuelta; atrás y adelante del historial).
- **CH4-35** → mismo archivo: "CH4-35: con el PUT ya respondido y la recarga por sección retenida, ir a otra sección y volver: el control de origen espera y no manda otro PUT; al soltar la recarga, nada espera y el siguiente parte del orden nuevo" (los seis pasos de N-01, en orden y comentados).
- **CH4-36** → mismo archivo: "CH4-36: %s («%s») con la vista fuera; al volver nada espera, hay un solo aviso y el camino «%s» manda un PUT calculado con la lista renovada" (`409` y `500` × los tres caminos). El texto del `409` va en el doble y se busca en el aviso.
- **CH4-37** → mismo archivo:
  - "CH4-37 (a): con el PUT de A retenido, ir a B pasando por otra ruta: en B nada espera y su «Subir» manda el PUT de B";
  - "CH4-37 (b): misma instancia, de A a B por el historial con el PUT de A retenido: el foco va al encabezado de la vista, B no espera por A, la respuesta de A no escribe la lista de B y, de vuelta en A, su «Subir» manda un PUT nuevo";
  - "CH4-37 (c): volver a A con el PUT de A todavía retenido: el control de origen espera por la caché y no manda otro; al soltarlo sale de la espera y el siguiente «Subir» manda".
- **CH4-38** → mismo archivo: "CH4-38: «Bajar» de un tema y «Subir» de otro en el mismo render mandan un solo PUT".
- **CH4-39** → mismo archivo: "CH4-39: en %s, desde el clic hasta que todo sale de la espera, solo el control pulsado estuvo en espera" (en la vista que lanzó el orden y en la que se montó con él en vuelo; `MutationObserver` sobre `aria-busy`).
- **Regresión** → la suite de `src/features/auth src/features/clases src/lib src/app src/components/layout`: `Tests  4377 passed (4377)`.

### Expresiones de §D-5 (CH4-01 a CH4-04)
Son las del plan, sin aflojar ninguna; lo único que agregué es el detalle de implementación de cada punto.
- **Llamada:** `/\b(\w+)\.(mutate|mutateAsync)\(/g`.
- **Manejador:** `/^ {2}const (\w+) = (?:async )?\(/` (el último antes de la llamada).
- **Ref tomada:** `/\b(\w+Ref)\.current = (?!false\b|null\b)/g`, entre el manejador y la llamada.
- **Guarda:**
  - Forma de la línea: `^\s*if \(.*\b<ref>\.current\b.*\) return\s*$`.
  - Debe ir (a) entre el manejador y la línea que toma la ref, o (b) en otro manejador a dos espacios del mismo archivo, antes de su línea con `<Manejador>(`.
- **Comentarios:** `/\*…*/` se vacían conservando las líneas, para que el conteo de líneas no cambie; las líneas que empiezan con `//` se vacían.
- **Excepciones:** solo las dos del plan, con su comprobación en `formulario-tarea.tsx`.
- **Precondiciones:** las del plan.
- **CH4-03:** `fetchNextPage\([^)]*\)` debe ser exactamente `fetchNextPage({ cancelRefetch: false })`.

### O-E1-1 · Flechas en línea que llaman a un manejador asíncrono
`onOrdenar={(temaId, control) => void handleOrdenar(temaId, control)}` (`trabajo-view.tsx`), `onClick={() => void handleRestaurar()}` (`aviso-de-clase-archivada.tsx`) y `onClick={() => void handleRegenerar()}` (`codigo-de-clase.tsx`) son así a propósito. Esos manejadores son `async` (usan `mutateAsync` en `try/catch/finally`, §D-4 bis), y pasar una función que devuelve una promesa a un `onClick` lo marca `@typescript-eslint/no-misused-promises`. La flecha solo descarta la promesa con `void`: no llama a una mutación (CH4-02 lo comprueba en todo `src/`), y la guarda vive dentro del manejador con nombre.

### Hermanos y estados vecinos, por mecanismo
**1. La ref (punto 1 de "Puntos de ataque").** Remedio: la ref se comprueba al inicio del manejador y se toma justo antes de `mutate`.
- Se suelta en el `onSettled` del `mutate` en: los seis formularios de auth, los tres «Cerrar sesión», «Unirme a la clase», «Agregar a la clase», «Asignar a la clase», «Sí, quitar» de un maestro y de un alumno, «Sí, borrar comentario» y «Sí, borrar».
- Se suelta en el `finally` de `mutateAsync` en «Sí, regenerar», «Restaurar» y «Subir»/«Bajar».

Estado por estado (aplica y se aplicó en los 18 controles de mutación salvo donde digo lo contrario):
- **Dos clics, dos Enter o clic y Enter en el mismo render:** sí aplica. CH4-10, CH4-20, CH4-28 (a), CH4-38 y CH4-40 (a). El Enter llega como `submit`: CH4-10 (b) y CH4-20 en «Unirme».
- **Renders distintos con la petición en vuelo:** sí aplica. La guarda `isPending` y `enEspera` ya cubrían este estado; la ref también. CH3-C12 lo cubría en auth y CH4-24 lo cubre en clases.
- **Tras éxito con el componente montado:** sí aplica.
  - Recuperar pasa a la confirmación fija.
  - En regenerar, el `finally` cierra la confirmación y suelta la ref: CH4-40 (b) regenera en B después.
  - En agregar, el siguiente candidato manda: CH4-21 repite con éxito.
- **Tras `5xx` o red:** sí aplica: CH4-11 y CH4-21.
- **`409`:** sí aplica en el orden (CH4-36). En los demás controles, el `onSettled` corre igual que con cualquier error.
- **`400 VALIDACION`:** sí aplica: CH4-14 y CH4-27.
- **`503 SERVICIO_OCUPADO`:** sí aplica (es un error más, mismo `onSettled`). No tiene caso propio.
- **Los que redirigen (`401` sin refresco, `403 ACCESO_RESTRINGIDO`):** sí aplica. CH4-25: la ref se suelta y otro clic manda la petición.
  - `403 CAMBIO_DE_CONTRASENA_REQUERIDO`: mismo camino de error, sin caso propio.
  - «Cerrar sesión»: `logout` no rechaza.
- **Vista desmontada y respuesta después:** sí aplica. La ref muere con el componente y nada queda tomado. CH4-40 (e) y CH4-36 lo cubren sin excepciones ni avisos dobles.
- **Error previo y `reset()`:** sí aplica. La ref va antes de la línea de T-05 (CH4-13). «Unirme» no tiene `reset()`.
- **`sacarDeLaCacheAlAsentar` en el gancho:** sí aplica. El `onSettled` del `mutate` corre igual (CH4-11 repite en login, los dos registros, restablecer, establecer y cambio).
- **Confirmación cancelada y vuelta a abrir:** sí aplica: CH4-24 en los 5 controles. La ref vive en la fila o en el encabezado, que no se desmontan.
- **Volver a montar con la petición en vuelo:** solo «Subir»/«Bajar» (S-01): CH4-34 y CH4-35. «Restaurar» y «Sí, regenerar» también lo cubren por su clave, ahora con la clase.
- **Hermanos de control:**
  - Los 51 controles de otros módulos que ya tenían guarda: no se tocan. CH4-01 los verifica.
  - Las 17 llamadas sin guarda del inventario: todas resueltas.
  - Ningún hermano nuevo: CH4-01 da `[]` en todo `src/`.

**2. El segundo `submit` con la ref tomada (punto 2).** El remedio aplica en los 7 formularios (seis componentes) y en «Unirme». Se aplicó: `preventDefault()` queda antes de la guarda, y CH4-10 (b) y CH4-20 afirman `defaultPrevented`.

**3. Los "Ver más" y «Reintentar» (punto 3).**
- «Ver más comentarios», «Ver más clases» del estudiante y «Ver más clases» del maestro: `enEspera={isFetching}`. Se aplicó.
- «Reintentar» de la barra: `refetch({ cancelRefetch: false })`. Se aplicó.

Estados:
- **Dos clics en el mismo render:** CH4-30 (a), CH4-31 (a) y CH4-32.
- **Clic durante una recarga de fondo:** CH4-30 (b) y CH4-31 (b), los dos caminos.
- **Cursor de la lista renovada:** se afirma en CH4-30 (b) y CH4-31 (b).
- **Tras un error de la página:** P-1. La lista se reemplaza por su mensaje; ese estado no lo cambia este encargo.
- **Hermanos:**
  - Los otros 17 `fetchNextPage` ya llevaban `cancelRefetch: false` y su `enEspera` no lee `isFetchingNextPage` (CH4-03 y CH4-04).
  - `isFetchingNextPage` solo queda en los tres efectos de foco.
  - Los `refetch()` de pulsar la sección activa (H-2) no entran (S-04). CH4-03 solo mira los `refetch(` en la misma línea que `onClick=`.

**4. El orden de los temas (punto 4).** Remedio: `mutationKey` por clase, `useOrdenDeTemasEnVuelo` y la forma de §D-4 bis. Aplica solo a «Subir» y «Bajar» (`useOrdenarTemas` solo lo usa `trabajo-view.tsx`). Estados:
- **Salir y volver con el `PUT` en vuelo:** CH4-34, otra sección y también atrás y adelante del historial.
- **Con la recarga posterior en vuelo:** CH4-35.
- **El `PUT` falla con la vista fuera (`409` y `500`):** CH4-36, por los tres caminos.
- **Otra clase:** CH4-37 (a), (b) y (c).
- **Sin parpadeo:** CH4-39.
- **Dos controles en el mismo render:** CH4-38.
- **El orden siguiente parte de la lista renovada:** CH4-34, CH4-35 y CH4-36.
- **Con la clase archivándose a mitad:** no hay caso nuevo. El efecto de foco conserva su guarda de generación (`sigueVigente`), y las vigiladas `clase-archivada-01d1-*` siguen en verde en la suite.

**5. Cambio de un id de la ruta con el componente montado (punto 6).**
- «Subir»/«Bajar» y «Restaurar»: la ref y el estado guardan la clase y se sueltan en el `finally`. Se aplicó (CH4-37 y CH4-28 (c)).
- «Sí, regenerar»: se aplicó §D-4 ter, con la confirmación por clase y su cierre al cambiar de clase (CH4-40, (a) a (e)).
- «Sí, quitar» de un maestro: sin `mutationKey`, queda con la forma de §D-1. Su ref se suelta cuando A responde (CH4-29). H-3 queda con su destino.
- Estados vecinos:
  - A → B: B no espera.
  - B → A con la petición en vuelo: espera por la caché.
  - Fallo estando en B: un solo aviso (CH4-40 (d)).
  - Desmontaje: CH4-40 (e).
  - Foco tras el salto: al título de la clase (CH4-40 (b′)) y al encabezado de la vista en el trabajo (CH4-37 (b)).
  - La confirmación no reaparece al volver (CH4-40 (c)).
- Hermanos sin el mecanismo: las confirmaciones en filas con `key` (quitar un alumno, borrar un comentario, una publicación o un tema), como dice §D-4 ter; no se tocan.

### Matriz de avisos y recargas (§D-6)
Ningún gancho cambió su aviso ni su renovación (los únicos cambios en `hooks.ts` son la línea de `mutationKey` en `useRegenerarCodigo` y en `useOrdenarTemas`, la firma de la `mutationFn` del orden y los dos ganchos nuevos de lectura).

Columnas: qué se renueva · qué se anuncia (un solo aviso) · a dónde va el foco · cuándo se suelta la ref.

En todas las filas valen dos estados más, que no repito en cada una:
- **Segundo clic o envío en vuelo:** no sale ninguna petición, no hay aviso y el foco no cambia (la ref para el clic; el botón sigue en espera).
- **Con la vista desmontada:** la ref muere con el componente; el aviso y la renovación del gancho corren igual, una vez. Excepción: el aviso de «Unirme», que vive en el `mutate` y no corre (preexistente, anotado en el plan).

| Control | Éxito | `5xx` / red | `409` | `400 VALIDACION` | `401` sin refresco y `403 ACCESO_RESTRINGIDO` / `CAMBIO_DE_CONTRASENA_REQUERIDO` |
|---|---|---|---|---|---|
| Login, registro y registro de maestro | `/me` nuevo y navega a su destino · sin aviso · nueva pantalla · `onSettled` | nada · un `MensajeError` · se queda en el botón · `onSettled` | n/a (`CORREO_EN_USO` va como `MensajeError`) | nada · un `MensajeError` (CH3-C03) · se queda · `onSettled` | `MensajeError` un instante mientras `apiClient` redirige (O-r1-6) · ref libre |
| Recuperar | confirmación fija · `role=status` · en la página · `onSettled` | igual que la fila anterior | n/a | igual que la fila anterior | igual que la fila anterior |
| Restablecer y establecer | navega a `/login` con su aviso · `onSettled` | igual | `ENLACE_INVALIDO` → pantalla del enlace inválido | igual | igual |
| Cambio obligatorio | `/me` y su destino · `onSettled` | igual | `CAMBIO_NO_REQUERIDO` avanza | igual | igual |
| «Cerrar sesión» (marco, acceso restringido y cambio) | navega a `/login` y vacía la caché · sin aviso · `onSettled` | `logout` no rechaza: mismo camino | n/a | n/a | n/a |
| «Unirme a la clase» | listas de clases · `toast.success` · navega a la clase · `onSettled` | nada · un `toast.error` · se queda · `onSettled` | n/a | `codigo` → `ErrorDeCampo`; si no, un toast (CH4-27) | un toast y el campo sin marcar (CH4-25) |
| «Agregar a la clase» | personas · un `success` · fila del buscador · `onSettled` | un `toast.error` · `onSettled` | `CLASE_ARCHIVADA` marca el detalle viejo y un toast | un toast | un toast (CH4-25) |
| «Asignar a la clase» | maestros · un `success` · encabezado si el buscador se va · `onSettled` | un toast · `onSettled` | igual | un toast | un toast |
| «Sí, quitar» de un maestro | maestros · un `success` · al "Quitar" vecino o al encabezado · `onSettled` (uno para todas las filas) | un toast · `onSettled` | igual | un toast | un toast |
| «Sí, quitar» de un alumno | personas · un `success` · fila vecina (T-21) · `onSettled` | un toast | igual | un toast | un toast |
| «Sí, borrar comentario» | comentarios · un `success` · al "Borrar" vecino o al encabezado · `onSettled` | un toast | igual | un toast | un toast |
| «Sí, borrar» de una publicación | muro · un `success` · `onSettled` | un toast | igual | un toast | un toast |
| «Sí, regenerar» | escribe el código en la caché de **su** clase · un `success` · la confirmación se cierra (`finally`) · `finally` | "No pudimos regenerar el código. Inténtalo de nuevo." · `finally` | `CLASE_ARCHIVADA` → su texto y el detalle viejo | el mismo texto fijo | ningún aviso (CH4-25) · `finally` |
| «Restaurar» del aviso | detalle y listas de su clase · un `success` · `finally` | un toast · `finally` | cambio de la clase en gestión: renueva | un toast | ningún aviso · `finally` |
| «Subir»/«Bajar» | lista total y por sección · sin aviso · al mismo control (solo si el orden es de esta clase) · `finally` | un toast y renueva · `finally` | `ORDEN_DESACTUALIZADO`: el texto del servidor y renueva (CH4-36) | un toast | un toast · `finally` |
| «Ver más comentarios» / «Ver más clases» | la página siguiente; el foco a la primera fila nueva (`useFocoAlCargarMas`) | la lista se reemplaza por su `MensajeError` (P-1) | n/a | cursor → la frase "…cambiaron mientras los veías…" | la redirección de `apiClient` |
| «Reintentar» de la barra | la lista aparece; el foco lo maneja `useFocoDeLaLista` | el botón sigue con `errorUpdateCount` | n/a | n/a | lo mismo |

**Cambio de clase con la petición en vuelo** (misma instancia):
- «Subir»/«Bajar», «Restaurar» y «Sí, regenerar»:
  - la respuesta de A solo renueva A;
  - el aviso sale una vez;
  - B no espera;
  - la ref y el estado se sueltan en el `finally`;
  - el foco no lo mueve un orden de A (§D-4 bis).
- «Sí, quitar» de un maestro: la respuesta de A corre con las opciones de B (H-3, con destino); la ref se suelta en el `onSettled`.

### Archivos tocados contra `9b6953c`
`git status --porcelain`, solo el paquete `frontend/`: **33**, los 33 de §D-0.
- **Producción (26):**
  - `app/require-rol.tsx`
  - `components/layout/lista-de-clases.tsx`
  - en `features/auth/`: `acceso-restringido-view.tsx`; en `features/auth/components/`: `formulario-cambiar-contrasena.tsx`, `formulario-login.tsx`, `formulario-nueva-contrasena.tsx`, `formulario-recuperar.tsx`, `formulario-registro-maestro.tsx` y `formulario-registro.tsx`
  - en `features/clases/components/`: `aviso-de-clase-archivada.tsx`, `buscador-alumnos.tsx`, `buscador-de-maestros.tsx`, `codigo-de-clase.tsx`, `comentarios-de-publicacion.tsx`, `formulario-unirse-clase.tsx`, `panel-mis-clases.tsx`, `publicacion-del-muro.tsx` y `tabla-alumnos.tsx`
  - en `features/clases/`: `data.ts`, `hooks.ts`, `inicio-estudiante-view.tsx`, `inicio-maestro-view.tsx`, `lib.ts`, `maestros-de-clase-view.tsx`, `trabajo-view.tsx` y `types.ts`
- **Pruebas nuevas (4):**
  - `features/auth/guardas-ch4.test.tsx`
  - `features/clases/guardas-ch4.test.tsx`
  - `features/clases/ver-mas-y-orden-ch4.test.tsx`
  - `lib/guardas-de-doble-clic-estatico.test.ts`
- **Lista cerrada (2):**
  - `lib/errores-de-api-estatico.test.ts`: CH3-C13, exactamente como dice la lista.
  - `features/clases/formularios-ch3.test.tsx`: la línea 599, exactamente como dice la lista.
- **`*.ataque` (1):** `lib/estatico-ch3-r2.ataque.test.ts`, C-1 del tester, sin tocar por mí.

Fuera de los paquetes, `git status` también muestra ` M docs/ESTADO.md`: es del orquestador (aviso recibido durante el encargo), no lo toqué. Y muestra los tres sin seguimiento de `docs/trabajo/`, más esta sección del resumen.

Ningún archivo ganó ni perdió un `enEspera=`: lo comparé por archivo contra `9b6953c`, sin diferencias (PA-5).

### Desviaciones del plan
1. **P-1 (PARADA parcial):** CH4-30 (c) y CH4-31 (c) no están escritas (ver arriba).
2. **Orden del rojo:**
   - En auth, el rojo se corrió antes del cambio de producción, pero no en la misma corrida que el de clases.
   - En clases, escribí la prueba después de aplicar el paso 6 y corrí el rojo contra los 11 archivos devueltos temporalmente a `9b6953c` (y restaurados).

   La evidencia es la misma; el orden de los pasos 2 y 3, no.
3. **En el rojo de auth**, los CH4-10 y CH4-13 de seis formularios ya pasaban antes del cambio. Está explicado arriba; no lo traté como PA-7.
4. **Archivos temporales:** creé y borré dos veces `frontend/src/features/auth/tmp-exp.test.tsx`, para investigar el punto 3. No queda (comprobado con `ls`).
5. **Sin desviaciones en los demás pasos.** La única libertad que tomé es de forma: en `trabajo-view.tsx`, la expresión de §D-4 bis `ordenPropioDeEstaClase ?? ordenDeLaCache.ordenEnVuelo` vive en una constante `ordenEnVuelo` antes de pasarla a `SeccionDeTema`.

### Pendiente o fuera de alcance detectado
- **P-1:** decidir la viñeta (c) de CH4-30 y CH4-31.
- **El mecanismo de TanStack Query** por el que los seis formularios de auth con `mutationKey` y `gcTime: 0` ya no construían una segunda mutación en el mismo `act` (punto 3 de las desviaciones). No cambia nada del encargo.

## CHORE-04 — Corrección del resumen (M-01 y M-02) (2026-11-11)

**Base de esta ronda**
- Plan: `plan.md`, 667 líneas, SHA-256 `6f4eb38535bb4ef83aefba378be781aa91e66238c07879dbc0df59f91776e02d` (Enmienda 4).
- Lista exacta: `revision.md`, "## Verificación de la Enmienda 4 — CHORE-04 (2026-11-11)".
- Archivo tocado: solo `frontend/src/features/clases/ver-mas-y-orden-ch4.test.tsx`, más esta sección. Nada de producción, ninguna otra prueba y ningún `*.ataque`.
- **P-1 queda resuelta por la Enmienda 4.** Las aserciones de las (c) se cumplen con el código de hoy: no hay PARADA.

### Hallazgos
- **M-01, corregido:** se suman CH4-30 (c) y CH4-31 (c). La ayuda común `comprobarFalloDeLaPagina` afirma:
  - un solo `role="alert"`, con su texto;
  - que el «Ver más» ya no está;
  - que no hay ningún botón con `aria-busy="true"`.

  Después de esperar 1,5 s más (el reintento, con `retry: 1`, ya salió), el caso afirma exactamente 2 peticiones de página y que sigue habiendo un solo `alert`.
  - El texto esperado es `mensajeDeErrorDeLista(new ApiError("ERROR_INTERNO", "mensaje del servidor", 500), …)`. El segundo argumento es `TEXTOS_COMENTARIOS.cambioMientrasLosVeias` (comentarios) o `TEXTOS_PANEL.cambioMientrasLasVeias` (inicios).
  - En los inicios se cuentan solo las peticiones de `delInicio(api, true)`. Las de la barra (`limite=100`) no entran.
- **M-02, corregido:** en el segundo camino de CH4-31 (b), `servidor.clases` cambia a `[1, 4, 2, 3]` antes de soltar la recarga, y el caso afirma que la página pedida lleva `cursor` = `idClase(4)`, el de la lista renovada.
  - Quité la aserción de relleno `TEXTOS_CLASES_ANTERIORES.anteriores.titulo.length > 0` y su importación, que quedó sin uso.
  - El título ahora nombra el cursor renovado.

### Viñetas tocadas → archivo y título exacto
Las tres van en `features/clases/ver-mas-y-orden-ch4.test.tsx`.
- **CH4-30 (c):** "CH4-30 (c): si la página falla, salen sus dos peticiones y ninguna más, la lista se reemplaza por un solo MensajeError, «Ver más comentarios» ya no está y nada queda en espera".
- **CH4-31 (b), segundo camino:** "CH4-31 (b): $rol, salir del inicio, marcar vieja la lista y volver con la recarga retenida: el inicio pinta la lista de la caché, el botón espera y su clic no pide página; al soltar, un clic pide la página con el cursor renovado" (estudiante y maestro).
- **CH4-31 (c):** "CH4-31 (c): $rol, si la página falla, salen sus dos peticiones y ninguna más, la lista se reemplaza por un solo MensajeError del panel, «Ver más clases» ya no está y nada queda en espera" (estudiante y maestro).

### Verificación (desde `frontend/`, una corrida a la vez)
- `npx prettier --write src/features/clases/ver-mas-y-orden-ch4.test.tsx --ignore-path ../.prettierignore`: `(unchanged)`.
- `npx vitest run src/features/clases/ver-mas-y-orden-ch4.test.tsx`: `Tests  29 passed (29)`.
- `npm run lint`: exit 0; última línea `> tsc -b` (Prettier: "All matched files use Prettier code style!").
- `npx vitest run src/features/clases`: `Test Files  117 passed (117)` · `Tests  2521 passed (2521)`.
- No corrí la suite completa ni `build`.

### Conteos
Con `npx vitest list` de las cuatro pruebas nuevas, contado con `grep -a -c`:
- en total, **205** casos;
- `ver-mas-y-orden-ch4`: **29**;
- CH4-30: **3**;
- CH4-31: **8**.

Coinciden con lo que esperaba el manager: 92 + 79 + 29 + 5 = 205.

### Hermanos y estados vecinos
- **La (c) aplica a los tres «Ver más» de este encargo**, y en los tres se aplicó:
  - «Ver más comentarios», en CH4-30 (c);
  - «Ver más clases» del estudiante y del maestro, en CH4-31 (c).
- **Los demás «Ver más» de `src/`** no cambian y quedan fuera del encargo; CH4-03 y CH4-04 los vigilan.
- **El fallo por red** es un estado vecino: sigue el mismo camino de `isError` (`SIN_CONEXION` → `mensajeDeErrorDeLista`) y no tiene caso propio.
- **El cursor renovado de M-02** ya estaba en el primer camino de CH4-31 (b) y en CH4-30 (b). Ahora también está en el segundo camino de CH4-31 (b).

## CHORE-04 — Ronda tras el arbitraje de la ronda 1 (2026-11-11)

Hice la ronda siguiendo la lista exacta de `revision.md`, "## Arbitraje tras la ronda 1 — CHORE-04 (2026-11-11)", punto 5.4. Solo toqué `frontend/src/features/auth/guardas-ch4.test.tsx` y esta sección. Nada de producción, ninguna otra prueba y ningún `*.ataque`. No hubo PARADA.

### Declaración 1 (punto 1 del arbitraje, tal cual)
> Redundancia de la guarda con `isPending` en los formularios con `CampoContrasena`: login, registro de estudiante, registro de maestro, nueva contraseña (restablecer y establecer, un mismo componente) y cambio obligatorio (cinco componentes, seis configuraciones).
> - `CampoContrasena` (`campo-contrasena.tsx:55-66`) registra en su formulario un *listener* nativo de `submit` en captura, que corre `flushSync(() => setVisible(false))`. Toda vía al `handleSubmit` (el clic en el botón de envío, `requestSubmit` y el Enter) dispara ese `submit`.
> - `flushSync` vacía el render que dejó programado el envío anterior: `setErrores({})` crea un objeto nuevo y siempre programa uno. En ese render, `useMutation` ya lee la mutación pendiente, porque `MutationObserver` actualiza su resultado de forma síncrona dentro de `mutate`.
> - El segundo `handleSubmit` recibe el objeto nuevo, ve `isPending` en `true` y sale por esa guarda, antes de la ref.
>
> Por eso, con el componente real, la ref es redundante con `isPending` en esos formularios, y CH4-10 (a), CH4-10 (b) y CH4-13 de esas seis configuraciones (18 casos) no la vigilan: siguen en verde sin ella (medición del tester, ronda 1). La ref se conserva por la regla de `CLAUDE.md` (guarda síncrona con ref en toda mutación) y porque deja de ser redundante si `CampoContrasena` pierde ese `flushSync`.
> **La vigilan:**
> - ATQ-CH4-01 y ATQ-CH4-03 del tester, con un doble de `CampoContrasena` sin el `flushSync`; caen sin la guarda;
> - CH4-01, C-1 y CH3-C13, que fijan la línea y su lugar.
>
> En recuperar, que no tiene el campo, la guarda no es redundante, y CH4-10 (a), CH4-10 (b) y CH4-13 la vigilan.

(Esto explica también el verde que encontré en el rojo del paso 2, en mi sección de implementación: "CH4-10 y CH4-13 de los otros seis formularios ya pasaban antes del cambio".)

### Declaración 2 (punto 2 del arbitraje, tal cual)
> En «Restaurar», «Sí, regenerar» y «Subir»/«Bajar», la ref por clase es redundante con `sigueEnVuelo()` para el doble clic del mismo render: `queryClient.isMutating` lee la caché de forma síncrona, y `mutate`/`mutateAsync` dejan la mutación `pending` antes del primer `await`. Ninguna prueba de comportamiento la vigila (CH4-28 (a), CH4-20, CH4-40 (a) y CH4-38 siguen verdes sin ella; medición del tester, ronda 1). Se conserva por la regla de `CLAUDE.md` y por la forma única que exige CH4-01, que es lo que la vigila.

### Qué cambió en `features/auth/guardas-ch4.test.tsx`
- **Partición.** Cada uno de los tres `it.each` (CH4-10 (a), CH4-10 (b) y CH4-13) se parte en dos:
  - uno recorre solo `recuperar` (`SOLO_RECUPERAR`), con el título de antes, sin cambio;
  - el otro recorre las seis configuraciones con `CampoContrasena` (`CON_CAMPO_CONTRASENA`: `NOMBRES` sin `recuperar`), con el título nuevo del arbitraje.
- **Cuerpo de los casos.** Para que las dos partes corran el mismo cuerpo sin duplicarlo, lo moví tal cual a tres funciones con nombre: `casoCH410a`, `casoCH410b` y `casoCH413`.
  - No cambió ninguna línea ni ninguna aserción; solo la sangría, dos espacios menos.
  - Es la única libertad de forma de esta ronda.
- **Comentario.** Encima del `describe`, tres líneas con el mecanismo: el *listener* de `submit` en captura con `flushSync` de `CampoContrasena`.
- **Constancia del diff.** Guardé una copia del archivo antes de tocarlo. `git diff --no-index --stat <copia> frontend/src/features/auth/guardas-ch4.test.tsx` da `1 file changed, 86 insertions(+), 57 deletions(-)`. El diff completo solo trae:
  - el comentario;
  - las dos constantes de la partición;
  - las tres funciones con los cuerpos movidos;
  - los seis `it.each`, con sus títulos.

### Títulos (todos en `frontend/src/features/auth/guardas-ch4.test.tsx`)
**Sin cambio, solo con `recuperar`:**
- "CH4-10 (a): %s, dos clics en el mismo render mandan una sola petición y el botón espera hasta la respuesta"
- "CH4-10 (b): %s, dos submit en el mismo render mandan una sola petición, el segundo con defaultPrevented y el botón en espera"
- "CH4-13: %s, tras un 500, dos submit válidos en el mismo render mandan una sola petición; espera hasta la respuesta, sale con un solo MensajeError y un clic más manda la tercera"

**Nuevos, en las seis configuraciones con `CampoContrasena` (regresión):**
- "CH4-10 (a): %s, con el CampoContrasena real, dos clics en un solo act mandan una sola petición y el botón espera hasta la respuesta (regresión; el segundo envío ya ve isPending por el flushSync de CampoContrasena, y la guarda la vigilan ATQ-CH4-01, CH4-01 y C-1)"
- "CH4-10 (b): %s, con el CampoContrasena real, dos submit en un solo act mandan una sola petición, el segundo con defaultPrevented y el botón en espera (regresión; el segundo envío ya ve isPending por el flushSync de CampoContrasena, y la guarda la vigilan ATQ-CH4-01, CH4-01 y C-1)"
- "CH4-13: %s, con el CampoContrasena real, tras un 500, dos submit válidos en un solo act mandan una sola petición; espera hasta la respuesta, sale con un solo MensajeError y un clic más manda la tercera (regresión; la guarda la vigilan ATQ-CH4-03, CH4-01 y C-1)"

### Verificación (desde `frontend/`, una corrida a la vez)
- `npx prettier --write src/features/auth/guardas-ch4.test.tsx --ignore-path ../.prettierignore`: lo corrí solo sobre ese archivo.
- `npm run lint`: exit 0; última línea `> tsc -b` (Prettier: "All matched files use Prettier code style!").
- `npx vitest run src/features/auth`: `Test Files  21 passed (21)` · `Tests  898 passed (898)`.
- No corrí la suite completa ni `build`.

### Conteos
Salen de `npx vitest list` de las cuatro pruebas nuevas, contado con `grep -a -c`:
- **205** casos en total;
- **92** en `features/auth/guardas-ch4.test.tsx`;
- CH4-10: **14**;
- CH4-13: **7**;
- títulos con "con el CampoContrasena real": **18**;
- CH4-10 y CH4-13 de `recuperar`: **3**.

Coinciden con las cifras esperadas por el manager.
