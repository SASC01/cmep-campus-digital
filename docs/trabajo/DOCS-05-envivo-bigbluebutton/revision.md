# Revisión del Manager — DOCS-05 · documentos de BigBlueButton — plan
Veredicto: CAMBIOS REQUERIDOS (dos correcciones de texto en el plan, M-01 y M-02, más cuatro ajustes que no bloquean; ninguna toca el alcance ni las decisiones DH-01 a DH-08, que pueden presentarse al humano junto con la enmienda)
Verificación propia: sin `lint`, `test` ni `build` (encargo de solo documentos; el encargo me pide no correr suites). `plan.md`: 506 líneas, SHA-256 `beb11b4d906fcaec908b3dc4233129e6112f9c4ce9533675a237cee40f10a1ba`, igual al de `aprobacion.md`. Investigación de ENVIVO: 268 líneas, `b7ab7ae6200b612902920c57e35dd1e77458823b81fcfa99d5cf388a9e8a0f5c`, igual. Rama `docs/docs-05-envivo-bigbluebutton`, HEAD `685fc2b`; `git diff --stat 685fc2b`: solo `docs/ESTADO.md` (registro del orquestador; SHA-256 `42a87715…`, igual al registrado) y `docs/trabajo/CHORE-04-guardas-de-doble-clic/aprobacion.md` (ver N-02). Ningún `.env` abierto: las búsquedas excluyen `**/.env`.

Contrato: la petición literal del humano en `aprobacion.md` (2026-11-11), la investigación aprobada (tabla de §10 y §4.7) y `docs/ESTADO.md` 2b.

## Problemas que bloquean

### M-01 — RN-12 convierte el "riesgo a evitar" del cliente en una regla que choca con RF-77 y cierra una pregunta abierta
Dónde: `plan.md:198` (P-3, RN-12, cuarta viñeta): «Borrar o limpiar algo en una clase no deja sin contenido a la otra clase del vínculo (contexto del cliente, 2026-11-11). Cómo se cumple **al borrar una grabación**, al archivar la clase de origen y al borrar definitivamente una clase lo fija el plan de ENVIVO.»
Por qué importa:
- En la investigación (inv. §4.7) esa frase es el **contexto** («El riesgo a evitar: …»), no una de las seis decisiones del dueño. En una regla de negocio del PRD, que el programador lee como requisito, se vuelve absoluta.
- Choca con las decisiones 4 y 5 del dueño, que el mismo plan registra en RF-77: un video es **un solo archivo** y **solo el Administrador** lo borra. Borrar una grabación la quita de todas las clases que la muestran: en ese caso la regla no se puede cumplir, y la frase "cómo se cumple al borrar una grabación lo fija ENVIVO" la da por cumplible.
- Además cierra en silencio parte de la pregunta 21 (inv. §4.7, abierta 4): si borrar o editar un recurso de aprendizaje en la clase de origen alcanza a la vinculada depende de si se comparte por referencia o por copias sincronizadas. «Cuando el grupo en vivo se actualiza, el asíncrono también» y «borrar no deja sin contenido» tiran en sentidos opuestos, y eso lo decide ENVIVO con el humano.
Qué se espera: que RN-12 registre el objetivo del cliente como objetivo, no como regla absoluta, y solo para lo que sí está decidido o es consecuencia directa de una decisión: archivar o borrar definitivamente una clase no deja a la otra sin lo que ya recibió. Que no diga nada de cómo se cumple "al borrar una grabación" (lo decidido es que solo el Administrador la borra y que es un solo archivo). Que la propagación de un borrado o una edición de un recurso compartido quede dentro de la pregunta 21 (puede bastar con agregar «¿borrar o editar un recurso en la clase de origen alcanza a la vinculada?»). Revisar con el mismo criterio E-10 (ESSENTIALS, `plan.md:277`): su frase «borrar, archivar o limpiar una clase no deja sin contenido a su vinculada» puede quedarse si habla de la clase, no de borrar una grabación ni un recurso.

### M-02 — D-26 se marca entera como "Sustituida por D-33", pero su parte del correo sigue vigente
Dónde: `plan.md:355` (R-31) y `plan.md:350` (R-26). D-26 (`ARCHITECTURE.md:596`) decide también que «DEPLOY verifica con servicios reales **un correo de recuperación en la bandeja de entrada** y una grabación completa…». `ARCHITECTURE.md:531` (requisito previo de DEPLOY sobre el correo) cita «(DOCS-02a, D-26)», y R-26 reescribe la línea 516, que nombra las dos verificaciones, y deja solo «(D-33)» al final.
Por qué importa: después de DOCS-05, el único fundamento escrito de la verificación del correo en DEPLOY sería una decisión marcada como sustituida, y la línea 516 atribuiría a D-33 (clases en vivo) también la del correo. Es una afirmación falsa en `ARCHITECTURE.md` sobre una decisión vigente; un agente de DEPLOY podría darla por caída.
Qué se espera: que la marca de D-26 diga que D-33 la sustituye **en lo de clases en vivo** y que la verificación del correo de recuperación en DEPLOY sigue vigente; y que la línea 516 conserve D-26 para el correo y use D-33 solo para la grabación. D-10 sí se sustituye entera.

## Problemas que no bloquean

### N-01 — La lista cerrada de DOC5-02 no cubre tres apariciones que el propio plan escribe o conserva
Dónde: `plan.md:130-140` ("Lista de lugares donde «LiveKit» puede quedar") frente a:
- R-22 (`plan.md:346`), `ARCHITECTURE.md` §14: «las columnas de grabación del diseño **con LiveKit** se quitaron». La lista de `ARCHITECTURE.md` no nombra §14.
- E-6 (`plan.md:254`), ESSENTIALS "Tablas": «pierde las columnas del diseño **con LiveKit**». La lista de ESSENTIALS solo admite "Proveedores", "Capas" y "Clases en vivo".
- `docs/ESTADO.md:240` y `:261` (el registro de DOCS-05 del orquestador, que nombra LiveKit): están en el grupo B del inventario, pero no en la lista de "Diseño".
Por qué importa: DOC5-02 es la comprobación mecánica del cierre; con la lista así, falla con textos que el plan mismo manda escribir, y la revisión final tendría que arbitrar a ojo.
Qué se espera: o se reescriben R-22 y E-6 sin la palabra («del diseño anterior», «del diseño que sustituye D-33»), o se agregan a la lista; y la lista incluye las líneas de `ESTADO.md` §2 y 2b que lleva el orquestador.

