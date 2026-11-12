# Plan — DOCS-05 · documentos de BigBlueButton
Estado: LISTO (sin preguntas bloqueantes; las ocho decisiones DH-01 a DH-08 las tomó el humano el 2026-11-12: DH-01 (d), DH-02 (a), DH-03 (a), DH-04 (d), DH-05 (a, autorizada), DH-06 (a), DH-07 (a) y DH-08 (a))
Carril: normal (solo documentos: sin código, sin `infra/`, sin migraciones ni dependencias)
Requisitos: RNF-06, RNF-10, RNF-13 (DH-07 a), RF-41 (marca de pendiente), preguntas 7 y 9 de PRD §11; nuevos RF-75 a RF-77, RN-12 y preguntas 18 a 22 (DH-08); decisión nueva D-33 de `ARCHITECTURE.md` §20

Base de "No se toca": `main` = `685fc2b`. Petición literal del humano en `aprobacion.md` de esta carpeta. Investigación aprobada: `docs/trabajo/ENVIVO-investigacion-bigbluebutton.md` (citada abajo como "la investigación", con su sección: "inv. §4.7").

**Enmiendas.** **Enmienda 1 (2026-11-12), por la revisión del manager (`revision.md`, CAMBIOS REQUERIDOS):** sin cambio de alcance ni de decisiones; ediciones puntuales.
- **M-01:** la cuarta viñeta de RN-12 (P-3) deja de ser regla absoluta: queda como objetivo del cliente, solo para archivar o borrar definitivamente una clase, sin decir nada de borrar una grabación; la propagación de un borrado o de una edición de un recurso compartido se suma, abierta, a RF-76 y a la pregunta 21 (P-2, P-10). E-10 (ESSENTIALS) se ajusta con el mismo criterio. DOC5-05 lo comprueba.
- **M-02:** D-26 se marca sustituida por D-33 solo en lo de clases en vivo; la verificación del correo de recuperación en DEPLOY sigue en D-26 (R-31, R-26, R-32, S-05, T-1). D-10 sí se sustituye entera.
- **N-01:** la lista del grep de cierre (DOC5-02) admite R-22 (§14), E-6 (ESSENTIALS "Tablas") y las líneas de `ESTADO.md` §2 y 2b que lleva el orquestador (hoy 240 y 261); DOC5-02 se mide fuera de `docs/trabajo/` (85 apariciones en 15 archivos en la base).
- **N-02:** `docs/trabajo/CHORE-04-guardas-de-doble-clic/aprobacion.md`, ya modificado por el orquestador, entra en "Se toca" (lo lleva el orquestador) y en el commit; DOC5-01 lo admite. Conteo: 15.
- **N-03:** E-8, R-19, R-21 y la flecha de R-7 quedan neutrales sobre el mecanismo de la copia de grabaciones (R-01): es una decisión abierta de ENVIVO.
- **N-04:** P-4 separa por rol: el maestro programa; los dos entran al aula; el estudiante no programa.
- **DH-01 y DH-04:** suman la opción mixta que recomienda el manager, marcada como suya; cada DH dice la recomendación del arquitecto y la del manager cuando difieren.
- **Detalles menores de la revisión aplicados:** C-8 remite a la regla 11; R-19 dice que la clave del objeto de una grabación la fija ENVIVO. Sección nueva "Para el humano (dato, sin decisión)" con `.codex/agents/`.

**Enmienda 2 (2026-11-12), por las decisiones del humano y el cambio de hoja de ruta** (`aprobacion.md`, entradas del 2026-11-12; `docs/ESTADO.md` 2b, viñeta nueva del orquestador). Sin cambio de alcance: DOCS-05 sigue cambiando solo lo de clases en vivo.
- **Decisiones tomadas:** DH-01 (d), DH-02 (a), DH-03 (a), DH-04 (d), DH-05 (a, autorizada: solo `arquitecto.md:23`, `tester.md:39` y `:49`), DH-06 (a), DH-07 (a) y DH-08 (a). El plan queda en firme con ellas: se quitan las variantes condicionales (E-4, G-4, K-4, R-1, R-4, R-14, P-7, T-1, V-1) y V-2 no se aplica; la investigación de DEPLOY sale de "Se toca" y del commit. "Se toca": 14 archivos. Cada paso dice quién lo hace.
- **Hoja de ruta nueva (DEPLOY justo después de ENVIVO; la plataforma sale sin NOTIFICACIONES; DEPLOY parte de la investigación de VPS):** T-2 (punto 9 de 2b) ya no dice "antes de NOTIFICACIONES"; R-21 aclara que el aviso de "clase por comenzar" llega con NOTIFICACIONES, después de DEPLOY; R-20 deja de nombrar R2 en la frase que DOCS-05 reescribe; la flecha del aviso de grabación lista de R-7 apunta a la API, no al nodo de Cloudflare; R-27, la pregunta 18 y una fila de T-3 recogen la consecuencia 5 (la cuenta del proveedor a nombre del colegio para salir a producción con clases en vivo; el gasto, pendiente del cliente). Los textos existentes que DOCS-05 no toca y quedan desfasados se listan en "Pendientes por la hoja de ruta nueva", con destino. Las líneas de `docs/ESTADO.md` que cita el plan se actualizan (el orquestador agregó la viñeta nueva de 2b) y la lista del grep de cierre admite sus viñetas.

## Preguntas bloqueantes

Ninguna. Lo que el PRD y la investigación no deciden va como **pendiente por confirmar** en los documentos (es parte del alcance: DOCS-05 registra las preguntas abiertas, no las cierra). Las decisiones de forma que sí tiene que tomar el humano antes de editar están en la sección siguiente.

## Decisiones para el humano (tomadas el 2026-11-12)

**Decididas por el humano el 2026-11-12 (Enmienda 2; registro en `aprobacion.md`).** El resto del plan está escrito en firme con estas opciones; las demás opciones quedan abajo solo como registro.

| DH | Decisión | En corto |
|---|---|---|
| DH-01 | **(d) mixta**, con autorización por escrito | El arquitecto edita los documentos de `docs/` (`PRD.md`, `ARCHITECTURE.md`, ESSENTIALS, `DESIGN.md`, `ESTADO.md` en 2b, §3 y §5) y la nota V-1; el orquestador transcribe tal cual, con cotejo, C-1 a C-8, G-1 a G-5 y K-1 a K-3. Sin tester |
| DH-02 | (a) | Un proveedor alojado de BigBlueButton aprobado por escrito al contratarlo, también para el plan gratuito de desarrollo |
| DH-03 | (a) | La primera subentrega de ENVIVO retira lo que queda de LiveKit |
| DH-04 | **(d)** | La investigación de ENVIVO entra al commit con su nota (V-1, con la frase de (d)); `docs/trabajo/DEPLOY-investigacion-vps.md` no se edita ni entra ahora (entra a git con el encargo de DEPLOY), con su fila en `ESTADO.md` §3 |
| DH-05 | (a), autorizada | Solo `.claude/agents/arquitecto.md:23`, `tester.md:39` y `tester.md:49`; nada más de esos archivos (K-4 no cambia, por DH-06 a) |
| DH-06 | (a) | `livekit-server-sdk` sigue en las listas de los documentos; ENVIVO lo quita de todas junto con `eslint.config.mjs` |
| DH-07 | (a) | "Plan mensual por capacidad" en la cabecera y el principio 3 de `ARCHITECTURE.md` y en RNF-13 |
| DH-08 | (a) | RF-75 a RF-77 (M), RN-12, preguntas 18 a 22, D-33 |

Registro de las opciones presentadas (con la recomendación del arquitecto y, desde la Enmienda 1, la del manager cuando difería: solo en DH-01 y DH-04):

**DH-01 · Quién edita los documentos y qué recorrido sigue.**
- (a) **Recomendada por el arquitecto en el plan original.** Como en DOCS-04: el arquitecto edita, con autorización expresa del humano limitada a la lista "Se toca" de este plan y a este encargo; escribe por partes (`Edit`), nunca reescribiendo un documento completo. En `docs/ESTADO.md` toca solo la sección 2b, la 3 y la nota de infraestructura de la 5 (texto exacto en este plan); las secciones 1, 2, 4, 6 y la línea de "Última actualización" las lleva el orquestador, como siempre. Después, el manager revisa el `git diff 685fc2b` documento por documento contra la petición literal y este plan, con el grep de cierre y la prueba de `DESIGN.md` (sección "Pruebas requeridas"). Sin tester (no hay código que atacar; precedente de DOCS-04) y sin comprobación humana en navegador (no hay interfaz).
- (b) El programador aplica los textos del plan. Es el agente que menos contexto tiene de las decisiones de redacción y está en `sonnet`; no aporta nada en un encargo de documentos.
- (c) El orquestador transcribe los textos del plan con cotejo (`AGENTS.md`, "Transcripción con cotejo"). Sirve si el humano no quiere que un agente que no programa escriba fuera de `docs/trabajo/`, pero obliga a que el plan traiga el texto literal de todo (incluida §12 de `ARCHITECTURE.md`, que aquí va descrita).
- (d) **Mixta, recomendada por el manager (Enmienda 1).** El arquitecto edita, con autorización expresa y por escrito del humano, los documentos de `docs/` (`PRD.md`, `ARCHITECTURE.md`, ESSENTIALS, `DESIGN.md`, `ESTADO.md` en 2b, §3 y §5) y las notas de las investigaciones (V-1 y, según DH-04, V-2). El orquestador transcribe tal cual, con cotejo, los cambios de `CLAUDE.md`, `AGENTS.md` y `.claude/agents/` (C-1 a C-8, G-1 a G-5 y K-1 a K-4), cuyo texto literal ya trae este plan. Mismo recorrido de revisión que (a), sin tester. Motivos del manager: en DOCS-04 la autorización del arquitecto se limitó a cinco documentos de `docs/` y dejó fuera `CLAUDE.md` y `AGENTS.md`; y para esos archivos y `.claude/agents/` la práctica registrada en `docs/ESTADO.md` §4 es que los aplica el orquestador con la autorización del humano y los agentes proponen el texto literal.
- **Recomendación:** arquitecto, (a) en el plan original; manager, (d). El arquitecto no se opone a (d): da el mismo resultado con la práctica vigente para `CLAUDE.md`, `AGENTS.md` y `.claude/agents/`.
- **Decidido por el humano (2026-11-12): (d), con autorización por escrito.**

**DH-02 · Cómo se escribe la lista de proveedores aprobados.** Afecta a la regla 11 de `AGENTS.md`, `CLAUDE.md` (Proyecto y "Lo que no se hace"), ESSENTIALS "Proveedores", `ARCHITECTURE.md` §1, PRD RNF-10 y, si DH-05 a, `.claude/agents/arquitecto.md`. El proveedor alojado no está elegido: el candidato (Aulas en Vivo) no ha confirmado que entregue la URL y el secreto de la API, ni enlaza términos de servicio o política de privacidad (inv. §7 y §9). Además, ENVIVO necesita una cuenta en el plan gratuito de algún proveedor para desarrollar en `dev` (hoja de ruta del 2026-11-11), así que la redacción tiene que decir quién aprueba esa cuenta.
- (a) **Recomendada.** "Un proveedor alojado de BigBlueButton que el humano aprueba por escrito al contratarlo, también para el plan gratuito de desarrollo (candidato: Aulas en Vivo, sin verificar)". LiveKit Cloud sale de la lista. El agente que planee ENVIVO puede proponer un proveedor, pero no crear la cuenta ni usarla sin esa aprobación.
- (b) Nombrar ya a Aulas en Vivo como aprobado. Adelanta una aprobación que la investigación deja condicionada a cuatro respuestas del proveedor y al aviso de privacidad del colegio.
- (c) Aprobar la categoría ("cualquier servidor compatible con la API de BigBlueButton") sin aprobación por proveedor. Es la más flexible, pero deja pasar a un proveedor sin términos ni privacidad revisados, con voz e imagen de menores.
- **Decidido por el humano (2026-11-12): (a).**

**DH-03 · Quién retira lo que queda de LiveKit en el repositorio.** Hoy existe, sin uso (inventario completo en "Inventario por grep", grupo C): el servicio `livekit` de `infra/docker-compose.yml`, `infra/livekit/livekit.dev.yaml`, el bloque `LIVEKIT_*` de `infra/.env.example`, `livekit-server-sdk` en la lista de `eslint.config.mjs`, la mención en `backend/src/adapters/README.md`, el contrato en comentarios de `frontend/src/services/liveService.ts` y la guía del entorno de `README.md` (raíz). No hay dependencias instaladas, ni adaptador, ni rutas, ni variables en `config/env.ts`, ni tablas, ni pruebas.
- (a) **Recomendada.** La primera subentrega de ENVIVO, que de todos modos toca `infra/` y `.env.example` (agrega `BBB_URL` y `BBB_SECRET`) y crea `adapters/live`: retira todo lo de la lista en el mismo cambio que pone lo nuevo, y actualiza la guía del `README.md`. Mientras tanto, `docker compose up -d` sigue levantando un `livekit` que no estorba, y los documentos lo dicen.
- (b) Un `chore` de `infra/` propio, antes de ENVIVO (carril sensible por `infra/`). Deja el repositorio limpio antes, a cambio de un encargo más con su aprobación por escrito.
- (c) No retirarlo hasta DEPLOY. No se recomienda: el residuo dura meses y confunde.
- **Decidido por el humano (2026-11-12): (a).**

