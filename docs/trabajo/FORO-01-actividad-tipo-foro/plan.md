# Plan — FORO-01 · actividad tipo foro
Estado: **LISTO** (Enmienda 9, final). Sin preguntas bloqueantes. El humano ya decidió DH-15 a DH-18, el complemento de DH-12 y N-19 (2026-11-14). Faltan la verificación del manager y la **aprobación escrita del humano** de este texto (carril sensible). *Antes (Enmienda 8):* "LISTO (Enmienda 8: atiende M-07 y M-08 de la verificación de la Enmienda 7, sin preguntas bloqueantes; pendiente de la verificación del manager y de la aprobación escrita del humano, con sus respuestas a DH-15 a DH-18)". *Antes (Enmienda 7):* "LISTO (Enmienda 7, de rearranque: sin preguntas bloqueantes; pendiente de la verificación del manager y de la aprobación escrita del humano, con sus respuestas a DH-15 a DH-18)". *Antes (E4-1):* "LISTO (el humano resolvió PB-1 y PB-2 con la recomendación; 01a1 y 01a2 están LISTOS)".
Carril: sensible (Enmienda 7: 01a trae las dos migraciones de Prisma y declara la política de clase archivada de las rutas nuevas, que es restricción de acceso; 01b suma la ruta de borrado del admin. 01c1 a 01e son solo frontend y dentro del encargo siguen el flujo completo). *Antes:* "01a trae dos migraciones de Prisma; 01b declara la política de clase archivada …".
Requisitos: RF-66, RF-67, RF-68; RN-08 (viñeta "Foro"), RN-05 (viñeta "Desde FORO-01"), RN-07 (viñeta del planteamiento), RN-09 (restringido no ve foros), RF-60 y RF-62 (sección "Foro" y "Actividades de aprendizaje"); P-09 resuelta (PRD, pregunta 13)

Base de "No se toca" (Enmienda 7): **`fd4a7ad`** (`main` al crear `feat/foro-01-actividad-tipo-foro`, 2026-11-14), fuera de los paquetes y, dentro de ellos, para la primera subentrega (01a); para las siguientes, dentro de los paquetes, el commit de la subentrega anterior (`AGENTS.md`, "Commits y cierre de subentregas"). Una sola copia de trabajo y una sola rama: ya no hay trabajo en paralelo (la copia B y su rama `feat/foro-01` existen, pero no se usan). *Antes (reemplazada por la Enmienda 7):* "`e94ee59` (`main` al crear `feat/foro-01`). Copia de trabajo B. En paralelo corre ADMIN-01 en la copia principal (`feat/admin-01`); este plan se leyó contra su `plan.md` (Enmiendas 1 a 4) solo para consulta."

**Para la aprobación del humano (Enmienda 9).** Carril **sensible**. Lo que se aprueba:
1. **Seis subentregas, un commit cada una, y un solo PR a `main` al cerrar 01e** (DH-15 y DH-16, ya decididas):
   - **01a**, el núcleo del foro con su comportamiento en clases archivadas (~33);
   - **01b**, el borrado de participaciones por el admin, "Actividades" con foros, el tipo en el gradebook, los README, y el foro ante el borrado o el duplicado de una clase y la baja de cuentas (~30);
   - **01c1**, la sección "Foro" y su lista (~23);
   - **01c2**, los arreglos heredados de las tareas, el formulario y crear, editar, ver y borrar un foro (~25);
   - **01d**, "Actividades", participaciones y réplicas (~27);
   - **01e**, calificar, enlaces del gradebook y `DESIGN.md` (~27).
2. **Dos migraciones de Prisma, en 01a, cada una como PARADA:** el programador entrega su SQL y se espera tu confirmación escrita antes de cada `prisma migrate dev`.
   - La primera agrega el valor `foro` al tipo de publicación.
   - La segunda crea la tabla `participaciones_foro`, con sus índices, y amplía el CHECK del título.

   Las dos son compatibles hacia atrás.
3. **Una sola línea de código de ADMIN-01:** `backend/src/core/clases/duplicado.ts:8` suma `"foro"` al tipo, **sin cambiar ninguna conducta**. El duplicado sigue sin copiar actividades, y lo prueba FORO-1A08.
4. **El plan no toca `middleware/`, `adapters/auth` ni `infra/`**, ni `.env.example`.
5. Las decisiones ya tomadas: DH-01 a DH-18 (DH-05 con tu corrección), PB-1 y PB-2, el complemento de DH-12 y N-19.

**Enmienda 9 (2026-11-14), final:** integra las decisiones del humano del 2026-11-14 (`aprobacion.md`, "Decisiones del humano sobre el rearranque (2026-11-14)") y atiende N-22 a N-25 y los dos detalles de la verificación de la Enmienda 8 (`revision.md`). Todo está en "§E9", debajo de estas notas, y **manda sobre §E8 y §E7**. Los cambios en el resto van marcados "(Enmienda 9)". La tabla está al final, en "Enmienda 9 — tabla de cambios".

**Enmienda 8 (2026-11-14):** atiende la verificación de la Enmienda 7 (`revision.md`, "Verificación de la Enmienda 7 (rearranque) — FORO-01 (2026-11-14)"):
- **M-07:** el valor `foro` del enum rompía la compilación del backend en archivos fuera de "Se toca". Ahora hay un inventario completo de los usos del tipo de publicación, con su remedio, y 01a pasa a ~32.
- **M-08:** el inventario de las secciones de la clase estaba incompleto. Está rehecho en todo `frontend/src`, y el frontend se vuelve a partir.
- **N-17 a N-21** y los detalles menores.

Todo vive en "§E8", justo debajo de estas notas, y **manda sobre §E7 donde choquen**. Los cambios en el resto van marcados "(Enmienda 8)". La tabla está al final, en "Enmienda 8 — tabla de cambios".

**Enmienda 7 (2026-11-14), de rearranque:** el encargo se pausó el 2026-11-05 y se retoma sobre `fd4a7ad`, que ya trae ADMIN-01, CHORE-04, DOCS-05 y CHORE-06 (`aprobacion.md`, "Rearranque (2026-11-14)"). La enmienda revalida el plan completo contra el código y las reglas de hoy, sin reabrir lo que el humano ya decidió (DH-01 a DH-12, DH-05 corregida, PB-1 (a), PB-2 (a), las migraciones como PARADA con su SQL). Todo lo nuevo vive en la sección "§E7. Rearranque sobre `fd4a7ad`", justo debajo de estas notas, y **manda sobre el texto anterior donde choquen**; en el resto del plan, cada pieza que cambia o queda sin objeto lleva la marca "(Enmienda 7)" y remite a §E7. Nada se borra: lo reemplazado queda como historial. La tabla está al final, en "Enmienda 7 — tabla de cambios".

**Enmienda 6 (2026-11-05):** atiende la PARADA P-01a1-1 de la ronda 0 de 01a1 (`errores-ch3-r2.ataque.test.ts` y los prefijos nuevos de `shared/src`). Agrega un C-n en 01a1 (C-6) y otro en 01b (C-7). No cambia nada más de 01a1. La tabla está al final, en "Enmienda 6 — tabla de cambios".

**Enmienda 5 (2026-11-05):** atiende M-06 (dos borrados simultáneos de una principal), N-15 y N-16 de la verificación de las Enmiendas 3 y 4, y registra las respuestas del humano sobre DH-05 y DH-14. Solo toca 01a2, 01b y textos; nada de 01a1. La tabla está al final, en "Enmienda 5 — tabla de cambios".

**Enmienda 4 (2026-11-05):** el humano respondió PB-1 (a) y PB-2 (a), aceptó la partición en 01a1 y 01a2 y aceptó las suposiciones S-E3-1 y S-E3-2 (`aprobacion.md`, "Enmienda 3 y respuestas del humano"). El diseño ya estaba escrito con esas opciones: solo cambian las marcas. La tabla está al final, en "Enmienda 4 — tabla de cambios".

**Enmienda 3 (2026-11-05):** aplica la aprobación corregida del humano (`aprobacion.md`, "Aprobación corregida por el humano (2026-11-05)"):
- DH-05 cambia: el admin borra participaciones y réplicas. Es una ruta nueva, que va en 01a.
- DH-14 pasa a (b): el commit de fusión aparte lo hace el humano.
- Las migraciones de 01a son PARADA con su SQL.
- Atiende los dos detalles del manager de la verificación de la Enmienda 2.

Con la ruta nueva, 01a pasa de unos 30 archivos y se parte en **01a1** y **01a2**, las dos antes de fusionar ADMIN-01 (§D-0.2). Los cambios van marcados "(E3-n)" y su tabla está al final, en "Enmienda 3 — tabla de cambios".

**Enmienda 2 (2026-11-04):** atiende la verificación de la Enmienda 1 (M-05, N-11 a N-14). Los cambios van marcados "(E2-n)" y su tabla está al final, en "Enmienda 2 — tabla de cambios".

**Enmienda 1 (2026-11-04):** atiende la revisión del manager en modo plan (`revision.md`: M-01 a M-04, N-01 a N-10 y los detalles menores) y la corrección del orquestador sobre DH-13. Los cambios van en su lugar, marcados "(E1-n)". La tabla de cambios está al final, en "Enmienda 1 — tabla de cambios".

**Regla de orden de fusión (E1-2, M-02; la confirma el humano en DH-13):** ningún commit de FORO-01 entra a `main` antes de que ADMIN-01 se fusione en `main`. 01a se queda en `feat/foro-01`. 01b arranca trayendo `main` a `feat/foro-01` (DH-14). **(Enmienda 7) Sin objeto y cumplida:** ADMIN-01 entró a `main` (PR #33 y #35) sin que entrara antes ningún commit de FORO-01 (el PR #32 se revirtió con el #34), y la rama nueva nace de `fd4a7ad`, así que no hay fusión de `main` que traer (§E7.0).

## §E9. Enmienda 9 (2026-11-14), final

Manda sobre §E8 y §E7 donde choquen.

### §E9.1. Las decisiones del humano (2026-11-14, "Acepto las seis")
Están en `aprobacion.md`, "Decisiones del humano sobre el rearranque (2026-11-14)", y se marcan en §E7.8 sin borrar las opciones descartadas:
- **DH-15 (a):** seis subentregas, un commit cada una: 01a (~33, por §E9.6; el humano aprobó ~32), 01b (~30), 01c1 (~23), 01c2 (~25), 01d (~27) y 01e (~27).
- **DH-16 (a):** un solo PR a `main`, al cerrar 01e.
- **DH-17 (a):** el diálogo de borrar definitivamente una clase (ADMIN-01) no cambia.
- **DH-18 (a):** las participaciones de una cuenta dada de baja siguen con su nombre y sin marca.
- **Complemento de DH-12:** aprobados "Tiene {n} actividades." / "Tiene 1 actividad." y "Esta clase no tiene categorías. Sus actividades se califican por puntos.".
- **N-19:** el humano acepta que el plan corrija el riesgo del `409` con la clase ya archivada en tarea, foro y calificar (FORO-1C41 y FORO-1E41).
- **N-20:** fue un aviso; no pedía decisión.

### §E9.2. N-22: C-20 completo, y C-19 revisado
C-20 queda reescrito en su lugar (§E8.2): suma los ocho índices que van como argumento suelto de `visitar` y de `fotosAjenasAlNavegar`. Pasan de `5,` a `6,` los de `:383`, `:404`, `:429`, `:446`, `:466` y `:484`, y de `4,` a `5,` los de `:420` y `:499`. Abrí el archivo y confirmé cada línea en `fd4a7ad`. C-19 (`indicador-03c1-r1`) no tiene esas ayudas ni índices sueltos, así que su lista queda completa (nota en §E8.2).

### §E9.3. N-23: las etiquetas de subentrega
Recorrí "01c1" y "01c2" en todo el plan. Cada mención queda coherente con §E8.3 o marcada como historial:
- **Corregidas en el texto literal de un C-n, que es lo que el tester escribe en el archivo:**
  - C-8 dice `// FORO-01c2, C-8 (§E8.3; …)`;
  - C-9, C-10 y C-11 dicen `// FORO-01c1 ronda 0 (C-n, §E8.2; …)`.

  Los de C-15 (01c2), C-16 (01e) y C-17 a C-20 (01c1) ya estaban bien.
- **Corregidas con su marca:**
  - §E7.2, las filas de `SECCIONES_DE_LA_CLASE` y de `fila-de-entrega.tsx`;
  - §E7.3, puntos 1, 6 y 8 (a), (b) y (c);
  - los dos encabezados de §E7.4;
  - §E7.5.4 (encabezado);
  - R-E7-1 y R-E7-2;
  - §D-0.1 (las filas de CH6-A14 y de ADMIN-01d1 y 01d2);
  - la nota de §D-8.6, la de §D-10 y la de §D-R0 sobre PR-1A17.
- **Que quedan como historial ya marcado:** la tabla de §E7.1, DH-15 de la Enmienda 7, §E7.5.3 (su encabezado y la lista de los hermanos), los encabezados de §E7.11, §D-0.2 y las tablas de cambios E2, E7 y E8.

### §E9.4. N-24: las `*.ataque` que leen el código de `features/tareas` y de todo `src/`

Las abrí una por una. Sus reglas valen para los archivos nuevos y los cambiados de 01c1 a 01e y se cumplen por diseño. Cada una queda **vigilada**: si se pone roja, PARADA.

**Restricciones para el programador, con la prueba que vigila cada una:**
- **En todo `features/tareas/` (archivos nuevos incluidos):**
  - sin `fetch(`, `console.`, `?? []`, `dangerouslySetInnerHTML` ni emojis; ojo: `\p{Extended_Pictographic}` incluye `©` y `®`. `target=_blank` solo en `lista-de-enlaces.tsx`. Ninguna importación de `features/clases` (y al revés). Lo vigila `tareas-01d-r1.ataque.test.tsx:479-537`;
  - sin `disabled` en JSX, sin las escalas anuladas (`text-sm`, `rounded-lg`…), sin la paleta de Tailwind, sin valores arbitrarios en px, rem, % o `#` y sin ninguna importación `from "@/features/…"`, tampoco del propio módulo (dentro de `features/tareas` se importa con rutas relativas). Lo vigila `tareas-01d-r2.ataque.test.tsx:504-541`;
  - ningún `type` ni `interface` fuera de `types.ts`, salvo las interfaces `…Props` de los `.tsx`. Las opciones de `useVerMasConservandoLaLista` y los tipos del foro van en `types.ts`. Lo vigila `tareas-01d-r3.ataque.test.tsx:390-410`.
- **En `features/tareas/hooks.ts`, `lib.ts`, `data.ts`, `types.ts`, `components/acciones-de-la-tarea.tsx`, `components/tabla-de-entregas.tsx` y `detalle-tarea-view.tsx`, que FORO-01 cambia:** sin `disabled`, `?? []`, `fetch(` ni `console.`; sin valores por defecto en `estadoPago`, `accesoRestringido`, `rol` ni `calificacion` (`… ??` o `… ||`); sin `vidrio`, `data-material`, `animate-` ni la palabra `fixed`, **tampoco en un comentario** (la regla lee el texto crudo). Lo vigilan `entregas-01e-r1.ataque.test.tsx:722-768`, `entregas-01d-r1.ataque.test.tsx:846-930` (además, sin `localStorage` ni `sessionStorage`), `entregas-01d-r2.ataque.test.tsx:756-786` y `entregas-01d-r3.ataque.test.tsx:667-713`.
- **La cuenta de `renovarTrasErrorDeLaEntrega(` en `hooks.ts` sigue en 3** (`entregas-01e-r1:767`, `entregas-01e-r2:542` y `entregas-01d-r2:784`, que además prohíbe `reaccionarAlErrorDeLaEntrega`).
  - **Decisión: el foro no la reutiliza** ni la nombra con paréntesis, tampoco en un comentario. Esa regla es de los `409` de la entrega (`ENTREGA_*`, la tarea y el trabajo).
  - El foro usa la suya, `renovarTrasErrorDeLaParticipacion` (01d), que vuelve a pedir `mi-participacion` y la lista de principales ante `PARTICIPACION_YA_PUBLICADA`, `PARTICIPACION_CALIFICADA` y `FORO_CERRADO`, y sigue la regla del foro ante un `404` o un `403` (§D-10).
  - **No hace falta C-n y ningún conteo cambia.**
- **Del mismo modo, en `hooks.ts`:**
  - `avisarDelErrorDeLaEntrega(` sigue con sus cinco llamadas exactas, sin contar su definición (CAL-T-127, `aviso-calificar-01c-r3.ataque.test.tsx:530-555`);
  - la cadena `mensajeDelAvisoDeCalificar` sigue solo en `hooks.ts` y `lib.ts`, y su uso con `error, mensajeDelAvisoDeCalificar)` sigue solo dentro de `useCalificarEntrega`.

  Por eso los ganchos del foro no llaman a `avisarDelErrorDeLaEntrega` ni usan ningún nombre que contenga `mensajeDelAvisoDeCalificar`, tampoco en un comentario. El aviso de calificar un foro sale de una función propia de `lib.ts` (por ejemplo, `textoDelAvisoAlCalificarElForo`), sobre `mensajeDeErrorForo`.
- **Ningún gancho exportado de `hooks.ts` lleva en su nombre `MiEntrega`, `Hilo`, `Comentar`, `Entregar` ni `Anular`** (`entregas-01d-r3.ataque.test.tsx:720-735`, que fija los cinco de hoy). Los nombres del foro (`useForo`, `useCrearForo`, `useEditarForo`, `useBorrarForo`, `useMiParticipacion`, `usePublicarParticipacion`, `useParticipaciones`, `useReplicas`, `usePublicarReplica`, `useBorrarParticipacion`, `useParticipantes`, `useParticipante`, `useParticipacionesDeAlumno`, `useDevoluciones`, `useCalificarParticipacion` y `useVerMasConservandoLaLista`) lo cumplen.
- **En los archivos de 01c de CALIFICACIONES que FORO-01 toca** (`features/tareas/data.ts`, `lib.ts`, `hooks.ts`, `types.ts` y `components/panel-de-calificacion.tsx`), según `estatico-01c-r1.ataque.test.ts:22-150`:
  - sin vidrio suelto, escalas anuladas, colores escritos (`#…`, `rgb(`, `hsl(`, `oklch(`) ni emojis, comentarios incluidos (CAL-T-94);
  - el panel sigue sin texto suelto en JSX (CAL-T-95), con exactamente sus tres campos (CAL-T-96) y con `.version` leída exactamente dos veces (CAL-T-98). La `actividad` del panel no suma campos ni lecturas de la versión;
  - en lo que pinta la entrega de un alumno, la única acción `primary` sigue siendo la del panel (CAL-T-97).
- **Los literales «Sin tema» y «Sin categoría»** viven solo en `components/clase/data.ts`. En `features/tareas` no se escribe "No tienes acceso a esta clase.", que se toma de `components/clase/data.ts` (`tareas-01a-r1.ataque.test.tsx:286-329` y CAL-1C12).
- **En `features/calificaciones` (01e)**, según `estatico-01d.test.ts:57-200`, `estatico-01d-r1.ataque.test.ts:46-130` y `estatico-02b.test.ts:60-150`:
  - el módulo sigue con **exactamente sus doce archivos de producción**: 01e no crea ninguno ahí;
  - los tipos van solo en `types.ts`;
  - sin `?? []`, `disabled`, `fetch(`, `console.`, `perspectivaDeRuta(`, vidrio, valores arbitrarios `-[…]`, estado de pago, restricción, `correo` o `email` (fuera de la lista única), importaciones de otro módulo ni la palabra `fixed`;
  - ningún `bg-` nuevo: en `tabla-del-gradebook.tsx` siguen los dos `bg-surface` de la columna fija;
  - ningún `.message`, `esErrorDeCursor(` ni `ErrorDeCampo`;
  - ninguna acción `primary`; los textos solo en `data.ts`. El enlace por tipo no suma textos. Si hiciera falta uno, PARADA, porque `features/calificaciones/data.ts` no está en "Se toca";
  - los ganchos no avisan y `hooks.ts` no tiene `onError`;
  - ningún comentario de `types.ts`, `data.ts`, `lib.ts`, `hooks.ts` ni de las vistas y componentes del módulo nombra las palabras prohibidas (`vidrio`, `disabled`, `?? []`, `fetch(`, `console.`, `_blank`, `perspectivaDeRuta(`, `correo`, `estadoPago`, `"Sin tema"`, `"Sin categoría"`, `fixed` y `data-material`).
- **En todo `src/` de producción:**
  - **No hay ningún `if (<m>.isError) <m>.reset()` fuera de los quince archivos de su lista** (`lib/estatico-ch3-r2.ataque.test.ts:171-187`). Los formularios del foro (participación, réplica y la calificación del foro, además de `FormularioTarea`) llevan el error del servidor en un estado propio o en un aviso, y la validación local lo reemplaza en ese mismo estado o lo limpia antes de validar. Es la otra forma que admite `CLAUDE.md`, "Formularios", y la que usan hoy `FormularioTarea`, la zona de entrega y el hilo.
  - `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` solo se importa de `@/services/apiClient` (`services/apiClient-ch3.test.ts:30-49` y `apiClient-ch3-r1.ataque.test.ts:22-91`).
  - `esErrorDeCursor` no se redefine (`estatico-ch3-r2:123-142`) ni se pasa como referencia (`lib/errores-ch3-r1.ataque.test.ts:295-305`).
  - `error.message` no se manipula fuera del contrato y de los tres archivos aprobados; la traducción del foro va en `features/tareas/lib.ts` (`lib/errores-de-api-estatico.test.ts:48-123` y `lib/estatico-ch3-r1.ataque.test.ts:96-116`).
  - Ningún carácter invisible literal (`estatico-ch3-r2:98-110`).
  - Ningún valor arbitrario de maquetación nuevo (`-[…]`) fuera de `components/ui/`. `fixed` solo en la barra y el diálogo, y `animate-` solo en `cargando.tsx` y `button.tsx` (`components/layout/estatico-r1.ataque.test.ts:96-158`).
  - `fetch(` solo en `services/`. `_blank` solo en `lista-de-enlaces.tsx`, también en comentarios (`entregas-01d-r1:896-908`).
  - Ningún símbolo movido en TAREAS-01c se redefine (`refactor-01c-r1.ataque.test.tsx:427-…`).
  - `components/`, `lib/` y `services/` no importan de `features/` (`refactor-01c-r1:419-425`).
  - Todo contenedor con `overflow-x-auto` lleva `relative` (`components/ui/desplazamiento-posicionado-h6.test.ts:38-60`).
- **En `features/clases` (01c1 y 01d):**
  - sin `?? []` y sin ternarios anidados en JSX (`features/clases/estatico-r1.ataque.test.ts:15-40`);
  - `trabajo-view.tsx`, `components/seccion-de-tema.tsx`, `components/fila-de-entrega.tsx`, `lib.ts`, `hooks.ts` y `data.ts` siguen sin tipos fuera de `types.ts`, sin `disabled` en JSX, sin valores arbitrarios y sin importar de otro módulo (`ver-mas-01e-r3.ataque.test.tsx:288-341`);
  - `erroresDeFormularioClases(` no suma llamadas (`features/clases/errores-ch3.test.ts:272-…`).
- **En las pruebas nuevas:** toda prueba que compare "Vence hoy", "Vence mañana" o "Vence en N días" fija el reloj (`useFakeTimers` o `setSystemTime`) o pasa un "ahora" explícito a `vencimientoDe` (`features/clases/reloj-01e-r4.ataque.test.tsx:38-62`). Ninguna lleva un carácter invisible literal.

**El mismo criterio con las demás vigiladas "como archivo completo":**
- Grep de `import.meta.glob`, `readFileSync` y `readdirSync` en todo `frontend/src`. Las que recorren un directorio o cuentan algo quedan abiertas arriba, con su línea.
- Las que quedan como archivo completo no leen código ni cuentan apariciones: `calificar-01c*`, `calificacion-01c`, `entregas-01e.test.tsx` y `entregas-01e-r1`/`r2` (salvo su bloque estático, abierto arriba), `editar-tarea-view.test`, `formulario-tarea.test`, `gradebook-01d*`, `mis-calificaciones-01d*`, `exportar-02b`, `exportacion-02b-r*` y las de Dudas.
- En el backend, las de borrado y duplicado de clase, como ya comprobó el manager (sin `readFileSync`, `readdirSync` ni `printRoutes`).
- Las de `features/admin` (`cuentas-r1.ataque` y `maestros-03b-r1.ataque`) leen solo `features/admin`, que FORO-01 no toca.
- **Ninguna vigilada que lea código o cuente apariciones queda sin abrir.**

### §E9.5. N-25: lo que 01c1 no puede probar sin las rutas de 01c2
- **FORO-1C01 se parte en dos:**
  - **en 01c1**, con `indiceDeSeccionActiva`, en `features/clases/foros-01c.test.tsx`: `${base}/foro` da 2, `${base}/foro/` da 2, `${base}/FORO` da 2, y `${base}/foros/x` y `${base}/foros` dan -1, en las tres perspectivas. Además, el router real muestra las siete secciones con "Foro" tercera y `aria-current` en `…/foro`;
  - **en 01c2**, con el router real, en `features/tareas/foro-detalle-01c.test.tsx`: en `…/foros/:foroId` ninguna sección lleva `aria-current` y no hay indicador, como en `tareas/:id`.
- **Entre el commit de 01c1 y el de 01c2:**
  - las filas de la lista de foros y "Crear foro" apuntan a rutas que todavía no existen (`foros/:foroId` y `foros/nuevo`). Una persona de la rama que las pulse cae en la ruta comodín del router (`*`), que hoy lleva a `/login`;
  - por la interfaz no se puede crear un foro, así que la lista solo tiene filas si se crean por la API (el backend ya está desde 01a);
  - por eso 01c1 **no entra sola a `main`**, lo que cuadra con DH-16 (a): un solo PR al cerrar 01e. No cabría con un PR por subentrega.
  - En la comprobación del manager al cerrar 01c1 no se abre un navegador (`AGENTS.md`). Las pruebas de 01c1 solo miran enlaces (su `href`), la lista, la política única y la recarga, sin navegar al detalle.
- La comprobación humana en el navegador sigue siendo una sola, al final de 01e.

### §E9.6. Los dos detalles menores
- **FORO-1A08** pasa a `backend/src/core/clases/duplicado-con-foros.test.ts`, junto a `duplicado.ts`, el código que prueba. Es una prueba nueva, que la regla general permite, y no toca `duplicado.test.ts` (ADM-1B01) ni la lista cerrada. **01a pasa de ~32 a ~33** (§E8.1).
- **C-15:** la firma de `handleGuardar` no se fija en el diseño. El programador declara las dos líneas tal cual y el tester las copia, como en C-16. La forma sí queda fija (§E8.2, C-15).

### §E9.7. Conteos
Solo cambia 01a, de ~32 a ~33 (§E9.6). 01b ~30, 01c1 ~23, 01c2 ~25, 01d ~27 y 01e ~27 no cambian: N-22, N-23 y N-24 corrigen textos y suman vigiladas, no archivos.

## §E8. Enmienda 8 (2026-11-14)

Manda sobre §E7 donde choquen. Lo que no nombra de §E7 sigue igual.

### §E8.1. M-07: dónde llega el tipo de publicación y qué se hace (01a)

**El problema.** Prisma no estrecha el tipo por el `where`: toda fila leída con `tipo: true` trae `$Enums.TipoPublicacion` completo (`adapters/db/generated/models/Publicacion.ts:222`). Desde el `prisma generate` del paso 4 de 01a, ese tipo incluye `"foro"`, y `tsc` falla donde se asigna a una unión más estrecha.

**El inventario.** Grep en `backend/src` (sin `generated/`), `backend/test`, `shared/src` y `frontend/src`. Los patrones fueron `"anuncio" \| "material"`, `"material" \| "tarea"`, `TipoPublicacion`, `TipoDePublicacion`, `TIPOS_DEL_MURO`, `TIPOS_CON_TEMA`, `tipo: true`, `\.tipo (===|!==) "…"`, `Record<…["tipo"]`, `switch (….tipo)` y `satisfies never`.

| Lugar | Qué hace con el tipo | ¿Compila con `foro`? | Qué se hace y cuándo |
|---|---|---|---|
| `adapters/db/publicaciones.ts:29-31` (`PublicacionDb.tipo: "anuncio" \| "material" \| "tarea"`), `:90-97` (`SELECT_PUBLICACION` con `tipo: true`) y `:147-173` (`crearPublicacion` devuelve `{ ...creada, … }`) | Asigna el enum de la fila creada a la unión | **No** | **01a.** `crearPublicacion` devuelve `tipo` desde su parámetro (`{ ...creada, tipo, … }`; el parámetro ya es `"anuncio" \| "material"`). Sin consulta nueva y sin cambio de conducta. `PublicacionDb.tipo` no cambia |
| `adapters/db/publicaciones.ts:215-265` (`listarPublicaciones`, `pagina.map((fila) => ({ ...fila, … }))`) | Ídem, con las filas de la página | **No** | **01a**, como ya decía §D-3.3. El `donde` sin `tipo` excluye `foro` y una ayuda privada del mismo archivo estrecha `fila.tipo` a la unión. Ante `"foro"` lanza `ERROR_INTERNO`, que es inalcanzable por el `donde`. Con `tipo: "anuncio"`, lo de hoy |
| `adapters/db/publicaciones.ts:272-276` (`FilaDePublicacionBloqueada`) y `:301-304` (SQL crudo `p.tipo IN ('anuncio', 'material')`) | Tipo escrito a mano sobre SQL etiquetado que filtra | Sí | Nada. Un foro no se borra ni se comenta por el muro (FORO-1A48) |
| `adapters/db/publicaciones.ts:88`, `:325` y `:353` (`TIPOS_DEL_MURO` en el `where`) | Filtra | Sí | Nada |
| `core/clases/duplicado.ts:8` (`TipoDePublicacionOriginal = "anuncio" \| "material" \| "tarea"`), `:19` (`esRecursoDeAprendizaje`) y `:43` (`RecursoOriginal.tipo`), con `adapters/db/duplicado-de-clase.ts:90-107` (`tipo: true`, `where: { tipo: "material", … }`) y `:134-137` | El adaptador pasa el enum a la unión de `core/` | **No** | **01a, en `core/`:** `TipoDePublicacionOriginal` suma `"foro"` (una línea y su comentario). `esRecursoDeAprendizaje` ya devuelve `false` a todo lo que no es `"material"`, así que **un foro nunca se copia al duplicar**, como ninguna actividad (P-10). Los tipos de `core/` reflejan los de la base, y así no se toca `duplicado-de-clase.ts` (ADMIN-01). Lo fijan FORO-1A08 (nuevo, puro) y FORO-1B09 (integración, 01b) |
| `adapters/db/tareas.ts:64-66` (`ElementoDeTrabajoDb.tipo: "material" \| "tarea"`) y `:641-698` (`listarTrabajoCon` estrecha a mano con `esMaterial ? "material" : "tarea"`) | Estrecha a mano | Sí | 01a: nada; un foro no entra en la página (`tipos` sin `foro`). 01b: suma `"foro"` (§D-3.3) |
| `adapters/db/tareas.ts:313` (`crearTarea`, `tipo: "tarea"` literal) | Escribe un literal | Sí | 01a: el `tipo` de la actividad (§D-3.3) |
| `adapters/db/temas.ts:41`, `:86`, `:145` y `:231` (`TIPOS_CON_TEMA` en el `where`), y `:210-226` (`moverATema` compara `"anuncio"`, `"material"` y `"tarea"`) | Filtra y compara | Sí | **01a: sin cambio y declarado.** Mover un foro responde `404 PUBLICACION_NO_ENCONTRADA` (el `updateMany` no lo encuentra). El total de temas no cuenta foros hasta 01b, que suma `foro` a `TIPOS_CON_TEMA` y la subida de `tareas.version` (§D-3.3). Ninguna prueba de 01a mueve un foro |
| `adapters/db/recursos.ts:139`, `:204`, `:310` y `:328` (`tipo: "material"` literal o en SQL) | Filtra | Sí | Nada |
| `adapters/db/calificaciones.ts:99` (`SELECT_TAREA`, sin `tipo` hoy) | — | Sí | 01b suma `tipo` y `columnaDe` lo estrecha a `"tarea" \| "foro"`, con un `ERROR_INTERNO` inalcanzable (§D-6) |
| `core/eventos/avisos-de-clase.ts:44` (`colaDePublicacion(tipo: "anuncio" \| "material")`) | Lo recibe del cuerpo del muro (`shared`) | Sí | Nada |
| `handlers/clases/muro.ts:115-124` (`datos.tipo` de `tipoPublicacionSchema`) y `handlers/tareas/tareas.ts:251` y `:270` (`elemento.tipo` de `ElementoDeTrabajoDb`) | Usan tipos ya estrechos | Sí | Nada. En 01b, `puedeMover` de un foro sale de la rama de la tarea, que es lo correcto |
| `adapters/db/archivos.ts`, `tokens-cuenta.ts`, `movimientos.ts`, `workers/`, `notifier` (`tipo` de un archivo, de un token, de un movimiento o de un correo) | Otros enums | — | No aplica |
| `shared/src/clases.ts:471` (`tipoPublicacionSchema`) y `:527` (`tipoDeElementoDelMuroSchema`, `"anuncio" \| "material" \| "tarea"`) | La respuesta del muro | Sí: `PublicacionDb.tipo` sigue estrecho | Nada. El muro nunca devuelve un foro (FORO-1A26) |
| `shared/src/tareas.ts:285` (`elementoDeTrabajoSchema.tipo`) | La respuesta de "Actividades" | Sí | 01b: `z.enum(["material", "tarea", "foro"])` (§D-3.2) |
| `frontend/src`: `seccion-de-tema.tsx:140` y `:150` (`elemento.tipo === "tarea"` / `"material"`), `publicacion-del-muro.tsx:43` y `:172` (el muro) y `clases/lib.ts:647` y `:681` (el formulario del muro) | Compara; ningún `switch` ni `Record` exhaustivo sobre el tipo, ni `satisfies never` (los dos que hay son del estado de pago y de la entrega) | Sí | 01b a 01c2: un foro no llega (sin `conForos`). 01d: la rama `foro` de `seccion-de-tema.tsx` (§E7.5.5) |
| `backend/test`: `ayudas-clases.ts:170` (`tipo?: "anuncio" \| "material"`), `migracion-tareas.integracion.test.ts:54` y `migracion-clases03a-r1.ataque.test.ts:128` (`::tipo_publicacion`) | Datos de entrada | Sí | Nada. Ninguna prueba arma un `PublicacionDb` ni un `RecursoOriginal` con un tipo exhaustivo; `core/clases/duplicado.test.ts:50-67` (ADM-1B01) usa literales que siguen siendo válidos |

**Cambios en 01a (§E7.5.1):**
- **"Se toca"** suma `backend/src/core/clases/duplicado.ts`, solo la línea 8 y su comentario.
- `adapters/db/publicaciones.ts` pasa de "solo `listarPublicaciones`" a "`listarPublicaciones` y `crearPublicacion`".
- **"No se toca"** (§E7.5.0) sigue con `core/clases/*`, salvo esa línea, y con `adapters/db/duplicado-de-clase.ts`.
- **Caso nuevo FORO-1A08** (en `backend/src/core/actividades.test.ts`; **(Enmienda 9)** en un archivo nuevo, `backend/src/core/clases/duplicado-con-foros.test.ts`, junto al código que prueba. Es un archivo de prueba nuevo, así que la regla general de §E7.5.0 lo permite aunque `core/clases/*` esté en "No se toca". No cambia `core/clases/duplicado.test.ts` (ADM-1B01) ni la lista cerrada. 01a pasa a **~33**: 19 de producción, 10 pruebas nuevas, 1 normal y 3 `*.ataque`): `esRecursoDeAprendizaje({ tipo: "foro", … })` da `false` con cualquier bloque y autor, y `planDeDuplicado` con un foro entre los recursos no lo copia.
- **Conteo:** 01a pasa a **~32** (19 de producción, 9 pruebas nuevas, 1 normal y 3 `*.ataque`).
- **Vigiladas que se suman:**
  - `core/clases/duplicado.test.ts:50-67` (ADM-1B01);
  - `duplicado-de-clase.integracion.test.ts`, `borrado-de-clase.integracion.test.ts`, `borrado-duplicado-autorizacion.integracion.test.ts`, `borrado-duplicado-r1.ataque.test.ts` y `borrado-duplicado-r2.ataque.test.ts`, como archivos completos (§E8.5);
  - las del muro que crean y listan (`muro.integracion` y las `muro-*.ataque`), con `crearPublicacion` y `listarPublicaciones` igual que hoy.
- **La conducta de ADMIN-01 no cambia:** el duplicado sigue sin copiar actividades, y ahora también lo dice el tipo.

### §E8.2. M-08: todo lo que cuenta, enumera o indexa las secciones de la clase

**Grep en todo `frontend/src`** (pruebas normales y `*.ataque`):
- la lista multilínea `"Actividades de aprendizaje",\s*"Recursos"` y `"Dudas",\s*"Personas"`;
- el indicador por índice: `esperadas\(\d`, `medidasDeLaOpcion\(\d`, `opcionDe\(lista, \d\)`, `--indicador-x` y los px literales `"[1-6]\d0px"`;
- `indiceDeSeccionActiva\(`, `toHaveLength\(6\)` y `getAllByRole\("link"\)\[\d\]`;
- las listas cerradas de CHORE-04 (`lib/guardas-ch4-r1.ataque.test.ts`) y de CHORE-06.

**Precedente:** CLASES-03e, al sumar "Dudas", ajustó estas mismas pruebas, con sus comentarios "CLASES-03e ronda 0" en `rutas-01d-r1`, `clases-admin-02c-r1`, `indicador-03c1-r1`, `indicador-03c1-r2` y `heredados-02d-r1`. Con "Foro" en el índice 2, cada sección desde "Recursos" sube un índice: "Recursos" 2→3, "Dudas" 3→4, "Personas" 4→5 y "Calificaciones" 5→6. En las medidas simuladas (posición = índice × 100 px y ancho = 80 + índice × 10 px), "Calificaciones" pasa de 500..630 a 600..740.

Fuera del grep de arriba: `foco-barra-02d-r2.ataque`, `foco-pestana-02d-r3.ataque` y `lista-de-clases.test` indexan la lista de clases de la barra, no las secciones. `textos-03c1.test.ts:15-24` enumera claves explícitas de `TEXTOS_CLASE`, y sumar `foro` no la cambia. `recursos-caminos-03d.test.tsx:644-654` y los demás que buscan una sección por nombre son vigilados.

**Lista cerrada de pruebas normales (la sección "Foro"; ahora en 01c1, §E8.3).** Antes → después, con la intención que conserva cada una:
1. `features/clases/secciones-03c1.test.tsx`. Sigue protegiendo el orden, `aria-current` y el indicador medido.
   - `:19-20` (comentario) y `:21-27` (`NOMBRES`): suma `"Foro"` después de `"Actividades de aprendizaje"`.
   - `:153`: "CL3-C01: %s ve las seis secciones en orden, sin «Foro», y la activa lleva aria-current y text-link" → "CL3-C01: %s ve las siete secciones en orden, con «Foro» tercera, y la activa lleva aria-current y text-link".
   - `:160`: sale `expect(within(lista).queryByRole("link", { name: "Foro" })).toBeNull()`; la lista de `:159` ya fija "Foro" tercera.
   - `:184`: `esperadas(5)` → `esperadas(6)` ("Calificaciones").
   - `:243` y `:255`: `esperadas(4)` → `esperadas(5)` ("Personas").
   - `:256`: `{ x: "520px", ancho: "135px" }` → `{ x: "650px", ancho: "145px" }` (posición 130 × 5; ancho 95 + 5 × 10).
   - `:276` y `:282`: `esperadas(4)` → `esperadas(5)`.
   - `:283`: `"160px"` → `"170px"` (120 + 5 × 10).
   - `:292-293`: "«Calificaciones» (la sexta, tras «Recursos» y «Dudas») ocupa de 500 a 630 px" → "(la séptima, tras «Foro», «Recursos» y «Dudas») ocupa de 600 a 740 px".
   - `:305`: `630 - 250` → `740 - 250`.
2. `features/clases/clase-layout.test.tsx`. Sigue protegiendo el indicador y las perspectivas.
   - `:256`: "…en Personas bajo la quinta…" → "…en Personas bajo la sexta…".
   - `:274`: `medidasDeLaOpcion(4)` → `medidasDeLaOpcion(5)`.
   - `:307-318` (PR-2C07, la lista del admin): suma `"Foro"` después de `"Actividades de aprendizaje"`.
   - `:341-342` (comentario): "…'Personas' la quinta (03d suma 'Recursos' en la tercera y 03e, 'Dudas' en la cuarta)…" → "…'Personas' la sexta (FORO-01 suma 'Foro' en la tercera, y 'Recursos' y 'Dudas' pasan a la cuarta y la quinta)…".
   - `:360`: `medidasDeLaOpcion(4)` → `medidasDeLaOpcion(5)`.
   - `:383` (PR-2C08): `toHaveLength(6)` → `toHaveLength(7)`.
   - `:427`: "PR-1E05 · seis secciones…" → "PR-1E05 · siete secciones…".
   - `:430-470`: las tres listas (estudiante, maestro y admin) suman `"Foro"` tercera.
3. `features/clases/lib.test.ts`. Sigue protegiendo el índice sin distinguir mayúsculas y sin activar nada en `/editar`.
   - `:295-306`: la lista suma `"Foro"` tercera, y el comentario dice "FORO-01 suma 'Foro' en la tercera".
   - `:322-323` y `:336` (comentarios): "Personas" 5 y "Calificaciones" 6.
   - `:329` y `:331`: `toBe(4)` → `toBe(5)`.
   - `:330`: `toBe(5)` → `toBe(6)`.
   - `:343`: `toBe(4)` → `toBe(5)`.
   - `:344`: `toBe(5)` → `toBe(6)`.
4. `features/clases/recursos-lib-03d.test.ts:163-169` (CL3-D26). Sigue protegiendo que "Recursos" quede activa en su edición.
   - Título: "«Recursos» es la tercera sección…" → "«Recursos» es la cuarta sección…".
   - `:167` y `:168`: `toBe(2)` → `toBe(3)`.
5. **`app/router-01d.test.tsx` (nueva en la lista; la Enmienda 7 la daba por vigilada).** Sigue protegiendo que "Calificaciones" sea la última, con su `href`, su `aria-current` y el indicador medido.
   - `:191-192` (comentario): suma "; FORO-01 suma «Foro» en la tercera".
   - `:195`, `:199` y `:203`: las tres listas suman `"Foro"` después de `"Actividades de aprendizaje"`.
   - `:232`: `medidasDeLaOpcion(5)` → `medidasDeLaOpcion(6)`.
   - `:237`, `:238` y `:239`: `["admin", "personas", 4]` y `["maestro", "personas", 4]` → `5`.
   - `:240`: `["maestro", "calificaciones", 5]` → `6`.
6. **`features/clases/dudas-caminos-03e.test.tsx:450-457` (CL3-E12, nueva en la lista):** la lista suma `"Foro"` después de `"Actividades de aprendizaje"`. El título ("…entre «Recursos» y «Personas»") sigue siendo cierto. Sigue protegiendo que "Dudas" quede activa con su `href`.

**C-n de la sección (el tester, en la ronda 0 de la subentrega de la sección):**
- **C-9** `features/clases/heredados-02d-r1.ataque.test.tsx:209-273` y **C-10** `features/clases/estatico-02c-r1.ataque.test.ts:123-133`: sin cambio de texto respecto de §E7.5.4.
- **C-11** (V-06): tampoco cambia de texto: de 90 a 91, `"/src/features/clases/foros-view.tsx": 1`. Se suma una aclaración: un archivo nuevo sin `enEspera=` no necesita entrada en `fijos`, porque `porArchivo` solo cuenta los archivos que lo tienen.
- **C-17, `app/rutas-01d-r1.ataque.test.tsx:197-210` (CAL-T-179):**
  - **Comentario, después del de CLASES-03e:** `// FORO-01c1 ronda 0 (C-17, §E8.2; §D-8.1): con «Foro» entre «Actividades de aprendizaje» y «Recursos», Calificaciones pasa a ser la séptima sección (índice 6: 600 px de posición y 140 px de ancho simulados, con las mismas medidas). Sigue protegiendo que el indicador quede en la sección activa con la ruta escrita a mano.`
  - **`:210`:** `{ x: "500px", ancho: "130px" }` → `{ x: "600px", ancho: "140px" }`.
- **C-18, `features/clases/clases-admin-02c-r1.ataque.test.tsx:382-393`:**
  - **Comentario, después del de CLASES-03e (`:380-381`):** `// FORO-01c1 ronda 0 (C-18, §E8.2; §D-8.1): el admin suma «Foro» entre «Actividades de aprendizaje» y «Recursos». El recorrido no cambia: sigue entrando por «Personas» y protegiendo que aria-current siga a la sección pulsada y que el foco quede en el enlace.`
  - **La lista:** suma `"Foro",` entre `"Actividades de aprendizaje",` y `"Recursos",`.
- **C-19, `features/clases/indicador-03c1-r1.ataque.test.tsx`:**
  - **Comentario, después de `:301-304`:** `// FORO-01c1 ronda 0, C-19 (§E8.2; §D-8.1): con «Foro» en el índice 2, «Recursos», «Dudas», «Personas» y «Calificaciones» suben un índice (Personas 4 → 5 y Calificaciones 5 → 6; posición simulada "500px" → "600px", en esperadas, opcionDe y las fotos); «Avisos» y «Actividades de aprendizaje» no cambian. Siguen protegiendo lo mismo: el ciclo de vida del indicador, no la posición de cada sección.`
  - **Cambios:** todo `esperadas(5)` → `esperadas(6)` (`:354`, `:373`, `:387`, `:404`, `:420`, `:431`, `:456`, `:567`, `:578`, `:589` y `:594`); `esperadas(4)` → `esperadas(5)` en `:523` (y su comentario de `:522`: "«Personas» pasa al índice 5"); todo `opcionDe(lista, 5)` → `opcionDe(lista, 6)` (`:406`, `:421`, `:433` y `:458`); `"500px"` → `"600px"` en `:357` y `:376`.
  - `esperadas(0)`, `esperadas(1)`, los `scrollLeft` que fija la propia prueba (`:452`, `:495`, `:595`) y lo demás no cambian.
  - **(Enmienda 9, N-22) Revisado con el mismo criterio que C-20:** este archivo no tiene `visitar` ni `fotosAjenasAlNavegar`, ni ningún índice pasado como argumento suelto (`esperadas` está en `:305` y `opcionDe` en `:314`). La lista de "Cambios" de arriba queda completa.
- **C-20, `features/clases/indicador-03c1-r2.ataque.test.tsx`:**
  - **Comentario, después de `:300-304`:** `// FORO-01c1 ronda 0, C-20 (§E8.2; §D-8.1): con «Foro» en el índice 2, «Personas» pasa del 4 al 5 y «Calificaciones» del 5 al 6 (en esperadas, opcionDe y los destinos de visitar y fotosAjenasAlNavegar); «Avisos» y «Actividades de aprendizaje» no cambian. «Recursos» deja el índice 2: el control de CL3-R2-08 pulsa ahora «Foro», que lo ocupa, y conserva su aritmética, como hizo CLASES-03d con «Recursos». Siguen protegiendo lo mismo.`
  - **Cambios (reescritos y completos en la Enmienda 9, N-22; cada línea confirmada en `fd4a7ad`):**
    - **`esperadas(5)` → `esperadas(6)`** ("Calificaciones"): `:439`, `:475`, `:526`, `:557` y `:576`. Son las cinco del archivo.
    - **`opcionDe(lista, 5)` → `opcionDe(lista, 6)`:** `:528`, `:554` y `:558`. Son las tres del archivo.
    - **El índice como argumento suelto** (el último de `visitar` y de `fotosAjenasAlNavegar`, en su propia línea):
      - `5,` → `6,` ("Calificaciones") en `:383` (`visitar`, CL3-R2-01), `:404` (`fotosAjenasAlNavegar`, CL3-R2-01), `:429` (CL3-R2-02), `:446` (CL3-R2-03), `:466` (CL3-R2-04) y `:484` (CL3-R2-05);
      - `4,` → `5,` ("Personas") en `:420` (CL3-R2-02) y `:499` (CL3-R2-05, hermano).
    - **No cambian** los argumentos sueltos `1,` (`:390`) y `0` (`:414`, `:440`, `:476`), y tampoco `esperadas(0)`, `esperadas(1)`, `opcionDe(lista, 0)`, `opcionDe(lista, 2)` ni `esperadas(2)`. El archivo no tiene ningún `esperadas(4)` ni `opcionDe(lista, 4)`.
    - **Comentario `:506-508`:**
      - "«Calificaciones» ocupa 500..630 (antes 400..520)." → "«Calificaciones» ocupa 600..740 (antes 500..630).";
      - "«Calificaciones» (500..630) a la derecha" → "«Calificaciones» (600..740) a la derecha".
    - **El router de prueba (`:77-83`):** suma `{ path: "foro", element: <p>{`foro ${rol}`}</p> },` en la línea anterior al comentario de `:78`, con el comentario `// FORO-01c1 ronda 0 (C-20): la sección «Foro», para el control de CL3-R2-08.` en la línea de arriba.
    - **El control de CL3-R2-08 (`:594-601`):**
      - `fireEvent.click(within(lista).getByRole("link", { name: "Recursos" }))` → `fireEvent.click(within(lista).getByRole("link", { name: "Foro" }))`;
      - `"recursos maestro"` → `"foro maestro"`;
      - el comentario de `:594-596` suma la línea `// FORO-01c1 ronda 0 (C-20): «Foro» ocupa ahora el índice 2; con 90 px desplazados, «Foro» (200..300 en el <ul>, 212..312 en el panel) cabe entera en 90..340.`
    - **Nada más cambia.** Si al aplicar C-20 aparece otro índice ≥ 2 de una sección en este archivo, PARADA. *Texto de la Enmienda 8, reemplazado:* "todo `esperadas(5)` → `esperadas(6)` (…) y todo `opcionDe(lista, 5)` → `opcionDe(lista, 6)` (…); `:506-508` (…); el router de prueba (…); en el control (…). `opcionDe(lista, 2)` y `esperadas(2)` no cambian. Si alguno de `esperadas(4)` o `opcionDe(lista, 4)` del archivo nombra «Personas», pasa a 5."

**Listas cerradas de CHORE-04 (`lib/guardas-ch4-r1.ataque.test.ts`):**
- **C-15 (en la subentrega de las vistas, §E8.3).** `editar-foro-view.tsx` tiene la forma de `editar-tarea-view.tsx:119-136`: la vista anidada `contenido()`, con `handleGuardar` y `recargarTrasConflicto`, y la recarga tras el `409` con `consulta.refetch()` sin opción, que pide una sola petición y la espera (§7.21). Se elige esa forma para que la edición del foro sea igual a la de la tarea.
  - **ATQ-CH4-32 (`:89-92`):** la lista suma `"/src/features/tareas/editar-foro-view.tsx en «<la línea de handleGuardar>»"`, en el orden del glob: antes de `editar-tarea-view.tsx`, como comprobó el manager.
  - **ATQ-CH4-34 (`:112-120`):** suma `"/src/features/tareas/editar-foro-view.tsx: const resultado = await consulta.refetch()"`.
  - **Comentario en las dos:** `// FORO-01c2 ronda 0 (C-15, §E8.2): la edición del foro tiene la forma de la de la tarea (la guarda vive en formulario-tarea.tsx y la recarga tras el conflicto es una sola petición esperada).`
  - **(Enmienda 9) La firma de `handleGuardar` no se fija en el diseño; la declara el programador.** Puede ser `(datos: CrearTarea, version: number)` o la que dé `FormularioTarea` con `tipo="foro"` para los datos del foro.
    - En su resumen, el programador declara las dos líneas tal cual están en el archivo. El tester las copia en ATQ-CH4-32 y en ATQ-CH4-34, como en C-16.
    - Lo que sí se fija es la forma: `handleGuardar` a cuatro espacios, dentro de la función anidada `contenido()` del componente interno con `key={foroId}`, llamando a `mutateAsync` (la guarda vive en `formulario-tarea.tsx`), y la recarga tras el conflicto, `const resultado = await consulta.refetch()`, dentro de `recargarTrasConflicto`.
    - Si la forma es otra, PARADA. *Texto de la Enmienda 8, reemplazado:* la entrada de ATQ-CH4-32 fijaba «const handleGuardar = async (datos: CrearTarea, version: number) => {».
- **C-16 (01e), ATQ-CH4-34:** `participante-view.tsx` recarga tras un `409` de calificar como `entrega-de-alumno-view.tsx`. Suma las líneas que declare el programador, con la forma de `"/src/features/tareas/entrega-de-alumno-view.tsx: consulta.refetch(),"` y de `"…: recargaLaTareaTrasConflicto(error) ? tarea.refetch() : Promise.resolve(null),"`, con el foro en lugar de la tarea.
  - Comentario: `// FORO-01e ronda 0 (C-16, §E8.2): la participación de un alumno recarga tras un 409 como la entrega de un alumno.`
  - El calificar de la participante vive en `PanelDeCalificacion`, en un manejador a dos espacios, así que ATQ-CH4-32 no cambia.
- **El resto del foro no entra en esas listas:**
  - toda mutación nueva vive en un manejador a dos espacios de su componente (CH4-01 y ATQ-CH4-32);
  - todo `.refetch(` nuevo lleva `{ cancelRefetch: false }` (CH4-03 y ATQ-CH4-34), salvo las dos recargas tras un conflicto de arriba;
  - ninguna mutación se pasa como valor (ATQ-CH4-31) ni se desestructura (ATQ-CH4-30).

  Si hiciera falta otra forma, PARADA.
- **En la subentrega de los hermanos:** el remedio de T-01 en `editar-tarea-view.tsx` no cambia las dos líneas que fijan ATQ-CH4-32 (`:91`) y ATQ-CH4-34 (`:115`). Quedan **vigiladas**.

### §E8.3. La partición nueva del frontend (DH-15)

Con M-08, la 01c2 de §E7.1 pasaba de ~30 a ~37. **Se reparte por lo que necesita cada parte, no por tema:** la sección "Foro" va primero (sus pruebas solo miran enlaces y la lista, no navegan al detalle), y los hermanos, el formulario y las vistas del foro después, que ya encuentran la sección para "Volver a Foro" y "volver a abrir el foro desde «Foro»".

| Sub | Base | Contenido | Archivos |
|---|---|---|---|
| **01c1** · la sección "Foro" | commit de 01b | La sección tercera de siete, `ForosView` como `DudasView`, "Crear foro", la ruta `foro`, la clase archivada en la lista y PR-1A17 (toca `features/clases/data.ts`, que esta subentrega ya toca) | **~23**: 7 de producción (`features/clases/foros-view.tsx`, `data.ts`, `hooks.ts`, `types.ts` y `components/fila-de-entrega.tsx`; `services/trabajoService.ts`, con `clavePrefijoDeForos` y `claveListaDeForos`; `app/router.tsx`, con la ruta `foro` en las tres ramas); 2 pruebas nuevas (`features/clases/foros-01c.test.tsx` y `recuperar-foros-01c.test.tsx`); 7 normales (las seis de §E8.2 y `features/tareas/como-se-entrega-01a.test.tsx:262`, PR-1A17); 7 `*.ataque` (C-9, C-10, C-11 y C-17 a C-20) |
| **01c2** · hermanos, formulario y vistas del foro | commit de 01c1 | Los hermanos T-01 a T-05 (primero, E1-27) y su extensión (FORO-1C41); los vecinos de CH6-A14 en los formularios de tarea; `tipo` en `FormularioTarea` y `AccionesDeLaTarea`; la traducción del foro; crear, editar, ver y borrar un foro; sus rutas | **~25**: 13 de producción (en `features/tareas/`: `components/formulario-tarea.tsx`, `components/acciones-de-la-tarea.tsx`, `components/detalles-de-la-tarea.tsx`, `editar-tarea-view.tsx`, `foro-view.tsx`, `crear-foro-view.tsx`, `editar-foro-view.tsx`, `hooks.ts`, `data.ts`, `lib.ts` y `types.ts`; `services/trabajoService.ts`, con las demás claves del foro; `app/router.tsx`, con `foros/nuevo`, `foros/:foroId`, `foros/:foroId/editar` y `foros/nuevo` → `/login` en la rama del estudiante); 8 pruebas nuevas (`hermanos-03d-01c`, `vecinos-formulario-tarea-01c`, `formulario-foro-01c`, `traduccion-foro-01c`, `foro-detalle-01c`, `crear-editar-foro-01c`, `errores-foro-01c` y `recuperar-foro-01c`); 2 normales (CH4-01 `EXCEPCIONES` y CH6-A30 (c), §E7.5.4, puntos 5 y 6); 2 `*.ataque` (C-8, condicional, y C-15) |
| **01d** | commit de 01c2 | Sin cambio (§E7.5.5) | **~27** |
| **01e** | commit de 01d | Lo de §E7.5.6, más C-16 | **~27** (17 + 6 + 2 + 2) |

**Por qué cada corte:** 01c1 y 01c2 juntas son unos 48 (las dos tocan `trabajoService.ts` y el router). 01c2 y 01d juntas, unos 52. 01d y 01e, unos 54. Backend: 01a ~32 (§E8.1; **(Enmienda 9)** ~33, §E9.6) y 01b ~30, que juntas son unos 62 (**(Enmienda 9)** 63).

**Dónde va cada caso de 01c** (los ids no cambian):
- **01c1:** FORO-1C01 (**(Enmienda 9)** su parte de `indiceDeSeccionActiva` y del orden; la del router real en `foros/:foroId` va en 01c2, §E9.5) a FORO-1C03 y FORO-1C20 a FORO-1C23. De los casos nuevos, las partes de "Ver más foros" y de la lista: FORO-1C50 ("Ver más foros"), FORO-1C51, FORO-1C52 (la lista entre dos clases), FORO-1C53 ("Ver más foros") y FORO-1C54.
- **01c1, FORO-1C14 (en su parte de la lista):** "Crear foro" no se pinta en una archivada.
- **01c2:** FORO-1C04 a FORO-1C13, FORO-1C14 (las vistas), FORO-1C24, FORO-1C26, FORO-1C27, FORO-1C30 a FORO-1C37, FORO-1C40, FORO-1C41, FORO-1C43, y las partes de FORO-1C50, FORO-1C52 y FORO-1C53 de las vistas.
- La regla de `AGENTS.md` sobre el orden (los hermanos antes de construir encima, E1-27) se cumple dentro de 01c2.

**V-06 en 01c2:** las vistas del foro no suman `enEspera=`. "Sí, borrar foro" y "Borrar con las participaciones" viven en `AccionesDeLaTarea`, que ya está contado, y el botón principal en `FormularioTarea`. Por eso no hay C-n de V-06 en 01c2; si el programador suma uno, PARADA.

**01d y 01e, repasadas con el mismo grep:**
- **01d no cambia.** Sus componentes ponen las mutaciones en manejadores a dos espacios y no recargan tras un conflicto. "Ocultar réplicas" y "Ver réplicas" vuelven a pedir con `{ cancelRefetch: false }` o con `resetQueries`, nunca con un `refetch()` sin opción.
- **01e suma C-16.**
- `trabajo-view.test.tsx:444-472` (PR-1E02: "«Crear tarea» es la única acción principal") sigue valiendo con "Crear foro" en `outline`. `clase-archivada-01d1-vista.test.tsx:520-524` lista controles que no se pintan, y "Crear foro" se suma solo en FORO-1D29. Las dos quedan **vigiladas** de 01d.

**Línea "Grep" de la comprobación de arranque de 01c1 a 01e (amplía §E7.5.3 a §E7.5.6):** los patrones de §E8.2 en todo `frontend/src`, más `\.refetch\(` y `mutate(Async)?\(` en los archivos nuevos, contra las listas de ATQ-CH4-32 y ATQ-CH4-34. Es una red de seguridad: el inventario es el de arriba.

### §E8.4. N-18: el «Ver más» de las listas de `features/tareas` va en un gancho
- La lógica de `entregas-view.tsx:98-114`, con sus cuatro salidas, va en **un gancho nuevo de `features/tareas/hooks.ts`** (CLAUDE.md, reglas 3 y 4): `useVerMasConservandoLaLista`. Lo hace:
  - la guarda con ref;
  - `fetchNextPage({ cancelRefetch: false })`;
  - ningún aviso con la vista desmontada, ante el cursor vencido, ante un error que reemplaza la lista o la vista, ni ante un código con que `apiClient` redirige; un solo aviso en lo demás;
  - el foco de `useFocoAlCargarMas`.
- Devuelve el manejador con nombre y la ref del botón.
- **No lee `isFetchingNextPage`** (CH4-04).
- Nace en 01d (las participaciones y las réplicas) y lo reutilizan en 01e "Participantes", lo que escribió un alumno y las devoluciones.
- **`entregas-view.tsx` se queda como está, fuera de "Se toca".** Pasarlo al gancho sería un refactor en un archivo con muchas pruebas (`entregas-01d*` y `entregas-01e*`) y cambiaría la lista cerrada de CH4-04, que lo nombra porque lee `isFetchingNextPage`.

### §E8.5. N-17: las vigiladas, abiertas una por una
- **Del backend, con su archivo y su línea en `fd4a7ad`:**
  - `hilo-01c-r1.ataque.test.ts:718-733`;
  - `entregas-01b-r1.ataque.test.ts:1005-1017` y `:1019-1032`;
  - `calificaciones-estatico.test.ts:36-47`, `:49-66`, `:68-74`, `:76-85` y `:87-127` (la lista de `:94` nombra `app.ts`);
  - `calificaciones-lecturas-estatico.test.ts:77-88`, `:90-108` y `:110-129`;
  - `exportacion-calificaciones-estatico.test.ts:97-135`;
  - `lecturas-fx-r1.ataque.test.ts:794-804`;
  - `lecturas-fx-r2.ataque.test.ts:972-1000` y `:1082-1108`;
  - `temas-01a-r1.ataque.test.ts:985-1031` y `:1033-…`;
  - `temas-01a-r3.ataque.test.ts:426-428`;
  - `arquitectura-cuentas-r1.ataque.test.ts:69-75`;
  - `bloqueo-usuario.integracion.test.ts:696-…` (E6; antes citada como `:677-723`). `foros.ts` y `actividades.ts` no usan SQL etiquetado;
  - `muro-c-r1.ataque.test.ts:633-661`;
  - `muro.integracion.test.ts:201-219` y `migracion-tareas.integracion.test.ts:69-105`;
  - `esquemas-tareas.test.ts:432-457`;
  - `categorias.integracion.test.ts:221` y `:225`, `categorias-01a-r1.ataque.test.ts:400` y `:410`, y `referencias-01b-r1.ataque.test.ts:236`;
  - `migracion-clases03a-r1.ataque.test.ts:128`;
  - `higiene-de-pruebas.integracion.test.ts:541-556`;
  - `clases-archivadas-r1.ataque.test.ts:631-686` (ADM-T1A09) y `:713-812` (ADM-T1A10);
  - `gestion-clases-autorizacion.integracion.test.ts:395-425`, `movimientos-inscripcion.integracion.test.ts:245-253` y `recursos-autorizacion.integracion.test.ts:580-585`;
  - `core/clases/duplicado.test.ts:50-67`.
- **Las tres que faltaban (N-17):**
  - `instantanea-01b-r1.ataque.test.ts:525-557`: `leerTarea`, `leerTareaCon`, `listarTrabajoCon` y la opción solo en `leerTarea` y `listarTrabajo`. 01a y 01b cambian `tareas.ts`, sin renombrar esas funciones y sin la opción en otras;
  - `calificaciones-estatico-01b-r1.ataque.test.ts:19-28` (CAL-T-68: `adapters/db/calificaciones.ts` no nombra `rol`, `version`, `email`… y no usa `Promise.all`; 01b solo suma `tipo`) y `:30-…` (CAL-T-69: sin `request.query.x` ni `request.query as` en `handlers/calificaciones.ts`; `conTipo` se lee con `validarParametros`);
  - `autoria-02b-r1.ataque.test.ts:260-…`, `:370-…`, `:417-…` y `:455-…` (el oráculo propio del muro): 01b solo suma `puedeBorrarParticipacion`, y `puedeBorrar` no cambia.
- **Del frontend, abiertas con su línea en §E7.5 y §E8.2:**
  - `lib/errores-de-api.test.ts:463-470`;
  - `lib/errores-ch3-r2.ataque.test.ts:231-276`;
  - `lib/guardas-de-doble-clic-estatico.test.ts:105-262`;
  - `lib/estado-por-id-estatico-ch6.test.ts:31-124`;
  - `lib/estatico-ch3-r1.ataque.test.ts:96-116`: `features/tareas/lib.ts` es uno de los tres archivos aprobados para leer `.message`, así que la traducción del foro va ahí;
  - `features/tareas/errores-ch3.test.ts:44` y `errores-ch3-r1.ataque.test.ts:112`;
  - `features/tareas/detalle-tarea-view.test.tsx:517` y `:541`;
  - `features/tareas/estatico-01c.test.ts:37-60`;
  - `styles/clases-r1.ataque.test.ts:206-494`;
  - `features/clases/trabajo-view.test.tsx:444-472`;
  - `features/clases/clase-archivada-01d1-vista.test.tsx:520-524`.
- **Siguen sin abrir línea por línea, y por qué:**
  - **Las pruebas de conducta citadas como archivo completo:** en el backend, `duplicado-de-clase.integracion`, `borrado-de-clase.integracion`, `borrado-duplicado-autorizacion.integracion` y `borrado-duplicado-r1` y `r2.ataque`; en el frontend, `features/tareas/tareas-01d-r1` a `r4.ataque`, `calificar-01c*`, `calificacion-01c`, `entregas-01e*`, `editar-tarea-view.test.tsx` y `formulario-tarea.test.tsx` (salvo las líneas citadas), `features/calificaciones/gradebook-01d*`, `mis-calificaciones-01d*`, `exportar-02b` y `exportacion-02b-r*`, y las de Dudas.
  - **Por qué:** no leen el código ni enumeran nada que el foro cambie. Prueban conducta por las rutas o los componentes de hoy, que FORO-01 no cambia (props opcionales, textos de hoy y la consulta del duplicado igual). Una falla suya aparece al correrlas, no en el texto. Quedan vigiladas enteras: si una se pone roja, PARADA. La comprobación de arranque del tester es la red de seguridad para ellas, no el inventario.

### §E8.6. Avisos para el humano (N-19 y N-20) y DH-02 (N-21)
Están en §E7.8, debajo de la tabla, y en §E7.7.

## §E7. Rearranque sobre `fd4a7ad` (Enmienda 7)

Esta sección manda sobre el resto del plan donde choquen. Lo que no nombra sigue como estaba (§E7.9, "Lo que no cambia").

### §E7.0. Lo que queda sin objeto (se conserva como historial)

| Pieza | Por qué queda sin objeto | Qué la reemplaza |
|---|---|---|
| Regla de orden de fusión (E1-2) y **DH-13** | ADMIN-01 ya está en `main`; ningún commit de FORO-01 entró antes | Nada: queda cumplida. Cuándo entra FORO-01 a `main` es DH-16 (§E7.8) |
| **DH-14** (el commit de fusión de `main` en 01b, hecho por el humano, con sus condiciones de E3-4, E5-2 y E5-5) | La rama nace de `fd4a7ad`: no hay fusión. La excepción a "un commit por subentrega" no se usa | Nada. Un commit por subentrega, sin excepción |
| **DH-10 (a)** (todo el frontend después de fusionar ADMIN-01) | Cumplida: ADMIN-01 está en `main` | El frontend va en 01c1 a 01e (§E7.1) |
| §D-X (cruce con ADMIN-01) y su tabla | No hay dos ramas que crucen | La clase archivada pasa a 01a (§E7.3, "Backend") |
| §D-R0 01b, paso 0 (la fusión, las reglas de resolución, los siete archivos de cruce y `git show --remerge-diff`), C-3 y C-4 de la fusión y el C-5 condicional | Sin fusión | Los C-n de §E7.5, escritos contra el árbol de hoy |
| Las "Enmiendas de arranque" de 01b a 01e (E1-23, N-10, R-08) | Se pensaron porque la base fusionada no existía. Hoy existe: es `fd4a7ad` | Los inventarios por grep de §E7.5, hechos sobre `fd4a7ad`, y la comprobación de arranque del tester (§E7.5.0) |
| La partición 01a1 / 01a2 / 01b / 01c / 01d / 01e (§D-0.2, E3-2) | Se cortó por el cruce con ADMIN-01 y antes de las reglas nuevas | §E7.1 (DH-15) |
| Preguntar por la otra copia antes de cada suite (§D-R0, "Regla para todas las subentregas"; pasos 10 y 15) | Una sola copia de trabajo | La regla de `AGENTS.md`, "Nunca se corren dos suites a la vez", dentro de esta copia. Si el humano vuelve a usar la copia B, "Trabajo en paralelo" aplica de nuevo |
| R-03 (calendario), R-04 (migraciones intercaladas con las de ADMIN), R-09 (commit de fusión en rojo) y R-10 (orden de fusión) | Las migraciones de FORO se crean hoy, después de las tres de ADMIN-01 (`20261104234335`, `20261105163205`, `20261109150104`); no hay fusión | — |
| La PARADA de 01b "si el conteo de borrado de ADMIN cuenta las actividades por `publicaciones.tipo`…" | Resuelta sin PARADA: `contarParaBorrar` (`adapters/db/borrado-de-clase.ts:26-54`) cuenta `tarea.count({ claseId })`, las entregas con `fecha_entrega` y las calificadas, así que el foro, su principal y su calificación entran solos | FORO-1B08 lo prueba (§E7.4, 01b) |
| La ronda 0 detenida de 01a1 y su P-01a1-2 (corridas de la otra copia) | La ronda se detuvo; no hay otra copia | La ronda 0 de 01a, con C-1, C-2 y C-6 reescritos (§E7.5). C-1 y C-2 de aquella ronda **no están en el árbol** (`aprobacion.md`, "Rearranque") |
| Los detalles "para la Enmienda de arranque de 01b" | §E7.6 | — |

### §E7.1. Subentregas (DH-15) y conteo estimado de archivos

**(Enmienda 8)** Esta tabla queda reemplazada por §E8.3: 01a ~32 (§E8.1); 01c1 pasa a ser la sección "Foro" (~23) y 01c2, los hermanos, el formulario y las vistas (~25); 01e ~27 (con C-16). 01b y 01d no cambian. Lo de abajo queda como historial.

Regla de `AGENTS.md` (2026-11-04): una subentrega se parte solo si pasa de unos 30 archivos tocados. Cada conteo incluye producción, pruebas nuevas, pruebas normales de la lista cerrada y `*.ataque` de los C-n; el detalle archivo por archivo está en §E7.5.

| Sub | Base | Paquetes | Contenido | Archivos |
|---|---|---|---|---|
| **01a** · núcleo del foro | `fd4a7ad` | `shared`, backend (y una `*.ataque` del frontend) | Las dos migraciones; `core/actividades.ts` y `core/foros/participacion.ts` (la regla tardía); los textos por actividad en `core/tareas` y `core/calificaciones`; `tipo` en `leer/crear/editar/borrarTarea` y en `entregas.ts`; `listarPublicaciones` sin foros; `adapters/db/foros.ts`; `handlers/foros.ts` con las **16 rutas y su política de clase archivada** (antes en 01b); la tabla de ADM-1A09 | ~31 (18 de producción, 9 pruebas nuevas, 1 normal de la lista cerrada y 3 `*.ataque`) |
| **01b** · lo que completa el backend | commit de 01a | `shared`, backend (y una `*.ataque` del frontend) | La ruta 17 (el admin borra participaciones y réplicas; antes 01a2); "Actividades" con foros (`conForos`, `temas.ts`, `listarTrabajo` y el texto de categorías; antes 01a1); `conTipo` en el gradebook y en "Mis calificaciones" (antes 01b); los README; el foro ante el borrado definitivo, el duplicado y la baja de cuentas | ~30 (18 de producción, 5 pruebas nuevas, 4 normales y 3 `*.ataque`) |
| **01c1** · hermanos y formulario | commit de 01b | frontend | Los hermanos T-01 a T-05 de CLASES-03d; los vecinos sin caso de CH6-A14 en la tarea nueva y su edición (ESTADO §3); PR-1A17; `tipo` en `FormularioTarea` y `AccionesDeLaTarea`; la traducción de errores del foro (§E7.3, "Frontend", punto 6) | ~14 (8 de producción, 4 pruebas nuevas, 1 normal y 1 `*.ataque` condicional) |
| **01c2** · el foro y su sección | commit de 01c1 | frontend | La sección "Foro" y su lista; crear, editar, ver y borrar un foro; las rutas; la clase archivada en el foro | ~30 (15 de producción, 6 pruebas nuevas, 6 normales y 3 `*.ataque`) |
| **01d** · Actividades, participaciones y réplicas | commit de 01c2 | frontend | "Actividades" con foros (`conForos=si`, insignia, "Crear foro", "Mover"); los textos de categorías; la participación principal, las réplicas, "Tu participación" y "Borrar" del admin | ~27 (16 de producción, 6 pruebas nuevas, 2 normales y 3 `*.ataque`) |
| **01e** · calificar y enlaces | commit de 01d | frontend y `docs/DESIGN.md` | "Participantes", la participación de un alumno con el panel de calificación, la devolución, la calificación en "Tu participación", los vecinos sin caso de CH6-A14 en el panel, los enlaces por tipo del gradebook y de "Mis calificaciones", el .xlsx con un foro; `DESIGN.md` | ~26 (17 de producción, 6 pruebas nuevas, 2 normales y 1 `*.ataque`) |

**Orden:** 01a → 01b → 01c1 → 01c2 → 01d → 01e. Un commit por subentrega. Ninguna espera a otro encargo.

**Por qué cada corte (cuentas de las partes juntas):**
- **Backend (01a / 01b).** Todo el backend junto son unos 61 archivos (lo de 01a1, 01a2 y 01b de antes, más la tabla de ADM-1A09). Se corta en dos de unos 30. **La política de clase archivada no puede esperar a 01b:** `clases-archivadas-matriz.integracion.test.ts` (ADM-1A09 (a), ya en `main`) exige que toda ruta con `:claseId` de `printRoutes` esté en su tabla, así que se pone roja en el mismo momento en que `app.ts` registra el foro. Para que 01a no pase de unos 30 con la política dentro, "Actividades" con foros pasa de 01a1 a 01b: sale de 01a con `shared/src/recursos.ts`, `adapters/db/temas.ts`, `adapters/db/categorias.ts` y sus pruebas, y `conForos` pasa de C-6 a C-7. La alternativa (la partición vieja más la política: 01a ~34 y 01b ~23) es la opción (b) de DH-15.
- **01b / 01c1:** juntas, unos 44.
- **01c1 / 01c2:** juntas, unos 44. Es la regla de corte de 01c que ya preveía E2-3 (N-12): la base de hoy suma a 01c cinco pruebas de secciones, CH4-01, CH6-A30, V-06, dos `*.ataque` de `features/clases` y los vecinos de CH6-A14 de ESTADO §3 (§E7.5). El corte es el de E2-3: primero los hermanos, PR-1A17 y `tipo` en los componentes; después las vistas, la sección y el router.
- **01c2 / 01d:** juntas, unos 57. **01d / 01e:** juntas, unos 53.
- **01c1 queda en ~14.** No se junta con 01b (paquetes distintos y 44 archivos) ni con 01c2 (44).

**Los ids de las pruebas no cambian al moverse de subentrega (Enmienda 7):** el prefijo dice dónde nacieron en el plan, no dónde se implementan. FORO-1B01 a FORO-1B05 (la clase archivada) van en 01a; FORO-1A25 y FORO-1A26b ("Actividades" y categorías) y FORO-1A60 a FORO-1A70 (el borrado de participaciones) van en 01b; FORO-1B07 (`migrate diff`) va en el resumen de 01a.

### §E7.2. Reanclaje a `fd4a7ad`

Leído en el árbol de hoy. "Igual" = lo que el plan cita sigue en su sitio y dice lo mismo. Las líneas de las pruebas vigiladas que este rearranque no abrió se citan por el id de su caso; el tester las ubica por el título.

| Lo que el plan cita | Hoy | Efecto en el plan |
|---|---|---|
| `shared/src/index.ts:100-101` (`./dudas.js` y `./errores.js`) | Igual | Ninguno |
| `shared/src/tareas.ts`: `idOpcionalSchema` (`:182`, sin exportar), `trabajoQuerySchema` (`:267`), `SECCIONES_DE_TEMAS` (`:277`), `temasQuerySchema` (`:279`), `elementoDeTrabajoSchema` (`:283`, `z.object`) | Igual | Ninguno (el `conForos` pasa a 01b) |
| `shared/src/recursos.ts:22` (`trabajoQuerySchema.shape.tema`) | Igual | Pasa a 01b con `conForos` |
| `shared/src/calificaciones.ts:102` y `:164` (`z.strictObject`) | Igual | `tipo` dentro de la declaración (vigilada CAL-1B08, §E7.6) |
| `core/autoria.ts:12-19` (`puedeBorrar`) | Igual | Ninguno |
| `core/clases/archivada.ts` (nuevo de ADMIN-01): `"lectura"`, `"lectura-del-alumno"`, `"gestion"`; sin declarar, cerrada para todos | Como lo suponía §D-7 | La política va en 01a (§E7.3) |
| `middleware/index.ts:14-22` (`OpcionesProtegido.enClaseArchivada`) y `:48-58` (exige `pertenencia`; `"gestion"` solo con `roles: ["admin"]`) | Como lo suponía §D-7 | Ninguno. FORO-01 sigue sin tocar `middleware/` |
| `handlers/tareas/tareas.ts:121-137` (forma de `protegido({…, enClaseArchivada: "lectura" })` en varias líneas) | Nueva forma de ADMIN-01 | `handlers/foros.ts` la copia; FORO-1A51 la busca con el regex de CAL-1B08 (§E7.3) |
| `handlers/calificaciones.ts:39` (`columnaParaResponder`), `:99-104` (gradebook, `"lectura"`), `:131-136` ("Mis calificaciones", `"lectura-del-alumno"`), `:167-172` (exportación, `"lectura"`); tres `app.get` | Igual a lo supuesto, con la política de ADMIN | Ninguno |
| `adapters/db/tareas.ts`: `leerTarea` `:197`, `crearTarea` `:283` (`tipo: "tarea"` en `:313`), `editarTarea` `:393` (`FOR NO KEY UPDATE OF t` en `:425`), `borrarTarea` `:544` (`FOR UPDATE OF t` en `:565`), `listarTrabajoCon` (`esMaterial` en `:684-698`), `listarTrabajo` `:708`; dos `instantaneaUnica: true` | Igual | Ninguno |
| `adapters/db/entregas.ts`: `SELECT_ENTREGA` `:132`, `calificacionDe` `:154`, `alumnoInscrito` `:210` (`activo: true`), `existeLaTarea` `:222`, `leerMiEntregaCon` `:230`, `bloquearTareaParaEntregar` `:295`, `asegurarFilaDeEntrega` `:314`, `bloquearTareaParaCalificar` `:336`, `bloquearEntrega` `:361` (antes citado como `:361-372`), `calificarEntrega` `:523`, `listarEntregasCon` `:652`, `leerEntregaDeAlumnoCon` `:723`, `listarHiloPrivadoCon` `:818`; cuatro `instantaneaUnica: true` | Igual | Ninguno |
| `adapters/db/publicaciones.ts:31` (`PublicacionDb.tipo`) y `:207` (`donde`) | Igual | Ninguno |
| `adapters/db/temas.ts:41` (`TIPOS_CON_TEMA`), `:90` (`FILTRO_DE_LA_SECCION`), `:98` (`listarTemasDeLaSeccion`), `:195` (`moverATema`) | Igual | Pasa a 01b |
| `adapters/db/errores.ts:49` (`traducirErrorPrisma`, solo `alDuplicar`) | Igual. Llamadas: `clases.ts:124`, `inscripciones.ts:241`, `maestros-de-clase.ts:128`, `usuarios.ts:74,176,250` y, nueva de ADMIN-01, `gestion-de-usuarios.ts:253`; ninguna con la opción nueva | El grep de §D-R0 01a2 suma `gestion-de-usuarios.ts:253`; no cambia nada |
| `adapters/db/borrado-de-clase.ts` (ADMIN-01): `contarParaBorrar` y `borrarClaseDefinitivamente` (las claves de todos los archivos de la clase, los `trabajo_id` de sus tareas, la cascada desde `clases`) | Nuevo | El foro se cuenta y se borra sin cambiar ADMIN-01 (§E7.3) |
| `adapters/db/duplicado-de-clase.ts` (ADMIN-01): copia temas, categorías y materiales de aprendizaje (`tipo: "material"`) | Nuevo | El foro no se copia (P-10) (§E7.3) |
| `adapters/db/calificaciones.ts:29` (`ColumnaDelGradebookDb`), `:99` (`SELECT_TAREA`), `:107` (`columnaDe`); las consultas filtran `usuarios.activo` (`:189`, `:211`, `:294`) | Igual | Ninguno |
| `schema.prisma`: `TipoPublicacion` (`:50-56`: anuncio, material, tarea); `Usuario` termina sus relaciones en `dudasResueltas` (`:117`) y siguen los índices, incluidos los de ADMIN-01 (`:119-126`); 19 migraciones, las tres últimas de ADMIN-01; el CHECK `publicaciones_titulo_segun_tipo` sigue siendo el de `20261006151533_tareas_temas_y_categorias` | Igual a lo que suponía §D-1.2 | Las dos migraciones de FORO llevan una marca posterior a `20261109150104`; la relación nueva de `Usuario` va después de `dudasResueltas`, antes de los índices |
| ESSENTIALS, viñeta "Foro" (antes "línea 127") | Hoy en la línea 133 | Solo la cita (DH-02 (b), §D-2.5) |
| `DESIGN.md` §7.32 y §7.33 | Ahora son "Clase archivada y clases anteriores" y "Dashboard, usuarios y ficha" (ADMIN-01) | El patrón del foro va en **§7.34** (A-06) |
| `features/clases/data.ts:593-604` (`SECCIONES_DE_LA_CLASE`, seis, "Sin «Foro»") | Igual | "Foro" tercera (01c2; **(Enmienda 9)** 01c1, §E8.3) |
| `features/clases/lib.ts:114-128` (`indiceDeSeccionActiva`) | `tareas/:id` **no** activa "Actividades" (su segmento es `trabajo`) | Por la regla condicional de §D-8.1, "Foro" queda activa en `foro` y no en `foros/:id` (§E7.3) |
| `features/clases/components/fila-de-entrega.tsx` | Ya recibe `destino`; el `sr-only` "Tarea:" es fijo | Gana una prop opcional para "Foro:" y la insignia (01c2; **(Enmienda 9)** 01c1, §E8.3) |
| `features/tareas/data.ts:159-195` (`CODIGOS_CON_MENSAJE_DEL_SERVIDOR`, 15; `TRADUCCION_DE_ERRORES_TAREAS`, con `TAREA_NO_ENCONTRADA` → "Esa tarea ya no existe." fijo y `textosPorCampo` de `claseId`, `tareaId` y `alumnoId`) | Igual | El foro necesita su propia traducción (§E7.3, "Frontend", punto 6) |
| `features/tareas/hooks.ts`: `pedirDeNuevoLaTarea` `:132`, `marcarViejoElDetalleAnteClaseArchivada` `:159` (ADMIN-01), `useCrearTarea` `:173`, `useEditarTarea` `:196`, `useBorrarTarea` `:225`, `useAvisoDeRecargaFallida` `:267` (atado a `claveTarea`) | Igual, con lo de ADMIN-01 y CHORE-06 | §E7.3 |
| `components/foco/` (`useFocoAlCargarMas`, `useFocoAlPerderseElControl` con `incluirDialogos`, `focoPerdido`) y `components/seccion/` (`useAlPulsarLaSeccionActiva`, `useRecargarAlPulsarLaSeccion`, `useMarcarViejaSiQuedoEnError`) | Subieron en ADMIN-01 y CHORE-06 | El foro los usa (§E7.3) |
| `features/clases/lib.ts:745` (`conservaLaListaTrasLaPagina`) y `features/clases/hooks.ts:1348` (`useListaConservadaTrasLaPagina`) | Viven en `features/clases` | Los usa la lista de foros (en `features/clases`); `features/tareas` no puede importarlos (regla 9) y sigue el patrón de Entregas (§E7.3) |

### §E7.3. Lo que cambia en el diseño

**Backend**
1. **La clase archivada va en 01a** (antes §D-7, en 01b). `handlers/foros.ts` declara `enClaseArchivada: "lectura"` en las 10 lecturas (rutas 2, 3, 6, 7, 8, 10, 12, 13, 14 y 15) desde que nace, con la forma de `handlers/tareas/tareas.ts:121-137`; las escrituras (1, 4, 5, 9, 11 y 16, y la 17 en 01b) no la declaran, así que quedan cerradas para todos. FORO-1A51 busca cada cadena con el patrón de CAL-1B08 (`calificaciones-lecturas-estatico.test.ts:79-84`): por ejemplo, `/app\.get\(\s*"\/clases\/:claseId\/foros",\s*protegido\(\{\s*roles: \["estudiante", "maestro", "admin"\],\s*pertenencia: "inscripcion",\s*enClaseArchivada: "lectura",?\s*\}\)/`. FORO-1B01 a FORO-1B05 van en 01a. La tabla de ADM-1A09 suma las 16 rutas en 01a y la 17 en 01b (§E7.5).
2. **Borrado definitivo de una clase con foros (ADMIN-01):** sin cambio en ADMIN-01. El conteo cuenta el foro entre las actividades, la participación principal entre las entregas y su calificación entre las calificaciones; la cascada desde `clases` se lleva `publicaciones` → `tareas` → `participaciones_foro` (por `foro_id`, y las réplicas también por `principal_id`), `entregas`, `puntajes_rubrica`, los comentarios de la devolución y `criterios_rubrica`; los objetos de los adjuntos del planteamiento entran en `BORRAR_OBJETOS` (leen `archivos` por `clase_id`), y el recordatorio del foro se cancela con los de las tareas (`trabajo_id`). Las réplicas no se nombran en el diálogo (DH-17). FORO-1B08 (01b) lo prueba.
3. **Duplicar una clase con foros (ADMIN-01, P-10):** el foro no se copia, como ninguna actividad: la consulta de duplicar solo lee materiales de aprendizaje. Caso nuevo FORO-1B09 (01b).
4. **Baja y reactivación de cuentas (ADMIN-01, P-01 a′):** la baja es lógica (`activo = false`) y `participaciones_foro.autor_id` es `RESTRICT` sin índice, como `comentarios.autor_id`: nada borra usuarios (lo vigila `lecturas-fx-r2.ataque`, O-4). Las participaciones y réplicas de una cuenta dada de baja siguen en el foro con su nombre y sin marca, como las dudas y los comentarios (DH-18). El alumno dado de baja sale de "Participantes", del gradebook y de la exportación, como hoy de "Entregas", porque esas consultas ya filtran `activo`; reactivarlo lo devuelve con todo. Un maestro con clases activas no se da de baja (`409 MAESTRO_CON_CLASES`); en una archivada se queda y sus foros siguen la regla de autoría de las tareas ("salvo que ese maestro ya no dé la clase"). Caso nuevo FORO-1B10 (01b).
5. **Gradebook, riesgo, "Mis calificaciones" y exportación:** sin cambio respecto a §D-1.1. En una clase archivada, "Mis calificaciones" es `"lectura-del-alumno"`: el alumno ve la columna del foro en "Clases anteriores", sin enlace (S-04 de ADMIN-01; FORO-1E12).
6. **Lo de 01b que no cambia de diseño:** la ruta 17 (§D-11), `conForos` (§D-3.2, §D-3.3), `conTipo` (§D-6) y los README; solo cambian de subentrega.

**Prisma (01a; M-03 sin cambio)**
- Las dos migraciones son las de §D-1.2 y "Cambios por capa", con una marca posterior a `20261109150104_admin_01_usuarios_y_movimientos`: ya no pueden quedar intercaladas con las de ADMIN-01 (R-04, sin objeto). Nombres esperados de los índices (Prisma, menos de 63 caracteres): `participaciones_foro_foro_id_principal_id_creado_en_id_idx`, `participaciones_foro_principal_id_creado_en_id_idx` (el que nombra FORO-1A15) y `participaciones_foro_foro_id_autor_id_creado_en_id_idx`; a mano, `participaciones_foro_una_principal`.
- Siguen siendo **PARADA con su SQL antes de cada `prisma migrate dev`** (E3-5), y `migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` después de aplicar las dos (FORO-1B07, en el resumen de 01a).
- La migración de prueba (FORO-1A10) aplica "hasta la anterior" = hasta `20261109150104`, en un esquema aparte.

**Frontend**
1. **Secciones (01c2; (Enmienda 9) 01c1, y la parte de `foros/:foroId` del router real en 01c2, §E9.5):** "Foro" tercera de siete en `SECCIONES_DE_LA_CLASE`, para los tres roles. Activa en `foro` y en sus subrutas, **no** en `foros/:foroId` (como "Actividades" con `tareas/:id`; §D-8.1, regla condicional, resuelta). FORO-1C01 se lee así. El indicador medido de §7.3 no cambia. En la rama del estudiante del router, `foros/nuevo` lleva a `/login`, como `tareas/nueva` (`app/router.tsx:107`).
2. **La clase archivada:** cada control de escritura del foro lee `useSoloLecturaDeLaClase()` (`components/clase/hooks.ts`) y no se pinta en una archivada. Un `409 CLASE_ARCHIVADA` en una mutación del foro usa `marcarViejoElDetalleAnteClaseArchivada` (`features/tareas/hooks.ts:159`): un solo aviso, lo escrito se conserva y el detalle de la clase se marca viejo (`exact: true`, `cancelRefetch: false`). Crear y editar un foro en una archivada pintan el texto de archivada y "Volver a Foro", como `crear-tarea-view.tsx` y `editar-tarea-view.tsx`.
3. **Lo abierto es del id de la ruta (CHORE-06):** toda vista del foro se monta de nuevo al cambiar cualquiera de los ids de su ruta:
   - `ForosView` (`clases/:claseId/foro`): render prop de una línea con `key={claseId}` (CH6-A30 (a)). Sin memoria de foco por clase, así que no entra en la lista `SIN_KEY_EN_EL_RENDER_PROP`.
   - `CrearForoView`: `key={claseId}`.
   - `ForoView` y su bloque: `key={foro.id}` en el bloque del detalle (como `detalle-tarea-view.tsx`, `key={tarea.id}`); `EditarForoView`: `key={foroId}`.
   - `ParticipantesView`: `key={foroId}` en su lista (como `<ListaDeEntregasDeLaTarea key={tareaId}`); `ParticipanteView`: ``key={`${foroId}:${alumnoId}`}`` (el mismo alumno participa en cada foro; como `entrega-de-alumno-view.tsx`).
   - Dentro de `ForoView`: cada `ParticipacionDelForo` lleva `key={participacion.id}`, y su bloque de réplicas, su formulario de réplica y su confirmación de "Borrar" son de esa participación.

   CH6-A30 (c) suma `foro-view.tsx`, `editar-foro-view.tsx`, `participantes-view.tsx` y `participante-view.tsx` (lista cerrada de 01c2 y 01e). Casos FORO-1C52 y FORO-1E52 (§E7.4).
4. **Guardas de doble clic (CHORE-04):** toda acción que lanza una mutación tiene un manejador con nombre del componente dueño, con la guarda síncrona con ref antes de `mutate` (en un formulario, después de `preventDefault()` y antes de `isPending` y de `reset()`), que se toma justo antes de `mutate` y se suelta en su `onSettled`. Además usa `enEspera`. Los botones: "Publicar foro", "Guardar cambios", "Sí, borrar foro", "Borrar con las participaciones", "Publicar participación", "Publicar réplica", "Sí, borrar participación", "Sí, borrar réplica" y "Publicar calificación". Ninguna `mutationKey` lleva un id de la ruta en un componente que sobreviva a su cambio (todos llevan `key`). Ninguno reenvía con un solo clic sobre el control montado de nuevo sin volver a confirmar o escribir: no hace falta leer la caché de mutaciones. `crear-foro-view.tsx` y `editar-foro-view.tsx` llaman a `mutateAsync` dentro de `onGuardar`, que corre en `handleGuardar` de `FormularioTarea` (toma `guardandoRef`), así que CH4-01 suma esas dos llamadas a `EXCEPCIONES` (lista cerrada de 01c2), como las de la tarea. Todo «Ver más» del foro: `enEspera={isFetching}`, `fetchNextPage({ cancelRefetch: false })` y guarda con ref. **Ninguna vista del foro lee `isFetchingNextPage`** (CH4-04): el foco tras «Ver más» va con `useFocoAlCargarMas`; si hiciera falta leerlo, PARADA. Cada guarda se comprueba quitándola (mutación real, restaurada), según `AGENTS.md`, "Pruebas".
5. **Políticas de recarga y listas (CHORE-06, `DESIGN.md` §7.10):**
   - **`ForosView` (en `features/clases`) sigue a `DudasView`** (`dudas-view.tsx`) en todo lo de la lista: `useListaConservadaTrasLaPagina` ("Error de la página siguiente": un «Ver más» que falla por red o servidor conserva las filas, un solo aviso, «Ver más» sigue y el foco queda en el botón), `useRecargarAlPulsarLaSeccion` (pulsar "Foro" estando en ella vuelve a pedir, una sola vez, la lista en error o vieja, sin duplicar lo que vuela) y `useMarcarViejaSiQuedoEnError` (salir y volver antes del `staleTime` con la lista en error la pide). **Se retira el `removeQueries` de §D-8.2** ante el cursor vencido: lo cubren la política única y la recarga de las páginas. El texto de la lista cambiada y el error que quita el acceso reemplazan la lista, como en Dudas.
   - **Las listas de `features/tareas`** (principales, réplicas, "Participantes", lo que escribió un alumno y las devoluciones) no pueden importar los ganchos de `features/clases` (regla 9). Siguen el patrón de Entregas (`entregas-view.tsx:98-114`, que `DESIGN.md` §7.10 cuenta entre las listas que conservan también ante una recarga de fondo fallida). Un «Ver más» que falla conserva la lista con un solo aviso. Una recarga de fondo que falla con datos en caché conserva la lista y avisa una vez por fallo. El cursor vencido, el `404` del foro, del alumno o de la participación y el `403` reemplazan la lista o la vista, según la matriz de §D-10. Así no se mueve código compartido de `features/clases`; es una decisión del arquitecto, no una DH.
   - **La memoria va por consulta, no en el componente:** "ya avisé de este fallo" se guarda por consulta, como `ultimoFalloAvisado` (`features/tareas/hooks.ts:265`, `WeakMap` sobre la instancia de la caché); el conteo de réplicas plegado sale del mayor entre `participacion.replicas` y las réplicas del bloque en la caché (§D-8.4). El aviso de recarga fallida del foro reutiliza `useAvisoDeRecargaFallida`, que gana una variante que recibe la `queryKey` (hoy está atada a `claveTarea`); la firma de hoy no cambia.
6. **Traducción de errores del foro (nueva en E7; 01c1; (Enmienda 9) 01c2, §E8.3):** `TRADUCCION_DE_ERRORES_TAREAS` da "Esa tarea ya no existe." como texto fijo de `TAREA_NO_ENCONTRADA` y no conoce `foroId` ni `participacionId`. El foro tiene la suya en `features/tareas/data.ts`: `TRADUCCION_DE_ERRORES_FORO`, envoltorio de `lib/errores-de-api.ts`:
   - `generico`: el de las tareas;
   - `mensajesPorCodigo`: los de las tareas, con `TAREA_NO_ENCONTRADA` → "Ese foro ya no existe." y `PARTICIPACION_NO_ENCONTRADA` → "Esa participación ya no existe.";
   - `codigosConMensajeDelServidor`: los 15 de las tareas más `PARTICIPACION_YA_PUBLICADA`, `PARTICIPACION_CALIFICADA` y `FORO_CERRADO` (el servidor ya los manda con el texto del foro, §D-2.4);
   - `textosPorCampo`: `claseId` (sin acceso), `foroId` ("Ese foro ya no existe."), `alumnoId` (el de las tareas) y `participacionId` ("Esa participación ya no existe.").

   En `lib.ts`: `mensajeDeErrorForo`, `mensajeDeConsultaForo` y `erroresDelForoDeApi`. También las listas `CODIGOS_QUE_REEMPLAZAN_LA_VISTA_DEL_FORO` y `PREFIJOS_QUE_REEMPLAZAN_LA_VISTA_DEL_FORO` (`claseId:`, `foroId:`, `alumnoId:`). `FormularioTarea` con `tipo="foro"`, `AccionesDeLaTarea` con `tipo="foro"`, los ganchos del foro y `PanelDeCalificacion` con la actividad foro usan estas funciones. **`CODIGOS_CON_MENSAJE_DEL_SERVIDOR` de las tareas se queda en 15**, así que `errores-ch3.test.ts:44` y `errores-ch3-r1.ataque.test.ts:112` no cambian. La pregunta "¿el módulo ya tiene una función de traducción?" (`AGENTS.md`) se responde así: sí, `mensajeDeErrorTareas` y `mensajeDeConsultaTareas`, que cubren tareas, entregas y calificar; el foro suma la suya, del mismo contrato, porque sus textos fijos y sus ids son otros.
7. **Ninguno avisa ante un código con que `apiClient` redirige** (`CODIGOS_QUE_REDIRIGE_EL_CLIENTE`, `401` sin refresco, `403 ACCESO_RESTRINGIDO`, `403 CAMBIO_DE_CONTRASENA_REQUERIDO`). Cubre todo `onError`, todo «Ver más», todo aviso de recarga fallida y la descarga de los adjuntos del planteamiento (con `alFallarLaDescarga` de `AdjuntosDePublicacion`). Se usa `errorQueRedirigeElCliente`, de `features/tareas`, o su par de `features/clases`. Casos FORO-1C53, FORO-1D53 y FORO-1E53.
8. **Lo que ESTADO §3 manda a FORO-01:**
   - **(a) Fila "CHORE-06a (los 'sin caso' de CH6-A14)":** FORO-01 toca esos formularios, así que les pone sus casos:
     - en la tarea nueva y en su edición, "campo pintado solo en otro modo" y "rechazo del servidor seguido de uno local" (01c1; **(Enmienda 9)** 01c2);
     - en el panel de calificación, "rechazo seguido de uno local" (01e).

     Si alguno falla, el remedio va en el mismo archivo, que ya está en "Se toca".
   - **(b) Fila de ADMIN-01d1 y 01d2 ("revisar en FORO-01, que rehace esos ganchos"):**
     - El remedio de T-04 se extiende: `useEditarTarea` y su par del foro marcan vieja la consulta de la tarea o del foro ante un `409 TAREA_MODIFICADA` o `TAREA_CON_CALIFICACIONES` también con la clase archivada (`invalidateQueries` con `refetchType: "none"`), así que al restaurar y volver a abrir la edición se pide la versión del servidor (01c1; **(Enmienda 9)** 01c2).
     - Lo mismo, en 01e, para el `409` de calificar de la participante.
     - Recursos (ruta 20) es de `features/clases`, que FORO-01 no toca: esa parte se queda en la fila (A-07).
   - **(c) Las filas 400 y 401** (hermanos T-01 a T-05 y PR-1A17) siguen como en §D-0.1 y §D-8.6, en 01c1 (**(Enmienda 9)** en 01c2, §E8.3). **El remedio de T-05 respeta lo que hoy fijan las pruebas con la vista montada:** `detalle-tarea-view.test.tsx` PR-1D05 (`:517`, un `404` al borrar vuelve a pedir la tarea y la vista dice que no existe; `:541`, el `403 BORRADO_NO_PERMITIDO` la vuelve a pedir). Son vigiladas: `removeQueries` y "marcar vieja sin pedirla" son para la consulta sin observador (la vista ya desmontada o la edición de esa tarea). Si el remedio cambiara esos dos casos, PARADA.
9. **Patrones visuales nuevos** (la insignia "Foro", la fila de un foro, el control de réplicas, la participación con su firma y fecha y hora, "Tu participación"): se documentan en `DESIGN.md` en 01e (A-06), en **§7.34**, con la marca "propuesta (FORO-01)". El manager lo verifica en la revisión final.

### §E7.4. Pruebas requeridas: lo que se mueve y lo que se suma

Los casos de "Pruebas requeridas" siguen como están escritos, con estos movimientos y casos nuevos. Toda guarda que una prueba dice vigilar se comprueba quitándola (mutación real, restaurada); si la prueba pasa sin la guarda, se reescribe o se declara la redundancia (`AGENTS.md`, "Pruebas"). La matriz de §D-10 va en el primer resumen de cada subentrega con interfaz (01c1 a 01e).

**01a**
- Los casos de 01a de antes, **salvo FORO-1A25 y FORO-1A26b**, que pasan a 01b.
- FORO-1B01 a FORO-1B05 (la clase archivada), en `backend/test/foros-autorizacion.integracion.test.ts`.
- FORO-1B07 y el antiguo FORO-1A14: el `migrate diff` va en el resumen, con su comando y su salida.
- ADM-1A09 (a) a (e) en verde con las 16 rutas en su tabla (lista cerrada).
- FORO-1A51 busca la cadena exacta de cada ruta, con `enClaseArchivada` donde va (§E7.3, "Backend", punto 1).

**01b**
- FORO-1A25 y FORO-1A26b (en `backend/test/foros-actividades.integracion.test.ts`).
- FORO-1A60 a FORO-1A70 (el borrado de participaciones, §D-11).
- FORO-1B06 (`conTipo`).
- FORO-1B08 (borrado definitivo).
- ADM-1A09 con la ruta 17, "cerrada".
- Casos nuevos (en `backend/test/foros-admin-01.integracion.test.ts`, junto con FORO-1B08):
  - **FORO-1B09:** duplicar una clase activa y una archivada que tienen un foro con principal, réplica, calificación con desglose y un adjunto del planteamiento.
    - La copia no tiene ninguna publicación `foro`, ni filas en `tareas`, `participaciones_foro`, `entregas` o `puntajes_rubrica`.
    - Ningún archivo del planteamiento entra en la copia ni en `COPIAR_OBJETOS`.
    - La original queda intacta.
  - **FORO-1B10:** el admin da de baja, por la ruta de ADMIN-01, a un alumno con principal y réplicas en un foro.
    - Sus participaciones siguen en las rutas 8 y 10 con su nombre, sin `activo`, `cuentaDesactivada`, correo ni estado de pago (llaves exactas).
    - No sale en "Participantes" (12), y su participante (13) responde `404 ALUMNO_NO_ENCONTRADO`.
    - El gradebook y la exportación no lo cuentan.
    - Reactivarlo lo devuelve todo.
    - Además, un maestro dado de baja que sigue en una clase archivada conserva sus réplicas a la vista.

**(Enmienda 9, N-23)** Los dos encabezados de abajo ("01c1" y "01c2") son los de la Enmienda 7 y reparten los casos al revés que hoy. El reparto vigente de cada caso está en §E8.3, "Dónde va cada caso de 01c", con la precisión de FORO-1C01 de §E9.5: los casos de esta lista "01c1" van en **01c2** (salvo PR-1A17, que va en 01c1), y los de la lista "01c2" van en 01c1 o en 01c2 según §E8.3.

**01c1** *(Enmienda 9: historial; ver la nota de arriba)*
- FORO-1C04, en su parte de componente: `FormularioTarea` con `tipo="foro"` y sin `tipo`.
- FORO-1C10: la traducción del foro con `ENTRADAS_FUERA_DE_CONTRATO`.
- FORO-1C30 a FORO-1C36 (los hermanos).
- PR-1A17.
- Casos nuevos:
  - **FORO-1C40:** los vecinos sin caso de CH6-A14 en la tarea nueva y en su edición, con el campo que la tabla "CH6-A14: los 8 formularios por los 2 vecinos" de `docs/trabajo/CHORE-06-foco-y-navegacion/resumen-programador.md` nombra para cada formulario.
    - Un `400 VALIDACION` de un campo que el formulario pinta solo en otro modo da un solo mensaje legible.
    - Un rechazo del servidor seguido de un envío que la validación local rechaza deja leer solo el segundo mensaje.
    - En los dos, lo escrito se conserva y el botón sale de la espera.
  - **FORO-1C41:** un `409 TAREA_MODIFICADA` que llega con la clase ya archivada deja vieja la tarea sin pedirla. Al restaurar y volver a abrir la edición, se pide la tarea y el formulario nace con la versión del servidor, y el siguiente guardado no recibe otro `409` por la versión vieja (§E7.3, "Frontend", punto 8 (b)).
  - **FORO-1C43:** `TRADUCCION_DE_ERRORES_FORO` da:
    - "Ese foro ya no existe." a `TAREA_NO_ENCONTRADA` y a un `VALIDACION` de `foroId`;
    - "Esa participación ya no existe." a `PARTICIPACION_NO_ENCONTRADA` y a uno de `participacionId`;
    - el texto del servidor a los 18 códigos de su lista.

    La de las tareas no cambia: sigue con 15 códigos y "Esa tarea ya no existe.".

**01c2** *(Enmienda 9: historial; el reparto vigente está en §E8.3 y §E9.5)*
- FORO-1C01 (activa en `foro`, no en `foros/:foroId`; §E7.3, "Frontend", punto 1), FORO-1C02, FORO-1C03, FORO-1C05 a FORO-1C09, FORO-1C11 a FORO-1C14, FORO-1C20 a FORO-1C27 y FORO-1C37.
- Casos nuevos:
  - **FORO-1C50 (guardas):** dos clics en el mismo render en cada uno de estos controles dan una sola petición, y sin la guarda, dos: "Publicar foro", "Guardar cambios", "Sí, borrar foro", "Borrar con las participaciones" y "Ver más foros". La comprobación se hace quitando la guarda.
  - **FORO-1C51 ("Error de la página siguiente", §7.10):** "Ver más foros" que falla con `5xx` o sin red: la lista se queda, un solo aviso, "Ver más foros" sigue a la vista y el foco queda en el botón. Mientras una recarga la recupera (pulsar "Foro", volver o saltar de clase), la lista se ve sin mensaje de error; si esa recarga falla, la reemplaza.
  - **FORO-1C52 (lo abierto es del id):**
    - Con la confirmación de "Borrar foro" abierta en el foro A, saltar con el historial al foro B: no aparece abierta y ningún clic borra B.
    - La edición del foro A a medio escribir no pasa al B.
    - La lista de "Foro" de la clase A, con un "Ver más" en vuelo, no hereda su aviso al saltar a la clase B.
  - **FORO-1C53 (`apiClient` redirige):** con `401` sin refresco, `403 ACCESO_RESTRINGIDO` y `403 CAMBIO_DE_CONTRASENA_REQUERIDO`, no hay ningún aviso en estos caminos: crear, editar, borrar, "Ver más foros", la recarga del foro y la descarga de un adjunto.
  - **FORO-1C54 (política única):** pulsar "Foro" estando en ella, según el estado de la lista:
    - en error o vieja: una sola petición;
    - sana y fresca: ninguna;
    - con una petición en vuelo: no se cancela ni se duplica.

    Además, salir y volver antes de 30 s con la lista en error la pide.

**01d**
- FORO-1D01 a FORO-1D12, FORO-1D20 a FORO-1D38 y FORO-1D04b.
- Casos nuevos:
  - **FORO-1D50 (guardas):** lo mismo que FORO-1C50, en "Publicar participación", "Publicar réplica", "Sí, borrar participación", "Sí, borrar réplica", "Ver más participaciones" y "Ver más réplicas".
  - **FORO-1D51 (listas de `features/tareas`, patrón de Entregas):**
    - "Ver más" que falla con `5xx`: se queda la lista, con un aviso.
    - Recarga de fondo que falla con datos en caché: se queda la lista, con un aviso por fallo; dos fallos seguidos avisan dos veces y montar la vista con un fallo ya avisado no lo repite (memoria por consulta).
    - Cursor vencido: el texto de §D-9, sin "Ver más".
  - **FORO-1D52 (lo abierto es de la participación):** con el bloque de réplicas de A abierto, una réplica a medio escribir y la confirmación de "Borrar" abierta, saltar con el historial a otro foro y volver: no queda nada abierto, nada se envía al otro foro y el foco va a la raíz.
  - **FORO-1D53:** lo mismo que FORO-1C53, en publicar, replicar, borrar, "Ver más" y las recargas.
  - **FORO-1D54:** "Actividades" pide `conForos=si` y la política única sigue igual (FORO-1C54, en "Actividades de aprendizaje").

**01e**
- FORO-1E01 a FORO-1E14 y FORO-1E20 a FORO-1E35.
- Casos nuevos:
  - **FORO-1E40:** el vecino sin caso de CH6-A14 en el panel de calificación: un rechazo del servidor seguido de un envío que la validación local rechaza. Va con el panel de una tarea y con el de un foro.
  - **FORO-1E41:** un `409` de calificar que llega con la clase ya archivada deja vieja la participante sin pedirla. Al restaurar y volver a abrirla, se pide de nuevo.
  - **FORO-1E50 (guardas):** "Publicar calificación" del foro, "Ver más alumnos", "Ver más participaciones" (de un alumno) y "Ver más comentarios".
  - **FORO-1E52 (lo abierto es del id):** con el panel de calificación a medio llenar para el alumno A en el foro X, saltar con el historial al mismo alumno en el foro Y: lo escrito no se conserva ni se envía. Lo mismo entre dos alumnos del mismo foro.
  - **FORO-1E53:** lo mismo que FORO-1C53, en calificar, "Ver más" y las recargas de la participante.

### §E7.5. Qué se toca, qué no, listas cerradas y C-n, por subentrega (reemplaza a §D-R0)

#### §E7.5.0. Reglas para todas
- **Se toca** solo lo de la lista de la subentrega, más archivos nuevos de prueba y ayudas nuevas (`backend/test/ayudas-foros.ts`, o junto a sus pruebas en `frontend/src/`). Una ayuda existente solo gana exportaciones.
- **No se toca nada más**, en particular:
  - `infra/`, los `.env.example`, `AGENTS.md`, `CLAUDE.md` y `.claude/`;
  - `docs/` fuera de `docs/trabajo/FORO-01-actividad-tipo-foro/`, salvo `docs/DESIGN.md` en 01e (`docs/ESTADO.md` es del orquestador);
  - `backend/src/middleware/**`, `adapters/auth/`, `adapters/notifier/`, `adapters/queue/`, `config/` y `workers/`;
  - `handlers/tareas/*`, `handlers/clases/*`, `handlers/admin.ts`, `handlers/admin/*`, `handlers/archivos.ts`, `handlers/adjuntos.ts` y `handlers/respuestas-de-entrega.ts`;
  - `core/clases/*`, `core/usuarios/*`, `adapters/db/borrado-de-clase.ts`, `duplicado-de-clase.ts`, `clases-archivadas.ts` y `gestion-de-usuarios.ts`. **(Enmienda 8)** Se exceptúa la línea 8 de `core/clases/duplicado.ts`, que va en 01a (§E8.1);
  - `adapters/db/calificaciones.ts` y `exportacion-de-calificaciones.ts`, en 01a;
  - en `shared/src`: `entregas.ts`, `clases.ts`, `dudas.ts` y `usuarios-admin.ts`;
  - en el frontend:
    - `components/clase/*`, `components/seccion/*`, `components/foco/*`, `components/adjuntos/*` y `components/layout/*`;
    - `lib/errores-de-api*.ts`, `services/apiClient.ts`, `services/clasesService.ts` y `services/calificacionesService.ts`;
    - `features/clases/clase-layout.tsx`, todo `features/admin/**` y lo de Dudas (`dudas-view.tsx`, `components/elemento-de-duda.tsx` y `components/respuestas-de-duda.tsx`; DH-11 a);
  - todo `*.ataque.test.*` fuera de los C-n de su subentrega (solo el tester, en su ronda 0);
  - toda prueba normal fuera de la lista cerrada.
- **PARADA** si una prueba normal fuera de la lista falla o si hace falta tocar un archivo fuera de "Se toca".
- **Comprobación de arranque (reemplaza las "Enmiendas de arranque"):**
  - En la ronda 0 de cada subentrega, antes de aplicar sus C-n, el tester repite sobre la base de la subentrega los grep de la línea "Grep" de esa subentrega y cita en su reporte el comando y el resultado.
  - Si aparece una prueba que el diseño cambia y que no está en la lista cerrada ni en los C-n, **PARADA** hacia el arquitecto, con una enmienda corta como la Enmienda 6.
  - Si la lista "Se toca" tiene que crecer fuera de §E7.5, hace falta la aprobación escrita del humano (carril sensible, E1-23).
- **Suites por ronda (`AGENTS.md`):** en las rondas se corren la suite de los módulos tocados, más las pruebas que el plan nombra, y `lint`. La suite completa de cada paquete la corre el manager una vez, al cerrar la subentrega.
  - 01a y 01b tocan `shared/`: se verifican el backend y el frontend, uno después del otro, con `build` de `shared`.
  - Una sola copia de trabajo: no se pregunta por otra; sigue valiendo no correr dos suites a la vez.

#### §E7.5.1. 01a (base `fd4a7ad`)
**(Enmienda 8)** Lo que cambia de esta lista está en §E8.1:
- **Se toca** suma `backend/src/core/clases/duplicado.ts` (solo la línea 8), con lo que quedan 19 de producción.
- `publicaciones.ts` es "`listarPublicaciones` y `crearPublicacion`".
- **Pruebas nuevas:** FORO-1A08 va en `core/actividades.test.ts`.
- **Vigiladas** de §E8.1 y §E8.5.
- **Total:** ~32.

- **Se toca (18 de producción):**
  - `shared/src/foros.ts` (nuevo, §D-3.2, sin `puedeBorrar`);
  - `shared/src/tareas.ts` (**solo** exportar `idOpcionalSchema`);
  - `shared/src/index.ts` (el bloque `./foros.js` entre `./dudas.js` y `./errores.js`, `:100-101`, más `idOpcionalSchema` en el bloque de `./tareas.js`);
  - `backend/prisma/schema.prisma` y las dos carpetas nuevas de `backend/prisma/migrations/`;
  - `backend/src/core/actividades.ts` y `core/foros/participacion.ts` (nuevos), `core/tareas/tareas.ts` y `core/calificaciones/calificar.ts`;
  - `backend/src/adapters/db/actividades.ts` y `adapters/db/foros.ts` (nuevos), `adapters/db/tareas.ts` (solo `leerTarea`, `crearTarea`, `editarTarea` y `borrarTarea`; **`listarTrabajo` no cambia en 01a**), `adapters/db/entregas.ts`, `adapters/db/publicaciones.ts` (solo `listarPublicaciones`) y `adapters/db/index.ts`;
  - `backend/src/handlers/foros.ts` (nuevo: 16 rutas con su política) y `backend/src/app.ts`.
- **Pruebas nuevas (9):** `backend/src/core/foros/participacion.test.ts`, `backend/src/core/actividades.test.ts` y, en `backend/test/`, `migracion-foro-01.integracion.test.ts`, `foros.integracion.test.ts`, `foros-participaciones.integracion.test.ts`, `foros-calificar.integracion.test.ts`, `foros-cierre-de-tareas.integracion.test.ts`, `foros-autorizacion.integracion.test.ts` y `foros-estatico.test.ts`.
- **Lista cerrada de pruebas normales (1):**
  - `backend/test/clases-archivadas-matriz.integracion.test.ts:35-103` (ADM-1A09, `POLITICAS`). Suma, con el comentario `// FORO-01a (§E7.3; §D-3.1): las 16 rutas del foro; lectura las 10 que leen, cerradas las 6 escrituras.`:
    - **las 10 lecturas**, como `"lectura"`: `` [`GET ${C}/foros`] ``, `` [`GET ${C}/foros/:foroId`] ``, `` [`GET ${C}/foros/:foroId/mi-participacion`] ``, `` [`GET ${C}/foros/:foroId/mi-participacion/devoluciones`] ``, `` [`GET ${C}/foros/:foroId/participaciones`] ``, `` [`GET ${C}/foros/:foroId/participaciones/:participacionId/replicas`] ``, `` [`GET ${C}/foros/:foroId/participantes`] ``, `` [`GET ${C}/foros/:foroId/participantes/:alumnoId`] ``, `` [`GET ${C}/foros/:foroId/participantes/:alumnoId/participaciones`] `` y `` [`GET ${C}/foros/:foroId/participantes/:alumnoId/devoluciones`] ``;
    - **las 6 escrituras**, como `"cerrada"`: `` [`POST ${C}/foros`] ``, `` [`PUT ${C}/foros/:foroId`] ``, `` [`DELETE ${C}/foros/:foroId`] ``, `` [`POST ${C}/foros/:foroId/participaciones`] ``, `` [`POST ${C}/foros/:foroId/participaciones/:participacionId/replicas`] `` y `` [`PUT ${C}/foros/:foroId/participantes/:alumnoId/calificacion`] ``.

    Nada más cambia: las aserciones (b) a (e) recorren la tabla y siguen valiendo; la (d) sigue en 4.
- **Grep de la lista (comprobación de arranque):**
  - `printRoutes|rutasDeLaApp\(` en `backend/test`: 7 archivos. `sesiones-y-cadena.ataque` es C-1; `clases-archivadas-matriz` es la lista cerrada; los otros cinco son vigilados.
  - Las llamadas a `leerTarea|crearTarea|editarTarea|borrarTarea|listarEntregas|leerEntregaDeAlumno|listarHiloPrivado|calificarEntrega` y a las funciones de `core/` de §D-2.4: todas ganan un parámetro opcional con el valor de hoy y ninguna llamada cambia.
  - `tipo_publicacion|TipoPublicacion` en `backend/test`: solo `migracion-clases03a-r1.ataque:128`, que inserta tipos que existen, y las migraciones viejas, que aplican "hasta la suya".
  - `instantaneaUnica: true` en `adapters/db`: C-2.
- **C-n (el tester, en la ronda 0 de 01a, antes del programador):**
  - **C-1, `backend/test/sesiones-y-cadena.ataque.test.ts:585-750`.**
    - **Título:** `"bajo /api solo existen las rutas de AUTH-01, AUTH-02a, AUTH-03a, AUTH-03b, AUTH-03c, CLASES-a, CLASES-b, CLASES-c, CLASES-d, CLASES-02a, TAREAS-01a, TAREAS-01b, ENTREGAS-01b, ENTREGAS-01c, CALIFICACIONES-01a, CALIFICACIONES-01b, CLASES-03a, CLASES-03b, CALIFICACIONES-02a, ADMIN-01a, ADMIN-01b, ADMIN-01e y FORO-01a: ninguna crea admins; solo /admin/maestros, /admin/maestros/lote y /auth/registro-maestro crean maestros"`.
    - **Comentario, después del de ADMIN-01e (`:573-584`):** `// FORO-01a, C-1 (§E7.5.1; §D-3.1): se agregan exactamente las 26 entradas de las 16 rutas del foro bajo /api/clases/:claseId/foros: 10 GET con su HEAD (la lista, el foro, mi-participacion y sus devoluciones, las participaciones, las réplicas de una participación, los participantes, un participante, sus participaciones y sus devoluciones), 3 POST (el foro, la participación y la réplica), 2 PUT (el foro y la calificación de un participante) y 1 DELETE (el foro). Ninguna crea cuentas ni cambia roles y ninguna es pública. printRoutes anida /foros bajo /api/clases/:claseId; el análisis por sangría los reconstruye.`
    - **Entradas, en el orden de la lista:**
      - `"DELETE /api/clases/:claseId/foros/:foroId"`, después de `"DELETE /api/clases/:claseId/dudas/:dudaId/respuestas/:respuestaId"`;
      - los 10 GET, después de `"GET /api/clases/:claseId/dudas/:dudaId/respuestas"`: `…/foros`, `…/foros/:foroId`, `…/foros/:foroId/mi-participacion`, `…/foros/:foroId/mi-participacion/devoluciones`, `…/foros/:foroId/participaciones`, `…/foros/:foroId/participaciones/:participacionId/replicas`, `…/foros/:foroId/participantes`, `…/foros/:foroId/participantes/:alumnoId`, `…/foros/:foroId/participantes/:alumnoId/devoluciones` y `…/foros/:foroId/participantes/:alumnoId/participaciones`, cada una como `"GET /api/clases/:claseId…"`;
      - los 10 HEAD equivalentes, en el mismo orden, después de `"HEAD /api/clases/:claseId/dudas/:dudaId/respuestas"`;
      - `"POST /api/clases/:claseId/foros"`, `"POST /api/clases/:claseId/foros/:foroId/participaciones"` y `"POST /api/clases/:claseId/foros/:foroId/participaciones/:participacionId/replicas"`, después de `"POST /api/clases/:claseId/dudas/:dudaId/respuestas"`;
      - `"PUT /api/clases/:claseId/foros/:foroId"` y `"PUT /api/clases/:claseId/foros/:foroId/participantes/:alumnoId/calificacion"`, después de `"PUT /api/clases/:claseId/dudas/:dudaId/resuelta"`.

      El orden es el de `sort()`, igual al del ajuste de `e81ff10`.
    - Nada más cambia.
  - **C-2, `backend/test/lecturas-fx-r1.ataque.test.ts:758` y `:805-839`.**
    - **Título:** `"la opción solo se puede activar dentro de adapters/db: ningún archivo fuera de adapters/db nombra enTransaccion, instantaneaUnica o isolationLevel, index.ts no reexporta enTransaccion, isolationLevel solo vive en cliente.ts y la opción solo se pide en las veintinueve lecturas (cuatro de clases, una de clases archivadas, una del conteo de borrado, dos del muro, dos de tareas, cuatro de entregas, dos de calificaciones, dos de recursos, dos de dudas, una de la exportación, dos de gestión de usuarios, una de movimientos y cinco de foros)"`.
    - **Entrada, entre `"adapters/db/exportacion-de-calificaciones.ts:1"` y el comentario de ADMIN-01e que precede a `"adapters/db/gestion-de-usuarios.ts:2"`:** el comentario `// FORO-01a, C-2 (§E7.5.1; §D-3.4): listarForos, leerMiParticipacion, listarParticipaciones, listarReplicas y listarParticipacionesDeAlumno corren en la instantánea única. El conteo es del texto del archivo; el número lo declara el programador.` y la entrada `"adapters/db/foros.ts:<n>"`, con `<n>` = 5 previsto.
    - Si `<n>` no es 5, el título dice la cifra real ("veinticuatro" más `<n>`, con `<n>` de foros).
  - **C-6, `frontend/src/lib/errores-ch3-r2.ataque.test.ts:231-254` (`INVENTARIO`).**
    - **Después de `"resuelta",`:** el comentario `// FORO-01a, C-6 (§E7.5.1; §D-3.2): los prefijos de shared/src/foros.ts; quitarRutaDelMensaje deja texto legible en los dos mensajes.` y las entradas `"foroId"` y `"participacionId"`.
    - **Comprobación de legibilidad**, que el tester cita en su reporte: `"foroId: foroId: debe ser un identificador válido"` → `"debe ser un identificador válido"`, y lo mismo con `participacionId`. `conTercero` sigue en `[]`.
    - **Cambia respecto de E6:** `"conForos"` pasa a C-7 (01b).
    - Se corre en el frontend: `npx vitest run src/lib/errores-ch3-r2.ataque.test.ts`.
- **Vigiladas (si cambian, PARADA):**
  - Las de §D-R0 01a1 (hilo-01c-r1, entregas-01b-r1, calificaciones-estatico, calificaciones-lecturas-estatico, exportacion-calificaciones-estatico, la parte de `tareas.ts` en lecturas-fx-r1, temas-01a-r1, bloqueo-usuario E6, arquitectura-cuentas-r1, temas-01a-r3, muro-c-r1, lecturas-fx-r2 en `:957-1001` y `:1072-1108`, las migraciones "hasta la suya", el CHECK en muro.integracion y migracion-tareas). Se exceptúan las de `conForos`, que pasan a 01b.
  - De ADMIN-01:
    - `clases-archivadas-r1.ataque.test.ts`: ADM-T1A09 (`:631-686`) recorre toda ruta con `:claseId` (el foro cae en sus 401 y 403 de siempre) y ADM-T1A10 (`:713-812`) no lista el foro;
    - `gestion-clases-autorizacion.integracion` PR-2A24;
    - `movimientos-inscripcion.integracion` PR-B16g, que pide una sola "movimiento" en `printRoutes`;
    - `recursos-autorizacion.integracion` CL3-A18;
    - las pruebas de borrado y de duplicado de clase.
  - `higiene-de-pruebas.integracion.test.ts:541-556`: solo `app.ts` obtiene la fábrica; `handlers/foros.ts` importa de `fastify` solo el tipo.
  - `frontend/src/lib/errores-ch3-r2.ataque.test.ts:257-276`, con C-6.
  - **Frontend:** ningún archivo de producción cambia; su suite y su `build` corren igual.

#### §E7.5.2. 01b (base: el commit de 01a)
- **Se toca (18 de producción):**
  - `shared/src/foros.ts` (`puedeBorrar` en `participacionSchema` y `replicaSchema`);
  - `shared/src/tareas.ts` (`conForos` con su `.transform`, `temaDeTrabajoSchema`, `foro` en `elementoDeTrabajoSchema.tipo`, `SeccionDeTrabajo` y `SeccionDeTemasConForos`; §D-3.2);
  - `shared/src/recursos.ts` (solo `:22`);
  - `shared/src/calificaciones.ts` (`conTipo` y `tipo`, dentro de los `z.strictObject` de `:102` y `:164`);
  - `shared/src/index.ts` (las exportaciones nuevas);
  - `backend/src/core/autoria.ts` (solo `puedeBorrarParticipacion`) y `core/foros/participacion.ts` (`efectoDeBorrarPrincipal`);
  - `backend/src/adapters/db/foros.ts` (`borrarParticipacion`, `puedeBorrar` y el `catch` de `publicarReplica`), `errores.ts` (`alFaltarReferencia`), `index.ts`, `tareas.ts` (solo `listarTrabajoCon` y `ElementoDeTrabajoDb.tipo`), `temas.ts`, `categorias.ts` (solo el texto del `409`, E1-9) y `calificaciones.ts` (`SELECT_TAREA` y `columnaDe`, §D-6);
  - `backend/src/handlers/foros.ts` (la ruta 17), `handlers/calificaciones.ts` (`columnaParaResponder` y `conTipo`), `handlers/README.md` y `adapters/README.md`.
- **Pruebas nuevas (5):** `backend/src/core/foros/borrado.test.ts` y, en `backend/test/`, `foros-borrar.integracion.test.ts`, `foros-actividades.integracion.test.ts` (FORO-1A25 y FORO-1A26b), `foros-tipo-en-calificaciones.integracion.test.ts` (FORO-1B06) y `foros-admin-01.integracion.test.ts` (FORO-1B08 a FORO-1B10).
- **Lista cerrada de pruebas normales (4):**
  1. `backend/test/clases-archivadas-matriz.integracion.test.ts:35-103`: suma `` [`DELETE ${C}/foros/:foroId/participaciones/:participacionId`]: "cerrada" ``, con el comentario `// FORO-01b (§D-11, S-E3-1): borrar una participación o una réplica (solo el admin) queda cerrado en una archivada.`
  2. `backend/src/adapters/db/errores.test.ts`: los casos de `alFaltarReferencia`. Los de hoy no cambian.
  3. `backend/test/foros-autorizacion.integracion.test.ts` (de 01a): FORO-1A49 y FORO-1A50 suman la ruta 17 y `puedeBorrar`, y FORO-1B01 suma la 17 (el admin recibe `409`; el alumno y el maestro, `403` del rol).
  4. `backend/test/foros-estatico.test.ts` (de 01a): FORO-1A51 suma la ruta 17 con su `protegido`; FORO-1A52 admite el `participacionForo.deleteMany`.
- **Grep de la lista:**
  - `traducirErrorPrisma\(` en `backend/src`: las siete llamadas de §E7.2, ninguna con la opción nueva.
  - `puedeBorrar\(` en las pruebas: ninguna con datos de un foro.
  - `columnaParaResponder|columnaDelGradebookSchema|tareaDeMisCalificacionesSchema` en `backend/test`: solo CAL-1B08, vigilada.
  - `trabajoQuerySchema|temasQuerySchema` en el backend y el frontend: `esquemas-tareas.test.ts:432-457` y `frontend/src/lib/errores-de-api.test.ts:463-470`, vigiladas.
  - `seccion=actividades` en `backend/test`: la respuesta no cambia sin `conForos`.
- **C-n:**
  - **C-1 bis, `sesiones-y-cadena.ataque.test.ts`.**
    - **Título:** el de C-1, con "…, ADMIN-01e, FORO-01a y FORO-01b: …".
    - **Comentario:** `// FORO-01b, C-1 bis (§E7.5.2; §D-11): se agrega exactamente DELETE /api/clases/:claseId/foros/:foroId/participaciones/:participacionId (solo el admin borra una participación o una réplica). No crea cuentas ni cambia roles y no es pública.`
    - **Entrada:** `"DELETE /api/clases/:claseId/foros/:foroId/participaciones/:participacionId"`, inmediatamente después de `"DELETE /api/clases/:claseId/foros/:foroId"`.
  - **C-3, `backend/test/lecturas-fx-r2.ataque.test.ts:957-1001`.**
    - **Título:** `"O-4: en backend/src solo se borran clases, movimientos de inscripción, inscripciones, asignaciones de maestro, publicaciones, comentarios, temas, categorías, criterios de rúbrica, puntajes de rúbrica, dudas y participaciones de foro; nada borra enlaces_registro ni usuarios"`.
    - **Comentario, en el encabezado, después del de ADMIN-01b:** `// FORO-01b, C-3 (§E7.5.2; §D-11): borrarParticipacion (adapters/db/foros.ts) borra una participación o una réplica con participacionForo.deleteMany; las réplicas de una principal caen en cascada. Lo que protege no cambia: sigue sin DELETE FROM ni TRUNCATE crudos y nada borra enlaces_registro ni usuarios.`
    - **Entrada:** `"participacionForo"`, entre `"movimientoInscripcion"` y `"publicacion"`.
  - **C-7, `frontend/src/lib/errores-ch3-r2.ataque.test.ts:231-254` (después de las entradas de C-6).**
    - **Comentario:** `// FORO-01b, C-7 (§E7.5.2; §D-3.2 y §D-6): conForos de shared/src/tareas.ts y conTipo de shared/src/calificaciones.ts; quitarRutaDelMensaje deja texto legible en los dos.`
    - **Entradas:** `"conForos"` y `"conTipo"`.
    - **Comprobación:** `"conForos: conForos: no es válido"` → `"no es válido"`, y lo mismo con `conTipo`.
- **Vigiladas:**
  - Las de 01a.
  - CAL-1B08 (`calificaciones-lecturas-estatico.test.ts`): `:77-88`, tres `app.get` y las cadenas exactas; `:90-108`, `columnaDelGradebookSchema` y `tareaDeMisCalificacionesSchema` siguen siendo `z.strictObject(`, con `tipo` dentro de la declaración y no con `.extend` (detalle de la verificación de la Enmienda 6).
  - CAL-1A18 (`calificaciones-estatico.test.ts:36-66`) y CAL2-A08 (`exportacion-calificaciones-estatico.test.ts:97-135`).
  - `esquemas-tareas.test.ts:432-457` (PR-1B06) y `frontend/src/lib/errores-de-api.test.ts:463-470` (CH3-A25): con la tubería, la salida conserva `tema`, `cursor` y `limite`.
  - `categorias.integracion:206-225`, `categorias-01a-r1.ataque:399-418` y `referencias-01b-r1.ataque:236`: el texto con solo tareas no cambia.
  - `temas-01a-r1.ataque` (`:985-1031` y `:1033-…`).
  - `core/autoria.test.ts`, y las de muro, dudas y recursos que usan `puedeBorrar`.
  - `lecturas-fx-r1.ataque`: 01b no suma `instantaneaUnica`.
  - `bloqueo-usuario` E6.

#### §E7.5.3. 01c1 (base: el commit de 01b)
**(Enmienda 8) Reemplazadas §E7.5.3 y §E7.5.4 por §E8.2 y §E8.3:**
- **01c1 nueva (la sección "Foro"):** la "Se toca" de la sección de §E7.5.4, más `features/clases/data.ts` por PR-1A17; la lista cerrada de §E8.2 (seis pruebas) y `como-se-entrega-01a.test.tsx:262`; C-9, C-10, C-11 y C-17 a C-20.
- **01c2 nueva (hermanos, formulario y vistas):**
  - "Se toca": la de esta sección, sin `features/clases/data.ts`, más las vistas del foro, `detalles-de-la-tarea.tsx`, `trabajoService.ts` y el router de §E7.5.4;
  - lista cerrada: CH4-01 y CH6-A30 (c) de §E7.5.4;
  - C-n: C-8 (condicional) y C-15;
  - vigiladas: las de esta sección y las de §E7.5.4 que aplican a las vistas.
- Lo de abajo queda como fuente de esas listas.
- **Se toca (8 de producción):**
  - en `features/tareas/`: `components/formulario-tarea.tsx` (T-02, T-03 y `tipo`), `components/acciones-de-la-tarea.tsx` (`tipo`), `editar-tarea-view.tsx` (T-01), `hooks.ts` (T-04, T-05 y §E7.3, "Frontend", punto 8 (b)), `data.ts` (los textos del formulario del foro y `TRADUCCION_DE_ERRORES_FORO`), `lib.ts` (las funciones de traducción del foro) y `types.ts`;
  - `features/clases/data.ts` (PR-1A17: sale `TEXTOS_FORMULARIO_PUBLICACION.sinTema`, `:540-542`, y `:656` pasa a `TEXTOS_DE_LA_CLASE.sinTema`).
- **Pruebas nuevas (4):** en `features/tareas/`, `hermanos-03d-01c.test.tsx` (FORO-1C30 a FORO-1C36), `vecinos-formulario-tarea-01c.test.tsx` (FORO-1C40 y FORO-1C41), `formulario-foro-01c.test.tsx` (FORO-1C04, en su parte de componente) y `traduccion-foro-01c.test.ts` (FORO-1C10 y FORO-1C43).
- **Lista cerrada (1):** `features/tareas/como-se-entrega-01a.test.tsx:262` (PR-1A17) lee `TEXTOS_FORMULARIO_RECURSO.sinTema`.
- **Grep de la lista:**
  - `TEXTOS_FORMULARIO_PUBLICACION\.sinTema`: solo esa prueba y `data.ts:656`.
  - `<FormularioTarea|<AccionesDeLaTarea`: `tipo` es opcional y vale `"tarea"`, así que ninguna llamada cambia.
  - Las pruebas de `features/tareas` que cuentan los `GET` de `/temas` o `/categorias`: `toBeGreaterThan(1)` en `formulario-tarea.test.tsx:664`, `:689` y `:714` y en `editar-tarea-view.test.tsx:321` (siguen valiendo), y `toHaveLength(2)` en `tareas-01a-r1.ataque.test.tsx:195` (C-8).
  - `CODIGOS_CON_MENSAJE_DEL_SERVIDOR`: sigue en 15.
- **C-n condicional:** **C-8, `features/tareas/tareas-01a-r1.ataque.test.tsx:176-195`.** Se aplica solo si, en la ronda 0, el remedio de T-02 y T-03 (pedir temas y categorías al abrir la edición) cambia el número de `GET …/temas` (`:195`, hoy 2) o el orden de las respuestas en secuencia (`:93`).
  - El tester ajusta **solo** esa cifra y esa secuencia, con el comentario `// FORO-01c2, C-8 (§E8.3; §D-8.6, T-02 y T-03): al abrir la edición se vuelven a pedir los temas; lo demás que protege el caso no cambia.` **(Enmienda 9, N-23)** C-8 va en 01c2, con los hermanos. *Antes:* "`// FORO-01c1, C-8 (§E7.5.3; …`"
  - Si cambia otra cosa, PARADA.
- **Vigiladas:**
  - Las que fijan la conducta con la vista montada: PR-1D05 (`detalle-tarea-view.test.tsx:287-560`, en especial `:517` y `:541`; §E7.3, "Frontend", punto 8 (c)), PR-1D04 (`editar-tarea-view.test.tsx:300-1166`), PR-1D03 (`formulario-tarea.test.tsx:641-725`), PR-1A13 (`conflicto-01a.test.tsx:265`), ADM-1D211 (`clase-archivada-01d2-tareas.test.tsx:531`) y CAL-T-93 (`editar-calificada-01c-r1.ataque.test.tsx:171`).
  - `errores-ch3.test.ts:44` y `errores-ch3-r1.ataque.test.ts:112` (siguen en 15).
  - CH4-01 (`lib/guardas-de-doble-clic-estatico.test.ts:134-139`, `guardandoRef` en `formulario-tarea.tsx`).
  - CH3-C13 (`lib/errores-de-api-estatico.test.ts`), `lib/estatico-ch3-r1.ataque` y CAL-1C12 (`features/tareas/estatico-01c.test.ts`: «Sin categoría» y «Sin tema» solo en `components/clase/data.ts`).
  - `tareas-01d-r1.ataque` a `tareas-01d-r4.ataque`.

#### §E7.5.4. 01c2 (base: el commit de 01c1)
**(Enmienda 9, N-23)** El encabezado es el de la Enmienda 7. Esta lista se reparte entre 01c1 (la sección) y 01c2 (las vistas) según la nota de §E7.5.3 y §E8.3.
- **Se toca (15 de producción):**
  - en `features/clases/`: `foros-view.tsx` (nuevo), `data.ts` (la sección "Foro" y los textos de la lista), `hooks.ts` (`useForos`), `types.ts` y `components/fila-de-entrega.tsx` (una prop opcional para "Foro:" y la insignia; sin ella, lo de hoy);
  - en `features/tareas/`: `foro-view.tsx`, `crear-foro-view.tsx` y `editar-foro-view.tsx` (nuevos), `components/detalles-de-la-tarea.tsx` (los textos de la política por prop opcional), `hooks.ts`, `data.ts`, `lib.ts` y `types.ts`;
  - `services/trabajoService.ts` (las claves y las consultas del foro, §D-8);
  - `app/router.tsx`.
- **Pruebas nuevas (6):** `features/clases/foros-01c.test.tsx` y `features/clases/recuperar-foros-01c.test.tsx`; en `features/tareas/`, `foro-detalle-01c.test.tsx`, `crear-editar-foro-01c.test.tsx` (FORO-1C05), `errores-foro-01c.test.tsx` (FORO-1C06 a FORO-1C09 y FORO-1C11) y `recuperar-foro-01c.test.tsx`. Los casos nuevos FORO-1C50 a FORO-1C54 van en el archivo de su vista.
- **Lista cerrada (6):**
  1. `features/clases/secciones-03c1.test.tsx:19-27` y `:153-160` (CL3-C01): la constante suma "Foro" después de "Actividades de aprendizaje", y el título pasa a "… ve las siete secciones en orden, con «Foro» tercera, …", sin el `queryByRole("link", { name: "Foro" })…toBeNull()`.
  2. `features/clases/clase-layout.test.tsx:381-383` (PR-2C08: `toHaveLength(7)`) y `:418-460` (PR-1E05: la lista de las tres perspectivas suma "Foro" tercera, y el título dice "siete secciones").
  3. `features/clases/lib.test.ts:295-306` (la lista de secciones) y `:321-349` (los índices: "Personas" 5 y "Calificaciones" 6, con sus comentarios).
  4. `features/clases/recursos-lib-03d.test.ts:163-169` (CL3-D26): "Recursos" es la cuarta sección, índice 3.
  5. `lib/guardas-de-doble-clic-estatico.test.ts:105-110` (`EXCEPCIONES`): suma `"/src/features/tareas/crear-foro-view.tsx#<mutación>.mutateAsync"` y `"/src/features/tareas/editar-foro-view.tsx#<mutación>.mutateAsync"`, con los nombres reales que declara el programador y el comentario `// FORO-01c2 (§E7.3, "Frontend", punto 4): corren dentro de handleGuardar de formulario-tarea.tsx, que toma la ref.`
  6. `lib/estado-por-id-estatico-ch6.test.ts:114-124` (CH6-A30 (c)): suma `expect(textoDe("tareas/foro-view.tsx")).toContain("key={foro.id}")` y `expect(textoDe("tareas/editar-foro-view.tsx")).toContain("key={foroId}")`.
- **Grep de la lista:**
  - `seis secciones|toHaveLength\(6\)|"Personas",|"Calificaciones",` en `features/clases`: los cuatro archivos de arriba y `heredados-02d-r1.ataque` (C-9). `indicador-03c1-r1.ataque`, `indicador-03c1-r2.ataque`, `recuperar-ch3.test` y `recuperar-ch3-r1.ataque` buscan las secciones por nombre: vigiladas.
  - `perspectivaDeRuta\(` en producción: C-10.
  - `enEspera=`: C-11.
  - `isFetchingNextPage`: ningún archivo nuevo lo lee (CH4-04).
  - Render props de `ConClaseDeLaRuta`: los nuevos llevan `key={claseId}` (CH6-A30 (a)).
- **C-n:**
  - **C-9, `features/clases/heredados-02d-r1.ataque.test.tsx:209-273`:** las tres listas esperadas suman `"Foro"` después de `"Actividades de aprendizaje"`, **(Enmienda 9, N-23: C-9 va en 01c1; el comentario literal lo dice)** con el comentario `// FORO-01c1 ronda 0 (C-9, §E8.2; §D-8.1): las tres perspectivas suman «Foro» en tercera posición (siete secciones). «Personas» pasa a la sexta posición y su medida simulada sale del mismo índice en la lista esperada. Sigue protegiendo lo mismo.`
  - **C-10, `features/clases/estatico-02c-r1.ataque.test.ts:123-133`:** suma `"/src/features/clases/foros-view.tsx"`, **(Enmienda 9, N-23: va en 01c1)** con el comentario `// FORO-01c1 ronda 0 (C-10, §E8.2; §D-8.2): foros-view.tsx la llama como dudas-view.tsx. Sigue protegiendo que nadie más la llame ni compare el pathname con un prefijo.` Solo si `ForosView` llama a `perspectivaDeRuta(`, como `dudas-view.tsx`; si no la llama, C-10 no se aplica.
  - **C-11, `styles/clases-r1.ataque.test.ts:206-383` (V-06):**
    - La cifra pasa de 90 a 90 más los `enEspera=` nuevos que declare el programador (91 previstos: "Ver más foros"; la vista del foro reutiliza los dos de `AccionesDeLaTarea`).
    - `fijos` suma `"/src/features/clases/foros-view.tsx": 1`, `"/src/features/tareas/foro-view.tsx": 0`, `"/src/features/tareas/crear-foro-view.tsx": 0` y `"/src/features/tareas/editar-foro-view.tsx": 0`.
    - Comentario `// FORO-01c1 ronda 0 (C-11, §E8.2): de 90 a <n> enEspera=, …`. **(Enmienda 9, N-23)** Va en 01c1. *Antes:* "`// FORO-01c2 ronda 0 (C-11, §E7.5.4): …`".
    - **(Enmienda 9)** La entrada de `fijos` en C-11 es solo `"/src/features/clases/foros-view.tsx": 1`. Las de las vistas del foro (`foro-view.tsx`, `crear-foro-view.tsx` y `editar-foro-view.tsx`, con 0) no se escriben: llegan en 01c2 y no llevan `enEspera=` (§E8.3).
    - El resto del caso no cambia.
- **Vigiladas:**
  - V-07 (vidrio): ningún archivo nuevo usa `vidrio*`; la fila del foro es `FilaDeEntrega`, que ya está en la lista.
  - CH4-02, CH4-03 y CH4-04; CH6-A30 (a) y (b); CAL-1C12.
  - Las pruebas del router (`app/router-01d.test.tsx` y `app/rutas-01d-r1.ataque.test.tsx`).
  - `features/tareas/avisos-al-redirigir-ch6.test.tsx` (CH6-A18) y las de la clase archivada de `features/tareas`.

#### §E7.5.5. 01d (base: el commit de 01c2)
**(Enmienda 8)** Sin cambio de conteo (~27). `features/tareas/hooks.ts` gana `useVerMasConservandoLaLista` (§E8.4). Suma como vigiladas `trabajo-view.test.tsx:444-472` y `clase-archivada-01d1-vista.test.tsx:520-524` (§E8.3).
- **Se toca (16 de producción):**
  - en `features/clases/`: `hooks.ts` (`conForos=si` en `useTrabajo` y en `useTemasDeLaSeccion` cuando la sección es `"actividades"`; la clave no cambia), `trabajo-view.tsx` ("Crear foro"), `components/seccion-de-tema.tsx` (la rama `foro`, con `FilaDeEntrega` y `destino` a `foros/:id`), `data.ts` (los textos de categorías, E1-9 y §E7.8) y `types.ts`;
  - en `features/tareas/`: `components/participaciones-del-foro.tsx`, `components/participacion-del-foro.tsx`, `components/replicas-de-participacion.tsx`, `components/formulario-de-participacion.tsx` y `components/mi-participacion.tsx` (nuevos), `foro-view.tsx`, `hooks.ts`, `data.ts`, `lib.ts` y `types.ts`;
  - `services/trabajoService.ts` (solo si falta una clave de §D-8).
- **Pruebas nuevas (6):** en `features/tareas/`, `participar-01d.test.tsx`, `errores-participacion-01d.test.tsx`, `replicas-01d.test.tsx`, `borrar-participacion-01d.test.tsx` y `recuperar-participaciones-01d.test.tsx`; y `features/clases/actividades-foros-01d.test.tsx`.
- **Lista cerrada (2):**
  1. `features/clases/contenido-03c2.test.tsx:235` y `:242` (CL3-C09): la URL completa pasa a `` `${BASE}/temas?seccion=actividades&conForos=si` `` y el título la nombra.
  2. `features/clases/categorias-view.test.tsx`:
     - `:172`, `:242`, `:432` y `:458`: "0 tareas" → "0 actividades";
     - `:176`, `:278` y `:482`: "Tiene 3 tareas." → "Tiene 3 actividades.";
     - `:122` y `:325`: "…Sus tareas se califican por puntos." → "…Sus actividades se califican por puntos." (§E7.8, textos).
- **Grep de la lista:**
  - `seccion=actividades` en `frontend/src`: la URL completa solo la fija `contenido-03c2.test.tsx:242`. `ver-mas-y-orden-ch4.test.tsx:756` arma una URL de entrada (vigilada). Los dobles que eligen por `searchParams.get("seccion")` o por `claveTemasDeLaSeccion(…, "actividades")` no cambian. Esos dobles están en `contenido-03c2`, `avisos-al-redirigir-ch6`, `avisos-03d`, `editar-recurso-03d`, `ordenar-03c2-r1`, `ordenar-03c2-r2`, `recargas-ch6`, `recursos-enmienda13-03e`, `recursos-03e-r1`, `recursos-03d-r1`, `recursos-03d-r2`, `recursos-03d-r3`, `recursos-03d`, `recursos-caminos-03d`, `ver-mas-y-orden-ch4`, `clase-archivada-01d1-r1`, `clase-archivada-01d1-r2`, `clase-archivada-01d1-r3`, `clase-archivada-01d1-vista`, `app/invalidaciones-03c2-r1`, `app/estado-por-id-ch6` y `app/estado-por-id-ch6a-r2` y `r3`.
  - `0 tareas|Tiene \d+ tarea|Sus tareas se califican`: `categorias-view.test.tsx` y las dos `*.ataque` de C-12.
- **C-n:**
  - **C-12, `features/clases/categorias-01e-r1.ataque.test.tsx:174` y `categorias-01e-r2.ataque.test.tsx:153`:** "0 tareas" → "0 actividades", con el comentario `// FORO-01d, C-12 (§E7.5.5; E1-9): el editor de categorías cuenta actividades (tareas y foros).` Nada más cambia.
  - **C-13, V-06 (`styles/clases-r1.ataque.test.ts`):**
    - La cifra suma los `enEspera=` nuevos: "Publicar participación", "Publicar réplica", "Ver más participaciones", "Ver más réplicas", "Sí, borrar participación" y "Sí, borrar réplica"; unos 6, según dónde viva cada botón.
    - `fijos` suma cada archivo nuevo de `features/tareas/components/` con su cifra (`mi-participacion.tsx`: 0).
    - Si un botón nuevo cae en `features/clases/components/`, se suma a `fijos`; la tolerancia de `restoClases` (3) no cambia.
- **Vigiladas:**
  - `recargas-ch6.test.tsx:583` y `:1183` (comparan un parámetro).
  - Los dobles por `seccion` de arriba.
  - `invalidaciones-03c2-r1.ataque` y `ordenar-03c2-r*.ataque`.
  - Las de Dudas (DH-11 a).
  - `errores-ch3.test.ts:44` (sigue en 15).
  - CH4-04 (ningún lector nuevo de `isFetchingNextPage`).

#### §E7.5.6. 01e (base: el commit de 01d)
**(Enmienda 8)** Suma C-16 (`lib/guardas-ch4-r1.ataque.test.ts`, ATQ-CH4-34, por `participante-view.tsx`; §E8.2) y el gancho `useVerMasConservandoLaLista` de 01d (§E8.4). Queda en ~27.
- **Se toca (17):**
  - en `features/tareas/`: `participantes-view.tsx`, `participante-view.tsx` y `components/devoluciones.tsx` (nuevos), `components/panel-de-calificacion.tsx` (la actividad, prop opcional), `components/tabla-de-entregas.tsx` (los textos por props opcionales), `components/mi-participacion.tsx`, `foro-view.tsx`, `hooks.ts`, `data.ts`, `lib.ts` y `types.ts`;
  - en `features/calificaciones/`: `lib.ts` (`conTipo=si`, `enlaceAParticipante` y `enlaceAForo`), `hooks.ts` (solo si hace falta), `components/tabla-del-gradebook.tsx` y `components/lista-de-mis-calificaciones.tsx`;
  - `app/router.tsx`;
  - `docs/DESIGN.md` (A-06).
- **Pruebas nuevas (6):** en `features/tareas/`, `participantes-01e.test.tsx`, `errores-calificar-foro-01e.test.tsx`, `mi-calificacion-foro-01e.test.tsx`, `recuperar-participantes-01e.test.tsx` y `vecinos-panel-01e.test.tsx` (FORO-1E40 y FORO-1E41); y `features/calificaciones/foro-01e.test.tsx`.
- **Lista cerrada (2):**
  1. `features/calificaciones/lib.test.ts:146-164`: las cuatro URL suman `conTipo=si` donde lo ponga `rutaDelGradebook` y `rutaDeMisCalificaciones`. `:196-197` (`enlaceAEntregaDeAlumno` y `enlaceATarea`) no cambian: las funciones nuevas se suman.
  2. `lib/estado-por-id-estatico-ch6.test.ts:114-124` (CH6-A30 (c)): suma `expect(textoDe("tareas/participantes-view.tsx")).toContain("key={foroId}")` y la `key` compuesta de `participante-view.tsx`, armada como la de `entrega-de-alumno-view.tsx`, con `foroId` y `alumnoId`.
- **Grep de la lista:**
  - `gradebook\?|mis-calificaciones\?` en las pruebas: la URL completa solo la fija `calificaciones/lib.test.ts:150-162`. Las demás comparan el `pathname` o usan `includes`/`startsWith` (vigiladas).
  - `<PanelDeCalificacion|<TablaDeEntregas`: las props nuevas son opcionales, así que ninguna llamada cambia.
  - `isFetchingNextPage`: ningún archivo nuevo lo lee.
- **C-n:** **C-14, V-06:** suma "Ver más alumnos", "Ver más participaciones" (de un alumno) y "Ver más comentarios", con sus archivos en `fijos` (`participantes-view.tsx`, `participante-view.tsx` y `components/devoluciones.tsx`). El panel de calificación ya está contado.
- **Vigiladas:**
  - CH4-04, que sigue con sus tres lectores.
  - En `features/calificaciones`: `gradebook-01d*`, `mis-calificaciones-01d*`, `exportar-02b`, `exportacion-02b-r*` (la exportación no pide `conTipo`), `secciones-01d-r3` y `r4`, y `estatico-01d` y `02b` (sin `perspectivaDeRuta(`).
  - En `features/tareas`: `calificar-01c*` y `calificacion-01c` (el panel sin la actividad, como hoy), `entregas-01e*` (la tabla con sus textos de hoy) y `estatico-01c` (CAL-1C13).
  - `clase-archivada-01d2-vista` ("Mis calificaciones" de una clase anterior).

### §E7.6. Los detalles que las verificaciones del manager dejaron "para la Enmienda de arranque de 01b"

| Detalle (origen) | Qué pasa |
|---|---|
| La fila de DH-14 con viñetas dentro de la celda (verificación de la Enmienda 2) | Ya lo había corregido E3-6. Además, DH-14 queda sin objeto (§E7.0) |
| La segunda comprobación de 01b no exceptuaba `docs/trabajo/FORO-01-…` ni `docs/ESTADO.md` (verificación de la Enmienda 2) | Sin objeto: no hay fusión. La excepción general de `AGENTS.md` sigue valiendo para la verificación de "No se toca" de cada subentrega |
| El encabezado del punto 6 de §D-R0 01b citaba "la alternativa del punto 3" (verificación de la Enmienda 5) | Sin objeto (no hay punto 6) |
| CAL-1B08 (`calificaciones-lecturas-estatico.test.ts:90-108`, `z.strictObject(`) como vigilada de 01b (verificación de la Enmienda 6) | Hecho: vigilada en §E7.5.2, con `tipo` dentro de la declaración y no con `.extend` |
| `errores-ch3-r2.ataque` en el punto 4 de §D-R0 01b, la regla de la fusión (verificación de la Enmienda 6) | Sin objeto: sin fusión, C-7 se aplica directo sobre el archivo de hoy (§E7.5.2) |
| P-01a1-1 del tester (ronda 0 de 01a1) | Lo atendió la Enmienda 6; hoy C-6 (01a: `foroId` y `participacionId`) y C-7 (01b: `conForos` y `conTipo`) |
| P-01a1-2 del tester (la otra copia corría suites) | Sin objeto: una sola copia |

### §E7.7. La regla de participación tardía (DH-02), todavía pendiente con el cliente

- **Sigue sin respuesta del cliente.** El plan sigue con DH-02 (a), que el humano aprobó como valor por omisión: sin penalización, el maestro ve la fecha y hora de cada participación, la marca "con retraso" y el cierre en la fecha límite si el foro no acepta tardías.
- **No bloquea ninguna subentrega.** Toda la regla vive en `reglaDeParticipacion` (`core/foros/participacion.ts`, 01a), y calificar a quien no participó y la interfaz la consultan (§D-2.1).
- **Qué cambiaría si responde:**
  - **Antes de cerrar 01a:** con (b) o (c), se cambian la función y `participacion.test.ts` (FORO-1A01 a FORO-1A06).
  - **Después de 01c2:** además, los textos de `features/tareas/data.ts` de §D-2.5. Con (c), también `FormularioTarea` con `tipo="foro"` (sin el control de tardías) y la fila de la política de "Detalles". **(Enmienda 8, N-21)** Con la partición de §E8.3, `FormularioTarea` con `tipo="foro"`, los textos y "Detalles" van en **01c2**. Si el cliente responde antes de cerrar 01c2, el cambio entra ahí mismo; si responde después, se toca lo ya hecho en 01c2.
  - **En cualquier momento:** la viñeta "Foro" de RN-08 y la de ESSENTIALS (hoy en la línea 133).
  - Con (d), es otro encargo.
- **Al cierre (A-08):** si el cliente no ha respondido, la fila "Decisión del humano: la regla tardía cuando el cliente responda" queda en ESTADO §3.

### §E7.8. Decisiones para el humano que trae el rearranque

Las DH-01 a DH-12 y las respuestas de PB-1, PB-2, E5-4 y E5-5 siguen firmes. DH-13 y DH-14 quedan sin objeto (§E7.0): no hay nada que decidir sobre ellas. Estas son nuevas:

| DH | Decisión | Opciones | Recomendación y por qué |
|---|---|---|---|
| DH-15 (**(Enmienda 8)** reescrita, abajo) | Cómo se parte el trabajo ahora que no hay fusión con ADMIN-01 | *Texto de la Enmienda 7, reemplazado:* **(a)** Seis subentregas (§E7.1): **01a** núcleo del foro con su política de clase archivada (~31), **01b** el borrado de participaciones, "Actividades" con foros, `conTipo`, los README y el foro ante el borrado, el duplicado y la baja de cuentas (~30), **01c1** hermanos y formulario (~14), **01c2** el foro y su sección (~30), **01d** Actividades, participaciones y réplicas (~27) y **01e** calificar y enlaces (~26). **(b)** Como (a) en el frontend, pero el backend con el corte de antes: 01a = lo de 01a1, más la política de clase archivada (~34), y 01b = lo de 01a2, más lo de la 01b vieja (~23) | **(a).** Las dos partes del backend quedan en unos 30 (la regla de `AGENTS.md`), y "Actividades" con foros va junto con lo demás que solo pide el frontend de 01d. Con (b), 01a pasa de unos 30. La política de clase archivada va en 01a con cualquiera de las dos: la prueba de ADMIN-01 que exige cada ruta en su tabla (ADM-1A09) se pone roja en cuanto el foro registra sus rutas. El frontend se parte igual con las dos (la regla de E2-3 que ya aprobaste) |
| **DH-15 (Enmienda 8). (Enmienda 9) Decidida por el humano: (a), 2026-11-14** ("Acepto las seis"; `aprobacion.md`). 01a pasa de ~32 a ~33 por FORO-1A08 (§E9.6) | Cómo se parte el trabajo ahora que no hay fusión con ADMIN-01 | **(a)** Seis subentregas, cada una con su commit, en este orden (§E8.3): **01a**, el núcleo del foro con su clase archivada (~32); **01b**, el borrado de participaciones, "Actividades" con foros, `conTipo`, los README y el foro ante el borrado, el duplicado y la baja de cuentas (~30); **01c1**, la sección "Foro" y su lista (~23); **01c2**, los hermanos de CLASES-03d, el formulario y crear, editar, ver y borrar un foro (~25); **01d**, "Actividades", participaciones y réplicas (~27); y **01e**, calificar, enlaces del gradebook y `DESIGN.md` (~27). **(b)** Igual en el frontend, pero el backend con el corte de antes: 01a = lo de 01a1, más la clase archivada y el arreglo del tipo (~35), y 01b = lo de 01a2, más lo de la 01b vieja (~23) | **(a).** Todas quedan en unos 30 o menos, que es la regla de `AGENTS.md`, y cada corte se justifica por tamaño (§E8.3). La clase archivada va en 01a con las dos, porque la prueba de ADMIN-01 que exige cada ruta en su tabla se pone roja en cuanto el foro registra sus rutas. En el frontend, la sección va antes que las vistas: sus pruebas no necesitan el detalle del foro, y las vistas sí necesitan la sección para "Volver a Foro". Con (b), 01a pasa de unos 30 |
| DH-16 (**(Enmienda 9) decidida por el humano: (a), 2026-11-14**) | Cuándo entra FORO-01 a `main` | **(a)** Un solo PR al cerrar 01e, con los seis commits. **(b)** Dos PR: el backend al cerrar 01b y el frontend al cerrar 01e (como ADMIN-01, con el #33 y el #35). **(c)** Un PR por subentrega | **(a).** `main` nunca tiene medio foro: con (b), `main` tendría las rutas del foro sin pantallas varios días. Hoy no hay trabajo en paralelo que pida fusionar antes, y ENVIVO arranca después de FORO-01. El costo es un PR grande, pero cada subentrega ya trae su commit y su revisión final del manager. La decisión es tuya en cada PR (`AGENTS.md`, paso 8 del flujo); esto solo fija el plan |
| DH-17 (**(Enmienda 9) decidida por el humano: (a), 2026-11-14**) | El foro en el borrado definitivo de una clase (ADMIN-01) | **(a)** Sin cambio en ADMIN-01. El diálogo cuenta el foro entre las "actividades", la participación principal entre las "entregas" y su calificación entre las "calificaciones"; las réplicas y los textos se borran con el foro sin nombrarse. **(b)** Sumar "participaciones" al conteo y a la frase del diálogo: cambia `ConteoDeBorradoRespuesta` (`shared/`), `contarParaBorrar`, el diálogo de ADMIN-01 y sus pruebas (unos 6 archivos más en 01b y 01e) | **(a).** El diálogo ya dice que el borrado es definitivo y nombra lo que pesa (actividades, entregas, calificaciones y archivos). Una réplica no es una entrega ni se califica. Duplicar no tiene decisión: P-10 ya dice que no se copian actividades, y el foro tampoco (FORO-1B09) |
| DH-18 (**(Enmienda 9) decidida por el humano: (a), 2026-11-14**) | Las participaciones de una cuenta dada de baja (ADMIN-01) | **(a)** Siguen en el foro con su nombre y sin marca, como las dudas y los comentarios. El alumno dado de baja sale de "Participantes", del gradebook y de la exportación, como hoy sale de "Entregas"; al reactivarlo vuelve todo. **(b)** Junto al nombre, «Cuenta desactivada», como los maestros dados de baja en las listas de maestros. Pide leer `activo` en las consultas del foro y un campo más en la respuesta, que ninguna otra lista de autores lleva | **(a).** Es lo que hacen hoy Avisos, Dudas y el hilo privado, y no suma consultas ni campos. FORO-1B10 lo prueba |
| DH-12, complemento (E7; **(Enmienda 9) aprobados los dos textos por el humano, 2026-11-14**) | Dos textos hermanos de E1-9 (el editor de categorías cuenta actividades) | Aprobarlos o corregirlos: "Tiene {n} actividades." / "Tiene 1 actividad." (hoy "Tiene {n} tareas."), y "Esta clase no tiene categorías. Sus actividades se califican por puntos." (hoy "…Sus tareas se califican por puntos.") | Aprobarlos: son la misma cuenta y el mismo editor que ya decidiste en E1-9. Si no, solo cambia "{n} tareas" y quedan dos frases que dicen "tareas" donde también cuentan foros |

**(Enmienda 8) Dos avisos para el humano, sin decisión nueva:**
- **N-19. El plan corrige un riesgo que ya habías aceptado.** El 2026-11-06 aceptaste como riesgo declarado que un `409` que llega con la clase ya archivada no pida la recarga al guardar una tarea o al calificar: al restaurar, el formulario nace de la caché y el siguiente guardado recibe otro `409`, sin sobrescribir nada (ESTADO §3, fila de ADMIN-01d1 y 01d2, "revisar en FORO-01").
  - FORO-01 rehace esos ganchos y lo corrige en la tarea, en el foro y en calificar (FORO-1C41 y FORO-1E41): marca vieja la consulta sin pedirla, así que al volver a abrir se pide la versión del servidor.
  - Es conducta nueva en flujos de tareas, acotada y probada. La parte de recursos se queda como estaba.
  - Si prefieres no tocarlo, dilo al aprobar: salen FORO-1C41, FORO-1E41 y la viñeta (b) de §E7.3, "Frontend", punto 8, y la fila de ESTADO sigue igual.
  - **(Enmienda 9) Aceptado por el humano el 2026-11-14:** el plan corrige ese riesgo en la tarea, en el foro y en calificar. FORO-1C41 (01c2) y FORO-1E41 (01e) se quedan.
- **N-20. DH-09 (a) se conserva por otra razón que la que aprobaste.** Aprobaste el opt-in (`conForos` y `conTipo`) para proteger a una pestaña abierta antes del despliegue. Con DEPLOY después de ENVIVO, el primer despliegue ya trae el foro completo, así que ese motivo ya no aplica.
  - El opt-in se conserva porque deja sin tocar las pruebas que eligen su respuesta por `seccion` (M-04).
  - Se retira en el `chore` de retiro de compatibilidad, antes de DEPLOY (A-08, R-E7-4).
  - No hace falta otra decisión.
  - **(Enmienda 9)** Aviso ya dado al humano; no pedía decisión.

### §E7.9. Lo que no cambia
- Las decisiones de DH-01 a DH-12 (con DH-05 como la corrigió el humano), PB-1 (a), PB-2 (a), S-E3-1, S-E3-2, E5-4 y E5-5.
- El modelo (§D-1), las reglas puras (§D-2), las 17 rutas y sus esquemas (§D-3), los bloqueos (§D-4) y la cola (§D-5).
- La compatibilidad opt-in (DH-09 a: `conForos` y `conTipo`), los textos de §D-9 y el diseño de las vistas (§D-8.1 a §D-8.6), salvo lo que dice §E7.3.
- La matriz de §D-10: la completa §E7.3, "Frontend", puntos 2, 5 y 7.
- El borrado de participaciones (§D-11).
- Los casos de "Pruebas requeridas", con los movimientos de §E7.4.
- Las migraciones como PARADA con su SQL.
- Sin cambios en `middleware/`, `adapters/auth`, `infra/` ni `.env.example`.
- "Documentos al cierre", salvo lo que marca la Enmienda 7.

### §E7.10. Riesgos del rearranque
- **(Enmienda 9, N-23)** R-E7-1 y R-E7-2 se leen con la partición de §E8.3. En el borde quedan 01a (~33, §E9.6) y 01b (~30); 01c1 queda en ~23 y 01c2 en ~25. Los hermanos van en **01c2**.
- **R-E7-1. 01a y 01c2 quedan en el borde (~31 y ~30).** Si la comprobación de arranque encuentra más pruebas, se aplica la regla de corte con una enmienda corta. No se parte por adelantado.
- **R-E7-2. Los hermanos de 01c1 pueden tocar pruebas que este grep no ve.** El remedio de T-02 y T-03 (pedir temas y categorías al abrir la edición) cambia el número de peticiones. Solo una prueba lo cuenta exacto (C-8, condicional). Si aparecen otras en la ronda 0, PARADA, como dice §E7.5.0.
- **R-E7-3. `useAvisoDeRecargaFallida` gana una variante por clave.** Lo usan muchas vistas de la tarea. La firma de hoy no cambia y sus pruebas son vigiladas. Si la variante obligara a cambiarla, PARADA.
- **R-E7-4. DH-09 sin el motivo de compatibilidad del primer despliegue.** Con la hoja de ruta del 2026-11-11, el primer despliegue (DEPLOY) ya trae el foro completo, así que R-01 no se presenta en ese despliegue. El opt-in sigue valiendo porque deja sin tocar las pruebas que eligen el doble por `seccion` (M-04). Se retira en el `chore` de retiro de compatibilidad, antes de DEPLOY (A-08).
- **R-E7-5. Una segunda copia sin usar.** La copia B (`feat/foro-01`, en `e81ff10`) sigue en disco y en `origin`. Si alguien trabaja ahí por error, sus cambios no llegan a esta rama. Su retiro lo decide el humano, fuera de este encargo.
- **R-E7-6. Clases vinculadas (DOCS-05, ENVIVO).** El foro no se comparte con una clase vinculada (RN-12 habla de recursos de aprendizaje y grabaciones). Si ENVIVO decide otra cosa, lo revisa su plan.

### §E7.11. Pasos de implementación (reemplazan "Pasos de implementación")

En la ronda 0 de cada subentrega, el tester hace la comprobación de arranque y aplica sus C-n antes del programador (§E7.5.0). El primer resumen del programador trae, desde 01c1, la matriz de §D-10 confirmada o corregida, con los estados "en vuelo a la vez" y "con la vista desmontada".

**01a**
1. `shared/src/foros.ts`, exportar `idOpcionalSchema` y el bloque de `index.ts`. `npm run build` de `shared`.
2. `core/actividades.ts` y el parámetro `actividad` de `core/tareas/tareas.ts` y `core/calificaciones/calificar.ts` (FORO-1A07).
3. `core/foros/participacion.ts` (FORO-1A01 a FORO-1A06).
4. `schema.prisma`, solo el valor `foro`. `--create-only --name foro_01_tipo_foro`. **PARADA con el SQL** (E3-5); con la confirmación escrita del humano, `prisma migrate dev`.
5. `ParticipacionForo` y sus relaciones (la de `Usuario`, después de `dudasResueltas`). `--create-only --name foro_01_participaciones` y las partes a mano. **PARADA con el SQL completo**. Con la confirmación, `migrate dev`; después, `prisma validate`, `prisma generate` y `migrate diff --exit-code`, con su salida en el resumen (FORO-1B07). Si propone borrar algo, PARADA.
6. `adapters/db/actividades.ts` y `tipo` en `tareas.ts` (leer, crear, editar y borrar), `entregas.ts` y `publicaciones.ts`. Las pruebas de tareas, entregas, calificaciones y muro, en verde sin cambios.
7. `adapters/db/foros.ts` y su exportación en `index.ts`.
8. `handlers/foros.ts` (16 rutas, con `enClaseArchivada: "lectura"` en las 10 lecturas) y su registro en `app.ts`, después de `calificacionesHandler`.
9. La tabla de ADM-1A09 (lista cerrada).
10. Las pruebas de 01a (§E7.4).
11. `lint` y `build` de `shared`, del backend y del frontend, y las suites de los módulos tocados, una después de otra. Backend: `test/foros*`, `test/migracion-foro-01*`, `test/clases-archivadas-matriz*`, y las de tareas, entregas, calificaciones, temas, categorías, muro y `src/core`. Frontend: `src/lib`. El resumen trae la matriz de rutas contra los casos de autorización.

**01b**

12. `puedeBorrarParticipacion` y `efectoDeBorrarPrincipal` (FORO-1A60 y FORO-1A61).
13. `alFaltarReferencia` en `errores.ts`, con su caso en `errores.test.ts`.
14. `borrarParticipacion`, `puedeBorrar` en las listas y en `shared/src/foros.ts`, y el `catch` de `publicarReplica`.
15. La ruta 17 y su fila en ADM-1A09.
16. `conForos` (`shared/src/tareas.ts`, `recursos.ts:22`, `index.ts`), `listarTrabajoCon`, `temas.ts` y el texto de `categorias.ts` (FORO-1A25 y FORO-1A26b).
17. `conTipo` (`shared/src/calificaciones.ts`, `adapters/db/calificaciones.ts`, `handlers/calificaciones.ts`; FORO-1B06).
18. FORO-1A62 a FORO-1A70 y FORO-1B08 a FORO-1B10. Los README (A-05).
19. `lint` y `build` de los tres paquetes y las suites de los módulos tocados (backend y frontend).

**(Enmienda 8)** Los pasos 20 a 28 se reordenan según §E8.3.
- **01c1:** 24 (solo `clavePrefijoDeForos` y `claveListaDeForos`), 26 y 27 (solo la ruta `foro`), 22 (PR-1A17) y las pruebas de la sección.
- **01c2:** 20, 21 y 23, luego 24 (las demás claves), 25 y 27 (las rutas del foro y `foros/nuevo` → `/login` para el estudiante), y las pruebas de las vistas.

**01c1**

20. Los hermanos T-01 a T-05, con sus pruebas, antes de construir encima (E1-27), y la extensión de T-04 (FORO-1C41).
21. Los vecinos de CH6-A14 en la tarea nueva y su edición (FORO-1C40).
22. PR-1A17.
23. `tipo` en `FormularioTarea` y en `AccionesDeLaTarea`, y la traducción de errores del foro (FORO-1C04, FORO-1C10 y FORO-1C43).

**01c2**

24. Las claves y las consultas del foro en `services/trabajoService.ts`.
25. `CrearForoView`, `EditarForoView` y `ForoView`, con sus `key`, guardas y avisos.
26. `ForosView`, siguiendo a `DudasView`.
27. La sección "Foro" y el router (incluido `foros/nuevo` → `/login` en la rama del estudiante).
28. Las pruebas de §E7.4 y la lista cerrada.

**01d**

29. "Actividades" con `conForos=si` y los textos de categorías.
30. Los componentes de participación y réplicas, los ganchos, "Tu participación", "Borrar" del admin y el montaje en `ForoView`.
31. Las pruebas.

**01e**

32. `ParticipantesView`, `ParticipanteView`, `Devoluciones` y el panel con la actividad.
33. La calificación en "Tu participación".
34. Los enlaces por tipo y `conTipo=si`, y la prueba del .xlsx.
35. Los vecinos de CH6-A14 del panel y FORO-1E41.
36. `DESIGN.md` §7.34 y las marcas de §7.3, §7.8, §7.10, §7.16 y §7.22 (A-06).

## Resumen en cinco líneas
1. **Modelo (DH-01 a):** un foro es una publicación de tipo `foro` con su fila 1:1 en `tareas` (fecha, puntos, rúbrica, tardías, categoría, tema, `version`, recordatorio) y una fila de `entregas` por alumno (estado, retraso, calificación, puntajes); los textos van en una tabla nueva, `participaciones_foro` (principal y réplicas). Así el gradebook, el riesgo, "Mis calificaciones" y la exportación lo cuentan sin cambiar sus consultas.
2. **La participación tardía vive en una sola función pura:** `reglaDeParticipacion` de `backend/src/core/foros/participacion.ts` (§D-2.1, DH-02). Su valor por omisión: sin penalización y el maestro ve la fecha y hora de cada participación (lo que pidió el humano), más dos reglas de RN-08 y ESSENTIALS: la marca "con retraso" y el cierre en la fecha límite si el foro no acepta tardías. **(E1-1)** Calificar a quien no participó (P-03 c′) y lo que la interfaz anuncia antes de publicar leen esa misma función: el cliente recibe del servidor lo que la regla decidió y no la calcula.
3. **(Enmienda 7) Seis subentregas, sin fusión:** 01a (núcleo, con la política de clase archivada), 01b (borrado de participaciones, "Actividades" con foros, `conTipo`), 01c1, 01c2, 01d y 01e (§E7.1, DH-15). *Texto de E3-2, reemplazado:* **Seis subentregas (E3-2):** 01a1 y 01a2 (`shared` y backend; 01a2 es el borrado de participaciones de DH-05) antes de fusionar ADMIN-01; después, 01b a 01e. *Texto anterior:* "Cinco subentregas." 01a (`shared` y backend) se hace antes de fusionar ADMIN-01 y no entra a `main` antes que ADMIN-01 (E1-2). 01b (backend), 01c, 01d y 01e (frontend) van **después de fusionar ADMIN-01 en `main`** (instrucción del humano y tabla de cruce, §D-X). **(E1-4)** "Actividades" con foros pasa de 01c a 01d.
4. **Sin cambios en el middleware.** Las escrituras del foro quedan cerradas en una clase archivada en cuanto llega ADMIN-01 (su sexto paso cierra por defecto). Las lecturas declaran `enClaseArchivada: "lectura"` en 01b. **(Enmienda 7)** ADMIN-01 ya está en `main`: las lecturas declaran `"lectura"` desde 01a, en la misma subentrega que registra las rutas (§E7.3).
5. **(Enmienda 7)** Sin preguntas bloqueantes nuevas; cuatro decisiones nuevas para el humano (DH-15 a DH-18, §E7.8) y DH-13 y DH-14 sin objeto. **Sin preguntas abiertas (E4-1):** PB-1 y PB-2 las resolvió el humano con la opción (a). Hay catorce decisiones para el humano (DH-01 a DH-14; E1-12 y E1-13), cada una con su recomendación. El humano las responde al aprobar el plan, antes de la ronda 0 de 01a.

## Preguntas bloqueantes

**(Enmienda 7) Ninguna nueva.** Lo que el rearranque deja abierto va como decisión con recomendación (DH-15 a DH-18, §E7.8); DH-02 sigue pendiente con el cliente y no bloquea (§E7.7).

**Resueltas por el humano (2026-11-05; E4-1):** PB-1 **(a)**, solo el admin borra. PB-2 **(a)**, la entrega vuelve a "sin participar" y el alumno puede volver a publicar si el foro sigue abierto. No queda ninguna pregunta abierta. Las de abajo se conservan como historial.

**Enmienda 3 (E3-1). Dos preguntas, solo para 01a2** (el borrado de participaciones; §D-11). 01a1 no depende de ellas.

- **PB-1. ¿Los maestros de la clase también borran en el foro?** El humano escribió: "el admin puede borrar cualquier participación o réplica …, con la regla general de `core/autoria`; nadie edita y el alumno no borra lo suyo". Pero la regla general (`puedeBorrar`, `core/autoria.ts:12-19`) da más de lo que dice esa frase:
  - cada autor borra lo suyo, que el humano excluye para el alumno;
  - y un maestro borra lo que escribió un estudiante (P-01 b de CLASES-02, la moderación de Avisos y Dudas).

  Opciones:
  - **(a)** Solo el admin borra (ruta con `roles: ["admin"]`). Nadie más, ni el maestro sus propias réplicas.
  - **(b)** El admin y los maestros de la clase borran lo de los alumnos; cada maestro, además, sus propias réplicas. El alumno, nada. Es la regla general sin la parte del autor alumno.
  - **(c)** Como (b), pero el maestro no borra lo del alumno; solo sus propias réplicas.
  - **Recomendación: (a).** Es lo que el humano escribió de forma explícita y deja la moderación en un solo lugar, con su revisión en DEPLOY (A-08). En cualquier caso la decide una función nueva, `puedeBorrarParticipacion`, porque `puedeBorrar` dejaría al alumno borrar lo suyo. Con (b) o (c), la ruta suma `"maestro"` a `roles` y la función, su rama.
- **PB-2. ¿Qué pasa con "entregó" al borrar la participación principal de un alumno que todavía no tiene calificación?** El humano solo decidió el caso con calificación (se conserva).
  - **(a)** La entrega vuelve a "sin participar": `estado = asignado`, sin `fecha_entrega` ni retraso, con `version + 1`.
    - Si el foro sigue abierto (según `reglaDeParticipacion`), el alumno puede volver a publicar su principal; el índice único parcial lo permite, porque la fila se borró.
    - Si ya cerró, queda como vencida sin entregar (cuenta en el riesgo) y el maestro puede calificarla (P-03 c′).
  - **(b)** "Entregó" se conserva (`entregado`, con su fecha) aunque el texto ya no exista, y el alumno no puede volver a publicar (`409 PARTICIPACION_YA_PUBLICADA`).
  - **Recomendación: (a).** "La entrega es participar" (RN-08): si la participación ya no existe, no hay entrega. Así el moderado puede corregir y publicar de nuevo mientras el foro esté abierto. Con (b) quedaría "Entregado" sin nada que leer ni calificar en la vista del maestro.

**Antes de la Enmienda 3:** ninguna. Lo que el PRD deja abierto lo cubre una DH con valor por omisión y recomendación (abajo). Si el humano elige una opción distinta de la recomendada en alguna de estas seis, el arquitecto enmienda el plan antes de la ronda 0 (E2-4, N-14):
- **DH-01:** cambia las tablas, la migración y las rutas.
- **DH-04 (b) o (c):** un `409` nuevo.
- **DH-05 (b):** rutas de borrado y su efecto en `entregas`.
- **DH-06 (b):** quita dos rutas.
- **DH-09 (b):** cambia los esquemas de `shared` y las listas cerradas.
- **DH-02 (c):** no cambia rutas ni tablas, pero cambia `FormularioTarea`, la fila de "Detalles" y el PRD (§D-2.5).

## Decisiones para el humano (DH)

| DH | Decisión | Opciones | Recomendación y por qué |
|---|---|---|---|
| DH-01 | Dónde viven el foro, su estado por alumno y su calificación | **(a)** El foro reutiliza `publicaciones` (con `tipo = 'foro'`), su fila 1:1 en `tareas` y una fila de `entregas` por alumno. Las participaciones y réplicas van en una tabla nueva, `participaciones_foro`. **(b)** Tablas propias (`foros`, `criterios_foro`, `calificaciones_foro`, `puntajes_foro`, `participaciones_foro`) | **(a).** Es lo que ESSENTIALS ya prevé ("Tablas", Previsto). La comparación completa está en §D-1.1: con (a), el gradebook, el riesgo, "Mis calificaciones", la exportación, calificar con rúbrica y `version`, el recordatorio de 24 h, la autoría y el borrado con confirmación cuentan el foro sin cambiar sus consultas, y la fila S-03 de ESTADO se cierra sola. Con (b) habría que duplicar calificar, unir dos fuentes en las tres consultas agregadas y en la exportación, y escribir otra migración con CHECK, otro recordatorio y otra regla de borrado. El costo de (a) es que toda ruta de tarea debe rechazar un foro: §D-3.3 lo resuelve en los adaptadores con un parámetro `tipo` cuyo valor por omisión es `"tarea"`. Así, ningún handler de ADMIN-01 cambia |
| DH-02 (reescrita, E1-1) | **Participación tardía** (pendiente con el cliente). Toda la regla vive en `reglaDeParticipacion` (§D-2.1). Calificar a quien no participó (P-03 c′) y los avisos de la interfaz la consultan, y no tienen su propia copia | **(a) Valor por omisión.** Lo que pidió el humano: **sin penalización** (ya es así en todo el sistema, RN-05) y **el maestro ve la fecha y hora de cada participación**. Además, de RN-08 y de ESSENTIALS ("tarde y cierre como en las entregas"), no de lo que dijo el humano: **la marca "Con retraso"** si se publica después de la fecha límite en un foro que acepta tardías, y **el cierre en la fecha límite** si no las acepta. **(b) Sin marca, con cierre:** solo fecha y hora, y se conserva el cierre en la fecha límite cuando el foro no acepta tardías. **(c) Solo fecha y hora, sin marca ni cierre:** el foro nunca se cierra. **(d)** Penalización automática en la calificación | **(a)**, hasta que el cliente decida. Lo que cambia cada opción, además de `reglaDeParticipacion` y `participacion.test.ts` (§D-2.5): **(b)** cambia 2 textos de `features/tareas/data.ts` ("Aceptar con retraso" → "Aceptar después de la fecha límite"; "Se aceptan participaciones con retraso" → "Se aceptan participaciones después de la fecha límite"), la viñeta "Foro" de RN-08 (PRD) y la de ESSENTIALS (línea 127). La insignia y el aviso de retraso dejan de salir solos, porque vienen del servidor. **(c)** cambia además `FormularioTarea` con `tipo="foro"` (sin el control de tardías; `aceptaTardias` se guarda `true` y no se lee), la fila de la política de "Detalles", RF-66 ("si acepta participaciones tardías") y RF-67 ("las réplicas siguen la misma regla de cierre"). Con (c), calificar a quien no participó nunca procede (`ENTREGA_NO_CALIFICABLE`), porque el foro nunca se cierra: el maestro solo califica a quien participó. **(d)** no cabe en esa función: cambia `core/calificaciones/` y sería otro encargo |
| DH-03 | Réplicas de los maestros después de la fecha límite (P-09 dice "las réplicas siguen la misma regla de cierre que la principal" y "los maestros replican") | **(a)** Los maestros replican en cualquier momento y su réplica nunca lleva "con retraso". La regla de cierre aplica a los alumnos. **(b)** Los maestros siguen la misma regla que los alumnos | **(a).** La regla de cierre existe para la participación que cuenta como entrega. Con (b), un maestro no podría contestar en un foro vencido que no acepta tardías. Vive en la misma función (`rolDelAutor`), así que cambiar a (b) es una línea |
| DH-04 | Réplicas de los alumnos: dónde y cuándo (RF-67: "réplicas libres a las de otros") | **(a)** El alumno replica en cualquier participación principal, incluida la suya (para contestar a quien le replicó), y no necesita haber publicado su principal. **(b)** Solo en las principales de otros. **(c)** Como (a), pero solo después de publicar su principal | **(a).** Es la regla más simple y no inventa restricciones que el PRD no pide. Con (b), quien recibe una réplica no puede contestarla. Si el humano elige (b) o (c), se agrega un `409` nuevo (`REPLICA_NO_PERMITIDA`) en `decidirReplica` y su prueba |
| DH-05 (**decidida por el humano, 2026-11-05; E3-3**) | Moderación: borrar participaciones o réplicas | **Decisión del humano (literal, `aprobacion.md`):** "el admin puede borrar cualquier participación o réplica (con sus réplicas en cascada), con la regla general de core/autoria; nadie edita y el alumno no borra lo suyo. Si la participación borrada ya tenía calificación, la calificación se conserva. Entra en 01a como una ruta más." Diseño en §D-11 (subentrega 01a2), con PB-1 (los maestros) y PB-2 (la entrega al borrar una principal sin calificación), resueltas por el humano con la opción (a) (E4-1). **Confirmado por el humano (E5-4):** el alumno calificado cuya principal se borra conserva la calificación, no vuelve a publicar su principal y sigue replicando. *Historial, sustituido por la decisión:* **(a)** En FORO-01 nadie las borra ni las edita (P-09 para el alumno; como el hilo privado, ESSENTIALS "Entregas"). Lo inapropiado se quita borrando el foro (admin). **(b)** Los maestros de la clase y el admin borran lo de los alumnos, como en Dudas | **(a).** Con (b), borrar una principal deshace "entregó" (la fila de `entregas`) y abre casos de calificación y versión que el PRD no decide. **Con (a), lo inapropiado solo se quita borrando el foro entero, con todas sus participaciones y calificaciones.** Para el piloto se acepta, pero tiene costo. **Revisión (E1-14):** se revisa en el plan de DEPLOY, antes de abrir la plataforma a usuarios reales, con una fila de ESTADO §3 con ese destino (A-08). *(Historial: era la recomendación antes de la decisión del humano. A-08 se ajusta en E3-9)* |
| DH-06 | La devolución (comentario opcional al calificar), "sin hilo privado (la devolución va con la calificación)" (P-09) | **(a)** Calificar un foro admite el comentario opcional de hoy. Se guarda como hoy, en `comentarios` con `entrega_id`, y se lee **solo** junto a la calificación: el alumno en "Tu participación" y el maestro y el admin en la participación del alumno, sin formulario para escribir en ese hilo. **(b)** El foro se califica sin comentario | **(a).** Reutiliza calificar sin cambios y cumple "la devolución va con la calificación". Agrega dos lecturas paginadas (§D-3.1, rutas 7 y 15) |
| DH-07 | La marca "con retraso" de las participaciones de **otros** alumnos | **(a)** Solo la ven los maestros de la clase y el admin; el alumno ve la suya. Todos ven la fecha de publicación. **(b)** La ven todos | **(a).** Es un dato de cumplimiento de cada alumno, como su estado de entrega, que hoy ningún compañero ve. La decide una función pura (`verRetrasoDe`, §D-2.3). **Ojo (E1-15):** es solo presentación, no confidencialidad. La fecha de publicación y la fecha límite son visibles para todos, así que el retraso se deduce |
| DH-08 | Dónde aparecen los foros en "Actividades de aprendizaje" (RF-62: "las tareas …; después, los foros (FORO-01)") | **(a)** Mezclados con las tareas en su tema, del más reciente al más antiguo, con la insignia "Foro". Leemos "después" como "más adelante, en FORO-01". **(b)** Dentro de cada tema, primero las tareas y después los foros. **(c)** Un bloque aparte "Foros" al final | **(a).** Es la misma consulta y el mismo índice de hoy, con un tipo más. (b) y (c) cambian la paginación por tema y su cursor |
| DH-09 | Compatibilidad con un frontend anterior (pestañas abiertas antes del despliegue): `elementoDeTrabajoSchema` y `columnaDelGradebookSchema` hoy no admiten un foro (el primero es una enumeración cerrada y el segundo es `z.strictObject`) | **(a) Opt-in (E1-4):** los foros salen en "Actividades" (lista y conteos) solo con `?seccion=actividades&conForos=si`, y el `tipo` de cada columna del gradebook y de "Mis calificaciones" solo con `?conTipo=si`. Sin esos parámetros, la respuesta es la de hoy. La excepción es el total de `GET …/temas` sin sección, que cuenta todo lo que pasaría a «Sin tema» al borrar el tema, foros incluidos (E1-9). **(b)** Siempre, con despliegue coordinado: un frontend viejo falla en Actividades en cuanto exista un foro, y en el gradebook desde el despliegue del backend | **(a).** Sigue el precedente de CLASES-03a (DH-02 b, `?seccion=actividades`). `seccion=actividades` y su clave de caché no cambian, así que los dobles de las 17 pruebas del frontend que eligen la respuesta por `seccion` siguen valiendo (M-04). Riesgo residual en R-01 |
| DH-10 (absorbe la DH-13 anterior, E1-12; **(Enmienda 7) cumplida:** ADMIN-01 está en `main`; el frontend va en 01c1 a 01e, §E7.1) | El frontend y la instrucción literal del humano (`aprobacion.md`): "el plan de FORO-01 minimiza el cruce con esos archivos y deja para después de fusionar ADMIN-01 cualquier cambio en ellos" | **(a)** Todo cambio en un archivo de ADMIN-01 va después de fusionarlo, repartido en cuatro subentregas (01b a 01e), porque juntas pasan de 70 archivos y la regla del 2026-11-04 parte por encima de unos 30 (§D-0.2). Eso incluye todo el frontend: cada vista del foro toca al menos uno de esos archivos (`app/router.tsx`, `features/tareas/{hooks,data,lib,types}.ts`, `features/clases/{data,hooks,types}.ts`). Mientras tanto, solo avanza 01a. **(b)** Adelantar el frontend y aceptar conflictos de fusión en esos archivos | **(a).** Cumple la instrucción literal. Costo: el frontend del foro espera a que ADMIN-01 cierre sus ocho subentregas (R-03). La DH-13 anterior citaba "una subentrega final, separada", una frase del encargo del orquestador y no del humano; se retira |
| DH-11 | El control de réplicas: reutilizar el de Dudas (fila O-r1-2 de CLASES-03e: "las réplicas usan el mismo control") o hacer uno propio | **(a)** Componentes propios en `features/tareas` con el patrón de Dudas (§7.31) y el defecto de O-r1-2 corregido en el diseño (§D-8.4). **(b)** Subir `ElementoDeDuda` y `RespuestasDeDuda` a `components/` y usarlos en los dos | **(a).** (b) refactoriza Dudas, que ADMIN-01d2 también modifica y que tiene más de 40 pruebas `*.ataque`, y mezcla un refactor con la funcionalidad (`AGENTS.md`). La fila O-r1-2 conserva su otro destino (carril trivial en `ElementoDeDuda`) |
| DH-12 | Textos de la interfaz (§D-9) | Aprobarlos o corregirlos | Aprobarlos. Siguen el tono de `DESIGN.md` §9 y reutilizan las etiquetas de estado de la entrega ("Entregado", "Con retraso", "Calificado"), sin una variante de foro (S-10). **(E1-10, N-05)** La tabla para calificar se llama "Participantes" ("Ver participantes"), así "Participaciones" queda solo para lo que se publica en el foro. El editor de categorías dice "actividades" en lugar de "tareas" (E1-9) |
| DH-13 (nueva, E1-2, M-02; **(Enmienda 7) sin objeto y cumplida**, §E7.0; cuándo entra FORO-01 a `main` es DH-16) | Orden de fusión a `main` | **(a)** Ningún commit de FORO-01 entra a `main` antes de que ADMIN-01 se fusione. 01a se queda en `feat/foro-01`, y 01b arranca trayendo `main`. **(b)** 01a entra antes a `main`. Entonces la rama de ADMIN-01 hereda el cruce: ADM-1A09 en rojo con las 16 rutas del foro fuera de su tabla, la unión de `sesiones-y-cadena.ataque` y `lecturas-fx-r1.ataque`, y el conflicto de `schema.prisma`. Los absorbería el programador de ADMIN-01, con una enmienda de su plan (sus listas cerradas y sus C-n) | **(a).** 01a no depende de nada de ADMIN-01, y ADMIN-01 no debe cargar con el cruce: es lo que pide la instrucción del humano. Se registra en `aprobacion.md` |
| DH-14 (**decidida por el humano: (b), 2026-11-05; E3-4**; **(Enmienda 7) sin objeto:** la rama nace de `fd4a7ad` y no hay fusión de `main`, §E7.0) | El commit de fusión de `main` en 01b | **Decisión del humano (literal):** "la fusión de main en 01b va en un commit de fusión aparte, hecho por mí, no con --no-commit. Puede quedar en rojo hasta cerrar 01b." Es una excepción autorizada a "un commit por subentrega, nada intermedio" (`AGENTS.md`), solo para esa fusión. El procedimiento está en §D-R0 01b. **Decidido por el humano (E5-5):** los conflictos los resuelven los agentes según la recomendación. El programador resuelve producción y pruebas normales, el tester las `*.ataque`, el manager revisa y el humano hace el commit. *Historial:* (a) `git merge --no-commit --no-ff main`, con la fusión dentro del commit de 01b; (b) un commit de fusión aparte | (b), por decisión del humano. La recomendación anterior era (a), con sus condiciones de fusión abierta (E2-2), que ya no aplican y salen del plan |

**(Enmienda 9)** El humano decidió las cuatro el 2026-11-14 con la opción (a), aprobó los dos textos del complemento de DH-12 y aceptó N-19 (`aprobacion.md`, "Decisiones del humano sobre el rearranque (2026-11-14)").

**(Enmienda 7)** Decisiones nuevas del rearranque: **DH-15** (partición), **DH-16** (cuándo entra FORO-01 a `main`), **DH-17** (el foro en el borrado definitivo de una clase), **DH-18** (las participaciones de una cuenta dada de baja) y el complemento de DH-12 (dos textos hermanos de E1-9). Están en §E7.8, con opciones y recomendación.

## Suposiciones
- **S-E7-1 (Enmienda 7).** Duplicar una clase no copia sus foros: P-10 (PRD, decidido) dice que no se copian actividades, y la consulta de ADMIN-01 solo lee materiales de aprendizaje (FORO-1B09).
- **S-E7-2 (Enmienda 7).** En una clase archivada, el alumno no ve el foro ni su participación (las rutas 2, 3, 6 y 7 le responden `409`), como la entrega propia de una tarea en ADMIN-01. En "Clases anteriores" ve la calificación del foro en "Mis calificaciones", sin enlace (S-04 de ADMIN-01).
- **S-01.** El foro lleva título (obligatorio, hasta 200 caracteres, como la tarea) y planteamiento obligatorio (hasta 10 000). En la API, el planteamiento viaja en la llave `instrucciones`, así reutiliza la normalización y el adaptador de la tarea. La interfaz lo rotula "Planteamiento". Adjuntos opcionales: los de una tarea (hasta 5, 25 MB, mismos tipos; ESSENTIALS "Archivos", Previsto).
- **S-02.** Participación principal: hasta 5 000 caracteres visibles. Réplica: hasta 1 000. Solo texto (P-09), normalizado con `normalizarTextoLargo`, como Dudas.
- **S-03.** Una réplica cuelga de una participación principal (un nivel). Contestar una réplica es replicar en el hilo de su principal.
- **S-04.** Orden: las principales y las réplicas, de la más antigua a la más reciente. La lista de foros de la sección, del más reciente al más antiguo. Páginas de 20, con un máximo de 100.
- **S-05.** Los maestros no publican participación principal, solo réplicas. El admin no escribe (P-09).
- **S-06.** Un alumno calificado sin haber participado (el foro estaba cerrado, P-03 c′) ya no publica su principal aunque el foro se reabra (`409 PARTICIPACION_CALIFICADA`), igual que `ENTREGA_CALIFICADA` en la tarea. Las réplicas siguen solo la regla de tiempo.
- **S-07.** La fila de `tareas` de un foro guarda `requiere_adjuntos = false`, que el foro nunca lee.
- **S-08.** Códigos de error: el foro reutiliza los de tareas, entregas y calificaciones con un texto de foro (§D-2.4). Solo hay cuatro códigos nuevos: `PARTICIPACION_YA_PUBLICADA`, `PARTICIPACION_CALIFICADA`, `FORO_CERRADO` y `PARTICIPACION_NO_ENCONTRADA`.
- **S-09.** Cola (P-11): crear un foro encola `TAREA_CREADA` ("nueva actividad", PRD §4.5) y `RECORDATORIO_24H` (RN-08: el "Faltan 24 h" de un foro va a quien no tiene participación principal). Calificar encola `CALIFICACION_PUBLICADA`, igual que hoy. Publicar una participación o una réplica **no encola nada**: esos avisos los decide NOTIFICACIONES. No hay consumidor nuevo.
- **S-10.** El estado del alumno en un foro usa `EstadoEntregaBadge` y `estadoDeEntregaVisible` sin cambios. Si DH-12 pide otras etiquetas, se agrega una variante en `components/estado-entrega-badge.tsx` (01c).
- **S-11.** Los compañeros se ven con su nombre y su firma (como en Dudas), nunca con correo, estado de pago ni restricción.
- **S-12.** No hay edición concurrente de participaciones (no se editan). La del planteamiento usa `tareas.version`; la de calificar, `entregas.version`. Publicar la principal sube `entregas.version`, así que quien calificaba con la versión anterior recibe `409 ENTREGA_MODIFICADA`. **(E1-16, N-06)** Las réplicas **no** suben `entregas.version`. El maestro puede publicar la calificación sin ver una réplica que llegó mientras calificaba, y el alumno sigue replicando después de calificado (S-06). Se acepta: la calificación se decide con lo que el maestro vio, y las réplicas no cambian "entregó".

## Alcance

**Entra:**
- Crear, editar, leer y borrar un foro (RF-66): maestros de la clase y admin, con la regla de autoría de las tareas (RN-07) y el borrado con confirmación del admin si hay participaciones (S-06 de ENTREGAS-01).
- La sección "Foro" (tercera de siete, RF-60, P-02) con la lista de foros. Los foros también aparecen en "Actividades de aprendizaje" (RF-62, DH-08), con "Mover" de tema.
- La participación principal y las réplicas (RF-67, P-09). "La entrega es participar": la principal escribe la fila de `entregas` (RN-08).
- La regla tardía en una sola función (DH-02).
- Calificar a cada alumno con o sin rúbrica (RF-68, RN-05). El comentario de devolución se lee con la calificación (DH-06). El admin lee y no califica.
- El foro en el gradebook, el riesgo, "Mis calificaciones" (con su modal) y la exportación. Las consultas no cambian. El enlace de cada celda va a la participación del alumno (01e).
- La clase archivada (ADMIN-01), de solo lectura también en el foro (01b y frontend). **(Enmienda 7)** En 01a y en el frontend (§E7.3).
- **(Enmienda 7)** El foro ante el borrado definitivo y el duplicado de una clase, y ante la baja de una cuenta (ADMIN-01), sin cambiar ADMIN-01 (§E7.3, DH-17, DH-18).
- Las filas de `docs/ESTADO.md` §3 con destino FORO-01 (§D-0.1). **(Enmienda 7)** Más dos que llegaron después: los vecinos sin caso de CH6-A14 en los formularios de la tarea y el panel de calificación, y "revisar en FORO-01" de ADMIN-01d1/01d2 (§E7.3, "Frontend", punto 8).

**No entra:**
- Avisos de participación o de réplica (P-11: NOTIFICACIONES) y los consumidores de la cola.
- Editar participaciones. Que el alumno borre lo suyo. *(E3-3: el borrado por el admin sí entra, en 01a2, §D-11. Los maestros no borran: PB-1 (a), resuelta (E5-3).)*
- Adjuntos en una participación (P-09: solo texto). Hilo privado del foro (P-09).
- El foro en el calendario (no existe el módulo). Exámenes (hito 3).
- La fila O-3 de CLASES-03a (`entregarSchema`): FORO-01 no toca `shared/src/entregas.ts` (§D-0.1).
- Cualquier cambio en `middleware/`, `adapters/auth`, `infra/` o `.env.example`.

## Diseño

### §D-0. Inventario y reparto

#### §D-0.1. Filas de `docs/ESTADO.md` §3 con destino FORO-01 (grep "FORO", más las que ADMIN-01 desvió aquí)

**(Enmienda 8)** Los números de línea de la primera columna (327, 339, 470, 331, 332) son de `e94ee59` y ya no valen. Las filas se identifican por su texto:
- "O-3 de CLASES-03a: el `refine` de repetidos de `entregarSchema`…";
- "O-r1-2 de CLASES-03e (tester): el bloque de respuestas abierto con 0 respuestas…";
- "El foro en la exportación (CALIFICACIONES-02, S-03)…";
- "Hermanos heredados de `features/tareas` que CLASES-03d corrigió…";
- "PR-1A17 (`features/tareas/como-se-entrega-01a.test.tsx:262`)…".

A-07 las cita igual.

| Fila (línea en `e94ee59`) | Qué dice | Qué hace FORO-01 |
|---|---|---|
| 327 · O-3 de CLASES-03a | El `refine` de repetidos de `entregarSchema` es redundante. Destino: "el próximo encargo que toque `shared/src/entregas.ts` (probablemente FORO-01) o el `chore` de higiene de pruebas" | **No se toca.** FORO-01 no necesita `shared/src/entregas.ts`: reutiliza sus esquemas sin cambiarlos. Además, dos pruebas `*.ataque` cuentan sus esquemas (`hilo-01c-r1.ataque:754-759`, `entregas-01b-r1.ataque:1034`). La fila conserva su segundo destino, el `chore` de higiene de pruebas. Al cierre, A-10 quita "(probablemente FORO-01)" |
| 339 · O-r1-2 de CLASES-03e | El control de respuestas de Dudas con 0 respuestas. Destino: "FORO-01 (las réplicas usan el mismo control) o el carril trivial" | Con DH-11 (a), el foro tiene su propio control y evita ese defecto por diseño (§D-8.4; caso FORO-1D11). `ElementoDeDuda` no se toca y la fila queda con el carril trivial. A-10 lo anota |
| 470 · S-03 de CALIFICACIONES-02 | El foro entra en el gradebook y la exportación solo si sus calificaciones viven en `tareas` y `entregas`; si no, se suma a `leerGradebookCon` "con una prueba de que un foro calificado sale como columna del archivo" | Con DH-01 (a) entra sin tocar `leerGradebookCon`. Prueba en el JSON (FORO-1A40, 01a) y en el .xlsx (FORO-1E14, 01e). **Se cierra en 01e** |
| 331 · hermanos heredados de `features/tareas` (T-01 a T-05 de CLASES-03d) | `editar-tarea-view.tsx:96` (T-01), `formulario-tarea.tsx:105` (T-02, T-03), `useEditarTarea`/`useBorrarTarea` (T-04, T-05). Destino: "el próximo encargo que toque `features/tareas`" | ADMIN-01 la pasó a FORO-01 (E-31; su A-07). **Entra en 01c**, porque el foro se crea y se edita con `FormularioTarea` y heredaría los cinco defectos. Remedio: el que CLASES-03d aplicó en `features/clases` (`resumen-programador-03d.md`, rondas 1 y 2), en §D-8.6 |
| 332 · PR-1A17 | `como-se-entrega-01a.test.tsx:262` lee `TEXTOS_FORMULARIO_PUBLICACION.sinTema`; debe leer `TEXTOS_FORMULARIO_RECURSO.sinTema` y la clave sale de `features/clases/data.ts` | ADMIN-01 la pasó a FORO-01 (E-32). **Entra en 01c** (lista cerrada) |
| 2b punto 4b · CHORE-04 (lista de 29 controles) | "Cada encargo que reescriba un control de esa lista le pone la guarda y lo tacha" | FORO-01 no reescribe ninguno: agrega una rama de foro en `seccion-de-tema.tsx` y `elemento-de-trabajo.tsx`, sin tocar «Subir»/«Bajar» (fila 29) ni los demás. Todo control nuevo nace con su ref. No tacha nada |
| 2b punto 5 · `chore` de foco y navegación | Va "entre ADMIN-01 y FORO-01" | FORO-01 arranca antes, en paralelo, por decisión del humano (nota de `aprobacion.md`). Las vistas nuevas usan los ganchos de hoy (`components/foco/`, `components/seccion/`), así que ese `chore` las encuentra con los mismos patrones. **(Enmienda 7)** Hecho antes: CHORE-06 (`fd4a7ad`); el foro aplica sus reglas (§E7.3) |
| **(Enmienda 7)** ESTADO §3, fila "CHORE-06a (los 'sin caso' de CH6-A14)" | Sin caso de "campo pintado solo en otro modo" en la tarea nueva y su edición, ni de "rechazo seguido de uno local" en esas dos y en el panel de calificación. Destino: "el próximo encargo que toque esos formularios" | FORO-01 los toca: casos FORO-1C40 (01c1; **(Enmienda 9)** 01c2) y FORO-1E40 (01e). Se cierra al final (A-07) |
| **(Enmienda 7)** ESTADO §3, fila de ADMIN-01d1 y 01d2 (un `409` que llega con la clase archivada no pide la recarga; "revisar en FORO-01, que rehace esos ganchos") | Rutas 20 (recurso) y 36 (tarea) y calificar (fila 33) | Tarea y foro: con la extensión de T-04 (FORO-1C41, 01c1; **(Enmienda 9)** 01c2). Calificar: FORO-1E41 (01e). Recurso: se queda en la fila, porque `features/clases` no se toca (A-07) |
| **(Enmienda 7)** ESTADO §3, fila de CHORE-04 (punto 4b de 2b) | Ya cerrada: CHORE-04 está en `main` | Todo control nuevo nace con su guarda y la regla estática CH4-01 (§E7.3) |

#### §D-0.2. Subentregas y conteo estimado de archivos

**(Enmienda 7) Reemplazada por §E7.1 (DH-15).** Lo de abajo queda como historial.

Cada conteo incluye producción, pruebas nuevas y pruebas existentes que cambian (normales de la lista cerrada y `*.ataque` de los C-n). Las listas definitivas de 01b a 01e salen de la "Enmienda de arranque" de cada una, con un grep sobre la base ya fusionada (§D-R0).

| Sub | Cuándo | Paquetes | Contenido | Archivos (estimado) |
|---|---|---|---|---|
| 01a2 (nueva, E3-2) | **Antes de fusionar ADMIN-01**, después de `<K1a1>` (sin entrar a `main`, DH-13) | `shared`, backend | El borrado de participaciones y réplicas por el admin (DH-05 del humano; §D-11): la ruta 17, `puedeBorrarParticipacion` en `core/autoria.ts`, `borrarParticipacion` en `adapters/db/foros.ts`, `puedeBorrar` en las respuestas y el `P2003` de la réplica en `adapters/db/errores.ts` | ~14: `shared/src/foros.ts`; `core/autoria.ts` y `core/foros/participacion.ts`; `adapters/db/foros.ts`, `errores.ts` e `index.ts`; `handlers/foros.ts`; 2 pruebas nuevas (`core/foros/borrado.test.ts`, `backend/test/foros-borrar.integracion.test.ts`); 3 normales de la lista cerrada (`foros-autorizacion.integracion` FORO-1A50 por `puedeBorrar`, `foros-estatico` FORO-1A51/52 por la ruta y el borrado, `adapters/db/errores.test.ts`); 2 `*.ataque` (C-1 bis y C-3) |
| 01a1 (antes "01a"; E3-2) | **Antes de fusionar ADMIN-01** (desde `e94ee59`) | `shared`, backend | Las dos migraciones, `core/foros/participacion.ts` (la regla tardía), los textos por actividad, `tipo` en los adaptadores de tareas, entregas y temas, `adapters/db/foros.ts`, `handlers/foros.ts` (16 rutas), "Actividades" con `seccion=actividades&conForos=si` (E1-4), el texto de categorías con foros (E1-9) | ~32: 4 de `shared` (suma `recursos.ts`, E1-4), 3 de Prisma, 4 de `core`, 8 de `adapters` (suma `categorias.ts`, E1-9), 2 de `handlers`/`app`, 9 de pruebas nuevas y 2 `*.ataque` (C-1, C-2) |
| 01b | **Después de fusionar ADMIN-01 en `main`** (arranca con la fusión) | `shared`, backend | Conciliación de la fusión; `enClaseArchivada: "lectura"` en las lecturas del foro; la tabla de políticas de ADMIN (ADM-1A09) con las rutas del foro; `conTipo=si` y `tipo` en las columnas del gradebook y de "Mis calificaciones"; los README del backend | ~12: 1 de `shared`, 3 de backend, 2 README, 2 pruebas nuevas, 1 de ADMIN (ADM-1A09) y ~3 de conciliación |
| 01c (recontada, E1-4) | **Después de fusionar ADMIN-01** | frontend | Sección "Foro" y su lista; crear, editar y borrar un foro (`FormularioTarea` con `tipo`); el detalle (planteamiento); solo lectura en archivada; hermanos T-01 a T-05 de CLASES-03d y PR-1A17. **Sin "Actividades"**, que pasa a 01d | ~28: 16 de producción (10 en `features/tareas`, 4 en `features/clases`, `services/trabajoService.ts`, `app/router.tsx`), 7 pruebas nuevas, 5 existentes (`secciones-03c1`, `como-se-entrega-01a`, `errores-ch3` de tareas y su `*.ataque`, V-06) |
| 01d (recontada, E1-4; E3-3) | **Después de fusionar ADMIN-01** | frontend | Foros en "Actividades" (`conForos=si`, insignia, "Crear foro", "Mover"), los textos de categorías (E1-9), la participación principal, las réplicas, "Tu participación" (estado y fecha) y "Borrar" del admin (E3-3, en los mismos componentes) | ~30, con 1 prueba nueva por el borrado (E3-3); si la Enmienda de arranque pasa de unos 30, se aplica su regla de corte. Desglose de antes, ~29: 15 de producción (5 en `features/clases`, 10 en `features/tareas`), 6 pruebas nuevas y ~8 existentes. Las existentes: las pruebas del grep que fijan la URL completa de `/trabajo` o `/temas` (con `conForos`, solo esas cambian; se estiman 3), las que fijan "N tareas" en el editor de categorías (2), V-06 y las listas de códigos |
| 01e | **Después de fusionar ADMIN-01** | frontend | Las participaciones de un foro (lista para calificar), la participación de un alumno con el panel de calificación, la devolución, la calificación en "Tu participación", los enlaces por tipo del gradebook y de "Mis calificaciones", y el .xlsx con un foro; `DESIGN.md` | ~26: 15 de producción, ~7 pruebas nuevas, ~4 existentes |

**Por qué estos cortes:**
- **01a1 / 01a2 (E3-2):** con el borrado dentro, 01a pasaba a unos 37 archivos (los 32 de antes, más `core/autoria.ts`, `adapters/db/errores.ts`, el C-n de `lecturas-fx-r2.ataque` y las dos pruebas nuevas). La regla parte por encima de unos 30. Las dos partes siguen siendo "01a" en el sentido del humano ("entra en 01a"): van antes de fusionar ADMIN-01, en `feat/foro-01`, sin llegar a `main` (DH-13). La tabla lleva 01a2 primero solo porque es la fila nueva; el orden de trabajo es 01a1 y después 01a2.
- **01a / 01b:** la regla de ADMIN-01 (§D-X). 01a + 01b ≈ 45 archivos.
- **01b / 01c:** 01b + 01c ≈ 41 archivos.
- **01c / 01d:** 01c + 01d ≈ 57 archivos.
- **01d / 01e:** 01d + 01e ≈ 55 archivos.

Ninguna parte junta pasa de unos 30, salvo estas uniones. 01a1 queda en el límite (~32) sin partirse: es un solo paquete y una sola migración lógica. El manager ya la aceptó así (verificación de la Enmienda 1).

**Recuento de M-04 (E1-4).** Con el diseño anterior (`seccion=actividades-y-foros`), 01c llegaba a unos 44 archivos: los 17 del frontend que dependen del valor `"actividades"` (dobles con `searchParams.get("seccion") === "actividades"` y claves `claveTemasDeLaSeccion(…, "actividades")`, unos 8 de ellos `*.ataque`), más los 19 de producción y las demás. Se comparó partir 01c contra conservar el valor:
- **Se elige conservar `seccion=actividades` y su clave de caché, y pedir los foros con `&conForos=si`.** Los dobles que eligen por `seccion` siguen valiendo. Solo cambian las pruebas que fijan la URL completa, y la Enmienda de arranque de 01d las cuenta.
- **"Actividades" pasa a 01d.** Sin ese cambio, 01c + "Actividades" seguiría por encima de 30 (unos 28 + 9).
- **01c queda en ~28 y 01d en ~29.**

**Si la Enmienda de arranque de 01d encuentra más de unas 6 pruebas que fijan la URL completa**, 01d pasa de unos 30 y se parte: 01d1 con "Actividades" y los textos de categorías, y 01d2 con las participaciones. El conteo se declara en esa enmienda.

**La misma regla vale para 01c (E2-3, N-12).** Si su Enmienda de arranque pasa de unos 30 archivos, 01c se parte. Las causas probables: pruebas que fijan el comportamiento de hoy de los hermanos T-01 a T-05, o el conteo de `perspectivaDeRuta(` de `estatico-02c-r1.ataque:123-133` con las vistas nuevas.
- **01c1:** los hermanos T-01 a T-05, PR-1A17 y `tipo` en `FormularioTarea` y `AccionesDeLaTarea`.
- **01c2:** las vistas del foro, la sección "Foro" y el router.

El conteo se declara en esa enmienda.

### §D-X. Cruce con ADMIN-01 (regla del humano)

**(Enmienda 7) Sin objeto como cruce:** ADMIN-01 está en `main` y no hay fusión (§E7.0). Lo que dice de la clase archivada sigue valiendo, pero en 01a y no en 01b (§E7.3). Los archivos que nombra se tocan según §E7.5. Lo de abajo queda como historial.

Lista "Se toca" de ADMIN-01: su §D-R0 (01a, 01b, 01e del backend; 01c, 01d1, 01d2, 01f, 01g del frontend) y su §D-9 / "Cambios por capa". Abajo, cada archivo de FORO-01 que coincide con esa lista o con `middleware/`.

| Archivo de FORO-01 | Subentrega de ADMIN-01 que lo toca | Subentrega de FORO-01 | Cómo se evita o por qué se difiere |
|---|---|---|---|
| `shared/src/index.ts` | 01a, 01b, 01e | 01a | **Cruce inevitable** (cada esquema nuevo se exporta aquí). Se reduce a un bloque nuevo `export { … } from "./foros.js"`, insertado **entre el bloque de `./dudas.js` y la línea de `./errores.js`** (líneas 100-101 en `e94ee59`). ADMIN-01 escribe en el bloque de `./clases.js` y agrega `./usuarios-admin.js`. Ningún nombre de `./tareas.js` cambia, así que ese bloque no se toca. Conflicto esperado: ninguno o uno de líneas vecinas, que se resuelve conservando los dos bloques |
| `backend/prisma/schema.prisma` | 01a (`Clase.archivadaEn`), 01b (`Archivo.copiaDe`, índices), 01e (índices de `Usuario` y `MovimientoInscripcion`) | 01a | **Cruce inevitable.** FORO-01 suma `foro` a `TipoPublicacion`, el modelo `ParticipacionForo` y una relación en `Usuario` (`participacionesForo`) y en `Tarea` (`participaciones`). La relación de `Usuario` va **al final de su lista de relaciones**, después de `dudasResueltas`. ADMIN agrega índices al final del bloque. Conflicto probable en `Usuario`: se conservan las dos partes y se corren `prisma format` y `prisma validate`. Después, `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` debe terminar sin diferencias (§D-R0 01b) |
| `backend/prisma/migrations/` | 01a, 01b, 01e (una carpeta cada una) | 01a (dos carpetas) | Carpetas distintas, sin conflicto de archivo. **Orden:** Prisma aplica por nombre de carpeta. Las de FORO llevan la marca de su creación en 01a, que puede quedar entre las de ADMIN. Las cinco son independientes: ninguna toca una columna, una restricción o un índice de otra. FORO cambia un CHECK de `publicaciones` y crea una tabla; ADMIN toca `clases`, `archivos`, `usuarios` y `movimientos_inscripcion`. Por eso cualquier intercalado da el mismo esquema. En 01b, la suite completa del backend (Testcontainers, `migrate deploy` desde cero con todas) lo comprueba, junto con `migrate diff --exit-code`. No se renombra ninguna carpeta. En la base de desarrollo de la copia B, `prisma migrate dev` después de fusionar aplica las de ADMIN que falten: si Prisma reclama por el orden, **PARADA** y lo decide el humano (reiniciar esa base de desarrollo o no). En `prod`, `migrate deploy` aplica las pendientes aunque haya otras posteriores ya aplicadas (fila DEPLOY, R-04) |
| `backend/src/adapters/db/index.ts` | 01a, 01b, 01e | 01a | **Cruce inevitable** (los handlers importan de aquí, por la convención del paquete). FORO-01 agrega un bloque de exportaciones de `./foros.js` al final y no cambia ninguna exportación existente. Conflicto esperado de líneas vecinas al final: se conservan las dos |
| `backend/src/adapters/db/publicaciones.ts` | 01b (solo `:319-322`, el `updateMany` del descarte) | 01a | **Cruce inevitable**, en otro tramo del archivo. Con `foro` en el enum de Prisma, `PublicacionDb.tipo` (`:31`) deja de compilar al copiar `fila.tipo`. Además, la lista sin `tipo` (`listarPublicaciones`, `:207`, la de compatibilidad hasta A-13) devolvería un foro que su esquema de respuesta no admite (`500`). FORO-01 cambia solo `:207` (y la comprobación del cursor, que usa el mismo `donde`), excluye `foro` y deja el tipo de `:31` como está. Git fusiona los dos tramos sin conflicto (están a más de 100 líneas) |
| `backend/test/sesiones-y-cadena.ataque.test.ts:553` | 01a (C-1), 01b (C-3), 01e (C-6) | 01a (C-1 de FORO) | **Cruce inevitable** (la lista de todas las rutas). En la fusión de 01b, la lista queda como la unión de las dos ramas, en orden y sin duplicados. Lo hace el programador en la conciliación y el tester lo verifica (C-3 de FORO, §D-R0 01b) |
| `backend/test/lecturas-fx-r1.ataque.test.ts:805-825` | 01a (C-2), 01b (C-5), 01e (C-8) | 01a (C-2 de FORO) | **Cruce inevitable** (la lista de `instantaneaUnica` por archivo). Igual que la anterior: unión ordenada en la conciliación de 01b (C-4 de FORO) |
| `backend/src/handlers/calificaciones.ts` | 01a (`enClaseArchivada` en sus rutas) | 01b | **Se difiere a 01b:** `columnaParaResponder` gana `conTipo` (DH-09). En 01a no se toca: el gradebook y la exportación cuentan el foro sin ese cambio |
| `backend/src/handlers/tareas/{tareas,temas,entregas,hilo-privado,categorias}.ts` | 01a | — | **Se evita:** el `tipo` va en los adaptadores con valor por omisión `"tarea"`, así que estos handlers no cambian (§D-3.3). El foro tiene su propio handler, `handlers/foros.ts`, fuera de `handlers/tareas/` (`temas-01a-r1.ataque:998-1006` enumera esa carpeta) |
| `backend/src/handlers/README.md`, `backend/src/adapters/README.md` | 01a, 01b, 01e | 01b | **Se difiere a 01b:** la documentación del foro se escribe después de fusionar |
| `backend/src/adapters/db/categorias.ts` (E1-9) y `shared/src/recursos.ts` (E1-4) | — | 01a | No están en las listas de ADMIN-01: sin cruce |
| `backend/test/lecturas-fx-r2.ataque.test.ts:967` (E3-3) | 01b (C-4) | 01a2 (C-3) | **Cruce inevitable** (la lista de borrados de `backend/src`). En la fusión de 01b, la unión ordenada; la resuelve el tester (§D-R0 01b, punto 4) |
| `backend/src/core/autoria.ts` y `backend/src/adapters/db/errores.ts` (E3-3) | — | 01a2 | No están en las listas de ADMIN-01: sin cruce |
| `backend/src/middleware/**` | 01a | — | **No se toca.** Las escrituras del foro heredan el cierre por omisión de ADMIN-01 (§D-1 de su plan: una ruta sin `enClaseArchivada` responde `409 CLASE_ARCHIVADA` a todos en una archivada). Las lecturas declaran `"lectura"` en 01b, con la opción que ADMIN-01 agrega a `protegido()` |
| Prueba de ADMIN-01 que recorre `printRoutes` (ADM-1A09, "falla si una ruta con `:claseId` no está en esta tabla") | 01a | 01b | **Se difiere a 01b:** después de fusionar, esa prueba falla hasta que la tabla nombra las 17 rutas del foro con su política (16 de 01a1 y la 17 de 01a2, E3-3). El nombre del archivo y la línea los fija la Enmienda de arranque de 01b, con un grep sobre la base fusionada |
| `frontend/src/app/router.tsx` | 01c, 01d2, 01f, 01g | 01c, 01e | **Se difiere** (DH-10 a) |
| `frontend/src/features/clases/{data,hooks,types,lib}.ts`, `clase-layout.tsx`, `trabajo-view.tsx`, `components/seccion-de-tema.tsx`, `components/elemento-de-trabajo.tsx` | 01c, 01d1, 01d2 | 01c (sección y lista), 01d ("Actividades" y categorías; E1-4) | **Se difiere.** `clase-layout.tsx` no se toca: la sección "Foro" se agrega en `SECCIONES_DE_LA_CLASE` (`data.ts`) |
| `frontend/src/features/tareas/{hooks,data,lib,types}.ts`, `editar-tarea-view.tsx`, `crear-tarea-view.tsx`, `detalle-tarea-view.tsx`, `entrega-de-alumno-view.tsx`, `components/hilo-privado.tsx` | 01d2 | 01c, 01d, 01e | **Se difiere.** De esos, FORO-01 toca `hooks.ts`, `data.ts`, `lib.ts`, `types.ts` y `editar-tarea-view.tsx` (T-01). Los demás, no |
| `frontend/src/features/calificaciones/components/lista-de-mis-calificaciones.tsx` | 01d2 | 01e | **Se difiere** |
| `frontend/src/services/clasesService.ts`, `components/clase/*` | 01d1, 01d2 | — | **No se tocan.** El foro usa lo que ADMIN-01 deja: `useSoloLecturaDeLaClase`, `esClaseArchivada` y `claveClaseDetalle` en `services/clasesService.ts` |

**La clase archivada en el foro (cómo se hereda sin tocar el middleware):**
- **Backend:**
  - Toda escritura del foro (crear, editar, borrar, participar, replicar, calificar) es una ruta sin `enClaseArchivada`. En cuanto llega ADMIN-01, responde `409 CLASE_ARCHIVADA` en una archivada, sin cambiar FORO.
  - En 01b, las lecturas declaran `enClaseArchivada: "lectura"`: pasan maestros y admin, y el alumno recibe `409`, como en la tabla de §D-1 de ADMIN-01, donde también `GET …/tareas/:tareaId/entrega` es `lectura`.
  - Casos FORO-1B01 a FORO-1B05.
- **Frontend (01c a 01e):**
  - Cada control de escritura del foro lee `useSoloLecturaDeLaClase()` y no se pinta en una archivada.
  - Las rutas de crear y editar un foro pintan el texto de archivada, como las de la tarea (filas 35 y 36 del inventario de ADMIN).
  - Un `409 CLASE_ARCHIVADA` en una mutación del foro sigue la política de ADMIN-01 para `features/tareas` (su Enmienda 2, M-06): un solo aviso, lo escrito se conserva y se marca viejo `claveClaseDetalle` con `exact: true`. La suscripción de `ClaseLayout` (su Enmienda 3) lo cubre también con la vista montada.

### §D-1. Modelo de datos (DH-01)

#### §D-1.1. Las dos opciones, comparadas

| Tema | (a) `publicaciones` + `tareas` + `entregas` + `participaciones_foro` | (b) Tablas propias |
|---|---|---|
| Gradebook (`leerGradebookCon`) | Sin cambio en la consulta: lee `tareas` por `clase_id` y `entregas` por (`tarea_id`, `alumno_id`), así que el foro sale como una columna más. Solo se agrega `tipo` para el enlace (01b, opt-in) | Unir dos fuentes en las columnas, las celdas, los agregados por categoría y las vencidas (cuatro consultas), con su propio cursor de columnas |
| Riesgo (`vencidasDeLaClase`) | Sin cambio: un foro vencido sin `entregas` `entregado`/`calificado` del alumno cuenta. Como la principal escribe `entregado` (§D-2), "sin participación principal" = "sin entregar" (RN-05, RF-67) | Un segundo `LEFT JOIN` con su propia condición |
| "Mis calificaciones" y su modal | Sin cambio en la consulta (`leerMisCalificacionesCon`) ni en `calificacionGeneral` | Unión en la página, el filtro por estado y la suma por categoría |
| Exportación (CALIFICACIONES-02) | Sin cambio: sale de `leerGradebookCon` (S-03 se cierra sola) | Lo que diga el gradebook, más su prueba |
| Calificar (rúbrica, `version`, P-03 c′, P-04, `CALIFICACION_PUBLICADA`) | Se reutiliza `calificarEntrega` con `tipo: "foro"` | Duplicarlo (bloqueos, versión, puntajes, rúbrica congelada) |
| Recordatorio 24 h y trabajos diferidos (regla 8) | Se reutiliza `trabajo_id` de `tareas` y `planDeRecordatorio`: editar la fecha cancela y recrea en la misma transacción | Otra columna `trabajo_id` y otro plan |
| Autoría y borrado con confirmación | Se reutilizan `puedeEditarTarea`, `puedeBorrarTarea` y `exigirBorradoConEntregasPermitido` (RN-07: "el planteamiento sigue la regla de las tareas") | Duplicarlas |
| Autorización | Rutas propias en `handlers/foros.ts`; las de tarea deben **rechazar** un foro (costo principal de esta opción): `tipo` en los adaptadores (§D-3.3) | Rutas propias, sin ese riesgo |
| Migración | El valor `foro` del enum (su propia migración), el CHECK de título ampliado y una tabla nueva | Cinco tablas nuevas con sus CHECK y la FK diferida de los puntajes (como CALIFICACIONES-01a) |
| ADMIN-01 (borrar, contar, duplicar) | El borrado definitivo se lleva el foro en cascada (`clases` → `publicaciones` → `tareas` → `participaciones_foro`, `entregas`). El conteo de "actividades" lo incluye si cuenta `tareas` (se verifica en 01b). Duplicar no lo copia (no copia actividades). **(Enmienda 7) Verificado en `fd4a7ad`:** `contarParaBorrar` cuenta `tareas`, y duplicar solo lee materiales (§E7.3, "Backend", puntos 2 y 3) | Sumar las tablas nuevas a su conteo y a su borrado |

#### §D-1.2. Tablas y columnas (01a)

- **`tipo_publicacion`** suma `foro`. Su migración solo tiene `ALTER TYPE "tipo_publicacion" ADD VALUE 'foro';`, como `20261006151453_tipo_publicacion_tarea`: PostgreSQL no deja usar un valor nuevo del enum en la transacción que lo crea.
- **`publicaciones`:** un foro lleva `titulo` (S-01), `texto` (el planteamiento), `tema_id` opcional y `bloque` nulo. El CHECK `publicaciones_titulo_segun_tipo` se reemplaza a mano para incluir `'foro'`:
  `CHECK (("tipo" = 'anuncio' AND "titulo" IS NULL) OR ("tipo" IN ('material', 'tarea', 'foro') AND "titulo" IS NOT NULL))`.
  `publicaciones_anuncio_sin_tema`, `publicaciones_bloque_solo_material` y `publicaciones_version_no_negativa` no cambian: un foro no es anuncio, no lleva bloque y su `version` se queda en 0 (el foro usa `tareas.version`).
- **`tareas`:** la fila 1:1 del foro, sin columnas nuevas (`requiere_adjuntos = false`, S-07).
- **`entregas`:** sin columnas nuevas.
  - La fila de un alumno en un foro nace con la principal (`entregado`, `fecha_entrega` = hora de la principal, `con_retraso`) o con la calificación (`calificado` sin `fecha_entrega`, P-03 c′).
  - `enlaces` siempre es `[]` y nunca tiene archivos.
  - Sus CHECK de hoy se cumplen sin cambio.
- **`participaciones_foro`** (nueva):

  | Columna | Tipo | Nota |
  |---|---|---|
  | `id` | `uuid` PK, `gen_random_uuid()` | El handler lo genera (como los comentarios) |
  | `foro_id` | `uuid` NOT NULL, FK → `tareas(id)` `ON DELETE CASCADE` | Muere con el foro |
  | `autor_id` | `uuid` NOT NULL, FK → `usuarios(id)` `ON DELETE RESTRICT` | Como `comentarios`; no hay bajas físicas |
  | `principal_id` | `uuid` NULL, FK → `participaciones_foro(id)` `ON DELETE CASCADE` | `NULL` = participación principal; con valor = réplica de esa principal (S-03) |
  | `texto` | `text` NOT NULL | |
  | `con_retraso` | `boolean` NOT NULL DEFAULT `false` | Lo decide `reglaDeParticipacion` al escribir (DH-02); no se recalcula si la fecha cambia, como `entregas.con_retraso` |
  | `creado_en` | `timestamptz(3)` NOT NULL DEFAULT `now()` | La fecha y hora que ve el maestro |

  Sin `actualizado_en`: no se edita (DH-05). Sin `clase_id`: se llega siempre por el foro, que se filtra por la clase de la ruta, como el hilo privado.
  - Índices (Prisma), **E1-3 (M-03)**:
    - `@@index([foroId, principalId, creadoEn, id])`: la lista de principales (`foro_id = $1 AND principal_id IS NULL ORDER BY creado_en, id`) y el conteo de principales por foro.
    - `@@index([principalId, creadoEn, id])` (nuevo en E1-3): la lista de réplicas (`principal_id = $1 ORDER BY creado_en, id`), el conteo de réplicas por principal (`principal_id IN (…)`, con `foro_id = $1` además, §D-3.4) y la FK `principal_id → participaciones_foro(id) ON DELETE CASCADE`. Cuando la cascada borra una principal (al borrar el foro, o la clase con el borrado definitivo de ADMIN-01), PostgreSQL busca sus réplicas por este índice y no recorre la tabla por cada principal.
    - `@@index([foroId, autorId, creadoEn, id])`: lo que escribió un alumno en un foro y su principal.
    - La FK `foro_id` usa el prefijo de los dos índices que empiezan por `foro_id`. La FK `autor_id` (`RESTRICT`) no lleva índice, como `comentarios.autor_id` y `dudas.autor_id`: no hay bajas físicas de usuarios.
  - A mano en la migración (Prisma no expresa índices parciales; como DEC-01): `CREATE UNIQUE INDEX "participaciones_foro_una_principal" ON "participaciones_foro" ("foro_id", "autor_id") WHERE "principal_id" IS NULL;`. Es una sola principal por alumno y foro. Es la red de seguridad: el orden de bloqueo de §D-4 ya la garantiza.
- **Prisma:**
  - `model ParticipacionForo` con `@@map("participaciones_foro")`.
  - Relaciones: `foro Tarea @relation(…, onDelete: Cascade)`, `autor Usuario @relation("ParticipacionesForoDelAutor", …, onDelete: Restrict)` y `principal ParticipacionForo? @relation("ReplicasDeParticipacion", …, onDelete: Cascade)` con `replicas ParticipacionForo[]`.
  - `Tarea` gana `participaciones ParticipacionForo[]`. `Usuario` gana `participacionesForo ParticipacionForo[] @relation("ParticipacionesForoDelAutor")` al final de su lista de relaciones (§D-X).
  - El comentario del modelo explica el porqué: principal y réplica en una tabla, el índice único parcial y la ausencia de `clase_id`.
- **Compatibilidad hacia atrás:** el enum crece, el CHECK se amplía y la tabla es nueva. Un backend anterior nunca escribe un foro. Leer filas `foro` con un backend anterior (vuelta atrás después de crear foros) no está garantizado: R-02.

### §D-2. Reglas de negocio puras (`core/`)

#### §D-2.1. La regla de la participación tardía: una sola función (DH-02)

`backend/src/core/foros/participacion.ts`:

```ts
export type TipoDeParticipacion = "principal" | "replica"
export interface ForoParaParticipar {
  fechaLimite: Date
  aceptaTardias: boolean
}
export interface ReglaDeParticipacion {
  // Si se puede publicar en este momento.
  abierta: boolean
  // Si lo que se publique queda marcado "con retraso".
  conRetraso: boolean
}

// DH-02 (pendiente con el cliente): ÚNICO lugar de la regla tardía del foro. Cambiar el valor por
// omisión es cambiar esta función y su prueba, nada más.
export const reglaDeParticipacion = ({
  tipo,
  rolDelAutor,
  foro,
  ahora,
}: {
  tipo: TipoDeParticipacion
  rolDelAutor: Rol // de @campus/shared
  foro: ForoParaParticipar
  ahora: Date
}): ReglaDeParticipacion
```

Valor por omisión, con DH-02 (a) y DH-03 (a):
- `rolDelAutor === "admin"`: `{ abierta: false, conRetraso: false }`. Es inalcanzable (las rutas 9 y 11 no admiten al admin) y está ahí para que el caso exista en un solo lugar.
- `rolDelAutor === "maestro"` (solo réplicas): `{ abierta: true, conRetraso: false }`, siempre.
- Alumno, principal o réplica: `abierta = !entregaCerrada(foro, ahora)` y `conRetraso = esTarde(foro.fechaLimite, ahora)`. Las dos vienen de `core/entregas/entregas.ts`: la misma regla y el mismo milisegundo inclusive que RF-15 y RF-44 (S-03 de ENTREGAS-01).
- `tipo` no cambia el resultado con el valor por omisión (P-09: "las réplicas siguen la misma regla de cierre que la principal"). Va en la firma para que la decisión del cliente, si distingue principal de réplica, quepa aquí.

Lo usan, sin repetir la regla:
- `decidirParticipacionPrincipal({ foro, estado, fechaEntrega, ahora }): { conRetraso: boolean }`. Lanza, en este orden: `PARTICIPACION_YA_PUBLICADA` si `fechaEntrega !== null` (entregó: S-12); `PARTICIPACION_CALIFICADA` si `estado === "calificado"` (calificado sin participar, S-06); `FORO_CERRADO` si `!regla.abierta`.
- `decidirReplica({ foro, rolDelAutor, ahora }): { conRetraso: boolean }`. Lanza `FORO_CERRADO` si `!regla.abierta`. Con DH-04 (b) o (c) recibiría además `{ esPropia, tienePrincipal }` y lanzaría `REPLICA_NO_PERMITIDA`; con (a), no.
- `accionesDelForo({ foro, estado, fechaEntrega, ahora })`, para el alumno, sin lanzar. Son las mismas reglas: `puedeParticipar` = sin `fechaEntrega`, no calificado y abierta; `puedeReplicar` = la regla de la réplica abierta. **(E1-1)** Devuelve además `participarConRetraso` y `replicarConRetraso`: el `conRetraso` de la regla para una principal y para una réplica publicadas ahora. Tipo de retorno: `{ puedeParticipar: boolean; puedeReplicar: boolean; participarConRetraso: boolean; replicarConRetraso: boolean }`.
- **(E1-1, M-01) Calificar a quien no participó (P-03 c′) en un foro:** `exigirEntregaCalificable({ estado, tarea, ahora, actividad })` (`core/calificaciones/calificar.ts`). Con `actividad: "foro"`, decide "la participación ya se cerró" con `!reglaDeParticipacion({ tipo: "principal", rolDelAutor: "estudiante", foro: tarea, ahora }).abierta`, y no con su copia `!aceptaTardias && esTarde(…)`. Con `"tarea"` (por omisión), lo de hoy, letra por letra. Así, calificar y participar coinciden con cualquier regla que elija el cliente: nunca se califica a quien todavía puede participar, y siempre se puede calificar a quien ya no puede. `core/calificaciones/` importa de `core/foros/`, dentro de `core/`.
- **(E1-1) La interfaz no recalcula la regla:**
  - El aviso "tu participación quedará marcada con retraso" sale de `miParticipacion.participarConRetraso`. El de la réplica, si DH-02 lo pidiera, saldría de `replicarConRetraso`.
  - El texto de cerrado sale de `!puedeParticipar`, sin principal.
  - La insignia "Con retraso" sale del `conRetraso` guardado.
  - Ningún componente compara `fechaLimite` con la hora para decidir el cierre o el retraso.
  - Sí lo hacen, y es correcto: la insignia de vencimiento (`vencimientoDe`) y "Sin entregar" (`estadoDeEntregaVisible`) dependen de la fecha límite y no de la regla tardía (RN-05: el riesgo cuenta las vencidas sin entregar por fecha). Se declaran fuera de DH-02 a propósito.

#### §D-2.2. Contraste del valor por omisión con RF-15, RF-44 y RN-08

| Regla | Qué dice | ¿Vigente con DH-02 (a)? |
|---|---|---|
| RF-44 (y RF-66: "si acepta participaciones tardías, igual que una tarea") | Al crear o editar, el maestro elige si acepta tardías; por defecto, sí | **Sí.** El foro guarda `tareas.acepta_tardias` y el formulario ofrece "Participaciones después de la fecha límite" (01c) |
| RF-15 + RN-08 (cierre) | Si no acepta tardías, la participación se cierra en la fecha límite (principal y réplicas, P-09) | **Sí**, para los alumnos (`FORO_CERRADO`). Para los maestros, no (DH-03 a) |
| RN-08 (marca) | Publicada después de la fecha límite en un foro que acepta tardías, es "con retraso" | **Sí.** `entregas.con_retraso` de la principal y `participaciones_foro.con_retraso` de cada participación del alumno |
| RF-15, RF-44 (reapertura; ESSENTIALS "Entregas") | El cierre se calcula en cada acción con la tarea vigente: mover la fecha límite o aceptar tardías la reabre | **Sí.** `reglaDeParticipacion` corre en cada escritura con la fila de `tareas` bloqueada (§D-4) |
| RN-05 ("las entregas con retraso cuentan igual") | Una entrega con retraso no se penaliza en la calificación | **Sí:** "sin penalización" es justo esto. El valor por omisión no cambia el cálculo |
| P-03 c′ (calificar a quien no entregó) | Solo con la entrega cerrada (vencida en una actividad que no acepta tardías) | **Sí.** En un foro, "cerrada" es lo que diga `reglaDeParticipacion` (E1-1): `exigirEntregaCalificable` la consulta con `actividad: "foro"` (`ENTREGA_NO_CALIFICABLE`, con texto de foro, §D-2.4). Con el valor por omisión da lo mismo que la tarea |
| "El maestro ve la fecha y hora de cada participación" (valor por omisión del humano) | — | **Sí:** `creadoEn` en cada participación y réplica. 01d y 01e la muestran con fecha y hora (`formatearFechaLarga` con hora) a maestros y admin |

#### §D-2.3. Otras funciones puras nuevas

- `core/foros/participacion.ts`:
  - `verRetrasoDe({ relacion, esPropia }): boolean`. Es `true` para `"maestro"` y `"admin"`, y para el alumno solo si `esPropia` (DH-07 a). Es un dato de la respuesta, como `alumnoDeLaRelacion`, no un permiso.
  - Los errores: `participacionYaPublicada()` (`409`, "Ya publicaste tu participación en este foro."), `participacionCalificada()` (`409`, "Tu participación en este foro ya está calificada."), `foroCerrado()` (`409`, "La fecha límite ya pasó y este foro no acepta participaciones con retraso.") y `participacionNoEncontrada()` (`404`, "Esa participación ya no existe.").
- `backend/src/core/actividades.ts` (nuevo): `export type Actividad = "tarea" | "foro"` y `TEXTOS_POR_ACTIVIDAD`, la tabla de §D-2.4.

#### §D-2.4. Los mismos códigos, con texto de foro

Las funciones de `core/` que hoy nombran "tarea" en su mensaje ganan un último parámetro opcional, `actividad: Actividad = "tarea"`. Con `"tarea"`, el mensaje es el de hoy, letra por letra (ninguna prueba existente cambia); con `"foro"`, el de la tabla. Los adaptadores lo pasan con su `tipo`.

| Función (archivo) | Código | Texto con `"foro"` |
|---|---|---|
| `validarCategoriaRequerida` (`core/tareas/tareas.ts`) | `CATEGORIA_REQUERIDA` | "Elige la categoría del foro." |
| `mensajeTareaConEntregas` / `exigirBorradoConEntregasPermitido` (ídem) | `TAREA_CON_ENTREGAS` | Admin: "Este foro tiene {n} alumno(s) con participación o calificación. Si lo borras, también se borrarán sus participaciones, sus réplicas y sus calificaciones, y no se puede deshacer." Maestro: "Este foro tiene {n} alumno(s) con participación o calificación y no se puede borrar. Si de verdad hay que borrarlo, pídelo a administración." (mismo singular y plural que hoy) |
| `tareaModificada` (ídem) | `TAREA_MODIFICADA` | "Otra persona guardó cambios en este foro mientras lo editabas. Tus cambios no se guardaron: vuelve a hacerlos sobre la versión actual." |
| `entregaModificada` (`core/calificaciones/calificar.ts`) | `ENTREGA_MODIFICADA` | "La participación cambió mientras la calificabas: el alumno la publicó u otra persona la calificó. No se guardó tu calificación; revisa la participación actual." |
| `rubricaModificada` (ídem; también la lanza `decidirCalificacion`) | `RUBRICA_MODIFICADA` | "La rúbrica o los puntos del foro cambiaron mientras calificabas. No se guardó tu calificación; vuelve a calificar con la versión actual." |
| `entregaNoCalificable` / `exigirEntregaCalificable` (ídem) | `ENTREGA_NO_CALIFICABLE` | "Este alumno todavía puede participar. Podrás calificarlo cuando participe o cuando se cierre el foro." **(E1-1)** Con `"foro"`, además del texto cambia la decisión: el cierre sale de `reglaDeParticipacion` (§D-2.1) |
| `tareaConCalificaciones` / `exigirRubricaCongelada` (ídem) | `TAREA_CON_CALIFICACIONES` | "Este foro ya tiene calificaciones: no puedes cambiar sus puntos ni su rúbrica. Lo demás sí se puede editar." |
| `errorTareaNoEncontrada` de `adapters/db/tareas.ts` (`autorYPertenencia` y `crearTarea`) y el `404` de `handlers/foros.ts` | `TAREA_NO_ENCONTRADA` | "Ese foro ya no existe." |

Los demás mensajes que el foro puede recibir no nombran "tarea" y no cambian: `FECHA_LIMITE_INVALIDA`, `CATEGORIA_NO_ENCONTRADA`, `TEMA_NO_ENCONTRADO`, `EDICION_NO_PERMITIDA`, `BORRADO_NO_PERMITIDO`, `ARCHIVO_INVALIDO`, `ALUMNO_NO_ENCONTRADO` y los `VALIDACION` de calificar. El `ERROR_INTERNO` "La calificación no corresponde a la rúbrica de la tarea." es inalcanzable y se queda.

#### §D-2.5. Qué cambia cada opción de DH-02 (E1-1, M-01)

En el código, la regla se lee **solo** en `reglaDeParticipacion`. La consultan `decidirParticipacionPrincipal`, `decidirReplica`, `accionesDelForo` y `exigirEntregaCalificable` con `"foro"`, y la interfaz recibe sus resultados. Lo que cambia, además de la función y `participacion.test.ts`:

| Opción | Código, además de la función | Textos | Documentos |
|---|---|---|---|
| (a) por omisión | Nada | Los de §D-9 | Los de "Documentos al cierre" |
| (b) sin marca, con cierre | Nada: `conRetraso` sale `false` y la interfaz deja de pintar la insignia y el aviso sola | `features/tareas/data.ts`: "Aceptar con retraso" → "Aceptar después de la fecha límite"; "Se aceptan participaciones con retraso" → "Se aceptan participaciones después de la fecha límite"; sale "La fecha límite ya pasó: tu participación quedará marcada con retraso." | PRD RN-08 (viñeta "Foro"), ESSENTIALS línea 127 ("tarde y cierre como en las entregas") |
| (c) sin marca ni cierre | `FormularioTarea` con `tipo="foro"` sin el control de tardías (`aceptaTardias` se envía `true`) y `ForoView` sin la fila de la política. Calificar a quien no participó deja de proceder (P-03 c′ nunca se cumple) | Los de (b), sin el control ni su fila | Los de (b), más PRD RF-66 ("si acepta participaciones tardías") y RF-67 ("las réplicas siguen la misma regla de cierre") |
| (d) penalización | Fuera de la función: `core/calificaciones/` | — | Otro encargo |

### §D-3. Rutas y adaptadores

#### §D-3.1. Rutas nuevas (`backend/src/handlers/foros.ts`, plugin `forosHandler`, prefijo `/api`)

Toda ruta pasa por `protegido()` y por `claseDe(request)`. Ninguna compara rol ni relación a mano: lo que depende de la relación (la entrega del alumno en la lista, `verRetrasoDe`) lo decide `core/` con la relación del sexto paso. El `HEAD` de cada `GET` hereda su cadena. Las respuestas no llevan correo, estado de pago, restricción, rol, `trabajo_id` ni `requiere_adjuntos`.

| # | Método y ruta | `protegido({…})` | Cuerpo / consulta (`shared/src/foros.ts`) | Respuesta | Adaptador |
|---|---|---|---|---|---|
| 1 | `POST /clases/:claseId/foros` | `roles: ["maestro", "admin"], pertenencia: "propiedad"` | `crearForoSchema` | `201 foroRespuestaSchema` | `crearTarea({ …, tipo: "foro" })` + encolar `TAREA_CREADA` y `RECORDATORIO_24H` |
| 2 | `GET /clases/:claseId/foros` | `roles: ["estudiante", "maestro", "admin"], pertenencia: "inscripcion"` | `forosQuerySchema` (`paginacionSchema`, 20 por omisión) | `listaForosRespuestaSchema` | `listarForos` |
| 3 | `GET /clases/:claseId/foros/:foroId` | ídem 2 | `foroIdParamSchema` | `foroRespuestaSchema` | `leerTarea({ …, tipo: "foro" })` |
| 4 | `PUT /clases/:claseId/foros/:foroId` | ídem 1 | `editarForoSchema` | `foroRespuestaSchema` | `editarTarea({ …, tipo: "foro" })` + cancelar y recrear `RECORDATORIO_24H` |
| 5 | `DELETE /clases/:claseId/foros/:foroId` | ídem 1 | `borrarTareaQuerySchema` (`?confirmar=entregas`) | `204` | `borrarTarea({ …, tipo: "foro" })` + cancelar `RECORDATORIO_24H` y `TAREA_CREADA` |
| 6 | `GET /clases/:claseId/foros/:foroId/mi-participacion` | `roles: ["estudiante"], pertenencia: "inscripcion"` | — | `miParticipacionRespuestaSchema` | `leerMiParticipacion` |
| 7 | `GET /clases/:claseId/foros/:foroId/mi-participacion/devoluciones` | ídem 6 | `paginacionSchema` | `listaComentariosPrivadosRespuestaSchema` (de `shared/src/entregas.ts`, sin cambio) | `listarHiloPrivado({ …, tipo: "foro", alumnoId: perfil.id, comprobarInscripcion: false })` |
| 8 | `GET /clases/:claseId/foros/:foroId/participaciones` | ídem 2 | `paginacionSchema` | `listaParticipacionesRespuestaSchema` | `listarParticipaciones` |
| 9 | `POST /clases/:claseId/foros/:foroId/participaciones` | `roles: ["estudiante"], pertenencia: "inscripcion"` | `crearParticipacionSchema` | `201 participacionPublicadaRespuestaSchema` | `publicarParticipacion` |
| 10 | `GET /clases/:claseId/foros/:foroId/participaciones/:participacionId/replicas` | ídem 2 | `paginacionSchema` | `listaReplicasRespuestaSchema` | `listarReplicas` |
| 11 | `POST /clases/:claseId/foros/:foroId/participaciones/:participacionId/replicas` | `roles: ["estudiante", "maestro"], pertenencia: "inscripcion"` | `crearReplicaSchema` | `201 replicaPublicadaRespuestaSchema` | `publicarReplica` |
| 12 | `GET /clases/:claseId/foros/:foroId/participantes` | `roles: ["maestro", "admin"], pertenencia: "propiedad"` | `paginacionSchema` (20) | `listaEntregasRespuestaSchema` (de `shared/src/entregas.ts`, sin cambio) | `listarEntregas({ …, tipo: "foro" })` |
| 13 | `GET /clases/:claseId/foros/:foroId/participantes/:alumnoId` | ídem 12 | `participanteParamSchema` | `entregaDeAlumnoRespuestaSchema` (sin cambio; `enlaces` y `adjuntos` siempre `[]`) | `leerEntregaDeAlumno({ …, tipo: "foro" })` |
| 14 | `GET /clases/:claseId/foros/:foroId/participantes/:alumnoId/participaciones` | ídem 12 | `paginacionSchema` | `listaParticipacionesDeAlumnoRespuestaSchema` | `listarParticipacionesDeAlumno` |
| 15 | `GET /clases/:claseId/foros/:foroId/participantes/:alumnoId/devoluciones` | ídem 12 | `paginacionSchema` | `listaComentariosPrivadosRespuestaSchema` | `listarHiloPrivado({ …, tipo: "foro", comprobarInscripcion: true })` |
| 16 | `PUT /clases/:claseId/foros/:foroId/participantes/:alumnoId/calificacion` | `roles: ["maestro"], pertenencia: "propiedad"` (S-01) | `calificarEntregaSchema` (sin cambio) | `entregaDeAlumnoRespuestaSchema` | `calificarEntrega({ …, tipo: "foro" })` + encolar `CALIFICACION_PUBLICADA` |
| 17 (01a2, E3-3) | `DELETE /clases/:claseId/foros/:foroId/participaciones/:participacionId` | `roles: ["admin"], pertenencia: "propiedad"` (PB-1 a, resuelta; E5-3) | `participacionParamSchema` | `204` | `borrarParticipacion` (§D-11); no encola |

- Los textos se normalizan antes de validar: `conTextosDeTareaNormalizados` (título, planteamiento en `instrucciones` y criterios) en 1 y 4; `conTextosNormalizados(body, ["texto"])` en 9 y 11; `conTextosNormalizados(body, ["comentario"])` en 16.
- Los ids de la ruta pasan a minúsculas en sus esquemas, como en `tareaIdParamSchema`.
- Un `null` del adaptador responde `404 TAREA_NO_ENCONTRADA` "Ese foro ya no existe." (S-08), incluido un id que es una tarea, un anuncio o un material.
- Una principal inexistente, de otro foro o que es una réplica: `404 PARTICIPACION_NO_ENCONTRADA` (10, 11).
- Un `:alumnoId` que no es alumno inscrito con cuenta activa: `404 ALUMNO_NO_ENCONTRADO` (13 a 16), como hoy.
- Las ayudas de respuesta de `handlers/foros.ts` son propias, porque la de la tarea es privada de un archivo de ADMIN-01:
  - `foroParaResponder(almacen, TareaDetalleDb)`: omite `requiereAdjuntos`, firma al autor y pasa las fechas a ISO.
  - `participacionParaResponder` y `replicaParaResponder`.
  - Reutiliza `entregaDeAlumnoParaResponder` (`handlers/respuestas-de-entrega.ts`, sin cambio) y `adjuntosParaResponder` y `archivosParaPublicar` (`handlers/adjuntos.ts`, sin cambio).
- **Rutas existentes que el foro reutiliza tal cual:**
  - `POST /clases/:claseId/archivos` (solicitar subida de los adjuntos del planteamiento) y `POST /clases/:claseId/archivos/:archivoId/descarga` (sirve un archivo confirmado de cualquier publicación de la clase a los inscritos).
  - `PUT /clases/:claseId/publicaciones/:publicacionId/tema` (mover), con el cambio de `temas.ts` en §D-3.3.
  - `GET /clases/:claseId/temas?seccion=actividades&conForos=si` y `GET /clases/:claseId/trabajo?…&seccion=actividades&conForos=si` (§D-6; E1-4).

#### §D-3.2. Esquemas de `shared/src/foros.ts`

Todos los de respuesta son `z.strictObject`: es la regla de las respuestas nuevas desde CALIFICACIONES-01 (CAL-1A18).
- **`crearForoSchema`:**
  - `titulo: textoDeUnaLineaSchema(200, "Escribe el título del foro")`.
  - `instrucciones: textoConContenidoSchema(10000, "Escribe el planteamiento del foro")` (S-01).
  - `fechaLimite: fechaLimiteSchema`.
  - `puntos`, con la regla y el mensaje de la tarea.
  - `aceptaTardias: z.boolean({ error: "Elige si se aceptan participaciones con retraso" }).default(true)`.
  - `categoriaId`, `temaId` (`idOpcionalSchema`, que `shared/src/tareas.ts` pasa a exportar), `rubrica` (la de la tarea) y `archivoIds` (la de la tarea).
  - Es `z.object`, como `crearTareaSchema`. Un `requiereAdjuntos` enviado se ignora.
- **`editarForoSchema`:** `crearForoSchema.extend({ version })`, con el mensaje de versión de la tarea.
- **Parámetros:**
  - `foroIdParamSchema = { foroId }`.
  - `participacionParamSchema = { foroId, participacionId }`.
  - `participanteParamSchema = { foroId, alumnoId }`.
  - Cada uno con su mensaje "`<campo>`: debe ser un identificador válido".
- **Cuerpos de participación:**
  - `crearParticipacionSchema = { texto: textoConContenidoSchema(5000, "Escribe tu participación") }`.
  - `crearReplicaSchema = { texto: textoConContenidoSchema(1000, "Escribe tu réplica") }`.
- **`foroDetalleSchema`:** el de la tarea sin `requiereAdjuntos`, con `instrucciones` = planteamiento. Más `foroRespuestaSchema = { foro }`.
- **`elementoDeForoSchema`:**
  - `{ id, titulo, autor: autorDelMuroSchema, creadoEn, fechaLimite, puntos, tema: { id, nombre } | null, participaciones: int ≥ 0, entrega: { estado, conRetraso } | null }`.
  - `participaciones` cuenta las principales.
  - `entrega` es del alumno que pide la lista; `null` para maestro y admin, o sin fila.
- **`listaForosRespuestaSchema = { foros, siguienteCursor }`.**
- **`participacionSchema`:**
  - `{ id, texto, autor: autorDelMuroSchema, creadoEn, conRetraso: z.boolean().optional(), replicas: int ≥ 0, propia: boolean }`.
  - `conRetraso` solo sale si `verRetrasoDe`.
- **`replicaSchema`:** `{ id, texto, autor, creadoEn, conRetraso?: boolean, propia }`.
- **Listas y respuestas de crear:**
  - `listaParticipacionesRespuestaSchema` y `listaReplicasRespuestaSchema`, cada una con `siguienteCursor`.
  - `participacionPublicadaRespuestaSchema = { participacion, miParticipacion }`.
  - `replicaPublicadaRespuestaSchema = { replica }`.
- **`miParticipacionRespuestaSchema`:**
  - `{ estado: estadoEntregaSchema, fechaEntrega: iso | null, conRetraso, calificacion: calificacionDeEntregaSchema.nullable(), principalId: uuid | null, puedeParticipar, puedeReplicar, participarConRetraso: boolean, replicarConRetraso: boolean }`. Los dos últimos son de E1-1: lo que la regla decide para una publicación de ahora.
  - `calificacionDeEntregaSchema` es el de `shared/src/entregas.ts`, reutilizado.
- **`participacionDeAlumnoSchema`:**
  - `{ id, texto, creadoEn, conRetraso: boolean, enRespuestaA: { participacionId, autor: autorDelMuroSchema } | null }`.
  - `enRespuestaA` es `null` en la principal.
  - Más `listaParticipacionesDeAlumnoRespuestaSchema`.
- **`CODIGOS_FOROS`** (los cuatro nuevos de S-08) y los tipos `z.infer` de cada esquema.

**(E6-2) Inventario de los literales con prefijo `"<nombre>: …"` que el plan manda escribir en `shared/src`** (los lee `errores-ch3-r2.ataque.test.ts`, C-6 y C-7):
- **01a1:**
  - `"foroId: debe ser un identificador válido"`, en `foroIdParamSchema`, `participacionParamSchema` y `participanteParamSchema`;
  - `"participacionId: debe ser un identificador válido"`;
  - `"alumnoId: debe ser un identificador válido"`, en `participanteParamSchema`; ya está en `INVENTARIO`;
  - `"conForos: no es válido"`, en `shared/src/tareas.ts`, en los dos esquemas de consulta;
  - `"tema: elige un tema válido"`, que solo cambia de lugar dentro de `tareas.ts` al exportar `temaDeTrabajoSchema`; `tema` ya está.
- **01a2:** ninguno (`participacionParamSchema` es el de 01a1).
- **01b:** `"conTipo: no es válido"`.
- **Los mensajes de los cuerpos no llevan prefijo:** "Escribe el título del foro", "Escribe el planteamiento del foro", "Elige si se aceptan participaciones con retraso", "Escribe tu participación", "Escribe tu réplica", y los de puntos y versión, reutilizados de la tarea.
- **Si el programador necesita otro literal con prefijo en `shared/src`, PARADA:** cada nombre nuevo pide su C-n.

`shared/src/tareas.ts`:
- `elementoDeTrabajoSchema.tipo` pasa a `z.enum(["material", "tarea", "foro"])`.
- ~~`trabajoQuerySchema.seccion` pasa a `z.enum([…, "actividades-y-foros"])`; `SECCIONES_DE_TEMAS` suma `"actividades-y-foros"`.~~
- **(E1-4, M-04)** La entrada no cambia de valor: `seccion=actividades` sigue igual y se suma `conForos: z.literal("si", { error: "conForos: no es válido" }).optional()` a `trabajoQuerySchema` y a `temasQuerySchema`.
  - Los dos esquemas terminan con un `.transform` que da a la salida una sola llave `seccion` de tipo `SeccionDeTrabajo = "actividades" | "actividades-con-foros" | undefined` (`seccion` en `temasQuerySchema`: `SeccionDeTemas | "actividades-con-foros" | undefined`). Es `"actividades-con-foros"` solo si `seccion === "actividades"` y `conForos === "si"`; `conForos` sin `seccion=actividades` responde `400 VALIDACION` "conForos: no es válido".
  - Así los handlers de `handlers/tareas/{tareas,temas}.ts` (de ADMIN-01) pasan `seccion` como hoy y no cambian; el valor nuevo solo existe en la salida del esquema.
  - `SECCIONES_DE_TEMAS` no cambia. El tipo de salida se exporta como `SeccionDeTrabajo` y `SeccionDeTemasConForos`.
  - **Con el `.transform`, `trabajoQuerySchema` deja de ser un `ZodObject` y pierde `.shape`**, que hoy usa `shared/src/recursos.ts:22` (`tema: trabajoQuerySchema.shape.tema`). Por eso el campo `tema` se exporta como `temaDeTrabajoSchema`, y `recursos.ts:22` pasa a usarlo. Es una línea, en un archivo que no está en las listas de ADMIN-01, y su validación no cambia.
  - **Vigilada:** `frontend/src/lib/errores-de-api.test.ts:463-470` (CH3-A25) llama a `trabajoQuerySchema.safeParse({ tema: NO_ES_ID })`. Con la tubería, el error sigue siendo el de `tema`, con la misma ruta y el mismo texto; si no, PARADA.
- `idOpcionalSchema` se exporta.

`shared/src/index.ts`: el bloque `./foros.js` (§D-X) más `idOpcionalSchema` en el bloque de `./tareas.js`. Es el único cambio dentro de un bloque existente: una línea, en orden alfabético.

#### §D-3.3. `tipo` en los adaptadores de hoy (para que una ruta de tarea nunca acepte un foro)

**Ayuda nueva:** `backend/src/adapters/db/actividades.ts`, con `esActividadDeTipo(db, { id, claseId, tipo }): Promise<boolean>` = `db.publicacion.findFirst({ where: { id, claseId, tipo }, select: { id: true } }) !== null`.
- Sin SQL crudo.
- El tipo de una publicación nunca cambia, así que leerlo sin bloqueo, **después** del bloqueo de la fila de `tareas`, no abre carreras: si la fila desaparece, el bloqueo ya devolvió `null`.

| Archivo y función | Cambio | Valor por omisión |
|---|---|---|
| `tareas.ts` · `leerTareaCon` / `leerTarea` | `tipo?: "tarea" \| "foro"`; el `findFirst` agrega `publicacion: { tipo }` | `"tarea"` |
| `tareas.ts` · `crearTarea` | `tipo`; `publicacion.create` con ese tipo; `tarea.create` con `requiereAdjuntos: tipo === "foro" ? false : datos.requiereAdjuntos`; `asegurarReferencias` pasa `actividad` a `validarCategoriaRequerida`; `leerTarea(…, tipo)` | `"tarea"` |
| `tareas.ts` · `editarTarea` | `tipo`. Después del `SELECT … FOR NO KEY UPDATE OF t` (SQL sin cambio), `if (!(await esActividadDeTipo(tx, …))) return null`, **antes** de la autoría. El `publicacion.updateMany` usa `tipo`. `exigirVersion(…, () => tareaModificada(tipo))`, `exigirRubricaCongelada({ …, actividad: tipo })` y `validarCategoriaRequerida(…, tipo)` | `"tarea"` |
| `tareas.ts` · `borrarTarea` | `tipo`. Después del `SELECT … FOR UPDATE OF t` (sin cambio), la misma comprobación devuelve `false` **antes** de la autoría y de cualquier escritura. Hoy, un `DELETE /tareas/:id` con el id de otro tipo descartaría sus archivos antes de devolver `404`; con este orden, nada se escribe. `exigirBorradoConEntregasPermitido({ …, actividad: tipo })` y `publicacion.deleteMany` con `tipo` | `"tarea"` |
| `tareas.ts` · `listarTrabajoCon` / `listarTrabajo` | `seccion: SeccionDeTrabajo` (E1-4: `"actividades" \| "actividades-con-foros" \| undefined`). Con `"actividades-con-foros"`, `tipos = ["tarea", "foro"]`, también en la comprobación del cursor. `ElementoDeTrabajoDb.tipo` suma `"foro"` y el mapeo pasa de `esMaterial ? "material" : "tarea"` al tipo de la fila. Los ids de "tareas" para la consulta de entregas del alumno incluyen los foros | — |
| `temas.ts` | `TIPOS_CON_TEMA` suma `"foro"` (el total, renombrar y mover). **(E1-9, N-03)** El total sin sección cuenta los foros a propósito: la confirmación de borrar un tema dice cuántos elementos pasan a «Sin tema» y los foros también pasan. Es la excepción declarada en DH-09. `FILTRO_DE_LA_SECCION` pasa a un `Record<SeccionDeTemasConForos, …>` con `"actividades-con-foros": { tipo: { in: ["tarea", "foro"] } }` (E1-4); `actividades` sigue siendo `{ tipo: "tarea" }`. `listarTemasDeLaSeccion` recibe ese tipo. En `moverATema`, la rama que sube `tareas.version` aplica también a `"foro"` | — |
| `entregas.ts` · `existeLaTarea` | `tipo`; el `findFirst` agrega `publicacion: { tipo }`. La usan `buscarArchivoDeMiEntrega` y `buscarArchivoDeEntregaDeAlumno` (siempre `"tarea"`), `listarEntregasCon` y `listarHiloPrivadoCon` (con su `tipo`) | `"tarea"` |
| `entregas.ts` · `leerMiEntregaCon` | El `findFirst` de la tarea agrega `publicacion: { tipo: "tarea" }`. Así, la subida de un archivo de entrega (S-10, que la usa) y `GET …/entrega` responden `404` con un foro | fijo |
| `entregas.ts` · `entregar`, `anularEntrega`, `comentarEnHiloPrivado` | Después de `bloquearTareaParaEntregar(tx, …)`, `if (!(await esActividadDeTipo(tx, { …, tipo: "tarea" }))) return null`. Así, entregar, anular y escribir en el hilo privado de un foro responden `404` (P-09: sin hilo privado) | fijo |
| `entregas.ts` · `calificarEntrega` | `tipo`. Después de `bloquearTareaParaCalificar(tx, …)` (sigue siendo la primera sentencia, CAL-1A18), `if (!(await esActividadDeTipo(…))) return null`. `entregaModificada`, `exigirEntregaCalificable` y `decidirCalificacion` reciben `actividad: tipo`. `leerEntregaDeAlumno(…, tipo)` | `"tarea"` |
| `entregas.ts` · `leerEntregaDeAlumnoCon`, `listarEntregas`, `listarHiloPrivado` | `tipo` | `"tarea"` |
| `entregas.ts` · exportaciones | Pasan a `export const`, para `foros.ts`, **sin cambiar su cuerpo**: `bloquearTareaParaEntregar`, `asegurarFilaDeEntrega`, `bloquearEntrega`, `calificacionDe`, `alumnoInscrito` y `SELECT_ENTREGA`. No se reexportan en `index.ts`, como `bloqueo-usuario.ts` | — |
| `publicaciones.ts` · `listarPublicaciones` | Sin `tipo` (compatibilidad): `donde = { claseId, tipo: { in: ["anuncio", "material", "tarea"] } }`, también para el cursor (§D-X). Con `tipo: "anuncio"`, sin cambio. `PublicacionDb.tipo` no cambia; si hace falta para el compilador, se estrecha con una comprobación inalcanzable que lanza `ERROR_INTERNO`, como `errorElementoSinTitulo` | — |

**(E1-9, N-03) `categorias.ts`:**
- **El conteo.** `listarCategorias` y `rechazarSiTienenTareas` cuentan las filas de `tareas` por categoría, foros incluidos. Así debe ser: no se quita una categoría con foros (RN-05, P-01 de TAREAS-01). No cambia.
- **El texto del `409 CATEGORIA_CON_TAREAS`** pasa a `mensajeConActividades(nombre, total, foros)`:
  - Con `foros === 0`, el de hoy, letra por letra ("«X» tiene N tarea(s). Muévelas…"). Así ninguna prueba existente cambia (`categorias.integracion:221-225`, `categorias-01a-r1.ataque:400-410`, `referencias-01b-r1.ataque:236`).
  - Con foros, "«X» tiene {total} actividad(es). Muévelas a otra categoría antes de quitarla.".
- **De dónde sale `foros`.** Solo en el camino del error, después de elegir la categoría que lo provoca, una sentencia más: `tx.tarea.count({ where: { categoriaId, publicacion: { tipo: "foro" } } })`. Fuera de un ciclo.
- **El campo `tareas` de `GET …/categorias`** conserva su nombre y cuenta actividades. El editor del frontend dice "actividades" (01d, FORO-1D31).

Nada de lo anterior cambia el SQL crudo existente ni el número de `FOR KEY SHARE`, `FOR SHARE` o `instantaneaUnica: true` de `entregas.ts` y `tareas.ts` (vigiladas, §D-R0 01a).

#### §D-3.4. `adapters/db/foros.ts` (nuevo)

Sin SQL crudo. Los bloqueos son los de `entregas.ts`, importados, así que no suma `FOR KEY SHARE` ni `$queryRaw` fuera de esos archivos. Cada lectura de varias sentencias va en `enTransaccion(…, { instantaneaUnica: true })` (ESSENTIALS, FIX-CLASES). Cada lista se pagina con `paginar` y comprueba su cursor contra la misma lista antes de la página.
- **`listarForos({ claseId, cursor, limite, alumnoId })`** (instantánea):
  1. El cursor: `publicacion.findFirst({ where: { id: cursor, claseId, tipo: "foro" } })`; si no está, `400 VALIDACION` "cursor: no es válido".
  2. La página: `publicacion.findMany({ where: { claseId, tipo: "foro" }, orderBy: [{ creadoEn: "desc" }, { id: "desc" }], take: limite + 1, cursor, skip })`, con `autor`, `tema` y `tarea: { fechaLimite, puntos }`.
  3. Las principales por foro de la página: un solo `participacionForo.groupBy({ by: ["foroId"], where: { foroId: { in }, principalId: null } })`.
  4. Con `alumnoId`, sus entregas en esos foros: un solo `entrega.findMany`.

  Si la relación `tarea` llegara `null`, `ERROR_INTERNO` explícito (inalcanzable).
- **`leerMiParticipacion({ claseId, foroId, alumnoId, ahora })`** (instantánea):
  1. El foro: `tarea.findFirst({ where: { id, claseId, publicacion: { tipo: "foro" } }, select: { fechaLimite, aceptaTardias, puntos } })`; `null` → `null`.
  2. La entrega por (`tareaId`, `alumnoId`), con `SELECT_ENTREGA`.
  3. `calificacionDe`.
  4. La principal del alumno: `participacionForo.findFirst({ where: { foroId, autorId: alumnoId, principalId: null } })`.
  5. `accionesDelForo`.
- **`listarParticipaciones({ claseId, foroId, cursor, limite, actorId, relacion })`** (instantánea):
  1. El foro existe (`esActividadDeTipo`); si no, `null`.
  2. El cursor: una principal de ese foro.
  3. La página, por `(creadoEn asc, id asc)`, con `principalId: null` y `autor: { id, nombre, rol }`.
  4. Las réplicas de la página: un solo `groupBy({ by: ["principalId"], where: { foroId, principalId: { in } } })`. Usa `foroId` y el índice `(principal_id, creado_en, id)` (E1-3).
  5. El mapeo con `firmaDelAutor`, `propia = autor.id === actorId` y `conRetraso` solo si `verRetrasoDe({ relacion, esPropia })`.
- **`listarReplicas({ claseId, foroId, participacionId, cursor, limite, actorId, relacion })`** (instantánea):
  1. El foro: `null` si no existe.
  2. La principal: `participacionForo.findFirst({ where: { id: participacionId, foroId, principalId: null } })`; si no está, `404 PARTICIPACION_NO_ENCONTRADA`.
  3. El cursor: una réplica de esa principal.
  4. La página, ascendente.
- **`publicarParticipacion({ id, claseId, foroId, alumnoId, texto, ahora })`** (`enTransaccion`, READ COMMITTED). En este orden:
  1. `bloquearTareaParaEntregar(tx, { tareaId: foroId, claseId })`; `null` → `null`.
  2. `esActividadDeTipo(tx, { id: foroId, claseId, tipo: "foro" })`; `false` → `null`.
  3. `asegurarFilaDeEntrega`.
  4. `bloquearEntrega` (`FOR NO KEY UPDATE`).
  5. Releer `fechaEntrega` de esa fila.
  6. `decidirParticipacionPrincipal`. Si lanza, se revierte todo, también la fila perezosa.
  7. `participacionForo.create({ id, foroId, autorId: alumnoId, principalId: null, texto, conRetraso })`.
  8. `entrega.update({ estado: "entregado", fechaEntrega: ahora, conRetraso, version: { increment: 1 } })`. `enlaces` no cambia.
  9. Responde `{ participacion, miParticipacion }`, leídas en la misma transacción. No encola nada (S-09).
- **`publicarReplica({ id, claseId, foroId, participacionId, autor: { id, rol }, texto, ahora })`** (transacción):
  1. `bloquearTareaParaEntregar`; `null` → `null`.
  2. `esActividadDeTipo`; `false` → `null`.
  3. La principal (como en `listarReplicas`); si no está, `404`.
  4. `decidirReplica({ foro, rolDelAutor: autor.rol, ahora })`. El handler pasa `perfilDe(request)` sin compararlo (la ruta solo admite estudiante y maestro), y `core/` decide con el rol.
  5. `participacionForo.create`.

  No toca `entregas`. No encola.
- **`listarParticipacionesDeAlumno({ claseId, foroId, alumnoId, cursor, limite })`** (instantánea):
  1. El foro: `null` si no existe.
  2. `alumnoInscrito`.
  3. El cursor: una participación de ese alumno en ese foro.
  4. La página, ascendente, por el índice (`foro_id`, `autor_id`, `creado_en`, `id`), con `principal: { id, autor }` para `enRespuestaA`.

### §D-4. Transacciones, bloqueos y concurrencia

**Orden del proyecto:** primero la fila de `tareas` del foro y después la de `entregas` (ENTREGAS-01, §D-0.6).

| Operación | Bloqueos, en orden | En serie con | No espera a |
|---|---|---|---|
| Publicar principal | `tareas` `FOR KEY SHARE` → `entregas` `FOR NO KEY UPDATE` | Borrar el foro (`FOR UPDATE`), calificar a ese alumno (su `FOR NO KEY UPDATE` de la entrega) y otra principal del mismo alumno, que ve `fechaEntrega` y recibe `409` | Editar el foro (decide con la fila confirmada, como entregar) |
| Publicar réplica | `tareas` `FOR KEY SHARE` | Borrar el foro | Editar, calificar y otras réplicas |
| Calificar | `tareas` `FOR SHARE` → `entregas` `FOR NO KEY UPDATE` (sin cambio) | Editar el foro, moverlo de tema, borrarlo y la principal de ese alumno (`ENTREGA_MODIFICADA` si la publicó después de que el maestro abrió el panel) | Réplicas |
| Editar / mover / borrar el foro | Los de la tarea, sin cambio | — | — |

- **Principales simultáneas del mismo alumno:** la segunda espera la fila de la entrega y, al seguir, ve `fechaEntrega` y responde `409 PARTICIPACION_YA_PUBLICADA`. El índice único parcial no se alcanza. Si se alcanzara, el `create` de la principal va con `.catch((error) => traducirErrorPrisma(error, { alDuplicar: () => participacionYaPublicada() }))` (`adapters/db/errores.ts`, sin cambio), que también convierte un `22021` en `400`. Las réplicas usan el mismo `catch`, con `alDuplicar` inalcanzable que lanza `ERROR_INTERNO`. Caso FORO-1A27 (diez a la vez: una `201`, nueve `409`, una sola fila principal).
- **Borrado del foro durante una réplica:** si el borrado confirma antes, `bloquearTareaParaEntregar` ya no encuentra la fila y la réplica responde `404`, nunca un `P2003` ni un `500`. Caso FORO-1A28.
- **Una transacción que expira esperando** responde `503 SERVICIO_OCUPADO` (`enTransaccion`, sin cambio).

### §D-5. Cola y trabajos diferidos

- **Crear (ruta 1):** en `alGuardar`, `encolar(COLA_TAREA_CREADA, { tareaId: foroId, claseId }, { id: foroId, sql })` y, si `momentoDelRecordatorio` no es `null`, `encolar(COLA_RECORDATORIO_24H, …, { id: idRecordatorio, sql, inicio })`. Es la misma transacción que el foro (regla 5).
- **Editar (ruta 4):** el plan `planDeRecordatorio` que hoy devuelve `editarTarea` (cancelar y recrear con un id nuevo en la misma transacción, regla 8).
- **Borrar (ruta 5):** cancelar el recordatorio (`trabajo_id`) y `TAREA_CREADA`, como la tarea.
- **Calificar (ruta 16):** `encolar(COLA_CALIFICACION_PUBLICADA, { entregaId, tareaId: foroId, claseId, version }, { id: randomUUID(), sql })`, con un id nuevo por publicación.
- **Participar y replicar (9 y 11):** nada (S-09, P-11).
- Ningún consumidor nuevo. NOTIFICACIONES recibe dos filas (A-10): el payload `{ tareaId, claseId }` de `TAREA_CREADA` y `RECORDATORIO_24H` puede ser un foro (leer `publicaciones.tipo` para el texto), y "Faltan 24 h" de un foro va a quien no tiene `entregas` con `fecha_entrega`. También recibe los candidatos de aviso del foro.

### §D-6. Compatibilidad (DH-09)

- **"Actividades" (E1-4):** `GET …/trabajo?seccion=actividades` y `GET …/temas?seccion=actividades` responden como hoy, solo tareas. Con `&conForos=si` incluyen los foros en la página y en los conteos. El frontend de 01d lo pide; la clave de caché (`claveTemasDeLaSeccion(…, "actividades")`, `claveTrabajo`) no cambia. Un backend anterior ignora `conForos` y responde solo tareas, pero el backend se despliega primero (DEPLOY).
- **Total de temas sin sección (E1-9):** cuenta los foros (§D-3.3, `temas.ts`). Es lo único de "Actividades" que cambia sin opt-in.
- **Gradebook y "Mis calificaciones" (01b):**
  - `gradebookQuerySchema` y `misCalificacionesQuerySchema` ganan `conTipo: z.literal("si", { error: "conTipo: no es válido" }).optional()`.
  - `columnaDelGradebookSchema` y `tareaDeMisCalificacionesSchema` ganan `tipo: z.enum(["tarea", "foro"]).optional()`, presente solo con `conTipo=si`.
  - Sin el parámetro, la respuesta es la de hoy: el foro sale como columna, sin `tipo`.
  - La exportación no lo pide ni lo devuelve.
- **Lo que sigue saliendo siempre:** un foro es columna del gradebook, de "Mis calificaciones" y de la exportación desde 01a. En un frontend anterior, el enlace de esa columna lleva a la vista de una tarea, que responde "Esa tarea ya no existe." (R-01).

### §D-7. La clase archivada (01b y frontend)

**(Enmienda 7)** Pasa a **01a**: ADM-1A09 exige la política de cada ruta desde que se registra. La forma exacta de la opción y el patrón de FORO-1A51 ya están fijados (§E7.3, "Backend", punto 1), así que la tercera viñeta de abajo queda resuelta.

Lo resume §D-X. En detalle, en 01b:
- `handlers/foros.ts` agrega `enClaseArchivada: "lectura"` a las rutas 2, 3, 6, 7, 8, 10, 12, 13, 14 y 15. Las 6 y 7 (solo estudiante) quedan, con `lectura`, como la entrega propia en la tabla de ADMIN: el alumno recibe `409`.
- Las rutas 1, 4, 5, 9, 11 y 16 quedan sin declarar, es decir, cerradas.
- La forma exacta de la opción y el regex de las pruebas estáticas que la buscan los fija la Enmienda de arranque de 01b, con el `protegido()` fusionado. Prettier parte el objeto en varias líneas si pasa de 100 columnas, como anticipó ADMIN para CAL-1B08.

### §D-8. Frontend (01c a 01e; después de fusionar ADMIN-01)

**(Enmienda 7)** Ahora es 01c1 a 01e. Los nombres de archivo quedan confirmados por el grep sobre `fd4a7ad` (§E7.5), y las reglas nuevas se aplican según §E7.3, "Frontend". Los nombres de archivo son los previstos; los confirma la Enmienda de arranque de 01c, con un grep sobre la base fusionada (§D-R0). Todo el foro del lado del alumno, del maestro y del admin vive en `features/tareas`, salvo la lista de la sección, que vive en `features/clases` (como las demás secciones). Las claves y las consultas compartidas por los dos módulos van en `services/trabajoService.ts`:
- `clavePrefijoDeForos(claseId) = ["clases", claseId, "foros"]`, y `claveListaDeForos(claseId)` colgada de ella.
- `claveForo(claseId, foroId) = ["clases", claseId, "foros", foroId]` y `consultaForo`.
- `claveParticipaciones`, `claveReplicas`, `claveMiParticipacion`, `claveParticipantes`, `claveParticipante`, `claveParticipacionesDeAlumno` y `claveDevoluciones`, todas bajo `claveForo`.
- Así, invalidar `claveForo` renueva todo lo del foro, y un foro borrado sale con `removeQueries` de su prefijo.

#### §D-8.1. Rutas del frontend (`app/router.tsx`)

| Perspectiva | Rutas nuevas bajo `clases/:claseId` |
|---|---|
| Estudiante | `foro` (`ForosView`), `foros/:foroId` (`ForoView`) |
| Maestro | `foro`, `foros/nuevo` (`CrearForoView`), `foros/:foroId`, `foros/:foroId/editar` (`EditarForoView`), `foros/:foroId/participantes` (`ParticipantesView`, 01e), `foros/:foroId/participantes/:alumnoId` (`ParticipanteView`, 01e) |
| Administrador (`/admin/clases/:claseId/…`) | Las mismas del maestro |

`SECCIONES_DE_LA_CLASE` (`features/clases/data.ts`) suma `{ segmento: "foro", texto: TEXTOS_CLASE.foro }` en tercera posición. "Foro" queda activa en `foro` y en `foros/*`, igual que "Actividades de aprendizaje" queda activa en `tareas/*` hoy. La regla exacta se lee del cálculo de la sección activa ya fusionado (Enmienda de arranque); si hoy `tareas/*` no la activa, `foros/*` sigue la misma regla. El indicador medido de §7.3 no cambia. **(Enmienda 7) Resuelto:** `indiceDeSeccionActiva` (`features/clases/lib.ts:114-128`) no activa "Actividades" en `tareas/:id`, así que "Foro" queda activa en `foro` y no en `foros/:foroId`. En la rama del estudiante, `foros/nuevo` lleva a `/login`, como `tareas/nueva`.

#### §D-8.2. Sección "Foro" (`features/clases/foros-view.tsx`, 01c)

Es una pantalla de trabajo dentro de la clase, con raíz `tabIndex={-1}` y `useFocoAlPerderseElControl`.
- **Encabezado:** `h2` "Foro". Para el alumno, debajo: "Participa en cada foro antes de su fecha límite." (`--text-small`, `--muted-foreground`).
- **Maestro y admin:** "Crear foro" (enlace `primary`, icono `Plus`), la única acción principal de la vista. No se pinta en una archivada.
- **Lista:** un `Card` con una `FilaDeEntrega` (§7.7) por foro: cuadro de fecha, título, estado de `vencimientoDe` y "Foro:" `sr-only` al inicio del enlace.
  - El alumno ve además su `EstadoEntregaBadge` (`estadoDeEntregaVisible`).
  - El maestro y el admin ven "12 participaciones" ("1 participación"; "Sin participaciones", `--text-small`).
- **Estados (§7.10):** error → cargando ("Cargando los foros…") → vacío ("Aún no hay foros en esta clase.") → datos.
- **"Ver más foros":** `outline`, `enEspera={isFetching}`, guarda con ref, `cancelRefetch: false` y el foco de §7.14 (`useFocoAlCargarMas` si ADMIN-01 lo subió a `components/foco/`; si no, el patrón de hoy). Con el cursor vencido (`400`), la lista dice "La lista de foros cambió mientras la veías. Vuelve a abrir Foro para verla completa." y "Ver más" no se ofrece. La consulta se saca de la caché (`removeQueries`) para que volver a abrir la pida.
- `useAlPulsarLaSeccionActiva` (`components/seccion/`): pulsar "Foro" estando en ella vuelve a pedir la lista (frase de recuperación, FORO-1C20 a FORO-1C23).
- **(Enmienda 7)** `ForosView` sigue a `DudasView` con los ganchos de CHORE-06: `useListaConservadaTrasLaPagina`, `useRecargarAlPulsarLaSeccion`, `useMarcarViejaSiQuedoEnError` y `useFocoAlCargarMas` de `components/foco/`. Con ellos, el `removeQueries` manual de arriba sale; las frases y sus caminos (FORO-1C20 a FORO-1C23) no cambian. Detalle en §E7.3, "Frontend", punto 5.

#### §D-8.3. Crear, editar, ver y borrar un foro (`features/tareas`, 01c)

- **`FormularioTarea` gana `tipo?: "tarea" | "foro"`** (por omisión `"tarea"`, así ningún uso de hoy cambia). Con `"foro"`:
  - `h2` "Nuevo foro" / "Editar foro".
  - "Planteamiento" (`Textarea`, obligatorio) en lugar de "Instrucciones (opcional)".
  - No hay "Cómo se entrega".
  - "Participaciones después de la fecha límite" ("Aceptar con retraso" / "No aceptar"), en lugar de "Entregas después de la fecha límite".
  - Botón principal "Publicar foro" / "Guardar cambios".
  - La validación local usa `crearForoSchema` / `editarForoSchema`.
  - Los campos que pinta: `titulo`, `instrucciones`, `fechaLimite`, `puntos`, `categoriaId`, `temaId`, `aceptaTardias`, `rubrica.N.*` y `archivoIds`. `requiereAdjuntos` cuenta como no pintado (`VALIDACION` fuera de contrato, FORO-1C08).
- **`CrearForoView` / `EditarForoView`** (`crear-foro-view.tsx`, `editar-foro-view.tsx`): las de la tarea, con las consultas del foro (`useForo`, `useCrearForo`, `useEditarForo`). Al publicar, aviso "Foro publicado" y navegación al detalle del foro. Al guardar, "Cambios guardados" (el texto de la tarea).
  - El `409 TAREA_MODIFICADA` sigue §7.21 ("Conflicto al guardar") con el texto del foro.
  - En una archivada, la ruta pinta el texto de archivada y "Volver a Foro", como las de la tarea.
- **`ForoView` (`foro-view.tsx`):** la composición de §7.20.
  - Izquierda: la insignia "Foro" (icono `MessagesSquare`), la firma y la fecha, el `h2` con el título, el `h3` "Planteamiento" con el texto plano, los adjuntos (§7.19, descarga de la clase) y la rúbrica de solo lectura.
  - Derecha, "Detalles": fecha límite (con su insignia), puntos, categoría, tema y la política ("Se aceptan participaciones con retraso" / "No se aceptan participaciones después de la fecha límite").
  - Para el maestro y el admin, debajo: el panel "Participantes" con "Ver participantes" (enlace `outline` a `participantes`; 01e; E1-10) y el panel de acciones "Editar foro" (si `puedeEditar`) / "Borrar foro" (si `puedeBorrar`).
  - Ninguna acción se pinta en una archivada.
  - Las participaciones van debajo del planteamiento (01d).
- **Borrar:** `AccionesDeLaTarea` gana `tipo` (textos de foro) y la ruta del borrado. Confirmación en línea (§7.14): "Se borrará con su rúbrica, sus adjuntos y todas sus participaciones.", "Sí, borrar foro" (`destructive`, `enEspera`, ref) y "Cancelar".
  - Con `409 TAREA_CON_ENTREGAS`, el segundo paso de §7.20 con el mensaje del foro. Solo el admin ve "Borrar con las participaciones".
  - Al borrar: aviso "Foro borrado", `removeQueries(claveForo)`, se marcan viejos la lista de foros, el trabajo, los temas y el prefijo de calificaciones de la clase, y se navega a "Foro".
- **Estados y recarga fallida (§7.20):**
  - Error → cargando ("Cargando el foro…") → datos.
  - Un `404` dice "Ese foro ya no existe.".
  - Una recarga fallida con el foro en caché avisa "No pudimos actualizar el foro. Mostramos la última versión que tenemos." una vez por fallo (T-12) y conserva la vista. Solo la reemplazan `404`, `403 SIN_ACCESO_A_LA_CLASE` o un `VALIDACION` de `claseId`/`foroId`.
  - Foco con `claveDeFocoDeLaConsulta` y `useFocoAlPerderseElControl`.
- **"Actividades de aprendizaje" (pasa a 01d, E1-4):**
  - `useTrabajo` y `useTemasDeLaSeccion` suman `&conForos=si` a la URL, sin cambiar la clave.
  - `SeccionDeTema` pinta un elemento `foro` con la misma `FilaDeEntrega`, con "Foro:" `sr-only` y una insignia "Foro" (§7.8, neutra, con icono `MessagesSquare`). Es un patrón visual nuevo para `DESIGN.md` §7.22, "propuesta (FORO-01c)".
  - Enlaza a `foros/:id`.
  - `FilaDeEntrega` gana la prop `destino` si hoy arma la ruta a `tareas/:id` por dentro; lo confirma el grep.
  - "Crear foro" (enlace `outline`, `MessagesSquare`) va junto a "Crear tarea", que sigue siendo la única `primary`. No se pinta en una archivada.
  - "Mover" de un foro funciona igual que el de una tarea.

#### §D-8.4. Participar y replicar (`features/tareas`, 01d)

Va en un `Card` bajo el planteamiento, en `ForoView`, con el `h3` "Participaciones" (`tabIndex={-1}`) y debajo "Lo que publiques aquí lo ve toda la clase." (`--text-small`, `--muted-foreground`).
- **Formulario de la principal** (`FormularioDeParticipacion`, alumno, si `miParticipacion.puedeParticipar` y la clase no está archivada): `Textarea` "Escribe tu participación" (etiqueta visible, `autoComplete="off"`) y "Publicar participación" (`primary`, la acción principal del alumno en la vista, `enEspera`, ref).
  - Si `miParticipacion.participarConRetraso` (del servidor, E1-1; el cliente no compara fechas), antes del campo: "La fecha límite ya pasó: tu participación quedará marcada con retraso.".
  - Si `!puedeParticipar` y no hay principal ni calificación: "La fecha límite ya pasó y este foro ya no recibe participaciones." en lugar del formulario.
  - Con la principal publicada, no hay formulario.
  - Al publicar: aviso "Participación publicada"; se escriben `miParticipacion` y la primera página de la lista con la respuesta (sin pedirla otra vez) y se marcan viejos la lista de foros, el trabajo y el prefijo de calificaciones. El foco va a la participación nueva (`tabIndex={-1}`).
- **Lista de principales** (`ParticipacionesDelForo`, del más antiguo al más reciente, divisores de 1 px como §7.25). Cada `ParticipacionDelForo` lleva:
  - Firma (`FirmaDelAutor`), fecha y hora (`--text-small`, `--muted-foreground`), "Tuya" (`sr-only` + texto en `--muted-foreground`) si `propia`, y la insignia "Con retraso" (`warning`, con icono, nunca solo color) si `conRetraso`.
  - El texto plano.
  - El control de réplicas.
- **Control de réplicas (DH-11 a; corrige O-r1-2 por diseño).** Es un solo botón que conserva el foco al cambiar de texto:
  - "Ver réplicas (n)" con una o más.
  - "Replicar" con ninguna (solo para quien puede replicar).
  - Desplegado, "Ocultar réplicas".
  - **El número y el texto plegado salen de lo que el bloque ya cargó**, si lo cargó: el conteo es el mayor entre `participacion.replicas` y las réplicas del bloque en caché. Así, una réplica vista en el bloque nunca se olvida al plegar (O-r1-2). Caso FORO-1D11.
  - El admin, sin réplicas que leer, no ve control.
- **Bloque de réplicas** (`ReplicasDeParticipacion`): la lista ascendente con firma, fecha y hora y "Con retraso" si `conRetraso`; "Ver más réplicas"; y el formulario "Escribe tu réplica" + "Publicar réplica" (`outline`, `enEspera`, ref).
  - El formulario sale para el alumno con `puedeReplicar` y para el maestro; nunca para el admin ni en una archivada.
  - Al publicar: la réplica se agrega a la caché del bloque, el conteo sube, el campo se vacía y el foco vuelve al campo.
- **Admin:** una nota "La administración puede leer este foro, pero no participar en él." (`--text-small`, `--muted-foreground`).
- **"Tu participación"** (`MiParticipacion`, columna derecha, alumno): `h3` "Tu participación", la insignia de estado y "Participaste el lunes 3 de noviembre a las 14:30" ("… con retraso" si `conRetraso`) o "Todavía no participas.". 01e le agrega la calificación y la devolución.
- **Errores y vacío:**
  - Sin participaciones: "Aún no hay participaciones en este foro.".
  - El texto vacío o sin caracteres visibles: "Escribe tu participación" / "Escribe tu réplica" en `ErrorDeCampo`, sin pedir nada.
  - `409 PARTICIPACION_YA_PUBLICADA`, `PARTICIPACION_CALIFICADA` o `FORO_CERRADO`: un aviso con el texto del servidor, lo escrito se conserva y se vuelve a pedir `miParticipacion` (el formulario desaparece si ya no aplica) y la lista.
  - `404 PARTICIPACION_NO_ENCONTRADA` al replicar: un aviso y se renueva la lista.
  - El `404` del foro reemplaza la vista (§7.20).
  - Cursor vencido: la lista dice "Las participaciones cambiaron mientras las veías. Vuelve a abrir el foro para verlas completas." y el bloque, "Las réplicas cambiaron mientras las veías. Vuelve a abrirlas para verlas completas."; los dos sin "Ver más" mientras se ven, y la consulta sale de la caché.
  - Una recarga de la lista que falla con datos en caché los conserva y avisa una vez (no reemplaza la vista como en Dudas: así no se pierde lo escrito en un bloque abierto, O-r1-1 de CLASES-03e).
  - **(Enmienda 7)** Es el patrón de Entregas (`entregas-view.tsx:98-114`, `DESIGN.md` §7.10), con el aviso "una vez por fallo" guardado por consulta. Los «Ver más» llevan `enEspera={isFetching}`, `fetchNextPage({ cancelRefetch: false })`, guarda con ref y el foco de `useFocoAlCargarMas`, sin leer `isFetchingNextPage`. Cada participación lleva `key={participacion.id}`, y su bloque, su réplica escrita y su confirmación de "Borrar" son de ella (§E7.3, "Frontend", puntos 3 a 5).

#### §D-8.5. Calificar, la devolución y los enlaces (01e)

- **`ParticipantesView`** (`participantes-view.tsx`): §7.26 con `listarEntregas` del foro.
  - "Volver al foro", `h2` "Participantes" (E1-10), el título del foro y "Participaron 12 de 30 alumnos." ("de 1 alumno").
  - La tabla reutiliza `TablaDeEntregas` con props de texto: "Alumno", "Estado", "Participó" (fecha y hora) y "Ver participación".
  - "Ver más alumnos" y su cursor ("La lista de alumnos cambió mientras la veías. Vuelve a abrir Participantes para verla completa.", E1-10).
- **`ParticipanteView`** (`participante-view.tsx`): §7.26.
  - "Volver a las participaciones", `h2` con el nombre y su insignia, el título del foro y "Participó el …" / "Todavía no participa.".
  - "Sus participaciones": la lista de lo que escribió, con fecha y hora, "Con retraso" y "En respuesta a {nombre}" en las réplicas; "Ver más"; cursor "Las participaciones de este alumno cambiaron mientras las veías. Vuelve a abrir su participación para verlas completas.".
  - El `Card` "Calificación": `PanelDeCalificacion` para el maestro; para el admin, la lectura o "Sin calificar todavía.".
  - "Comentarios de la devolución" (`Devoluciones`, solo lectura, paginado; sin formulario).
- **`PanelDeCalificacion`** gana la ruta y las claves de la actividad: un objeto `actividad` (`tipo`, `id`), o las dos funciones de ruta. Lo fija la Enmienda de arranque de 01e con el grep de sus usos. **(Enmienda 7) Fijado:** una prop opcional `actividad` (`{ tipo: "foro", id }`). Sin ella, el panel es el de la tarea, así que ninguna llamada de hoy cambia (§E7.5.6). Con un foro, traduce con `mensajeDeErrorForo` (§E7.3, "Frontend", punto 6).
  - Con un foro, `useCalificarParticipacion` (`PUT …/foros/:foroId/participantes/:alumnoId/calificacion`) reemplaza la participante en caché y marca viejos la lista de participantes, el prefijo de calificaciones de la clase, la lista de foros y, con comentario, las devoluciones.
  - Los `409` de calificar siguen §7.27 (avisa, descarta, recarga la participante y, con `RUBRICA_MODIFICADA` o `ENTREGA_NO_CALIFICABLE`, también el foro).
- **"Tu participación"** (alumno) suma la calificación (`CalificacionDeLaEntrega`, sin cambio) y "Comentarios de tu maestro" (`Devoluciones`, solo si hay alguno).
- **Gradebook y "Mis calificaciones":** piden `conTipo=si`.
  - `features/calificaciones/lib.ts` suma `enlaceAParticipante(foroId, alumnoId) = "../foros/<id>/participantes/<alumnoId>"` y `enlaceAForo(id) = "../foros/<id>"`.
  - `TablaDelGradebook` y `ListaDeMisCalificaciones` eligen por `tipo` (sin `tipo`, el de la tarea).
  - La exportación no cambia; FORO-1E14 prueba que un foro calificado sale como columna del .xlsx.

#### §D-8.6. Hermanos de CLASES-03d en `features/tareas` (fila 331, 01c)

| Hallazgo de 03d | Lugar en `features/tareas` | Remedio (el de 03d en `features/clases`) |
|---|---|---|
| T-01 | `editar-tarea-view.tsx:96`: recarga la tarea tras el `409` aunque la vista ya se desmontó | Solo con la vista montada; desmontada, un aviso y nada más |
| T-04 | `useEditarTarea` (`hooks.ts`): ante `TAREA_MODIFICADA` con la vista desmontada, nadie marca vieja `claveTarea` | `invalidateQueries({ queryKey: claveTarea, refetchType: "none" })`: volver antes de 30 s pide la versión del servidor |
| T-02 y T-03 | `components/formulario-tarea.tsx:105`: decide que el tema o la categoría ya no existen con la lista en caché | Al abrir la edición se vuelven a pedir temas y categorías. Mientras no llegan, o si fallan, el campo no se muestra y guardar conserva el valor de la tarea. Una lectura previa en vuelo no confirma la ausencia |
| T-05 | `useBorrarTarea`: ante `404` renueva con `pedirDeNuevoLaTarea`; ante `403` no marca vieja la edición | `404`: `removeQueries(claveTarea)`; `403 BORRADO_NO_PERMITIDO`: se marca vieja sin pedirla |

Los cinco valen también para el foro, que usa los mismos componentes y el mismo patrón de ganchos. Casos FORO-1C30 a FORO-1C36, uno por estado vecino de la tabla de 03d (`resumen-programador-03d.md`, "T-02" a "T-05").

**(Enmienda 7)** Van en 01c1 (**(Enmienda 9)** en 01c2, §E8.3). Con la vista montada se respeta lo que fijan PR-1D05 (`detalle-tarea-view.test.tsx:517` y `:541`); los remedios de quitar de la caché o de marcar vieja sin pedir son para la consulta sin observador. T-04 se extiende a un `409` que llega con la clase archivada (FORO-1C41). Detalle en §E7.3, "Frontend", punto 8.

### §D-9. Textos nuevos (propuesta; DH-12)

| Dónde | Texto |
|---|---|
| Sección | "Foro" (tercera) |
| `ForosView` | `h2` "Foro"; alumno: "Participa en cada foro antes de su fecha límite."; "Crear foro"; "Cargando los foros…"; "Aún no hay foros en esta clase."; "Ver más foros"; "La lista de foros cambió mientras la veías. Vuelve a abrir Foro para verla completa."; "{n} participaciones" / "1 participación" / "Sin participaciones"; error de la consulta: "No pudimos cargar los foros." |
| "Actividades" | Insignia "Foro"; "Crear foro"; `sr-only` "Foro:" |
| Formulario | "Nuevo foro", "Editar foro", "Planteamiento", "Participaciones después de la fecha límite", "Aceptar con retraso", "No aceptar", "Publicar foro", "Guardar cambios", "Cancelar"; avisos "Foro publicado" y "Cambios guardados"; errores del esquema: "Escribe el título del foro", "Escribe el planteamiento del foro", "Elige si se aceptan participaciones con retraso" |
| `ForoView` | Insignia "Foro"; "Planteamiento"; "Detalles"; "Se aceptan participaciones con retraso" / "No se aceptan participaciones después de la fecha límite"; "Participantes" + "Ver participantes" (E1-10); "Editar foro"; "Borrar foro"; "Se borrará con su rúbrica, sus adjuntos y todas sus participaciones."; "Sí, borrar foro"; "Borrar con las participaciones"; "Foro borrado"; "Cargando el foro…"; "Ese foro ya no existe."; "No pudimos actualizar el foro. Mostramos la última versión que tenemos."; en archivada: el texto de ADMIN-01 y "Volver a Foro" |
| Participaciones (01d) | `h3` "Participaciones"; "Lo que publiques aquí lo ve toda la clase."; "Escribe tu participación"; "Publicar participación"; "Participación publicada"; "La fecha límite ya pasó: tu participación quedará marcada con retraso."; "La fecha límite ya pasó y este foro ya no recibe participaciones."; "Tuya"; "Con retraso"; "Ver réplicas ({n})"; "Replicar"; "Ocultar réplicas"; "Escribe tu réplica"; "Publicar réplica"; "Ver más participaciones"; "Ver más réplicas"; "Aún no hay participaciones en este foro."; "Las participaciones cambiaron mientras las veías. Vuelve a abrir el foro para verlas completas."; "Las réplicas cambiaron mientras las veías. Vuelve a abrirlas para verlas completas."; "La administración puede leer este foro, pero no participar en él."; "No pudimos actualizar las participaciones. Mostramos la última versión que tenemos."; genérico de una acción: "No pudimos publicar tu participación. Inténtalo de nuevo." / "No pudimos publicar tu réplica. Inténtalo de nuevo." |
| "Tu participación" | `h3` "Tu participación"; "Participaste el {fecha larga} a las {hh:mm}" (+ " con retraso"); "Todavía no participas."; 01e: "Calificación", "Comentarios de tu maestro" |
| Participantes (01e) | "Volver al foro"; `h2` "Participantes" (E1-10); "Participaron {n} de {total} alumnos." / "de 1 alumno"; columnas "Alumno", "Estado", "Participó", "Acciones"; "Ver participación" (+ nombre `sr-only`); "Ver más alumnos"; "Cargando las participaciones…"; "Aún no hay alumnos en esta clase."; "La lista de alumnos cambió mientras la veías. Vuelve a abrir Participantes para verla completa." |
| Participante (01e) | "Volver a las participaciones"; "Participó el {fecha} a las {hh:mm}" / "Todavía no participa."; `h3` "Sus participaciones"; "En respuesta a {nombre}"; "Ver más participaciones"; "Las participaciones de este alumno cambiaron mientras las veías. Vuelve a abrir su participación para verlas completas."; "Calificación"; "Sin calificar todavía."; `h3` "Comentarios de la devolución"; "Aún no hay comentarios de la devolución." |
| E1-10 (N-05) | La tabla para calificar: `h2` "Participantes"; el panel de `ForoView`, "Participantes" + "Ver participantes"; el cursor, "La lista de alumnos cambió mientras la veías. Vuelve a abrir Participantes para verla completa."; "Volver a los participantes". Sustituyen a "Participaciones", "Ver participaciones", "Vuelve a abrir Participaciones…" y "Volver a las participaciones" de las filas de arriba. "Participaciones" queda solo para lo publicado en el foro |
| E1-11 (N-04) | "No pudimos cargar tu participación."; "No pudimos actualizar tu participación. Mostramos la última versión que tenemos."; cursor de las devoluciones, alumno: "Los comentarios de tu maestro cambiaron mientras los veías. Vuelve a abrir el foro para verlos completos."; maestro y admin: "Los comentarios de la devolución cambiaron mientras los veías. Vuelve a abrir su participación para verlos completos."; "Ver más comentarios"; "No pudimos actualizar la participación de este alumno. Mostramos la última versión que tenemos." |
| E1-9 (N-03) | Editor de categorías: "{n} actividades" / "1 actividad" en lugar de "{n} tareas"; backend: "«X» tiene {n} actividades. Muévelas a otra categoría antes de quitarla." (solo con foros) |
| E7 (complemento de DH-12, §E7.8) | Editor de categorías: "Tiene {n} actividades." / "Tiene 1 actividad." (hoy "Tiene {n} tareas.") y "Esta clase no tiene categorías. Sus actividades se califican por puntos." (hoy "…Sus tareas…") |
| Backend | Los de §D-2.3 y §D-2.4 |

### §D-10. Matriz de avisos y recargas esperada

El programador la confirma o la corrige en el primer resumen de cada subentrega con interfaz (`AGENTS.md`, "Matriz de avisos y recargas"), y completa los estados "en vuelo a la vez" y "con la vista desmontada" de cada fila.

**(Enmienda 7)** La matriz se completa con lo de §E7.3, "Frontend":
- **"Redirige" no avisa en ninguna fila:** `onError`, «Ver más», las recargas y las descargas.
- **"Ver más" que falla con `5xx` o sin red** conserva la lista, con un solo aviso y el botón a la vista (§7.10). En las listas de `features/tareas`, también la recarga de fondo.
- **La fila "Ver más foros"** deja el `removeQueries` por la política de `DudasView`.
- **Las mutaciones nuevas** son las de FORO-1C50, FORO-1D50 y FORO-1E50. Las de los hermanos suman sus filas en el resumen de su subentrega: 01c1 en la Enmienda 7, **(Enmienda 9)** 01c2.
- **"Reemplaza"** = la vista pasa a `MensajeError`.
- **"Redirige"** = lo resuelve `apiClient` (`401`, `ACCESO_RESTRINGIDO`, `CAMBIO_DE_CONTRASENA_REQUERIDO`) y la vista no avisa.
- **Con la vista desmontada,** toda mutación avisa con su `onError` (un solo aviso, texto traducido) y no pide nada que ya no se ve (T-01 de 03d).
- **`409 CLASE_ARCHIVADA`,** en cualquier mutación: un aviso con el texto del servidor, lo escrito se conserva y `claveClaseDetalle` (`exact: true`) se marca vieja (§D-X).

| Sub | Vista | Disparador | `4xx` de negocio | `409` | `5xx` o red | Se renueva | Foco |
|---|---|---|---|---|---|---|---|
| 01c | `ForosView` | Primera página | `VALIDACION` de `claseId`: reemplaza con el texto fijo | — | Reemplaza ("No pudimos cargar los foros.") | — | Raíz si el control enfocado desaparece |
| 01c | `ForosView` | "Ver más foros" | `400` del cursor: texto de lista cambiada, sin aviso, fuera de la caché | — | Un aviso; la lista se queda | — | §7.14 (primer foro nuevo o `h2`) |
| 01c | `CrearForoView` | "Publicar foro" | Campo pintado: `ErrorDeCampo`; no pintado (o vacío, o con ruta): un aviso (FORO-1C06 a FORO-1C10) | `CATEGORIA_REQUERIDA`: bajo "Categoría" | Un aviso; lo escrito se conserva | Éxito: lista de foros, trabajo, temas y prefijo de calificaciones | Éxito: `h1`/`h2` del foro; error: se queda en el botón |
| 01c | `EditarForoView` | "Guardar cambios" | Como crear; `TAREA_NO_ENCONTRADA`/`EDICION_NO_PERMITIDA`/`SIN_ACCESO_A_LA_CLASE`: aviso y se vuelve a pedir el foro (§7.21, T-11) | `TAREA_MODIFICADA` / `TAREA_CON_CALIFICACIONES`: aviso, recarga y reinicio con la versión actual (§7.21); desmontada: aviso y `claveForo` vieja (T-01, T-04) | Un aviso | Éxito: `claveForo` (con la respuesta), lista, trabajo y prefijo de calificaciones | "Título" tras el reinicio |
| 01c | `ForoView` | Lectura del foro | `404`/`403`/`VALIDACION` de ids: reemplaza | — | Con caché: aviso de recarga fallida, una vez por fallo; sin caché: reemplaza | — | Raíz (`useFocoAlPerderseElControl`) |
| 01c | `ForoView` | "Sí, borrar foro" / "Borrar con las participaciones" | `TAREA_NO_ENCONTRADA`: aviso y `removeQueries`; `BORRADO_NO_PERMITIDO`: aviso y se marca vieja | `TAREA_CON_ENTREGAS`: segundo paso en línea, sin aviso | Un aviso | Éxito: navega a "Foro"; lista, trabajo, temas y calificaciones viejos | Éxito: `h2` de "Foro"; cancelar: "Borrar foro" |
| 01d | `ForoView` | Lista de principales y "Ver más participaciones" | `400` del cursor: texto, fuera de la caché | — | Primera carga: reemplaza el bloque (no la vista); recarga con caché: un aviso; "Ver más": un aviso | — | §7.14 |
| 01d | `ForoView` | "Publicar participación" | Campo `texto`: `ErrorDeCampo`; otro campo, vacío o con ruta: un aviso | `PARTICIPACION_YA_PUBLICADA`/`PARTICIPACION_CALIFICADA`/`FORO_CERRADO`: aviso; se piden `miParticipacion` y la lista; lo escrito se conserva | Un aviso; lo escrito se conserva | Éxito: `miParticipacion` y la primera página con la respuesta; lista de foros, trabajo y prefijo de calificaciones viejos | Éxito: la participación nueva; error: el botón |
| 01d | `ForoView` | Abrir réplicas, "Ver más réplicas" | `404 PARTICIPACION_NO_ENCONTRADA`: el bloque lo dice y se renueva la lista; `400` del cursor: texto del bloque | — | El bloque muestra el error; "Ver más": un aviso | — | Bloque o control |
| 01d (E3-3) | `ForoView` (admin) | "Sí, borrar participación" / "Sí, borrar réplica" | `404 PARTICIPACION_NO_ENCONTRADA`: aviso "Esa participación ya no existe." y se renuevan la lista y el bloque; `403`: aviso y se renueva la lista (`puedeBorrar` cae) | `409 CLASE_ARCHIVADA`: la política de §D-X | Un aviso; la confirmación sigue abierta y el botón sale de la espera | Éxito: la lista, el bloque de réplicas, la lista de foros (conteo), las participantes y el prefijo de calificaciones | §7.31: el mismo control de la vecina o la vecina; sin vecinas, el `h3` |
| 01d | `ForoView` | "Publicar réplica" | Campo `texto`: `ErrorDeCampo`; lo demás: un aviso | `FORO_CERRADO`: aviso y se pide `miParticipacion` | Un aviso | Éxito: el bloque (caché) y el conteo | El campo |
| 01e | `ParticipantesView` | Lista y "Ver más alumnos" | `400` del cursor: texto; `404` del foro / `403`: reemplaza | — | Primera: reemplaza; "Ver más": un aviso | — | §7.26 |
| 01e | `ParticipanteView` | Lecturas (participante, sus participaciones, devoluciones) | `404 ALUMNO_NO_ENCONTRADO` / foro `404`: reemplaza | — | Con caché: aviso; sin caché: reemplaza | — | Raíz |
| 01c (E1-11) | `ForoView` | Descargar un adjunto del planteamiento (`AdjuntosDePublicacion`, sin cambio) | `404 ARCHIVO_NO_ENCONTRADO`: un aviso con el mensaje de archivos; `403 SIN_ACCESO_A_LA_CLASE`: un aviso y se vuelve a pedir el foro (la recarga reemplaza la vista) | — | Un aviso (`alFallarLaDescarga`) | — | El botón de descarga |
| 01d (E1-11) | "Actividades" | "Mover" un foro (`useMoverElemento`, sin cambio) | `TEMA_NO_ENCONTRADO` o `PUBLICACION_NO_ENCONTRADA`: los avisos y las renovaciones de hoy (§7.22) | — | Un aviso | Éxito: el trabajo, los temas y `claveForo` (sube `tareas.version`; la edición abierta recibirá `TAREA_MODIFICADA`) | §7.22 (el "Mover" de la fila vecina o el encabezado de la sección) |
| 01d (E1-11) | `ForoView` | Consulta `mi-participacion` (alumno) | `404` del foro: el foro se vuelve a pedir y su `404` reemplaza la vista | — | Primera carga: "Tu participación" muestra su error ("No pudimos cargar tu participación.") y el formulario no se pinta; recarga con caché: se conserva y avisa una vez por fallo ("No pudimos actualizar tu participación. Mostramos la última versión que tenemos.") | — | No se mueve (ningún control se pierde); si se pierde el formulario enfocado, la raíz |
| 01e (E1-11) | `ForoView` y `ParticipanteView` | Devoluciones: primera página y "Ver más comentarios" | `400` del cursor: el bloque dice el texto de cursor de §D-9 (alumno o maestro), sin "Ver más", y la consulta sale de la caché | — | Primera carga: el bloque muestra su error; "Ver más": un aviso, el bloque se queda | — | §7.14 (el primer comentario nuevo o el `h3`) |
| 01e (E1-11) | `ParticipanteView` | Recarga de la participante con caché | — | — | Se conserva y avisa una vez por fallo: "No pudimos actualizar la participación de este alumno. Mostramos la última versión que tenemos." | — | No se mueve |
| 01e | `ParticipanteView` | "Publicar calificación" | Como §7.27 (campos pintados del panel; los no pintados, vacíos o con ruta: un aviso; FORO-1E05 a FORO-1E09) | `ENTREGA_MODIFICADA` / `RUBRICA_MODIFICADA` / `ENTREGA_NO_CALIFICABLE`: aviso, descarta y recarga (§7.27) | Un aviso; lo escrito se conserva | Éxito: participante (respuesta), participantes, prefijo de calificaciones, lista de foros y, con comentario, devoluciones | §7.27 |

### §D-11. Borrar participaciones y réplicas (DH-05 del humano; 01a2; E3-3)

**Regla.**
- El admin borra cualquier participación (principal o réplica) de cualquier foro de cualquier clase. Nadie más: PB-1 (a), resuelta por el humano (E5-3).
- Nadie edita.
- El alumno no borra nada, tampoco lo suyo.
- Borrar una principal se lleva sus réplicas, de quien sean (FK `principal_id … ON DELETE CASCADE`, §D-1.2).
- Una calificación ya publicada se conserva. **(E5-4, decidido por el humano)** El alumno calificado cuya principal se borra conserva la calificación, no puede volver a publicar su principal (`409 PARTICIPACION_YA_PUBLICADA`, porque la entrega conserva `fecha_entrega`; FORO-1A65) y sigue replicando con la regla de tiempo (S-06).

**La función que decide** (`backend/src/core/autoria.ts`, nueva; la regla general, `puedeBorrar`, no cambia):

```ts
// FORO-01a2 (DH-05, decisión del humano 2026-11-05): en un foro nadie borra lo suyo por ser autor;
// solo el admin modera (PB-1 a, decisión del humano).
export const puedeBorrarParticipacion = (actor: ParticipanteDeAutoria): boolean =>
  actor.rol === "admin"
```

Las listas (rutas 8 y 10) devuelven `puedeBorrar` por elemento con esta función, y la interfaz solo lo lee.

**La ruta (17):** `DELETE /clases/:claseId/foros/:foroId/participaciones/:participacionId`.
- `protegido({ roles: ["admin"], pertenencia: "propiedad" })` (PB-1 a).
- `participacionParamSchema`. Sirve igual para una principal y para una réplica: las dos son filas de `participaciones_foro`.
- `204`, sin cuerpo. No encola nada (P-11).
- **Clase archivada (01b):** queda sin `enClaseArchivada`, es decir, cerrada. En una archivada responde `409 CLASE_ARCHIVADA` también al admin, como toda escritura en ADMIN-01, salvo las de `gestion` (S-E3-1).

**La transacción** (`borrarParticipacion({ claseId, foroId, participacionId, actor })` en `adapters/db/foros.ts`; `enTransaccion`, READ COMMITTED; orden del proyecto: `tareas` → `entregas` → `participaciones_foro`):
1. `bloquearTareaParaEntregar(tx, { tareaId: foroId, claseId })` (`FOR KEY SHARE`, de `entregas.ts`). Si es `null`, `404 TAREA_NO_ENCONTRADA` "Ese foro ya no existe.". Así queda en serie con borrar el foro, que toma `FOR UPDATE`.
2. `esActividadDeTipo(tx, { id: foroId, claseId, tipo: "foro" })`; si es `false`, el mismo `404`.
3. `participacionForo.findFirst({ where: { id: participacionId, foroId }, select: { id, autorId, principalId } })`; si es `null`, `404 PARTICIPACION_NO_ENCONTRADA`.
4. `puedeBorrarParticipacion(actor)`; si es `false`, `403 BORRADO_NO_PERMITIDO` ("No puedes borrar lo que publicó otra persona.", el texto de hoy). Con PB-1 (a) es inalcanzable, porque la ruta ya exige admin; se prueba en `core/`.
5. **Si es una principal** (`principalId === null`):
   - `bloquearEntrega(tx, { tareaId: foroId, alumnoId: autorId })` (`FOR NO KEY UPDATE`), en serie con calificar, con otra principal de ese alumno y con otro borrado de la misma principal.
   - **Relectura después del bloqueo (E5-1, M-06):** `participacionForo.findFirst({ where: { id: participacionId, foroId, principalId: null }, select: { id: true } })`. Si ya no está (otro borrado confirmó mientras este esperaba la fila), **lanza** `404 PARTICIPACION_NO_ENCONTRADA` sin escribir nada. En READ COMMITTED esta sentencia ve lo que confirmó quien tenía la fila, así que la decisión que sigue usa el estado de después del bloqueo, no el leído en el paso 3.
   - La decisión pura `efectoDeBorrarPrincipal({ estado })` (`core/foros/participacion.ts`), con la entrega ya bloqueada:
     - `"conservar"` con `calificado`: la calificación, su desglose, `fecha_entrega` y la devolución no se tocan. Es decisión del humano, confirmada en E5-4.
     - `"volver-a-sin-participar"` con `entregado` (PB-2 a).
     - Con `asignado`, `ERROR_INTERNO`: inalcanzable tras la relectura (FORO-1A61).
   - Con `"volver-a-sin-participar"`: `entrega.update({ estado: "asignado", fechaEntrega: null, conRetraso: false, version: { increment: 1 } })`. `enlaces` ya es `[]` y cumple los CHECK de `entregas`.
   - Si no hay fila de entrega, `ERROR_INTERNO`: es inalcanzable, porque la principal la crea y el borrado de la entrega solo llega con el del foro, que está en serie por el paso 1.
6. `participacionForo.deleteMany({ where: { id: participacionId, foroId } })`. La cascada se lleva las réplicas.
   - Con `count === 0`, **lanza** `404 PARTICIPACION_NO_ENCONTRADA`, para revertir lo escrito.
   - En una principal ya no puede pasar después de la relectura, porque la fila de la entrega la protege. Solo queda para las réplicas, que no toman la entrega.

**Concurrencia:**
- **Réplica en vuelo contra borrar su principal:**
  - Si la réplica inserta primero, la FK toma `FOR KEY SHARE` sobre la principal; el `DELETE` espera, y al seguir se lleva también la réplica nueva.
  - Si el borrado confirma primero, el `INSERT` de la réplica falla por la FK (`P2003`). `adapters/db/errores.ts` lo traduce con un `alFaltarReferencia` nuevo, opcional, de `traducirErrorPrisma`, a `404 PARTICIPACION_NO_ENCONTRADA`, nunca `500`.
  - `publicarReplica` (01a1) pasa ese `alFaltarReferencia` en su `catch` desde 01a2.
- **Borrar contra calificar:** las dos operaciones toman la fila de la entrega.
  - Si calificar va primero, el borrado ve `calificado` y conserva.
  - Si el borrado va primero, la versión sube (PB-2 a) y quien calificaba con la anterior recibe `409 ENTREGA_MODIFICADA`.
- **Dos borrados a la vez (reescrito en E5-1, M-06):**
  - **De la misma principal**, con o sin calificación: los dos la leen en el paso 3. El primero toma la fila de la entrega, escribe, borra y confirma. El segundo, que esperaba esa fila, la relee en el paso 5, no la encuentra y responde `404` sin tocar `entregas`. La `version` sube una sola vez. Nunca `500`.
  - **De la misma réplica:** el segundo espera la fila en el `DELETE` y responde `404` (paso 6).
  - **De una principal y de una de sus réplicas:** si la principal va primero, la cascada se lleva la réplica y su borrado da `404`, por el paso 3 o el 6. Si la réplica va primero, la principal se borra después, sin ella.
- **Estados vecinos del mismo mecanismo (E5-1):** decidir con lo leído **después** de tomar el bloqueo.
  - **Borrar contra calificar:** calificar decide con la entrega bloqueada y su versión (sin cambio). El borrado decide con la entrega bloqueada y la relectura: si calificar confirmó antes, ve `calificado` y conserva.
  - **Borrar contra volver a publicar:** después de un borrado que devolvió la entrega a `asignado`, el alumno publica una principal nueva (otro id). Un segundo borrado del id viejo que esperaba la fila la relee, no la encuentra y responde `404`. Nunca borra la principal nueva ni toca la entrega que esta escribió. Publicar decide con la entrega bloqueada (`fechaEntrega` releída en 01a1, §D-3.4), así que una principal y un borrado en vuelo quedan en serie.
  - **Réplica en vuelo:** no toma la entrega. La FK la pone en serie con el `DELETE`, y el `P2003` da `404` (arriba). Sin cambio.
  - **Borrar contra borrar el foro:** el paso 1 los pone en serie. Si el foro se borró antes, `404` "Ese foro ya no existe.".
- **Volver a publicar (PB-2 a):** el índice único parcial (`foro_id`, `autor_id`) `WHERE principal_id IS NULL` ya no tiene la fila borrada, así que la principal nueva entra si `decidirParticipacionPrincipal` lo permite: el foro abierto según `reglaDeParticipacion`, sin `fecha_entrega` y no calificado.

**Respuestas que cambian (01a2):** `participacionSchema` y `replicaSchema` (§D-3.2) suman `puedeBorrar: boolean`. La lista de lo que escribió un alumno (ruta 14) no lo lleva: el borrado se hace desde el foro.

**Suposición S-E3-1 (aceptada por el humano, E4-1):** en una clase archivada nadie borra (solo lectura para todos, P-08). Si el humano quiere que el admin modere también una archivada, la ruta declara `enClaseArchivada: "gestion"` en 01b, con `roles: ["admin"]`, la condición que ADMIN-01 exige a esa política.

**Suposición S-E3-2 (aceptada por el humano, E4-1):** borrar no avisa a nadie (P-11) y no deja rastro de quién borró: no hay tabla de auditoría en el PRD.

**Interfaz (01d):** el control va en 01d, con las participaciones (§D-8.4).
- "Borrar" (`ghost`, `sm`) en cada principal y réplica con `puedeBorrar`. Nunca se pinta en una archivada.
- Pide la confirmación en línea de §7.14:
  - para una principal: "Se borrará con sus réplicas. Si el alumno ya tiene calificación, se conserva.", "Sí, borrar participación" (`destructive`, `enEspera`, ref) y "Cancelar";
  - para una réplica: "Se borrará esta réplica.", "Sí, borrar réplica".
- Al borrar: aviso "Participación borrada" o "Réplica borrada". Se renuevan la lista, el bloque de réplicas, la lista de foros (conteo) y el prefijo de calificaciones y de participantes (la entrega pudo cambiar).
- Foco como en Dudas (§7.31): al mismo control de la vecina, o a la vecina; sin vecinas, al `h3` "Participaciones" o al de "Réplicas".
- Textos para DH-12 (propuesta): los de arriba y "Esa participación ya no existe.".

## Cambios por capa

**(Enmienda 7)** El contenido de cada capa no cambia, pero sí su reparto entre subentregas, que manda en §E7.5:
- `conForos` y `temaDeTrabajoSchema` (`shared/src/tareas.ts`, `recursos.ts`), `temas.ts`, `listarTrabajo` y `categorias.ts` pasan de 01a a 01b;
- `enClaseArchivada` de `handlers/foros.ts` pasa de 01b a 01a;
- lo de 01a2 va en 01b;
- el frontend de 01c se reparte en 01c1 y 01c2, y suma `features/clases/components/fila-de-entrega.tsx` y `features/tareas/components/detalles-de-la-tarea.tsx` (props opcionales) y la traducción del foro (§E7.3, "Frontend", punto 6);
- `DESIGN.md` va en §7.34, no en §7.32.

### shared/
- **01a:**
  - `shared/src/foros.ts` (nuevo, §D-3.2).
  - `shared/src/tareas.ts`: tipo `foro` en `elementoDeTrabajoSchema`, `conForos` con su `.transform` en `trabajoQuerySchema` y `temasQuerySchema` (E1-4), y la exportación de `idOpcionalSchema`, `SeccionDeTrabajo` y `SeccionDeTemasConForos`.
  - `shared/src/index.ts`: el bloque de `./foros.js` y `idOpcionalSchema` (§D-X).
- **01b:** `shared/src/calificaciones.ts`: `conTipo` en `gradebookQuerySchema` y `misCalificacionesQuerySchema`, y `tipo` opcional en `columnaDelGradebookSchema` y `tareaDeMisCalificacionesSchema` (§D-6).

### backend/core/
- **01a `core/actividades.ts` (nuevo):** `type Actividad = "tarea" | "foro"` y `TEXTOS_POR_ACTIVIDAD` (§D-2.4), con `actividades.test.ts`.
- **01a `core/foros/participacion.ts` (nuevo):** estas funciones, con `participacion.test.ts`:
  - `reglaDeParticipacion({ tipo, rolDelAutor, foro, ahora }): ReglaDeParticipacion`: **la regla tardía**.
  - `decidirParticipacionPrincipal({ foro, estado, fechaEntrega, ahora }): { conRetraso: boolean }`.
  - `decidirReplica({ foro, rolDelAutor, ahora }): { conRetraso: boolean }`.
  - `accionesDelForo({ foro, estado, fechaEntrega, ahora }): { puedeParticipar: boolean; puedeReplicar: boolean; participarConRetraso: boolean; replicarConRetraso: boolean }` (E1-1).
  - `verRetrasoDe({ relacion, esPropia }): boolean`.
  - `participacionYaPublicada()`, `participacionCalificada()`, `foroCerrado()` y `participacionNoEncontrada()`, todas `(): AppError`.
- **01a `core/tareas/tareas.ts`:** `validarCategoriaRequerida({ …, actividad? })`, `mensajeTareaConEntregas(entregas, rol, actividad?)`, `exigirBorradoConEntregasPermitido({ …, actividad? })` y `tareaModificada(actividad?)`. Las pruebas de hoy no cambian; los casos nuevos de foro van en `core/actividades.test.ts`.
- **01a `core/calificaciones/calificar.ts`:** `entregaModificada(actividad?)`, `rubricaModificada(actividad?)`, `entregaNoCalificable(actividad?)`, `tareaConCalificaciones(actividad?)`, `decidirCalificacion({ …, actividad? })`, `exigirEntregaCalificable({ …, actividad? })` y `exigirRubricaCongelada({ …, actividad? })`. **(E1-1)** En `exigirEntregaCalificable`, con `"foro"`, el cierre sale de `reglaDeParticipacion` (importada de `core/foros/participacion.ts`). Con `"tarea"`, el cuerpo de hoy.

### backend/adapters/
- **01a:** `adapters/db/actividades.ts` (nuevo), `adapters/db/foros.ts` (nuevo, §D-3.4), `tareas.ts`, `temas.ts`, `entregas.ts`, `publicaciones.ts` y `categorias.ts` (§D-3.3; E1-9), e `index.ts` (exporta `listarForos`, `leerMiParticipacion`, `listarParticipaciones`, `listarReplicas`, `publicarParticipacion`, `publicarReplica`, `listarParticipacionesDeAlumno` y sus tipos `…Db`). `esActividadDeTipo` no se reexporta: solo la usan los adaptadores.
- **01b:** `adapters/db/calificaciones.ts`:
  - `SELECT_TAREA` agrega `publicacion: { select: { titulo: true, tipo: true } }`.
  - `ColumnaDelGradebookDb` gana `tipo: "tarea" | "foro"`; `columnaDe` estrecha con un `ERROR_INTERNO` si llegara otro tipo (inalcanzable).
  - No cambia ninguna consulta ni el número de `instantaneaUnica` (CAL-1B08). `exportacion-de-calificaciones.ts` hereda el tipo sin cambiar.
- **01b:** `adapters/README.md`: el foro, las participaciones, `esActividadDeTipo` y el orden de bloqueo de §D-4.

### backend/handlers/
- **01a:** `handlers/foros.ts` (nuevo, §D-3.1; 16 rutas). `app.ts` registra `forosHandler` con `{ prefix: "/api", almacen: almacenDeLaApp }`, después de `calificacionesHandler`.
- **01b:**
  - `handlers/foros.ts`: `enClaseArchivada: "lectura"` en sus lecturas (§D-7).
  - `handlers/calificaciones.ts`: `columnaParaResponder(tarea, conTipo = false)` y el `conTipo` de las dos lecturas. La exportación llama sin él.
  - `handlers/README.md`.

### backend/workers/
Sin cambios (S-09).

### backend/prisma/ (01a; el humano confirma antes de cada `prisma migrate dev`)
1. **`<marca>_foro_01_tipo_foro`:** el valor nuevo del enum en `schema.prisma` y, solo, `ALTER TYPE "tipo_publicacion" ADD VALUE 'foro';`. Se crea con `npx prisma migrate dev --create-only --name foro_01_tipo_foro` y se revisa que el SQL sea solo esa línea.
2. **`<marca>_foro_01_participaciones`:**
   - El modelo, sus índices y relaciones.
   - **A mano, al final del SQL generado:** el reemplazo del CHECK `publicaciones_titulo_segun_tipo` (§D-1.2) y `CREATE UNIQUE INDEX "participaciones_foro_una_principal" … WHERE "principal_id" IS NULL`, con un comentario `-- A mano (FORO-01a, §D-1.2; Prisma no expresa CHECK ni índices parciales)`, como las migraciones anteriores.
   - Se crea con `--create-only`, se edita y se aplica con `npx prisma migrate dev`.
3. **Verificación obligatoria después de aplicar las dos**, desde `backend/`: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` termina sin diferencias. Si propone borrar el índice parcial o tocar el CHECK, **PARADA** (como el índice único parcial de `usuarios`, DEC-01, y la misma verificación de ADMIN-01, N-06).

### infra/ y .env.example
Sin cambios.

### frontend/ (01c a 01e; lista definitiva en la Enmienda de arranque de cada una)
- **01c:**
  - `features/clases/`: `foros-view.tsx` (nuevo), `data.ts` (sección "Foro" y PR-1A17), `hooks.ts` (`useForos`) y `types.ts`.
  - `features/tareas/`: `foro-view.tsx`, `crear-foro-view.tsx` y `editar-foro-view.tsx` (nuevos); `components/formulario-tarea.tsx` (`tipo`; T-02, T-03), `components/acciones-de-la-tarea.tsx` (`tipo`), `editar-tarea-view.tsx` (T-01), `hooks.ts` (ganchos del foro; T-04, T-05), `data.ts`, `lib.ts` y `types.ts`.
  - `services/trabajoService.ts`, `app/router.tsx` y, si DH-12 lo pide, `components/estado-entrega-badge.tsx`.
- **01d (E1-4):**
  - `features/clases/`: `hooks.ts` (`conForos=si` en `useTrabajo` y `useTemasDeLaSeccion`), `trabajo-view.tsx` ("Crear foro"), `components/seccion-de-tema.tsx`, `components/fila-de-entrega.tsx` (o `elemento-de-trabajo.tsx`, según el grep) y `data.ts` (textos de categorías: "actividades", E1-9).
  - `features/tareas/`: `components/participaciones-del-foro.tsx`, `components/participacion-del-foro.tsx`, `components/replicas-de-participacion.tsx`, `components/formulario-de-participacion.tsx` y `components/mi-participacion.tsx` (nuevos); `foro-view.tsx`, `hooks.ts`, `data.ts`, `lib.ts` y `types.ts`.
- **01e:**
  - `features/tareas/`: `participantes-view.tsx`, `participante-view.tsx` y `components/devoluciones.tsx` (nuevos); `components/panel-de-calificacion.tsx`, `components/tabla-de-entregas.tsx` (textos por props), `components/mi-participacion.tsx`, `foro-view.tsx`, `hooks.ts`, `data.ts`, `lib.ts` y `types.ts`.
  - `features/calificaciones/`: `lib.ts`, `hooks.ts` (`conTipo=si`), `components/tabla-del-gradebook.tsx` y `components/lista-de-mis-calificaciones.tsx`.
  - `app/router.tsx` y `docs/DESIGN.md` (§7.32 Foro, y las marcas de §7.3, §7.16 y §7.22).

## Acceso a datos

| Consulta | Tablas | Índice | Paginación | Transacción |
|---|---|---|---|---|
| Lista de foros | `publicaciones` (`clase_id`, `tipo = 'foro'`) + `tareas`, `temas` y `usuarios` por PK | `publicaciones (clase_id, tipo, tema_id, creado_en DESC, id DESC)` por su prefijo (`clase_id`, `tipo`). Ordena en memoria las decenas de foros de una clase, como `GET /clases/anteriores` de ADMIN (su R-13). Si una clase llegara a cientos de foros, se propone `(clase_id, tipo, creado_en, id)` | Cursor `id`, máx. 100 | Instantánea única |
| Principales por foro (conteo) | `participaciones_foro` | `(foro_id, principal_id, creado_en, id)` | Ids de la página (máx. 100) | La misma |
| Entregas del alumno en la página | `entregas` | Único `(tarea_id, alumno_id)` | Ids de la página | La misma |
| Detalle | La de `leerTarea` con el tipo | PK | — | Instantánea única |
| Mi participación | `tareas` (PK), `entregas` (único), `puntajes_rubrica` (PK), `participaciones_foro` | `(foro_id, autor_id, creado_en, id)` | — | Instantánea única |
| Principales | `participaciones_foro` + `usuarios` (PK) | `(foro_id, principal_id, creado_en, id)` con `principal_id IS NULL` | Cursor `id`, máx. 100 | Instantánea única |
| Réplicas | ídem | `(principal_id, creado_en, id)` (E1-3) | Cursor, máx. 100 | Instantánea única |
| Conteo de réplicas por principal | `participaciones_foro` | `(principal_id, creado_en, id)`, con `principal_id IN (…)` y `foro_id = $1` (E1-3) | Ids de la página | La misma |
| Cascada al borrar una principal (borrar el foro o la clase) | `participaciones_foro` | `(principal_id, creado_en, id)` para la FK sobre sí misma (E1-3) | — | La del borrado |
| Participaciones de un alumno | `participaciones_foro` | `(foro_id, autor_id, creado_en, id)` | Cursor, máx. 100 | Instantánea única |
| Participantes, participante, devoluciones | Las de `listarEntregas`, `leerEntregaDeAlumno` y `listarHiloPrivado` con el tipo | Los de hoy | Los de hoy | Los de hoy |
| Publicar principal / réplica | `tareas` (bloqueo), `publicaciones` (PK, tipo), `entregas` (bloqueo), `participaciones_foro` (insert) | PK y únicos | — | `enTransaccion`, READ COMMITTED |
| Gradebook, riesgo, mis calificaciones, exportación | Sin cambio (01b suma `publicaciones.tipo` por PK en la misma relación ya leída) | Los de hoy | Los de hoy | Los de hoy |

Ninguna consulta en un ciclo. Los conteos y las entregas de una página salen en una sola sentencia cada uno. Sin SQL crudo nuevo.

## Autorización

| Ruta (§D-3.1) | Estudiante inscrito | Maestro de la clase | Admin | Otros |
|---|---|---|---|---|
| 1, 4, 5 (crear, editar, borrar) | `403` (rol) | Sí; editar y borrar con la autoría de la tarea (`EDICION_NO_PERMITIDA`, `BORRADO_NO_PERMITIDO`, `TAREA_CON_ENTREGAS`) | Sí; borra cualquiera y confirma con participaciones | Maestro de otra clase, clase inexistente: `403 SIN_ACCESO_A_LA_CLASE` |
| 2, 3, 8, 10 (leer foros, detalle, principales, réplicas) | Sí | Sí | Sí | Alumno de otra clase o no inscrito: `403 SIN_ACCESO_A_LA_CLASE` |
| 6, 7 (mi participación, mis devoluciones) | Sí, siempre la suya (`perfilDe`) | `403` | `403` | ídem |
| 9 (publicar principal) | Sí | `403` | `403` | ídem |
| 11 (replicar) | Sí | Sí | `403` (P-09: el admin lee) | ídem |
| 12 a 15 (participantes, participante, sus participaciones, devoluciones) | `403` | Sí | Sí | ídem |
| 16 (calificar) | `403` | Sí | `403` (S-01) | ídem |
| 17 (borrar participación o réplica; 01a2, E3-3) | `403` (rol), también el autor | `403` (rol; PB-1 a) | Sí, cualquiera | ídem |

- **Alumno restringido:** `403 ACCESO_RESTRINGIDO` en las 17 rutas (las 16 de 01a1 y la 17 de 01a2; E5-3) (`withAccess`, RN-09: "lo que un alumno restringido no ve incluye … foros"). Cambio de contraseña pendiente: `403 CAMBIO_DE_CONTRASENA_REQUERIDO`.
- **Estado de pago:** ninguna respuesta lo lleva, ni para el maestro. Tampoco correo, restricción ni rol. Las pruebas comparan las llaves exactas (FORO-1A50).
- **Campos que se omiten:** `conRetraso` de las participaciones de otros para el alumno (DH-07); `entrega` en la lista para maestro y admin; `requiereAdjuntos` y `trabajo_id` siempre.
- **Clase archivada (01b; (Enmienda 7) desde 01a, y la ruta 17 en 01b):** escrituras `409 CLASE_ARCHIVADA` para todos; lecturas 2, 3, 8, 10 y 12 a 15 para maestro y admin, `409` para el alumno; 6 y 7, `409` para el alumno.

## Pruebas requeridas

Los ids llevan el prefijo del encargo y de la subentrega (`FORO-1A…` a `FORO-1E…`). Toda prueba ejecuta al menos una aserción, y una precondición que falta hace fallar la prueba (`AGENTS.md`).

**(Enmienda 7)** Los movimientos entre subentregas y los casos nuevos (FORO-1B09, FORO-1B10, FORO-1C40, FORO-1C41, FORO-1C43, FORO-1C50 a FORO-1C54, FORO-1D50 a FORO-1D54, FORO-1E40, FORO-1E41, FORO-1E50, FORO-1E52 y FORO-1E53) están en §E7.4. Los ids no cambian al moverse.

### 01a (backend; `core/` con dobles en memoria, el resto contra el PostgreSQL desechable)

**`core/foros/participacion.test.ts`**
- FORO-1A01: `reglaDeParticipacion`, la tabla completa con el valor por omisión. Para el alumno, principal y réplica: antes de la fecha, en el milisegundo exacto (a tiempo) y un milisegundo después, con `aceptaTardias` en `true` y `false` (abierta/retraso: `true/false`, `true/false`, `true/true`; con `false` después: `false` y retraso `true`). Para el maestro: siempre `{ abierta: true, conRetraso: false }`, también después con `aceptaTardias = false`. Para el admin: siempre `{ abierta: false, conRetraso: false }`.
- FORO-1A02: `decidirParticipacionPrincipal`: el orden de los errores (`PARTICIPACION_YA_PUBLICADA` antes que `PARTICIPACION_CALIFICADA` antes que `FORO_CERRADO`), calificado con `fechaEntrega` → `YA_PUBLICADA`, calificado sin ella → `CALIFICADA`, y devuelve el `conRetraso` de la regla.
- FORO-1A03: `decidirReplica`: alumno cerrado → `FORO_CERRADO`; maestro nunca; `conRetraso` de la regla.
- FORO-1A04: `accionesDelForo` coincide con las dos decisiones en cada combinación de FORO-1A01 × estado (sin lanzar).
- FORO-1A05: `verRetrasoDe`: estudiante con y sin `esPropia`, maestro y admin.
- FORO-1A06 (reescrita, E1-1). La regla tardía vive en un solo lugar; se comprueba de dos formas:
  - **(i) Estática, sobre `backend/src` sin comentarios (reescrita en E2-1, M-05).** Prohíbe las **decisiones** con la fecha fuera de la función, no la palabra:
    - **Lo que la prueba prohíbe.** Son "decisiones con la fecha" `esTarde(`, `entregaCerrada(`, `getTime(`, `Date.now(` y toda comparación (`<`, `<=`, `>`, `>=`) que tenga a un lado `fechaLimite`, `fecha_limite` o `ahora`.
    - **En `core/foros/participacion.ts`,** esas decisiones aparecen solo dentro del cuerpo de `reglaDeParticipacion`. La palabra `aceptaTardias` se admite en la declaración de `interface ForoParaParticipar { fechaLimite: Date; aceptaTardias: boolean }` y en los parámetros que las demás funciones reciben y reenvían a `reglaDeParticipacion`, sin leerla para decidir.
    - **En `adapters/db/foros.ts`, `adapters/db/actividades.ts` y `handlers/foros.ts`** no hay ninguna de esas decisiones. Apariciones de `aceptaTardias` y `fechaLimite` que la prueba admite, y que enumera:
      - el `select` de la fila de `tareas` en `foros.ts`;
      - el armado del objeto `{ fechaLimite, aceptaTardias }` que `foros.ts` pasa a `decidirParticipacionPrincipal`, `decidirReplica` y `accionesDelForo`;
      - el mapeo de respuesta de `handlers/foros.ts` (`fechaLimite.toISOString()`);
      - el paso de `datos.aceptaTardias` y `datos.fechaLimite` del formulario a `crearTarea` y `editarTarea`;
      - `momentoDelRecordatorio(fechaLimite, ahora)` y `validarFechaLimite(…)` en `handlers/foros.ts`, que son la regla del recordatorio y de la fecha, no la tardía. La prueba los nombra.
    - **El cuerpo de `exigirEntregaCalificable`** llama a `reglaDeParticipacion(` en la rama de `"foro"`.
  - **(ii) Equivalencia, con dobles en memoria:** para cada combinación de FORO-1A01 (fecha × tardías × instante) y cada estado, `exigirEntregaCalificable({ …, actividad: "foro" })` lanza si y solo si el estado es `asignado` y `reglaDeParticipacion({ tipo: "principal", rolDelAutor: "estudiante", … }).abierta` es `true`. Y `accionesDelForo` devuelve en `participarConRetraso` y `replicarConRetraso` el `conRetraso` de la regla.

  Así, cambiar la regla mueve las tres cosas juntas.

**`core/actividades.test.ts`**
- FORO-1A07: cada función de §D-2.4 con `"foro"` devuelve el código de hoy y el texto de la tabla (singular y plural en `TAREA_CON_ENTREGAS`, admin y maestro). Sin el parámetro, el texto de hoy, letra por letra.

**`backend/test/migracion-foro-01.integracion.test.ts`** (patrón de `migracion-clases-03b`: aplicar hasta la anterior en un esquema aparte, insertar datos y aplicar las dos de FORO)
- FORO-1A10: con datos de antes (un anuncio, un material y una tarea con entrega), las dos migraciones se aplican y no cambian ninguna fila.
- FORO-1A11: un foro con título y su fila de `tareas` entra; un foro sin título viola `publicaciones_titulo_segun_tipo`; un anuncio con título sigue rechazado.
- FORO-1A12: dos principales del mismo autor en el mismo foro violan `participaciones_foro_una_principal`; dos réplicas del mismo autor y dos principales en foros distintos, no.
- FORO-1A13: borrar la publicación del foro se lleva `tareas`, `participaciones_foro` (principales y réplicas), `entregas` y sus comentarios; borrar una principal se lleva sus réplicas.
- ~~FORO-1A14~~ **(E1-17):** no es una prueba. `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` va en el resumen del programador con su comando y su salida (paso 5).
- FORO-1A15 (E1-3): los tres índices y el único parcial existen con su definición (`pg_indexes.indexdef`, como `migracion-clases-03b:252-262`): `(foro_id, principal_id, creado_en, id)`, `(principal_id, creado_en, id)`, `(foro_id, autor_id, creado_en, id)` y `UNIQUE … (foro_id, autor_id) WHERE (principal_id IS NULL)`. Además, `EXPLAIN` (sin `ANALYZE`) del conteo de réplicas y de la lista de réplicas, con `enable_seqscan = off` en la transacción de la prueba, nombra `participaciones_foro_principal_id_creado_en_id_idx`. La prueba mide que el índice sirve, no el plan que elige PostgreSQL con pocas filas.

**`backend/test/foros.integracion.test.ts`**
- FORO-1A20: crear (maestro y admin) responde `201` con el detalle sin `requiereAdjuntos`, `trabajo_id`, rol ni correos. Encola `TAREA_CREADA` (id del foro, solo ids) y `RECORDATORIO_24H` en `created` con `start_after = fecha − 24 h` y su id en `trabajo_id`. Con fecha a menos de 24 h, sin recordatorio. Si falla el encolado, no queda el foro.
- FORO-1A21: editar con la versión vieja → `409 TAREA_MODIFICADA` con el texto del foro y nada cambia. Mover la fecha cancela y recrea el recordatorio en la misma transacción. Con una calificada, cambiar puntos o rúbrica → `409 TAREA_CON_CALIFICACIONES` (texto del foro). `CATEGORIA_REQUERIDA` con texto del foro.
- FORO-1A22: borrar sin participaciones → `204` y cancela los dos trabajos. Con una principal: maestro → `409 TAREA_CON_ENTREGAS` con el texto del foro y el conteo; admin con `?confirmar=entregas` → `204`, en cascada.
- FORO-1A23: autoría (RN-07): un maestro no edita ni borra el foro del admin ni el del otro maestro, salvo que ese ya no dé la clase; `puedeEditar` y `puedeBorrar` en el detalle.
- FORO-1A24: lista de foros: orden, cursor (uno de otra clase, una tarea o un anuncio como cursor → `400`), `participaciones` por foro y `entrega` solo para el alumno.
- FORO-1A25 (E1-4): "Actividades".
  - `seccion=actividades` no trae foros (como hoy).
  - `seccion=actividades&conForos=si` los trae mezclados por tema y fecha, con su `entrega` para el alumno y `puedeMover`.
  - Un foro como cursor sin `conForos` → `400`.
  - `conForos=si` sin `seccion=actividades`, o con otro valor → `400 VALIDACION` "conForos: no es válido".
  - Los conteos de `GET …/temas` con `seccion=actividades` (sin foros), con `&conForos=si` (con foros) y sin sección (el total, con foros, E1-9).
  - Mover un foro de tema sube `tareas.version`.
- FORO-1A26b (E1-9, N-03): quitar una categoría con solo tareas responde `409 CATEGORIA_CON_TAREAS` con el texto de hoy, letra por letra. Con un foro (y con un foro y una tarea), el texto es "«X» tiene {n} actividades. Muévelas a otra categoría antes de quitarla." ("1 actividad" en singular) y nada cambia. En `GET …/categorias`, `tareas` de cada categoría cuenta tareas y foros.
- FORO-1A26: la lista del muro sin `tipo` (compatibilidad) no devuelve foros ni acepta uno como cursor; con `tipo=anuncio`, igual que hoy.

**`backend/test/foros-participaciones.integracion.test.ts`**
- FORO-1A27: diez principales simultáneas del mismo alumno → una `201` y nueve `409 PARTICIPACION_YA_PUBLICADA`; una sola fila principal; la entrega `entregado` con `version` 1.
- FORO-1A28: una réplica mientras se borra el foro → `201` antes o `404` después; nunca `500` ni `P2003`.
- FORO-1A29: principal a tiempo → la entrega queda `entregado`, `fecha_entrega` = hora de la principal, `con_retraso = false` y `version + 1`. Después de la fecha con tardías → `con_retraso = true` en la participación y en la entrega. Sin tardías → `409 FORO_CERRADO` y no queda la fila perezosa. Reabrir (mover la fecha a futuro o aceptar tardías) permite publicar.
- FORO-1A30: calificado sin participación (cerrado) → `409 PARTICIPACION_CALIFICADA` aunque se reabra; sus réplicas sí, con la regla.
- FORO-1A31: réplicas: el alumno replica en una principal ajena y en la suya, sin haber publicado la suya (DH-04 a). El maestro replica después de la fecha en un foro sin tardías, sin `con_retraso`. Una principal de otro foro, una réplica como principal o una inexistente → `404 PARTICIPACION_NO_ENCONTRADA`.
- FORO-1A32: listas: principales ascendentes con `replicas` y `propia`; `conRetraso` sale para el maestro y el admin en todas, para el alumno solo en la suya (DH-07 a); cursor de otra principal, de otro foro o una réplica → `400`. Réplicas ascendentes con el mismo criterio.
- FORO-1A33: `mi-participacion`: sin fila (`asignado`, sin calificación, `puedeParticipar` según la regla), con principal (`principalId`, `fechaEntrega`) y calificada (desglose por criterio). **(E1-1)** `participarConRetraso` y `replicarConRetraso` son `false` antes de la fecha y `true` después con tardías.
- FORO-1A34: participar y replicar no encolan ningún trabajo (S-09).
- FORO-1A35: el texto vacío, de solo invisibles o de más de 5 000 (principal) / 1 000 (réplica) → `400 VALIDACION` con "texto: …"; un carácter nulo → `400`, nunca `500`.

**`backend/test/foros-calificar.integracion.test.ts`**
- FORO-1A40: un foro calificado sale como columna del gradebook y de la exportación (`GET …/calificaciones/exportacion`) con su calificación en la celda del alumno, y pondera en su categoría como una tarea (cierra S-03 en el JSON).
- FORO-1A41: riesgo: un foro vencido sin principal del alumno cuenta en `vencidasSinEntregar`; con principal no; calificado sin participar no (S-04 de CALIFICACIONES-01). "Mis calificaciones" lo lista con su estado en cada filtro.
- FORO-1A42: calificar con rúbrica (suma escalada) y sin rúbrica; recalificar; versión vieja → `409 ENTREGA_MODIFICADA` (texto del foro); la principal publicada después de abrir el panel sube la versión y da ese `409`; `puntosDeLaTarea` viejos → `RUBRICA_MODIFICADA`; calificar a quien no participó con el foro abierto → `ENTREGA_NO_CALIFICABLE` (texto del foro); cerrado → `200`, `calificado` sin `fecha_entrega`.
- FORO-1A43: encola `CALIFICACION_PUBLICADA` con `{ entregaId, tareaId: foroId, claseId, version }` y un id nuevo por publicación. El comentario va a `comentarios` con `entrega_id` y sale en las devoluciones (rutas 7 y 15, ascendentes, cursor de otro hilo → `400`).
- FORO-1A44: participantes: la lista con `total` y `entregadas` (participaron), cursor del roster; participante con `version`, `enlaces: []` y `adjuntos: []`; sus participaciones (principal y réplicas con `enRespuestaA`).

**`backend/test/foros-cierre-de-tareas.integracion.test.ts`** (que ninguna ruta de tarea acepte un foro, y al revés)
- FORO-1A45: con el id de un foro, `GET`, `PUT` y `DELETE /tareas/:id` → `404 TAREA_NO_ENCONTRADA` ("Esa tarea ya no existe.") y **nada cambia**: título, archivos confirmados, `trabajo_id` y trabajos. Es la regresión del descarte de archivos de `borrarTarea` (§D-3.3).
- FORO-1A46: con el id de un foro, `GET`/`POST …/tareas/:id/entrega`, `POST …/entrega/anular`, `POST …/entrega/archivos`, `GET`/`POST …/entrega/comentarios`, `GET …/entregas`, `GET …/entregas/:alumnoId`, `GET`/`POST …/entregas/:alumnoId/comentarios`, `PUT …/entregas/:alumnoId/calificacion` y las dos descargas de entrega → `404`, sin fila nueva en `entregas` ni comentario.
- FORO-1A47: con el id de una tarea (o de un anuncio o un material), cada una de las 16 rutas del foro → `404` ("Ese foro ya no existe." o `PARTICIPACION_NO_ENCONTRADA`), sin escribir nada.
- FORO-1A48: `DELETE /publicaciones/:foroId` y los comentarios del muro sobre un foro → `404` (filtran los tipos del muro, sin cambio).

**`backend/test/foros-autorizacion.integracion.test.ts`** (por cada una de las 16 rutas, con la tabla de "Autorización")
- FORO-1A49: rol incorrecto, clase ajena (maestro de otra clase y alumno no inscrito), clase inexistente (misma respuesta que la ajena) y alumno restringido (`ACCESO_RESTRINGIDO`); el admin en 11 y 16 → `403`.
- FORO-1A50: ninguna respuesta de las 16 (ni sus errores) lleva `estadoPago`, `accesoRestringido`, `email`, `rol`, `trabajoId` ni `requiereAdjuntos`. Se comparan las llaves exactas de cada objeto, también en la vista del maestro.

**`backend/test/foros-estatico.test.ts`**
- FORO-1A51: `handlers/foros.ts`, sin comentarios, no coincide con el regex de `temas-01a-r1.ataque.test.ts:1007-1008`, copiado sin aflojarlo, más `relacion\s*===` (E1-21, N-02): `/\$queryRaw|\$executeRaw|obtenerDb|adapters\/db\/cliente|@prisma|\.rol\b|"admin"\s*===|===\s*"(admin|maestro|estudiante)"|notifier|relacion\s*===/`. Por eso pasa el objeto `perfilDe(request)` completo a `publicarReplica` y nunca lee `.rol`. Además, no compara relación ni rol, no toca Prisma ni SQL, solo encola `COLA_TAREA_CREADA`, `COLA_RECORDATORIO_24H` y `COLA_CALIFICACION_PUBLICADA` y solo cancela `COLA_RECORDATORIO_24H` y `COLA_TAREA_CREADA`. Cada ruta lleva su `protegido({…})` exacto de §D-3.1.
- FORO-1A52: `adapters/db/foros.ts` y `actividades.ts` sin `$queryRaw`, `$executeRaw` ni `FOR …`, sin consultas en ciclos y sin importar `adapters/queue`. Las respuestas nuevas de `shared/src/foros.ts` son `z.strictObject`.
- FORO-1A53: ningún comentario de los archivos nuevos o cambiados de `backend/src` en 01a nombra las palabras que leen en crudo las listas estáticas (las de CAL-1A18, N-01, y `lecturas-fx-r1.ataque:794-804` para `tareas.ts`).

**(Enmienda 7)** FORO-1A25 y FORO-1A26b van en 01b; FORO-1B01 a FORO-1B05, en 01a (§E7.4).

**Regla de `AGENTS.md`:** 01a toca `shared/`, así que se corren `lint`, `test` y `build` de `shared`, del backend y del frontend, una suite después de otra. El frontend no cambia, pero compila contra los tipos nuevos. **(E1-24, N-09)** En las rondas del programador y del tester, `test` es la suite de los módulos tocados, más las pruebas que nombra el plan ("Suites por ronda"). En 01a, eso es `backend/test/foros*`, `migracion-foro-01*`, las de tareas, entregas, calificaciones, temas, categorías y muro, `src/core`, y en el frontend `src/lib` y `src/features/clases`. La suite completa de cada paquete la corre el manager una vez, al cerrar la subentrega.

### 01a2 (backend; borrado de participaciones, E3-3)
**(Enmienda 7)** Va en 01b, con los mismos ids. Los ids `FORO-1A6x` mantienen el prefijo de 01a: 01a1 y 01a2 son las dos mitades de 01a.

**`backend/src/core/foros/borrado.test.ts`**
- FORO-1A60: `puedeBorrarParticipacion`: admin → `true`; maestro, alumno autor y otro alumno → `false` (PB-1 a).
- FORO-1A61 (corregida en E5-1): `efectoDeBorrarPrincipal`: `calificado` → `"conservar"`; `entregado` → `"volver-a-sin-participar"` (PB-2 a); `asignado` → `ERROR_INTERNO`. `asignado` es inalcanzable **porque** la transacción vuelve a leer la principal después de bloquear la entrega (§D-11, paso 5): si la principal sigue ahí, la entrega tiene `fecha_entrega` (está `entregado` o `calificado`); si ya no está, el borrado responde `404` antes de llamar a la función.

**`backend/test/foros-borrar.integracion.test.ts`**
- FORO-1A62, autorización de la ruta 17:
  - el maestro de la clase → `403` (rol, PB-1 a);
  - el alumno autor → `403`;
  - otro alumno → `403`;
  - un alumno restringido → `403 ACCESO_RESTRINGIDO`;
  - el admin en una clase inexistente → `403 SIN_ACCESO_A_LA_CLASE`;
  - el admin con un foro de otra clase, el id de una tarea o una participación de otro foro → `404`.
- FORO-1A63: el admin borra una réplica de un alumno y una de un maestro → `204`; la principal y las demás réplicas siguen; el conteo `replicas` de la principal baja.
- FORO-1A64, cascada: el admin borra una principal con réplicas de tres personas → `204`. No queda ninguna réplica. La lista de principales y el conteo `participaciones` de la lista de foros bajan.
- FORO-1A65, calificación conservada: con la principal calificada (con rúbrica y devolución), borrarla deja intactos `entregas` (`calificado`, `calificacion`, `fecha_calificacion`, `fecha_entrega`, `version`), `puntajes_rubrica` y la devolución. El gradebook, "Mis calificaciones", la exportación y el riesgo no cambian. El alumno no puede volver a publicar (`409 PARTICIPACION_YA_PUBLICADA`). **(E5-4)** Sí puede seguir replicando (`201`, con el foro abierto según la regla).
- FORO-1A66, sin calificación (PB-2 a):
  - la entrega vuelve a `asignado`, sin fecha ni retraso, con `version + 1`;
  - quien calificaba con la versión anterior recibe `409 ENTREGA_MODIFICADA`;
  - con el foro abierto, el alumno vuelve a publicar su principal y el índice único parcial lo admite;
  - con el foro cerrado, no (`409 FORO_CERRADO`), cuenta como vencida sin entregar y el maestro puede calificarla (P-03 c′).
- FORO-1A67, concurrencia: una réplica en vuelo contra el borrado de su principal. Con la principal retenida, como en `ayudas-concurrencia.ts`, se prueban los dos órdenes: la réplica primero, y el borrado se la lleva; o el borrado primero, y la réplica responde `404 PARTICIPACION_NO_ENCONTRADA`, nunca `500` ni `P2003`. Además, dos borrados simultáneos (doble clic del admin) → un `204` y un `404`, sin efecto doble en `entregas`. **(E5-1, M-06)** Los dobles borrados se prueban en cuatro casos, cada uno con el segundo borrado formado detrás de la fila de la entrega o de la participación (`formadasDetrasDe`), nunca `500`:
  - una **principal sin calificación**, donde la entrega queda `asignado` con `version` + 1 una sola vez;
  - una principal calificada, donde la calificación queda intacta;
  - una réplica;
  - una principal y una de sus réplicas a la vez.

  Y el vecino de volver a publicar: un borrado del id viejo formado detrás de la entrega mientras el primer borrado confirma y el alumno publica su principal nueva. Responde `404`, y la principal nueva y su entrega `entregado` quedan intactas.
- FORO-1A68: borrar contra calificar a la vez, en los dos órdenes, como en §D-11.
- FORO-1A69: borrar no encola ningún trabajo. En `adapters/db/errores.ts`, `traducirErrorPrisma` con `alFaltarReferencia` convierte un `P2003` en ese `AppError` y, sin la opción, lo relanza como hoy (la prueba unitaria va en `errores.test.ts`, lista cerrada).
- FORO-1A70: las listas 8 y 10 devuelven `puedeBorrar` en `true` solo para el admin. FORO-1A50 (llaves exactas) suma `puedeBorrar` y sigue sin `estadoPago` ni las demás.

### 01b (backend, después de fusionar)
**(Enmienda 7)** FORO-1B01 a FORO-1B05 van en 01a. FORO-1B06 y FORO-1B08 van en 01b, junto con FORO-1B09 y FORO-1B10, que son nuevos. FORO-1B07 va en el resumen de 01a. La viñeta de C-3 y C-4 queda sin objeto (no hay fusión), y también la de la PARADA del conteo de ADMIN (§E7.0).
- FORO-1B01 (determinista, E1-19). En una clase archivada, cada escritura del foro, con un resultado por rol y sin escribir nada:
  - **`409 CLASE_ARCHIVADA` si el rol pasa `requireRole`:** el maestro de la clase en 1, 4, 5, 11 y 16; el admin en 1, 4, 5 y **17** (E3-3, S-E3-1); el alumno inscrito en 9 y 11.
  - **`403` del rol (`requireRole`, antes del sexto paso) si no lo pasa:** el alumno en 1, 4, 5, 16 y 17; el maestro en 9 y 17 (PB-1 a); el admin en 9, 11 y 16.

  Es la regla de §D-1 de ADMIN: una ruta sin `enClaseArchivada` responde `409` a toda relación que pasó los roles y la pertenencia.
- FORO-1B02: las lecturas 2, 3, 8, 10 y 12 a 15 → `200` para el maestro de la clase y el admin; `409` para el alumno inscrito. Las 6 y 7 → `409` para el alumno.
- FORO-1B03: una clase inexistente, ajena o con rol incorrecto sigue dando `403` antes de mirar si está archivada (§D-1 de ADMIN).
- FORO-1B04: la prueba de políticas de ADMIN (ADM-1A09) en verde con las 17 rutas del foro en su tabla (E3-3; la 17 sin declarar, es decir, cerrada) (lista cerrada de 01b).
- FORO-1B05: restaurar la clase vuelve a abrir las escrituras del foro.
- FORO-1B06: gradebook y "Mis calificaciones" con `conTipo=si`: cada columna lleva `tipo` (`tarea` o `foro`); sin el parámetro, la respuesta es igual, llave por llave, a la de `e94ee59` (las pruebas existentes no cambian; **(Enmienda 7)** a la de `fd4a7ad`); `conTipo=no` o repetido → `400`. La exportación nunca lleva `tipo`.
- FORO-1B07: después de la fusión, la suite completa del backend aplica todas las migraciones desde cero y `migrate diff --exit-code` termina sin diferencias. Se anota en el resumen con su comando.
- C-3 y C-4 (§D-R0 01b): las listas de `sesiones-y-cadena` y `lecturas-fx-r1` quedan como la unión de las dos ramas.
- Si el conteo de borrado de ADMIN (`contarParaBorrar`) cuenta las actividades por `publicaciones.tipo = 'tarea'` en lugar de por `tareas`, **o** cuenta las `entregas` de un modo que deja fuera las de un foro, **PARADA**: se arbitra si el foro entra en "actividades" y "entregas" (RF-70 lo pide).
- FORO-1B08 (E1-20, N-01): una clase archivada con un foro que tiene principal, réplica, calificación con desglose y devolución.
  - El conteo de borrado de ADMIN incluye el foro entre las actividades y la entrega entre las entregas y las calificaciones.
  - `DELETE /admin/clases/:claseId?confirmar=borrar` responde `204`.
  - No queda ninguna fila del foro en `publicaciones`, `tareas`, `participaciones_foro`, `entregas`, `puntajes_rubrica`, `comentarios` ni `archivos` confirmados del planteamiento. Sus objetos van a la cola de ADMIN.

### 01c (frontend)

**Sección y lista (`features/clases/foros-01c.test.tsx`)**
- FORO-1C01: las siete secciones en orden, con "Foro" tercera, para los tres roles, y el indicador en "Foro" en `foro` y `foros/:id`. **(Enmienda 7)** Activa en `foro`, no en `foros/:id` (§E7.3, "Frontend", punto 1).
- FORO-1C02: estados de la lista; fila con estado del alumno y conteo del maestro; "Crear foro" solo para maestro y admin, y nunca en una archivada.
- FORO-1C03: "Ver más foros" (`enEspera` durante una recarga, ref, foco §7.14).

**Formulario de crear y editar (`features/tareas/formulario-foro-01c.test.tsx`)**
- FORO-1C04: con `tipo="foro"`, los rótulos de §D-9, sin "Cómo se entrega", planteamiento obligatorio ("Escribe el planteamiento del foro" sin pedir nada). Con `tipo` ausente, el formulario de la tarea, igual que hoy.
- FORO-1C05: publicar y guardar, con sus avisos, invalidaciones (matriz) y navegación; el `409 TAREA_MODIFICADA` reinicia con la versión actual (§7.21).

**`VALIDACION` fuera de contrato, crear foro (`features/tareas/errores-foro-01c.test.tsx`)**
- FORO-1C06: `400 VALIDACION` de un campo que el formulario no pinta (`foroId`). Un solo aviso legible, ningún `ErrorDeCampo`, lo escrito se conserva y el botón sale de la espera.
- FORO-1C07: con mensaje vacío y con mensaje de solo espacios: el genérico del módulo, con la misma regla de un solo mensaje.
- FORO-1C08: con prefijo de ruta (`rubrica.1.criterio: …`) el `ErrorDeCampo` va en la fila 2 sin la ruta. Con un campo que el formulario pinta solo en otro modo o tipo (`requiereAdjuntos`, que solo pinta la tarea; `version`, que solo pinta la edición), cuenta como no pintado y da un aviso.
- FORO-1C09: un rechazo del servidor seguido de un envío que la validación local rechaza: se lee solo el mensaje del segundo envío.
- FORO-1C10: la función de traducción del foro (envoltorio de `lib/errores-de-api.ts`) recorre `ENTRADAS_FUERA_DE_CONTRATO`.
- FORO-1C11: FORO-1C06 a FORO-1C09 en **editar** foro (con `version` pintada como no visible), más su recorrido de `ENTRADAS_FUERA_DE_CONTRATO`.

**Detalle, borrar y archivada (`features/tareas/foro-detalle-01c.test.tsx`)**
- FORO-1C12: detalle por rol (insignia, planteamiento, adjuntos, rúbrica, "Detalles" con la política; acciones según `puedeEditar` y `puedeBorrar`); estados; `404`; recarga fallida con caché (un aviso por fallo, T-12).
- FORO-1C13: borrar: confirmación en línea; `409 TAREA_CON_ENTREGAS` con el segundo paso (solo el admin ve "Borrar con las participaciones"); éxito con `removeQueries` y navegación a "Foro"; foco §7.14.
- FORO-1C37 (E1-11): descargar un adjunto del planteamiento, con las filas de la matriz (`404`, `403`, `5xx`). El aviso de `5xx` ("…Inténtalo de nuevo.") se cumple repitiendo el botón.
- FORO-1C14: en una clase archivada (contexto de ADMIN), ningún control de escritura del foro se pinta; crear y editar pintan el texto de archivada; un `409 CLASE_ARCHIVADA` al publicar avisa una vez, conserva lo escrito y marca vieja `claveClaseDetalle` con `exact: true`.

**"Actividades":** ~~FORO-1C15~~ pasa a 01d como FORO-1D29 (E1-4).

**Frases de recuperación (`features/tareas/recuperar-foro-01c.test.tsx` y `features/clases/recuperar-foros-01c.test.tsx`).** Todas con `rutas` de `app/router` y la configuración de `app/providers.tsx` (`staleTime: 30_000`, `retry: 1`).
- **"La lista de foros cambió … Vuelve a abrir Foro para verla completa."**
  - FORO-1C20: pulsar "Foro" estando en ella (otra `location.key`).
  - FORO-1C21: ir a otra sección y regresar antes de 30 s.
  - FORO-1C22: atrás y adelante del historial.
  - FORO-1C23: "Ver más" no se ofrece mientras se ve el texto (el control que falló no se repite: se prueba que no está).
  - En cada caso se pide la primera página otra vez (no se sirve de la caché) y el texto desaparece.
- **"No pudimos actualizar el foro. Mostramos la última versión que tenemos."**
  - FORO-1C24: volver a abrir el foro desde "Foro" antes de 30 s pide de nuevo.
  - ~~FORO-1C25~~ (E1-4): el camino "desde «Actividades»" pasa a 01d como FORO-1D30.
  - FORO-1C26: el siguiente fallo vuelve a avisar y una lectura correcta quita el aviso.
- **Avisos "…Inténtalo de nuevo." de publicar, guardar y borrar**
  - FORO-1C27: repetir el control que falló (el mismo botón, sin recargar la vista) hace la petición y, con éxito, no queda aviso de error.

**Hermanos de CLASES-03d (`features/tareas/hermanos-03d-01c.test.tsx`)**
- FORO-1C30: T-01 (`409` con la edición desmontada: un aviso y ninguna petición nueva).
- FORO-1C31: T-04 (volver antes de 30 s pide la tarea y nace con la versión del servidor).
- FORO-1C32 a FORO-1C34: T-02 y T-03 (temas y categorías al abrir: pendiente, fallida, llega con el valor, lectura previa en vuelo que no confirma, volver a abrir).
- FORO-1C35: T-05 (borrar con `404`: sale de la caché y "atrás" dice "Esa tarea ya no existe."; con `403`: queda vieja).
- FORO-1C36: los mismos FORO-1C30 a FORO-1C35 en el foro.

**PR-1A17:** `como-se-entrega-01a.test.tsx:262` lee `TEXTOS_FORMULARIO_RECURSO.sinTema` (lista cerrada) y la clave sale de `features/clases/data.ts`.

### 01d (frontend)

**Participar y replicar (`features/tareas/participar-01d.test.tsx`)**
- FORO-1D01: el alumno sin principal y abierto ve el formulario. Con tardías vencido, la nota de retraso. Cerrado, el texto de cerrado. Con principal, sin formulario. El admin, con la nota. El maestro, sin formulario de principal.
- FORO-1D02: publicar: aviso, `miParticipacion` y la lista con la respuesta, sin otra petición; invalidaciones; foco a la participación nueva; guarda con ref (dos clics → una petición).
- FORO-1D03: los `409` de la matriz: aviso con el texto del servidor, lo escrito se conserva y se piden `miParticipacion` y la lista.
- FORO-1D04: "Con retraso" según `conRetraso` (no se calcula en el cliente); fecha y hora visibles en cada participación. **(E1-1)** El aviso "quedará marcada con retraso" sale solo si `participarConRetraso`. Con un doble que lo manda en `false` y una fecha límite vencida con tardías, no sale; con `true` y la fecha a futuro, sí sale. El texto de cerrado sale solo de `puedeParticipar`.
- FORO-1D04b (E1-1, estática): los componentes y `lib.ts` del foro en `features/tareas` no comparan `fechaLimite` con la hora (`Date.now`, `new Date(`, `getTime(`) para decidir el cierre ni el retraso. La insignia de vencimiento usa `vencimientoDe` de `lib/vencimiento.ts`, que el caso admite por nombre.

**`VALIDACION` fuera de contrato, participación (`features/tareas/errores-participacion-01d.test.tsx`)**
- FORO-1D05: un campo no pintado (`foroId`).
- FORO-1D06: mensaje vacío o de solo espacios.
- FORO-1D07: prefijo con ruta (`texto.0: …`) → el `ErrorDeCampo` de "texto" sin la ruta.
- FORO-1D08: rechazo del servidor seguido de envío vacío → solo "Escribe tu participación".
- FORO-1D09: `ENTRADAS_FUERA_DE_CONTRATO`.
- En cada caso, un solo mensaje, lo escrito se conserva y el botón sale de la espera.

**Réplicas (`features/tareas/replicas-01d.test.tsx`)**
- FORO-1D10: FORO-1D05 a FORO-1D09 para el formulario de **réplica** (alumno y maestro), con "Escribe tu réplica".
- FORO-1D11: el control: "Ver réplicas (n)" / "Replicar" / "Ocultar réplicas", un solo botón que conserva el foco. Con 0 en la lista y réplicas que llegan al abrir el bloque, al plegar dice "Ver réplicas (n)" con lo visto (O-r1-2). El admin sin réplicas no ve control.
- FORO-1D12: publicar réplica (caché del bloque, conteo, campo vacío, foco al campo); maestro después de la fecha; `404 PARTICIPACION_NO_ENCONTRADA`.

**Borrar como admin (`features/tareas/borrar-participacion-01d.test.tsx`; E3-3)**
- FORO-1D35: "Borrar" solo con `puedeBorrar` (el admin) y nunca en una archivada. La confirmación en línea con sus textos (principal y réplica), con guarda con ref: dos clics, una petición.
- FORO-1D36: los errores de la matriz. "Esa participación ya no existe." se cumple solo: la lista se renueva y la fila sale.
- FORO-1D37: tras un `5xx`, repetir "Sí, borrar …" vuelve a pedir el borrado.
- FORO-1D38: el foco tras borrar (vecina, `h3`; nunca `<body>`) y el conteo de réplicas de la principal tras borrar una réplica.

**Frases de recuperación (`features/tareas/recuperar-participaciones-01d.test.tsx`)**
- **"Las participaciones cambiaron … Vuelve a abrir el foro …"**
  - FORO-1D20: abrir el foro desde "Foro" antes de 30 s.
  - FORO-1D21: desde "Actividades".
  - FORO-1D22: atrás y adelante.
  - FORO-1D23: pulsar "Foro" y volver al foro.
  - En cada caso se pide la primera página y el texto desaparece; "Ver más participaciones" no está mientras se ve el texto.
- **"Las réplicas cambiaron … Vuelve a abrirlas …"**
  - FORO-1D24: "Ocultar réplicas" y "Ver réplicas" vuelve a pedir la primera página (no la de la caché).
  - FORO-1D25: salir del foro y volver antes de 30 s, y abrir el bloque.
- **"No pudimos actualizar las participaciones. …"**
  - FORO-1D26: el siguiente fallo avisa otra vez; una lectura correcta lo quita.
- **"No pudimos publicar tu participación/réplica. Inténtalo de nuevo."**
  - FORO-1D27: repetir el botón publica (lo escrito seguía ahí).

**"Tu participación"**
- FORO-1D28: los estados de la columna derecha y su texto de fecha y hora.

**"Actividades" y categorías (`features/clases/actividades-foros-01d.test.tsx`; E1-4, E1-9)**
- FORO-1D29 (antes FORO-1C15):
  - `useTrabajo` y los temas piden `seccion=actividades&conForos=si`, con la misma clave de caché.
  - El foro sale con su insignia y enlaza a `foros/:id`.
  - "Crear foro" (`outline`) va junto a "Crear tarea" (única `primary`) y no sale en una archivada.
  - "Mover" de un foro: éxito, `TEMA_NO_ENCONTRADO`, `TAREA_MODIFICADA` en la edición abierta (sube la versión) y `PUBLICACION_NO_ENCONTRADA`. Son los avisos y el foco de hoy (§7.22).
- FORO-1D30 (antes FORO-1C25): "No pudimos actualizar el foro. …", con el camino de volver a abrirlo desde "Actividades" antes de 30 s.
- FORO-1D31: el editor de categorías dice "{n} actividades" / "1 actividad" (E1-9). El `409 CATEGORIA_CON_TAREAS` con el texto de foros avisa con el mensaje del servidor.
- **(E1-11) "Tu participación"**
  - FORO-1D32: "No pudimos cargar tu participación." en la primera carga.
  - FORO-1D33: "No pudimos actualizar tu participación. …". Con un caso por camino:
    - volver a abrir el foro desde "Foro" antes de 30 s pide de nuevo;
    - el siguiente fallo avisa otra vez;
    - una lectura correcta quita el aviso.

### 01e (frontend)

**Participantes y participante (`features/tareas/participantes-01e.test.tsx`)**
- FORO-1E01: la lista (conteo, tabla, "Ver participación", "Ver más alumnos" y su cursor).
- FORO-1E02: la participante para maestro (panel) y admin (lectura): sus participaciones con "En respuesta a", fecha y hora y "Con retraso"; las devoluciones de solo lectura.
- FORO-1E03: calificar con y sin rúbrica: invalidaciones de la matriz y avisos "publicada"/"actualizada".
- FORO-1E04: los `409` de §7.27 con los textos del foro.

**`VALIDACION` fuera de contrato, calificar un foro (`features/tareas/errores-calificar-foro-01e.test.tsx`)**
- FORO-1E05: un campo no pintado (`foroId`, o `puntajes` en un foro sin rúbrica).
- FORO-1E06: mensaje vacío o de solo espacios.
- FORO-1E07: prefijo con ruta (`puntajes.1.puntos: …`) → bajo el criterio 2.
- FORO-1E08: rechazo seguido de envío que la validación local rechaza.
- FORO-1E09: `ENTRADAS_FUERA_DE_CONTRATO` sobre la traducción de calificar del foro. Si es la misma función que la de la tarea, se dice cuál es y estas pruebas la llaman con las rutas del foro.

**Alumno, gradebook y exportación (`features/tareas/mi-calificacion-foro-01e.test.tsx` y `features/calificaciones/foro-01e.test.tsx`)**
- FORO-1E10: "Tu participación" con la calificación y su desglose, y "Comentarios de tu maestro" (solo si hay alguno).
- FORO-1E11: el gradebook pide `conTipo=si` y la celda de un foro enlaza a `../foros/:id/participantes/:alumnoId`; la de una tarea, como hoy; sin `tipo`, como tarea.
- FORO-1E12: "Mis calificaciones" enlaza un foro a `../foros/:id` (y en una clase anterior, sin enlace, como ADMIN S-04).
- FORO-1E13: el modal de cálculo cuenta el foro en su categoría.
- FORO-1E14: la exportación: el .xlsx (leído con `lib/lector-xlsx-de-prueba.ts`) trae la columna del foro con la calificación del alumno (cierra S-03 en el archivo).

**Frases de recuperación (`features/tareas/recuperar-participantes-01e.test.tsx`)**
- **"La lista de alumnos cambió … Vuelve a abrir Participantes …"** (E1-10)
  - FORO-1E20: "Ver participantes" desde el foro.
  - FORO-1E21: atrás y adelante.
  - FORO-1E22: ir a "Foro" y volver antes de 30 s.
- **"Las participaciones de este alumno cambiaron … Vuelve a abrir su participación …"**
  - FORO-1E23: "Ver participación" desde la lista.
  - FORO-1E24: atrás y adelante.
  - FORO-1E25: desde una celda del gradebook.
- **Los avisos "…Inténtalo de nuevo." de calificar**
  - FORO-1E26: repetir el botón.
- **(E1-10)** FORO-1E20 a FORO-1E22 usan el texto nuevo, "…Vuelve a abrir Participantes…", y el camino "Ver participantes".
- **(E1-11) "Los comentarios de tu maestro cambiaron … Vuelve a abrir el foro …" (alumno)**
  - FORO-1E27: abrir el foro desde "Foro" antes de 30 s.
  - FORO-1E28: desde "Actividades".
  - FORO-1E29: atrás y adelante.
  - En cada caso, la primera página de devoluciones se pide otra vez y el texto desaparece; "Ver más comentarios" no está mientras se ve el texto.
- **(E1-11) "Los comentarios de la devolución cambiaron … Vuelve a abrir su participación …" (maestro y admin)**
  - FORO-1E30: "Ver participación" desde "Participantes".
  - FORO-1E31: atrás y adelante.
  - FORO-1E32: desde una celda del gradebook.
- **(E1-11) "No pudimos actualizar la participación de este alumno. …"**
  - FORO-1E33: el siguiente fallo vuelve a avisar.
  - FORO-1E34: una lectura correcta (volver a abrirla antes de 30 s pide de nuevo) quita el aviso.
- **(E1-11) Devoluciones, "Ver más comentarios" que falla con `5xx`**
  - FORO-1E35: repetir el botón pide la página.

## Puntos de ataque para el Tester
1. **Una ruta de tarea que acepte un foro (o al revés).** Todas las rutas de `handlers/tareas/*`, `handlers/calificaciones.ts` y las descargas, con el id de un foro; las 16 del foro, con el de una tarea, un anuncio y un material. Sobre todo las que escriben antes de decidir (el descarte de `borrarTarea`, la fila perezosa de `entregar`, calificar y comentar).
2. **La regla tardía fuera de su función:** que ningún camino (principal, réplica, `accionesDelForo`, la interfaz) decida el cierre o el retraso por su cuenta. Mover la fecha o cambiar `aceptaTardias` entre leer y publicar.
3. **Concurrencia:**
   - principal contra principal del mismo alumno;
   - principal contra calificar (versión);
   - principal o réplica contra borrar el foro;
   - editar el foro (fecha o tardías) contra publicar;
   - recalificar contra principal.
4. **Riesgo y gradebook:** un foro vencido sin principal, uno calificado sin participar y uno con principal con retraso; un foro "Sin categoría" en una clase con categorías (no cuenta, como la tarea); el foro en la exportación por ventanas (100 actividades).
5. **Fugas:** `estadoPago`, correo o rol en cualquier respuesta del foro (también en `autor` y en `enRespuestaA`); `conRetraso` de otros para un alumno; el admin escribiendo (11, 16) o un maestro publicando una principal (9).
6. **Cursores:** de otro foro, de otra principal, una réplica como principal, el de "Actividades" con y sin foros, el de la lista de foros con un anuncio.
7. **Compatibilidad (DH-09):** `seccion=actividades` sin `conForos` nunca devuelve un foro, ni como cursor; `conForos` con otros valores, repetido o sin sección; sin `conTipo`, el gradebook es idéntico al de hoy.
8. **Frontend (01c a 01e):**
   - los `VALIDACION` fuera de contrato de los cinco formularios;
   - cada camino de cada frase de recuperación;
   - el control de réplicas (O-r1-2 como estado vecino: abrir con 0, recibir, plegar, recargar la lista);
   - el foco tras publicar, borrar o perder el control;
   - el `409 CLASE_ARCHIVADA` con la vista montada y desmontada;
   - los hermanos T-01 a T-05 en la tarea y en el foro.
9. **Migración:** el CHECK de título con los cuatro tipos; el índice único parcial con una réplica sin principal (`principal_id` de otro foro, que la FK admite y el código rechaza).
10. **Borrar participaciones (01a2, E3-3):**
    - quién borra: el maestro, el alumno autor, otro alumno, el restringido y el admin en otra clase;
    - la cascada de réplicas de varias personas;
    - la calificación conservada (gradebook, exportación, riesgo y desglose intactos);
    - la entrega devuelta a "sin participar" (PB-2) con el foro abierto y cerrado, y volver a publicar;
    - una réplica en vuelo contra el borrado de su principal (nunca `500`);
    - dos borrados simultáneos;
    - borrar contra calificar;
    - el id de una réplica de otro foro;
    - una clase archivada (`409` también para el admin).
11. **(Enmienda 7) Lo que trae `fd4a7ad`:**
    - **ADMIN-01:**
      - cada ruta del foro en una archivada, con su política, en el orden 403 → 409;
      - el borrado definitivo de una clase con foros: el conteo, la cascada y los objetos del planteamiento en la cola;
      - duplicar sin foros;
      - la baja y la reactivación de un alumno o un maestro con participaciones;
      - restaurar una clase y volver a escribir en el foro.
    - **CHORE-04:** el doble clic en cada control nuevo, cada guarda quitada y "Ver más" durante una recarga.
    - **CHORE-06:**
      - saltar con el historial entre foros, entre alumnos de un foro y entre el mismo alumno en dos foros, con algo abierto o a medio escribir;
      - un código con que `apiClient` redirige en cada `onError` y en cada recarga;
      - pulsar "Foro" con la lista en error, vieja o en vuelo;
      - "Ver más" que falla y la recarga que la recupera, en las listas de `features/clases` y de `features/tareas`.
    - **La traducción del foro:** `TAREA_NO_ENCONTRADA` en una vista del foro nunca dice "Esa tarea ya no existe.".

## Riesgos y desacuerdos
- **R-01. Frontend anterior con foros creados (DH-09 a).**
  - "Actividades" no los ve (opt-in), pero el gradebook, "Mis calificaciones" y la exportación de una pestaña vieja sí muestran la columna del foro.
  - Su enlace lleva a la vista de una tarea: "Esa tarea ya no existe.".
  - Se corrige al recargar la página. Fila DEPLOY: desplegar el backend y enseguida el frontend.
  - **(E1-25)** El frontend del foro se despliega completo, después de 01e. Con 01c o 01d solos, la celda de un foro en el gradebook enlazaría a la vista de una tarea, porque `conTipo` llega en 01e. Fila DEPLOY.
- **R-02. No volver atrás el backend después de crear foros.** Un backend anterior lee `publicaciones` sin filtrar por tipo en varios lugares (la lista sin `tipo`, el gradebook) y no conoce `foro`; puede responder `500` o mostrar el foro como tarea. Mismo criterio que R-09 de ADMIN-01. Fila DEPLOY.
- **R-03. Calendario.** El frontend del foro (01c a 01e) espera a que ADMIN-01 cierre sus ocho subentregas y se fusione (DH-10 a). Mientras, 01a queda hecha y sin desplegar. **(Enmienda 7) Sin objeto.**
- **R-04. Orden de las migraciones.** **(Enmienda 7) Sin objeto:** las de FORO se crean después de las de ADMIN-01. Queda la fila de DEPLOY (`migrate deploy`, nunca `migrate dev`, en `prod`). Las de FORO pueden quedar intercaladas con las de ADMIN por su marca de tiempo. Son independientes (§D-X) y `migrate deploy` aplica las pendientes. Se verifica en 01b con la suite desde cero. Fila DEPLOY: aplicar con `migrate deploy`, nunca con `migrate dev`, en `prod`.
- **R-05. Códigos reutilizados (S-08).** El frontend distingue el foro de la tarea por la vista, no por el código. Un cliente que solo mire el código vería `TAREA_NO_ENCONTRADA` en un foro. Aceptable: el único cliente es el nuestro.
- **R-06 (reescrito en E3-3). Moderación solo del admin** (con PB-1 a): un maestro que ve algo inapropiado tiene que pedírselo a administración. No queda registro de quién borró (S-E3-2). *Texto anterior:* **Sin moderación (DH-05 a).** Lo inapropiado en un foro solo se quita borrando el foro entero (el admin, con confirmación). Queda como pendiente con destino a una decisión del humano (A-10).
- **R-07. Lista de foros ordenada en memoria** (Acceso a datos). Con decenas de foros por clase no importa; se revisa si una clase llega a cientos.
- **R-08. Las listas cerradas de 01b a 01e no son definitivas.** Dependen del código de ADMIN-01 ya fusionado. Cada una la fija una Enmienda de arranque del arquitecto, antes de su ronda 0, con el grep de `AGENTS.md`, y el manager la revisa (§D-R0). **(Enmienda 7) Reemplazado:** las listas salen del grep sobre `fd4a7ad` (§E7.5). Lo que queda es que una subentrega anterior cambie algo fuera de lo previsto; lo cubre la comprobación de arranque (§E7.5.0) y R-E7-1 a R-E7-3.
- **Desacuerdos con ESSENTIALS:** ninguno. El plan confirma lo que ESSENTIALS marca como "Previsto" para FORO-01 (`publicaciones.tipo` `foro` con su fila en `tareas`, `participaciones_foro` con principal y réplicas, el trabajo diferido por actividad y que reutilice `tareas` y `entregas`).
- ~~**Desacuerdo con la letra de la regla del humano (DH-13).**~~ **(E1-12)** Se retira. "Una subentrega final, separada" era una frase del encargo del orquestador, no del humano. La instrucción literal ("deja para después de fusionar ADMIN-01 cualquier cambio en ellos") la cumplen las cuatro subentregas posteriores (DH-10).
- **(Enmienda 7)** R-09 y R-10 quedan sin objeto (no hay fusión) y se suman R-E7-1 a R-E7-6 (§E7.10).
- **R-09 (reescrito en E3-4). Commit de fusión en rojo (DH-14 b).** `<KF>` puede quedar con ADM-1A09 en rojo hasta el commit de 01b; es la excepción autorizada por el humano. Mientras tanto no se fusiona `feat/foro-01` en `main` (DH-13). *Texto anterior (DH-14 a, fusión sin commit durante toda 01b): ya no aplica.*
- **R-10 (E1-2). Orden de fusión (DH-13).** Si se rompe la regla y 01a llega antes a `main`, la rama de ADMIN-01 hereda el cruce (DH-13 b).
- **R-11 (E1-1).** Con DH-02 (c), "nunca cierra", el maestro no podría calificar a quien no participó. Es una consecuencia de que calificar consulte la misma regla. La DH lo dice.

## §D-R0. Qué se toca, qué no, y las pruebas existentes que cambian

**(Enmienda 7) Reemplazada por §E7.5**, escrita contra `fd4a7ad`: las listas "Se toca" y "No se toca", las listas cerradas, los C-n (C-1, C-2 y C-6 en 01a; C-1 bis, C-3 y C-7 en 01b; C-8 a C-14 en el frontend) y las vigiladas de cada subentrega. Lo de abajo queda como historial y como fuente de las vigiladas que §E7.5 cita por su id. Sin objeto, en particular, el paso 0 de 01b (la fusión) y la pregunta por la otra copia.

**Regla para todas las subentregas.**
- Se toca solo lo de la lista "Se toca" de la subentrega, más archivos nuevos de prueba y ayudas nuevas en `backend/test/` o junto a sus pruebas en `frontend/src/`. Una ayuda existente solo gana exportaciones; nunca cambia las que tiene.
- **No se toca** todo lo demás, en particular:
  - `infra/`, los `.env.example`, `AGENTS.md`, `CLAUDE.md`, `.claude/`;
  - `docs/` fuera de `docs/trabajo/FORO-01-actividad-tipo-foro/` (los documentos van al cierre, A-01 a A-10, salvo `DESIGN.md` en 01e);
  - `backend/src/middleware/**`, `adapters/auth/`, `adapters/notifier/`, `adapters/queue/`, `config/`, `workers/`;
  - `handlers/tareas/*`, `handlers/clases/*`, `handlers/archivos.ts`, `handlers/adjuntos.ts`, `handlers/respuestas-de-entrega.ts`;
  - `adapters/db/calificaciones.ts` y `exportacion-de-calificaciones.ts` (hasta 01b);
  - `shared/src/entregas.ts`, `shared/src/clases.ts`, `shared/src/dudas.ts`;
  - todo `*.ataque.test.ts` (solo el tester, en su ronda 0, con el C-n de la tabla);
  - toda prueba normal que no esté en la lista cerrada.
- Si una prueba normal fuera de la lista falla, o hace falta tocar un archivo fuera de "Se toca", el programador se detiene (**PARADA**) y lo reporta.
- **Suites por ronda (`AGENTS.md`).** En las rondas del programador y del tester se corre la suite del módulo más las pruebas que el plan nombra. La suite completa de cada paquete la corre el manager una vez, al cerrar la subentrega. Antes de cada suite, el orquestador pregunta al humano si la otra copia (ADMIN-01) está corriendo una (`AGENTS.md`, "Trabajo en paralelo"); un subagente sin esa respuesta se detiene y la pide.

### 01a1 (antes "01a"; base `e94ee59`; E3-2)

**(Enmienda 7) Reemplazada por §E7.5.1.** C-1, C-2 y C-6 están reescritos contra `fd4a7ad`: los títulos y las cifras de ADMIN-01, `"conForos"` pasa a C-7, y el "Se toca" pierde `recursos.ts`, `temas.ts`, `categorias.ts` y `listarTrabajo`. Las vigiladas de abajo siguen valiendo, citadas por su id.

Todo lo de esta sección vale para 01a1 sin cambio. Los C-1 y C-2 que el tester ya aplicó en la ronda 0 detenida se revisan contra `e94ee59`: C-1 queda con las 26 entradas de 01a1, y la entrada de la ruta 17 entra en 01a2 (C-1 bis).
- **Se toca:**
  - `shared/src/foros.ts` (nuevo), `shared/src/tareas.ts`, `shared/src/index.ts`, `shared/src/recursos.ts` (solo la línea 22, E1-4).
  - `backend/prisma/schema.prisma` y dos carpetas nuevas en `backend/prisma/migrations/` (`…_foro_01_tipo_foro`, `…_foro_01_participaciones`).
  - `backend/src/core/actividades.ts` (nuevo), `core/foros/participacion.ts` (nuevo), `core/tareas/tareas.ts`, `core/calificaciones/calificar.ts`.
  - `backend/src/adapters/db/actividades.ts` (nuevo), `adapters/db/foros.ts` (nuevo), `adapters/db/tareas.ts`, `temas.ts`, `entregas.ts`, `publicaciones.ts` (solo `listarPublicaciones`, §D-3.3), `categorias.ts` (solo el texto del `409`, E1-9), `index.ts`.
  - `backend/src/handlers/foros.ts` (nuevo), `backend/src/app.ts`.
- **Lista cerrada de pruebas normales que se pueden cambiar: ninguna.** El grep del plan, sobre `backend/test`, `backend/src/**/*.test.ts` y `frontend/src` en `e94ee59`:
  1. **Llamadas a las funciones cuya firma cambia:** `leerTarea`, `crearTarea`, `editarTarea`, `borrarTarea`, `listarTrabajo`, `listarTemasDeLaSeccion`, `listarEntregas`, `leerEntregaDeAlumno`, `listarHiloPrivado`, `calificarEntrega` y las funciones de `core/` de §D-2.4. Todas solo ganan un parámetro opcional con el valor de hoy; las llamadas existentes, por ejemplo `calificaciones-concurrencia.integracion:8`, `entregas-lecturas.integracion:8`, `entregas.integracion:18` y `entregas-concurrencia.integracion:8`, no cambian.
  2. **Dobles de tipos que ganan o ensanchan campos:** `ElementoDeTrabajoDb.tipo`, `elementoDeTrabajoSchema.tipo`, `SeccionDeTemas` y `trabajoQuerySchema.seccion`. Ninguna prueba los enumera; tampoco hay una que recorra los valores de `tipo_publicacion`.
  3. **Aserciones sobre textos que cambian:** ninguna, porque los textos de hoy no cambian (§D-2.4).
- **`*.ataque` que el diseño cambia (C-n del tester en la ronda 0):**
  - **C-1** `backend/test/sesiones-y-cadena.ataque.test.ts:553`: la lista suma las 26 entradas de las 16 rutas (10 `GET` + 10 `HEAD` + 3 `POST` de foros y participaciones y réplicas + `PUT` del foro y de la calificación + `DELETE` del foro), con el comentario "FORO-01a, C-1 (§D-R0; §D-3.1)". Ninguna crea cuentas ni cambia roles, y ninguna es pública. El título suma "FORO-01a".
  - **C-2** `backend/test/lecturas-fx-r1.ataque.test.ts:805-825`: suma `"adapters/db/foros.ts:<n>"` con el número de `instantaneaUnica: true` del texto de `foros.ts` (cinco previstos: `listarForos`, `leerMiParticipacion`, `listarParticipaciones`, `listarReplicas` y `listarParticipacionesDeAlumno`). El programador declara `<n>` y el tester lo pone.
  - **C-6 (E6-1, P-01a1-1)** `frontend/src/lib/errores-ch3-r2.ataque.test.ts:231-254` (T-01 de CHORE-03, `INVENTARIO`): suma `"conForos"`, `"foroId"` y `"participacionId"`, con el comentario "FORO-01a1, C-6 (§D-R0; §D-3.2 y E1-4): los prefijos de `shared/src/foros.ts` y `conForos` de `shared/src/tareas.ts`; quitarRutaDelMensaje deja texto legible en los tres mensajes". El precedente es C-26 de CLASES-03b. No cambia nada más del caso: ni la expresión, ni los demás nombres, ni la condición del tercer prefijo, ni el caso del backend (`:268-276`).
    - **Comprobación de legibilidad** (como el Arbitraje 2 de CLASES-03a; la hace el tester en la ronda 0 y la cita en su reporte): `quitarRutaDelMensaje` aplicado a las rutas dobles reales de los tres deja, en todos los casos, el texto sin ruta y con caracteres visibles.
      - `"conForos: conForos: no es válido"` → `"no es válido"`;
      - `"foroId: foroId: debe ser un identificador válido"` → `"debe ser un identificador válido"`;
      - `"participacionId: participacionId: debe ser un identificador válido"` → `"debe ser un identificador válido"`;
      - la ruta doble de un cuerpo, por ejemplo `"texto: texto: …"`, no aplica: los mensajes de cuerpo del foro no llevan prefijo (E6-2).
    - Ningún resto empieza con otro nombre en camelCase seguido de dos puntos: la condición `conTercero` sigue en `[]`.
  - **C-6 se corre en el frontend:** `cd frontend; npx vitest run src/lib/errores-ch3-r2.ataque.test.ts` antes del programador (verde), y después de él, con los literales nuevos, verde con C-6.
- **Vigiladas (si cambian, PARADA):**
  - `hilo-01c-r1.ataque.test.ts:718-733`: `FOR KEY SHARE` una vez en `entregas.ts`, solo en `entregas.ts` y `referencias.ts`, y 4 `instantaneaUnica: true` en el texto de `entregas.ts`. Pasar a `export const` no las cambia.
  - `entregas-01b-r1.ataque.test.ts:1005-1032`: `bloquearTareaParaEntregar`, con `entregar` y `anularEntrega` usándola; sin `Unsafe` ni consultas en ciclos.
  - `calificaciones-estatico.test.ts:49-66`: un `FOR SHARE` en `entregas.ts`, dentro de `bloquearTareaParaCalificar`, que sigue siendo la primera sentencia de `calificarEntrega`. `esActividadDeTipo` va después.
  - `calificaciones-estatico.test.ts:87-127` y las equivalentes de `calificaciones-lecturas-estatico.test.ts:110-…` y `exportacion-calificaciones-estatico.test.ts:120-…`: ningún comentario de los archivos que listan nombra sus palabras.
  - `lecturas-fx-r1.ataque.test.ts:794-804`: `tareas.ts` con exactamente 2 líneas de código con `instantaneaUnica: true` y ningún comentario que la nombre.
  - `temas-01a-r1.ataque.test.ts:985-1031`: `FOR KEY SHARE` solo en dos archivos; los handlers de `handlers/tareas/` son exactamente cinco (`foros.ts` vive fuera); ningún handler de tareas usa SQL ni roles.
  - `bloqueo-usuario.integracion.test.ts:677-723` (E6): la lista de archivos de `adapters/db` con `$queryRaw`/`$executeRaw` no cambia, porque `foros.ts` y `actividades.ts` no usan SQL crudo.
  - `arquitectura-cuentas-r1.ataque.test.ts:69-74` y `temas-01a-r3.ataque.test.ts:426-428`: ningún `$queryRawUnsafe` nuevo.
  - `muro-c-r1.ataque.test.ts:633-661`: `handlers/foros.ts` no nombra las colas de avisos de esa lista.
  - `lecturas-fx-r2.ataque.test.ts:967-…`: ningún borrado nuevo en `backend/src` (el foro se borra con `borrarTarea`).
  - Las pruebas de migración que aplican "hasta la suya" (`migracion-*.integracion`, `calificaciones-migracion.integracion`): no aplican las de FORO y no cambian.
  - `muro.integracion.test.ts:201-219` y `migracion-tareas.integracion.test.ts:73-79`: el CHECK de título sigue rechazando lo que rechazaba.
  - **(E1-18)** `lecturas-fx-r2.ataque.test.ts:1072-1108`: lee el cuerpo de `listarPublicaciones`, que 01a cambia. La comprobación inalcanzable que lanza no es una escritura, así que debe seguir en verde.
  - **(E1-9)** `categorias.integracion.test.ts:206-225`, `categorias-01a-r1.ataque.test.ts:399-418` y `referencias-01b-r1.ataque.test.ts:236`: el texto con solo tareas no cambia. `temas-01a-r1.ataque.test.ts:1033-…`: la consulta nueva de `categorias.ts` no vive en un ciclo.
  - **(E1-4)** Las pruebas del backend que piden `GET …/trabajo` o `GET …/temas` con `seccion=actividades`: la respuesta no cambia, porque sin `conForos` no hay foros.
  - **(E1-4)** `backend/test/esquemas-tareas.test.ts:432-457` (PR-1B06): usa `trabajoQuerySchema.safeParse(…).data` con `toMatchObject` y `.tema`. Con la tubería, la salida conserva `tema`, `cursor` y `limite`; si alguna aserción falla, PARADA. También `frontend/src/lib/errores-de-api.test.ts:463-470` (§D-3.2).
- **Frontend:** no cambia ningún archivo de producción. Su suite y su `build` corren igual (regla de `shared/`). Si alguna prueba del frontend falla por los tipos nuevos de `shared/`, PARADA. **(E6-1)** La única excepción es C-6 (arriba).
  - **(E6-3) Vigiladas del frontend que leen `shared/src`, por grep sobre `frontend/src` en `e94ee59`:** solo `src/lib/errores-ch3-r2.ataque.test.ts` lo hace con `import.meta.glob`, y la cubre C-6.
  - `src/lib/errores-de-api.test.ts:463-470` (CH3-A25) importa `trabajoQuerySchema` y ya estaba vigilada (E1-4).
  - Ninguna otra prueba del frontend importa los esquemas que 01a1 cambia (`elementoDeTrabajoSchema`, `temasQuerySchema`, `SECCIONES_DE_TEMAS`, `idOpcionalSchema`) más que como tipos.

### 01a2 (base `<K1a1>`, el commit de 01a1; E3-3)
**(Enmienda 7) Reemplazada por §E7.5.2** (va en 01b). La lista de llamadas a `traducirErrorPrisma(` suma `gestion-de-usuarios.ts:253`, de ADMIN-01, sin la opción nueva.
- **Arranca** después de `<K1a1>`. PB-1 (a) y PB-2 (a) ya están resueltas (E4-1), así que no hace falta otra enmienda.
- **Se toca:**
  - `shared/src/foros.ts` (`puedeBorrar` en `participacionSchema` y `replicaSchema`).
  - `backend/src/core/autoria.ts` (solo la función nueva `puedeBorrarParticipacion`; `puedeBorrar` y las demás no cambian).
  - `backend/src/core/foros/participacion.ts` (`efectoDeBorrarPrincipal`).
  - `backend/src/adapters/db/foros.ts` (`borrarParticipacion`, `puedeBorrar` en las listas y el `catch` de `publicarReplica` con `alFaltarReferencia`).
  - `backend/src/adapters/db/errores.ts` (`alFaltarReferencia?: () => AppError` en `traducirErrorPrisma`, para `P2003`; sin la opción, lo de hoy).
  - `backend/src/adapters/db/index.ts` (exporta `borrarParticipacion`; es el cruce de §D-X).
  - `backend/src/handlers/foros.ts` (la ruta 17).
- **Pruebas nuevas:** `backend/src/core/foros/borrado.test.ts` y `backend/test/foros-borrar.integracion.test.ts`.
- **Lista cerrada de pruebas normales:**
  - `backend/test/foros-autorizacion.integracion.test.ts`: FORO-1A49 y FORO-1A50 suman la ruta 17 y `puedeBorrar`.
  - `backend/test/foros-estatico.test.ts`: FORO-1A51 suma la ruta 17 con su `protegido`. FORO-1A52 admite el `participacionForo.deleteMany` de `borrarParticipacion`, el único borrado del archivo, fuera de ciclos.
  - `backend/src/adapters/db/errores.test.ts`: los casos de `alFaltarReferencia`. Los de hoy no cambian.
  - Grep del plan: `traducirErrorPrisma(` se llama en `clases.ts:98`, `inscripciones.ts:231`, `maestros-de-clase.ts:128` y `usuarios.ts:74,176,250`, siempre sin la opción nueva, así que no cambian. Ninguna prueba llama a `puedeBorrar` con datos de un foro.
- **C-n:**
  - **C-1 bis:** `sesiones-y-cadena.ataque.test.ts:553` suma `DELETE /api/clases/:claseId/foros/:foroId/participaciones/:participacionId`, con el comentario "FORO-01a2, C-1 bis".
  - **C-3:** `lecturas-fx-r2.ataque.test.ts:967-…` suma el borrado de `participacionForo` (`deleteMany` de Prisma en `adapters/db/foros.ts`), sin `DELETE FROM` ni `TRUNCATE` crudos.
- **Vigiladas:**
  - `core/autoria.test.ts` (`puedeBorrar` no cambia).
  - `muro-*`, `dudas-*` y `recursos-*`, que usan `puedeBorrar`.
  - Las de 01a1.
  - `bloqueo-usuario.integracion.test.ts` E6: `foros.ts` sigue sin SQL crudo, porque los bloqueos vienen de `entregas.ts`.
  - **(E6-3)** `frontend/src/lib/errores-ch3-r2.ataque.test.ts:257-276`: 01a2 no escribe ningún literal nuevo `"<nombre>: …"` en `shared/src` (E6-2). Los textos de `core/` del borrado no llevan prefijo. Si cambia, PARADA.
- **Cruce con ADMIN-01, nuevo (E3-3):** `lecturas-fx-r2.ataque.test.ts:967` también lo cambia ADMIN-01b (su C-4). En la fusión de 01b, la lista queda como la unión de las dos ramas (lo resuelve el tester, regla de §D-R0 01b).

### 01b (base: el commit de fusión del humano `<KF>`; E3-4)
**(Enmienda 7) Toda esta subsección queda sin objeto**: no hay `<KF>`, y la 01b nueva tiene base en el commit de 01a (§E7.5.2).
- **Paso 0: el commit de fusión del humano (DH-14 b; reescrito en E3-4).** Solo después de que ADMIN-01 esté fusionado en `main` (DH-13) y de que estén cerrados `<K1a1>` y `<K1a2>`.
  1. **El orquestador da al humano los comandos:** `git fetch` y `git merge main` en `feat/foro-01`, en la copia B.
  2. **Sin conflictos,** Git crea el commit de fusión y pasa al punto 6.
  3. **Con conflictos, Git se detiene sin commit. Quién los resuelve — decidido por el humano (E5-5), según la recomendación de E3-4:**
     - el **programador** resuelve los archivos de producción y las pruebas normales, y el **tester** los `*.ataque` (el programador nunca modifica una `*.ataque`, `AGENTS.md`);
     - los dos siguen **solo** las reglas del punto 4, en el árbol de trabajo;
     - después, el manager revisa la resolución (punto 5) y el humano hace `git add` y `git commit`, que cierra la fusión.
     - ~~*Alternativa:* el humano resuelve solo, con las mismas reglas, y el manager revisa después el commit (punto 6).~~ El humano no la eligió (E5-5). El punto 6 cubre igual ese caso, si alguna vez hiciera falta.
  4. **Reglas de la resolución:**
     - `shared/src/index.ts` y `backend/src/adapters/db/index.ts`: conservar los dos bloques.
     - `backend/prisma/schema.prisma`: conservar las dos partes; `prisma format` y `prisma validate`.
     - `backend/src/adapters/db/publicaciones.ts`: conservar los dos tramos.
     - `backend/test/sesiones-y-cadena.ataque.test.ts`, `backend/test/lecturas-fx-r1.ataque.test.ts` y `backend/test/lecturas-fx-r2.ataque.test.ts` (E3-3): la unión ordenada de las listas y los comentarios de las dos ramas. Las resuelve el tester. Así C-3 y C-4 de 01b (y la parte de C-3 de 01a2) quedan hechos en la fusión.
     - `docs/ESTADO.md` (E1-22, N-08): lo concilia el orquestador, como dice `AGENTS.md`, "Trabajo en paralelo", conservando las entradas de los dos encargos.
     - `docs/trabajo/ADMIN-01-…` y `docs/trabajo/FORO-01-…`: no chocan, son carpetas distintas.
     - Cualquier otro conflicto: **PARADA**.
  5. **Mientras la fusión espera su commit** (solo el tiempo de la resolución):
     - nadie ejecuta `git merge --abort`, `git stash`, `git restore`, `git checkout -- <ruta>`, `git reset` ni `git clean` en la copia B;
     - ningún agente hace `git commit` ni `git merge --continue`;
     - el manager revisa la resolución hunk por hunk en los archivos de cruce (los seis de §D-X y `lecturas-fx-r2.ataque`), con `git diff` del árbol de trabajo.
  6. **Verificación del commit de fusión `<KF>`** (manager, después del commit; con la alternativa del punto 3, es la única revisión):
     - `git diff <KF>^2 <KF> --stat` (contra la punta de `main`) muestra solo archivos de las listas "Se toca" de 01a1 y 01a2, más sus pruebas nuevas y ayudas nuevas, que la regla general de §D-R0 permite (E5-2, N-15).
     - **Siempre (E5-2, N-15):** `git show --remerge-diff <KF> -- shared/src/index.ts backend/prisma/schema.prisma backend/src/adapters/db/index.ts backend/src/adapters/db/publicaciones.ts backend/test/sesiones-y-cadena.ataque.test.ts backend/test/lecturas-fx-r1.ataque.test.ts backend/test/lecturas-fx-r2.ataque.test.ts`.
       - El manager revisa hunk por hunk que la resolución de los siete archivos de cruce conserve lo de las dos ramas.
       - Si `--remerge-diff` no está en la versión de Git de la copia B, usa `git diff <KF>^1 <KF> -- <archivo>` y `git diff <KF>^2 <KF> -- <archivo>` por archivo.
       - Esto detecta un archivo de cruce que perdió lo de ADMIN-01 aunque esté en el "Se toca" de FORO.
     - `git diff <KF>^1 <KF> --name-only` (contra `<K1a2>`) muestra solo archivos de `git diff --name-only <K1a2>...<KF>^2` (lo que cambió `main` desde la base de la fusión).
     - En los dos, se exceptúan `docs/trabajo/FORO-01-…` y `docs/ESTADO.md` (E3-6, el detalle del manager), que `AGENTS.md` deja fuera de "No se toca".
     - El orquestador anota `<KF>` en `aprobacion.md`. Puede quedar en rojo (ADM-1A09, las rutas del foro fuera de su tabla) hasta el commit de 01b: es la excepción que autorizó el humano.
- **Base de "No se toca" de 01b (E3-4):** `<KF>`. La verificación de la subentrega es `git diff <KF> --stat`: solo archivos del "Se toca" de 01b, salvo `docs/trabajo/FORO-01-…` y `docs/ESTADO.md` (E3-6). Las condiciones de la fusión abierta de E2-2 (`MERGE_HEAD` y prohibiciones de git durante toda 01b) **ya no aplican** y salen del plan.
- **Enmienda de arranque de 01b (arquitecto, sobre la base fusionada):** fija el archivo y la línea de ADM-1A09 y la forma exacta de `enClaseArchivada`; repite el grep de la lista cerrada (`columnaParaResponder`, los esquemas de `shared/src/calificaciones.ts` que ganan campos, las pruebas que leen `handlers/calificaciones.ts` en crudo: `calificaciones-lecturas-estatico:77-87`, `exportacion-calificaciones-estatico:98-103`, `calificaciones-estatico:36-47`); y comprueba el conteo de borrado de ADMIN (FORO-1B, última viñeta).
- **Se toca (previsto):** `shared/src/calificaciones.ts`; `backend/src/adapters/db/calificaciones.ts`; `backend/src/handlers/calificaciones.ts`, `handlers/foros.ts`, `handlers/README.md`; `backend/src/adapters/README.md`; el archivo de ADM-1A09.
- **Lista cerrada (prevista):**
  - El archivo de ADM-1A09: su tabla suma las 17 rutas con su política de §D-7 (E3-3).
  - Las pruebas estáticas que leen el `protegido({…})` de `handlers/calificaciones.ts`, solo si el cambio de `columnaParaResponder` mueve sus líneas. No cambian sus regex: `conTipo` no toca el `protegido`.
- **C-n:** C-3 y C-4 (arriba, en la fusión); C-5 `sesiones-y-cadena.ataque` si la Enmienda de arranque encuentra que ADMIN dejó un comentario por ruta con su política.
  - **C-7 (E6-1):** `frontend/src/lib/errores-ch3-r2.ataque.test.ts` (`INVENTARIO`) suma `"conTipo"`, por el `"conTipo: no es válido"` de `gradebookQuerySchema` y `misCalificacionesQuerySchema` (§D-6), con la misma comprobación de legibilidad: `"conTipo: conTipo: no es válido"` → `"no es válido"`.
  - ADMIN-01 tiene esta prueba como vigilada, sin cambio (su §D-R0: "ningún literal nuevo en `shared/src`"). Si la fusión la trae cambiada, la unión del `INVENTARIO` la resuelve el tester, con la regla de las `*.ataque` de §D-R0 01b, punto 4.
  - 01b toca `shared/`, así que corre la suite del frontend con C-7 aplicado.
- **Vigiladas:** las de 01a, más CAL-1B08 (`calificaciones-lecturas-estatico.test.ts`: 2 `instantaneaUnica` en `calificaciones.ts`, sin escrituras, tres consultas crudas).

**Condiciones de toda Enmienda de arranque (01b a 01e; E1-23, N-10):** **(Enmienda 7)** Sin Enmiendas de arranque: las reemplaza la comprobación de arranque (§E7.5.0). Sigue valiendo que, si "Se toca" crece fuera de lo previsto, hace falta la aprobación escrita del humano.
- Antes de cada una, el orquestador guarda la copia de `plan.md` y su SHA-256. El manager la verifica con `git diff --no-index` contra esa copia.
- Si la lista "Se toca" crece fuera de lo previsto en §D-8 y en "Cambios por capa", o alcanza algo de "No se toca", hace falta la aprobación escrita del humano (carril sensible) antes de la ronda 0.

### 01c, 01d y 01e (frontend; base: el commit de la subentrega anterior)
**(Enmienda 7) Reemplazada por §E7.5.3 a §E7.5.6**, con las listas hechas por grep sobre `fd4a7ad`. De la "lista cerrada mínima" de abajo:
- `secciones-03c1` y PR-1A17 siguen, en 01c2 y 01c1. **(Enmienda 9)** Las dos van en 01c1 (§E8.3).
- La de categorías es `categorias-view.test.tsx` y dos `*.ataque` (01d).
- Las URL del gradebook son las de `calificaciones/lib.test.ts:146-164` (01e).
- `gradebook-01d.test.tsx` y `mis-calificaciones-01d.test.tsx` comparan el `pathname` y no cambian.
- Las listas de códigos de `features/tareas/errores-ch3*` no cambian: el foro tiene su propia traducción.
- **Enmienda de arranque de cada una (arquitecto, sobre la base con ADMIN-01 fusionado):** la lista "Se toca" definitiva (§D-8, "Cambios por capa") y la lista cerrada por grep, con las tres búsquedas de `AGENTS.md`:
  1. **Llamadas** a cada función o gancho cuya firma cambia: `FormularioTarea`, `AccionesDeLaTarea`, `PanelDeCalificacion`, `TablaDeEntregas`, `FilaDeEntrega`, `useTrabajo`, `useTemasDeLaSeccion` y las funciones de enlace de `features/calificaciones/lib.ts`.
  2. **Dobles** de los tipos que ganan campos: `ElementoDeTrabajo`, las columnas del gradebook y `SECCIONES_DE_LA_CLASE`.
  3. **Aserciones** sobre textos, URLs y listas que cambian: las URL completas con `seccion=actividades`, que con E1-4 ganan `&conForos=si`; las 17 pruebas del grep de este plan, por ejemplo `features/clases/contenido-03c2.test.tsx`, `recursos-*-03d*.test.tsx`, `ordenar-03c2-r*.ataque.test.tsx` y `app/invalidaciones-03c2-r1.ataque.test.tsx`, que se separan en normales de la lista y `*.ataque` de los C-n; `secciones-03c1.test.tsx:153-160` (CL3-C01, seis secciones y "sin «Foro»"); las listas de códigos de `features/tareas/errores-ch3.test.ts` y su `*.ataque` (C-n); las URL del gradebook y de "Mis calificaciones" (`gradebook-01d.test.tsx`, `mis-calificaciones-01d.test.tsx`, que suman `conTipo=si`); y el contador `enEspera=` de `styles/clases-r1.ataque.test.ts` (V-06, C-n con la cifra de cada subentrega).
- **Lista cerrada mínima ya conocida en `e94ee59`:**
  - **01c:** `features/clases/secciones-03c1.test.tsx:153-160` (siete secciones, "Foro" tercera) y `features/tareas/como-se-entrega-01a.test.tsx:262` (PR-1A17).
  - **01d (E1-4, E1-9):** de las 17 pruebas del grep de `"actividades"`, solo las que fijan la URL completa de `/trabajo` o `/temas`; las que eligen el doble por `searchParams.get("seccion")` o usan `claveTemasDeLaSeccion(…, "actividades")` no cambian. Además, las que fijan "N tareas" en el editor de categorías (`features/clases/categorias-view.test.tsx` y las de `editor-de-categorias`, según el grep).
  - **01e:** las aserciones de URL de `features/calificaciones/gradebook-01d.test.tsx` y `mis-calificaciones-01d.test.tsx` (con `conTipo=si`) y `features/calificaciones/lib.test.ts:196-197` (las funciones de enlace, si cambian de firma).
- **Vigiladas:** las pruebas de `HiloPrivado`, `PanelDeCalificacion` y `DetalleTareaView`, que con `tipo` ausente pintan lo de hoy; las de Dudas, que no se tocan (DH-11 a); `lib/estatico-ch3-r1.ataque.test.ts` (toda traducción nueva pasa por el envoltorio del módulo); y `lib/errores-de-api-estatico.test.ts` (CH3-C13: los formularios nuevos con `reset()` tras la guarda y la ref antes de la guarda de `isPending`).

## Documentos al cierre (los aplica el orquestador; el manager los verifica)
- **A-01 · ESSENTIALS:**
  - "Tablas": `participaciones_foro` pasa de "Previsto" a la lista, y el `foro` de `publicaciones.tipo` se documenta.
  - "Restricciones clave": una principal por (`foro_id`, `autor_id`), con el índice único parcial; principal y réplica en una tabla; el CHECK de título con `foro`.
  - **(E3-7)** "Reglas de negocio", viñeta "Foro" y "Autoría": el admin borra participaciones y réplicas, con la cascada de réplicas. La calificación se conserva y, con PB-2 (a), una principal sin calificación borrada devuelve la entrega a "sin participar". Nadie edita y el alumno no borra lo suyo (la excepción a la regla general de autoría, `puedeBorrarParticipacion`). Lo mismo en el PRD (RF-67, RN-07), en A-02.
  - "Reglas de negocio", viñeta "Foro": queda **decidido**, con DH-01 a DH-08, la función `reglaDeParticipacion` y su valor por omisión pendiente con el cliente. **(E1-26)** También que calificar a quien no participó (P-03 c′) en un foro usa la misma regla.
  - "Interfaz": siete secciones, sin "Hasta FORO-01 son seis".
  - "Trabajos diferidos": "uno por actividad", ya vigente.
- **A-02 · PRD:**
  - RF-66 a RF-68 con lo decidido: DH-03 a DH-07 y la regla tardía con su valor por omisión.
  - RN-08, viñeta "Foro": la marca y el cierre vigentes, y lo que queda pendiente con el cliente. **(E1-26)** RN-05: P-03 c′ en un foro sigue `reglaDeParticipacion`.
  - §6: las vistas del foro.
- **A-03 · ARCHITECTURE.md:** §7 (las 17 rutas, E3-3, y los dos parámetros opt-in) y §14 (el modelo).
- **A-04 · CLAUDE.md, tabla de módulos:** **(Enmienda 8)** Además, en "Ubicaciones compartidas", la entrada de `services/trabajoService.ts` suma las claves y las consultas del foro (`clavePrefijoDeForos`, `claveListaDeForos`, `claveForo`, `consultaForo` y las de participaciones, réplicas, participantes y devoluciones, §D-8).
  - `clases` suma "la sección Foro (lista de foros)".
  - `tareas` suma "foro: crear y editar con el formulario de la tarea, detalle con participaciones y réplicas, participaciones de un foro y la de un alumno con el panel de calificación".
  - `calificaciones`: los enlaces por tipo.
- **A-05 · `backend/src/adapters/README.md` y `handlers/README.md`:** en 01b, dentro de la subentrega.
- **A-06 · DESIGN.md:** en 01e. §7.32 "Foro (propuesta (FORO-01c/d/e))": la lista, el detalle, las participaciones, el control de réplicas y las vistas del maestro. La insignia "Foro" en §7.8 y §7.22. "Siete" en §7.3 y §7.16. **(Enmienda 7)** El patrón va en **§7.34**, porque §7.32 y §7.33 son de ADMIN-01. Además, §7.10 suma a la lista de los que lo implementan la lista de foros (el patrón de Dudas) y las listas del foro de `features/tareas` (el de Entregas), y §7.14, "Lo abierto es de su clase", nombra el foro, la participación y el participante.
- **A-07 · ESTADO §3:**
  - **Se cierran:** S-03 (fila 470), la fila 331 (hermanos de 03d) y la 332 (PR-1A17).
  - **Se actualizan:** O-3 (quitar "probablemente FORO-01") y O-r1-2 (solo el carril trivial).
  - **(Enmienda 7) Se cierra:** la fila "CHORE-06a (los 'sin caso' de CH6-A14)", por FORO-1C40 y FORO-1E40.
  - **(Enmienda 7) Se actualiza:** la fila de ADMIN-01d1 y 01d2 ("revisar en FORO-01"). Tarea, foro y calificar quedan hechos (FORO-1C41 y FORO-1E41); queda solo la ruta 20 (recurso), con destino al próximo encargo que toque los ganchos de recursos de `features/clases`.
- **A-08 · ESTADO §3, filas nuevas:**
  - NOTIFICACIONES: el foro en `TAREA_CREADA` y `RECORDATORIO_24H` (destinatarios: sin `fecha_entrega`), y los avisos candidatos del foro (P-11).
  - DEPLOY: R-01, R-02 y R-04.
  - ~~**DEPLOY:** la moderación del foro (DH-05, R-06; E1-14), que se revisa en ese plan, antes de abrir a usuarios reales.~~ **(E3-7; E4-2)** Ya no aplica igual: el humano decidió la moderación (el admin borra; PB-1 a). La fila nueva, con destino **DEPLOY**, revisa antes de abrir a usuarios reales dos cosas: si los maestros también deben borrar y si hace falta un registro de quién borró (S-E3-2).
  - **Decisión del humano:** la regla tardía cuando el cliente responda (DH-02).
  - **DEPLOY:** R-01 con E1-25 (el frontend del foro se despliega completo, después de 01e).
  - **(Enmienda 7) Retiro de compatibilidad e higiene de pruebas** (antes de DEPLOY, hoja de ruta del 2026-11-11): retirar los parámetros opt-in del foro (`conForos` y `conTipo`) y la exclusión de `foro` en `listarPublicaciones` sin `tipo`, junto con la compatibilidad de CLASES-02, CLASES-03 y ADMIN-01 (R-E7-4).
- **A-11 (E1-2) · `aprobacion.md`:** **(Enmienda 7) Sin objeto** para DH-13 y DH-14 (§E7.0); el orquestador registra las respuestas a DH-15 a DH-18. **(Enmienda 8)** *Texto anterior, ya sin objeto:* "el orden de fusión (DH-13) y la forma de la fusión de 01b (DH-14), cuando el humano los decida."
- **A-09 · ESTADO §2b punto 6:** cerrado, con el resumen.
- **A-10 · ESTADO:** los conteos finales de pruebas (de la corrida del manager).

## Comprobación humana (máximo 7 puntos, 10 minutos, al final de 01e)
1. La sección "Foro" en tercera posición y el indicador del control segmentado a 360 px y en escritorio (tres roles).
2. El formulario de "Nuevo foro": rótulos, "Planteamiento" y la ausencia de "Cómo se entrega".
3. El detalle del foro como alumno: publicar su participación y replicar, con el control de réplicas.
4. Como maestro: la fecha y hora de cada participación y la marca "Con retraso".
5. Desde una celda del gradebook, calificar una participación con rúbrica y volver.
6. Como alumno: la calificación y el comentario de la devolución en "Tu participación".
7. En una clase archivada (con ADMIN-01): el foro sin controles de escritura.

Lo demás queda como "no verificada por decisión del humano, cubierta por pruebas automáticas".

## Pasos de implementación

**(Enmienda 7) Reemplazados por §E7.11.** Lo de abajo queda como historial (en particular, el paso 11, la fusión, queda sin objeto).

### 01a1 (antes "01a"; antes de fusionar ADMIN-01)
1. `shared/src/foros.ts` y los cambios de `tareas.ts` e `index.ts` (§D-3.2). `npm run build` de `shared`.
2. `core/actividades.ts` y los parámetros `actividad` de `core/tareas/tareas.ts` y `core/calificaciones/calificar.ts` (§D-2.4), con `actividades.test.ts` (FORO-1A07). `lint` y `test` de `core`.
3. `core/foros/participacion.ts` con `participacion.test.ts` (FORO-1A01 a FORO-1A06).
4. `schema.prisma`: solo el valor `foro` del enum. `npx prisma migrate dev --create-only --name foro_01_tipo_foro` y se revisa que el SQL sea una línea.
   - **PARADA (E3-5, decisión del humano).** El programador se detiene y entrega el SQL generado, tal cual.
   - El orquestador lo presenta al humano y espera su confirmación escrita.
   - Solo con ella se aplica con `npx prisma migrate dev`.
5. `schema.prisma`: `ParticipacionForo` y las relaciones. `--create-only --name foro_01_participaciones` y las partes a mano (§D-1.2).
   - **PARADA (E3-5).** El programador entrega el SQL completo (el generado más las partes a mano), el orquestador lo presenta al humano y se espera su confirmación escrita.
   - Solo con ella se aplica con `npx prisma migrate dev`. `prisma validate`, `prisma generate` y la verificación `migrate diff --exit-code` (PARADA si propone borrar algo).
6. `adapters/db/actividades.ts` y el `tipo` en `tareas.ts`, `entregas.ts` (exportaciones sin cambiar cuerpos), `temas.ts` y `publicaciones.ts` (§D-3.3). Suite del módulo: las pruebas de tareas, entregas, calificaciones, temas y muro, que deben seguir en verde sin cambios.
7. `adapters/db/foros.ts` (§D-3.4) y su exportación en `index.ts`.
8. `handlers/foros.ts` (§D-3.1, §D-5) y su registro en `app.ts`.
9. Las pruebas de integración y estáticas de 01a (FORO-1A10 a FORO-1A53) y la ayuda `backend/test/ayudas-foros.ts` (nueva) si hace falta.
10. `lint` y `build` de `shared`, del backend y del frontend, y `test` de los módulos tocados (nota E1-24 de "Pruebas requeridas", 01a), una suite después de otra y preguntando antes por la otra copia. La suite completa la corre el manager al cerrar (E1-24). El resumen trae la matriz de rutas (§D-3.1) contra los casos de autorización.

### 01a2 (después de `<K1a1>`, antes de fusionar ADMIN-01; E3-3)
10a. ~~Las respuestas de PB-1 y PB-2 en una enmienda corta.~~ (E4-1) No aplica: el humano eligió las recomendadas, que el plan ya tiene.
10b. `puedeBorrarParticipacion` (`core/autoria.ts`) y `efectoDeBorrarPrincipal` (`core/foros/participacion.ts`), con `core/foros/borrado.test.ts` (FORO-1A60, FORO-1A61).
10c. `alFaltarReferencia` en `adapters/db/errores.ts`, con su caso en `errores.test.ts`.
10d. `borrarParticipacion`, `puedeBorrar` en las listas y el `catch` de `publicarReplica` (`adapters/db/foros.ts`); la exportación en `index.ts`; `puedeBorrar` en `shared/src/foros.ts`.
10e. La ruta 17 en `handlers/foros.ts`.
10f. FORO-1A62 a FORO-1A70 y la lista cerrada de §D-R0 01a2. `lint` y `build` de los tres paquetes y la suite de los módulos tocados (E1-24). Sin migración.

### 01b (después de fusionar ADMIN-01)
11. **(E3-4)** Paso 0, solo con ADMIN-01 ya en `main` (DH-13): el humano ejecuta `git merge main`. Si hay conflictos, el programador y el tester los resuelven con las reglas de §D-R0 01b, el manager revisa y el humano hace el commit de fusión `<KF>`, que puede quedar en rojo. El manager verifica `<KF>` (§D-R0 01b, punto 6).
12. La Enmienda de arranque de 01b (arquitecto) y su revisión (manager).
13. `enClaseArchivada` en `handlers/foros.ts`, la tabla de ADM-1A09 y FORO-1B01 a FORO-1B05.
14. `conTipo` y `tipo` (§D-6) y FORO-1B06.
15. Los README (A-05) y FORO-1B08. `migrate diff` (FORO-1B07). La suite completa del backend desde cero la corre el manager al cerrar 01b.

### 01c, 01d y 01e (después de 01b)
16. La Enmienda de arranque de cada una, antes de su ronda 0.
17. 01c en el orden de §D-8.1 a §D-8.3 y §D-8.6:
    1. Las claves y las consultas en `services/trabajoService.ts`.
    2. Los hermanos T-01 a T-05, con sus pruebas, antes de construir encima.
    3. `tipo` en `FormularioTarea` y `AccionesDeLaTarea`.
    4. Las vistas del foro, la sección "Foro" y el router. Sin "Actividades" (E1-4).
18. 01d:
    1. "Actividades" con `conForos=si` y los textos de categorías (E1-4, E1-9).
    2. Después, §D-8.4: los componentes de participación, los ganchos, "Tu participación" y el montaje en `ForoView`.
19. 01e (§D-8.5): las vistas del maestro, el panel con la ruta del foro, la devolución, la calificación en "Tu participación", los enlaces por tipo, la prueba del .xlsx y `DESIGN.md` (A-06).
20. En cada una, el primer resumen trae la matriz de §D-10 confirmada o corregida, con los estados "en vuelo a la vez" y "con la vista desmontada" de cada fila.

## Enmienda 1 — tabla de cambios (2026-11-04)

Origen: la revisión del manager en modo plan (`revision.md`, CAMBIOS REQUERIDOS) y la corrección del orquestador sobre DH-13. Copia previa de `plan.md`: SHA-256 `e5723d33…` (la guardó el orquestador). Los números E1-5 a E1-8 no se usan: se reservaron mientras se redactaba y no corresponden a ningún cambio.

| E1-n | Hallazgo | Secciones | Qué cambió |
|---|---|---|---|
| E1-1 | M-01 | Resumen 2; DH-02 (reescrita); "Preguntas bloqueantes"; §D-2.1; §D-2.2 (P-03 c′); §D-2.4 (`ENTREGA_NO_CALIFICABLE`); §D-2.5 (nueva); §D-3.2 (`miParticipacionRespuestaSchema`); §D-8.4; "Cambios por capa" (`core/`); FORO-1A06 (reescrita), FORO-1A33, FORO-1D04 y FORO-1D04b (nueva); R-11 | La regla tardía se lee solo en `reglaDeParticipacion`. `exigirEntregaCalificable` con `"foro"` decide el cierre con ella. `accionesDelForo` y `mi-participacion` dan `participarConRetraso` y `replicarConRetraso`, y la interfaz deja de calcular el retraso o el cierre. FORO-1A06 vigila con una parte estática y una de equivalencia. DH-02 separa lo que pidió el humano de lo que viene de RN-08 y ESSENTIALS, distingue (b), con cierre, de (c), sin marca ni cierre, y dice qué código, textos y documentos cambia cada opción (§D-2.5) |
| E1-2 | M-02 | Encabezado ("Regla de orden de fusión"); Resumen 3; DH-13 (nueva); §D-R0 01b paso 0; paso 11; R-10; A-11 | Regla explícita: ningún commit de FORO-01 entra a `main` antes que ADMIN-01. Con (b), quién absorbe el cruce. Se presenta como DH-13 |
| E1-3 | M-03 | §D-1.2 (índices); §D-3.4 (`listarParticipaciones`, paso 4); "Acceso a datos"; FORO-1A15 (nueva) | Índice nuevo `(principal_id, creado_en, id)` para las réplicas, su conteo (que además filtra por `foro_id`) y la FK con cascada sobre sí misma. Prueba de que el índice existe y sirve |
| E1-4 | M-04 | Resumen 3; DH-09; §D-0.2 (recuento y cortes); §D-X (`features/clases`, `shared/src/recursos.ts`); §D-3.1; §D-3.2; §D-3.3 (`tareas.ts`, `temas.ts`); §D-6; §D-8.3; "Cambios por capa" (`shared`, frontend); FORO-1A25; FORO-1C15 y FORO-1C25 (pasan a 01d como FORO-1D29 y FORO-1D30); §D-R0 01a (Se toca y vigiladas) y 01c a 01e (lista mínima); paso 17 y 18 | Se conserva `seccion=actividades` y su clave de caché, y los foros se piden con `&conForos=si` (un `.transform` en `shared` lo convierte en `"actividades-con-foros"`, así que los handlers de ADMIN no cambian). `trabajoQuerySchema` pierde `.shape`, así que `temaDeTrabajoSchema` se exporta y `shared/src/recursos.ts:22` lo usa. "Actividades" pasa de 01c a 01d. Conteos: 01c ~28, 01d ~29, con un plan de corte de 01d si su Enmienda de arranque encuentra más pruebas de URL completa |
| E1-9 | N-03 | DH-09; DH-12; §D-3.3 (`temas.ts`, `categorias.ts`, nueva); §D-6; §D-9; §D-X; "Cambios por capa" (`adapters`); §D-R0 01a; FORO-1A25, FORO-1A26b (nueva) y FORO-1D31 (nueva) | El total de temas sin sección cuenta los foros (declarado). Las categorías cuentan actividades. El `409` con solo tareas dice lo de hoy y, con foros, "actividades". El editor de categorías dice "actividades" (01d) |
| E1-10 | N-05 | DH-12; §D-8.3; §D-8.5; §D-9; FORO-1E20 a FORO-1E22 | La tabla para calificar se llama "Participantes" ("Ver participantes", "Vuelve a abrir Participantes…") |
| E1-11 | N-04 | §D-9; §D-10 (cinco filas nuevas); FORO-1C37, FORO-1D32, FORO-1D33 y FORO-1E27 a FORO-1E35 (nuevas) | Filas de la matriz para la descarga de adjuntos, "Mover", `mi-participacion`, las devoluciones (con "Ver más" y cursor) y la recarga de la participante. Textos nuevos y un caso por camino de cada frase |
| E1-12 | Corrección del orquestador (DH-13) | DH-10 (absorbe la DH-13 anterior); "Riesgos y desacuerdos" | DH-10 cita lo literal del humano (`aprobacion.md`). La frase "una subentrega final, separada" se retira, junto con el "desacuerdo" que nacía de ella |
| E1-13 | DH nueva del manager (commit de fusión) | DH-14 (nueva); §D-R0 01b (paso 0, condiciones, base); paso 11; R-09 | `git merge --no-commit --no-ff main` (recomendada): la fusión entra en el único commit de 01b. Verificación contra `MERGE_HEAD` y operaciones de git prohibidas mientras dura |
| E1-14 | "Para el humano", DH-05 | DH-05; A-08 | Costo explícito y revisión de la moderación en el plan de DEPLOY |
| E1-15 | "Para el humano", DH-07 | DH-07 | La marca oculta es presentación, no confidencialidad |
| E1-16 | N-06 | S-12 | Las réplicas no suben `entregas.version`. Se acepta y se dice por qué |
| E1-17 | Menor (FORO-1A14) | FORO-1A14 | Deja de ser prueba y va al resumen con su comando |
| E1-18 | Menor (vigilada) | §D-R0 01a | `lecturas-fx-r2.ataque:1072-1108` vigilada |
| E1-19 | N-07 | FORO-1B01 | Un resultado por rol y por ruta (`409` o `403` del rol) |
| E1-20 | N-01 | FORO-1B08 (nueva); viñeta de PARADA de 01b | Borrado definitivo de una archivada con un foro completo. La PARADA mira también las entregas |
| E1-21 | N-02 | FORO-1A51 | El regex de `temas-01a-r1.ataque:1007-1008`, copiado sin aflojar, más `relacion ===`. El handler pasa `perfil` entero |
| E1-22 | N-08 | §D-R0 01b paso 0 | `docs/ESTADO.md` se concilia con la regla de "Trabajo en paralelo" (lo hace el orquestador) y no es PARADA |
| E1-23 | N-10 | §D-R0 (condiciones de las Enmiendas de arranque) | Cada una se verifica con `git diff --no-index` contra su copia. Si crece fuera de lo previsto, aprobación escrita del humano |
| E1-24 | N-09 | "Pruebas requeridas" 01a (nota); pasos 10 y 15 | En las rondas, las suites de los módulos (con la lista de 01a). La completa la corre el manager al cerrar |
| E1-25 | Menor (DEPLOY) | R-01; A-08 | El frontend del foro se despliega completo, después de 01e |
| E1-26 | "Documentos a actualizar" del manager | A-01; A-02 | ESSENTIALS y el PRD nombran P-03 c′ del foro con la misma regla |
| E1-27 (agregada en E2-5, N-13) | Coherente con E1-4 y §D-8.6 | Paso 17 | Cambia el orden de 01c: los hermanos T-01 a T-05 van antes que `tipo` en `FormularioTarea` y `AccionesDeLaTarea`, para no construir el formulario del foro sobre los defectos de hoy |
| E1-28 (agregada en E2-5, N-13) | Coherente con E1-4 | "Puntos de ataque", punto 7 | Suma `conForos` repetido, con otros valores o sin `seccion=actividades` |

## Enmienda 2 — tabla de cambios (2026-11-04)

Origen: "Verificación de la Enmienda 1 — FORO-01" de `revision.md` (CAMBIOS REQUERIDOS solo por M-05). Copia previa de `plan.md`: SHA-256 `fdfe0e3b…` (la guardó el orquestador).

| E2-n | Hallazgo | Secciones | Qué cambió |
|---|---|---|---|
| E2-1 | M-05 | "Pruebas requeridas" 01a, FORO-1A06 (i) | La parte estática prohíbe las decisiones con la fecha (`esTarde(`, `entregaCerrada(`, `getTime(`, `Date.now(` y comparaciones con `fechaLimite`, `fecha_limite` o `ahora`) fuera de `reglaDeParticipacion`, no la palabra `aceptaTardias`. Admite la interfaz `ForoParaParticipar`, el reenvío de parámetros en `participacion.ts`, el `select` y el armado de `{ fechaLimite, aceptaTardias }` en `adapters/db/foros.ts`, y en `handlers/foros.ts` el mapeo de respuesta, el paso de los campos del formulario, `momentoDelRecordatorio` y `validarFechaLimite` |
| E2-2 | N-11 | DH-14 (condiciones); §D-R0 01b ("Con DH-14 (a)…") | Prohíbe también `git restore`, `git checkout -- <ruta>` y `git clean`. Ningún agente hace `git commit` ni `git merge --continue`. Segunda comprobación con `git diff HEAD --stat` contra `HEAD...MERGE_HEAD` y el "Se toca" de 01b. El manager revisa hunk por hunk los seis archivos de cruce. **La recomendación de DH-14 no cambia; solo suma esas condiciones** |
| E2-3 | N-12 | §D-0.2 (después de la regla de 01d) | 01c tiene la misma regla de corte: si su Enmienda de arranque pasa de unos 30, se parte en 01c1 (hermanos, PR-1A17 y `tipo` en los componentes) y 01c2 (vistas, sección y router) |
| E2-4 | N-14 | "Preguntas bloqueantes" | "Esas cinco" pasa a seis, con lo que cambia cada una. DH-02 (c) no toca rutas ni tablas, sino el formulario, "Detalles" y el PRD |
| E2-5 | N-13 | Tabla de la Enmienda 1 (filas E1-27 y E1-28) | Nombra los dos cambios que no tenían fila: el orden del paso 17 y el punto 7 de "Puntos de ataque" |

## Enmienda 3 — tabla de cambios (2026-11-05)

Origen: la "Aprobación corregida por el humano (2026-11-05)" de `aprobacion.md` (DH-05 y DH-14 cambian; las migraciones son PARADA) y los dos detalles del manager de la verificación de la Enmienda 2. Copia previa de `plan.md`: SHA-256 `f112642b…` (la guardó el orquestador).

| E3-n | Origen | Secciones | Qué cambió |
|---|---|---|---|
| E3-1 | DH-05 del humano: lo que no decidió | Estado; "Preguntas bloqueantes" (PB-1, PB-2); Resumen 5 | Dos preguntas bloqueantes, solo para 01a2. PB-1: si los maestros también borran, porque la regla general (`puedeBorrar`) se lo daría y al alumno lo suyo, que el humano excluye; recomendada (a), solo el admin. PB-2: la entrega al borrar una principal sin calificación; recomendada (a), vuelve a "sin participar" y se puede publicar otra vez. 01a1 sigue LISTO |
| E3-2 | Regla de 30 archivos con la ruta nueva | Encabezado; Resumen 3; §D-0.2 (fila 01a2 nueva, 01a1 y cortes); §D-R0 01a1; pasos (encabezado 01a1) | 01a pasaba a ~37 archivos y se parte en 01a1 (~32, lo de antes) y 01a2 (~14, el borrado). Las dos van antes de fusionar ADMIN-01, sin entrar a `main` |
| E3-3 | DH-05 del humano | DH-05; §D-11 (nueva); §D-3.1 (ruta 17); "Autorización"; Alcance; §D-X (dos filas); "Pruebas requeridas" 01a2 (FORO-1A60 a FORO-1A70, nuevas) y 01b (FORO-1B01, FORO-1B04); §D-10 (fila del borrado, 01d); FORO-1D35 a FORO-1D38 (nuevas); "Puntos de ataque", punto 10; §D-R0 01a2 (nueva); pasos 10a a 10f; §D-0.2, 01d; R-06; las menciones de "16 rutas" en §D-X, FORO-1B04, §D-R0 01b y A-03 | El admin borra participaciones y réplicas (ruta 17, `DELETE …/participaciones/:participacionId`, `roles: ["admin"]`, cerrada en archivada). La decide `puedeBorrarParticipacion` (`core/autoria.ts`, nueva). La transacción bloquea `tareas` y después `entregas`, conserva la calificación o devuelve la entrega a "sin participar" (`efectoDeBorrarPrincipal`, PB-2) y borra con cascada. El `P2003` de una réplica en vuelo pasa a `404` con `alFaltarReferencia` en `errores.ts`. `puedeBorrar` en las listas. El control "Borrar" del admin va en 01d |
| E3-4 | DH-14 del humano: (b) | DH-14; §D-R0 01b (paso 0 reescrito, base `<KF>`); paso 11; R-09 | Commit de fusión aparte, hecho por el humano, que puede quedar en rojo. Salen las condiciones de la fusión abierta (`MERGE_HEAD`, prohibiciones durante toda 01b). Los conflictos: los resuelven el programador (producción y normales) y el tester (`*.ataque`) con las reglas, el manager revisa y el humano hace el commit (recomendado); la alternativa es que los resuelva el humano. Verificación de `<KF>` contra sus dos padres. Base de "No se toca" de 01b: `<KF>` |
| E3-5 | Decisión del humano (migraciones) | Pasos 4 y 5 | PARADA antes de cada `prisma migrate dev`, con el SQL de `--create-only` (y las partes a mano), que el orquestador presenta al humano |
| E3-6 | Detalles del manager (verificación de la Enmienda 2) | DH-14 (fila sin viñetas); §D-R0 01b (punto 6 y base) | La fila de DH-14 queda en un solo párrafo por celda. La comprobación de 01b exceptúa `docs/trabajo/FORO-01-…` y `docs/ESTADO.md` |
| E3-7 | DH-05 del humano: documentos | A-01; A-08 | ESSENTIALS y el PRD documentan el borrado del admin. La fila de DEPLOY de la moderación pasa a revisar si los maestros borran (con PB-1 a) y el registro de quién borró |

## Enmienda 4 — tabla de cambios (2026-11-05)

Origen: las respuestas del humano en `aprobacion.md`, "Enmienda 3 y respuestas del humano": PB-1 (a), PB-2 (a), la partición en 01a1 y 01a2, S-E3-1 y S-E3-2. Copia previa de `plan.md`: SHA-256 `6d2409dc…` (la guardó el orquestador). El diseño de §D-11, la ruta 17, las pruebas FORO-1A60 a FORO-1A70 y FORO-1D35 a FORO-1D38, y los conteos ya estaban escritos con la opción (a) de las dos preguntas: ninguno cambia.

| E4-n | Origen | Secciones | Qué cambió |
|---|---|---|---|
| E4-1 | PB-1 (a), PB-2 (a), la partición, S-E3-1 y S-E3-2 | Estado; encabezado; "Preguntas bloqueantes"; Resumen 5; DH-05; §D-11 (S-E3-1 y S-E3-2); §D-R0 01a2 ("Arranca"); paso 10a | PB-1 y PB-2 quedan resueltas; 01a2 y el plan, en LISTO. Las dos suposiciones quedan aceptadas. Ya no hace falta la enmienda corta previa a 01a2 |
| E4-2 | PB-1 (a) | A-08 | La fila de DEPLOY revisa si los maestros también deben borrar y el registro de quién borró; sale la rama condicional de (b) y (c) |

## Enmienda 5 — tabla de cambios (2026-11-05)

Origen: "Verificación de las Enmiendas 3 y 4 — FORO-01" de `revision.md` (CAMBIOS REQUERIDOS solo por M-06, en 01a2) y las respuestas del humano en `aprobacion.md`. Copia previa de `plan.md`: SHA-256 `f7e0d500…` (la guardó el orquestador). **Nada de 01a1 cambia:** ni su "Se toca", ni su lista cerrada, ni sus pruebas, ni sus pasos. Su ronda 0 corre en paralelo.

| E5-n | Hallazgo | Secciones | Qué cambió |
|---|---|---|---|
| E5-1 | M-06 | §D-11 (paso 5: relectura después de bloquear la entrega; paso 6; "Concurrencia": dos borrados a la vez reescrito y "Estados vecinos" nuevo); FORO-1A61 (corregida); FORO-1A67 (amplía los casos) | El borrado de una principal vuelve a leerla después de `bloquearEntrega` y responde `404` si ya no está. Así dos borrados de la misma principal sin calificar dan `204` y `404`, nunca `500`, y `asignado` en `efectoDeBorrarPrincipal` queda de verdad inalcanzable. Se revisan los vecinos del mismo mecanismo: borrar contra calificar, contra volver a publicar, contra una réplica en vuelo y contra borrar el foro. FORO-1A67 suma la principal sin calificar, la calificada, la principal con su réplica y el borrado del id viejo frente a la principal nueva |
| E5-2 | N-15 | §D-R0 01b, punto 6 | La verificación de `<KF>` incluye siempre `git show --remerge-diff` de los siete archivos de cruce (o el diff por padre como respaldo), y aclara que las pruebas y ayudas nuevas de 01a1 y 01a2 cuentan como permitidas |
| E5-3 | N-16 | "Alcance"; §D-3.1 (ruta 17); §D-11 (regla, comentario de la función, firma, `protegido`); "Autorización" (fila 17 y alumno restringido); FORO-1A60 | Salen las frases previas a PB-1: "depende de PB-1", las ramas "PB-1 (b) o (c)" y "16 rutas" en la viñeta del alumno restringido (ahora 17, con la 17 en 01a2) |
| E5-4 | Respuesta del humano (DH-05) | DH-05; §D-11 (regla); FORO-1A65 | Decidido: el alumno calificado cuya principal se borra conserva la calificación, no vuelve a publicar su principal y sigue replicando. FORO-1A65 suma la réplica |
| E5-5 | Respuesta del humano (DH-14) | DH-14; §D-R0 01b, punto 3 | Decidido: los conflictos de la fusión los resuelven los agentes (el programador, producción y pruebas normales; el tester, las `*.ataque`), el manager revisa y el humano hace el commit. La alternativa queda como historial |

## Enmienda 6 — tabla de cambios (2026-11-05)

Origen: la PARADA de diseño P-01a1-1 del tester en la ronda 0 de 01a1 (`reporte-tester.md`, "Fuera del backend"). Copia previa de `plan.md`: SHA-256 `1b7daae3…` (la guardó el orquestador).

**Opción elegida: (a), C-n que suman los nombres a `INVENTARIO`, y no cambiar los mensajes.** Por qué:
- **La convención.** `"<campo>: …"` es la de todos los mensajes de parámetros y consultas de `shared/src` (`tareaId`, `dudaId`, `recursoId`, `seccion`, `tipo`, `confirmar`…). Un mensaje sin prefijo sería el único distinto, y el backend y `lib/errores-de-api.ts` tratan igual a todos.
- **Lo que protege la prueba.** No prohíbe prefijos: exige que cada uno esté inventariado y que `quitarRutaDelMensaje` deje texto legible. Con los tres nombres (y `conTipo` en 01b), lo deja (comprobación en C-6 y C-7).
- **El precedente.** C-26 de CLASES-03b y el Arbitraje 2 de CLASES-03a resolvieron así el mismo caso.

| E6-n | Hallazgo | Secciones | Qué cambió |
|---|---|---|---|
| E6-1 | P-01a1-1 | §D-R0 01a1 (C-6 nuevo y la nota "Frontend"); §D-R0 01b (C-7 nuevo) | C-6 (01a1) suma `conForos`, `foroId` y `participacionId` al `INVENTARIO` de `frontend/src/lib/errores-ch3-r2.ataque.test.ts`, con la comprobación de legibilidad de `quitarRutaDelMensaje`. C-7 (01b) suma `conTipo`, igual. Si la fusión trae cambios de ADMIN-01 en ese archivo, el tester los une |
| E6-2 | Hermanos de P-01a1-1 | §D-3.2 (inventario nuevo de literales con prefijo) | Lista cerrada de los literales `"<nombre>: …"` que el plan manda escribir en `shared/src` por subentrega. 01a1: `foroId`, `participacionId`, `conForos`, y `alumnoId` y `tema`, que ya estaban. 01a2: ninguno. 01b: `conTipo`. Los mensajes de cuerpo del foro, la participación y la réplica no llevan prefijo. Uno nuevo es PARADA |
| E6-3 | Hermanos: otras pruebas que leen `shared/src` | §D-R0 01a1 ("Frontend": vigiladas); §D-R0 01a2 (vigilada) | Por grep: en el frontend, solo `errores-ch3-r2.ataque` lee `shared/src` con `import.meta.glob` (C-6), y `errores-de-api.test.ts:463-470` ya estaba vigilada. En el backend, las que leen `shared/src` (`entregas-01b-r1.ataque`, `temas-01a-r3.ataque:440-482`, `esquemas-exportacion`, `hilo-01c-r1.ataque:754`, `calificaciones-estatico:76-85`) miran archivos que FORO no toca o no les cambia lo que miran. `errores-ch3-r2.ataque` queda vigilada en 01a2, sin literales nuevos |

## Enmienda 7 — tabla de cambios (2026-11-14)

Origen: el rearranque del encargo sobre `fd4a7ad` (`aprobacion.md`, "Rearranque (2026-11-14)"), con ADMIN-01, CHORE-04, DOCS-05 y CHORE-06 ya en `main`, y el encargo del orquestador de revalidar el plan sin reabrir lo decidido. Copia previa de `plan.md`: SHA-256 `6398b144…` (`foro01-arranque/plan-foro-01-antes-e7.md`, la guardó el orquestador). Ninguna decisión del humano cambia de opción ni de recomendación; DH-13 y DH-14 quedan sin objeto.

| E7-n | Origen | Secciones | Qué cambió |
|---|---|---|---|
| E7-1 | Base y estado | Estado; Carril; "Base de «No se toca»"; nota de la Enmienda 7 | La base pasa a `fd4a7ad`, con una sola copia de trabajo. El estado es LISTO, pendiente del manager y del humano. En el carril, la política de clase archivada pasa a 01a |
| E7-2 | Punto 1 del encargo: la estructura | §E7.0 (nueva); "Regla de orden de fusión"; DH-10, DH-13 y DH-14 (marcas); §D-X (nota); §D-R0 (notas en el encabezado, 01a1, 01a2, 01b y 01c a 01e); R-03, R-04, R-08, R-09 y R-10; A-11; "Pasos de implementación" (nota) | Sin objeto: la regla de fusión, DH-13, DH-14, el cruce con ADMIN-01, el paso 0 de 01b, C-3, C-4 y C-5 de la fusión, las Enmiendas de arranque y la pregunta por la otra copia. Todo queda como historial, marcado |
| E7-3 | Punto 1: las subentregas | §E7.1 (nueva); §D-0.2 (nota); Resumen 3 | Seis subentregas: 01a ~31, 01b ~30, 01c1 ~14, 01c2 ~30, 01d ~27 y 01e ~26, con el conteo y la razón de cada corte. La política de clase archivada va a 01a (ADM-1A09). "Actividades" con foros pasa a 01b, y lo de 01a2 y la 01b vieja también. 01c se parte por la regla de E2-3. Los ids de las pruebas no cambian al moverse (DH-15) |
| E7-4 | Punto 2: el reanclaje | §E7.2 (nueva); §D-1.1 (fila de ADMIN-01); §D-7 (nota); §D-8.1 (resuelto); FORO-1B06 (`fd4a7ad`); A-06 (§7.34) | Cada cita del plan, contrastada con el árbol de hoy. Cambian la forma multilínea de `protegido`, la sección activa (no en `foros/:id`), `fila-de-entrega.tsx` (ya tiene `destino`), `DESIGN.md` §7.32 y §7.33 (ahora de ADMIN-01, así que el foro va en §7.34) y la línea de ESSENTIALS. El conteo de borrado de ADMIN-01 cuenta el foro (sin PARADA) |
| E7-5 | Punto 2: el backend de ADMIN-01 | §E7.3, "Backend"; "Alcance"; S-E7-1 y S-E7-2 (nuevas); "Autorización" (clase archivada); FORO-1B09 y FORO-1B10 (nuevos) | La política de clase archivada va desde 01a. Se describen el borrado definitivo (la cascada, la cola y el conteo) y el duplicado (sin foros), y la baja y la reactivación de cuentas, con las participaciones a la vista, sin marca. Gradebook y "Clases anteriores" |
| E7-6 | Punto 2: Prisma | §E7.3, "Prisma" | Marcas después de `20261109150104`; los nombres de los índices; siguen como PARADA con su SQL; `migrate diff` en el resumen de 01a |
| E7-7 | Punto 2 y 3: el frontend y las reglas nuevas | §E7.3, "Frontend" (puntos 1 a 9); §D-8 (nota), §D-8.2, §D-8.4, §D-8.5 y §D-8.6 (marcas); §D-10 (nota) | Las secciones (con `foros/nuevo` → `/login` para el estudiante), la clase archivada, las `key` por cada id de la ruta, las guardas con ref y `EXCEPCIONES` de CH4-01, ningún lector de `isFetchingNextPage`, `ForosView` como `DudasView`, las listas de `features/tareas` con el patrón de Entregas, la memoria por consulta, ningún aviso ante un código con que `apiClient` redirige, y `DESIGN.md` §7.34 |
| E7-8 | Nuevo: la traducción de errores del foro | §E7.3, "Frontend", punto 6; §D-8.5 (`PanelDeCalificacion`); FORO-1C43 (nuevo) | `TRADUCCION_DE_ERRORES_FORO`, envoltorio de `lib/errores-de-api.ts`, con `TAREA_NO_ENCONTRADA` → "Ese foro ya no existe.", `foroId` y `participacionId`, y 18 códigos con el texto del servidor. La de las tareas sigue con 15 |
| E7-9 | ESTADO §3 | §D-0.1 (filas nuevas); "Alcance"; §E7.3, "Frontend", punto 8; FORO-1C40, FORO-1C41, FORO-1E40 y FORO-1E41 (nuevos); A-07 | Los vecinos sin caso de CH6-A14 en la tarea y el panel. "Revisar en FORO-01" de ADMIN-01d1 y 01d2: hechos tarea, foro y calificar, y el recurso se queda en la fila. T-05 respeta PR-1D05 con la vista montada |
| E7-10 | Punto 4: los inventarios | §E7.5 (nueva; reemplaza a §D-R0) | "Se toca" y "No se toca" por subentrega, las listas cerradas por grep sobre `fd4a7ad`, las vigiladas y la comprobación de arranque del tester. C-1, C-2 y C-6 (01a), C-1 bis, C-3 y C-7 (01b) y C-8 a C-14 (frontend), con su texto exacto |
| E7-11 | Punto 3: los casos de las reglas nuevas | §E7.4 (nueva); nota en "Pruebas requeridas" y en sus encabezados de 01a, 01a2 y 01b; FORO-1C01 (marca); "Puntos de ataque", punto 11 (nuevo) | Los movimientos de casos entre subentregas y los casos nuevos (guardas quitándolas, §7.10, lo abierto es del id, la redirección y la política única) |
| E7-12 | Punto 5: los detalles del manager | §E7.6 (nueva) | Cada detalle "para la Enmienda de arranque de 01b", con lo que pasa con él. CAL-1B08 queda vigilada en 01b |
| E7-13 | Punto 6: DH-02 | §E7.7 (nueva) | Sigue pendiente con el cliente y no bloquea nada. Se dice qué cambia según cuándo responda |
| E7-14 | Punto 7: las decisiones | §E7.8 (nueva); nota bajo la tabla de las DH; "Preguntas bloqueantes"; Resumen 5; §D-9 (fila E7) | DH-15 (partición), DH-16 (cuándo entra a `main`), DH-17 (borrado definitivo), DH-18 (baja de cuentas) y el complemento de DH-12 (dos textos de categorías), cada una con su recomendación |
| E7-15 | Riesgos y documentos | §E7.10 (nueva); A-06, A-07 y A-08 | R-E7-1 a R-E7-6. `DESIGN.md` §7.34, con §7.10 y §7.14. Las filas de ESTADO que se cierran o se actualizan. El retiro de los parámetros opt-in en el `chore` de compatibilidad, antes de DEPLOY |
| E7-16 | Pasos | §E7.11 (nueva) | Los pasos 1 a 36, por subentrega, con las dos PARADAS de migración en 01a |

## Enmienda 8 — tabla de cambios (2026-11-14)

Origen: "Verificación de la Enmienda 7 (rearranque) — FORO-01 (2026-11-14)" de `revision.md` (CAMBIOS REQUERIDOS por M-07 y M-08). Copia previa de `plan.md`: SHA-256 `18b4f5cf…` (la guardó el orquestador). Ninguna DH aprobada cambia de opción ni de recomendación. C-1, C-2, C-3, C-6 y C-7 no cambian. DH-15 se reescribe con la partición nueva.

| E8-n | Hallazgo | Secciones | Qué cambió |
|---|---|---|---|
| E8-1 | M-07 | §E8.1 (nueva); §E7.5.0 ("No se toca", la excepción); §E7.5.1 (nota) | Inventario por grep de todos los usos del tipo de publicación en `backend/`, `shared/` y `frontend/`, con lo que compila y lo que no. Remedio en 01a: `crearPublicacion` devuelve el `tipo` de su parámetro, `listarPublicaciones` estrecha con una ayuda inalcanzable y `core/clases/duplicado.ts:8` suma `"foro"` (el duplicado sigue sin copiar foros; FORO-1A08 nuevo, FORO-1B09). `duplicado-de-clase.ts` no se toca. 01a pasa a ~32, con nuevas vigiladas |
| E8-2 | M-08 | §E8.2 (nueva) | Inventario rehecho de todo lo que cuenta, enumera o indexa las secciones, en todo `frontend/src`. La lista cerrada suma `app/router-01d.test.tsx` y `dudas-caminos-03e.test.tsx`, y las líneas que faltaban de `secciones-03c1` y `clase-layout`, cada una antes → después. Los C-n nuevos C-17 a C-20 (`rutas-01d-r1`, `clases-admin-02c-r1`, `indicador-03c1-r1` e `indicador-03c1-r2`) siguen el precedente de CLASES-03e. C-15 y C-16 son de `guardas-ch4-r1` (ATQ-CH4-32 y 34), y las demás formas del foro quedan fuera de esas listas |
| E8-3 | M-08: la partición | §E8.3 (nueva); §E7.1 (nota); §E7.5.3, §E7.5.5 y §E7.5.6 (notas); §E7.11 (orden de los pasos 20 a 28); DH-15 (reescrita en §E7.8) | Frontend: 01c1 es la sección "Foro" (~23) y 01c2, los hermanos, el formulario y las vistas (~25); 01d ~27; 01e ~27. Cada caso de 01c queda en su subentrega y la línea "Grep" se amplía |
| E8-4 | N-17 | §E8.5 (nueva) | Las vigiladas abiertas con su archivo y su línea, más las tres que faltaban: `instantanea-01b-r1`, `calificaciones-estatico-01b-r1` y `autoria-02b-r1`. Se dicen cuáles siguen sin abrir línea por línea y por qué |
| E8-5 | N-18 | §E8.4 (nueva) | `useVerMasConservandoLaLista`, en `features/tareas/hooks.ts`, desde 01d. `entregas-view.tsx` se queda como está |
| E8-6 | N-19 y N-20 | §E7.8 (avisos, debajo de la tabla) | Los dos avisos para el humano, sin decisión nueva. N-19 se puede rechazar al aprobar |
| E8-7 | N-21 | §E7.7 | Con (c), `FormularioTarea` cae en 01c2 (la de las vistas) |
| E8-8 | Detalles menores | Tabla E7 (esta nota); A-11; §D-0.1 (nota); A-04 | La nota de "Cambios por capa" de la Enmienda 7 entra en E7-3 y E7-10. Se aísla el fragmento suelto de A-11. Las filas de ESTADO se citan por su texto. A-04 suma la entrada de `services/trabajoService.ts` de `CLAUDE.md` |

## Enmienda 9 — tabla de cambios (2026-11-14)

Origen: las decisiones del humano del 2026-11-14 (`aprobacion.md`, "Decisiones del humano sobre el rearranque (2026-11-14)") y "Verificación de la Enmienda 8 — FORO-01 (2026-11-14)" de `revision.md` (APROBADO, con N-22 a N-25 y dos detalles menores). Copia previa de `plan.md`: SHA-256 `cf26b7f9…` (la guardó el orquestador). Ninguna decisión cambia de opción. C-1, C-2, C-3, C-6, C-7, C-9 a C-11 (salvo su etiqueta) y C-14 a C-19 conservan su contenido.

| E9-n | Origen | Secciones | Qué cambió |
|---|---|---|---|
| E9-1 | Decisiones del humano | Estado; "Para la aprobación del humano" (nuevo); nota de la Enmienda 9; §E9.1; §E7.8 (DH-15 a DH-18, el complemento de DH-12, N-19 y N-20); la nota bajo la tabla de las DH | DH-15 a DH-18 decididas con (a), los dos textos aprobados y N-19 aceptado, con su fecha y sin borrar las opciones descartadas. N-20 queda como aviso ya dado. El encabezado trae la lista corta de lo que aprueba el humano |
| E9-2 | N-22 | §E8.2 (C-20 reescrito; nota en C-19); §E9.2 | C-20 suma los ocho índices pasados como argumento suelto de `visitar` y `fotosAjenasAlNavegar` (`:383`, `:404`, `:429`, `:446`, `:466` y `:484`, de 5 a 6; `:420` y `:499`, de 4 a 5), con el texto exacto de cada cambio. Se confirmó cada línea; C-19 no tiene índices sueltos |
| E9-3 | N-23 | El texto literal de C-8, C-9, C-10 y C-11; §E7.2; §E7.3, puntos 1, 6 y 8; los encabezados de §E7.4; §E7.5.4; R-E7-1 y R-E7-2; §D-0.1; §D-8.6; §D-10; §D-R0; §E9.3 | Las etiquetas de subentrega, coherentes con §E8.3 o marcadas como historial. Los comentarios que el tester escribe en los archivos quedan con la subentrega correcta |
| E9-4 | N-24 | §E9.4 (nueva) | Las `*.ataque` y las estáticas que leen el código de `features/tareas`, `features/calificaciones`, `features/clases` y todo `src/` quedan abiertas con su línea, y cada regla pasa a ser una restricción para el programador. El foro no reutiliza `renovarTrasErrorDeLaEntrega` ni `avisarDelErrorDeLaEntrega` ni la cadena `mensajeDelAvisoDeCalificar`, y sus ganchos no llevan los nombres reservados. Sus formularios no usan `if (<m>.isError) <m>.reset()`. Sin C-n nuevos |
| E9-5 | N-25 | §E9.5 (nueva); §E7.3, punto 1; §E8.3 ("Dónde va cada caso") | FORO-1C01 se parte: `indiceDeSeccionActiva` y el orden en 01c1, y el router real en `foros/:foroId` en 01c2. Se declara el estado intermedio entre 01c1 y 01c2 (enlaces a rutas inexistentes, que llevan a `/login`) y que 01c1 no entra sola a `main` (DH-16 (a)) |
| E9-6 | Detalles menores | §E8.1 (FORO-1A08); §E8.2 (C-15); §E8.3 (backend); §E9.6 | FORO-1A08 va en un archivo nuevo, `core/clases/duplicado-con-foros.test.ts`, y 01a pasa a ~33. La firma de `handleGuardar` de C-15 la declara el programador y la forma queda fija |