### N-02 — `docs/trabajo/CHORE-04-guardas-de-doble-clic/aprobacion.md` ya está modificado y el plan no lo cuenta
Dónde: `git status` de la rama: el orquestador agregó una línea (la fusión de CHORE-04, PR #37). El plan lo deja en "No se toca" («`docs/trabajo/` de cualquier otro encargo», `plan.md:435`) y DOC5-01 exige `git status --porcelain` sin archivos fuera de "Se toca" (`plan.md:460`).
Por qué importa: DOC5-01 fallaría por un cambio legítimo del orquestador, y el bloque de `git add` del cierre lo dejaría fuera o lo metería sin estar en la lista.
Qué se espera: que el plan lo nombre como cambio del orquestador que entra en el commit de DOCS-05 (o que se confirme aparte antes) y que DOC5-01 lo exceptúe. El conteo pasa de unos 14 a unos 15 archivos: sigue siendo una sola entrega.

### N-03 — Varias frases dan por resuelto R-01 a favor de una de sus dos salidas
Dónde: E-8 (`plan.md:267`, «cómo se copia una grabación **sin que el archivo pase por Node**»), R-19 (`plan.md:343`, «cómo llega el video del proveedor al almacén **sin pasar por Node**»), R-21 (`plan.md:370`, igual) y R-7 (`plan.md:331`, la flecha `W -. sondeo y copia de grabaciones .-> BBB`, que dibuja al worker copiando).
Por qué importa: R-01 contempla dos salidas: que el proveedor deje el video en un almacén S3 (cumple la regla 6) o una excepción acotada por el worker (no la cumple y la decide el humano). «Sin pasar por Node» presenta la primera como requisito y la flecha del diagrama dibuja la segunda como diseño. Ninguna está decidida.
Qué se espera: redacción neutral en los tres textos (por ejemplo, «cómo llega la grabación a nuestro almacenamiento y si cabe en la regla 6 o necesita una excepción que decide el humano») y la flecha del diagrama solo como «sondeo de grabaciones (previsto, ENVIVO)».

### N-04 — La viñeta nueva de §6 atribuye "programar" al estudiante
Dónde: P-4 (`plan.md:204`): «"Clase en vivo" del estudiante y "Clase en vivo (anfitrión)" del maestro pasan a ser la antesala: programar, entrar … y la lista de grabaciones».
Por qué importa: programar es del maestro (RF-40); el estudiante ya tiene "Grabaciones" como vista aparte en §6. Leído literal, el alumno programa clases.
Qué se espera: separar por rol (el maestro programa; los dos entran al aula de BigBlueButton; la lista de grabaciones, donde ya está en cada rol).

## Lo que se verificó y está bien

### Inventario (grep propio)
`git grep -n -i -E "livekit|egress" 685fc2b -- . ':!docs/trabajo'` y la misma búsqueda sobre el árbol de trabajo (sin `node_modules`, `**/.env` ni `docs/trabajo/`): **85 apariciones en 15 archivos**, los mismos en los dos: `.claude/agents/arquitecto.md` (1), `.claude/agents/tester.md` (3), `AGENTS.md` (5), `CLAUDE.md` (7), `README.md` (6), `backend/src/adapters/README.md` (1), `docs/ARCHITECTURE-ESSENTIALS.md` (9), `docs/ARCHITECTURE.md` (28), `docs/ESTADO.md` (5 en la base, 6 en el árbol), `docs/PRD.md` (3), `eslint.config.mjs` (1), `frontend/src/services/liveService.ts` (3), `infra/.env.example` (7), `infra/docker-compose.yml` (4), `infra/livekit/livekit.dev.yaml` (1). Cero en los `package.json` y en `package-lock.json`; `backend/src`, `backend/prisma/schema.prisma`, `shared/src` y `frontend/src` sin `adapters/live`, `handlers/envivo`, `features/envivo`, `clases_en_vivo`, `GRABACION_LISTA`, `CLASE_POR_COMENZAR`, `SALA_LLENA` ni variables `LIVEKIT_*` (salvo los comentarios de `liveService.ts`). `webhooks/livekit` solo en `ARCHITECTURE.md:241`.
- **Coincide con el grupo C del arquitecto:** no queda nada funcional; solo el servicio `livekit` de `infra/docker-compose.yml:58-72`, `infra/livekit/livekit.dev.yaml`, el bloque `infra/.env.example:29-36`, `eslint.config.mjs:19`, `backend/src/adapters/README.md:5`, `liveService.ts` (comentarios y `export {}`) y `README.md` (raíz).
- **Cada aparición en documentos vivos tiene su cambio o su lugar en la lista**, salvo lo de N-01: PRD 326, 330 y 376 (P-5, P-6, P-9); ESSENTIALS 11, 16, 22, 52, 102 y 111-116 (E-1, E-2, E-3, E-5, E-7, E-8) y 32 (E-4, en la lista si DH-06 a); `AGENTS.md` 6, 48, 58, 64 y 74 (G-1 a G-5); `CLAUDE.md` 15, 16, 17, 21, 96, 105 y 260 (C-1 a C-8); `ARCHITECTURE.md` las 28 (R-2 a R-31, con las que quedan en §1, §4, §5, §12 y §20 en la lista); `.claude/agents/` (K-1 a K-4); `ESTADO.md` 119 (historial), 258, 275 y 532 (T-1, T-2, T-4).
- **El historial no se reescribe:** `docs/trabajo/` de otros encargos y las entradas fechadas de `ESTADO.md` quedan; D-10 y D-26 conservan su texto con una marca (corregir el alcance de la de D-26: M-02).
- **Fuera del repositorio versionado:** `.codex/agents/arquitecto.toml` y `tester.toml` (carpeta ignorada por `.gitignore:15`, sin seguimiento, del 2026-09-21) repiten las mismas tres líneas de LiveKit que DH-05 corrige. DOCS-05 no puede confirmarlas; va en "Para el humano".

### Estado de transición
El esquema de tres clases de frase (decisión, estado actual del repositorio, previsto o abierto) es correcto y evita falsedades: `docker compose up -d` sigue levantando `livekit` y G-2, R-3, R-9, R-12, R-13, C-3, E-8 y T-4 lo dicen; la regla 1 conserva `livekit-server-sdk` mientras ESLint lo vigile (DH-06 a); `adapters/live` se describe como "llega con ENVIVO" (C-7) y `BBB_URL`/`BBB_SECRET` como "previstos". T-1 sustituye en `ESTADO.md` 2b la frase de transición por la que dice dónde queda LiveKit a propósito y que no es una contradicción. Ninguna frase nueva obliga a detenerse por contradicción, con dos salvedades: M-02 (D-26) y N-01 (la lista de DOC5-02).

### Preguntas abiertas que no se cierran
Comprobado una por una contra inv. §9 y §4.7: colegio 1 → pregunta 7; colegio 2 y 5 y la restricción de independencia → 18; colegio 4 (salas del administrador) → 19 y RF-75; ENVIVO 1, 3, 4 y 5 (pestaña o embebida, grabación automática, webinar, cupo) → 20, con RF-41 y RNF-06 marcados; las cuatro de 4.7 → 21 y RF-76; proveedor 1 a 5 → 22. Solo constan como cerradas las de S-01 (las tres del humano, las seis del dueño, la retención y la hoja de ruta). El modo webinar, hoy escrito como decidido en `ARCHITECTURE.md:351` y ESSENTIALS:113, pasa a abierto: es lo que pide la investigación (§9, ENVIVO 4) y el humano dejó esas preguntas abiertas; no es un cambio de decisión por criterio del arquitecto. Ningún texto nuevo dice pestaña nueva, webinar, grabación automática ni propósito de las salas. Única excepción: M-01.

### PRD
- **Numeración:** en la base, el último RF es RF-74, la última RN es RN-11, la última pregunta de §11 es la 17 y la última decisión es D-32; `RF-75`, `RF-76`, `RF-77`, `RN-12` y `D-33` no aparecen en ningún documento (`git grep` en `685fc2b`). §4.7 está libre (§4.1 a §4.6). Bien.
- **Las seis decisiones del dueño** quedan como requisito y fieles: 1 (un sentido; maestro, actividades y calificaciones propios) y 2 (en cuanto están listas, sin revisión) y 3 (recursos de aprendizaje sí, del docente no) en RF-76; 4 (un archivo por referencia), 5 (nada se borra solo; el maestro no quita; solo el Administrador borra) y 6 (antigüedad desde la fecha de grabación, solo un dato) en RF-77. Las tres del humano, en RF-76 y RF-77. La condición «si el proveedor entrega el video por API» viene de la investigación (§9, ENVIVO 2) y está bien conservada (S-02).
- **RNF-06** (P-5) quita LiveKit, conserva los cupos configurables y deja abierto el cupo por sala. **RNF-10** (P-6) sigue DH-02 a. **RNF-13** (P-7) según DH-07. RF-41 (P-1) con la marca de pendiente en el mismo renglón. Preguntas 7 y 9 bien.

### `ARCHITECTURE.md` y ESSENTIALS
Todo lo que la tabla de inv. §10 lista para cada uno tiene su cambio: principio 1 (R-2), pila (R-5, R-6), diagrama (R-7), costos (R-8), `dev` y entornos (R-10, R-11), árbol de `infra/` (R-13), adaptador `live` (R-15), rutas con el webhook (R-17), tokens de R2 de Egress (R-20), §12 completa (R-21), capacidad (R-24) y la decisión nueva D-33 (R-32); en ESSENTIALS, proveedores (E-1), pila y "Video" (E-2, E-3), el alumno restringido (E-5) y "Clases en vivo" (E-8). Lo previsto de inv. §4 entra a `ARCHITECTURE.md` como "Previsto (DOCS-05), no decidido" y a ESSENTIALS solo como "previsto" en "Tablas" (S-03), sin reglas nuevas. D-33 separa bien lo decidido (humano y dueño, 2026-11-11) de lo abierto, y nombra el contraste con D-32 (referencia frente a objetos propios, R-03). R-19 deja escrito para ENVIVO que `BORRAR_OBJETOS` y `LIMPIEZA_DIARIA` no pueden borrar una grabación que otra clase muestra.

### `docs/DESIGN.md`
D-1 toca solo la celda de §7.1 "Alcance por pantalla" (`DESIGN.md:361`), con marca "propuesta (DOCS-05)" y sin decidir pestaña o embebida. Las salas del administrador quedan cubiertas por la fila opaca del administrador. No es un patrón visual nuevo. **DOC5-03:** `frontend/src/styles/tokens-r1.ataque.test.ts` importa `docs/DESIGN.md?raw` y corta por `### Tokens`…`### Materiales`, `### Radios`…`### Bordes` y `### Escala`…`## 5.`, más `toContain` de valores de tokens; la línea 361 está en §7, después de `## 5.`, y D-1 no toca ninguno de esos títulos ni tablas. Ninguna otra prueba lee `docs/`, `AGENTS.md`, `CLAUDE.md` ni `.claude/` (las de `backend/test` que leen `eslint.config.mjs` no dependen de la lista de librerías, y el plan no toca ese archivo).

### "Se toca", conteo, pasos y comprobaciones
"Se toca" y "No se toca" coinciden con la petición (sin código, `infra/`, `eslint.config.mjs`, `README.md` ni `backend/src/adapters/README.md`). Unos 14 archivos (15 con N-02): una sola entrega, bien justificada contra el umbral de unos 30. `lint` y `build` no cambian: `.prettierignore` excluye `docs/`, `.claude/` y `/*.md`, y cada paquete corre Prettier solo sobre su carpeta. Los pasos son de un documento a la vez, de arriba abajo, con los textos literales o descripciones acotadas. DOC5-01 a DOC5-08 cubren lo que importa (con N-01 y N-02 corregidos).

## Postura sobre las decisiones para el humano (DH-01 a DH-08)

| DH | ¿Opciones bien planteadas? | Postura del manager |
|---|---|---|
| DH-01 · quién edita | Sí, con una salvedad: falta la opción mixta | **Coincido en parte con (a): mixta.** El precedente de DOCS-04 es real (`aprobacion.md` de DOCS-04: el orquestador tomó la petición como autorización expresa para que el arquitecto escribiera fuera de `docs/trabajo/`, **limitada a cinco documentos**: PRD, `ARCHITECTURE.md`, ESSENTIALS, `DESIGN.md` y `ESTADO.md`, y **dejó fuera `CLAUDE.md` y `AGENTS.md`**). Aquí la petición no dice quién edita, así que la autorización tiene que ser expresa y por escrito, con la lista de archivos (`arquitecto.md:20-21` lo limita a `docs/trabajo/`). Para `CLAUDE.md`, `AGENTS.md` y `.claude/agents/` rige la práctica de `ESTADO.md` §4: «los aplica el orquestador con la autorización del humano; los agentes proponen el texto literal». El plan ya trae ese texto literal (C-1 a C-8, G-1 a G-5, K-1 a K-4), así que recomiendo: **el arquitecto edita PRD, `ARCHITECTURE.md`, ESSENTIALS, `DESIGN.md`, `ESTADO.md` (2b, §3 y §5) y las notas de las investigaciones; el orquestador transcribe tal cual C-, G- y K- con cotejo.** El recorrido propuesto (sin tester, mi revisión del `git diff 685fc2b` documento por documento, el grep de cierre DOC5-02 y la prueba DOC5-03) es **suficiente** para un encargo sin código: es el de DOCS-04, que encontró cuatro M en la primera revisión. (b) no aporta nada. |
| DH-02 · proveedores aprobados | Sí | **Coincido con (a).** Es la única compatible con la regla 11 tal como está: «nada … sin aprobación explícita»; aprobar la categoría (c) dejaría entrar a un proveedor sin términos ni privacidad revisados, con voz e imagen de menores, y (b) adelanta una aprobación que la investigación condiciona a la pregunta 22 y al aviso de privacidad (18). (a) además dice quién aprueba la cuenta del plan gratuito de `dev`, que la hoja de ruta necesita. Zoom no entra a la lista (es alternativa registrada, no aprobada): bien. Detalle de redacción en "Detalles menores". |
| DH-03 · quién retira LiveKit | Sí | **Coincido con (a).** La primera subentrega de ENVIVO ya toca `infra/` y `.env.example` y crea `adapters/live`: retirar en el mismo cambio que pone lo nuevo evita un encargo sensible más y mantiene ESLint y la regla 1 juntos. El residuo no estorba y los documentos lo dicen (T-1, T-3, T-4). (c) no. |
| DH-04 · las dos investigaciones | Faltan opciones: ninguna separa una de otra | **Coincido con (a) para la de ENVIVO y con (c) para la de DEPLOY (opción mixta).** La nota fechada de V-1 es aditiva, como las dos actualizaciones que ya tiene el documento, y evita que entre a git un archivo que se declara "PROPUESTA… siguen documentando LiveKit". La de DEPLOY no: el humano solo nombró la de ENVIVO para el commit y dijo que las dos estaban "sin confirmar, no es una discrepancia"; meter a git las 682 líneas de DEPLOY también mete conclusiones suyas que no son de este encargo y que contradicen documentos vivos (por ejemplo, R2 "descartado" frente a D-09), sin revisión. Que se quede fuera, sin tocar, con la fila de §3 que el plan ya prevé para (c), destino DEPLOY. La referencia de la investigación de ENVIVO a un archivo sin versionar es menor (V-1 puede decir que DEPLOY aún no está en git). Si el humano prefiere versionar las dos, (a) completa está bien; (b) no, porque deja en git sin nota la frase falsa de que las grabaciones "dejan de contar" en el volumen. |
| DH-05 · definiciones de agentes | Sí | **Coincido con (a), con autorización expresa del humano y aplicada por el orquestador** (DH-01 mixta). `arquitecto.md:23` le prohibiría al arquitecto de ENVIVO proponer un proveedor de BigBlueButton, y `tester.md:39` y `:49` lo mandarían a buscar "tokens de LiveKit". Solo esas tres líneas, más `tester.md:84` según DH-06. No están en la tabla de inv. §10: por eso es decisión del humano, bien planteada. |
| DH-06 · `livekit-server-sdk` en la regla 1 | Sí | **Coincido con (a).** Nombrar una librería que nadie importa no hace falsa la regla, y separar la regla de ESLint (que cita "Regla 1 de AGENTS.md") abriría una contradicción real entre documento y código. ENVIVO la quita de las seis listas a la vez (fila de T-3). |
| DH-07 · costo del video | Sí | **Coincido con (a).** Aunque no esté en la tabla de inv. §10, las tres frases están en archivos de esa tabla y quedarían falsas: un proveedor alojado se paga por capacidad simultánea, no por uso (inv. §2 y §5). No cierra nada: la aprobación del gasto sigue en la pregunta 18. |
| DH-08 · identificadores y prioridad | Sí | **Coincido con (a).** Numeración verificada (arriba). El requisito de RF-75 (el Administrador crea salas sin depender de un maestro) lo dio el dueño el 2026-11-10; lo que falta es el propósito, que queda marcado. M en los tres. |

## R-01 · copiar las grabaciones frente a la regla 6
Basta con registrarlo para ENVIVO, como hace el plan (fila de T-3, R-19, E-8 y D-33 con "cómo copia, lo fija ENVIVO"). El PRD no debe decir nada del mecanismo: es un documento de producto, y la decisión del humano (copiar y ligar) ya está, con la condición de la investigación. ESSENTIALS sí debe nombrar el choque, porque es el documento que "manda" y es donde un agente de ENVIVO buscaría la regla de archivos: E-8 lo hace en su viñeta de "Abierto". Lo único que corregir es la redacción (N-03), para que no presuma ninguna de las dos salidas. Si la salida es la excepción, toca la regla 6 de `AGENTS.md` ("Reglas que no se rompen") y la decide el humano en el plan de ENVIVO, como dice la fila. Recomendación para ese plan, además de la del arquitecto: medir el egreso del Droplet y el tiempo de una grabación de 2 h (unos 1 GB a 0.4788 GB/h) antes de proponer la excepción.

## Detalles menores
- C-4 y C-8 (`CLAUDE.md`) resumen DH-02 sin «por escrito» ni «también para el plan gratuito de desarrollo»; E-1, G-5, P-6, R-2 y K-1 sí lo dicen o remiten a la regla 11. Como `CLAUDE.md` lo leen todos los agentes, conviene que C-4 diga lo mismo o remita expresamente a la regla 11 (C-4 ya remite; C-8 no).
- `ARCHITECTURE.md` §11 (tabla de buckets) conserva `grabaciones/{claseId}/` "sin cambio": con un archivo por referencia y salas del administrador sin clase, la clave puede no ser por clase. Conviene la marca "la clave la fija ENVIVO" o dejarlo explícito en R-19.
- La tabla de "Inventario por grep" dice «300 apariciones en 60 archivos» contando `docs/trabajo/`; fuera de `docs/trabajo/` son 85 en 15. No cambia nada, pero DOC5-02 se mide sobre lo segundo.
- R-10 dice que el plan gratuito es «la única cuenta externa de `dev`»: hoy es cierto (el correo usa el canal `registro`); conviene no repetirlo en otros textos para que no envejezca.

## Desacuerdos arbitrados
Ninguno. No hay desacuerdos con ESSENTIALS: DOCS-05 cambia ESSENTIALS por una decisión del humano, no por criterio del arquitecto.

## Documentos a actualizar
Los del propio plan. Fuera del plan, nada más en documentos vivos. El orquestador anota en `aprobacion.md` el SHA-256 de `plan.md` tras la enmienda (con la copia previa en el scratchpad, regla de `AGENTS.md`) y, al cerrar, los de "Se toca" (DOC5-08).

## Para el humano
1. **DH-01:** autorizar por escrito quién edita qué. Recomiendo la mixta: el arquitecto, los documentos de `docs/` y las notas; el orquestador, `CLAUDE.md`, `AGENTS.md` y `.claude/agents/` con el texto literal del plan.
2. **DH-04:** si la investigación de DEPLOY entra o no en el commit de DOCS-05. Recomiendo que no (solo la de ENVIVO, con su nota).
3. **DH-05:** autorizar o no el cambio de tres líneas de `.claude/agents/arquitecto.md` y `tester.md`. Recomiendo que sí.
4. Las demás (DH-02, DH-03, DH-06, DH-07, DH-08): coincido con la recomendada.
5. Información: `.codex/agents/arquitecto.toml` y `tester.toml` (copias locales, ignoradas por git, del 2026-09-21) siguen nombrando LiveKit Cloud como aprobado. DOCS-05 no puede confirmarlas. Si todavía usa esas definiciones, hay que actualizarlas a mano; si no, se pueden ignorar.

## Verificación de la Enmienda 1 — DOCS-05 (2026-11-12)
Veredicto: **APROBADO** (el plan puede ir al humano con sus decisiones; sin M-nn nuevos)
Verificación propia: solo lectura, sin suites. `plan.md`: 528 líneas, SHA-256 `e58f62d3b5972dd74fbd850d39155bc1ec64dcc4350fb4cd11988162dcd5bae9`, igual al de la última entrada de `aprobacion.md`. Copia previa `plan-docs5-antes-e1-beb11b4d.md` del scratchpad: SHA-256 `beb11b4d…`, igual al plan revisado. `git diff --no-index` completo: 1 archivo, 55 inserciones y 33 borrados, **35 hunks**, revisados uno por uno (con `--word-diff`).

### Cotejo de los hunks
- **Encabezado "Enmiendas"**: resume la enmienda; dice lo mismo que los hunks.
- **M-01**: RN-12, cuarta viñeta (P-3), queda como «objetivo del cliente: que archivar o borrar definitivamente una clase no deje a la otra sin lo que ya recibió»; no dice nada de borrar una grabación, y «cómo se cumple lo fija ENVIVO». Si borrar o editar un recurso en la clase de origen alcanza a la vinculada se agrega como pendiente en RF-76 (P-2) y en la pregunta 21 (P-10). E-10 (ESSENTIALS) dice lo mismo, sin la frase de la grabación. DOC5-05 lo comprueba. **Resuelto.** No cierra nada de inv. §4.7 ni de §9: el objetivo es el contexto del cliente, ahora dicho como objetivo; la única pregunta que toca, la abre más. Derivado correcto: E-8 y R-21 dejan de decir «las cuatro preguntas de clases vinculadas» (ahora son cinco).
- **M-02**: R-31 separa las marcas (D-10, sustituida entera; D-26, «en lo de clases en vivo; sigue vigente la verificación del correo de recuperación en DEPLOY»); R-26 deja D-26 para el correo y D-33 para la grabación en la línea 516, cuyo texto «Actual» coincide con `ARCHITECTURE.md:516`; la 531 no cambia; D-33 (R-32), S-05 y T-1 dicen lo mismo. **Resuelto.**
- **N-01**: la lista de DOC5-02 admite las líneas de §2 y 2b de `ESTADO.md` que lleva el orquestador, §14 (R-22) y "Tablas" de ESSENTIALS (E-6); DOC5-02 trae la referencia de 85 apariciones en 15 archivos. **Resuelto.**
- **N-02**: punto 15 de "Se toca" (lo lleva el orquestador), salvedad en "No se toca", DOC5-01, paso 12 y conteo («unos 15 archivos, 14 con DH-04 d»; una sola entrega). **Resuelto.**
- **N-03**: E-8, su nota, R-19 y R-21 dicen «cómo llega una grabación a nuestro almacenamiento: si cabe en la regla 6 … o necesita una excepción, que decide el humano»; R-7 deja solo `W -. sondeo de grabaciones .-> BBB` y no dibuja ninguna flecha de copia. **Neutrales de verdad:** dan por hecha la copia (la decisión del humano: se copian a nuestro almacenamiento y quedan ligadas a su clase) y dejan abierto solo el mecanismo; ninguna presume la salida por S3 ni la excepción. R-18 (`GRABACION_LISTA` «copia … cómo copia lo fija ENVIVO») ya era neutral. **Resuelto.**
- **N-04**: P-4 separa por rol (el maestro programa y entra; el estudiante entra; "Grabaciones" del estudiante donde está; dónde la ve el maestro lo fija ENVIVO). No cierra nada. **Resuelto.**
- **DH-01 y DH-04**: la opción (d) mixta, con mis motivos, fieles a `revision.md`; la de DH-04 agrega a V-1 una frase (la investigación de DEPLOY aún no está en git) y la fila de §3 con destino DEPLOY. La introducción de las decisiones dice que en DH-01 y DH-04 el humano elige de forma expresa. Los demás textos de DH-01 a y DH-04 a solo cambian «Recomendada» por «Recomendada por el arquitecto».
- **Detalles menores**: C-8 remite a la regla 11 («aprobado por escrito por el humano»); R-19 dice que la clave del objeto la fija ENVIVO.
- **Sección nueva** "Para el humano (dato, sin decisión pendiente)" con `.codex/agents/` y la nota del paso 12 sobre DH-01 d.

Nada cambió fuera de lo pedido: los 35 hunks son de M-01, M-02, N-01 a N-04, DH-01, DH-04, los dos detalles, el encabezado y el dato de `.codex/`. Sin restos: ninguna aparición de «pasar por Node», «sondeo y copia» ni «al borrar una grabación» en el plan.

**Observación, no bloquea:** con DH-04 d, la sexta fila nueva de §3 (T-3; costo del volumen) sigue citando `docs/trabajo/DEPLOY-investigacion-vps.md` en "Dónde está anotado", un archivo que no entra a git. Es correcto (el archivo existe en la copia de trabajo y V-1 lo explica); solo conviene saberlo en la revisión final.

### Resumen del plan para el humano
1. DOCS-05 cambia LiveKit por BigBlueButton por API con un proveedor alojado en PRD, `ARCHITECTURE.md`, ESSENTIALS, `DESIGN.md` (una celda), `ESTADO.md`, `CLAUDE.md`, `AGENTS.md` y, si lo autoriza, tres líneas de `.claude/agents/`. Sin código ni `infra/`.
2. PRD: §4.7 nueva con RF-75 (salas del Administrador; para qué, pendiente), RF-76 (clases vinculadas) y RF-77 (grabaciones: se copian, un solo archivo, nada se borra solo, solo el Administrador las borra); RN-12; RF-41, RNF-06, RNF-10 y RNF-13 ajustados; preguntas 7 y 9 actualizadas y 18 a 22 nuevas.
3. Quedan registradas sus tres decisiones y las seis del dueño. Todo lo demás de las secciones 4.7 y 9 queda abierto para ENVIVO: pestaña o embebida, grabación automática, webinar, cupo, salas del Administrador, las preguntas de clases vinculadas y las del proveedor.
4. `ARCHITECTURE.md`: §12 reescrita y D-33 nueva (sustituye a D-10 y, en lo de clases en vivo, a D-26; la verificación del correo en DEPLOY sigue en D-26). Lo previsto de la investigación queda marcado "no decidido".
5. Lo que queda de LiveKit en el repositorio (servicio de `infra/`, ESLint, `liveService.ts`, `README.md`) se describe como "sin uso" y lo retira ENVIVO; los documentos no afirman nada falso sobre el repositorio.
6. Riesgo abierto para ENVIVO (R-01): copiar las grabaciones a nuestro almacenamiento roza la regla 6 (los archivos no pasan por Node); lo decide usted en ese plan.
7. Unos 15 archivos, una sola entrega; sin tester; revisión final del manager con el diff, un grep de cierre y una prueba de `DESIGN.md` (antes se le pregunta si la otra copia corre una suite).

### Lista final de decisiones (DH-01 a DH-08)
**DH-01 · Quién edita.**
- (a) El arquitecto edita todo lo de "Se toca", con su autorización por escrito.
- (b) El programador aplica los textos del plan.
- (c) El orquestador transcribe todo con cotejo.
- (d) Mixta: el arquitecto edita los documentos de `docs/` y las notas; el orquestador transcribe `CLAUDE.md`, `AGENTS.md` y `.claude/agents/`.
- Arquitecto: (a). Manager: (d). Usted elige de forma expresa y por escrito.

**DH-02 · Proveedores aprobados.**
- (a) Un proveedor alojado de BigBlueButton que usted aprueba por escrito al contratarlo, también para el plan gratuito de desarrollo; LiveKit Cloud sale.
- (b) Aprobar ya a Aulas en Vivo.
- (c) Aprobar la categoría (cualquier servidor compatible), sin aprobación por proveedor.
- Arquitecto: (a). Manager: (a).

**DH-03 · Quién retira lo que queda de LiveKit.**
- (a) La primera subentrega de ENVIVO.
- (b) Un `chore` de `infra/` propio, antes de ENVIVO (carril sensible).
- (c) Hasta DEPLOY.
- Arquitecto: (a). Manager: (a).

**DH-04 · Las dos investigaciones sin confirmar.**
- (a) Nota fechada en las dos y las dos entran al commit.
- (b) Las dos entran sin nota; `ESTADO.md` dice que mandan los documentos vivos.
- (c) Solo la de ENVIVO, sin tocarla; la de DEPLOY, fuera y a DEPLOY.
- (d) Mixta: la de ENVIVO con su nota entra al commit; la de DEPLOY se queda fuera, sin tocar, con fila de destino DEPLOY.
- Arquitecto: (a). Manager: (d). Usted elige de forma expresa.

**DH-05 · Las definiciones de agentes** (`arquitecto.md:23`, `tester.md:39` y `:49`).
- (a) DOCS-05 cambia esas tres líneas y nada más.
- (b) Se dejan para ENVIVO.
- Arquitecto: (a). Manager: (a), con su autorización expresa (las aplica el orquestador si DH-01 d).

**DH-06 · `livekit-server-sdk` en las listas de la regla 1.**
- (a) Se queda en los documentos; ENVIVO la quita de todas las listas y de ESLint a la vez.
- (b) DOCS-05 la quita ya de los documentos; ESLint la sigue vigilando hasta ENVIVO.
- Arquitecto: (a). Manager: (a).

**DH-07 · El costo del video** (`ARCHITECTURE.md` cabecera y principio 3, PRD RNF-13).
- (a) Cambiar «pago por uso» en video por «plan mensual por capacidad, ajustable entre periodos sin cambiar código».
- (b) No tocarlo y dejarlo al plan de ENVIVO.
- Arquitecto: (a). Manager: (a).

**DH-08 · Identificadores y prioridad.**
- (a) PRD §4.7 con RF-75 a RF-77 en prioridad M, RN-12, preguntas 18 a 22 y D-33.
- (b) Lo mismo con RF-75 en "Por confirmar".
- Arquitecto: (a). Manager: (a).

## Verificación de la Enmienda 2 — DOCS-05 (2026-11-12)
Veredicto: **APROBADO** (sin M-nn; el plan queda listo para que el arquitecto edite)
Verificación propia: solo lectura, sin suites. `plan.md`: 563 líneas, SHA-256 `0518189d4e1ac3c66f85837e8a5b13a6d8b1f9c2ec77febe3da77c3d80609673`, igual al de `aprobacion.md`. Copia previa `plan-docs5-antes-e2-e58f62d3.md`: `e58f62d3…`, el plan que aprobé en la Enmienda 1. `git diff --no-index` completo: 125 inserciones y 90 borrados, **59 hunks**, revisados uno por uno. `docs/ESTADO.md` actual: `14812d02…`, igual a la última entrada de `aprobacion.md`. Contrato: las entradas de `aprobacion.md` desde "Decisiones del humano sobre el plan (2026-11-12)", con el cambio de hoja de ruta literal.

### Las ocho decisiones, en firme
- La tabla nueva "Decididas por el humano el 2026-11-12" y una línea "Decidido por el humano" en cada DH coinciden con `aprobacion.md`: DH-01 (d) con autorización por escrito; DH-02, DH-03, DH-06, DH-07 y DH-08 (a); DH-04 (d); DH-05 (a), solo `arquitecto.md:23`, `tester.md:39` y `:49`.
- **No queda ninguna variante condicional activa.** E-4, G-4, K-4, R-14 dicen "sin cambio (DH-06 a)"; R-1, R-4 y P-7 se aplican (DH-07 a); T-1 queda con un solo texto; V-1 lleva su frase de (d); V-2 "no se aplica", con su texto conservado solo como insumo para DEPLOY. Los "si DH-…" que quedan están en el registro de opciones de DH-01 y DH-02, que es historia.
- **"Se toca": exactamente 14 archivos**, con quién edita cada uno: 1 a 5 y 10 el arquitecto (PRD, `ARCHITECTURE.md`, ESSENTIALS, `DESIGN.md`, `ESTADO.md` en 2b, §3 y §5, y V-1); 6 a 9 el orquestador (C-1 a C-8; G-1, G-2, G-3 y G-5; K-1 a K-3); 11 a 13 la carpeta del encargo; 14 el `aprobacion.md` de CHORE-04. `DEPLOY-investigacion-vps.md` está en "No se toca" y en "No entra"; DOC5-01 comprueba que siga sin seguimiento y sin cambios, y que en `.claude/agents/` solo cambien las tres líneas.
- **Pasos:** 1 a 7 del arquitecto; 8 del orquestador (transcripción con cotejo de C-1 a C-8, G-1, G-2, G-3, G-5 y K-1 a K-3, nada más de `.claude/agents/`); 9 orquestador (hashes y pregunta por la otra copia antes de DOC5-03); 10 manager; 11 humano. Sin tester. El bloque de `git add` nombra los 14 archivos y excluye de forma expresa la investigación de DEPLOY.

### La hoja de ruta nueva
- **Textos que DOCS-05 escribe, revisados contra el orden nuevo:** T-2 (punto 9 de 2b: "Actual" igual a `ESTADO.md:281`; ya no dice "antes de NOTIFICACIONES"); R-21 (`CLASE_POR_COMENZAR` es un trabajo diferido cuyo aviso llega con NOTIFICACIONES, después de DEPLOY); R-20 ("credenciales del almacén", sin R2); R-7 (el aviso de grabación lista va a la API, no al nodo de Cloudflare); R-27, la pregunta 18 y una fila de T-3 con la consecuencia 5 (la cuenta a nombre del colegio es requisito para salir a producción con clases en vivo; el gasto, pendiente). Ninguno queda falso con el orden nuevo. La pregunta 18 deja de preguntar si la cuenta va a nombre del colegio porque el humano ya lo decidió (consecuencia 5): es correcto, no es cerrar una pregunta por cuenta propia.
- **Sin ampliar el alcance hacia DEPLOY:** ningún texto describe el servidor propio, MinIO en un volumen ni el abandono de Pages o R2. R-20 solo evita escribir de nuevo "R2" en la frase que ya reescribía; R-26 y R-28 ya decían "nuestro almacenamiento". Todo lo demás va a "Pendientes por la hoja de ruta nueva", con destino.
- **¿Algo de esa lista se debe corregir ya? No.** Los renglones que DOCS-05 reescribe solo en su parte de video (principio 1, RNF-10, ESSENTIALS "Proveedores", regla 11 de `AGENTS.md`, `CLAUDE.md` "Proyecto" y la fila `prod` de "Entornos") siguen nombrando Cloudflare, pero lo hacen como **proveedor aprobado**, y eso sigue siendo verdad: aprobar no obliga a usar Pages ni R2, y la investigación de DEPLOY no retira a Cloudflare de la lista. Cambiar esos renglones sería decidir la arquitectura de DEPLOY dentro de DOCS-05. **Para que ningún agente se detenga:** la consecuencia 4 de `ESTADO.md` 2b ya dice, literal, «Hasta entonces no es una contradicción que detenga a un agente», y es la sección que se lee al inicio de cada sesión. No hace falta otra frase. Lo que sí importa para ENVIVO, que va antes de DEPLOY: los textos de DOCS-05 hablan de "nuestro almacenamiento" y de `campus-privado/grabaciones/`, que valen igual con R2 que con un almacén propio.
- **Pendientes 2 y 3:** el orquestador ya escribió la fila de §3 (avisos encolados sin consumidor en producción; destino DEPLOY y NOTIFICACIONES) y la nota de los puntos 7b y 8; los dos dicen lo que el plan propone.

### Comprobaciones y lista del grep
- Líneas de `ESTADO.md` citadas del árbol de la Enmienda 2 (264, 267, 281, 538) coinciden con el archivo que verificó el arquitecto; tras la fila nueva de §3, la nota de §5 está hoy en la 539. El plan dice que, si se mueven, manda el texto "Actual": basta.
- La lista de DOC5-02 admite, como historial a cargo del orquestador, la viñeta nueva de 2b, la marca de "primera versión" y la fila de higiene de pruebas (hoy ninguna nombra LiveKit). DOC5-01 y DOC5-08 ajustados a DH-04 d. Punto de ataque 7 nuevo (frases que dependan de la hoja de ruta vieja o que afirmen Pages o R2 como destino de producción): bien. R-08 y R-09 nuevos: bien.
- **Nada fuera de lo pedido:** los 59 hunks son de las decisiones, de la hoja de ruta, de las líneas de `ESTADO.md` y de la sección de pendientes.

### Detalles menores (no requieren otra enmienda)
- La fila DH-01 de la tabla dice "G-1 a G-5"; G-4 no cambia (el paso 8 y "Se toca" lo dicen bien).
- T-2 dice «antes del retiro de compatibilidad e higiene de pruebas y de DEPLOY, que llega justo después»: se entiende, pero quien edite puede escribir «y después, DEPLOY» para que "justo después" no parezca saltarse el `chore`.

### Resumen del plan final para el humano
1. **Qué hace:** cambia LiveKit por BigBlueButton por API con un proveedor alojado en PRD, `ARCHITECTURE.md`, ESSENTIALS, `DESIGN.md` (una celda), `ESTADO.md`, `CLAUDE.md`, `AGENTS.md` y tres líneas de `.claude/agents/`. Sin código ni `infra/`.
2. PRD: §4.7 con RF-75 (salas del Administrador), RF-76 (clases vinculadas) y RF-77 (grabaciones copiadas, un solo archivo, nada se borra solo, solo el Administrador borra); RN-12; RF-41, RNF-06, RNF-10 y RNF-13; preguntas 7, 9 y 18 a 22. `ARCHITECTURE.md`: §12 y D-33.
3. Sus decisiones: DH-01 (d), DH-02 (a), DH-03 (a), DH-04 (d), DH-05 (a), DH-06 (a), DH-07 (a), DH-08 (a). No se cierra ninguna pregunta de ENVIVO.
4. **Tamaño:** 14 archivos, una sola entrega.
5. **Quién edita:** el arquitecto, los documentos de `docs/` y la nota de la investigación de ENVIVO; el orquestador transcribe con cotejo `CLAUDE.md`, `AGENTS.md` y las tres líneas de `.claude/agents/`. Sin tester.
6. **Cómo se verifica:** revisión final del manager con el diff contra `685fc2b`, el grep de cierre y una sola prueba de `DESIGN.md` (antes se le pregunta si la otra copia corre una suite). Usted decide el commit; la investigación de DEPLOY no entra.
7. **Pendiente con destino:** retirar lo que queda de LiveKit y poner `BBB_URL`/`BBB_SECRET` (ENVIVO); copiar grabaciones frente a la regla 6 y el borrado con grabaciones compartidas (ENVIVO, decisión suya); la cuenta del proveedor a nombre del colegio y el aviso de grabación lista (DEPLOY); Cloudflare Pages y R2 en los documentos, la investigación de DEPLOY y los avisos acumulados sin NOTIFICACIONES (DEPLOY y NOTIFICACIONES); las preguntas al colegio y al proveedor (usted, antes de DEPLOY).

## Revisión final — DOCS-05 (2026-11-12)
Veredicto: **APROBADO CON OBSERVACIONES** (sin M-nn; una observación opcional sobre el diagrama de Mermaid, O-F-1, que no bloquea el commit)
Verificación propia: `lint` y `build` no aplican (solo Markdown; `.prettierignore` excluye `docs/`, `.claude/` y `/*.md`). Única corrida, DOC5-03, desde `frontend/`: `npx vitest run src/styles/tokens-r1.ataque.test.ts` → `Test Files  1 passed (1)` · `Tests  19 passed (19)` (6.09 s). Equipo conectado a la corriente (`BatteryStatus` 2, 67 %). La segunda copia de trabajo ya no se usa (dicho por el humano, registrado en `aprobacion.md`). `plan.md`: `0518189d…`, el aprobado. Los SHA-256 de los 11 archivos del paso 9 (`aprobacion.md`) coinciden con mi cálculo, incluida la investigación de DEPLOY (`a13a5b57…`, sin cambios).

Contrato: la petición literal del humano (2026-11-11), el plan aprobado (Enmiendas 1 y 2) y las decisiones del 2026-11-12 (DH-01 d, DH-04 d, demás en a; hoja de ruta nueva).

### Comprobaciones del plan
| Id | Resultado |
|---|---|
| DOC5-01 · nada fuera de los documentos | **Bien.** `git diff --stat 685fc2b -- frontend backend shared infra eslint.config.mjs package.json package-lock.json README.md .prettierignore`: vacío. `git status --porcelain --untracked-files=all`: los 10 modificados con seguimiento y los 4 sin seguimiento de "Se toca" (la investigación de ENVIVO y los tres de la carpeta del encargo), más `docs/trabajo/DEPLOY-investigacion-vps.md`, sin seguimiento y sin cambios (`a13a5b57…`). En `.claude/agents/`: un renglón en `arquitecto.md` (23) y dos en `tester.md` (39 y 49); `tester.md:84` sin cambio. |
| DOC5-02 · grep de cierre | **Bien.** `git grep --untracked -n -i -E "livekit\|egress"` fuera de `docs/trabajo/`, `infra/`, `eslint.config.mjs`, `backend/`, `frontend/`, `README.md` y `**/.env`: 32 renglones, todos en la lista del plan (`tester.md:84`; `AGENTS.md` 48, 58, 64 y 74; `CLAUDE.md` 17 y 96; ESSENTIALS 11, 32, 80 y 115; `ARCHITECTURE.md` 11, 112, 121, 155, 166, 351, 355, 429, 588, 604 y 611; `ESTADO.md` 119, 240, 264, 267, 281, 524, 528, 531 y 547; PRD 199). `webhooks/livekit`: ninguno. `Egress`: solo `ARCHITECTURE.md:604` (celda de D-26). |
| DOC5-03 · `DESIGN.md` se sigue leyendo | **Bien:** `Tests  19 passed (19)`. |
| DOC5-04 · numeración | **Bien.** `RF-75`, `RF-76`, `RF-77`, `### RN-12`, `### 4.7` y `D-33` aparecen una sola vez como fila o encabezado. Preguntas de §11: 1 a 22, sin huecos ni repetidos. Cada referencia nueva apunta a la pregunta correcta (19 salas, 20 aula, grabación y cupo, 21 clases vinculadas, 22 proveedor). |
| DOC5-05 · ninguna pregunta abierta cerrada | **Bien.** Las cuatro de inv. §4.7 (más la de borrar o editar un recurso) en RF-76 y la pregunta 21; colegio 1, 2, 4 y 5 en 7, 18 y 19; proveedor 1 a 5 en 22; ENVIVO 1, 3, 4 y 5 en 20, RF-41 y RNF-06. Ningún texto dice pestaña nueva, webinar, grabación automática, cupo ni propósito de las salas; RN-12 y E-10 hablan del objetivo del cliente solo al archivar o borrar una clase. Constan como decididas solo las de S-01 y la consecuencia 5 (cuenta a nombre del colegio). |
| DOC5-06 · tablas íntegras | **Bien.** Conteo mecánico de columnas en todas las tablas de PRD, `ARCHITECTURE.md`, ESSENTIALS, `DESIGN.md`, `ESTADO.md`, `CLAUDE.md` y `AGENTS.md` (sin contar `|` dentro de código): ninguna fila difiere de su encabezado. |
| DOC5-07 · fidelidad | **Bien** (detalle abajo). |
| DOC5-08 · hashes | **Bien:** los 11 de `aprobacion.md` coinciden. |

### Fidelidad, documento por documento (`git diff 685fc2b`)
- **Orquestador (paso 8):** `CLAUDE.md` C-1 a C-8, `AGENTS.md` G-1, G-2, G-3 y G-5, `arquitecto.md` K-1 y `tester.md` K-2 y K-3, palabra por palabra iguales al plan (C-8 con «aprobado por escrito por el humano; `AGENTS.md`, regla 11», de la Enmienda 1). 15 renglones en 4 archivos; nada más.
- **PRD (P-1 a P-10):** iguales al plan, en su lugar (§4.7 tras RF-74; RN-12 tras RN-11; la viñeta de §6 al final del bloque de ADMIN-01, con el texto por rol de N-04; RNF-06, RNF-10 y RNF-13; hito 2; preguntas 7, 9 y 18 a 22, con la 18 de la Enmienda 2).
- **ESSENTIALS (E-1 a E-3 y E-5 a E-10; E-4 sin cambio):** iguales; E-6 queda entre el "Previsto (DOCS-04)" y el "Hecho en ADMIN-01"; E-8 con la redacción neutral de N-03.
- **`ARCHITECTURE.md` (R-1 a R-13 y R-15 a R-32; R-14 sin cambio):** iguales donde el plan da texto. Donde solo describía, el texto redactado no agrega nada: R-7 (diagrama, sin flecha de copia; el aviso va a la API), R-17 (fila `envivo`, "Sin rutas fijadas … Previsto"), R-19 (punto 10 de §11), R-23 (fila guía "Previsto (DOCS-05)" y cinco filas, en la tabla "Previsto", con las columnas de la tabla), R-29 (paso 7) y R-31 (D-10 entera; D-26 solo en lo de clases en vivo). La línea 516 cita D-26 para el correo y D-33 para la grabación; la 531 no cambió. Ninguna frase afirma algo falso del repositorio: `adapters/live`, `BBB_URL` y `BBB_SECRET` van como "previstos" o "llega con ENVIVO", y el servicio `livekit` como "sin uso, lo retira ENVIVO".
- **`DESIGN.md` (D-1):** solo la celda de §7.1, con la marca "propuesta (DOCS-05)"; los títulos que lee `tokens-r1.ataque.test.ts` no se tocaron.
- **`ESTADO.md`:** T-1 a T-4 del arquitecto, iguales (T-2 con «y después, DEPLOY»); lo del orquestador (fusión de CHORE-04 en §1, 2 y 2b; hoja de ruta nueva con sus cinco consecuencias; marca de "primera versión"; puntos 7b y 8; fila de avisos acumulados; lugar del `chore` de higiene) no choca con nada: la hoja de ruta, el punto 9, las filas nuevas de §3 (siete de DOCS-05, al final) y la nota de §5 dicen el mismo orden y el mismo destino. La consecuencia 4 dice que los documentos de arquitectura que nombran Pages y R2 no son una contradicción que detenga a un agente.
- **Investigación de ENVIVO (V-1):** quitando los dos renglones nuevos, el archivo vuelve a dar `b7ab7ae6…`, el hash aprobado: solo se agregó la nota.
- **Formato:** los 10 documentos conservan sus finales de línea (CRLF en todos los renglones, como en la base) y terminan en salto de línea; `git diff 685fc2b --check` sin errores; ningún carácter invisible (U+200B a U+200F, U+202A a U+202E, U+2060, U+FEFF, U+00A0, U+2028 y U+2029: cero, como en la base).

### El commit
`git add -n -A` con las 12 rutas que dio el orquestador lista **14 archivos**: los 10 modificados con seguimiento, `docs/trabajo/ENVIVO-investigacion-bigbluebutton.md` y `plan.md`, `revision.md` y `aprobacion.md` de la carpeta del encargo. Fuera queda solo `docs/trabajo/DEPLOY-investigacion-vps.md`. Coincide con "Se toca" (DH-04 d). Nota: `revision.md` cambia con esta sección; el bloque de `git add` lo recoge igual, pero el orquestador debe tomar su hash después de esta entrega.

### O-F-1 — Las etiquetas con paréntesis del diagrama de Mermaid (no bloquea)
Dónde: `docs/ARCHITECTURE.md:74-75` (R-7): `BBB -. aviso de grabación lista (DEPLOY) .-> API` y `W -. sondeo de grabaciones (previsto, ENVIVO) .-> BBB`.
Decisión por lectura: **no rompe en Mermaid 10 o posterior** (el que usa GitHub): en una flecha punteada `-. texto .->`, el analizador lee la etiqueta como texto libre hasta el siguiente `.` seguido de `-`, así que un paréntesis o una coma no se toman como forma de nodo. En versiones anteriores (9 o menos) la etiqueta se analizaba con la gramática de texto y un `(` sin comillas sí podía romper el diagrama entero. Además, ninguna otra flecha del diagrama ni de los documentos usa paréntesis o comas. No lo pude comprobar en un renderizador (sin navegador, por regla).
Qué se recomienda (opcional, sin otra revisión más que el `git diff` de esas dos líneas): quitar los paréntesis y la coma, sin cambiar el sentido. Lo aplica el arquitecto (`docs/`, DH-01 d):
- línea 74: `  BBB -. aviso de grabación lista desde DEPLOY .-> API`
- línea 75: `  W -. sondeo de grabaciones previsto en ENVIVO .-> BBB`
Si el humano prefiere no tocarlo, se queda como está: el riesgo es solo de presentación en un visor viejo.

### Desacuerdos arbitrados
Ninguno.

### Resumen para el humano
1. DOCS-05 está listo para su commit: 14 archivos, solo documentos; nada de código, `infra/` ni pruebas.
2. LiveKit quedó sustituido por BigBlueButton por API con un proveedor alojado en PRD, `ARCHITECTURE.md`, ESSENTIALS, `DESIGN.md`, `ESTADO.md`, `CLAUDE.md`, `AGENTS.md` y tres líneas de `.claude/agents/`.
3. PRD: §4.7 con RF-75 (salas del Administrador), RF-76 (clases vinculadas) y RF-77 (grabaciones); RN-12; preguntas 18 a 22 abiertas para ENVIVO.
4. `ARCHITECTURE.md`: §12 reescrita y D-33; D-26 sigue vigente para la verificación del correo en DEPLOY.
5. Ninguna pregunta de ENVIVO quedó cerrada; sus decisiones y las seis del dueño están registradas.
6. Lo que queda de LiveKit en el repositorio se describe como "sin uso" y lo retira ENVIVO.
7. Verificado: grep de cierre limpio, tablas íntegras, numeración única, hashes iguales y la prueba de `DESIGN.md` en verde (19 de 19).
8. Opcional: quitar dos paréntesis del diagrama de `ARCHITECTURE.md` (O-F-1) por si un visor viejo de Mermaid no lo dibuja.
9. Fuera del commit, a propósito: `docs/trabajo/DEPLOY-investigacion-vps.md` (entra con DEPLOY).

### Qué anotar en `docs/ESTADO.md` al cierre (lo lleva el orquestador)
- §2: DOCS-05 cerrado el 2026-11-12 con esta revisión (APROBADO CON OBSERVACIONES; O-F-1, aplicada o no según el humano), pendiente del commit del humano; después del commit, su hash, y al fusionar, la fila de §1.
- 2b: la viñeta "DOCS-05" (hoy «en curso … se le entrega antes de editar») pasa a hecho, y la hoja de ruta nueva marca DOCS-05 como hecho; el siguiente es el `chore` de foco y navegación del marco.
- Línea 5 ("Última actualización").
- Sin medición del programador: no participó.
- Recordatorios que ya están en §3 y no hay que repetir: el retiro de LiveKit y `BBB_URL`/`BBB_SECRET` (ENVIVO), R-01 y R-03 (ENVIVO, decisión del humano), la cuenta del proveedor a nombre del colegio (DEPLOY) y la investigación de DEPLOY (DEPLOY).

## Verificación del cierre — DOCS-05 (2026-11-12)
Veredicto: **APROBADO** (sin M-nn; un detalle opcional de redacción en `docs/ESTADO.md`, abajo)
Verificación propia: solo lectura, sin suites.

### 1. O-F-1 en `docs/ARCHITECTURE.md`
SHA-256 actual `79c312b0…`, igual al de la última entrada de `aprobacion.md`. Comparé el `git diff 685fc2b --word-diff` de ahora con el de la revisión final (cuando el archivo era `5019f70f…`): solo difieren las dos líneas del diagrama, con el texto exacto recomendado (`BBB -. aviso de grabación lista desde DEPLOY .-> API` y `W -. sondeo de grabaciones previsto en ENVIVO .-> BBB`). Ya no queda ninguna etiqueta de flecha con paréntesis ni comas.

### 2. El cierre en `docs/ESTADO.md`
SHA-256 actual `52d1bdd2…`, igual al de `aprobacion.md`. Lo que agregó el orquestador:
- **Línea 5:** DOCS-05 cerrado con la revisión final, APROBADO CON OBSERVACIONES, pendiente del commit y de la fusión. Cierto.
- **§2, párrafo de DOCS-05:** las ocho decisiones coinciden con `aprobacion.md` (DH-01 d, DH-04 d y las demás en a, con su contenido bien resumido); lo que quedó (PRD §4.7 con RF-75 a RF-77, RN-12 y preguntas 18 a 22; `ARCHITECTURE.md` §12 y D-33, que sustituye a D-10 y, solo en lo de clases en vivo, a D-26; la fila de la antesala de `DESIGN.md` como propuesta), «ninguna pregunta … quedó cerrada», la verificación (sin tester, `Tests 19 passed (19)`, O-F-1 aplicada) y «14 archivos, solo documentos»: todo cierto y comprobado en la revisión final.
- **2b:** la hoja de ruta nueva marca DOCS-05 como cerrado y el `chore` de foco y navegación del marco como el siguiente; la viñeta "DOCS-05" pasa a hecho. La viñeta "primera versión", que todavía dice «DOCS-05 … **es el siguiente**», está marcada como sustituida en su orden: es historia y no confunde.
- **No contradice al arquitecto:** T-1 (la frase de transición), T-2 (punto 9, con «y después, DEPLOY»), las ocho filas de DOCS-05 en §3 y T-4 (nota de §5) siguen en su lugar y sin cambio.
- **Formato:** `grep -c '\*\*\*\*'` da 0; ninguna fila de tabla difiere en columnas de su encabezado (conteo mecánico sobre todo el archivo); `git diff --check` sin errores.

**Detalle opcional (no bloquea; lo aplica el orquestador):** la viñeta "DOCS-05" de 2b (`ESTADO.md:267`) termina todavía con la frase de antes de editar, «El plan, con las decisiones para el humano, se le entrega antes de editar.». Ya no describe nada pendiente. Texto exacto para sustituirla, si se quiere: «El plan se le entregó con sus decisiones antes de editar y lo aprobó el 2026-11-12.»

### 3. Nada más cambió
Los SHA-256 de `docs/PRD.md` (`12f3c364…`), ESSENTIALS (`9b906870…`), `DESIGN.md` (`cd670354…`), `CLAUDE.md` (`a61e0b5f…`), `AGENTS.md` (`239ca2f6…`), `.claude/agents/arquitecto.md` (`28a337fc…`), `tester.md` (`a309483f…`), la investigación de ENVIVO (`4413c992…`) y la de DEPLOY (`a13a5b57…`) siguen iguales a los del paso 9. `docs/trabajo/CHORE-04-guardas-de-doble-clic/aprobacion.md` sigue con su única línea agregada.

### 4. El commit
`git add -n -A` con las 12 rutas del orquestador: **14 archivos**. `git status --porcelain --untracked-files=all` fuera de ese conjunto: solo `?? docs/trabajo/DEPLOY-investigacion-vps.md`.

### Corrección a la revisión final (finales de línea)
En la revisión final escribí que los 10 documentos tenían «CRLF en todos los renglones, como en la base». **Era un falso positivo de mi comprobación** (`grep -c $'\r'` en Git Bash). Medido ahora por bytes (`tr -cd '\r' | wc -c` y `perl`, con un control positivo): **cero CR** en los 10 documentos, y `git ls-files --eol` da `i/lf w/lf` en todos, igual que la base (`.gitattributes`: `eol=lf`). La conclusión no cambia (finales de línea coherentes, sin cambio respecto de la base), pero el dato correcto es LF. La comprobación de caracteres invisibles se repitió por bytes, con su control positivo: cero en los 10.