**DH-04 · Las dos investigaciones sin confirmar en git.**
- `docs/trabajo/ENVIVO-investigacion-bigbluebutton.md` entra en el commit (petición literal). Su línea 5 dice "PROPUESTA, pendiente de la confirmación del cliente… siguen documentando LiveKit hasta que el dueño confirme", su §4.6 dice que las grabaciones "se quedan en el servidor de BigBlueButton" y su §10 dice "Ninguno de estos cambios está hecho". Tras DOCS-05 las tres frases quedan viejas.
- `docs/trabajo/DEPLOY-investigacion-vps.md` está en la tabla de inv. §10, pero el humano solo nombró la otra para el commit. Dimensiona LiveKit autoalojado (§2, §3, §4, §8, §10) y su tabla dice que las grabaciones "dejan de contar en el volumen de MinIO si se quedan con el proveedor"; con la decisión del humano (se copian a nuestro almacenamiento), **siguen contando**, y sin borrado automático el volumen crece. Además, la investigación de ENVIVO la cita tres veces: si una entra al repositorio y la otra no, queda una referencia a un archivo que no existe en git.
- (a) **Recomendada por el arquitecto.** Una nota fechada al inicio de cada una, sin reescribir nada más (textos exactos en "Cambios por documento"), y las dos entran en el commit de DOCS-05. El SHA-256 de la investigación de ENVIVO registrado al arrancar cambia; el orquestador anota el nuevo.
- (b) Las dos entran en el commit tal como están, sin nota; `docs/ESTADO.md` (2b, línea de la decisión) dice que, donde una investigación contradiga a los documentos vivos, mandan estos.
- (c) Solo la de ENVIVO, sin tocarla; la de DEPLOY se queda fuera de git y su actualización va a DEPLOY (fila en `ESTADO.md` §3).
- (d) **Mixta, recomendada por el manager (Enmienda 1).** La de ENVIVO, con su nota V-1, entra al commit; la de DEPLOY se queda sin editar y fuera del commit, con la fila de §3 de destino DEPLOY (la misma que prevé (c)), y V-1 dice además que la investigación de DEPLOY todavía no está en git. Motivos del manager: la nota de V-1 es aditiva, como las dos actualizaciones que ya tiene ese documento, y evita que entre a git un archivo que se declara "PROPUESTA… siguen documentando LiveKit"; el humano solo nombró la de ENVIVO para el commit; y meter a git la de DEPLOY (682 líneas) mete también conclusiones suyas ajenas a este encargo que contradicen documentos vivos (por ejemplo, R2 "descartado" frente a D-09), sin revisión. La referencia de la investigación de ENVIVO a un archivo sin versionar es menor. Si el humano prefiere versionar las dos, (a) completa está bien; (b) no, porque deja en git sin nota la frase falsa de que las grabaciones "dejan de contar" en el volumen.
- **Recomendación:** arquitecto, (a); manager, (d). Con (d), V-1 lleva la frase extra (abajo) y V-2 no se aplica.
- **Decidido por el humano (2026-11-12): (d).** La investigación de DEPLOY entra a git con el encargo de DEPLOY.

**DH-05 · Las definiciones de los agentes.** `.claude/agents/arquitecto.md:23` dice "No propones AWS ni proveedores fuera de los aprobados (DigitalOcean, Cloudflare, LiveKit Cloud, Resend)": el arquitecto de ENVIVO no podría proponer un proveedor de BigBlueButton sin romper su propia regla. `.claude/agents/tester.md:39` y `:49` nombran "tokens de LiveKit" y "LiveKit" en la lista de lo que un alumno restringido o con cambio de contraseña pendiente no alcanza. No están en la tabla de inv. §10.
- (a) **Recomendada.** DOCS-05 cambia esas tres líneas (textos exactos abajo) y nada más de esos archivos. `tester.md:84` (la lista de librerías del grep de capas) sigue DH-06.
- (b) Dejarlas para ENVIVO: su arquitecto tendría que pedir la excepción en su propio plan.
- **Decidido y autorizado por el humano (2026-11-12): (a).** Solo `arquitecto.md:23`, `tester.md:39` y `tester.md:49`, y nada más de esos archivos.

**DH-06 · `livekit-server-sdk` en las listas de la regla 1.** Aparece en `AGENTS.md:64` (regla 1), ESSENTIALS "Capas", `ARCHITECTURE.md` §5 ("Regla de capas"), `.claude/agents/tester.md:84`, `backend/src/adapters/README.md:5` y en la lista que vigila ESLint (`eslint.config.mjs:19`, cuyo comentario dice "Regla 1 de AGENTS.md"). BigBlueButton no necesita SDK: son llamadas HTTP con `checksum` y la verificación de un JWT, que ya hace `jose` dentro de `adapters/`.
- (a) **Recomendada.** DOCS-05 deja la librería en las cuatro listas de documentos; ENVIVO la quita de las seis a la vez, junto con `eslint.config.mjs` (fila en `ESTADO.md` §3). Nombrar una librería que nadie va a importar no hace falsa la regla, y así la regla y ESLint no se separan.
- (b) DOCS-05 la quita ya de los documentos; ESLint la sigue vigilando hasta ENVIVO (más estricto que la regla, sin efecto práctico).
- **Decidido por el humano (2026-11-12): (a).**

**DH-07 · El costo del video en los principios.** `ARCHITECTURE.md` (línea 6 de la cabecera y principio 3) y PRD RNF-13 dicen "pago por uso" en video. Un proveedor alojado de BigBlueButton se paga como un plan mensual por capacidad simultánea (personas y salas a la vez), que se sube o se baja entre periodos sin cambiar código (inv. §2 y §5). No está en la tabla de inv. §10.
- (a) **Recomendada.** Cambiar las tres frases: "pago por uso en archivos; el video, un plan mensual por capacidad, que se ajusta entre periodos sin cambiar código".
- (b) No tocarlas en DOCS-05 y dejar la pregunta al plan de ENVIVO, con el gasto del colegio (pregunta 18 nueva).
- **Decidido por el humano (2026-11-12): (a).**

**DH-08 · Identificadores y prioridad de los requisitos nuevos.** Siguen la numeración vigente del PRD (el último RF es RF-74; la última RN, RN-11; la última pregunta de §11, la 17; la última decisión de `ARCHITECTURE.md`, D-32).
- (a) **Recomendada.** Subsección nueva PRD §4.7 "Clases en vivo con BigBlueButton y clases vinculadas (DOCS-05)" con **RF-75** (salas del Administrador), **RF-76** (clases vinculadas) y **RF-77** (grabaciones: conservación y borrado), los tres con prioridad **M** (son requisitos que dio el dueño), y RF-75 con su propósito "pendiente por confirmar"; **RN-12** "Clases en vivo, grabaciones y clases vinculadas"; preguntas **18 a 22** en §11; **D-33** en `ARCHITECTURE.md`. Textos exactos en "Cambios por documento".
- (b) Lo mismo con prioridad "Por confirmar" en RF-75 (como los exámenes de RF-72 a RF-74), porque su propósito no está confirmado. El requisito (que el Administrador cree salas sin maestro) sí lo está; por eso se recomienda M.
- **Decidido por el humano (2026-11-12): (a).**

## Suposiciones

- **S-01.** DOCS-05 no cierra ninguna pregunta abierta de inv. §4.7 ni de inv. §9. Solo se registran como cerradas las tres decisiones del humano del 2026-11-11 (copiar las grabaciones a nuestro almacenamiento, ligadas a su clase; nada se borra automáticamente y solo el administrador borra; la vinculada recibe las grabaciones en cuanto están listas), las seis decisiones del dueño de inv. §4.7, la pregunta de retención (inv. §9, colegio 3, ya respondida en la investigación) y la de la hoja de ruta (en `dev`, plan gratuito; el aviso de grabación lista espera a DEPLOY y mientras tanto hay sondeo).
- **S-02.** La decisión de copiar las grabaciones lleva la condición que la investigación le pone ("si el proveedor entrega el video por API", inv. §9, ENVIVO 2): los documentos la escriben con esa condición y con "por verificar".
- **S-03.** Lo que inv. §4 llama "entrada para el arquitecto" (el puerto `ProveedorDeAula`, las tablas `sesiones_en_vivo`, `grabaciones` y `grabaciones_de_clase`, las rutas, la mitigación del enlace reenviable, la vista de uso del administrador) entra a `ARCHITECTURE.md` como **"Previsto (DOCS-05), no decidido: lo fija el plan de ENVIVO"**, igual que DOCS-04 marcó lo previsto del foro. Nada de eso entra a ESSENTIALS como regla.
- **S-04.** Los nombres `BBB_URL` y `BBB_SECRET` se escriben como "previstos" (inv. §4.4); los fija ENVIVO en `config/env.ts` y `backend/.env.example`.
- **S-05.** Los documentos de historial (`docs/trabajo/<otros encargos>/` y las entradas fechadas de `docs/ESTADO.md` §1, §2 y §4) no se reescriben aunque nombren LiveKit. En `ARCHITECTURE.md` §20, D-10 y D-26 se conservan y no se borran: D-10 con la marca "Sustituida por D-33"; D-26 con la marca de que D-33 la sustituye solo en lo de clases en vivo, porque su verificación del correo de recuperación en DEPLOY sigue vigente (Enmienda 1, M-02).
- **S-06.** `README.md` (raíz) y `backend/src/adapters/README.md` describen el repositorio como es hoy (el servicio `livekit` existe y ESLint vigila `livekit-server-sdk`): no se tocan; los actualiza quien retire LiveKit (DH-03).
- **S-07.** El diagrama entidad-relación de `ARCHITECTURE.md` §14 no cambia: su regla es "no cambia hasta que las tablas existan" (`clases_en_vivo` tampoco existe hoy; `backend/prisma/schema.prisma` no la tiene).
- **S-08.** Las vistas de ENVIVO (antesala, salas del administrador, grabaciones de una clase vinculada) no se cuentan en PRD §6 hasta que su plan las fije, como las de exámenes.

## Alcance

**Entra:**
1. Sustituir LiveKit por BigBlueButton por API, con un proveedor alojado, en los documentos vivos de la tabla de inv. §10: `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `docs/ESTADO.md`, `CLAUDE.md`, `AGENTS.md` y `docs/DESIGN.md`. `docs/trabajo/DEPLOY-investigacion-vps.md`, que también está en esa tabla, no se edita ni entra ahora (DH-04 d): entra a git con el encargo de DEPLOY.
2. Registrar en el PRD el requisito de clases vinculadas (inv. §4.7): las seis decisiones del dueño como requisito y las cuatro preguntas abiertas como abiertas; el RF de las salas del administrador, sin inventar su propósito; RF-41, RNF-06, RNF-10 y las preguntas 7 y 9.
3. Decir el estado de transición sin mentir sobre el repositorio: qué frases describen la decisión, cuáles el estado actual y quién retira lo de LiveKit (DH-03).
4. Las tres líneas de `.claude/agents/` (DH-05 a) y el costo del video (DH-07 a).
5. Registrar en `docs/ESTADO.md` §3 lo que DOCS-05 no hace, con su destino.
6. Incluir `docs/trabajo/ENVIVO-investigacion-bigbluebutton.md` en el commit (petición literal), con la nota V-1 (DH-04 d).

**No entra:** código, pruebas, `package.json`, `eslint.config.mjs`, `infra/` (incluidos `docker-compose.yml`, `livekit/` y `.env.example`), `backend/.env.example`, `README.md` (raíz), `backend/src/adapters/README.md`, `docs/trabajo/DEPLOY-investigacion-vps.md` (DH-04 d), migraciones, cerrar cualquier pregunta abierta, elegir proveedor, decidir el diseño de ENVIVO (tablas, rutas, puerto, mecanismo de copia), reescribir historial. Tampoco lo que la hoja de ruta nueva (DEPLOY justo después de ENVIVO, desde `docs/trabajo/DEPLOY-investigacion-vps.md`: servidor propio, no Cloudflare Pages ni R2) cambia en los documentos de arquitectura: eso se corrige en el plan de DEPLOY (consecuencia 4 de `docs/ESTADO.md` 2b); ver "Pendientes por la hoja de ruta nueva".

## Inventario por grep

Búsqueda en todo el repositorio, sin distinguir mayúsculas, de `livekit` y `egress` (cubre `LiveKit`, `livekit-server-sdk`, `webhooks/livekit`, `egress_ended`, `Egress`), hecha el 2026-11-12 sobre el árbol de trabajo de la rama: 300 apariciones en 60 archivos (fuera de `node_modules`). Además se buscaron `envivo`, `en vivo`, `grabaci`, `sala`, `webinar`, `GRABACION_LISTA`, `CLASE_POR_COMENZAR`, `SALA_LLENA` y `clases_en_vivo` en código, pruebas y esquema. Líneas de la base `685fc2b` (las de `docs/ESTADO.md`, del árbol con el registro del orquestador del 2026-11-12).

**A. Documentos vivos que DOCS-05 cambia** (detalle y texto nuevo en "Cambios por documento"):

| Archivo | Líneas con LiveKit o Egress | Además (sin la palabra, pero cambian) |
|---|---|---|
| `docs/PRD.md` | 326 (RNF-06), 330 (RNF-10), 376 (pregunta 7) | 118 (RF-41), 284–302 (§6, una viñeta nueva), 332 (RNF-13, DH-07), 340 (hito 2), 378 (pregunta 9), §4.7 y RN-12 nuevas, preguntas 18–22 |
| `docs/ARCHITECTURE.md` | 10, 11 (§1); 25, 34 (§2); 62, 67, 73–75 (§3); 88, 112, 117, 118, 121 (§4); 155, 166, 177 (§5); 224 (§6); 241 (§7); 345 (§11); 350–357 (§12); 471 (§15); 484 (§16); 516, 530, 532 (§18); 557 (§19); 580, 596 (§20) | 6 y 12 (DH-07); 271 (§8, `GRABACION_LISTA`); 335–336 (§11, punto nuevo); 428 y 435–442 (§14); 549 (§18, migración); D-33 nueva |
| `docs/ARCHITECTURE-ESSENTIALS.md` | 11, 16, 22, 32, 52, 102, 111, 113, 115 | 76–78 (Tablas, previsto), 110–116 (sección completa), 130 (Recursos), 133 (Clases archivadas…) |
| `docs/ESTADO.md` | 258, 275 (2b), 532 (§5); en el árbol de la Enmienda 2, 264, 281 y 538 | §3 (filas nuevas) |
| `CLAUDE.md` | 15, 16, 17, 21, 96, 105, 260 | fila `envivo` de la tabla de módulos |
| `AGENTS.md` | 6, 48, 58, 74 (la 64 no cambia: DH-06 a) | — |
| `docs/DESIGN.md` | ninguna | 361 (§7.1, "Alcance por pantalla": "clase en vivo") |
| `.claude/agents/arquitecto.md` (DH-05 a) | 23 | — |
| `.claude/agents/tester.md` (DH-05 a) | 39, 49 (la 84 no cambia: DH-06 a) | — |
| `docs/trabajo/ENVIVO-investigacion-bigbluebutton.md` (DH-04 d) | 18 | nota al inicio (V-1) |
| `docs/trabajo/DEPLOY-investigacion-vps.md` | 34 | No se toca (DH-04 d): entra a git con DEPLOY |

**B. Historial que no se reescribe:** `docs/trabajo/` de AUTH-01, AUTH-02, AUTH-03, BACK-01, BACK-02, CALIFICACIONES-01, CHORE-01, CHORE-02, CHORE-04, CLASES-01, CLASES-02, DESIGN-01, DOCS-01, DOCS-02a, DOCS-04, ENTREGAS-01, FIX-CLASES, FRONT-01, INFRA-01 y TAREAS-01 (más el `aprobacion.md` de esta carpeta); en `docs/ESTADO.md`, la línea 119 (§1, entrada fechada) y las del registro de DOCS-05 que actualiza el orquestador al cerrar (§2, línea 240, y la viñeta "DOCS-05" de 2b: línea 261 en la Enmienda 1, 267 en el árbol de la Enmienda 2); también las viñetas que el orquestador escribió el 2026-11-12 (la hoja de ruta nueva de 2b, líneas 257 a 262, la marca de "primera versión" de la línea 263 y la fila del `chore` de higiene de pruebas de §3), que quedan a su cargo. En `ARCHITECTURE.md` §20, las celdas de D-10 y D-26 conservan su texto (solo ganan su marca: D-10 entera, D-26 en lo de clases en vivo).

**C. Código, configuración e `infra/` que DOCS-05 no toca y que condicionan lo que los documentos pueden afirmar** (comprobado en solo lectura):

| Archivo | Qué hay | Consecuencia para los documentos |
|---|---|---|
| `infra/docker-compose.yml:58-72` | Servicio `livekit` (`livekit/livekit-server:v1.9.1`, `--dev`, puertos 7880, 7881 y 7882/udp en `127.0.0.1`, con `healthcheck`) | `docker compose up -d` lo sigue levantando: los documentos no pueden decir "solo PostgreSQL y MinIO" sin la salvedad |
| `infra/livekit/livekit.dev.yaml` | Configuración del LiveKit de desarrollo | Igual |
| `infra/.env.example:29-36` | Bloque `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | `ARCHITECTURE.md` §4 ("`infra/.env`…") lo menciona con la salvedad |
| `eslint.config.mjs:19` | `livekit-server-sdk` en `libreriasDeInfraestructura`, con el comentario "Regla 1 de AGENTS.md" | DH-06 |
| `backend/src/adapters/README.md:5` | Nombra `livekit-server-sdk` | S-06 y DH-06 |
| `frontend/src/services/liveService.ts` | Solo comentarios con el "contrato futuro de la conexión con LiveKit" y `export {}` | `CLAUDE.md` lo describe tal cual y dice que ENVIVO lo reescribe o lo borra |
| `README.md` (raíz) `:11, 33, 40, 54, 63, 96` | Guía del entorno local con `livekit` (servicio, URL, logs, puertos) | S-06 |
| `package.json` (raíz, `frontend/`, `backend/`, `shared/`) | Sin dependencias de LiveKit | Los documentos no necesitan salvedad sobre dependencias |
| `backend/src/` y `backend/prisma/` | Sin `adapters/live`, sin `handlers/envivo`, sin variables `LIVEKIT_*` en `config/env.ts`, sin tabla `clases_en_vivo`, sin `GRABACION_LISTA`, `CLASE_POR_COMENZAR` ni `SALA_LLENA` | Todo lo de clases en vivo del backend es diseño, no código: se puede reescribir en los documentos sin salvedad |
| `frontend/src/` | Sin `features/envivo`, sin rutas de clase en vivo | Igual |
| `backend/.env.example`, `frontend/.env.example` | Sin variables de LiveKit | `BBB_URL` y `BBB_SECRET` los agrega ENVIVO |
| Pruebas (`*.test.ts(x)`, `*.ataque.test.ts(x)`) | Ninguna nombra LiveKit. La única que lee un documento que DOCS-05 cambia es `frontend/src/styles/tokens-r1.ataque.test.ts` (importa `docs/DESIGN.md?raw` y corta por los títulos `### Tokens`, `### Materiales`, `### Radios`, `### Bordes`, `### Escala` y `## 5.`) | DOCS-05 no toca esos títulos ni las tablas de §3 a §5; se corre esa prueba como comprobación (DOC5-03) |

Nota de transparencia: un glob de la búsqueda incluyó `infra/**` y la herramienta mostró las siete líneas del bloque LiveKit de `infra/.env` (valores de desarrollo idénticos a los de `infra/.env.example`). El archivo no se abrió ni se leyó nada más de él; ningún valor se copia a este plan.

## Diseño

### Estado de transición (cómo se dice sin mentir sobre el repositorio)

Tras DOCS-05, los documentos dicen BigBlueButton, pero el repositorio conserva el residuo del grupo C hasta que lo retire quien diga DH-03. Para que ningún agente se detenga por "contradicción entre documentos", cada frase cae en una de tres clases, y el plan dice cuál es cada una:

1. **Decisión** (vale desde ya): proveedores aprobados, pila, `adapters/live` con BigBlueButton, la entrada firmada por la API, las tres decisiones del humano y las seis del dueño. Se escriben en presente, sin LiveKit.
2. **Estado actual del repositorio** (verdad hoy, cambia con DH-03): el servicio `livekit` y su bloque de variables, la lista de ESLint, `liveService.ts` en comentarios, la guía del `README.md`. Donde un documento vivo ya los nombra (`AGENTS.md` comandos y estructura, `ARCHITECTURE.md` §1 principio 2, §4 y §5, `CLAUDE.md` `/infra` y `liveService.ts`, ESSENTIALS "Clases en vivo", `ESTADO.md` §5), la frase dice que existe, que ya no se usa y quién lo retira. Ninguna frase nueva lo presenta como parte del diseño.
3. **Previsto o abierto** (lo decide ENVIVO): el diseño de inv. §4 y las preguntas de inv. §4.7 y §9. Siempre con la marca "Previsto (DOCS-05), no decidido" o "pendiente por confirmar".

`docs/ESTADO.md` 2b (la viñeta de la decisión) cambia "Hasta DOCS-05… siguen nombrando LiveKit" por una frase que dice dónde queda LiveKit a propósito y que eso no es una contradicción (texto exacto abajo).

### Lista de lugares donde "LiveKit" puede quedar tras DOCS-05

Es la referencia del grep de cierre (DOC5-02). Fuera de `docs/trabajo/`, `node_modules/` y del grupo C (que no se toca), "livekit" solo puede aparecer en:
- `docs/ESTADO.md`: línea 119 (historial), las líneas de §2 y 2b con el registro de DOCS-05 que lleva el orquestador (en el árbol de la Enmienda 2, 240 y 267; Enmienda 1, N-01), cualquier viñeta o fila que el orquestador escriba a su cargo (la hoja de ruta nueva de 2b, la marca de "primera versión" y la fila del `chore` de higiene de pruebas; Enmienda 2, hoy sin "LiveKit"), la viñeta de la decisión y el punto 9 de 2b, las filas nuevas de §3 y la nota de §5.
- `docs/ARCHITECTURE.md`: §1 principio 2, §4 ("Contenedores" y la viñeta de `infra/.env`; la tabla "Entornos" ya no lo nombra) y §5 (árbol de `infra/`), con la salvedad de transición; §5 "Regla de capas" (lista de librerías, DH-06 a); §12 ("LiveKit se descartó…" y la salvedad del servicio `livekit`); §14 (la fila de `clases_en_vivo`, R-22: "del diseño con LiveKit"; Enmienda 1, N-01); §20 (D-10, D-26 y las columnas de alternativas y motivo de D-33).
- `docs/ARCHITECTURE-ESSENTIALS.md`: "Proveedores" ("LiveKit Cloud salió de la lista"), "Capas" (DH-06 a), "Tablas" (la viñeta "Previsto (DOCS-05)" de E-6: "del diseño con LiveKit"; Enmienda 1, N-01), "Clases en vivo" (la salvedad del servicio `livekit` de `infra/`).
- `.claude/agents/`: ninguna mención en `arquitecto.md`; en `tester.md`, solo la línea 84 (DH-06 a).
- `docs/PRD.md`: la frase de §4.7 que dice que LiveKit se descartó.
- `CLAUDE.md`: `/infra` y `services/liveService.ts`.
- `AGENTS.md`: el comentario de `docker compose up -d`, la línea de `infra/` de "Estructura", la regla 1 (DH-06 a) y la regla 11 ("LiveKit Cloud salió de la lista").
- "Egress" y "webhooks/livekit": solo en `ARCHITECTURE.md` §20 (celdas de D-10 y D-26). Ningún texto nuevo los usa.

### Datos que se leen y escriben, eventos que se encolan

No aplica: no hay código. Los documentos conservan sin cambio los eventos `GRABACION_LISTA` y `CLASE_POR_COMENZAR` y el trabajo diferido de 15 minutos; solo cambia de dónde viene `GRABACION_LISTA` (el aviso de grabación lista de BigBlueButton o, hasta DEPLOY, el sondeo).

## Cambios por capa

### shared/
No aplica.
### backend/core/
No aplica.
### backend/adapters/
No aplica (el adaptador `live` sigue sin existir; ENVIVO lo crea).
### backend/handlers/
No aplica.
### backend/workers/
No aplica.
### backend/prisma/
No aplica. Sin migración.
### infra/ y .env.example
No aplica (DH-03 a: los cambia la primera subentrega de ENVIVO).
### frontend/features/<modulo>/
No aplica.

## Cambios por documento

Convención: "Actual" es el texto de la base `685fc2b` (abreviado con "…" cuando el resto no cambia); "Nuevo" es el texto que se escribe. Donde dice "Descripción", el texto lo redacta quien edite (DH-01) con exactamente ese contenido, sin agregar decisiones. Origen de cada cosa: **[H]** decisión del humano o del dueño (petición literal, inv. §4.7, hoja de ruta), **[I]** la investigación aprobada, **[A]** propuesta del arquitecto en este plan, **[DH-nn]** según la decisión del humano. Los textos entre marcas de bloque (```) se escriben sin esas marcas; los de una línea van entre comillas invertidas solo para delimitarlos.

### 1. `docs/PRD.md`

**P-1 · RF-41 (línea 118)** [H: queda abierta, inv. §9 ENVIVO 3].
- Actual: `| RF-41 | Impartir clase en vivo: video, compartir pantalla, chat, iniciar y detener grabación | M |`
- Nuevo: `| RF-41 | Impartir clase en vivo: video, compartir pantalla, chat, iniciar y detener grabación. Desde DOCS-05, en el aula de BigBlueButton (§4.7). **Pendiente por confirmar (ENVIVO):** si la grabación es siempre automática o la inicia y la detiene el maestro, como dice este requisito; el cliente pidió automática (pregunta 20) | M |`

**P-2 · Subsección nueva §4.7**, después de la tabla de exámenes (tras la línea 195, antes de "## 5. Reglas de negocio") [H, I; numeración DH-08].

```
### 4.7 Clases en vivo con BigBlueButton y clases vinculadas (DOCS-05)

Decisión confirmada con el cliente el 2026-11-11: las clases en vivo se hacen con BigBlueButton por su API, con un proveedor alojado; Zoom queda como alternativa registrada y LiveKit se descartó (`ARCHITECTURE.md`, D-33). La investigación está en `docs/trabajo/ENVIVO-investigacion-bigbluebutton.md`. Los requisitos de clases en vivo de §4.2 y §4.3 (RF-20, RF-22, RF-23, RF-40 a RF-42) siguen vigentes. Lo marcado **pendiente por confirmar** lo cierra el plan de ENVIVO con el humano (preguntas 18 a 22 de §11).

| ID | Requisito | Prioridad |
|---|---|---|
| RF-75 | **Salas del Administrador (ENVIVO):** el Administrador crea salas en vivo por su cuenta, sin que dependan de un maestro (requisito del dueño, 2026-11-10). **Pendiente por confirmar:** para qué son y quién entra a ellas: usuarios de la plataforma elegidos uno por uno, toda una clase o personas externas con un enlace (pregunta 19) | M |
| RF-76 | **Clases vinculadas (ENVIVO):** a veces una materia tiene dos clases: una con clases en vivo (la clase de origen) y otra asíncrona (la vinculada), que usa las grabaciones y los recursos de aprendizaje de la primera, por lo menos durante un año; cuando el grupo en vivo se actualiza, el asíncrono también. El vínculo es de un sentido: la vinculada recibe lo de su clase de origen, y cada una tiene su propio maestro, sus actividades y sus calificaciones. La vinculada recibe las grabaciones en cuanto están listas, sin revisión previa, y los recursos de aprendizaje (los que publica la administración); los recursos del docente no se comparten. Decisiones del dueño, 2026-11-11. **Pendiente por confirmar (pregunta 21):** si al vincular la clase recibe también las grabaciones y los recursos que ya existían o solo los nuevos; si una clase puede recibir de más de una clase de origen; quién crea el vínculo y cuándo (el Administrador al crear o duplicar la clase, o después); cómo se comparten los recursos (una sola publicación visible en las dos clases o copias que se mantienen iguales al editarse) y de quién son sus comentarios; y si borrar o editar un recurso en la clase de origen alcanza a la vinculada | M |
| RF-77 | **Grabaciones: conservación y borrado (ENVIVO):** cada grabación se copia a nuestro almacenamiento y queda ligada a su clase (decisión del humano, 2026-11-11), siempre que el proveedor entregue el video por su API (por verificar, pregunta 22). Un video es un solo archivo: cada clase que lo muestra, la de origen y sus vinculadas, lo hace por referencia, no por copia. Nada se borra automáticamente: no hay vencimiento ni plazo de retención. El maestro no quita grabaciones; solo el Administrador las borra, cuando lo decida. La antigüedad de una grabación cuenta desde la fecha en que se grabó y es solo un dato para el Administrador (por ejemplo, para filtrar las de más de un año). Decisiones del dueño y del humano, 2026-11-11 | M |
```

Nota: inv. línea 11 dice "contratado con un proveedor alojado a nombre del colegio" e inv. §9 (colegio, 2) pregunta si el colegio lo aprueba. Desde la hoja de ruta nueva (consecuencia 5, decisión del humano), la cuenta a nombre del colegio es requisito para salir a producción con clases en vivo y el gasto sigue pendiente del cliente: va en la pregunta 18 y en `ARCHITECTURE.md` §18 (R-27), no en §4.7, que solo registra la decisión de producto.

**P-3 · RN-12 nueva**, después de RN-11 (tras la línea 277, antes de "## 6. Vistas") [H; la última viñeta, A como derivación de RN-10].

```
### RN-12 Clases en vivo, grabaciones y clases vinculadas (DOCS-05; ENVIVO)
- La plataforma crea las salas y da a cada persona su entrada a la clase en vivo, con su nombre y su rol; el asistente no escribe su nombre. El alumno restringido no entra ni ve grabaciones (RN-03).
- Una grabación es un solo archivo, copiado a nuestro almacenamiento y ligado a su clase; las clases vinculadas la muestran por referencia (RF-76, RF-77).
- Nada se borra automáticamente. Solo el Administrador borra una grabación.
- Objetivo del cliente (2026-11-11): que archivar o borrar definitivamente una clase no deje a la otra clase del vínculo sin lo que ya recibió. Cómo se cumple lo fija el plan de ENVIVO. Si borrar o editar un recurso compartido en la clase de origen alcanza a la vinculada sigue abierto (RF-76, pregunta 21).
- Una clase archivada es de solo lectura (RN-10): no abre clases en vivo.
- La regla se aplica en el backend.
```

**P-4 · §6 Vistas**, una viñeta al final del bloque "Desde ADMIN-01" (después de la línea 302) [H, S-08]:
- Nuevo (Enmienda 1, N-04): `**Desde DOCS-05 (2026-11-12).** "Clase en vivo (anfitrión)" del maestro pasa a ser la antesala desde la que programa la clase (RF-40) y entra al aula de BigBlueButton; "Clase en vivo" del estudiante, la antesala desde la que entra. El aula, con su video, pantalla compartida y chat, es la de BigBlueButton. La lista de grabaciones sigue donde ya está ("Grabaciones" del estudiante); dónde la ve el maestro lo fija ENVIVO. El Administrador suma sus salas (RF-75). Estas vistas se cuentan cuando el plan de ENVIVO las fije.`

**P-5 · RNF-06 (línea 326)** [I §5, H: cupo abierto].
- Nuevo: `| RNF-06 | Clases en vivo: la capacidad depende del plan contratado con el proveedor alojado de BigBlueButton, que se elige por el pico de personas conectadas a la vez (en algunos proveedores, también por las salas a la vez). Hay cupos configurables y, al alcanzarlos, el sistema lo informa en lugar de fallar. El cupo por sala y lo que ve el alumno con la sala llena los decide el plan de ENVIVO (**pendiente por confirmar**, pregunta 20) |`

**P-6 · RNF-10 (línea 330)** [H, DH-02 a].
- Nuevo: `| RNF-10 | **Independencia tecnológica:** sin AWS. Proveedores aprobados: DigitalOcean (servidor), Cloudflare (DNS, frontend y archivos), Resend (correo) y, para las clases en vivo, un proveedor alojado de BigBlueButton que el humano aprueba por escrito al contratarlo, también para el plan gratuito de desarrollo (DOCS-05). Todos deben poder sustituirse cambiando configuración (el de video, con la URL y el secreto de su API), y el núcleo debe poder mudarse a un servidor del colegio restaurando un respaldo |`

**P-7 · RNF-13 (línea 332)** [DH-07 a; I §2 y §5].
- Actual: `… un servidor pequeño de costo fijo y pago por uso en archivos y video. …`
- Nuevo: `… un servidor pequeño de costo fijo, pago por uso en archivos y, para el video, un plan mensual por capacidad simultánea que se sube o se baja entre periodos sin cambiar código (DOCS-05). …` (el resto igual).

**P-8 · Hito 2 (línea 340)** [H].
- Nuevo: `| **2. Clases en vivo** | Programar e iniciar clase, sala con video/pantalla/chat, grabación, lista de grabaciones, aviso de clase por comenzar. Desde DOCS-05, con BigBlueButton: salas del Administrador (RF-75) y clases vinculadas con sus grabaciones (RF-76, RF-77) |`

**P-9 · Preguntas 7 y 9 de §11 (líneas 376 y 378)** [H, I §9].
- 7 nuevo: `7. Cuántas personas hay conectadas a la vez en la hora más cargada: determina el plan del proveedor alojado de BigBlueButton (`docs/trabajo/ENVIVO-investigacion-bigbluebutton.md`, §5). **Pendiente del colegio** (DOCS-05).`
- 9 nuevo: `9. Política de retención de grabaciones. **Resuelta el 2026-11-11 (decisión del humano):** no hay plazo; se conservan hasta que el Administrador las borre (RF-77).`

**P-10 · Bloque nuevo al final de §11**, después de la pregunta 17 [I §4.7 y §9, sin cerrar nada].

```
**Preguntas abiertas de DOCS-05 (2026-11-12).** Las del colegio y las del proveedor se responden antes de contratar; las demás las cierra el plan de ENVIVO con el humano. Detalle en `docs/trabajo/ENVIVO-investigacion-bigbluebutton.md`, §4.7 y §9. La pregunta 7 (el pico de personas a la vez) es del colegio.

18. Colegio: ¿aprueba el gasto mensual del plan? Para salir a producción con clases en vivo hace falta la cuenta del proveedor contratada a nombre del colegio (decisión del humano, 2026-11-11): ¿con un correo institucional y una contraseña propia? ¿Su aviso de privacidad ya cubre grabaciones de voz e imagen con un proveedor externo? ¿Su restricción de trabajar de forma independiente excluye al proveedor candidato?
19. Salas del Administrador: ¿para qué son y quién entra: usuarios de la plataforma elegidos uno por uno, toda una clase o personas externas con un enlace? (RF-75)
20. Aula y grabación: ¿el aula se abre en una pestaña nueva o embebida en la plataforma? ¿La grabación es siempre automática o el maestro la inicia y la detiene? (RF-41) ¿Los alumnos entran en modo webinar, sin cámara ni micrófono, o el maestro puede darles la palabra? ¿Cuál es el cupo por sala y qué ve el alumno cuando la sala está llena? (RNF-06)
21. Clases vinculadas: ¿al vincular, la clase recibe también lo que ya existía o solo lo nuevo? ¿Una clase puede recibir de más de una clase de origen? ¿Quién crea el vínculo y cuándo? ¿Los recursos se comparten como una sola publicación o como copias que se mantienen iguales, y de quién son sus comentarios? ¿Borrar o editar un recurso en la clase de origen alcanza a la vinculada? (RF-76)
22. Proveedor candidato (Aulas en Vivo): ¿entrega la URL y el secreto de la API para una plataforma propia? ¿Dónde están sus servidores y qué versión de BigBlueButton ofrece? ¿Cuál es el máximo de personas por sala, y "usuarios simultáneos" es el total entre todas las salas? ¿Funcionan por API el aviso de grabación lista y la descarga del video en MP4? ¿Cuáles son sus términos de servicio, su política de privacidad y su retención de grabaciones? (RF-77)
```

Lo que no cambia en el PRD: §1, §2, §3, RF-20, RF-22, RF-23, RF-40, RF-42, la tabla de avisos de §4.5, RF-63 (su bloque de grabaciones sigue "pendiente por confirmar"), RN-03, §10 (el criterio de la clase de 30 personas) y el supuesto de §11 sobre el alumno restringido dentro de una clase en vivo.

### 2. `docs/ARCHITECTURE-ESSENTIALS.md`

**E-1 · "Proveedores", línea 11** [H, DH-02 a].
- Nuevo: `- Aprobados: **DigitalOcean** (Droplet), **Cloudflare** (DNS, Pages, R2), **Resend** (correo) y, para clases en vivo, **un proveedor alojado de BigBlueButton** que el humano aprueba por escrito al contratarlo, también para el plan gratuito de desarrollo (candidato sin verificar; D-33). LiveKit Cloud salió de la lista el 2026-11-11. Nada más sin aprobación explícita del humano.`

**E-2 · "Stack", línea 16**: quitar ` · LiveKit React` (queda `… · FullCalendar → **Cloudflare Pages** …`) [H].

**E-3 · "Stack", línea 22** [H, I §4.6].
- Nuevo: `- **Video:** BigBlueButton por su API con un proveedor alojado (D-33), detrás de `adapters/live` · sin servidor local en `dev`: plan gratuito del proveedor y, en las pruebas, un doble`

**E-4 · "Capas", línea 32**: sin cambio (DH-06 a: la lista conserva `livekit-server-sdk` y el módulo `live` sigue).

**E-5 · "Autorización", línea 52** [H].
- Actual: `… Sin tokens de LiveKit, archivos ni grabaciones.`
- Nuevo: `… Sin entradas a clases en vivo, archivos ni grabaciones.`

**E-6 · "Tablas", después de la línea 78** (viñeta nueva, sin tocar la lista de la 76) [S-03].
- Nuevo: `**Previsto (DOCS-05), sin migrar; lo decide el plan de ENVIVO:** `clases_en_vivo` pierde las columnas del diseño con LiveKit; la investigación propone `sesiones_en_vivo` (con `clase_id` nulo en una sala del admin), `grabaciones` (el archivo), `grabaciones_de_clase` (qué clases la muestran) y una relación de clases vinculadas (`docs/trabajo/ENVIVO-investigacion-bigbluebutton.md`, §4.5 y §4.7).`

**E-7 · "Archivos", línea 102** [A: sin Egress no hay token de Egress].
- Nuevo: `- Tokens de mínimo privilegio: aplicación y respaldos. Si copiar las grabaciones necesita una credencial propia, la define ENVIVO.`

**E-8 · "Clases en vivo", líneas 110–116, sección completa** [H; marcas de abierto según S-01].

```
## Clases en vivo
- **BigBlueButton por su API, con un proveedor alojado** (D-33; decisión con el cliente, 2026-11-11). El proveedor concreto se aprueba por escrito al contratarlo (candidato sin verificar). Cambiar de proveedor o pasar a un servidor propio es cambiar la URL y el secreto de la API (`BBB_URL` y `BBB_SECRET`, previstos). El secreto solo en el `.env` del backend. Todo detrás de `adapters/live`. Zoom queda como alternativa registrada.
- La API crea las salas y emite la entrada de cada persona (el enlace firmado de `join`, con nuestro id, su nombre y su rol), por petición y tras toda la cadena de autorización. El aula, el chat y la pizarra son de BigBlueButton; nuestra interfaz es la antesala (programar, entrar, grabaciones).
- `dev`: sin servidor local de video; se desarrolla contra el plan gratuito con API del proveedor y las pruebas usan un doble del adaptador, sin llamar al proveedor. El servicio `livekit` de `infra/` ya no se usa; lo retira ENVIVO (`docs/ESTADO.md`, §3).
- Grabaciones (decisiones del humano y del dueño, 2026-11-11): se copian a nuestro almacenamiento (`grabaciones/`) y quedan ligadas a su clase, si el proveedor entrega el video por API; un solo archivo, que las clases vinculadas muestran por referencia y reciben en cuanto está listo; nada se borra automáticamente y solo el admin las borra. El aviso de grabación lista (firma verificada) encola `GRABACION_LISTA` y se conecta en DEPLOY, porque necesita una URL pública; hasta entonces, las grabaciones se recuperan por sondeo.
- **Abierto, lo cierra el plan de ENVIVO con el humano** (PRD, preguntas 18 a 22): pestaña nueva o aula embebida; grabación automática o controlada por el maestro (RF-41); modo webinar o dar la palabra; cupo por sala y qué ve el alumno con la sala llena; para qué son las salas del admin y quién entra; las preguntas de clases vinculadas; y cómo llega una grabación a nuestro almacenamiento: si cabe en la regla 6 de `AGENTS.md` (los archivos no pasan por Node) o necesita una excepción, que decide el humano.
```

Nota: "la regla 6" se nombra porque copiar del proveedor a nuestro almacenamiento la roza (R-01 de este plan). La frase no decide ni presume ninguna de las dos salidas (Enmienda 1, N-03); solo impide que ENVIVO lo dé por resuelto.

**E-9 · "Reglas de negocio", Recursos, línea 130** [H, inv. §4.7 decisión 3 y pregunta 4].
- Actual: `… Grabaciones: pendiente de ENVIVO. …`
- Nuevo: `… Grabaciones: pendiente de ENVIVO. Con clases vinculadas (DOCS-05; RF-76), la vinculada recibe los recursos de aprendizaje de su clase de origen, no los del docente; la forma (una publicación visible en las dos o copias sincronizadas) y de quién son los comentarios, por confirmar en ENVIVO. …`

**E-10 · "Reglas de negocio", Clases archivadas, borradas y duplicadas, línea 133**: al final de la viñeta [H, RN-12].
- Nuevo (se agrega): ` Con clases vinculadas (DOCS-05; RN-12), el objetivo del cliente es que archivar o borrar definitivamente una clase no deje a su vinculada sin lo que ya recibió; cómo, lo fija ENVIVO, y el conteo del borrado definitivo tendrá que distinguir lo que se borra de lo que se conserva.` (Enmienda 1, M-01: habla solo de la clase; nada de borrar una grabación, que es del Administrador, ni de borrar o editar un recurso, que sigue abierto.)

Lo que no cambia: "Asíncrono y notificaciones" (eventos), "Trabajos diferidos" (el de 15 minutos), los buckets de "Archivos" (`grabaciones/` sigue).

### 3. `CLAUDE.md`

| # | Línea | Actual | Nuevo |
|---|---|---|---|
| C-1 | 15 | `…, React Router, FullCalendar, LiveKit React` | `…, React Router, FullCalendar` |
| C-2 | 16 | `… (R2 en `prod`, MinIO en `dev`), LiveKit Cloud, correo con Resend. …` | `… (R2 en `prod`, MinIO en `dev`), clases en vivo con BigBlueButton por su API (proveedor alojado), correo con Resend. …` |
| C-3 | 17 | `- **`/infra`** — Docker Compose, Caddyfile, configuración de LiveKit, scripts de respaldo` | `- **`/infra`** — Docker Compose, Caddyfile y scripts de respaldo. El servicio `livekit` de desarrollo y `infra/livekit/` ya no se usan: los retira ENVIVO` |
| C-4 | 21 | `Proveedores aprobados: DigitalOcean, Cloudflare, LiveKit Cloud y Resend.` | `Proveedores aprobados: DigitalOcean, Cloudflare y Resend y, para clases en vivo, un proveedor alojado de BigBlueButton que el humano aprueba al contratarlo (`AGENTS.md`, regla 11).` |
| C-5 | tabla "Módulos", fila `envivo` | `Sala (asistente y anfitrión), programar clase, grabaciones` | `La antesala de la clase en vivo (programar, entrar al aula de BigBlueButton con el enlace que firma la API) y las grabaciones; las salas del administrador (RF-75) las ubica el plan de ENVIVO` (roles sin cambio) |
| C-6 | 96 | `- `services/liveService.ts` — conexión con LiveKit` | `- `services/liveService.ts` — hoy solo comentarios con el contrato previsto para LiveKit, que ya no aplica: con BigBlueButton el navegador abre el enlace que firma la API. ENVIVO lo reescribe o lo borra` |
| C-7 | 105 | `…, live (LiveKit)` | `…, live (BigBlueButton por su API; llega con ENVIVO)` |
| C-8 | 260 | `(DigitalOcean, Cloudflare, LiveKit Cloud, Resend)` | `(DigitalOcean, Cloudflare, Resend y un proveedor alojado de BigBlueButton aprobado por escrito por el humano; `AGENTS.md`, regla 11)` (Enmienda 1, detalle menor) |

### 4. `AGENTS.md`

| # | Línea | Actual | Nuevo |
|---|---|---|---|
| G-1 | 6 | `…; video en LiveKit Cloud; correo con Resend. …` | `…; clases en vivo con BigBlueButton por su API, con un proveedor alojado; correo con Resend. …` |
| G-2 | 48 | `docker compose up -d     # PostgreSQL, MinIO y LiveKit en modo dev` | `docker compose up -d     # PostgreSQL y MinIO; también levanta el LiveKit de desarrollo, que ya no se usa y retira ENVIVO` |
| G-3 | 58 | `infra/         docker-compose, Caddyfile, LiveKit, respaldos` | `infra/         docker-compose, Caddyfile, respaldos (y livekit/, sin uso hasta que ENVIVO lo retire)` |
| G-4 | 64 | regla 1 | Sin cambio (DH-06 a) |
| G-5 | 74 | `Aprobados: DigitalOcean, Cloudflare (DNS, Pages, R2), LiveKit Cloud y Resend.` | `Aprobados: DigitalOcean, Cloudflare (DNS, Pages, R2), Resend y, para clases en vivo, un proveedor alojado de BigBlueButton que el humano aprueba por escrito al contratarlo, también para el plan gratuito de desarrollo (D-33). LiveKit Cloud salió de la lista el 2026-11-11.` |

### 5. `.claude/agents/arquitecto.md` y `.claude/agents/tester.md` (DH-05 a, autorizada: solo K-1 a K-3)

| # | Archivo y línea | Actual | Nuevo |
|---|---|---|---|
| K-1 | `arquitecto.md:23` | `(DigitalOcean, Cloudflare, LiveKit Cloud, Resend)` | `(DigitalOcean, Cloudflare, Resend y un proveedor alojado de BigBlueButton aprobado por el humano; `AGENTS.md`, regla 11)` |
| K-2 | `tester.md:39` | `Incluye tokens de LiveKit, URLs de archivos y grabaciones.` | `Incluye las entradas a clases en vivo (el enlace firmado de BigBlueButton), URLs de archivos y grabaciones.` |
| K-3 | `tester.md:49` | `(incluidos archivos, LiveKit y `GET /me`)` | `(incluidos archivos, clases en vivo y `GET /me`)` |
| K-4 | `tester.md:84` | lista con `livekit-server-sdk` | Sin cambio (DH-06 a) |

### 6. `docs/DESIGN.md`

**D-1 · §7.1, tabla "Alcance por pantalla", línea 361** [I §10; marca de origen "propuesta"]. Solo cambia "clase en vivo" dentro de la primera celda:
- Actual: `… calificar, calendario, clase en vivo, crear/editar clase …`
- Nuevo: `… calificar, calendario, clase en vivo (la antesala: programar, entrar y la lista de grabaciones; el aula es la de BigBlueButton y no se pinta con nuestros componentes; si se abre en una pestaña nueva o embebida lo decide ENVIVO; propuesta (DOCS-05)), crear/editar clase …`

Nada más de `DESIGN.md` cambia: la insignia "En vivo" (§3 y §7), el ejemplo "Entrar a la sala" (§9) y "El bloque de grabaciones queda para ENVIVO" (§7.30) siguen valiendo. Las salas del administrador quedan cubiertas por la fila de "todas las vistas del administrador" (opacas). No es un patrón visual nuevo; ENVIVO documenta la antesala cuando la diseñe.

### 7. `docs/ARCHITECTURE.md`

| # | Lugar | Cambio | Origen |
|---|---|---|---|
| R-1 | Línea 6 (cabecera) | "servicios de pago por uso para lo que varía" → "servicios de pago por uso para archivos y un plan mensual de video que se ajusta entre periodos" | DH-07 |
| R-2 | §1, principio 1 (línea 10) | La lista de proveedores con el texto de DH-02: "…**Cloudflare** (DNS, frontend y archivos), **Resend** (correo) y, para clases en vivo, **un proveedor alojado de BigBlueButton** que el humano aprueba por escrito al contratarlo (D-33). Cualquier otro requiere aprobación explícita." | H, DH-02 |
| R-3 | §1, principio 2 (línea 11) | "…y solo PostgreSQL, MinIO y LiveKit van en Compose." → "…y solo PostgreSQL y MinIO se usan en Compose (el servicio `livekit` sigue en el archivo, sin uso, hasta que ENVIVO lo retire)." | Transición |
| R-4 | §1, principio 3 (línea 12) | "archivos, video y frontend solo cuestan si se usan" → "archivos y frontend solo cuestan si se usan; el video, un plan mensual por capacidad que se sube o se baja entre periodos sin cambiar código" | DH-07 |
| R-5 | §2, fila Frontend (línea 25) | Quitar ` · `@livekit/components-react`` | H |
| R-6 | §2, fila "Clases en vivo" (línea 34) | "**LiveKit Cloud** + Egress hacia R2 · `livekit-server --dev` en desarrollo \| LiveKit / local" → "**BigBlueButton** por su API, con un proveedor alojado (D-33); en desarrollo, el plan gratuito del proveedor \| Proveedor alojado" | H |
| R-7 | §3, diagrama (líneas 62, 67, 73–75) | Descripción: el nodo `LK` pasa a `BBB[Proveedor alojado<br/>de BigBlueButton]`; `B -- abre el aula --> BBB`; `API -- crea salas y firma entradas --> BBB`; `BBB -. aviso de grabación lista (DEPLOY) .-> API` (a la API, no al nodo de Cloudflare: cómo llega al servidor lo fija DEPLOY; Enmienda 2); `W -. sondeo de grabaciones (previsto, ENVIVO) .-> BBB`. Se quita `LK -- grabaciones --> R2` y no se dibuja ninguna flecha de copia: cómo llegan las grabaciones a nuestro almacenamiento lo decide ENVIVO (R-01; Enmienda 1, N-03). El nodo `R2` conserva "archivos y grabaciones" | H, I §4.3; flechas punteadas = previsto |
| R-8 | §4, "Qué corre dónde", fila Video (línea 88) | "LiveKit Cloud \| Plan gratuito; de pago al haber uso real" → "Proveedor alojado de BigBlueButton (por contratar) \| Plan mensual por capacidad simultánea (personas y salas a la vez); plan gratuito para desarrollo" | I §2 y §5 |
| R-9 | §4, "Contenedores" (línea 112) | "· `livekit` (modo dev)." → "· `livekit` (modo dev; ya no se usa: lo retira ENVIVO, D-33)." | Transición |
| R-10 | §4, "Entornos", fila `dev` (línea 117) | "Clases en vivo con el LiveKit local de `infra/` (`livekit-server --dev`); las grabaciones no se prueban de punta a punta en `dev` (§12, D-26)" → "Clases en vivo contra el plan gratuito con API del proveedor alojado de BigBlueButton, la única cuenta externa de `dev` (datos ficticios; URL y secreto en `backend/.env`); las pruebas usan un doble y no llaman al proveedor; las grabaciones se recuperan por sondeo (§12, D-33)". Además, "Todo local y sin cuentas externas" pasa a "Todo local salvo el plan gratuito de video". | H (hoja de ruta) |
| R-11 | §4, "Entornos", fila `prod` (línea 118) | "Droplet + Cloudflare + LiveKit Cloud" → "Droplet + Cloudflare + proveedor alojado de BigBlueButton" | H |
| R-12 | §4, viñeta de `infra/.env` (línea 121) | "…credenciales y puertos de PostgreSQL, MinIO y LiveKit en local." → "…credenciales y puertos de PostgreSQL y MinIO en local (el bloque `LIVEKIT_*` sigue, sin uso, hasta que ENVIVO lo retire)." | Transición |
| R-13 | §5, árbol (línea 155) | "docker-compose de desarrollo, livekit/ y postgres/init/; …" → "docker-compose de desarrollo, postgres/init/ y livekit/ (sin uso; lo retira ENVIVO); …" | Transición |
| R-14 | §5, "Regla de capas" (línea 166) | Sin cambio | DH-06 a |
| R-15 | §5, tabla de adaptadores, fila `live` (línea 177) | "\| `live` \| livekit-server-sdk \| Tokens, salas, grabaciones, verificación de webhooks \|" → "\| `live` \| API de BigBlueButton por HTTP, con `checksum` (previsto, ENVIVO) \| Crear o reabrir salas, emitir la entrada de cada persona, grabaciones y verificar el aviso de grabación lista \|" | I §4.1 |
| R-16 | §6, línea 224 | "La restricción también impide emitir tokens de LiveKit y URLs de archivos o grabaciones." → "La restricción también impide emitir entradas a una clase en vivo y URLs de archivos o grabaciones." | H |
| R-17 | §7, fila `envivo` (línea 241) | Descripción: "Sin rutas fijadas: las fija el plan de ENVIVO. Previsto (DOCS-05): programar y listar las sesiones de una clase bajo `/clases/{claseId}/…` (sexto paso); las salas del administrador bajo `/admin/…`; «Entrar», que responde la entrada firmada (`join`) por persona y por petición; y una ruta pública sin JWT para el aviso de grabación lista, que verifica la firma con el secreto compartido, responde rápido y encola. El aviso de sesión terminada (`meetingEndedURL`) lleva un token no adivinable." Sin nombrar la ruta del diseño anterior | I §4.2–§4.4 |
| R-18 | §8, fila `GRABACION_LISTA` (línea 271) | "`GRABACION_LISTA` (desde webhook) \| Registra el archivo en `clases_en_vivo`" → "`GRABACION_LISTA` (desde el aviso de grabación lista de BigBlueButton o, hasta DEPLOY, desde el sondeo) \| Copia la grabación a nuestro almacenamiento y la liga a su clase y a sus vinculadas (previsto; cómo copia, R-01 de DOCS-05, lo fija ENVIVO)" | H, I §4.7 |
| R-19 | §11, punto nuevo 10 (después de la línea 336) | Descripción: "Previsto (DOCS-05). Las grabaciones se copian a `campus-privado/grabaciones/` y quedan ligadas a su clase (decisión del humano, 2026-11-11), si el proveedor entrega el video por API. Un video es un solo objeto que las clases vinculadas muestran por referencia (decisión del dueño): a diferencia de duplicar (punto 9, D-32), aquí la referencia es lo pedido. Consecuencias para ENVIVO: borrar definitivamente una clase y `LIMPIEZA_DIARIA` no pueden borrar el objeto de una grabación que otra clase muestra; el conteo del borrado distingue lo que se borra de lo que se conserva. La clave del objeto (hoy, el prefijo `grabaciones/{claseId}/` de la tabla de buckets) la fija ENVIVO, porque una grabación se muestra en varias clases y una sala del administrador no tiene clase. **Abierto:** cómo llega el video del proveedor a nuestro almacenamiento y si cabe en el punto 3 (los archivos no pasan por Node) o necesita una excepción, que decide el humano en el plan de ENVIVO." (Enmienda 1, N-03 y detalle menor de la revisión.) | H, I §4.7, A |
| R-20 | §11, viñeta de tokens (línea 345) | "Tres tokens de R2 distintos y de mínimo privilegio: aplicación, Egress de LiveKit (solo escritura en `grabaciones/`) y respaldos." → "Credenciales del almacén distintas y de mínimo privilegio: aplicación y respaldos. Si copiar las grabaciones necesita una credencial propia (solo escritura en `grabaciones/`), la define ENVIVO." (Enmienda 2: la frase que DOCS-05 reescribe no nombra R2, porque DEPLOY parte de un almacén propio; el resto de §11 lo corrige DEPLOY) | A |
| R-21 | §12, sección completa (líneas 348–357) | Reescrita, abajo | H, I |
| R-22 | §14, fila `clases_en_vivo` (línea 428) | Columnas: "`id`, `clase_id`, `titulo`, `fecha_inicio`, `estado`, `trabajo_id` (sin migrar; las columnas de grabación del diseño con LiveKit se quitaron: ver «Previsto (DOCS-05)»)" e índices sin cambio | S-03 |
| R-23 | §14, tabla "Previsto", filas nuevas (después de la 442) | `sesiones_en_vivo` (ENVIVO): `clase_id` opcional, nulo en una sala del administrador; quién la creó, título, inicio y fin programados, `meeting_id` propio y no adivinable, estado. `grabaciones` (ENVIVO): el archivo, la sesión de origen, fecha de grabación, duración y tamaño. `grabaciones_de_clase` (ENVIVO): qué clases muestran cada grabación; se escribe al procesar `GRABACION_LISTA` para la clase de origen y sus vinculadas en la misma transacción. Vínculo entre clases (ENVIVO): la clase que recibe y la de origen. Invitados de una sala del administrador: por definir (PRD pregunta 19). Encabezado de las filas: "Borrador de la investigación (§4.5 y §4.7); lo decide ENVIVO" | I §4.5, §4.7 |
| R-24 | §15, fila "LiveKit Cloud" (línea 471) | "\| Proveedor alojado de BigBlueButton \| 200 alumnos en un día pesado, en aulas de 40 o menos, más hasta 16 maestros y el administrador; el pico a la vez está sin confirmar \| Limitado por el plan contratado (personas y salas a la vez; los proveedores consultados limitan cada sesión a 100 o 150) \| **Cuello de botella: depende de presupuesto**; el plan se elige por el pico \|" | H, I §5 |
| R-25 | §16, línea 484 | "El webhook de LiveKit verifica la firma." → "Clases en vivo (previsto, ENVIVO): las llamadas a la API de BigBlueButton llevan `checksum` con SHA-256 o superior; el aviso de grabación lista verifica su firma (JWT HS256 con el secreto compartido); el de sesión terminada lleva un token no adivinable y va por HTTPS. El enlace de entrada se puede reenviar: la mitigación la decide ENVIVO." | I §4.2–§4.4 |
| R-26 | §18, paso 4 (línea 516) | "…un correo de recuperación de contraseña que llegue a la bandeja de entrada, y una grabación completa de una clase en vivo que llegue a R2 y aparezca en la lista del alumno (D-26)." → "…un correo de recuperación de contraseña que llegue a la bandeja de entrada (D-26), y una grabación completa de una clase en vivo que llegue a nuestro almacenamiento por el aviso de grabación lista y aparezca en la lista del alumno (D-33)." La línea 531 (el requisito previo del correo, "(DOCS-02a, D-26)") no cambia (Enmienda 1, M-02) | H |
| R-27 | §18, "Requisitos previos", línea 530 | → "Para salir a producción con clases en vivo: la cuenta del proveedor de BigBlueButton contratada a nombre del colegio (el gasto, pendiente de aprobación del cliente), su URL y su secreto en el `.env` del servidor, y el aviso de grabación lista conectado a la URL pública de la API (hasta entonces, sondeo) (DOCS-05, D-33)." (Enmienda 2: consecuencia 5 de la hoja de ruta) | H |
| R-28 | §18, línea 532 | "…que llegue a R2 y aparezca en la lista del alumno (DOCS-02a, D-26)." → "…que llegue a nuestro almacenamiento y aparezca en la lista del alumno (DOCS-05, D-33)." | H |
| R-29 | §18, "Migración a un servidor propio" (después del paso 6) | Paso 7 nuevo: "Clases en vivo: se quedan con el proveedor alojado, o se apunta a un servidor de BigBlueButton propio cambiando la URL y el secreto; ese servidor es dedicado y no comparte máquina con la API (`docs/trabajo/ENVIVO-investigacion-bigbluebutton.md`, §6)." | I §3 y §6 |
| R-30 | §19, riesgo 3 (línea 557) | "**Clases en vivo:** proveedor alojado sin probar (prueba piloto antes de contratar), con ubicación de servidores y latencia sin verificar; alumnos en celular sin app nativa; enlaces de entrada que se pueden reenviar; y la copia de las grabaciones a nuestro almacenamiento, que depende de que el proveedor entregue el video por API." | I §7 |
| R-31 | §20, D-10 y D-26 (líneas 580 y 596) | Al inicio de la celda "Decisión" de D-10: "**Sustituida por D-33 (DOCS-05, 2026-11-11).** ". Al inicio de la de D-26: "**Sustituida por D-33 (DOCS-05, 2026-11-11) en lo de clases en vivo; sigue vigente la verificación del correo de recuperación en DEPLOY.** ". El resto de cada fila, sin cambio (Enmienda 1, M-02) | S-05 |
| R-32 | §20, fila nueva D-33 | Texto abajo | H, I |

**R-21 · §12 "Clases en vivo", texto nuevo:**

```
## 12. Clases en vivo

- **BigBlueButton por su API, con un proveedor alojado** (D-33; decisión del humano con el cliente, 2026-11-11). El proveedor concreto se aprueba por escrito al contratarlo; el candidato no ha confirmado que entregue la URL y el secreto de la API (`docs/trabajo/ENVIVO-investigacion-bigbluebutton.md`, §9). La API es la misma contra un proveedor alojado, un servidor propio o uno del colegio: cambiar es cambiar la URL y el secreto (`BBB_URL` y `BBB_SECRET`, nombres previstos). Zoom queda como alternativa registrada (otra implementación del adaptador, no un cambio de configuración); LiveKit se descartó porque obligaba a construir el aula.
- **Lo que no cambia:** la API emite la entrada de cada persona tras toda la cadena de middleware y la pertenencia a la clase; el secreto vive solo en el `.env` del backend, nunca en el frontend ni en los logs; un alumno restringido no recibe entrada ni grabaciones; una clase archivada no abre sesiones; el trabajo diferido `CLASE_POR_COMENZAR` (§10), cuyo aviso llega con NOTIFICACIONES, que se publica después de DEPLOY (`docs/ESTADO.md` 2b): la plataforma sale a producción sin ese aviso.
- **El aula es de BigBlueButton.** El navegador abre el cliente de BigBlueButton con el enlace firmado que responde la API (`join`, con nuestro id, el nombre y el rol `MODERATOR` o `VIEWER`). Chat, pizarra, láminas, encuestas y grupos son suyos; no hay canales de datos nuestros. Nuestra interfaz es la antesala: programar, entrar y la lista de grabaciones.
- **Grabaciones** (decisiones del humano y del dueño, 2026-11-11): se copian a nuestro almacenamiento y quedan ligadas a su clase, si el proveedor entrega el video por API; un solo objeto, que las clases vinculadas muestran por referencia y reciben en cuanto está listo; nada se borra automáticamente y solo el administrador las borra (§11, punto 10). El aviso de grabación lista (`meta_bbb-recording-ready-url`: un POST con un JWT HS256 firmado con el secreto compartido) encola `GRABACION_LISTA`; necesita una URL pública, así que se conecta en DEPLOY. Hasta entonces, las grabaciones se recuperan por sondeo (`getRecordings`, paginado) (hoja de ruta del 2026-11-11).
- **Desarrollo:** sin servidor local de video. Se desarrolla contra el plan gratuito con API del proveedor (una sala y pocos usuarios bastan hasta la subentrega de grabaciones) y las pruebas usan un doble del adaptador, sin llamar al proveedor. El servicio `livekit` de `infra/docker-compose.yml` y `infra/livekit/` siguen en el repositorio, sin uso, hasta que ENVIVO los retire.
- **Cupo:** el plan se elige por el pico de personas conectadas a la vez, sin confirmar todavía (PRD, pregunta 7); algunos proveedores limitan también las salas a la vez. El cupo por sala y lo que ve el alumno con la sala llena los decide ENVIVO (RNF-06).
- **Previsto (DOCS-05), no decidido: lo fija el plan de ENVIVO** (entrada de la investigación, §4): un puerto propio en `core/` con tres operaciones (crear o reabrir la sala de una sesión, emitir la entrada de una persona con su rol, resolver una grabación lista), sin que `core/` conozca a BigBlueButton; `adapters/live` con la firma de las llamadas, el XML de respuesta y la verificación del aviso; `meetingID` propio y no adivinable; `create` idempotente; la entrada emitida justo al pulsar «Entrar», sin mostrarla, como mitigación del enlace reenviable.
- **Abierto (PRD, preguntas 18 a 22):** pestaña nueva o aula embebida; grabación automática o controlada por el maestro (RF-41); modo webinar o dar la palabra; cupo por sala; para qué son las salas del administrador y quién entra; las preguntas de clases vinculadas; cómo llega una grabación a nuestro almacenamiento, si cabe en §11 punto 3 o necesita una excepción que decide el humano; y las preguntas al proveedor.
```

**R-32 · D-33, fila nueva al final de §20:**

```
| D-33 | **Clases en vivo con BigBlueButton por su API, con un proveedor alojado** (decisión del humano con el cliente, 2026-11-11; DOCS-05). Sustituye a D-10 y, en lo de clases en vivo, a D-26 (la verificación del correo de recuperación en DEPLOY sigue en D-26). La API crea las salas y firma la entrada de cada persona; el aula, el chat y la pizarra son de BigBlueButton. Decisiones del humano y del dueño del mismo día: las grabaciones se copian a nuestro almacenamiento y quedan ligadas a su clase; un video es un solo archivo que las clases vinculadas muestran por referencia y reciben en cuanto está listo; nada se borra automáticamente y solo el administrador borra grabaciones. En `dev`, el plan gratuito del proveedor; el aviso de grabación lista espera a DEPLOY y, mientras tanto, las grabaciones se recuperan por sondeo. El proveedor concreto está por contratar (candidato sin verificar); las preguntas abiertas, en el PRD (18 a 22) y en `docs/trabajo/ENVIVO-investigacion-bigbluebutton.md` | Zoom Pro (queda como alternativa registrada, si la prueba piloto sale mal o el colegio prefiere no depender de un proveedor chico; sería otra implementación del adaptador) · LiveKit Cloud o autoalojado (D-10) · BigBlueButton en un servidor propio desde ya | Aula completa que maestros y alumnos ya conocen; las salas del administrador son una llamada a la API, sin licencia; la identidad la firma el backend, así que la asistencia es confiable; cambiar de proveedor o pasar a un servidor propio es cambiar dos variables. LiveKit obligaba a construir el aula. La referencia en lugar de la copia (distinto de D-32) es lo que pidió el dueño para que la clase vinculada no se quede sin sus grabaciones |
```

Lo que no cambia en `ARCHITECTURE.md`: §8 (salvo la fila de `GRABACION_LISTA`), §10 (`CLASE_POR_COMENZAR`), §11 (buckets y prefijo `grabaciones/{claseId}/`), §13, §17, el diagrama de §14 (S-07) y el resto de §20.

### 8. `docs/ESTADO.md`

Lo edita el arquitecto (DH-01 d), y solo estos cuatro lugares; las secciones 1, 2, 4 y 6, la línea 5 y lo que el orquestador ya escribió el 2026-11-12 (la hoja de ruta nueva de 2b con sus cinco consecuencias, la marca de "primera versión" y la fila del `chore` de higiene de pruebas) quedan a cargo del orquestador. Las líneas se citan del árbol de la Enmienda 2 (`ESTADO.md` con SHA-256 `a7391c0e…`); si se mueven, manda el texto "Actual".

**T-1 · 2b, viñeta de la decisión (línea 264; 258 en la base)**, solo la última frase:
- Actual: `Hasta DOCS-05, `PRD.md`, `ARCHITECTURE.md`, `ARCHITECTURE-ESSENTIALS.md`, `CLAUDE.md`, `AGENTS.md`, `DESIGN.md` y la nota de infraestructura de este archivo siguen nombrando LiveKit: lo corrige DOCS-05, no es una contradicción que detenga a un agente.`
- Nuevo: `Desde DOCS-05, los documentos vivos dicen BigBlueButton. LiveKit sigue nombrado a propósito en el historial, en las decisiones sustituidas (D-10 entera y D-26 en lo de clases en vivo), en la lista de librerías de la regla 1 y en las frases que describen lo que todavía hay en el repositorio sin uso (el servicio `livekit` y su bloque de variables de `infra/`, `eslint.config.mjs`, `services/liveService.ts` y la guía de `README.md`), que retira ENVIVO (§3). Eso no es una contradicción que detenga a un agente.` (DH-06 a y DH-03 a.)

**T-2 · 2b, punto 9 (línea 281; 275 en la base)**, las frases "Va después de FORO-01 y antes de NOTIFICACIONES. Los documentos se actualizan en DOCS-05; el plan de ENVIVO cierra…":
- Nuevo: `Va después de FORO-01 y antes del retiro de compatibilidad e higiene de pruebas y de DEPLOY, que llega justo después (hoja de ruta del 2026-11-11, escrita el 2026-11-12, arriba): la plataforma sale a producción con clases en vivo y sin NOTIFICACIONES, así que el aviso de "clase por comenzar" llega después. Los documentos se actualizaron en DOCS-05 (PRD §4.7 con RF-75 a RF-77 y RN-12, RF-41, RNF-06, RNF-10 y las preguntas 7, 9 y 18 a 22; `ARCHITECTURE.md` §12 y D-33; ESSENTIALS "Clases en vivo"). El plan de ENVIVO cierra las preguntas abiertas de las secciones 4.7 y 9 de `docs/trabajo/ENVIVO-investigacion-bigbluebutton.md` y las filas de §3 con destino ENVIVO; por la migración y por `infra/`, su carril previsible es sensible.` (El resto del punto, sin cambio.)

**T-3 · §3, filas nuevas** (al final de la tabla; columnas "Pendiente | Destino | Dónde está anotado"):

| Pendiente | Destino | Dónde está anotado |
|---|---|---|
| DOCS-05: retirar lo que queda de LiveKit en el repositorio: el servicio `livekit` de `infra/docker-compose.yml`, `infra/livekit/`, el bloque `LIVEKIT_*` de `infra/.env.example`, `livekit-server-sdk` de `eslint.config.mjs` y (DH-06) de la regla 1 de `AGENTS.md`, ESSENTIALS "Capas", `ARCHITECTURE.md` §5, `.claude/agents/tester.md:84` y `backend/src/adapters/README.md`; reescribir o borrar `frontend/src/services/liveService.ts`; la guía del entorno de `README.md`; y las frases de transición de los documentos (`AGENTS.md` comandos y estructura, `CLAUDE.md` `/infra` y `liveService.ts`, `ARCHITECTURE.md` §1, §4, §5 y §12, ESSENTIALS "Clases en vivo" y la nota de §5 de este archivo) | ENVIVO, primera subentrega (DH-03 a) | `docs/trabajo/DOCS-05-envivo-bigbluebutton/plan.md`, DH-03 y "Diseño" |
| DOCS-05: `BBB_URL` y `BBB_SECRET` (nombres previstos) en `config/env.ts` y `backend/.env.example`; las pruebas nunca llaman al proveedor | ENVIVO | `plan.md` de DOCS-05, S-04; investigación, §4.4 |
| DOCS-05, R-01: copiar las grabaciones del proveedor a nuestro almacenamiento frente a la regla 6 de `AGENTS.md` y ESSENTIALS "Archivos" (los archivos nunca pasan por Node): el plan de ENVIVO trae primero si el proveedor puede dejarlas en un almacén S3 y, si no, la excepción que propone, como decisión del humano | ENVIVO (decisión del humano en su plan) | `plan.md` de DOCS-05, R-01 |
| DOCS-05, R-03: con grabaciones compartidas por referencia, el borrado definitivo de una clase (`BORRAR_OBJETOS` de ADMIN-01) y `LIMPIEZA_DIARIA` no pueden borrar el objeto de una grabación que otra clase muestra; el conteo del borrado distingue lo que se borra de lo que se conserva | ENVIVO | `plan.md` de DOCS-05, R-03; investigación, §4.7 |
| DOCS-05: para salir a producción con clases en vivo, la cuenta del proveedor de BigBlueButton contratada a nombre del colegio (consecuencia 5; el gasto, pendiente de aprobación del cliente), su URL y su secreto en el `.env` del servidor, el aviso de grabación lista conectado a la URL pública y una grabación real que llegue a nuestro almacenamiento y a la lista del alumno (sustituye a lo de LiveKit Cloud de D-26) | DEPLOY | `ARCHITECTURE.md` §18; 2b, consecuencia 5 |
| DOCS-05: costo y dimensiones del volumen del almacén para grabaciones que solo crecen (sin borrado automático; 0.4788 GB por hora de grabación ligera) y del servidor dedicado de BigBlueButton propio para la etapa del colegio (sin cotizar) | DEPLOY | Investigación de ENVIVO, §4.7 y §6; `docs/trabajo/DEPLOY-investigacion-vps.md` |
| DOCS-05: preguntas al colegio y al proveedor antes de contratar (PRD, preguntas 7, 18 y 22) y la prueba piloto (investigación, §8) | Humano, antes de cerrar el plan de ENVIVO y, en todo caso, antes de DEPLOY | PRD §11 |
| DOCS-05 (DH-04 d): actualizar `docs/trabajo/DEPLOY-investigacion-vps.md` con la decisión de BigBlueButton (lo que dimensiona de LiveKit queda como historia; las grabaciones, que se copian a nuestro almacenamiento, siguen contando en su volumen) y meterlo a git | DEPLOY | `plan.md` de DOCS-05, DH-04 |

**T-4 · §5, nota de infraestructura (línea 538; 532 en la base)**, se agrega al final de la viñeta:
- Nuevo (se agrega): ` Desde DOCS-05 (2026-11-12), `livekit` ya no se usa: las clases en vivo van con BigBlueButton por API (D-33). El servicio sigue en `infra/docker-compose.yml` y `docker compose up -d` lo levanta hasta que ENVIVO lo retire (§3); no estorba.`

### 9. Las dos investigaciones (DH-04 d)

**V-1 · `docs/trabajo/ENVIVO-investigacion-bigbluebutton.md`** (lo edita el arquitecto): una línea nueva después de la línea 9 (la actualización del 2026-11-11), sin tocar nada más, con las dos partes de abajo en una sola línea:
- `**Actualización del 2026-11-12 (DOCS-05):** la decisión ya está en los documentos vivos (`PRD.md` §4.7, `ARCHITECTURE.md` §12 y D-33, ESSENTIALS "Clases en vivo"). La línea "Estado" de arriba, lo que §4.6 dice de las grabaciones (las cambió la decisión del 2026-11-11: se copian a nuestro almacenamiento, §9) y la frase "Ninguno de estos cambios está hecho" de §10 quedan como historia; lo que falta de §10 está en `docs/ESTADO.md` §3.`
- Y al final de esa misma línea (DH-04 d): ` La investigación de DEPLOY que este documento cita (`DEPLOY-investigacion-vps.md`) todavía no está en git; su actualización va a DEPLOY.`

**V-2 · `docs/trabajo/DEPLOY-investigacion-vps.md`: no se aplica (DH-04 d).** El archivo no se edita ni entra al commit; su actualización va a DEPLOY (fila de T-3). El texto propuesto se conserva solo como insumo para ese encargo:
- `**Actualización del 2026-11-12 (DOCS-05):** las clases en vivo se hacen con BigBlueButton por API con un proveedor alojado (`ARCHITECTURE.md`, D-33); LiveKit se descartó, así que lo que este documento dimensiona de LiveKit, Egress y su servidor (§2, §3, §4, §5, §8 y §10) queda como historia. Las grabaciones se copian a nuestro almacenamiento (decisión del humano, 2026-11-11): siguen contando en el volumen de §2 y §8 y, como nada se borra automáticamente, el volumen se dimensiona para acumular. El video se paga como un plan mensual del proveedor (`ENVIVO-investigacion-bigbluebutton.md`, §5); el servidor dedicado de BigBlueButton propio para la etapa del colegio (su §6) está sin cotizar: se suma aquí en DEPLOY.`

## Se toca y no se toca

**Se toca** (con las decisiones del humano; Enmienda 2): exactamente **14 archivos**, con quién edita cada uno (DH-01 d).
1. `docs/PRD.md`: arquitecto (P-1 a P-10)
2. `docs/ARCHITECTURE.md`: arquitecto (R-1 a R-32; R-14 sin cambio)
3. `docs/ARCHITECTURE-ESSENTIALS.md`: arquitecto (E-1 a E-10; E-4 sin cambio)
4. `docs/DESIGN.md`: arquitecto (D-1)
5. `docs/ESTADO.md`: arquitecto en 2b, §3 y la nota de §5 (T-1 a T-4); el orquestador, lo de siempre y lo que ya escribió el 2026-11-12
6. `CLAUDE.md`: orquestador, transcripción con cotejo (C-1 a C-8)
7. `AGENTS.md`: orquestador, transcripción con cotejo (G-1 a G-5; G-4 sin cambio)
8. `.claude/agents/arquitecto.md`: orquestador, transcripción con cotejo (K-1; autorizada, DH-05 a)
9. `.claude/agents/tester.md`: orquestador, transcripción con cotejo (K-2 y K-3; K-4 sin cambio; autorizada, DH-05 a)
10. `docs/trabajo/ENVIVO-investigacion-bigbluebutton.md`: arquitecto (V-1); entra al commit
11. a 13. `docs/trabajo/DOCS-05-envivo-bigbluebutton/`: `plan.md` (arquitecto), `revision.md` (manager) y `aprobacion.md` (orquestador)
14. `docs/trabajo/CHORE-04-guardas-de-doble-clic/aprobacion.md`: ya modificado por el orquestador (registro de la fusión de CHORE-04, PR #37); lo lleva el orquestador, nadie más lo edita, y entra en el commit de DOCS-05 (Enmienda 1, N-02)

Total: 14 archivos. **Una sola entrega**, sin corte (el umbral es de unos 30).

**No se toca:** todo `frontend/`, `backend/` (incluido `backend/src/adapters/README.md`) y `shared/`; todo `infra/` (`docker-compose.yml`, `livekit/`, `.env.example`); `eslint.config.mjs`; los `package.json` y `package-lock.json`; `.prettierignore`; `README.md` (raíz); `.claude/agents/manager.md` y `programador.md`; `.claude/settings*`; `docs/design/`; `docs/trabajo/` de cualquier otro encargo, salvo el `aprobacion.md` de CHORE-04 del punto 14; `docs/trabajo/DEPLOY-investigacion-vps.md` (DH-04 d: ni se edita ni entra al commit); en `.claude/agents/arquitecto.md` y `tester.md`, todo salvo las tres líneas autorizadas; y, dentro de los documentos que se tocan, todo lo que este plan no nombra.

## Lo que DOCS-05 no hace y a dónde va

Se registra en `docs/ESTADO.md` §3 con las filas de T-3:
- Retirar el residuo de LiveKit del repositorio y las frases de transición → ENVIVO, primera subentrega (DH-03 a).
- Actualizar `docs/trabajo/DEPLOY-investigacion-vps.md` y meterlo a git → DEPLOY (DH-04 d).
- `BBB_URL`, `BBB_SECRET`, `adapters/live`, rutas, tablas, migración, la antesala y las salas → ENVIVO.
- Cerrar las preguntas abiertas (PRD 18 a 22; inv. §4.7 y §9) → el plan de ENVIVO con el humano; las del colegio y el proveedor, antes de contratar.
- La copia de grabaciones frente a la regla 6 (R-01) y el borrado con referencias compartidas (R-03) → ENVIVO, como decisiones del humano en su plan.
- El aviso de grabación lista en `prod`, la cuenta del proveedor a nombre del colegio (requisito para salir a producción con clases en vivo; el gasto, pendiente del cliente), la grabación real de punta a punta, el volumen que acumula y el servidor dedicado propio → DEPLOY, que ahora va justo después de ENVIVO.
- Lo que la hoja de ruta nueva deja desfasado en textos que DOCS-05 no toca → plan de DEPLOY o `docs/ESTADO.md` (sección siguiente).

## Pendientes por la hoja de ruta nueva (Enmienda 2)

DOCS-05 no los corrige (no son de clases en vivo, o están en textos que no toca); quedan con destino. La consecuencia 4 de `docs/ESTADO.md` 2b ya registra que los documentos de arquitectura se corrigen en el plan de DEPLOY y que hasta entonces no es una contradicción que detenga a un agente, así que los del grupo 1 no necesitan fila nueva; los del grupo 2 y 3 los decide el orquestador.

1. **Cloudflare Pages, R2 y el Droplet como arquitectura de producción → plan de DEPLOY** (consecuencia 4). Textos que siguen diciéndolo, incluidos los renglones que DOCS-05 edita solo en su parte de video (la parte de Cloudflare y R2 queda como está): `ARCHITECTURE.md` cabecera, §1 (principios 1 a 3), §2 (Frontend, DNS, Archivos, Respaldos), §3 (diagrama: Pages, R2, DNS), §4 ("Qué corre dónde", "Dominio", "Contenedores" de producción, fila `prod` de "Entornos"), §11 (buckets y tokens de R2, salvo la frase de R-20), §15, §16, §17, §18 (Pages, imágenes, "Migración a un servidor propio") y D-09 y D-21 (y lo que DEPLOY decida de D-20); ESSENTIALS "Proveedores", "Stack", "Archivos" (R2 en `prod`, `campus-respaldos`) y "Operación" (rangos de Cloudflare); `AGENTS.md` (línea 6 y reglas 6 y 11, "R2 en `prod`" y "Cloudflare (DNS, Pages, R2)"); `CLAUDE.md` ("Proyecto": "desplegado en Cloudflare Pages", "R2 en `prod`"); PRD RNF-10 ("Cloudflare (DNS, frontend y archivos)") y §11 ("una tarjeta para las cuentas de DigitalOcean y Cloudflare").
2. **Avisos encolados sin consumidor en producción → plan de DEPLOY (y NOTIFICACIONES).** `ARCHITECTURE.md` §8 dice que los avisos y recordatorios "esperan en la cola" hasta NOTIFICACIONES, con retención de 7 días; con la plataforma en producción antes de NOTIFICACIONES, en `prod` se acumularán trabajos (también los `CLASE_POR_COMENZAR` diferidos que encole ENVIVO). Qué pasa con ellos (retención, vencimiento, si se descartan al publicar NOTIFICACIONES) lo debe decidir el plan de DEPLOY o el de NOTIFICACIONES. DOCS-05 solo aclara en R-21 que el aviso de "clase por comenzar" llega con NOTIFICACIONES. Propuesta: una fila en `docs/ESTADO.md` §3 (la escribe el orquestador si la acepta).
3. **`docs/ESTADO.md`, lista numerada de la hoja de ruta del 2026-10-26 → orquestador.** El punto 7b (ADMIN-02: "Después de NOTIFICACIONES y antes de DEPLOY") y el punto 8 (DEPLOY: "Sin cambios de contenido: filas de la sección 3 … y `docs/ARCHITECTURE.md` §18") quedan desfasados con el orden nuevo; DOCS-05 no los toca (solo el punto 9, T-2).

Lo que sigue siendo verdad y no cambia: PRD §4.5 (el aviso "clase en vivo por comenzar" es un requisito vigente, solo llega después), el hito 2 de PRD §9 (los hitos no son el orden de los encargos) y "solo el aviso de grabación lista espera a DEPLOY; mientras, sondeo" (DEPLOY sigue después de ENVIVO, ahora justo después).
- La prueba piloto (inv. §8) y las respuestas del proveedor → el humano con el colegio, antes de contratar.

## Acceso a datos

No aplica: no hay consultas. Los documentos no cambian ninguna regla de acceso a datos; lo previsto para ENVIVO (§14 "Previsto") dejará a su plan proponer los índices.

## Autorización

No aplica a código. Los documentos conservan sin cambio la cadena de middleware y las reglas de acceso; solo cambia el nombre de lo que el alumno restringido no recibe ("entradas a clases en vivo" en lugar de "tokens de LiveKit") y se registra que una clase archivada no abre sesiones (derivado de RN-10, como ya decía inv. §4.4).

## Pruebas requeridas

Encargo sin código: no hay pruebas nuevas ni cambia ninguna prueba normal o `*.ataque`. **Lista cerrada de pruebas normales que cambian: vacía**, por el grep del inventario (grupo C): ninguna prueba nombra LiveKit, y la única que lee un documento tocado (`frontend/src/styles/tokens-r1.ataque.test.ts`, que importa `docs/DESIGN.md`) depende de títulos y tablas que DOCS-05 no toca. Las reglas de `VALIDACION` fuera de contrato y de frases de recuperación no aplican: no hay formularios ni textos de interfaz nuevos. Los workspaces no revisan Markdown (`.prettierignore` excluye `docs/`, `.claude/` y los `*.md` de la raíz), así que `lint` y `build` no cambian; no se corren.

Comprobaciones del manager en la revisión final (ids con el prefijo del encargo):
- **DOC5-01 · Nada fuera de los documentos.** `git diff --stat 685fc2b -- frontend backend shared infra eslint.config.mjs package.json package-lock.json README.md .prettierignore` vacío, y `git status --porcelain` sin archivos fuera de la lista "Se toca" (que incluye el `aprobacion.md` de CHORE-04 del orquestador, punto 14); en particular, `docs/trabajo/DEPLOY-investigacion-vps.md` sigue sin seguimiento y sin cambios (DH-04 d), y en `.claude/agents/` solo cambiaron `arquitecto.md:23`, `tester.md:39` y `tester.md:49`.
- **DOC5-02 · Grep de cierre.** `git grep -n -i -E "livekit|egress" -- . ":!docs/trabajo" ":!infra" ":!eslint.config.mjs" ":!backend" ":!frontend" ":!README.md"`: cada aparición está en "Lista de lugares donde «LiveKit» puede quedar" (sección "Diseño"); ninguna fuera. Referencia: en la base, fuera de `docs/trabajo/`, había 85 apariciones en 15 archivos (grep del manager); el inventario de 300 en 60 cuenta `docs/trabajo/`. Más `git grep -n -i "webhooks/livekit"` y `git grep -n "Egress"` fuera de `docs/trabajo/`: solo `ARCHITECTURE.md` §20 (D-10 y D-26).
- **DOC5-03 · `DESIGN.md` sigue leyéndose bien.** Desde `frontend/`: `npx vitest run src/styles/tokens-r1.ataque.test.ts`, en verde. Es un solo archivo de pruebas, sin API ni infra, pero cuenta como corrida: antes, el orquestador pregunta al humano si la otra copia de trabajo está corriendo una suite (`AGENTS.md`, "Trabajo en paralelo").
- **DOC5-04 · Numeración única.** `RF-75`, `RF-76`, `RF-77`, `RN-12` y `D-33` aparecen como encabezado o fila una sola vez; las preguntas de §11 van del 1 al 22 sin huecos ni repetidos; ninguna referencia nueva apunta a un número que no existe.
- **DOC5-05 · Ninguna pregunta abierta cerrada.** Cada una de las preguntas de inv. §4.7 (4) y de inv. §9 (colegio 1, 2, 4 y 5; proveedor 1 a 5; ENVIVO 1, 3, 4 y 5) aparece en el PRD como pendiente (preguntas 7 y 18 a 22, RF-41, RF-75, RF-76, RNF-06), y nada en ningún documento la da por decidida. Solo constan como decididas las de S-01. En particular (Enmienda 1, M-01): RN-12 y ESSENTIALS hablan del objetivo del cliente solo al archivar o borrar definitivamente una clase, no dicen cómo se cumple "al borrar una grabación", y si borrar o editar un recurso en la clase de origen alcanza a la vinculada figura como abierto en RF-76 y en la pregunta 21.
- **DOC5-06 · Tablas íntegras.** Las tablas editadas (PRD §4.7 y §8; `ARCHITECTURE.md` §2, §4, §5, §7, §8, §14, §15 y §20; `CLAUDE.md` "Módulos"; `ESTADO.md` §3) conservan su número de columnas en cada fila.
- **DOC5-07 · Fidelidad.** Cada hunk del `git diff 685fc2b` corresponde a un cambio de "Cambios por documento" (P-, E-, C-, G-, K-, D-, R-, T- y V-) y dice lo mismo; nada más cambió en esos archivos.
- **DOC5-08 · Hashes.** El orquestador anota en `aprobacion.md` el SHA-256 final de cada archivo de "Se toca", incluido el nuevo de la investigación de ENVIVO (V-1); el de la investigación de DEPLOY no cambia (DH-04 d).

Sin comprobación humana en navegador: no hay interfaz.

## Puntos de ataque para el Tester

No participa (como en DOCS-04, y DH-01 d: sin código no hay nada que romper). Lo que el manager mira con más cuidado:
1. Una frase nueva que, sin querer, cierre una pregunta abierta (por ejemplo, "los alumnos entran en modo webinar", "el aula se abre en otra pestaña", "la grabación es automática", "las salas del administrador son para juntas").
2. Una frase que afirme algo del repositorio que no es verdad (que `docker compose up -d` ya no levanta LiveKit; que existe `adapters/live`; que `BBB_URL` ya está en `.env.example`).
3. Una frase que presente lo previsto de inv. §4 como regla (sobre todo en ESSENTIALS, que "manda").
4. La copia de las grabaciones escrita como si cumpliera la regla 6 sin más (R-01).
5. La lista de proveedores: que en ningún documento quede LiveKit Cloud como aprobado ni el proveedor candidato como aprobado (DH-02 a).
7. Una frase nueva que dependa de la hoja de ruta vieja (que ENVIVO va antes de NOTIFICACIONES, que el aviso de "clase por comenzar" sale con ENVIVO) o que afirme Cloudflare Pages o R2 como destino de producción en un texto que DOCS-05 escribe (Enmienda 2).
6. Coherencia entre ESSENTIALS, `ARCHITECTURE.md` y el PRD en las tres decisiones del humano y las seis del dueño (mismo contenido, misma condición "si el proveedor entrega el video por API").

## Riesgos y desacuerdos

- **R-01 · Copiar las grabaciones roza la regla 6 de `AGENTS.md`** ("Los archivos no pasan por Node ni por el servidor. Solo URLs prefirmadas del almacén") y ESSENTIALS "Archivos". Traer el video del proveedor a nuestro almacén obliga, salvo que el proveedor sepa dejarlo en un almacén S3, a que el worker lo descargue y lo suba (pasa por Node y por el Droplet, aunque sea fuera de toda petición). DOCS-05 no lo resuelve ni lo esconde: los documentos escriben la decisión del humano con "cómo se copia, lo decide ENVIVO" y la fila de §3. **Recomendación para ENVIVO:** preguntar primero al proveedor (pregunta 22) si deja la grabación en un almacén S3 propio; si no, proponer al humano una excepción acotada (solo el worker, por flujo, sin escribir a disco, un trabajo por grabación y con reintentos) y medir el egreso. No es un desacuerdo con ESSENTIALS: es un choque entre una decisión nueva del humano y una regla vigente, y lo decide el humano.
- **R-02 · `dev` deja de ser "sin cuentas externas".** La hoja de ruta lo decidió (plan gratuito del proveedor); los documentos lo dicen (R-10) y piden que las pruebas usen un doble. Riesgo: un secreto de desarrollo del proveedor en `backend/.env`; mitigación: la regla 9 de `AGENTS.md` ya lo cubre y la cuenta la aprueba el humano (DH-02 a).
- **R-03 · Referencia frente a objetos propios.** D-32 (ADMIN-01) eligió objetos propios al duplicar precisamente para que borrar una clase nunca rompiera la otra; RF-77 pide lo contrario para las grabaciones (un solo archivo por referencia). No es una contradicción (lo pidió el dueño y D-33 lo dice), pero `BORRAR_OBJETOS`, `LIMPIEZA_DIARIA` y el conteo del borrado de ADMIN-01 tendrán que distinguir las grabaciones compartidas. Va a ENVIVO (fila de §3).
- **R-04 · Residuo de LiveKit.** Mientras DH-03 no se cumpla, un agente puede encontrar LiveKit en `infra/` y en `README.md`. Mitigación: las frases de transición, la viñeta T-1 de `ESTADO.md` y la fila de §3.
- **R-05 · El proveedor candidato no está verificado** (sin términos ni privacidad publicados, servidores sin ubicar). Mitigación: DH-02 a deja la aprobación para el momento de contratar y las preguntas 18 y 22 lo registran.
- **R-06 · RF-41 sigue diciendo "iniciar y detener grabación".** Se conserva con la marca de pendiente; un programador podría leerlo como decidido. Mitigación: la marca va en el mismo renglón y la pregunta 20 la repite.
- **R-07 · Cambia el hash de la investigación de ENVIVO** (V-1, DH-04 d); el orquestador ya registró el de arranque. Mitigación: DOC5-08.
- **R-08 · La investigación de ENVIVO entra a git citando una que no está** (`DEPLOY-investigacion-vps.md`, DH-04 d). Mitigación: la frase final de V-1 lo dice y la fila de T-3 lleva su ingreso a DEPLOY.
- **R-09 · La plataforma sale a producción sin NOTIFICACIONES** (hoja de ruta nueva): los avisos y recordatorios encolados (incluido `CLASE_POR_COMENZAR`) se acumulan sin consumidor en `prod`. No es de DOCS-05; queda en "Pendientes por la hoja de ruta nueva", punto 2.
- **Desacuerdos con ESSENTIALS:** ninguno. DOCS-05 cambia ESSENTIALS por decisión del humano (la de BigBlueButton), no por criterio del arquitecto.

## Pasos de implementación

Con el plan aprobado y las decisiones del humano del 2026-11-12 (DH-01 d: el arquitecto edita los documentos de `docs/` y V-1; el orquestador transcribe C-, G- y K- con cotejo; sin tester). Las variantes ya están resueltas en el texto; ningún paso tiene opciones. Cada paso dice quién lo hace.
1. **Arquitecto.** `docs/PRD.md`: P-1 a P-10, de arriba abajo.
2. **Arquitecto.** `docs/ARCHITECTURE-ESSENTIALS.md`: E-1 a E-10 (E-4 sin cambio).
3. **Arquitecto.** `docs/ARCHITECTURE.md`: R-1 a R-32, de arriba abajo (R-14 sin cambio; R-21 y R-32 con su texto).
4. **Arquitecto.** `docs/DESIGN.md`: D-1.
5. **Arquitecto.** `docs/ESTADO.md`: T-1 a T-4, sin tocar lo que el orquestador escribió el 2026-11-12.
6. **Arquitecto.** `docs/trabajo/ENVIVO-investigacion-bigbluebutton.md`: V-1, con su frase final de DH-04 d. V-2 no se aplica: `docs/trabajo/DEPLOY-investigacion-vps.md` no se toca.
7. **Arquitecto.** Correr el grep de cierre (DOC5-02) sobre lo suyo y corregir lo que salga de la lista; no correr suites. Entregar al orquestador la lista de archivos tocados.
8. **Orquestador.** Transcribir tal cual, con cotejo (`AGENTS.md`, "Transcripción con cotejo"): `CLAUDE.md` C-1 a C-8; `AGENTS.md` G-1, G-2, G-3 y G-5 (G-4 sin cambio); `.claude/agents/arquitecto.md` K-1 y `.claude/agents/tester.md` K-2 y K-3 (K-4 sin cambio; nada más de esos archivos).
9. **Orquestador.** Anotar los SHA-256 (DOC5-08), preguntar al humano por la otra copia de trabajo antes de DOC5-03 y pedir la revisión final al manager.
10. **Manager.** Revisión final: `git diff 685fc2b` documento por documento contra la petición literal y este plan, con DOC5-01 a DOC5-07 (DOC5-03, la única corrida).
11. **Humano.** Decide el commit. El bloque de `git add` lleva exactamente los 14 archivos de "Se toca": `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `docs/DESIGN.md`, `docs/ESTADO.md`, `CLAUDE.md`, `AGENTS.md`, `.claude/agents/arquitecto.md`, `.claude/agents/tester.md`, `docs/trabajo/ENVIVO-investigacion-bigbluebutton.md`, `docs/trabajo/DOCS-05-envivo-bigbluebutton/plan.md`, `revision.md` y `aprobacion.md`, y `docs/trabajo/CHORE-04-guardas-de-doble-clic/aprobacion.md`. **No** lleva `docs/trabajo/DEPLOY-investigacion-vps.md` (DH-04 d).

## Para el humano (dato, sin decisión pendiente)

`.codex/agents/arquitecto.toml` y `.codex/agents/tester.toml` son copias locales ignoradas por git (`.gitignore:15`, sin seguimiento, del 2026-09-21) que repiten las tres líneas de LiveKit que DH-05 corrige (LiveKit Cloud como proveedor aprobado y "tokens de LiveKit"). DOCS-05 no puede confirmarlas ni las toca. Si el humano todavía usa esas definiciones, hay que actualizarlas a mano; si no, se pueden ignorar (dato de la revisión del manager).
