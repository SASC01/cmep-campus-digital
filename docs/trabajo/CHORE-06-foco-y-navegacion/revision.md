# Revisión del Manager — CHORE-06 · foco y navegación del marco — plan
Veredicto: CAMBIOS REQUERIDOS
Verificación propia: modo plan, sin suites (límite del encargo). `plan.md` = 611 líneas, SHA-256 `d2e16a4c9b4f9b845446a09d77c2bdf2f370c916399cd37d196d6f7a52c1825d` (coincide). Código leído en `47c3339` (el árbol de trabajo solo cambia `docs/`).

Tres problemas bloquean y los tres son de inventario: el remedio está bien elegido, pero le falta alcance. Con ellos corregidos, el plan se puede aprobar.

## Problemas que bloquean

### M-01 — La `key` de la entrega de un alumno no es única por el id de la ruta
Dónde: §D-1, Forma C, `entrega-de-alumno-view.tsx` (`key={alumnoId}`); CH6-A06; CH6-A30 (c), que exige el literal `key={alumnoId}`; tabla "Mutaciones".
Por qué importa: es la lección 3 de CHORE-04, que el propio plan cita. La ruta es `tareas/:tareaId/entregas/:alumnoId`, y el mismo alumno tiene una entrega en cada tarea de la clase. Si se salta en el historial de la entrega de P1 en T1 a la de P1 en T2, la `key` no cambia y el contenido sobrevive:
- el panel conserva `apertura` (versión, rúbrica y puntos de T1) y lo escrito (`panel-de-calificacion.tsx:60-70`);
- `useCalificarEntrega` toma los ids nuevos, así que el `PUT` va a la entrega de P1 en T2 con la versión y los puntos de T1;
- la versión es un contador por fila que empieza en 0 (`schema.prisma:510`, `exigirVersion`), así que lo normal es que coincida;
- el hilo privado del maestro manda a T2 lo escrito para T1.

O-r1c-2 queda abierto justo en su caso más frecuente, y la regla estática lo congela.
Qué se espera:
- `key` por `tareaId` y `alumnoId` juntos, o por la ruta completa del contenido;
- CH6-A06 suma el camino "mismo alumno, otra tarea" (P1 en T1 → P1 en T2, con la misma `version`);
- CH6-A30 (c) exige la `key` compuesta;
- la tabla "Mutaciones" pide quitar la parte de `tareaId` y ver caer ese camino.

El resumen revisa con este mismo criterio cada `key` de §D-1:
- `tarea.id`, `tareaId` y `recursoId` son ids globales: están bien;
- `claseId` está bien en las vistas de la clase.

### M-02 — El inventario de M-2 está incompleto y afirma algo falso sobre `features/tareas`
Dónde: Alcance, "Mecanismo M-2"; §D-3; DH-04; R-03 ("22 ganchos ya callan"); punto de ataque 2, que solo nombra `features/clases`.
Por qué importa: el plan dice que "`features/tareas`, `features/calificaciones` y `features/admin` ya callan". En `features/tareas` no es así. Sin guarda de `errorQueRedirigeElCliente`, avisan ante `401` sin refresco o un `403` que redirige:
- `features/tareas/hooks.ts:190` (crear tarea), `:214` (editar tarea) y `:246` (borrar tarea);
- `avisarDelErrorDeLaEntrega` (`:359-374`), que llaman entregar (`:398`), anular (`:419`) y comentar en el hilo (`:463`);
- el `useAvisoDeRecargaFallida` de tareas (`:300`), con sus llamadores en el detalle, la edición y la entrega de un alumno;
- las subidas: `components/formulario-tarea.tsx:226` y `components/formulario-de-entrega.tsx:135`.

Solo callan `:310` (descarga) y `:533` (calificar).

En `features/clases`, el grep se quedó en `hooks.ts` y en «Unirme». Faltan:
- `components/formulario-clase.tsx:81`: `alFallar` de crear y editar clase. Su hermano, `formulario-duplicar-clase.tsx:67`, sí calla;
- `components/formulario-publicacion.tsx:126` y `components/formulario-recurso.tsx:213`: la subida, porque `avisoDeFalloAlSubir` no distingue los códigos que redirigen;
- `components/adjuntos/adjuntos-de-publicacion.tsx:77`: la descarga sin `alFallarLaDescarga`, que es la de las clases.

Es el mismo mecanismo que DH-04 quiere cerrar. Con el plan como está, el tester lo encuentra en la ronda 1 y es una ronda extra por hermanos.
Qué se espera:
- corregir la afirmación;
- inventariar cada sitio con archivo y línea;
- decidir, uno por uno, si entra (en 06a o 06b, con su conteo) o queda fuera con destino en ESTADO §3;
- ajustar "No se toca", que hoy prohíbe `formulario-*.tsx`, `features/tareas/hooks.ts` y `components/adjuntos/`;
- si entran, extender CH6-A15/A16 y la lista cerrada con un grep de las pruebas que hoy fijan esos avisos.

Mi recomendación es que entren los de `features/clases` (son una línea cada uno y DH-04 promete "los de `features/clases` callan"). Los de `features/tareas` y `components/adjuntos`, que entren también o queden con destino explícito, como decisión del humano.

### M-03 — La lista cerrada y §D-R0 de 06b no inventarían las pruebas que cambian de sentido con DH-03 (b)
Dónde: lista cerrada de 06b, §D-R0 de 06b y "Vigiladas".
Por qué importa: con PR-1, pulsar la sección con la lista **vieja** pide. Hay dos grupos de pruebas que hoy fijan lo contrario.
1. `features/clases/ordenar-03c2-r2.ataque.test.tsx:463`, CL3-2R2-10: "tras escribir el orden sobre una recarga fallida, pulsar «Actividades de aprendizaje» estando ahí no pide nada…". Usa la configuración de `providers.tsx` (`:131-132`). Es exactamente O-03 / CH6-B08 y cambia de sentido. No está en C-3 a C-8: sería PA-2 a mitad de 06b.
2. Pruebas que pulsan la sección con la lista "sana" y un `QueryClient` sin `staleTime`. Con `staleTime` 0, la lista está vieja desde que llega, así que con PR-1 pide:
   - `features/clases/muro-view.test.tsx:344`, PR-C18 ("con el muro sano, pulsar «Muro» no vuelve a pedir nada"; cliente de `:301` con solo `retry: false`);
   - `app/muro-recuperar-c-r4.ataque.test.tsx:208-223` ("con el muro ya sano, «Avisos» no pide nada"; cliente de `:156`, sin `staleTime`).
   `app/clase-03c1.test.tsx:493` (CL3-C12) y `app/personas-03c1-r1.ataque.test.tsx:570` (CL3-R1-21) usan `Providers` (30 s): deberían seguir en verde si pulsan antes de 30 s, pero van a "Vigiladas".

Qué se espera:
- el arquitecto repite el grep por el criterio "pulsa la sección y cuenta peticiones" (no solo `página siguiente|Ver más`), y por cada caso mira el `staleTime` de su cliente;
- anota CL3-2R2-10 como C-n y las otras como C-n o como lista cerrada (cambian de sentido por diseño, no por error);
- revisa que el sentido nuevo conserve la intención: "sana y fresca no pide; vieja sí";
- si la regla del humano para un `*.ataque` que cambia de sentido es la ronda 0, va ahí.

## Hermanos destructivos (verificados en el código)
Cómo se llega: con un salto del historial de más de una entrada (mantener presionado «Atrás» y elegir la entrada), entre dos entradas del mismo patrón de ruta con otro id y el destino en caché. Ningún enlace de la app lleva directo de un id al otro: la barra lateral va al muro de la clase (`lista-de-clases.tsx:90`), y un solo «Atrás» pasa por otra ruta y desmonta la vista. Por eso la frecuencia es baja, aunque el daño sea real. La afirmación de S-01 y S-02 es correcta.

| Hermano | ¿Real? | Severidad | Nota |
|---|---|---|---|
| Calificar a otro alumno (O-r1c-2) | Sí | **Alta** | Las versiones de entrega empiezan en 0 y casi siempre coinciden. No es "si coinciden": es lo normal. El caso "otra tarea, mismo alumno" sigue abierto con el plan (M-01) |
| Editar tarea / recurso en otro id | Sí | **Alta** | `version` empieza en 0 (`schema.prisma:311` y `:375`). Dos tareas sin editar comparten la versión 0 y el `PUT` sobrescribe la otra |
| Editar clase (admin) | Sí | **Media-alta** | `FormularioClase` no lleva versión: el `PUT` a B con el nombre de A siempre se acepta. La navegación va en `onSuccess` del `mutate`, que no corre desmontado: con la `key`, A no navega |
| Crear tarea / publicar anuncio, duda o recurso en otra clase | Sí | **Media** | Crea contenido visible para los alumnos de B. Es reversible. Con un tema o categoría de A, el servidor probablemente lo rechaza |
| Quitar maestro o alumno (O-r1-1) | Sí | **Alta** | Ya decidido como prioritario |
| Gradebook con cursores de otra clase | Sí | **Baja** | Solo muestra "La clase cambió…"; no escribe nada |
| Filtro de Mis calificaciones | No es daño | — | Entra solo por la regla CH6-A30 |

**¿Pide algo del servidor?** No para cerrar este encargo: la causa es del cliente y la `key` la elimina. Como defensa en profundidad, el servidor no puede distinguir hoy un cuerpo armado para otra fila, porque la versión es un contador que se repite entre filas, y editar clase no tiene versión. Una comprobación del servidor (por ejemplo, que el cuerpo traiga el id de la fila o una versión no repetible) cambia el contrato de `shared/` y el backend: es otro encargo y otro carril, y lo decide el humano ("Para el humano", punto 2).

## Postura sobre las decisiones (DH)
- **DH-01: (a), con M-01 corregido.** Lo verifiqué sitio por sitio:
  - Las guardas de CHORE-04 no se tocan:
    - «Restaurar» y «Sí, regenerar» viven en `ClaseDeLaRuta` (encabezado y aviso), que no lleva `key`;
    - el orden de temas vive en `TrabajoDeLaClase`, que en la Forma B no lleva `key` (solo cambia `creando`);
    - `sigueEnVuelo()` lee la caché de mutaciones, que la `key` no toca.
  - La guarda de «Sí, quitar» de un maestro muere con su instancia; eso es S-03, ya aceptado. CH4-29 y ATQ-CH4-15/16 abren la confirmación de B si no llegó abierta, así que valen.
  - El foco:
    - en las Formas A y B, el padre que sobrevive (`useFocoAlTituloDeLaClase`, con la clave `${claseId}:…`) corre su efecto después de los hijos: encuentra el control desconectado y el foco en `<body>`, lo lleva a la raíz y de ahí al título;
    - `useFilaEnFoco` pone `null` al entrar a un campo del formulario, así que `clasePrevia` no actúa y una fila con el foco sigue yendo al `h2` (O-14);
    - en la Forma C, el marco conserva `useFocoAlPerderseElControl` con una clave que incluye el id;
    - `useFocoAlPasarAError` usa su `clave` y no depende de la `key`.
  - La opción (b), una `key` en el `<Outlet>`, rompe O-14 en cuatro listas y toca `clase-layout.tsx`. La descarto.
  - No faltan vistas con estado sin `key`: comprobé los `useState` de vistas y componentes. `SeccionDeTema` y `SeccionDeRecursos` con la clave "sin tema" sobreviven, pero no guardan nada abierto en esa sección.
- **DH-02: (a).** Verificado:
  - Recursos (`seccion-de-recursos.tsx:61-69`), Entregas (`entregas-view.tsx:99-118`) y Mis calificaciones (`:113-147`) conservan la lista y avisan;
  - matiz: esos tres conservan también ante una recarga de fondo fallida, y (a) solo ante la página siguiente. El texto de §7.10 habla solo de «Ver más», así que es correcto, pero no debe decir que el patrón es "el mismo" que el de Recursos;
  - `useFocoAlPasarAError` solo mueve el foco si se perdió, así que el foco se queda en «Ver más»;
  - el orden "error primero" se respeta con `isError && !conserva`.
- **DH-03: (b), con M-03.** Es la que cierra O-03 sin pedir de más. `useMarcarViejaSiQuedoEnError` ya usa `exact: true`, necesario para no tocar la clave de la barra, que cuelga de `CLAVE_CLASES_INSCRITAS`.
- **DH-04: (a), extendida por M-02.** La afirmación sobre `apiClient` es correcta: `perderSesion` (`apiClient.ts:174-178`) no redirige en `RUTAS_SIN_SESION`, y un `401` sin token enviado se lanza sin redirigir (`:188-192`). Callar por código en `auth` dejaría a la persona sin mensaje en `/login`. Dejar fuera O-r1-6 está justificado.
- **DH-05:** acepto dejar fuera la unificación del seguimiento del foco (M-14/O-20) y los puntos menores. Hay que decírselo al humano con claridad:
  - su decisión del 2026-10-26 (ESTADO 2b, chore (b)) incluía "los ganchos de foco unificados" y el foco al cambiar de ruta: DH-05 recorta un alcance que él fijó;
  - la fila 362, punto (3), estaba asignada a este `chore` por E12-17.

  Sobre la salida a producción: lo único que yo pondría antes de DEPLOY es **el foco al cambiar de ruta** (fila 444; hoy queda en `<body>` en cada cambio de sección y al abrir una tarea). Es lo que más notará quien navega con teclado o lector de pantalla. Lo demás puede esperar. Lo dejo como opción (b) de DH-05, con su propio plan (no dentro de 06b, que ya tiene unos 31 archivos).
- **DH-06: (a), con un conteo nuevo.** El corte por mecanismo es coherente y cada subentrega se cierra sola. M-02 suma de 3 a 9 archivos a 06a si entran todos sus sitios; con eso, 06a queda en unos 28 a 34. El arquitecto recuenta y, si pasa de unos 30, mueve los de `features/tareas` a 06b o a una 06c, con su conteo. No debe partir por tema.
- **DH-07: (a), con H-1 corregido** (N-01). Los cuatro puntos son lo que jsdom no ve.
- **DH-08: normal, confirmado.** No cambia `apiClient`, la sesión ni el token, ni el estado de pago o el acceso en el servidor. Mismo criterio que CHORE-03 y CHORE-04.

## Problemas que no bloquean
### N-01 — H-1 no reproduce el caso con un solo «Atrás»
De Personas de B a Personas de A se pasa por el muro de A (la barra lleva al muro). Un «Atrás» deja en el muro de A. Debe decir: "mantener presionado «Atrás» y elegir Personas de B", como H-2. Si no, el humano marca "bien" sin haber probado el caso.

### N-02 — Las "filas" de ESTADO no son las de `47c3339`
Las líneas citadas (346, 348, 509…) son las del árbol de trabajo. En `47c3339` están 3 líneas antes (H-2 es la 343). Para A-3, el orquestador debe localizar las filas por su texto, no por el número.

### N-03 — §D-6, fila 361: pide la barra cada vez que se abre una clase archivada
El maestro que abre una clase desde "Clases archivadas" pide su barra en cada apertura, aunque la barra nunca la traía. Basta con invalidar solo si los datos en caché de la barra traen ese `claseId`, como ya hace `useClaseArchivadaEnSuLista` con "Clases anteriores". Así no se pide de más.

### N-04 — "Solo la reexportación" en `features/admin/hooks.ts`
El cambio son dos cosas: quitar la definición (con `marcarViejaSiQuedoEnError`) y reexportar. Hay que decirlo así en §D-0 y en "No se toca" para que no sea PA-4.

## Detalles menores
- **CH6-A30.** Hoy hay exactamente 15 render props de una línea, justo la precondición "al menos 15". Están bien, pero una vista que pase a varias líneas haría caer la precondición, no la regla; el mensaje debe decirlo.
- **Inventario de la fila 509.** Confirmo que ya está resuelta (`inicio-estudiante-view.tsx:56` usa `TEXTOS_PANEL.cambioMientrasLasVeias`).
- **§D-5, comentario de `conservaLaListaTrasLaPagina`.** "uno con que apiClient redirige no pinta nada": la lista sí se reemplaza un instante por su `MensajeError` mientras `irA` recarga. Es el mismo instante de O-r1-6. Basta con no prometer "no pinta nada".
- **Rojo primero y mutación real: bien pedidos**, con la salida PA-7. Cumple la lección 1 de CHORE-04. Falta una fila en "Mutaciones" para M-01 (la parte de `tareaId` de la `key`) y, si entran, una por grupo de M-02.
- **Frases de recuperación por camino** (CH6-B03 a B07 y B10): completas para «Ver más» y para pulsar la sección. Ninguna viñeta contradice el orden "error primero" (cotejado con la lección 2 de CHORE-04).

## Desacuerdos arbitrados
Ninguno entre agentes ni con `ARCHITECTURE-ESSENTIALS.md`.

## Documentos a actualizar
- **A-1 (`CLAUDE.md`):** las tres viñetas del plan. La de "Lo abierto es del id de la ruta" debe decir "única por **todos** los ids de la ruta" (M-01). La de los códigos que redirigen se aplica a todo el frontend, no solo a `features/clases` (M-02).
- **A-2 (`DESIGN.md`):** §7.10 y §7.14 están bien. En §7.10, quitar la implicación de que Recursos, Entregas y Mis calificaciones siguen "el mismo" patrón: ellos conservan también ante una recarga de fondo.
- **A-3 y A-4 (`ESTADO.md`):** como el plan, con N-02. Sumar una fila para lo de M-02 que quede fuera y otra para la defensa del servidor si el humano la quiere ("Para el humano", punto 2).

## Para el humano
1. **DH-05 recorta un alcance que tú fijaste.** El chore (b) del 2026-10-26 incluía unificar los ganchos de foco y el foco al cambiar de ruta. El plan los manda a un `chore` de accesibilidad después de DEPLOY. Yo acepto el recorte, salvo el foco al cambiar de ruta: recomiendo planearlo antes de DEPLOY, como encargo aparte.
2. **Defensa del servidor (opcional, otro encargo).** Hoy el servidor acepta una calificación o una edición armada para otra fila si la versión coincide, y la versión casi siempre coincide (empieza en 0). Editar clase no tiene versión. El frontend lo cierra con CHORE-06. Una comprobación del servidor sería una segunda red de seguridad, pero cambia el contrato (`shared/` y backend). Decide si se registra en ESTADO §3 y con qué destino.
3. **M-02, alcance de M-2:** si entran los sitios de `features/tareas` y la descarga de `components/adjuntos`, y en qué subentrega.

## Verificación de la Enmienda 1 — CHORE-06 (2026-11-12)
Veredicto: **APROBADO** (sin M-n nuevos; dos observaciones que no bloquean).
Verificación propia, solo lectura y sin suites:
- `plan.md` = 697 líneas, SHA-256 `c926048ed20e43e582a36e855f384748f2201ec13e0859f0da3fe00dc241a5a4`, igual al de `aprobacion.md`.
- `git diff --no-index` completo contra la copia `plan-ch6-antes-e1-d2e16a4c.md` (`d2e16a4c…`): 145 inserciones y 59 borrados, en 58 hunks. Leí todos los hunks: cada uno lleva la marca "Enmienda 1" o responde a un M-n, a una N-n o a una DH. No hay cambios fuera de lo pedido.

### M-01 — cerrado
- La `key` del contenido de la entrega pasa a `` `${tareaId}:${alumnoId}` `` (§D-1, Forma C).
- CH6-A06 suma el camino "mismo alumno, otra tarea", con la misma `version`, el hilo y el `PUT` retenido.
- CH6-A30 (c) exige la `key` compuesta.
- "Mutaciones" tiene dos filas: la `key` entera, y solo la parte de `tareaId`, que debe hacer caer el camino nuevo y la regla.
- El criterio queda escrito en §D-1 y en la viñeta A-1 de `CLAUDE.md`.

Mi propio repaso de los 16 sitios, contra `app/router.tsx:84-202`:
- las Formas A y B y crear tarea solo dependen de `:claseId`;
- `tarea.id`, `tareaId` y `recursoId` son UUID de una sola fila;
- la entrega es la única ruta con dos ids, y uno de ellos (`alumnoId`) se repite entre tareas.

Coincido: solo fallaba ese sitio.

### M-02 — cerrado
- El inventario nuevo coincide con mi grep, sitio por sitio. En `features/clases`: `formulario-clase.tsx:81` y las subidas `:126` y `:213`. En `features/tareas`: `hooks.ts:190/214/246`, `avisarDelErrorDeLaEntrega` y su `useAvisoDeRecargaFallida` (`:288-301`), y las subidas `formulario-tarea.tsx:226` y `formulario-de-entrega.tsx:135`.
- Los que el plan descarta están bien descartados: `acciones-de-la-tarea.tsx:88` solo cubre el `409`, `formulario-tarea.tsx:244` es de campo y `codigo-de-clase.tsx` es el portapapeles.
- Fuera de `features/` solo avisa `components/adjuntos/adjuntos-de-publicacion.tsx:77`. `exportar-a-excel.tsx:55` es el resultado de la exportación, no un error de API, y su `catch` ya calla.
- La afirmación falsa se corrigió (Alcance, R-03).
- "Se toca" y "No se toca" se ajustaron. CH6-A15 se extiende y CH6-A18 es nueva, con su archivo de pruebas.
- La lista cerrada lleva el grep de `features/tareas` y de las subidas. Las vigiladas de tareas están nombradas.
- La guarda de `useAvisoDeRecargaFallida` de tareas va después de marcar el fallo como avisado, así que al volver no se repite.
- **Exclusión de la descarga:** justificada como decisión, y lleva destino (fila nueva en A-4, y R-10). La lista de importadores de `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` es exacta (`services/apiClient-ch3-r1.ataque.test.ts:83-88`: los cuatro `lib.ts`), así que importarla desde `components/adjuntos` la rompería. Matiz en O-E1-1.

### M-03 y R-09 — el arquitecto tiene razón
- `usePublicaciones` fija su propio `staleTime` (`features/clases/hooks.ts:1023-1027`). Es una función: `tiempoFrescoDelMuro`, que vale 240 s (`TIEMPO_FRESCO_DEL_MURO_MS`, `data.ts:591`), o menos si vence antes una vista previa firmada (`components/adjuntos/lib.ts:58-71`). Gana al `staleTime` del cliente.
- Las publicaciones de las dos pruebas no traen adjuntos: `muro-view.test.tsx:42` y `app/muro-recuperar-c-r4.ataque.test.tsx:47` tienen `adjuntos: []`.
- Así que la lista recién pedida está fresca, y PR-1 no pide nada en PR-C18 ni en el caso de `:208-223`. Mi M-03, punto 2, se equivocaba con esas dos.
- Tratarlas como condicionales, con la reescritura ya redactada (sumar `staleTime: 30_000` al cliente, sin tocar el título ni la aserción), está bien planteado:
  - conserva la intención ("sana y fresca no pide");
  - no se cuentan en el tamaño;
  - si caen, el camino está definido: PA-1 o PA-2 y aplicar la reescritura.
- **CL3-2R2-10 (C-9):** su reescritura conserva la intención del ataque. Pasa a "una sola petición y ninguna promesa en la vista", que es CH6-B08.
- Las vigiladas nuevas usan `Providers` (30 s) o el `staleTime` propio de Avisos.

### Tamaño — lo acepto: 32 y 32 (hasta 34 en 06b si caen las dos condicionales)
- Es "unos 30", con el precedente de CHORE-04 (33).
- El corte sigue por mecanismo:
  - 06a: lo destructivo y los avisos;
  - 06b: las recargas y «Ver más».
- Una 06c de 4 archivos sería cortar por tema, que la regla prohíbe. Si el humano quiere bajar, la opción es DH-04 (a′).
- Mi recuento coincide con §D-0:
  - 06a: 16 de `features/clases`, 7 de `features/tareas` y 2 de `features/calificaciones` (25 de producción), más 4 pruebas nuevas, 1 de la lista cerrada y 2 `*.ataque`;
  - 06b: 19 de producción, 4 pruebas nuevas, 2 de la lista cerrada y 7 `*.ataque`.

### Observaciones (no bloquean)
- **O-E1-1 · La descarga se podría callar sin tocar `components/adjuntos` ni N-46.** `AdjuntosDePublicacion` ya acepta `alFallarLaDescarga`, y `features/tareas` lo usa. Bastaría con que `publicacion-del-muro.tsx` y `elemento-de-recurso.tsx` le pasaran un manejador con el `errorQueRedirigeElCliente` de `features/clases`. Son dos archivos y una prop que ya existe, no una nueva. Aun así:
  - pasarla obliga a que esos componentes asuman el aviso de los demás errores de descarga;
  - el caso solo se da si la sesión se pierde justo en ese clic.

  Dejarla fuera con destino es aceptable. Que el destino diga este camino.
- **O-E1-2 · Fila de la barra (N-03).** `listaTraeLaClase(dato: unknown, …)` reconoce dos formas sin `as`. Es razonable y no sobreconstruye. El tester debe atacar una forma inesperada en la caché (devuelve falso: no pide; es lo seguro).

### Resumen del plan para el humano
1. **Qué hace:** cierra lo que pasaba abierto o escrito de una clase, tarea, alumno o recurso a otro al saltar con el historial, y ordena las recargas, los «Ver más» que fallan y los avisos de más mientras la sesión se va. Solo frontend.
2. **06a (32 archivos), lo destructivo:**
   - cada vista con estado se monta de nuevo al cambiar el id de la ruta (`key`);
   - ya no se puede quitar a alguien, calificar, editar ni publicar en el id equivocado;
   - callan los avisos ante un código con que `apiClient` redirige, en `features/clases` y `features/tareas`;
   - una regla estática vigila las vistas nuevas.
3. **06b (32 archivos), recargas y «Ver más»:**
   - pulsar la sección en la que ya se está vuelve a pedir una lista en error o vieja, sin duplicar;
   - el fallo de una página de «Ver más» deja la lista y el botón, con un aviso;
   - además: la ventana vacía del gradebook y la clase archivada en la barra.
4. **Cambios visibles:**
   - al cambiar de clase con el historial, el foco va al título;
   - tras el fallo de «Ver más», el foco se queda en el botón;
   - pulsar la sección con la lista vieja la renueva.
5. **Queda fuera, con destino:**
   - la unificación del seguimiento del foco y otros puntos menores, a un `chore` de accesibilidad después de DEPLOY;
   - el foco al cambiar de ruta, a un encargo propio **antes** de DEPLOY (recomendado);
   - la descarga de adjuntos sin guarda.
6. **Pruebas:**
   - un caso por camino de cada frase de recuperación;
   - el "rojo primero" se comprueba quitando cada remedio y viendo caer su caso;
   - el tester reescribe 2 `*.ataque` en 06a y 7 en 06b (hasta 2 condicionales más).
7. **Riesgo principal:** el foco, el mecanismo que más rondas ha costado. El plan no toca los ganchos de foco y fija a dónde va el foco en cada caso.
8. **Carril normal.** Comprobación en navegador: 4 puntos, unos 8 minutos, al cerrar 06b.
9. **Mi veredicto: APROBADO.** Nada bloquea.

### Lista final de decisiones (DH-01 a DH-09)
**DH-01 · Cómo deja de pasar lo abierto de un id a otro.**
- (a) `key` por el id de la ruta en 16 sitios, por debajo de la raíz de foco; la de la entrega, por tarea y alumno.
- (b) Una sola `key` en el `<Outlet>` de la clase: rompe el foco O-14 de cuatro listas y toca `clase-layout.tsx`.
- Arquitecto: (a). Manager: (a).

**DH-02 · Qué pasa cuando falla una página de «Ver más».**
- (a) La lista se queda, un aviso y el botón sigue; el cursor vencido y la pérdida de acceso reemplazan la lista, como hoy.
- (b) Lo mismo, y además conservar la lista ante una recarga de fondo fallida: unas 20 pruebas de foco cambian y 06b se parte.
- (c) Sin cambio de conducta; «Volver a cargar» dentro del mensaje de error.
- (d) Sin cambio; solo los casos por camino.
- Arquitecto: (a). Manager: (a).

**DH-03 · Qué hace pulsar la sección en la que ya se está.**
- (a) Pide solo si la lista está en error.
- (b) Pide si está en error o vieja; nunca cancela ni duplica.
- (c) Pide siempre.
- Arquitecto: (b). Manager: (b).

**DH-04 · Avisos mientras `apiClient` ya saca a la persona de la página.**
- (a) Callan todos los de `features/clases` y `features/tareas` en 06a; la descarga de adjuntos queda fuera, con destino.
- (a′) Lo mismo, con lo de `features/tareas` en una 06c de 4 archivos.
- (b) Solo `features/clases`; lo de `features/tareas` a FORO-01.
- (c) Dejarlo como está.
- Arquitecto: (a). Manager: (a). Con O-E1-1: si el humano quiere la descarga también, son dos archivos más con la prop que ya existe.

**DH-05 · Lo que queda fuera de CHORE-06** (recorta lo que el humano fijó el 2026-10-26).
- (a) Todo al `chore` de accesibilidad del marco, después de DEPLOY.
- (b) Igual, salvo el foco al cambiar de ruta (y el punto (3) de la fila de ADMIN-01): encargo propio **antes** de DEPLOY.
- (c) Meterlo como 06c.
- Arquitecto: (b). Manager: (b).

**DH-06 · Subentregas.**
- (a) 06a de 32 y 06b de 32.
- (a′) 06a de 28, 06b de 32 y 06c de 4, junto con DH-04 (a′).
- (b) Una sola, de unos 64.
- Arquitecto: (a). Manager: (a).

**DH-07 · Comprobación humana en navegador.**
- (a) Cuatro puntos, unos 8 minutos, al cerrar 06b (H-1 corregido: mantener presionado «Atrás»).
- (b) Sin comprobación; todo cubierto por pruebas.
- Arquitecto: (a). Manager: (a).

**DH-08 · Carril.**
- Normal.
- Sensible (solo cambiaría la aprobación, que sería explícita y por escrito).
- Arquitecto: normal. Manager: normal.

**DH-09 · Defensa del servidor** (que no acepte un cuerpo armado para otra fila).
- (a) Registrarla en `ESTADO.md` con destino "antes de DEPLOY".
- (b) Registrarla con destino "después de DEPLOY, encargo propio".
- (c) No hacerla.
- Arquitecto: (b). Manager: (b). La causa ya queda cerrada en el cliente, y cambiar el contrato justo antes de salir a producción suma riesgo de despliegue.

## Verificación de la Enmienda 2 — CHORE-06 (2026-11-12)
Veredicto: **APROBADO** (sin M-n; un detalle de redacción que no bloquea).

Verificación propia, solo lectura y sin suites:
- **Hash:** `plan.md` tiene 694 líneas y SHA-256 `c5fe10fc08a715361ad5181c841fcd760c96506919c1d2eb7fe9998f0dd21297`, igual al de `aprobacion.md`.
- **Diff:** el `git diff --no-index` completo contra la copia `plan-ch6-antes-e2-c926048e.md` (`c926048e…`) da 54 inserciones y 57 borrados, en 26 hunks. Los leí todos.

**Lo comprobado:**
- **Las nueve decisiones son fieles a `aprobacion.md`** ("Decisiones del humano sobre el plan (2026-11-12)"): DH-01 (a), DH-02 (a), DH-03 (b), DH-04 (a) con la descarga fuera, DH-05 (b), DH-06 (a), DH-07 (a), DH-08 normal y DH-09 (b). Están en la tabla "Decidido / Descartadas" y en el detalle, todas como "Decidida".
- **No queda ninguna variante condicional activa por decisión.**
  - Salieron los párrafos "Con DH-03 (a)…" (§D-4) y "Con DH-02 (b)…" (§D-5), las variantes de CH6-B06, "Puntos de ataque", R-01, "Comprobación humana", A-1, A-2 y A-4, y la de la fila 392 de "Alcance".
  - Un grep de `Con DH-0n (`, `si el humano elige|prefiere|no elige`, `Recomendad` y `salvo que el humano` solo da referencias a lo ya decidido.
  - Las dos condicionales de M-03 (PR-C18 y C-10) siguen igual: no dependen de una decisión, sino de si la prueba cae.
- **O-E1-1:** queda en el destino de la descarga, en la tabla de M-2, en el detalle de DH-04 y en la fila nueva de A-4: la prop `alFallarLaDescarga`, que ya existe, pasada desde `publicacion-del-muro.tsx` y `elemento-de-recurso.tsx`.
- **O-E1-2:** queda en el punto de ataque 5, con las formas inesperadas nombradas, incluida una forma válida junto a una inválida.
- **A-4 está alineado con la viñeta "Dos encargos nuevos que salen de CHORE-06" de `docs/ESTADO.md` §2b (`:266`).**
  - Al encargo del foco al cambiar de ruta, antes de DEPLOY: la fila 444 y el punto (3) de la 362.
  - Al `chore` de accesibilidad del marco, después de DEPLOY: los puntos (1), (2), (4) y (5) de la 362, y las filas 391, 394, 400, 447, 526, 376 y 392. Coincide con "la unificación de los ganchos de foco y los demás puntos de foco que CHORE-06 deja fuera".
  - La defensa en el servidor no lleva fila en §3, porque ya está en 2b, punto 2.
  - La única fila nueva es la de la descarga.
  - No lo contradice ni reparte mal ninguna fila.
- **No hay cambios fuera de lo pedido.** Los conteos (32 y 32, hasta 34) y las secciones técnicas (§D-1 a §D-7, las pruebas y la lista cerrada) no cambian, salvo que quitaron las variantes. R-09 solo suma que el manager le dio la razón.

**Detalle (no bloquea):** en la tabla de M-2 ("Alcance", fila de `components/adjuntos`), el texto previo dice todavía "o una prop nueva por dos componentes de `features/clases`", y la adenda de la Enmienda 2, en la misma celda, dice que la prop ya existe. El sentido queda claro por la adenda, por DH-04 y por A-4. Si el orquestador toca el plan por otra razón, "una prop nueva" pasa a "pasarles la prop que ya existe".

### Resumen del plan final para el humano
1. **CHORE-06**, solo frontend, carril normal, dos subentregas de 32 archivos cada una (06b, hasta 34 si caen dos pruebas condicionales). Primero 06a; 06b arranca después de su commit.
2. **06a, lo destructivo.**
   - Lo abierto o escrito en una clase, tarea, alumno o recurso ya no pasa a otro al saltar con el historial: ya no se puede quitar a alguien, calificar, editar ni publicar en el id equivocado.
   - Callan los avisos de más mientras la sesión se va, en clases y tareas.
   - Una regla estática vigila las vistas nuevas.
3. **06b, recargas y «Ver más».**
   - Pulsar la sección en la que ya se está vuelve a pedir una lista en error o vieja, sin duplicar.
   - Si falla una página de «Ver más», la lista y el botón se quedan, con un solo aviso.
   - La ventana vacía del gradebook se renueva, y la barra deja de traer una clase archivada.
4. **Decidido por ti, las nueve con la opción recomendada:** `key` por vista (DH-01); la lista se queda ante el fallo de una página (DH-02); vieja o en error se vuelve a pedir (DH-03); callan clases y tareas (DH-04); el foco al cambiar de ruta va antes de DEPLOY (DH-05); 32 y 32 (DH-06); 4 puntos en el navegador (DH-07); carril normal (DH-08); defensa del servidor después de DEPLOY (DH-09).
5. **Cómo se verifica.**
   - Primero se escriben las pruebas y deben fallar sin el cambio.
   - Cada remedio se quita a propósito para ver caer su prueba.
   - Hay un caso por camino de cada frase de recuperación, y el tester ataca por mecanismo.
   - Yo corro la suite completa al cerrar cada subentrega.
6. **Comprobación en navegador:** 4 puntos, unos 8 minutos, al cerrar 06b. Son el historial real (mantener presionado «Atrás»), la red cortada y, si hay NVDA, el lector de pantalla.
7. **Queda fuera, con destino.**
   - El foco al cambiar de ruta: encargo propio antes de DEPLOY.
   - Unificar los ganchos de foco y los puntos menores de foco: `chore` de accesibilidad después de DEPLOY.
   - La defensa del servidor: encargo propio después de DEPLOY.
   - La descarga de adjuntos sin guarda: ENVIVO o el `chore` de accesibilidad, lo que llegue antes.
8. **Lo que notará quien use la plataforma:**
   - al cambiar de clase con el historial, el foco va al título;
   - tras el fallo de «Ver más», el foco se queda en el botón;
   - pulsar la sección con la lista vieja la renueva.
9. **Mi veredicto: APROBADO.** El plan está listo para tu aprobación.

## Arbitraje de la ronda 0 — CHORE-06a (2026-11-12)
Solo lectura, sin suites. Leí `reporte-tester.md` (109 líneas, SHA-256 `def65e47302d061201e972019d5d27535a605ac30898366c3c9f94031bb90db9`, comprobado), sección "Ronda 0 — CHORE-06a", y los archivos que cita.

### 1. C-11: aprobada, con el texto del tester
- **Es real.** `features/clases/alumnos-b-r3.ataque.test.tsx:264` afirma `aviso.error` una vez tras `401` con el refresco rechazado (`:68` y `:92`). El aviso sale de `useQuitarAlumno` (`hooks.ts:838`), que §D-3 calla. El plan la dio por vigilada mirando solo `:48`, la ayuda `noAutenticado`. El error fue del plan, no del tester.
- **Conserva la intención:**
  - el caso protege que la sesión perdida a mitad de quitar lleva una sola vez a `/login` (`:263`);
  - y que el foco no cae en `<body>` y sigue en un elemento conectado (`:265` y `:266`);
  - el aviso pasa de "uno" a "ninguno" por DH-04 (a), igual que en C-2.
- **Texto exacto que aplica el tester** (solo esto cambia en el archivo):
  - `:252`, el título: `"el DELETE responde 401 y el refresco falla: apiClient manda al login, no avisa y el foco sigue en la fila"`.
  - `:264` se sustituye por estas tres líneas, con la sangría del caso. `esperar` es la ayuda del archivo (`:158-161`):
    - `// CHORE-06a (C-11): apiClient ya redirige; quitar no avisa. Un momento más tras irA.`
    - `await esperar(50)`
    - `expect(aviso.error).not.toHaveBeenCalled()`
  - `:263`, `:265` y `:266` no cambian.
- **No hay más casos del mismo sentido en `features/clases` ni en `features/tareas`.** Mi repaso no se limitó a los nombres de los códigos. Busqué también `401`, `sinSesion` y las ramas de `/api/auth/refrescar` en los `*.ataque` de los dos módulos:
  - todas las demás ramas de refresco responden `200`, así que la sesión no se pierde;
  - `alumnos-b-r3:268-282` (el roster en `401`) no cuenta avisos;
  - en `features/clases`, `clases-admin-01c-r3:516-540` y `recursos-03d-r1:731-791` ya afirman "ningún aviso";
  - en `features/tareas`, `entregas-01d-r3:571-612` ya dice "ningún aviso" o "como mucho un aviso", que vale con cero;
  - `dudas-03e-r3:651-670` es cerrar sesión y no cuenta avisos.

  Coincido con la tabla del tester.

### 2. C-12: lo decido ya, para que el programador no llegue a esa parada
- **Forma del contenido de la Forma C (manda el plan, R-07):** el contenido **observa por su cuenta** `useTarea(claseId, tareaId)` y, en la entrega, `useEntregaDeAlumno(…)`, con las variables `tarea` y `consulta`, como hoy. No recibe las consultas del marco por props. Lo mismo vale para `EdicionDeLaTarea` (`consulta`) y `EdicionDelRecurso` (`consulta`). Así se cumple R-07, y los literales de ATQ-CH4-34 siguen iguales (punto 4).
- **Si CAL-T-108 sigue en verde:** la aserción no cambia. En su próxima ronda, el tester corrige solo el título, porque "(la ruta no tiene key)" deja de ser cierto. Pasa a: `"…pasar al alumno B (el contenido se monta de nuevo por su key, CHORE-06a) da un solo aviso de la tarea y el panel de B"`.
- **Si cae (PA-2): elijo (b), no (a).**
  - Con la `key`, pasar a B es salir de la vista del contenido de A. La regla M-07, ya aceptada, dice que el fallo callado queda atendido al salir.
  - Además, el verde de hoy depende del cliente de la prueba (`staleTime` 0). Con el de `providers.tsx` (30 s), el contenido de B no vuelve a pedir la tarea y no sale ningún aviso, se escriba como se escriba la Forma C.
  - Mantener (a) exigiría sacar `useAvisoDeRecargaFallida` al marco, que es un cambio de diseño fuera del plan, para un caso de baja frecuencia: la tarea se ve en su última versión, sin aviso.
  - La redacción de (b) es la del tester, tal cual. Título: `"…pasar al alumno B (el contenido se monta de nuevo por su key, CHORE-06a) no repite el aviso del fallo callado y muestra el panel de B"`. Aserción: `expect(avisos()).toEqual([])`. El resto del caso no cambia.
  - La aplica el tester. El programador se detiene (PA-2) solo para que el tester la aplique; no es una enmienda.
- **Lo que no es hallazgo:** con la `key`, el fallo callado de la tarea no se repite al pasar a otro alumno. Es la regla M-07 extendida a "otro alumno". Se registra como observación, no se corrige.

### 3. Enmienda del plan o arbitraje: basta el arbitraje, y nada va al humano
- §D-R0 prevé exactamente este caso: el tester anota la C-n y avisa al manager; no es PARADA. No hace falta enmienda. Este arbitraje y la anotación del orquestador en `aprobacion.md` son el registro.
- **Conteo de 06a: 33** (32 + `alumnos-b-r3.ataque.test.tsx`). Sigue siendo "unos 30" y no se parte. Si C-12 cae, 06a sube a 34, porque es un `*.ataque` más tocado.
- **06b, hallazgo de este repaso (C-13, para la ronda 0 de 06b):** `lib/guardas-ch4-r1.ataque.test.ts:113-120`, ATQ-CH4-34, guarda en su inventario cerrado las **siete** líneas `void <consulta>.refetch()` de H-2. 06b las sustituye por `useRecargarAlPulsarLaSeccion`, que llama `refetch({ cancelRefetch: false })`, así que la igualdad exacta cae.
  - Redacción: se quitan del arreglo las siete líneas bajo el comentario "S-04 (H-2)" (`:114` a `:120`) y el propio comentario. El resto no cambia.
  - Conserva la intención: todo `.refetch(` sin la opción sigue en una lista cerrada, y ahora la lista es más corta.
  - El tester la aplica en la ronda 0 de 06b, junto con C-3 a C-9.
  - **06b pasa a 33** (hasta 35 con las dos condicionales). No pide enmienda ni va al humano.
- **Al humano:** nada que decidir. El orquestador puede mencionarlo en el resumen de cierre de 06a: "se sumó una prueba de ataque que fijaba el aviso de más; 33 archivos".

### 4. Lo que el programador debe cuidar (vigiladas no nombradas en el plan)
- **ATQ-CH4-32** (`lib/guardas-ch4-r1.ataque.test.ts:72-93`) tiene una lista cerrada de llamadas a mutaciones fuera de un manejador a dos espacios. Incluye, como excepción esperada, `editar-tarea-view.tsx en «const handleGuardar = async (datos: CrearTarea, version: number) => {»`.
  - En `EdicionDeLaTarea`, `handleGuardar` **se queda dentro de `contenido()`, con esa línea idéntica**.
  - Si se sube al cuerpo del componente, a dos espacios, la excepción desaparece y la igualdad exacta cae (PA-2). Sumar la guarda de `useMontado` dentro de `handleGuardar` no cambia esa línea.
- **ATQ-CH4-34** (`:106-131`) guarda los literales, sin sangría, de los `.refetch(` de la Forma C. Deben seguir idénticos:
  - `const resultado = await consulta.refetch()` en `editar-recurso-view.tsx` y en `editar-tarea-view.tsx`;
  - `consulta.refetch(),` y `recargaLaTareaTrasConflicto(error) ? tarea.refetch() : Promise.resolve(null),` en `entrega-de-alumno-view.tsx`.

  Así que los nombres `consulta` y `tarea` se conservan en el contenido, y esas llamadas no cambian de archivo. Esto coincide con la forma decidida en el punto 2.
- **CAL-T-95** (`tareas/estatico-01c-r1.ataque.test.ts`): ningún texto suelto en el JSX de `entrega-de-alumno-view.tsx`. El marco y el contenido nuevos usan solo textos de `data.ts`.
- **`tareas/entregas-01d-r3.ataque.test.tsx:682-713` y `entregas-01e-r1.ataque.test.tsx:720-760`:** sin `disabled`, `?? []`, `fetch(` ni importaciones de otro módulo en `hooks.ts`, `formulario-de-entrega.tsx`, `detalle-tarea-view.tsx` y `entrega-de-alumno-view.tsx`. Las guardas nuevas usan el `errorQueRedirigeElCliente` de `features/tareas/lib.ts`, nunca el de `features/clases`.
- Si alguna de estas cae con el código como lo pide el plan, es PA-2 y se detiene. No se "acomoda" el código para que pase con otra forma sin decirlo.

## Arbitraje de PA-1 — CHORE-06a (2026-11-12)
Solo lectura, sin suites. Leí la última entrada de `aprobacion.md`, el diff de `crear-tarea-view.tsx` y `editar-tarea-view.tsx`, `features/tareas/clase-archivada-01d2-tareas.test.tsx:827-1050` y los hermanos que cito.

**La parada es legítima.** ADM-1D221, "éxito, con la vista desmontada: como hoy, navega; un aviso" (`:1035-1046`, filas 35 y 36), fija que, si la persona guarda una tarea y se va a otra sección antes de la respuesta, la app la lleva al detalle de la tarea al llegar el éxito. La guarda que §D-1 pide al pie de la letra (`if (!montado.current || !sigueVigente(generacion)) return`) frena eso también. `useMontado` no distingue "salté a otro id" de "salí de la vista". El plan pidió la línea, pero no inventarió esta prueba: el error es del plan. El programador hizo bien en detenerse.

### 1. La salida: (a), "con la vista desmontada no navega; un aviso"
**Por qué (a).** "Navegar con la vista desmontada" es hoy la excepción en la familia, no la regla:
- Crear y editar clase: `CL3-C14` (`features/clases/formularios-03c2.test.tsx:394-410`, CLASES-03c2) fija "desmontado con un 201/200: un aviso de éxito y ninguna navegación".
- Editar recurso: no navega desmontado (`editar-recurso-view.tsx`, T-01 de 03d; ya con `useMontado`).
- Borrar tarea: ADM-1D221, fila 32, en el mismo archivo (`:1201`), dice "con la vista desmontada: un aviso, sin navegar".
- Duplicar clase: navega en el `onSuccess` del `mutate` (`formulario-duplicar-clase.tsx:100`), que no corre desmontado.
- Crear y editar tarea eran las dos únicas que navegaban. Su "como hoy" de ADMIN-01d2 registró la conducta de entonces; nunca se decidió como regla de producto.

Para la persona también es lo mejor: si eligió irse a Dudas, no la regresamos; el aviso de éxito le confirma que se guardó.

**Por qué no (b).** Es viable, pero no lo recomiendo:
- Se haría con una ref en el componente sin `key` (el marco de editar tarea, y un envoltorio nuevo en crear tarea) con el último id visto, comparado al llegar la respuesta. Suma unas 10 a 15 líneas, una prop por vista y un envoltorio nuevo en `crear-tarea-view.tsx`.
- Conserva justo la conducta que es la excepción.
- Abre estados vecinos nuevos: salir a otra sección y después entrar a "Nueva tarea" de otra clase con el guardado en vuelo; volver a la misma ruta; dos guardados.
- Cada uno es una ronda posible del tester, en el mecanismo que más rondas cuesta.
- Las líneas de ATQ-CH4-32 y 34 no se moverían, pero CH6-A07 y CH6-A09 necesitarían su par "salir y volver".

**Texto exacto (lista cerrada de 06a, entrada nueva).** `features/tareas/clase-archivada-01d2-tareas.test.tsx`, el `it` de `:1035-1046`, dentro de `describe.each(FILAS)` (filas 36 y 35). Solo cambia ese caso, así:
- Título: `"ADM-1D221 éxito, con la vista desmontada: no navega; un aviso (CHORE-06a, como editar recurso y crear o editar clase)"`.
- Cuerpo:
  - `const { cliente, router, soltar } = await conLaEscrituraEnVuelo(ruta, es, respuesta, lanzar, VISTA_DESMONTADA)`;
  - `soltar()`;
  - `await waitFor(() => expect(exitos()).toHaveLength(1), ESPERA)`;
  - `await reposar(cliente)`;
  - `expect(router.state.location.pathname).toBe(RUTAS.otra)`;
  - `expect(router.state.location.pathname).not.toBe(destino)`;
  - `expect(exitos()).toHaveLength(1)`.
- El `not.toBe(destino)` mantiene en uso el `destino` de la desestructuración (`:997`), así que `lint` no se queja de una variable sin usar.
- **El aviso:** sale uno, el de éxito del gancho (`useCrearTarea` y `useEditarTarea` avisan en su `onSuccess`, que corre aunque la vista no esté). Ningún aviso de error.
- El resto del archivo no cambia. ADM-1D222 (a) y (b) (`:1406-1496`, "con éxito, navega" con la vista montada) siguen igual y deben seguir en verde.

**Mutaciones.** El caso nuevo también vigila la parte `!montado.current` de la guarda: si se quita, vuelve a navegar y cae. El programador lo suma a su tabla junto a CH6-A07 (no navega) y CH6-A09 (no navega).

### 2. Hermanos: una sola regla para el mecanismo
La regla: **un guardado que llega con la vista desmontada (por salir de ella o por saltar a otro id) avisa y no navega.**

| Vista (06a) | Cómo navega tras guardar | Con la vista desmontada, hoy | Con 06a |
|---|---|---|---|
| Crear tarea (`crear-tarea-view.tsx`) | `navigate` tras `await mutateAsync` | navegaba (ADM-1D221 fila 35) | no navega; un aviso (este arbitraje) |
| Editar tarea (`editar-tarea-view.tsx`, contenido) | ídem | navegaba (fila 36) | no navega; un aviso |
| Editar recurso (`editar-recurso-view.tsx`, contenido) | `navigate` con `useMontado` | no navega (T-01 de 03d) | igual |
| Crear y editar clase (`FormularioClase`) | `onSuccess` del `mutate` | no navega (CL3-C14) | igual |
| Duplicar clase | `onSuccess` del `mutate` | no navega | igual (ya llevaba `key`) |
| Borrar tarea (`AccionesDeLaTarea`) | `onSuccess` del `mutate` | no navega (fila 32) | igual |
| Publicar anuncio, duda o recurso; tema; entregar; calificar; hilo | no navegan | — | — |

- Busqué en todas las pruebas del frontend "desmontad… navega". Fuera de ADM-1D221 solo aparece `tareas/descarga-ch3-r2.ataque.test.tsx:373`, y ese "navega" es la descarga (`window.location.assign`), otro mecanismo que 06a no toca. No hay otra prueba que fije "navega con la vista desmontada" y que no se haya corrido.
- El programador corrió la regresión completa de 06a (`5299 passed`). Esos dos casos son los únicos rojos.

### 3. Al humano: basta mi arbitraje; se le informa y puede vetarlo
- **No es una decisión nueva de producto.** El plan que aprobó el humano pide esta guarda al pie de la letra (§D-1, Forma A y C: "después del `await`: `if (!montado.current || !sigueVigente(generacion)) return` antes de `navigate`"). Además, la regla ya existe en cuatro hermanos de la misma familia.
- Lo que faltaba era inventariar la prueba y declarar el cambio visible. Eso lo cierra este arbitraje.
- Para el resumen de cierre de 06a, en lenguaje llano: "Si guardas una tarea (nueva o editada) y te vas a otra sección antes de que el servidor conteste, ya no te regresamos al detalle de la tarea: te quedas donde fuiste y ves el aviso de que se guardó. Es lo mismo que ya pasaba al editar un recurso o una clase."
- **Si el humano prefiere lo de antes**, es (b), con el costo descrito arriba: un envoltorio y una prop por vista, y el riesgo de rondas extra. Lo planearía el arquitecto en una Enmienda 3.
- No detengo el trabajo por esto: el programador sigue con (a).

### 4. Enmienda o arbitraje, y conteo
- **Basta el arbitraje, sin Enmienda 3.** Es una entrada de la lista cerrada que salió de una PA-1, con su texto exacto aquí, como C-11 en §D-R0. El orquestador la registra en `aprobacion.md`.
- El cambio visible se suma a los de R-04 en el resumen de cierre. `CLAUDE.md` y `DESIGN.md` no cambian: no es un patrón visual, y la regla ya la practican los hermanos.
- **Conteo de 06a: 34** (33 + `clase-archivada-01d2-tareas.test.tsx`). Sigue siendo "unos 30": no se parte.
- El programador sigue con los pasos 9 a 11 (mutaciones, verificación y resumen). En su resumen lista este caso en la lista cerrada y los hermanos de la tabla de arriba.

## Verificación del resumen del programador — CHORE-06a (2026-11-12)
Manager. Contra `resumen-programador.md` (295 líneas, SHA-256 `50b8e567…6e43`, comprobado), sección "## CHORE-06a — Implementación (2026-11-12)". Plan `c5fe10fc…1297` (comprobado) con los arbitrajes de la ronda 0 y de PA-1 de este archivo. Base `47c3339` (HEAD sin moverse). Equipo con corriente (`BatteryStatus` 2). Por lo que transmitió el orquestador, la otra copia de trabajo ya no se usa. Corrí una cosa a la vez, sin la suite completa (va en la revisión final).

**Veredicto del resumen: DEVUELTO, con un solo hallazgo (M-01), y es del texto, no del código.** Todas las cifras coinciden. Cada CH6-Axx existe con su título exacto y afirma lo que pide su viñeta. El diff se queda en lo que pide el plan. Las mutaciones de mi muestra caen. La viñeta de CH6-A14 sobre los dos vecinos no nombra el caso existente de cada formulario, y en dos formularios dice "sin caso" cuando sí lo hay. Para la corrección no hay que tocar código ni volver a correr suites: basta rehacer esa viñeta. Después, el tester puede atacar.

### Mis corridas (desde `frontend/`, una a la vez)
| Qué | Comando | Última línea (mía) | Resumen |
|---|---|---|---|
| lint | `npm run lint` | `> tsc -b`, salida 0 (ESLint y Prettier sin errores) | igual |
| build | `npm run build` | `✓ built in 1.15s`, salida 0 (solo el aviso de siempre: un trozo de más de 500 kB) | no lo corrió (es del manager) |
| suite de 06a | `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/app src/lib` | `Tests  5303 passed (5303)` (`Test Files  239 passed (239)`; `Duration  267.93s`) | `5303 passed (5303)`, `239 passed (239)`: coincide |
| conteo | `npx vitest list` de las cuatro pruebas nuevas, contadas con `grep -a -c` | 73 + 82 + 56 + 5 = 216 | 216: coincide |

**Conteo por id** (`grep -a -c "> CH6-Axx"`): A01 2, A02 2, A03 2, A04 2, A05 2, A06 5, A07 3, A08 3, A09 2, A10 2, A11 7, A12 2, A13 4, A14 32, A15 68, A16 14, A17 3, A18 56 y A30 5. Las 19 coinciden con el resumen.

### Viñetas de "Pruebas requeridas"
Leí los cuatro archivos completos. Todos los títulos del resumen existen tal cual (plantillas de `it.each` incluidas) y cada caso afirma lo que pide su viñeta, con el router real, la caché de `providers.tsx` y el foco por `document.activeElement`:
- **CH6-A01 a A03:** la confirmación no pasa de A a B, el foco va al `h1` de B y al volver está cerrada. A03 (maestro y alumno) prueba en B "nada en espera" y el `DELETE` de B. La respuesta de A da un solo aviso, deja `isInvalidated` en A y no en B, y no pide nada de B. Al volver antes de 30 s, la persona ya no está.
- **CH6-A04 y A05:** confirmación de borrar, el `409 TAREA_CON_ENTREGAS`, lo elegido, los enlaces, el hilo y la confirmación de anular; el foco va a la raíz de la vista. El `POST` de T2 lleva solo lo de T2 y no sale ninguna subida.
- **CH6-A06:** el doble da la misma `version` (2) a P1, a P2 y a la entrega de P1 en T2. El `PUT` de P2 lleva sus puntos y su versión. Con el `PUT` de P1 retenido, sale un solo aviso (éxito y `409`), el panel de B es el mismo nodo, conserva su valor y su foco, y no se vuelve a pedir la entrega. El camino "mismo alumno, otra tarea" (Enmienda 1) está en sus dos casos.
- **CH6-A07 a A10:** lo escrito no pasa, el `PUT` o `POST` va al id de B con su versión, y la respuesta retenida de A no navega ni reinicia B. En los `409` de tarea y recurso, B no se vuelve a pedir y su campo es el mismo nodo.
- **CH6-A11 a A13:** las cuatro listas, la regresión O-14 (Avisos y Actividades) y el gradebook. En B, el doble responde `400` a cualquier `cursor`, así que una fuga del cursor de A se vería. También el filtro, A → B → A → B, el destino sin caché, la salida al inicio y `StrictMode`.
- **CH6-A14:** los 8 formularios por 4 entradas, con un solo `toast.error` no vacío y sin prefijo `campo:`, ningún `[aria-invalid="true"]` y lo escrito en B igual.
- **CH6-A15, A16 y A18:** cada código que redirige da `irA` con su destino y ningún `toast.error`. El control `500` da un solo aviso: en A15 y A16, con el texto exacto de `mensajeDeErrorClases`; en A18, un texto no vacío (detalle menor). En los sitios con formulario, lo escrito y lo elegido se conservan y el botón sale de `aria-busy`.
- **CH6-A17:** existen los tres casos que escribió el programador (`EditorDeCategorias`, la clase anterior y duplicar). El doble ganó `archivadas: Set<string>` (`app/estado-por-id-ch6.test.tsx:72` y `:115`), que solo pinta `archivadaEn`. La ficha de una cuenta se queda en `ADM-1F10` y `M-20` (`features/admin/ficha-01f.test.tsx:741` y `:1011`), que existen.
- **CH6-A30:** la precondición (al menos 15, sin aflojar), (a) con su control, (b) y (c) con la `key` compuesta armada por partes.

### "Se toca" y "No se toca"
- **34 archivos bajo `frontend/`** (`git status --porcelain frontend | wc -l` → 34): 25 de producción (los de la columna 06a de §D-0), 4 pruebas nuevas, 2 de la lista cerrada (`guardas-ch4.test.tsx` por el plan y `clase-archivada-01d2-tareas.test.tsx` por el arbitraje de PA-1) y 3 `*.ataque` (C-1, C-2 y C-11). Fuera de `frontend/` solo cambian `docs/ESTADO.md`, el `aprobacion.md` de DOCS-05 y la carpeta del encargo, que quedan fuera de la verificación. `docs/trabajo/DEPLOY-investigacion-vps.md` ya estaba sin confirmar antes del encargo (lo registra `docs/ESTADO.md`).
- **V-01:** hay 285 `*.ataque`. Contra `scratchpad/v01-ch6-base.txt` (`686daf88…`, comprobado) solo cambian `guardas-ch4-r1` (`b29a7828…`), `alumnos-b-r1` (`236cba62…`) y `alumnos-b-r3` (`d938aa80…`). Los tres hashes coinciden con los del arbitraje.
- **Las dos pruebas de la lista cerrada** cambian exactamente lo que dice su texto:
  - `guardas-ch4.test.tsx`: `avisoDeClases` y el título de CH4-25;
  - `clase-archivada-01d2-tareas.test.tsx`: el título y el cuerpo de ADM-1D221 del arbitraje, con `cliente`, `soltar()`, `exitos()` en 1, `reposar(cliente)`, `RUTAS.otra` y `not.toBe(destino)`. Nada más del archivo cambia.
- **Producción, archivo por archivo:** el diff se queda en lo del plan:
  - las ocho `key` de la Forma A, más la guarda `useMontado` de crear tarea;
  - las tres de la Forma B y `creandoEn`, en la forma exacta de §D-1, que absorbe la línea de `soloLectura`;
  - las tres Formas C y la `key` del detalle;
  - las guardas de §D-3, que van justo antes de cada `toast.error`, sin tocar lo que corre antes (`marcarViejoElDetalleAnteClaseArchivada`, `pedirDeNuevoLasOpciones`, `pedirDeNuevoLaTarea` y `renovarTrasError`).
  
  Ningún gancho gana `mutationKey`, `useAvisoDeRecargaFallida` conserva sus dos firmas y no se toca ningún archivo de "No se toca".

### La forma del código
- **§D-1, la `key`:** cada una es única por todos los ids de su ruta. Las de clase van por `claseId`; las de tarea y recurso, por su UUID global; la de la entrega es `` key={`${tareaId}:${alumnoId}`} `` (`entrega-de-alumno-view.tsx:265`). Repasé las vistas que leen `useParams` (`detalle`, `editar-tarea`, `entrega-de-alumno`, `editar-recurso`, `entregas-view` y `usuario-view`). Fuera de los 16 sitios, solo `EntregasDeLaTarea` no lleva `key` y guarda refs; va como punto de ataque 1, porque el plan la da por "sin estado local" y no es lo que el programador debía cambiar.
- **Forma C:**
  - el marco conserva `raizRef`, el `div` con `tabIndex={-1}` y `useFocoAlPerderseElControl` con la misma clave;
  - el contenido observa por su cuenta `useTarea`, `useEntregaDeAlumno` y `useRecurso`, con las variables `consulta` y `tarea` (C-12 decidida);
  - `handleGuardar` sigue dentro de `contenido()`, con la línea de ATQ-CH4-32;
  - los cuatro `.refetch(` de ATQ-CH4-34 no cambian.
  
  Esas vigiladas, CAL-T-95, `entregas-01d-r3` y `entregas-01e-r1` están en verde dentro de mi corrida. Las guardas de `features/tareas` usan el `errorQueRedirigeElCliente` de `features/tareas/lib.ts`.
- **Las tres notas de forma del programador, aceptadas:**
  1. el booleano `avisa` en `avisarErrorDelTema` es la lectura correcta de §D-3: un `return` al inicio se habría saltado `renovarTrasError`;
  2. en las subidas, `if (archivoEnSubida !== null && errorQueRedirigeElCliente(error)) return`, antes del `if` de la subida, equivale a la guarda dentro del `if` y no anida (`CLAUDE.md`);
  3. el contenido devuelve `contenido()` y el marco pinta el `div` con el contenido y su `key`, que es la Forma C del plan.
- **`CLAUDE.md`:** retornos tempranos, sin `?? []`, sin textos sueltos y sin tipos fuera de Props. Detalle menor: `editar-tarea-view.tsx` declara `EdicionDeLaTareaProps`, igual a `EditarTareaDeLaClaseProps`, mientras que las otras dos Formas C reusan la interfaz del marco. No cambia nada.
- **Repaso de todos los `toast.error` de `features/clases` y `features/tareas`:** todos los que pueden recibir un código que redirige tienen su guarda, ya sea de este encargo o de antes (`hooks.ts:329`, `:491`, `:711`, `:1533`, `:1631`, `:1712`, `:1829`, `:1877`, `:1942`, `:1988` de clases y calificar en tareas). Las demás excepciones son las que declara el resumen: copiar el código, el `409` de borrar con entregas, el error de campo con el formulario desmontado y la recarga de la entrega que ya callaba.

### Matriz de §D-7 y hermanos, contra el código
- **Éxito de A estando en B:**
  - crear y editar tarea no navegan por `!montado.current` (`crear-tarea-view.tsx:38` y `editar-tarea-view.tsx:121`);
  - editar recurso conserva su `useMontado`;
  - editar clase, duplicar y borrar tarea navegan en el `onSuccess` del `mutate`, que no corre con el observador suelto.
- **`409`:**
  - en editar tarea, el `onConflicto` es del cierre de A y su `refetch` es de la tarea de A;
  - en calificar, `onCalificada` y `onConflicto` van en el `mutate` del panel desmontado.
- **`400 VALIDACION` con el formulario desmontado:** avisa la rama `!montado.current` del formulario (`formulario-tarea.tsx:247`) o la del gancho.
- **Recargas:**
  - tareas marca el fallo como avisado antes del `return` de la guarda (`hooks.ts:298-308`);
  - clases avanza `fallosVistos` antes de mirar `hayDatos` (`hooks.ts:1287-1289`), así que con un código que redirige tampoco repite el aviso.
- **Hermanos:** la tabla del resumen coincide con el código: los 16 sitios, los de fuera, los 13 ganchos y los sitios de M-02, con su "aplica y se aplicó" y sus "no aplica" con razón. Lo único que corrijo es la descripción de `EntregasView`: dice "sin estado local" y guarda refs (punto de ataque 1).

### Muestra de mutaciones (regla del humano, `AGENTS.md` › Pruebas)
Seis mutaciones de mecanismos distintos. Dos no están en la tabla del programador (MGR4 y MGR6) y una de ellas (MGR6) tampoco en la del plan. Cada una es un cambio real con `sed`. Antes, el guion copia el archivo a `scratchpad/mgr/bak/`, comprueba que cambió (con su `diff` en `scratchpad/mgr/mut-<id>.diff`), corre el caso y restaura copiando la copia (nunca `git`), con `cmp`. Al final, `sha256sum -c` de los seis archivos dio OK y `sha256sum -c` de `scratchpad/post-sha.txt` (los 25 de producción del programador) dio 25 OK. El árbol quedó como lo entregó.

| Id | Se quita | Comando (`npx vitest run …`) | Cae | ¿Coincide? |
|---|---|---|---|---|
| MGR1 (`key` de vista) | `key={claseId}` de `MaestrosDeLaClase` | `src/app/estado-por-id-ch6.test.tsx -t "CH6-A01\|CH6-A03"` | los 2 de CH6-A01 y CH6-A03 (maestro); A03 (alumno) sigue verde. `Tests  3 failed \| 1 passed \| 69 skipped (73)` | sí (M01 y M01b) |
| MGR2 (`key` compuesta) | la parte de `tareaId` (queda `key={alumnoId}`) | `src/app/estado-por-id-ch6.test.tsx src/lib/estado-por-id-estatico-ch6.test.ts -t "CH6-A06\|CH6-A30"` | los 2 de "mismo alumno, otra tarea" y CH6-A30 (c); los otros 3 de A06 y los 4 de A30, verdes. `Tests  3 failed \| 7 passed \| 68 skipped (78)` | sí (M05) |
| MGR3 (`!montado.current`) | `!montado.current \|\|` de `handleGuardar` en crear tarea | `src/app/estado-por-id-ch6.test.tsx src/features/tareas/clase-archivada-01d2-tareas.test.tsx -t "CH6-A09\|ADM-1D221 éxito, con la vista desmontada"` | CH6-A09 «con el POST de A retenido…» y ADM-1D221 de la fila 35 (la 36 sigue verde). `Tests  2 failed \| 2 passed \| 179 skipped (183)` | sí (M07) |
| MGR4 (guarda de §D-3, tareas) | `if (errorQueRedirigeElCliente(error)) return` de `useBorrarTarea` | `src/features/tareas/avisos-al-redirigir-ch6.test.tsx -t "borrar una tarea"` | los 3 códigos que redirigen; el `500` sigue verde. `Tests  3 failed \| 1 passed \| 52 skipped (56)` | no está en su tabla; cae como debe |
| MGR5 (guarda de §D-3, recarga de clases) | `!errorQueRedirigeElCliente(temas.error)` de `BloqueDeRecursos` (`recursos-view.tsx:69`, cambiado por `true`) | `src/features/clases/avisos-al-redirigir-ch6.test.tsx -t "Recursos con una recarga"` | «Recursos … 401 sin refresco»; el `503` y los dos de "un tema de Recursos" (otra guarda) siguen verdes. `Tests  1 failed \| 3 passed \| 78 skipped (82)` | no está en su tabla; cae como debe |
| MGR6 (`key` de la Forma C) | `key={recursoId}` de `EdicionDelRecurso` | `src/app/estado-por-id-ch6.test.tsx src/lib/estado-por-id-estatico-ch6.test.ts -t "CH6-A08\|CH6-A30"` | los 3 de CH6-A08 y CH6-A30 (c). `Tests  4 failed \| 4 passed \| 70 skipped (78)` | no está en ninguna tabla; cae como debe |

Además, leí la salida del programador de M01, M01b, M04, M05, M06b, M07, M10a y M12c (`scratchpad/mut-<id>.txt`). Los casos caídos y sus cifras son los de su tabla. La nota de M01 y M02 (el `-t` con paréntesis no seleccionó CH6-A03, y por eso hay M01b y M02b) es cierta en la salida.

### Arbitrajes de lo que el programador deja abierto
**1. Vecinos de CH6-A14 ("campo pintado solo en otro modo" y "rechazo del servidor seguido de uno local").**
- **El plan no exigía casos nuevos.** §D-2 dice que ningún formulario cambia su conducta ante un `400`, y CH6-A14 pide solo que el resumen nombre "el caso existente de cada formulario que los cubre". La regla de `AGENTS.md` que obliga a inventariar esos vecinos como casos requeridos es para un formulario nuevo, y 06a no crea ninguno. Donde de verdad no hay caso, basta la observación, con una fila al cierre (ver "Para el orquestador").
- **Lo que no basta es la viñeta como está** (M-01). No mapea cada formulario con su caso, y en dos celdas dice "sin caso" cuando sí lo hay:
  - edición de recurso, "rechazo del servidor y después la validación local": «CL3-D17: tras un «titulo:» del servidor, un envío con el título vacío muestra solo «Escribe el título del recurso»» (`features/clases/editar-recurso-03d.test.tsx:704-705`);
  - panel de calificación, "campo pintado solo en otro modo": «CAL-T-78: un 400 «calificacion: …» en una tarea con rúbrica (sin campo «Calificación») no se pierde en silencio: o lo avisa o lo muestra» (`features/tareas/calificar-01c-r1.ataque.test.tsx:543`);
  - además, el recurso nuevo tiene su "rechazo del servidor y después la validación local" en `features/clases/recursos-03d.test.tsx:1092` (CL3-D17, "al publicar"), que la viñeta no nombra.
- Lo que no encontré, con el mismo `grep` (los dos vecinos en duda, tarea nueva y edición de tarea, y el segundo vecino en el panel; `CH3-A14` de `features/tareas/formularios-ch3.test.tsx` cubre F1, F3 y F4, no el otro modo ni la secuencia), puede quedar como "sin caso". Que lo confirme el programador en su tabla.

**2. Estados vecinos de §D-1 sin caso propio (el salto con un código que redirige, o con `5xx` o red).**
- **No falta un caso requerido.** "Pruebas requeridas" pide para CH6-A13 solo (a) a (d). La lista de estados vecinos de §D-1 dice "que recorre el resumen y atacan las pruebas": el resumen los recorrió y declaró la inferencia.
- **La inferencia es correcta en el código.** La guarda vive donde corre aunque la vista esté desmontada: el `onError` del gancho, que conserva sus opciones (S-04), y el `catch` de la subida, que es del cierre del formulario de A. La única rama que mira el montaje es `formulario-tarea.tsx:247` (`!montado.current`), y solo para un error de campo, que no es un código que redirige. Con `5xx` o red, el gancho avisa una vez, como con la vista montada.
- **Es punto de ataque para la ronda 1** (punto 2 de abajo), no motivo para devolver.

**3. La descarga de `components/adjuntos`, que sigue avisando.** Decisión del humano (DH-04 (a)), con destino en A-4 (fila nueva de `docs/ESTADO.md` §3, por la prop `alFallarLaDescarga`). El punto de ataque 2 del plan ya la marca como observación, no hallazgo. Nada que hacer en 06a.

### Lo que devuelve el resumen
#### M-01 — La viñeta de CH6-A14 no nombra el caso existente de cada formulario y en dos dice "sin caso" cuando sí lo hay
Dónde: `resumen-programador.md:102-108` y `:293`.
Por qué importa: CH6-A14 pide que "el resumen nombra el caso existente de cada formulario que los cubre" (paso 11: "los casos existentes que cubren CH6-A14"). La regla del humano dice que si falta una viñeta o una cifra no coincide, el resumen vuelve al programador; no se corrige a mano. Hoy la viñeta nombra casos en general, sin decir qué formulario cubre cada uno. Además, declara "sin caso existente" en la edición de recurso y en el panel de calificación, y los dos sí tienen caso (arbitraje 1). Una afirmación falsa en el resumen deja al tester y al cierre de ESTADO con un inventario equivocado.
Qué se espera:
- Una tabla de 8 formularios (anuncio, duda, recurso, tema, tarea nueva, edición de tarea, edición de recurso y panel de calificación) por los dos vecinos. En cada celda, el archivo, la línea y el título exacto del caso existente, o "sin caso", con el `grep` que lo respalda.
- Incluye al menos CL3-D17 en `editar-recurso-03d.test.tsx:704-705`, CL3-D17 en `recursos-03d.test.tsx:1092` y CAL-T-78 en `calificar-01c-r1.ataque.test.tsx:543`.
- Las celdas "sin caso" van a "Pendiente" con la frase de que el encargo no cambia esa conducta.
- Sin tocar código ni pruebas, y sin volver a correr suites. Se agrega como sección de corrección al final de `resumen-programador.md`, por partes.

**Hermanos de M-01** (la misma clase de inexactitud): la viñeta de CH6-A17 y la descripción de `EntregasView` en "Hermanos por mecanismo". La de CH6-A17 está bien (comprobé los dos casos existentes de la ficha). La de `EntregasView` repite el "sin estado local" del plan, pero guarda refs. Que el programador la corrija en la misma sección ("guarda refs de «Ver más»; no se toca en 06a; punto de ataque") sin cambiar el código.

### Para el humano
Nada que decidir en esta verificación. Lo que hay es del texto del resumen (M-01) y un punto de ataque (`EntregasView`). Si el tester confirma un daño ahí, el arbitraje dirá si es un hermano de 06a (una `key` más, con su caso) o va a otro encargo.

### Para el orquestador
- Después de M-01, no hace falta otra corrida: el código no cambia. Basta comprobar que los 25 archivos de producción y las 6 pruebas tocadas siguen con su hash (la lista que dejó el programador en `scratchpad/post-sha.txt`; yo verifiqué los 6 de mi muestra con `sha256sum -c`) y leer la sección nueva.
- Al cierre de 06a, si quedan celdas "sin caso" en la tabla de M-01, una fila en `docs/ESTADO.md` §3: "CHORE-06a: sin caso de 'campo pintado solo en otro modo' y de 'rechazo del servidor seguido de uno local' en <formularios>; la conducta no cambió en 06a". Destino: el próximo encargo que toque esos formularios.

### Puntos de ataque para la ronda 1 del tester (después de M-01)
Por mecanismo. Los cinco del plan siguen vigentes; estos son los que salen de esta verificación.
1. **M-1, un hermano que el plan dio por "sin estado local": `EntregasDeLaTarea`** (`features/tareas/entregas-view.tsx:45-115`, sin `key`). Guarda `pidiendoMasRef`, `idsAntesDeVerMasRef` y `montadoRef`, que sobreviven a un salto de las entregas de T1 a las de T2. Atacar: «Ver más alumnos» de T1 en vuelo al saltar a T2 (¿el de T2 deja de responder sin estar en espera, porque `enEspera` lee la consulta de T2?), la página de T1 que falla estando en T2 (¿un aviso de T1 en T2?) y el foco tras esa página. Si se confirma un daño, es un hermano que el plan no inventarió: va a arbitraje, no a corrección directa.
2. **M-1 con M-2: el salto combinado con un código que redirige, con `5xx` y con red** (estados vecinos sin caso propio; arbitraje 2). En crear y editar tarea, editar recurso, calificar, publicar y quitar: la respuesta de A que llega estando en B da cero avisos e `irA` una vez (código que redirige) o un solo aviso (`5xx` o red); nada navega, nada se reinicia y nada toma el foco en B.
3. **La regla nueva de PA-1 ("con la vista desmontada, avisa y no navega").** Salir de "Nueva tarea" o de la edición y volver a la misma ruta antes de la respuesta; dos guardados seguidos; el salto entre dos clases con el guardado en vuelo y la clase de A que pasa a archivada en medio. Que salga un solo aviso de éxito y que ninguna ruta cambie sin que la persona lo pida.
4. **La Forma C con `StrictMode` y con la clase que pasa a archivada en medio.** CH6-A13 (d) solo cubre Personas. Atacar la edición de tarea, la de recurso y la entrega de un alumno: que el doble montaje no reabra nada ni mueva el foco, y que la generación de solo lectura y `useMontado` del contenido no dejen pasar un `navigate` o un reinicio.
5. **R-03, lo contrario:** un `401` sin token enviado (o en una ruta sin sesión) en un sitio de §D-3 sigue avisando donde avisaba.
6. **`useAvisoDeRecargaFallida` de tareas, la rama sin la consulta en caché** (`features/tareas/hooks.ts:296-310`): si `consulta` es `undefined`, la guarda nueva no corre y el aviso sale. Ver si se llega ahí con un código que redirige (por ejemplo, tras `removeQueries` o un cambio de clave) y la vista activa.
7. **CH6-A30 y R-02:** render props de varias líneas bajo la clase. `personas-view.tsx:180-185` (maestro) pinta `MaestrosDeLaClaseEnLectura` sin `key`; confirmar que no guarda estado local que pase de una clase a otra.

## Verificación de la corrección del resumen — CHORE-06a (2026-11-12)
Manager, solo lectura, sin suites: el tester está en su ronda 1. Contra `resumen-programador.md` (361 líneas, SHA-256 `ae4325a5…08ad`, comprobado), sección "## CHORE-06a — Corrección del resumen (M-01) (2026-11-12)", desde la línea 297.

**Veredicto: ACEPTADO. M-01 queda cerrado.**

**El árbol no cambió desde mi verificación.** `git status --porcelain frontend` sigue dando 34, y `sha256sum -c scratchpad/post-sha.txt` da 25 OK en los archivos de producción. No hay archivos nuevos sin rastrear fuera de las 4 pruebas de 06a. La corrección es solo de texto, como declara.

**La tabla de 8 por 2, revisada completa.** Abrí cada archivo y cada línea que cita, y todas existen y dicen lo que la tabla les atribuye:
- Anuncio:
  - CH3-B16 (`formularios-ch3.test.tsx:834` y la fila `:801`);
  - CL3-D20 (`avisos-03d.test.tsx:498`).
- Duda:
  - "no aplica", porque tiene un solo modo y un solo campo; lo acepto, porque el campo ajeno lo cubre CH6-A14;
  - CL3-E07 (`dudas-03e.test.tsx:792`).
- Recurso nuevo:
  - CL3-D15 con la fila `version:` (`recursos-03d.test.tsx:1072` y `:1067`); `version` solo va en el cuerpo de la edición (`shared/src/recursos.ts:76`);
  - CL3-D17 "al publicar" (`:1092` y `:1097`).
- Tema:
  - "no aplica", porque los dos modos pintan `nombre` (lo fija CH3-B16);
  - CL3-C15 con las filas `:213` y `:229` (`formularios-03c2.test.tsx:555`).
- Edición de recurso:
  - CL3-D16 con la fila `tipo:` (`editar-recurso-03d.test.tsx:687` y `:682`);
  - CL3-D17 "al editar" (`:704` y `:705`).
- Panel de calificación:
  - CAL-T-78 (`calificar-01c-r1.ataque.test.tsx:543`) y su contrario, CAL-1C06b (`calificar-01c.test.tsx:924`);
  - "sin caso" en el segundo vecino. Lo acepto: CAL-T-115 (`campos-01c-r2.ataque.test.tsx:335`) es un rechazo del servidor seguido de otro del servidor.
- Tarea nueva y edición de tarea: "sin caso" en los dos vecinos. Lo confirmé con mi propio `grep`: en `features/tareas`, el único `400` con `version:` es del panel (`calificar-01c:877`, `campos-01c-r2:286` y `aviso-calificar-01c-r3:337`) y ninguno va al formulario de la tarea.

La lista de frases que sustituye (líneas 102 a 108, 199 y 293) está bien acotada. Lo que la viñeta vieja nombraba fuera de estos 8 formularios (CH4-27, ADM-1C05 (d) y las otras filas de CL3-C15) queda bien reubicado.

**Al cierre (orquestador):** una fila en `docs/ESTADO.md` §3 para las cinco celdas "sin caso" (tarea nueva y edición de tarea, en los dos vecinos; el panel, en el segundo), con destino el próximo encargo que toque esos formularios. CHORE-06a no cambia esa conducta (§D-2).

### `EntregasView`: lo que afirma es cierto
Lo leí en `features/tareas/entregas-view.tsx:45-115`. `EntregasDeLaTarea` no lleva `key` y guarda `pidiendoMasRef` (`:52`), `montadoRef` (`:53`) e `idsAntesDeVerMasRef` (`:55`).
- `handleVerMas` (`:99-115`) vuelve sin pedir nada mientras `pidiendoMasRef` está en `true`, pero `enEspera` lee `lista.isFetching`, que tras el salto ya es la consulta de T2 (`:146`). Así que, con la página de T1 en vuelo, «Ver más alumnos» de T2 es un clic muerto sin espera visible.
- El aviso de un fallo de T1 en T2 sí sale, uno solo, y eso lo admite S-04 ("su aviso sí sale, uno solo").
- El foco del efecto de `:78-96` va a una fila de T2 o al `h2`, nunca a `<body>`. No es daño.

El plan la dio por "ninguno (sin `useState`…)" (`plan.md:138`) y además la lista en "No se toca" de 06a (`plan.md:443`, `features/tareas/` salvo los siete).

**Mi postura, adelantada, si el tester lo confirma con una prueba roja:**
- **Es un hallazgo de 06a, no un pendiente.** Contradice el resultado que fija §D-1 ("ningún control del id nuevo espera por una petición del anterior"). Es el mismo mecanismo M-1 y el error es de inventario del plan, como C-11 y PA-1. Su gravedad es baja: no es destructivo, la lista es de solo lectura, se cura cuando responde T1 y exige un salto con «Ver más» en vuelo. Aun así, cerrarlo cuesta poco.
- **El remedio queda fuera de "Se toca":** `entregas-view.tsx` está en "No se toca". Antes de instruir al programador, el orquestador pide autorización al humano (`AGENTS.md`). No hace falta enmienda: basta el arbitraje, como en PA-1, con una entrada nueva en "Se toca".
- **El remedio que propondría:** la Forma C de §D-1. El marco `EntregasDeLaTarea` conserva `raizRef`, el `div` con `tabIndex={-1}` y `useFocoAlPerderseElControl` con su clave. El contenido, con `key={tareaId}`, se lleva las refs, `handleVerMas`, `useAvisoDeRecargaFallida` y la lista.
  - Sin tocar las líneas que leen literalmente los `*.ataque`: `fetchNextPage({ cancelRefetch: false })` (`:104`) y las guardas de `:107-111`. Lo vigilan `lib/guardas-de-doble-clic-estatico`, `entregas-01e-r1`, `entregas-01e-r2` y `styles/clases-r1` (V-06: el mismo número de `enEspera=`).
  - Un caso nuevo en `app/estado-por-id-ch6.test.tsx`: con «Ver más alumnos» de T1 retenido, saltar a T2; en T2, un clic manda la página de T2, y al soltar T1 sale como mucho un aviso, sin foco en `<body>`.
  - Su mutación: quitar la `key`.
  - CH6-A30 (c) sumaría `entregas-view.tsx` con su `key`.
  - 06a pasaría de 34 a 35 archivos (36 si el tester deja su `*.ataque`): sigue siendo "unos 30".
- **Si el humano no autoriza tocar el archivo:** queda como pendiente en `docs/ESTADO.md` §3, con destino el próximo encargo que toque `features/tareas/entregas-view.tsx` y la prueba roja del tester como evidencia, marcada como "decisión del humano" para que la ronda no cuente como abierta.

## Verificación de la corrección de la ronda 1 — CHORE-06a (2026-11-12)
Manager. Lo que revisé:
- `reporte-tester.md` (241 líneas, `8d071907…`, comprobado), "## Ronda 1", con T-01 y O-01 a O-04;
- `resumen-programador.md` (455 líneas, `3d61d4be…`, comprobado), "## CHORE-06a — Corrección ronda 1 (T-01)";
- la autorización del humano en `aprobacion.md` ("Autorizo": tocar `entregas-view.tsx` solo para la Forma C);
- el diff.

El tester no estaba corriendo nada. Corrí una cosa a la vez, con corriente, sin la suite completa.

**Veredicto: ACEPTADO, sin M-n.** T-01 queda corregido con el remedio autorizado y nada más. Las cifras coinciden, la mutación hace caer los tres casos que dice el programador y la tabla de hermanos coincide con mi grep. «Sin tema» queda como punto de ataque para la ronda 2, con su salida ya decidida (abajo).

### Mis corridas (desde `frontend/`)
| Qué | Comando | Última línea (mía) | Resumen |
|---|---|---|---|
| lint | `npm run lint` | `> tsc -b`, salida 0 (sin errores ni avisos) | igual |
| build | `npm run build` | `✓ built in 842ms`, salida 0 | no lo corrió (es del manager) |
| suite de 06a | `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/app src/lib` | `Tests  5349 passed (5349)`, con `Test Files  240 passed (240)` y `Duration  275.26s` | `5349 passed (5349)`, `240 passed (240)`: coincide. Son 5303 más los 45 del tester y CH6-A19 |
| conteo | `npx vitest list` de las cuatro pruebas nuevas, con `grep -a -c` | 74 + 82 + 56 + 5 = 217; `> CH6-A19`: 1 | 217 y 1: coincide |

- **Archivos:** 36 en `frontend/` (`git status --porcelain frontend | wc -l`). Son los 34 de antes, `features/tareas/entregas-view.tsx` (`05b23673…`, igual al del resumen) y `app/estado-por-id-ch6a-r1.ataque.test.tsx`.
- **Producción:** `sha256sum -c scratchpad/post-sha.txt` da 25 de 25 OK; los otros archivos de producción de 06a no cambiaron.
- **V-01:** 286 `*.ataque`. Contra `v01-ch6-base.txt` cambian C-1 (`b29a7828…`), C-2 (`236cba62…`) y C-11 (`d938aa80…`), y se suma `app/estado-por-id-ch6a-r1.ataque.test.tsx` con `2d40aeea…`, el mismo hash del reporte del tester: el programador no lo tocó.

### Mutación (repetida por mí)
| Id | Se quita | Comando | Cae | ¿Coincide? |
|---|---|---|---|---|
| MGR7 | `key={tareaId}` de `<ListaDeEntregasDeLaTarea …/>` (`entregas-view.tsx:214`) | `npx vitest run src/app/estado-por-id-ch6.test.tsx src/app/estado-por-id-ch6a-r1.ataque.test.tsx src/lib/estado-por-id-estatico-ch6.test.ts -t "CH6-A19\|ATQ-CH6-0[123]\|CH6-A30"` | CH6-A19, ATQ-CH6-01 y CH6-A30 (c). `Tests  3 failed \| 6 passed \| 115 skipped (124)`; ATQ-CH6-02 y 03 y los otros 4 de A30 siguen verdes | sí, idéntica a la del programador |

Con copia previa y restauración por copia, con `cmp` (`RESTAURADO OK`). Después de restaurar, el archivo sigue en `05b23673…`.

### El remedio de `entregas-view.tsx`
- **Lo autorizado y nada más.** El diff contra `47c3339` es la Forma C de §D-1, con 22 inserciones y 7 borrados:
  - el contenido pasa a llamarse `ListaDeEntregasDeLaTarea` y se lleva las refs, `handleVerMas`, el aviso de recarga y el efecto del foco;
  - el marco `EntregasDeLaTarea` conserva `raizRef`, el `div` con `tabIndex={-1}` y `useFocoAlPerderseElControl` con la misma clave compuesta, y pinta `<ListaDeEntregasDeLaTarea key={tareaId} …/>`;
  - ningún texto, gancho ni guarda cambia de contenido.
  
  Es lo que autorizó el humano (`aprobacion.md`, "Autorizo").
- **Las líneas que otras pruebas fijan, intactas:**
  - `fetchNextPage({ cancelRefetch: false })` (`:103`) y las cuatro guardas de `handleVerMas`, en el mismo manejador;
  - un solo `enEspera=` (V-06).
  
  `lib/guardas-de-doble-clic-estatico`, `entregas-01e-r1`, `entregas-01e-r2` y `styles/clases-r1` están en verde en mi corrida.
- **El foco no se rompe.** La clave del marco cambia con la tarea, así que el control que se desmonta con el contenido lleva el foco a la raíz, como en CH6-A04 y A06. Las pruebas de foco de entregas que ya existían están en verde.
- **`key={tareaId}` basta:** la ruta es `tareas/:tareaId/entregas` bajo `:claseId`, y `tareaId` es el UUID de una sola fila, que ya implica su clase. Ningún id de esa ruta se repite entre filas, como en el detalle y la edición; distinto de la entrega de un alumno.
- **Los dos archivos de prueba:**
  - CH6-A19 (`app/estado-por-id-ch6.test.tsx:1358`) afirma lo que pide T-01: el botón de T2 sin `aria-busy`, y un clic manda la página de T2 con cursor. También que la página de T1, al soltarse, no escribe nada en T2 (con un alumno que solo existe en T1), que no hay `toast.error` y que la ruta sigue en T2. El doble ganó `entregasEnPaginas` y `siguientesDeEntregas`, reiniciados en `beforeEach`.
  - CH6-A30 (c) suma `<ListaDeEntregasDeLaTarea key={tareaId}` (`lib/estado-por-id-estatico-ch6.test.ts:114`).
  - El id A19 estaba libre.
  - Detalle menor: el foco final de CH6-A19 se afirma solo como "no es `<body>`". El plan pide `document.activeElement` cuando dice a dónde va; aquí no lo dice, pero la vista sí lo define (§7.14 de `entregas-view`: el «Ver entrega» de la primera fila nueva, Alumno 21). No bloquea; va como punto de ataque 3.

### Hermanos, contra mi propio grep
Recorrí las rutas con id de `app/router.tsx` y los componentes con estado que cuelgan de una `key` que no es única por esos ids o de una vista sin `key`. Busqué `useRef`, guardas `…Ref.current`, `useState` y `fetchNextPage`. Coincido con la tabla del programador:
- **Fuera de `EntregasDeLaTarea`**, ninguna guarda por ref deja un control del id nuevo como un clic muerto. Las guardas con ref (`pidiendoRef`, `pidiendoMasDeRef`, la `pidiendoMasRef` del hilo, `quitandoRef` y `borrandoRef`) viven bajo una `key` por id. Las de la Forma B son de foco y están hechas para el cambio de clase (O-14). `ultimoFalloAvisado` y `tareaPerdidaAvisada` van por consulta.
- **Componentes que sobreviven al cambio de clase con `key` constante:** `BloqueDeRecursos` (`key={bloque}`, `recursos-view.tsx:189`) y la sección «Sin tema» (`key={seccion.clave}` con `CLAVE_SIN_TEMA`, `recursos-view.tsx:138` y `trabajo-view.tsx:246`). Los tres guardan solo memoria de foco. Ninguno tiene confirmaciones, formularios ni guardas de «Ver más» por ref. Los «Ver más» de las secciones usan `isFetching` y `cancelRefetch: false`.

### Arbitraje: «Sin tema»
- **Lo que es:** `seccion-de-recursos.tsx:89-113` y `seccion-de-tema.tsx:68-86` recuerdan en `idsPrevios` las filas de la clase anterior. El efecto del hijo corre antes que el `clasePrevia` del padre. Con el foco en una fila de «Sin tema» de A, el salto a B puede llevar el foco a una fila vecina de B (`vecinaDeFila`) o al encabezado de la sección, en lugar del `h2` de la lista. El foco nunca cae en `<body>` y no hay escritura ni petición en el id equivocado. La conducta es anterior a 06a (antes del encargo, toda la vista sobrevivía al salto).
- **Decisión: punto de ataque para la ronda 2, con la salida ya decidida.**
  - **Si el tester lo confirma con una prueba roja, es un hallazgo de 06a, de severidad baja.** La razón es el mecanismo M-1: una `key` que no es única por el id de la ruta, con estado que sobrevive al salto. §D-1 fija para estas cuatro listas "a su `h2` como hoy (O-14)", y lo que hoy hace «Sin tema» lo contradice.
  - El remedio cabe en "Se toca" de 06a, sin autorización: la `key` de la sección incluye la clase en `recursos-view.tsx:138` y `trabajo-view.tsx:246` (por ejemplo, `` `${claseId}:${seccion.clave}` ``). Así la sección se monta de nuevo y el `clasePrevia` del padre lleva el foco al `h2`, como en las filas con tema. No hay que tocar `seccion-de-recursos.tsx` ni `seccion-de-tema.tsx`.
  - Lleva su caso en la regresión O-14 de CH6-A11 ("Sin tema", en Recursos y en Actividades) y su mutación.
  - Si ese remedio rompiera una vigilada de O-14 (`foco-02c-r3/r4/r5`, `heredados-02d-r1`), el programador se detiene (PA-2). Entonces lo vuelvo a arbitrar como pendiente para el `chore` de accesibilidad del marco (DH-05 (b)), que es su destino natural por ser solo de foco.
  - **Si el tester no lo confirma,** queda como observación cerrada.

### Estados vecinos del remedio sin caso propio
- Son: T1 → T2 → T1 con la página en vuelo, dos clics en T2, la tarea borrada en medio y la clase archivada en medio.
- Ninguno es un caso requerido. "Pruebas requeridas" no los nombra para esta vista, y la regla de la corrección pide recorrerlos y decir si el remedio aplica, que es lo que hizo el programador. Los repasé contra el código y la lectura es correcta:
  - al volver a T1, el contenido nuevo nace con `pidiendoMasRef` en `false` y su consulta sigue pidiendo, así que «Ver más alumnos» queda en `enEspera` y la guarda `lista.isFetching` no deja pedir otra;
  - los errores de la página de T1 los recibe el contenido desmontado (`montadoRef` en `false`) y no avisan.
- Van como puntos de ataque 3 y 4.

### Observaciones del tester
- **O-01, aceptada.** Que el fallo de la página de T1 que llega estando en T2 no se avise es la regla de la vista desmontada, la misma que ya seguían el hilo (`entregas-01d.test.tsx:1046`) y las listas con `key`. Con el remedio, la causa es `montadoRef` del contenido de T1, ya no el observador compartido. Al volver a T1, la consulta queda en error con sus datos y «Ver más alumnos» se puede repetir. Cualquier cambio sobre eso es de §D-5 (06b), no de 06a.
- **O-02, aceptada.** Es S-03, una decisión tomada: volver con la petición en vuelo deja los controles sin espera.
- **O-03, aceptada.** Es DH-04, con su destino en A-4.
- **O-04, aceptada.** La parte de `tareaId` de la `key` compuesta la vigilan CH6-A06 ("mismo alumno, otra tarea") y CH6-A30 (c). Las hice caer en MGR2.

### Medición (hermanos y estados vecinos)
**T-01 no cuenta como ronda extra por hermanos para la medida del programador** (`AGENTS.md`: pasar a `opus` si hay 2 o más por no aplicar un remedio a sus hermanos). No vino de un remedio del programador que no se extendió por analogía. Vino de un hermano que el plan clasificó "No hace falta" (`plan.md:138`) y dejó en "No se toca" (`plan.md:443`): el programador no podía tocarlo sin una PA-4, y lo señaló en su corrección de M-01 antes de que el tester lo probara. Se registra como **ronda por inventario del plan**, como C-11 y PA-1. Cuenta de 06a: 1 ronda del tester con hallazgo y 0 rondas extra por hermanos atribuibles al programador. Si «Sin tema» se confirma en la ronda 2, también será de inventario del plan (la `key` de la sección es anterior y el plan no la nombró).

### Puntos de ataque para la ronda 2 del tester
1. **«Sin tema» con `key` constante** (`recursos-view.tsx:138`, `trabajo-view.tsx:246` y `CLAVE_SIN_TEMA`): en Recursos y en Actividades, con el foco en una fila de «Sin tema» de A, saltar a B. ¿El foco va al `h2` de la lista (O-14) o a una fila o al encabezado de la sección de B? Lo mismo con «Ver más» de «Sin tema» de A en vuelo al saltar (`useFocoAlCargarMas`). La salida, si se confirma, está decidida arriba.
2. **`BloqueDeRecursos` con `key={bloque}`** (`recursos-view.tsx:189`), que sobrevive al cambio de clase: confirmar que solo guarda memoria de foco y que ninguna recarga ni aviso del bloque de A sale en B.
3. **Las entregas tras el remedio:**
   - el foco al cargar la última página de T2 tras el salto (§7.14 de la vista: el «Ver entrega» de la primera fila nueva, por `document.activeElement`);
   - T1 → T2 → T1 con la página de T1 en vuelo (al volver, «Ver más alumnos» de T1 en `enEspera` y una sola petición);
   - doble clic en T2 tras el salto.
4. **Las entregas con un error de la página de T1 que llega estando en T2:** `404 TAREA_NO_ENCONTRADA`, `409 CLASE_ARCHIVADA` y un código que redirige. En T2, nada se reemplaza, ningún aviso de T1 y, con un código que redirige, `irA` una sola vez. Al volver a T1, la vista que corresponde (el mensaje de la tarea perdida o la clase en solo lectura).
5. **R-07 en la Forma C de las entregas:** el marco y el contenido observan `useTarea` y `useEntregasDeLaTarea`. Contar las peticiones al montar, al saltar entre tareas con y sin caché y al recargar: una por consulta, sin duplicados.
6. **Regresión:** los 45 casos de `app/estado-por-id-ch6a-r1.ataque.test.tsx` siguen en verde (lo están en mi corrida).

### Para el humano
Nada que decidir. Si «Sin tema» se confirma, el remedio cabe en "Se toca" de 06a y no necesita otra autorización. Solo llegaría al humano si el remedio rompiera una vigilada de O-14 y hubiera que mandarlo al `chore` de accesibilidad del marco.

## Arbitraje de la ronda 2 — CHORE-06a (2026-11-12)
Manager. Solo lectura, sin suites. Leí:
- `reporte-tester.md` (323 líneas, `147c6da9…`, comprobado), "## Ronda 2";
- `app/estado-por-id-ch6a-r2.ataque.test.tsx` (`a7919e2d…`, comprobado);
- los ganchos y las vistas que cito abajo.

**Decisiones, en corto:**
1. **T-03, media.** Es un hallazgo de 06a. El remedio es que el gancho guarde la clave que protege, como ya lo hace `useFocoAlPasarAError`. Toca `features/clases/hooks.ts` fuera de las líneas de §D-3 y cambia la firma de `useAvisoDeRecargaFallida` (PA-4), así que **necesita la autorización del humano**. Si no la da, queda una salida dentro de "Se toca" (abajo).
2. **T-02, baja.** Confirmo el remedio que adelanté: la `key` de la sección incluye la clase. Es coherente con T-03 y cubre también el aviso de recarga de «Sin tema». No necesita autorización.
3. **Un hermano nuevo, sin prueba roja todavía (H-R2).** `useFocoAlCargarMas` en Avisos y Dudas, que sobreviven al cambio de clase, es el mecanismo de ATQ-CH6-18 en las otras dos listas de la Forma B. Va como caso requerido con rojo primero y su remedio ya escrito, para no dejarlo a la ronda 3.
4. **O-05.** Se declara la redundancia en el resumen de la corrección, con su mecanismo. La guarda se queda.
5. **Medición.** T-03 cuenta como **1 ronda extra por hermanos**. La comparten el inventario del programador en la corrección de T-01 y mi verificación, que lo dio por bueno. T-02 no suma: estaba arbitrado y en espera de evidencia.
6. **Al humano:** la autorización de T-03. No hace falta parar a replantear el inventario: abajo va completo, por ganchos.

### Inventario: estado dentro de ganchos de componentes que sobreviven al cambio de un id
**Componentes que sobreviven:**
- al cambio de `:claseId`: `ClaseDeLaRuta` (DH-01 (a)), `MuroDeLaClase`, `DudasDeLaClase`, `RecursosDeLaClase` con `BloqueDeRecursos` (`key={bloque}`), `TrabajoDeLaClase`, y la sección «Sin tema» de Recursos y de Actividades (`key` constante);
- al cambio de `:tareaId`, `:alumnoId` o `:recursoId`: los marcos de la Forma C y el exterior del detalle;
- al cambio de `:usuarioId`: el marco de la ficha.

**Método:** `awk` sobre todos los ganchos exportados con `useRef` o `useState` de `features/clases/hooks.ts`, `features/tareas/hooks.ts` y `components/{foco,clase,seccion}/hooks.ts`, cruzado con los ganchos que llama cada componente de esa lista.

| Gancho | Qué guarda | ¿Lo usa un componente que sobrevive? | ¿Puede llevar algo de A a B? |
|---|---|---|---|
| `useAvisoDeRecargaFallida` (clases, `hooks.ts:1279`) | `fallosVistos`, el `errorUpdateCount` de la consulta que observaba | `BloqueDeRecursos`, `TrabajoDeLaClase` y «Sin tema» de Recursos | **Sí: T-03.** El contador es de otra consulta y "cambia" al pasar de clase |
| `useAvisoDeRecargaFallida` (tareas, `hooks.ts:267`) | `ultimoFalloAvisado`, un `WeakMap` por consulta, y `alSalirRef` | el exterior del detalle y los marcos | **No:** la marca va por consulta, y la limpieza cierra sobre los ids de su propio efecto |
| `useFocoAlCargarMas` (`components/foco/hooks.ts:97`) | `teniaElFoco`, `estabaMontado`, `idsPrevios`, `seccionDelBoton` | «Sin tema» (T-02), `MuroDeLaClase` y `DudasDeLaClase` | **Sí, en foco.** Con el foco en «Ver más» de A y B sin «Ver más», manda el foco a "la primera fila nueva", que es una fila de B. Es lo que O-14 prohíbe (comentario de `muro-view.tsx:83-86`). En «Sin tema» lo confirmó ATQ-CH6-18; en Avisos y Dudas falta la prueba (H-R2) |
| `useFocoAlPerderseElControl` (`components/foco/hooks.ts:23`) | `controlRef`, `ventanaConFoco` | los marcos | **No:** su clave lleva el id y recoloca el foco justamente al cambiar |
| `useFocoAlPasarAError` (clases, `:928`) | `eraError`, `huboDatos`, `clavePrevia` | Avisos, Dudas y el layout | **No:** guarda su clave (`claseId`) y empieza de cero. Es el precedente del remedio de T-03 |
| `useFilaEnFoco` (clases, `:869`) | la fila con el foco | las listas de la Forma B | **No:** cada lista la consume con su `clasePrevia` (O-14) |
| `useFocoAlTituloDeLaClase` (clases, `:289`) | la memoria del foco del título | el layout | **No:** su clave es `${claseId}:${soloLectura}` |
| `useAlPulsarLaSeccionActiva` (`components/seccion/hooks.ts:8`) | `llaveRef` (`location.key`) | las cuatro listas y las secciones | **No lleva nada de A a B.** Corre el manejador de B (pedir B si está en error) porque el salto trae otra `location.key`. Observación para 06b: con DH-03 (b), un salto de clase pediría B si está vieja |
| `useGeneracionDeSoloLectura` (`components/clase/hooks.ts:28`) | la generación | `TrabajoDeLaClase` y las vistas de tarea | **No hace daño:** solo sube al entrar en solo lectura, así que pasar a una clase archivada invalida lo de A, que es lo conservador |
| `useMontado` (`components/clase/hooks.ts:13`) | si el componente está montado | los ganchos de mutación de los formularios | **No:** el 400 de A con la vista viva en B lo cubre CH6-A14 (tema y los demás) |
| `useIndicadorDeSecciones`, `useTerminoDiferido`, `useTemasDelRecurso`, `useRenovarSiLaDudaYaNoEsta`, `useFocoAlQuitarUnaClase` | medida, término, etcétera | el indicador olvida la medida de otra `base`; los buscadores y el formulario de recurso viven bajo una `key` por clase o por recurso; las respuestas, bajo la fila de la duda; la lista de clases del admin no tiene id en la ruta | **No** |
| `useOrdenDeTemasEnVuelo` y `useOrdenarTemas` | por `mutationKey` con la clase (CHORE-04 §D-4 bis) | `TrabajoDeLaClase` | **No:** ya resuelto en CHORE-04 |

Resultado: dos ganchos llevan algo de A a B. `useAvisoDeRecargaFallida` de clases (T-03 y su hermano en «Sin tema») y `useFocoAlCargarMas` en las tres listas que sobreviven (T-02 en «Sin tema» y H-R2 en Avisos y Dudas). Nada más.

### Remedios
**T-03 (R-a, la recomendada): el gancho guarda la clave que protege**, como `useFocoAlPasarAError`.
- **Por qué no la `key`:** `TrabajoDeLaClase` y `BloqueDeRecursos` no pueden llevar `key` por la clase. Ahí vive el `clasePrevia` de O-14 (`recursos-view.tsx:57` y `:90`, y lo mismo en Actividades), y montarlos de nuevo mandaría el foco de una fila al título de la clase y no al `h2`. Es lo que DH-01 (a) quiso conservar.
- **Texto exacto, en `features/clases/hooks.ts:1279-1296`.** El parámetro nuevo es obligatorio, sin valor por defecto:
```ts
export const useAvisoDeRecargaFallida = (
  errorUpdateCount: number,
  hayDatos: boolean,
  texto: string,
  clave: string,
  idDelAviso?: string,
) => {
  const fallosVistos = useRef(errorUpdateCount)
  const clavePrevia = useRef(clave)
  useEffect(() => {
    // CHORE-06a (T-03): una vista que sobrevive al cambio de clase empieza de cero con la consulta de la
    // otra clase, sin repetir ni heredar su aviso (como useFocoAlPasarAError).
    if (clavePrevia.current !== clave) {
      clavePrevia.current = clave
      fallosVistos.current = errorUpdateCount
      return
    }
    if (fallosVistos.current === errorUpdateCount) return
    // (el resto, sin cambio)
  }, [errorUpdateCount, hayDatos, texto, idDelAviso, clave])
}
```
  El comentario de encima del gancho suma una frase: "`clave`: el id que protege; si cambia, empieza de cero".
- **Sus cinco llamadores, todos en "Se toca" de 06a,** pasan la clave antes de `idDelAviso`:
  - `categorias-view.tsx:42`: `claseId`;
  - `recursos-view.tsx:64` (`BloqueDeRecursos`): `claseId`;
  - `trabajo-view.tsx:109`: `claseId`;
  - `editar-recurso-view.tsx:92`: `recursoId`;
  - `components/seccion-de-recursos.tsx:65`: `claseId`.
- **Lista cerrada:** ninguna prueba llama al gancho directamente, y los únicos `vi.mock` de `features/clases/hooks` (los dos `inicio-sin-datos*`) no lo usan. No cambia ninguna prueba normal.
- **Autorización:** `features/clases/hooks.ts` está en "No se toca" de 06a fuera de las líneas de §D-3, y cambiar la firma de este gancho es PA-4. Lo decide el humano.
- **Si el humano no autoriza (R-b, dentro de "Se toca"):** en `trabajo-view.tsx` y en `recursos-view.tsx`, una función de componente propia del archivo llama al gancho y devuelve `null`. Se pinta con `key={claseId}` dentro de la vista y recibe los mismos cuatro argumentos de hoy. Así la memoria del aviso se monta de nuevo por clase sin tocar el gancho. Es menos robusta (cada vista nueva que sobreviva tendría que acordarse) y repite unas 8 líneas en dos archivos. La recomiendo solo como respaldo. Con R-b, «Sin tema» queda cubierta por la `key` de T-02.
- **Lo que no vale:** dejarlo para 06b. ATQ-CH6-19 está en rojo y 06a no cierra con un `*.ataque` en rojo.

**T-02: confirmo la `key` de la sección con la clase.**
- `recursos-view.tsx:138` y `trabajo-view.tsx:246`: `` key={`${claseId}:${seccion.clave}`} ``.
- Con un tema, el id ya es de una sola clase, así que el cambio no altera nada. Con «Sin tema», la sección se monta de nuevo al cambiar de clase: el control con el foco se desmonta y el `clasePrevia` del bloque o de la vista lo lleva al `h2`, como en el control «un tema» de ATQ-CH6-16 a 18.
- Coherencia con T-03: con esta `key`, el aviso de «Sin tema» (`seccion-de-recursos.tsx:65`) también empieza de cero por clase, y la clave de R-a lo refuerza sin estorbar. No se pisan.
- No toca `seccion-de-recursos.tsx` ni `seccion-de-tema.tsx` salvo el argumento de R-a.

**H-R2: Avisos y Dudas con el foco en «Ver más» al cambiar de clase.** Es el mismo mecanismo que ATQ-CH6-18, y no hay prueba todavía.
- **Rojo primero.** Si el caso sale verde, se documenta y no se aplica nada.
- **Si sale rojo,** el remedio va en la función que la vista le pasa al gancho, en `muro-view.tsx` y `dudas-view.tsx` ("Se toca"), sin tocar `components/foco`. El efecto del gancho (`muro-view.tsx:73`, `dudas-view.tsx:64`) corre antes que el de `clasePrevia` (`:79` y `:71`), así que en ese render `clasePrevia.current` sigue siendo la clase anterior:
```ts
const enfocarPublicacion = (id: string): boolean => {
  // CHORE-06a (ronda 2): tras un cambio de clase, «Ver más» de la anterior no lleva el foco a una
  // publicación de la nueva (O-14): sin fila, el gancho va al encabezado de la lista.
  if (clasePrevia.current !== claseId) return false
  …
```
  Lo mismo en `enfocarDuda` (`dudas-view.tsx:49`). En la misma clase, `clasePrevia.current === claseId` y nada cambia.

**O-05:** en la sección de la corrección 2 de `resumen-programador.md`, en "Redundancias declaradas", con este texto: "`pidiendoMasRef` de `entregas-view.tsx` (`handleVerMas`): para el doble clic es redundante con `fetchNextPage({ cancelRefetch: false })`, que une el segundo clic a la página en vuelo (MT10 del tester: ATQ-CH6-22 sigue en verde sin ella). Se conserva por la regla de `CLAUDE.md` (guarda síncrona en toda acción) y la vigila por forma `lib/guardas-de-doble-clic-estatico` (CH4-04). Ningún caso de comportamiento dice vigilarla." No hace falta tocar ninguna prueba.

### Medición
- **T-03 cuenta como 1 ronda extra por hermanos.** La corrección de T-01 pedía el inventario de hermanos por mecanismo, con refs, "también los estados vecinos del mismo mecanismo". `BloqueDeRecursos` y `TrabajoDeLaClase` llaman a un gancho con una ref (`fallosVistos`), y la tabla del programador los dio por "refs de foco". Mi verificación aceptó esa tabla con un grep que solo miró las refs del componente, no las de los ganchos que llama. La falla es compartida, y la anoto también contra la verificación del manager. Origen del plan: §D-1 dio por buenas las vistas de la Forma B ("conservan su foco") sin mirar sus ganchos.
- **T-02 no suma.** El programador la señaló en su corrección de T-01. Yo arbitré que se aplicaría solo con una prueba roja, y llegó en la ronda 2. Se atribuye al inventario del plan (la `key` constante es anterior a 06a), no al programador.
- **Cuenta de 06a:**
  - ronda 1: T-01, por inventario del plan;
  - ronda 2: T-02 (decidida, en espera de evidencia) y T-03 (1 ronda extra por hermanos).
  
  Total: 1 ronda extra por hermanos. El encargo va en carril normal, así que la regla de pasar al programador a `opus` (2 o más rondas, en el carril sensible) no se dispara. Que el orquestador lo registre.
- **La siguiente es la ronda 3, la última.** Por eso H-R2 entra ya como caso requerido y el inventario de arriba cubre todos los ganchos con estado.

### Para el humano
- **La autorización de T-03 (R-a):** tocar `features/clases/hooks.ts` solo en `useAvisoDeRecargaFallida`, para que sume el parámetro obligatorio `clave` (el id que protege; si cambia, empieza de cero sin avisar), con sus cinco llamadores. Hoy es "No se toca" fuera de §D-3 y está en PA-4. Es mi recomendación.
- **Si prefiere no tocar el gancho,** R-b, dentro de "Se toca", con el costo descrito.
- **Lo que no puede elegir:** dejarlo para después. Hay un `*.ataque` en rojo (ATQ-CH6-19) que impide cerrar 06a.
- **No hace falta parar a replantear el plan.** El inventario por ganchos de arriba es exhaustivo para las vistas que sobreviven. Si la ronda 3 encuentra otro hermano del mismo mecanismo, se escala.

### Para el programador (ronda de corrección 2 de 3)
**Puede tocar, y solo esto:**
- `features/clases/recursos-view.tsx`: la `key` de `:138` (T-02) y la clave del aviso en `:64` (R-a), o, con R-b, el componente del aviso.
- `features/clases/trabajo-view.tsx`: la `key` de `:246` y la clave en `:109`, o R-b.
- `features/clases/components/seccion-de-recursos.tsx:65`, `categorias-view.tsx:42` y `editar-recurso-view.tsx:92`: solo el argumento `clave` (R-a).
- `features/clases/hooks.ts`: solo `useAvisoDeRecargaFallida`, y solo con la autorización del humano.
- `features/clases/muro-view.tsx` y `dudas-view.tsx`: solo la línea de H-R2, y solo si su caso sale rojo.
- `app/estado-por-id-ch6.test.tsx` (casos nuevos) y `lib/estado-por-id-estatico-ch6.test.ts` (CH6-A30 (b)).
- Ningún `*.ataque`.

**Casos nuevos** (en `app/estado-por-id-ch6.test.tsx`, con rojo primero, el router real y la caché de `providers.tsx`):
- **CH6-A20 (T-02), 3 casos:** con el foco en una fila de «Sin tema» de A, en Recursos y en Actividades, el salto a B lleva el foco al `h2` de la lista. Con «Ver más» de «Sin tema» de A en vuelo y con el foco (Recursos), igual.
- **CH6-A21 (T-03), 2 casos:** en Recursos y en Actividades, la recarga de B falla y avisa una vez. Al saltar a A (sana, en caché) y volver a B, no sale otro aviso (`toast.error` en 1). Un fallo nuevo después en A avisa una vez (control de R8).
- **CH6-A22 (H-R2), 2 casos:** en Avisos y en Dudas, con el foco en «Ver más …» de A (con página siguiente) y el salto a B sin página siguiente, el foco va al `h2` de la lista (`document.activeElement`).
- **CH6-A30 (b):** suma dos `toContain`, armados por partes como en (c): `recursos-view.tsx` y `trabajo-view.tsx` con `` key={`${claseId}:${seccion.clave}`} ``.

**Mutaciones** (cada una con su copia y su restauración por copia):
- la `key` de la sección vuelve a `seccion.clave` en `recursos-view.tsx`, y aparte en `trabajo-view.tsx`: debe caer CH6-A20 de esa lista, ATQ-CH6-16 o 18 (o 17) con «Sin tema» y CH6-A30 (b);
- sin el bloque `if (clavePrevia.current !== clave) {…}` del gancho (o, con R-b, sin la `key` del componente del aviso): deben caer CH6-A21 y los 2 de ATQ-CH6-19;
- si se aplicó H-R2, sin la línea `if (clasePrevia.current !== claseId) return false`, en cada vista: debe caer su CH6-A22.

**Cifras esperadas:**
- `app/estado-por-id-ch6.test.tsx`: 74 + 7 = 81; las cuatro pruebas nuevas, 224 (81 + 82 + 56 + 5);
- suite de 06a: `Test Files 241 passed (241)` · `Tests 5372 passed (5372)` (5349 + los 16 del tester + 7);
- `frontend/` con 37 archivos (los 36 y `app/estado-por-id-ch6a-r2.ataque.test.tsx`).
- Si algo de esto no da, se detiene y lo dice.

**Paradas:**
- PA-2 si cae una vigilada de O-14 (`foco-02c-r3/r4/r5`, `heredados-02d-r1`, `ventana-02c-r2`, la regresión O-14 de CH6-A11 o los controles «un tema» de ATQ-CH6-16 a 18).
- PA-1 si cae una prueba normal.

**El resumen trae:**
- cada caso con su título exacto y la tabla de mutaciones;
- la redundancia de O-05;
- la tabla de hermanos de este arbitraje (los dos ganchos y sus sitios), con "aplica y se aplicó" o "verde: no aplica";
- los estados vecinos de la clave nueva: primera carga, recarga, fallo en la caché al llegar, cambio de clave, dos fallos seguidos, ida y vuelta A → B → A, y `StrictMode`.

### Puntos de ataque para la ronda 3
1. **`useAvisoDeRecargaFallida` con clave:** A → B → A con fallos en las dos; un fallo que llega justo en el render del salto; `StrictMode`; dos fallos seguidos en la misma clase; categorías y editar recurso (con su `key`) sin cambio de conducta; R8 ("volver a montar con el fallo ya ocurrido no lo repite").
2. **«Sin tema» montada de nuevo:**
   - la página de «Ver más» de A que llega estando en B;
   - el aviso de recarga de «Sin tema» y el del bloque, con el mismo `idDelAviso`, sin duplicarse;
   - mover un recurso o una actividad a «Sin tema» y desde ella (la `key` cambia solo con la clase, no con el contenido).
3. **Avisos y Dudas con «Ver más» al cambiar de clase:** con B con y sin página siguiente, con la página de A en vuelo, y que en la misma clase «Ver más» siga llevando el foco a la primera fila nueva.
4. **`useAlPulsarLaSeccionActiva` en un salto de clase:** que el manejador de B no haga nada con datos de A (observación para 06b: con DH-03 (b), pediría B si está vieja).
5. **Regresión:** los 45 de la ronda 1 y los 16 de la ronda 2 en verde.

## Verificación de la corrección de la ronda 2 — CHORE-06a (2026-11-12)
Manager. Contra `resumen-programador.md` (584 líneas, `7aa430db…`, comprobado), "## CHORE-06a — Corrección ronda 2 (T-02, T-03 y H-R2)" (línea 457). El humano eligió R-a y autorizó tocar `features/clases/hooks.ts` solo en `useAvisoDeRecargaFallida`. Con corriente; corrí una cosa a la vez, sin la suite completa.

**Veredicto: ACEPTADO, sin M-n.** T-02, T-03 y H-R2 quedan corregidos con el texto del arbitraje y nada más. Las cifras coinciden y mis tres mutaciones caen como las del programador. Su inventario de ganchos es correcto, y lo amplié a memoria de módulo, contextos y lecturas de la caché: no encontré otro candidato que lleve estado de A a B. Sí encontré uno que lleva un *evento* de A a B sin efecto visible (punto de ataque 4).

### Mis corridas (desde `frontend/`)
| Qué | Comando | Última línea (mía) | Resumen |
|---|---|---|---|
| lint | `npm run lint` | `> tsc -b`, salida 0 (sin errores ni avisos) | igual |
| build | `npm run build` | `✓ built in 875ms`, salida 0 | no lo corrió |
| suite de 06a | `npx vitest run src/features/clases src/features/tareas src/features/calificaciones src/app src/lib` | `Tests  5372 passed (5372)`, `Test Files  241 passed (241)`, `Duration  277.54s` | igual |
| conteo | `npx vitest list` de las cuatro pruebas nuevas, con `grep -a -c` | 81 + 82 + 56 + 5 = 224; CH6-A20 3, A21 2 y A22 2 | igual |

- **Vigiladas de O-14:** `foco-02c-r3`, `foco-02c-r4`, `foco-02c-r5`, `heredados-02d-r1` y `ventana-02c-r2` existen, están dentro de la suite y pasan.
- **`*.ataque`:** los de las rondas 1 y 2 siguen en `2d40aeea…` y `a7919e2d…`.
- **V-01:** 287 `*.ataque`. Contra la base cambian C-1, C-2 y C-11 y se suman los dos del tester.
- **Archivos:** 37 en `frontend/` (más los 4 de fuera que no se cuentan). `entregas-view.tsx` sigue en `05b23673…`.

### El diff de la ronda
- **`features/clases/hooks.ts`:** fuera de las líneas de §D-3, solo cambia `useAvisoDeRecargaFallida`. Son la frase del comentario, el parámetro `clave` antes de `idDelAviso`, la ref `clavePrevia`, el bloque del arbitraje al principio del efecto y `clave` en las dependencias (`git diff -U0`: ningún otro bloque). Es lo autorizado.
- **Los cinco llamadores** solo suman su clave: `claseId` en categorías, `BloqueDeRecursos`, Actividades y `SeccionDeRecursos`; `recursoId` en editar recurso.
- **T-02:** `` key={`${claseId}:${seccion.clave}`} `` en `recursos-view.tsx:139` y `trabajo-view.tsx:247`.
- **H-R2:** la línea `if (clasePrevia.current !== claseId) return false`, con su comentario, al principio de `enfocarPublicacion` y `enfocarDuda`. El programador hizo antes el rojo primero (salió rojo, como se esperaba).
- Ninguna otra línea de producción cambia. Los 17 archivos de producción que esta ronda no tocó siguen con su hash.

### Mutaciones (repetidas por mí)
Con copia previa y restauración por copia, con `cmp`. Al final, `sha256sum -c` de los tres archivos dio OK.

| Id | Se quita | Comando (`npx vitest run …`) | Cae | ¿Coincide? |
|---|---|---|---|---|
| MGR8b | el bloque `if (clavePrevia.current !== clave) {…}` del gancho (`hooks.ts:1291-1295`, acotado a esas líneas) | `src/app/estado-por-id-ch6.test.tsx src/app/estado-por-id-ch6a-r2.ataque.test.tsx -t "CH6-A21\|ATQ-CH6-19"` | los 2 de CH6-A21 y los 2 de ATQ-CH6-19. `Tests  4 failed \| 93 skipped (97)` | sí (R2c) |
| MGR9 | la `key` de la sección vuelve a `seccion.clave` en `trabajo-view.tsx` | `… src/lib/estado-por-id-estatico-ch6.test.ts -t "CH6-A20\|ATQ-CH6-17\|CH6-A30"` | CH6-A20 (Actividades), ATQ-CH6-17 con «Sin tema» y CH6-A30 (b); los controles siguen verdes. `Tests  3 failed \| 7 passed \| 92 skipped (102)` | sí (R2b) |
| MGR10 | `if (clasePrevia.current !== claseId) return false` de `enfocarPublicacion` | `src/app/estado-por-id-ch6.test.tsx -t "CH6-A22"` | CH6-A22 (Avisos); Dudas sigue verde. `Tests  1 failed \| 1 passed \| 79 skipped (81)` | sí (R2d) |

Nota sobre mi primer intento de MGR8: el `sed` sin acotar borró también el bloque igual de `useFocoAlPasarAError` (`hooks.ts:938`). Lo descarté (`scratchpad/mgr/mut-MGR8-descartada.*`), restauré el archivo y lo repetí acotado a las líneas del gancho (MGR8b). El archivo terminó intacto.

### El inventario de ganchos y memorias
- **`useFocoAlCerrarElBorrado` (`hooks.ts:1000`):** el programador tiene razón. Guarda `devolverA` y lo usa solo `clases-admin-view.tsx:82`, en `/admin/clases` (el `index` de `clases`, `app/router.tsx:174-176`), sin id en la ruta. No lleva nada de A a B. Se me pasó en el arbitraje.
- **`useRenovarSiLaDudaYaNoEsta`:** tiene la forma de T-03 (`fallosVistos`), pero lo llama `respuestas-de-duda.tsx:148`, dentro de `ElementoDeDuda key={duda.id}` (`dudas-view.tsx:134-135`). La duda es de una sola clase, así que la fila se monta de nuevo. No aplica.
- **Lo que amplié:**
  - **Memoria de módulo** (`grep` de `let`, `new Map`, `new WeakMap` y `new Set` a nivel de módulo en `features`, `components`, `lib` y `services`):
    - `ultimoFalloAvisado` y `tareaPerdidaAvisada` van por consulta;
    - `contadorDeLlaves` (`tareas/lib.ts:170`) solo da llaves únicas a las filas de la rúbrica;
    - `tablaCrc` (`lib/xlsx.ts`) es una constante calculada;
    - `refrescoEnVuelo`, `restauracion` y `tokenDeAcceso` son de la sesión, no de un id.
    
    Ninguno lleva nada de A a B.
  - **Contextos:** solo `ContextoDeSoloLectura`, que provee `ClaseLayout` con el valor de la clase actual. No aplica.
  - **Lecturas de la caché:** todas van con el id en la clave (`useGestionEnVuelo`, `useRegeneracionEnVuelo` y `useOrdenDeTemasEnVuelo` por `mutationKey` con la clase; las secciones, las dudas, sus respuestas y las categorías por `claseId`; tareas por `claseTarea`). Con una excepción, que no es una lectura sino una suscripción:
    - `useDetalleViejoAnteClaseArchivada` (`hooks.ts:263-280`, en `clase-layout.tsx`, "No se toca") escucha *todos* los errores de consultas y mutaciones de la caché y, ante un `409 CLASE_ARCHIVADA`, marca viejo el detalle de la clase *actual*.
    - Si una petición de A responde ese `409` estando en B, invalida el detalle de B: una lectura de más de B. Como B no está archivada, nada visible cambia.
    - No es estado que pase de A a B ni un defecto de 06a, porque la conducta es anterior. Va como punto de ataque 4, solo para confirmar que no tiene efecto visible. Si lo tuviera, su remedio estaría fuera de "Se toca" (`clase-layout.tsx`) y se arbitraría.
- **Conclusión:** solo dos ganchos llevaban estado de A a B (`useAvisoDeRecargaFallida` de clases y `useFocoAlCargarMas` en las listas que sobreviven), y los dos quedan corregidos y vigilados. No veo otro candidato.

### Arbitrajes de los estados vecinos sin caso propio
1. **Un fallo que llega en el render del salto no se avisa. Lo acepto como conducta, no como defecto del remedio.**
   - Para que el contador de B cambie en el mismo render que la clave, el fallo de B tiene que haber ocurrido antes de llegar. Por ejemplo, una recarga de B en vuelo al salir de B que falla estando en A.
   - Eso es "montar la vista con el fallo ya ocurrido", y R8 (CLASES-03d) dice que no se repite.
   - Es además idéntico a lo que hace cualquier vista con `key` (categorías, la edición de recurso): al montarse, la ref nace con el contador del momento.
   - Un fallo que llega después del salto, ya con la clave nueva, avisa (lo prueba el tramo final de CH6-A21).
   - No es caso requerido; va como punto de ataque 1, para confirmar que es igual a una vista con `key`.
2. **Dos fallos seguidos de la misma consulta:** la conducta es la de antes (cada fallo cambia el contador y avisa; con `idDelAviso`, el segundo reemplaza al primero). La clave no interviene. No es caso requerido.
3. **`StrictMode`:** en el segundo pase del efecto, la clave y el contador ya están al día y no duplica. No es caso requerido; va como punto de ataque 1.

### Medición
Esta ronda de corrección no agrega rondas del tester. La cuenta de 06a sigue en 1 ronda extra por hermanos (T-03). Si la ronda 3 encuentra otro hermano del mismo mecanismo, sería la segunda y, por ser la última ronda, se escala al humano.

### Puntos de ataque finales para la ronda 3
Son los cinco del arbitraje de la ronda 2, ajustados:
1. **`useAvisoDeRecargaFallida` con clave:**
   - A → B → A con fallos en las dos;
   - un fallo ya ocurrido al llegar, que debe comportarse igual que en categorías, con `key` (no avisa);
   - un fallo que llega después del salto (avisa una vez);
   - dos fallos seguidos;
   - `StrictMode`;
   - editar recurso al saltar de R1 a R2 (clave `recursoId`).
2. **«Sin tema» montada de nuevo:**
   - la página de «Ver más» de A que llega estando en B (en Actividades, que CH6-A20 no cubre con «Ver más»);
   - el aviso de «Sin tema» y el del bloque, con el mismo `idDelAviso`, sin duplicarse;
   - mover un recurso o una actividad a «Sin tema» y desde ella, en la misma clase: que la `key` no monte de nuevo la sección ni mueva el foco.
3. **Avisos y Dudas con «Ver más» y el foco al saltar:**
   - B con página siguiente (el foco se queda en «Ver más» de B, sin moverse a una fila);
   - la página de A en vuelo;
   - en la misma clase, la última página sigue llevando el foco a la primera fila nueva (`enfocarPublicacion` y `enfocarDuda` sin cambio de conducta).
4. **`useDetalleViejoAnteClaseArchivada`:** una escritura de A que responde `409 CLASE_ARCHIVADA` estando en B. Que B no pase a solo lectura, no salga ningún aviso ni se mueva el foco, y que sea a lo más una lectura de más del detalle de B.
5. **`useAlPulsarLaSeccionActiva` en un salto de clase:** el manejador de B no usa nada de A. Es observación para 06b.
6. **Regresión:** los 45 casos de la ronda 1 y los 16 de la ronda 2.

## Revisión final — CHORE-06a (2026-11-12)
Manager, modo final. Leí:
- `reporte-tester.md` (402 líneas, `6621651d…`, comprobado), "## Ronda 3" (RESISTE);
- `aprobacion.md` (`4d5be03b…`), las entradas desde la ronda 0;
- `app/estado-por-id-ch6a-r3.ataque.test.tsx` (`c5008e28…`, comprobado);
- el plan sin cambios (`c5fe10fc…`).

Equipo con corriente (`BatteryStatus` 2). Nadie más corría suites. `HEAD` en `47c3339`.

**Veredicto: APROBADO CON OBSERVACIONES.** No hay problemas que bloqueen. Las observaciones son de documentación y de proceso:
- lo que el orquestador escribe en `docs/ESTADO.md` y `DESIGN.md` al cerrar;
- la Enmienda 3 corta del plan antes de arrancar 06b.

### Verificación propia (desde `frontend/`, una a la vez)
| Qué | Comando | Última línea |
|---|---|---|
| lint | `npm run lint` | `> tsc -b`, salida 0 (ESLint y Prettier sin errores ni avisos) |
| build | `npm run build` | `✓ built in 783ms`, salida 0 |
| suite completa del frontend | `npm run test` | `Tests  7928 passed (7928)`, con `Test Files  338 passed (338)` y `Duration  363.20s` |

- **La suite de 06a no la corrí aparte;** está toda dentro de la completa, en verde. Su cifra cuadra con la del tester: `Tests 5389 passed (5389)` y `Test Files 242 passed (242)` son mis 5372 y 241 de la ronda 2 más los 17 casos de `estado-por-id-ch6a-r3` en un archivo nuevo.
- **Backend y `shared/` no se tocaron** (`git diff --name-only 47c3339 -- backend shared infra` vacío), así que no corre la suite del backend y PA-07 no aplica.
- **Las 4 pruebas nuevas tienen 224 casos** (81 + 82 + 56 + 5; `npx vitest list` de la ronda 2, sin cambios desde entonces).

### "No se toca" contra `47c3339`
- **38 archivos en `frontend/`** (`git status --porcelain frontend | wc -l`):
  - 25 de producción de §D-0, más `features/tareas/entregas-view.tsx` (autorizado: Forma C, T-01);
  - las 4 pruebas nuevas;
  - 2 de la lista cerrada: `guardas-ch4.test.tsx` y `clase-archivada-01d2-tareas.test.tsx` (ADM-1D221, autorizado en PA-1);
  - los 3 `*.ataque` de la ronda 0 (C-1, C-2 y C-11);
  - los 3 `*.ataque` nuevos del tester (rondas 1 a 3).
- **Fuera de `frontend/`:** solo `docs/ESTADO.md`, `docs/trabajo/DOCS-05-envivo-bigbluebutton/aprobacion.md` y la carpeta del encargo. `git diff --name-only 47c3339 -- backend shared infra` está vacío. `docs/trabajo/DEPLOY-investigacion-vps.md` ya estaba sin confirmar antes del encargo. El índice está vacío (`git diff --cached` da 0) y `HEAD` sigue en `47c3339`.
- **`features/clases/hooks.ts`:** fuera de las líneas de §D-3, solo cambia `useAvisoDeRecargaFallida` (lo autorizó el humano en T-03, R-a). Lo verifiqué con `git diff -U0` en la ronda 2 y el archivo no cambió desde entonces.
- **V-01:** 288 `*.ataque`, idéntico a `scratchpad/v01-ch6a-r3.txt` (`6707b909…`, comprobado). Contra la base (`686daf88…`) cambian C-1 (`b29a7828…`), C-2 (`236cba62…`) y C-11 (`d938aa80…`), y se suman `estado-por-id-ch6a-r1` (`2d40aeea…`), `-r2` (`a7919e2d…`) y `-r3` (`c5008e28…`).
- **V-06:** en cada archivo de producción tocado, el número de `enEspera=` es el mismo que en `47c3339`.
- **Caracteres invisibles:** ninguno en los 38 archivos. Busqué `U+200B` a `U+200F`, `U+202A` a `U+202E`, `U+2060` a `U+2064`, `U+FEFF` y `U+00A0` con `grep -P` en UTF-8, después de comprobar que el patrón detecta un `U+200B` de control.

### Plan, arbitrajes y reglas
- **Pasos 1 a 11 de 06a: cumplidos.**
  - ronda 0 (C-1, C-2 y C-11);
  - rojo primero (143 reales);
  - Formas A, B y C;
  - §D-3, con los sitios de M-02;
  - la lista cerrada;
  - CH6-A30;
  - 21 mutaciones;
  - verificación;
  - resumen, devuelto una vez por M-01 (texto) y aceptado.
- **Los arbitrajes, aplicados con su texto:**
  - C-11;
  - C-12 (no hizo falta: CAL-T-108 siguió en verde);
  - PA-1, opción (a) del humano;
  - T-01, la Forma C en las entregas;
  - T-02, la `key` de la sección con la clase;
  - T-03, R-a, decidido por el humano;
  - H-R2.
  
  Ninguna desviación del plan quedó sin arbitraje.
- **Definición de terminado (`AGENTS.md`):**
  - cumple las filas del inventario de 06a (no hay RF nuevo);
  - capas y middleware, sin cambio (solo frontend);
  - `lint`, `build` y `test` en verde (abajo);
  - pruebas de autorización: no aplica, no hay endpoint;
  - migración, `infra/` y `.env.example`: no aplican;
  - documentos: pendientes de A-1 a A-4 al cierre (abajo).
- **Reglas que no se rompen:** ningún cambio en estado de pago, cola, archivos, UTC, trabajos diferidos, secretos, proveedores, `notifier` ni autenticación. El frontend no gana un `fetch` ni lee `localStorage`.
- **`CLAUDE.md`:**
  - módulos: los tipos de Props van en su archivo y no hay tipos ni textos sueltos;
  - retornos tempranos;
  - errores manejados dentro de TanStack Query o con `try/catch`;
  - sin `?? []`;
  - los avisos callan ante `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` (la regla que A-1 escribe).
  
  Detalle menor, sin efecto: `EdicionDeLaTareaProps` repite `EditarTareaDeLaClaseProps`.
- **La regla de las pruebas de una guarda (`AGENTS.md`, decisión del 2026-11-11).** Cada remedio tiene una mutación real que hizo caer su caso:
  - el programador: M01 a M12d, M06b, M07, la de T-01, y R2a a R2e;
  - yo: MGR1 a MGR10 y MGR8b;
  - el tester: MT1 a MT15.
  
  Las dos excepciones están declaradas con su mecanismo: O-04 (la parte de `tareaId` de la `key` compuesta la vigilan CH6-A06 y CH6-A30 (c)) y O-05 (`pidiendoMasRef` de las entregas es redundante para el doble clic con `fetchNextPage({ cancelRefetch: false })`, y se conserva por `CLAUDE.md` y por la regla estática). O-09 (en editar recurso, la `key` ya protege, y la clave del gancho es una segunda red) no es una guarda sin vigilar: en Recursos y en Actividades, MT11 y MGR8b la hacen caer.
- **Lista de diseño:** sin tokens, componentes ni textos nuevos. El estado no se comunica solo con color, porque nada visual cambia. El único patrón nuevo es de conducta ("lo abierto es de su clase", con el foco que llega al título, a la raíz o al `h2`): va a `DESIGN.md` §7.14 (A-2) en este encargo. Lo pido ya al cerrar 06a (abajo), porque es de 06a.

### Observaciones del tester en la ronda 3 y ATQ-CH6-35
- **O-07, aceptada y va a `docs/ESTADO.md` §3.** Un `409 CLASE_ARCHIVADA` de una escritura de A que llega estando en B hace que `useDetalleViejoAnteClaseArchivada` (`clase-layout.tsx`) marque viejo el detalle de B: como mucho una lectura de más, sin efecto visible (ATQ-CH6-34). La conducta es anterior a 06a y `clase-layout.tsx` está en "No se toca". Destino: el `chore` de accesibilidad del marco (después de DEPLOY), junto con la unificación de los ganchos de foco, o el próximo encargo que toque `clase-layout.tsx`.
- **O-08, aceptada; es para 06b** (ver "Lo que cambia para 06b"). No va a §3.
- **O-09, aceptada.** En editar recurso, la clave del gancho es una segunda red detrás de `key={recursoId}`. No va a §3.
- **ATQ-CH6-35, aceptado tal cual.** La exportación del gradebook de A en vuelo se aborta al saltar a B porque `GradebookDeLaClase` lleva `key={claseId}` desde 06a: sin aviso, y el botón de B queda libre. Ningún inventario la tenía, y el tester la cubrió con su mutación (MT14). No es hallazgo ni pendiente.

### Lo que cambia para 06b, por lo aprendido en 06a
- **El inventario de hermanos se hace por ganchos y memoria, no solo por `useState`.** En 06a, T-01 (refs del componente) y T-03 (una ref dentro de un gancho) se escaparon de un inventario que buscó `useState`. El de 06b debe recorrer, para cada vista que toca:
  - las refs del componente y las de cada gancho que llama;
  - la memoria de módulo (`WeakMap`, `let`);
  - los contextos;
  - las lecturas y suscripciones de la caché con una clave que no lleve el id.
  
  Es la tabla de "Arbitraje de la ronda 2" y de "Verificación de la corrección de la ronda 2" de esta revisión.
- **06b toca las mismas vistas que sobreviven al cambio de clase:** `muro-view`, `dudas-view`, `recursos-view`, `trabajo-view`, `seccion-de-recursos`, `seccion-de-tema` y `hooks.ts`. Cada gancho nuevo de §D-4 y §D-5 (`useRecargarAlPulsarLaSeccion`, `useMarcarViejaSiQuedoEnError`, `useRenovarSiLaPublicacionYaNoEsta`, `conservaLaListaTrasLaPagina`) que guarde algo en una ref debe guardar también la clave que protege, como `useFocoAlPasarAError` y, desde 06a, `useAvisoDeRecargaFallida`. Y su caso debe incluir el salto de clase con el historial.
- **O-08: `useAlPulsarLaSeccionActiva` se dispara en un salto de clase,** porque llega otra `location.key`. Con DH-03 (b), un salto del historial a otra clase pediría B si está vieja o en error. Eso no lleva nada de A, pero sí es una petición que el plan cuenta como "pulsar la sección" (S-06 habla de otra entrada "de la misma ruta"). 06b tiene que decidir si un salto de clase cuenta como pulsar. Mi recomendación: sí, porque la promesa de las frases se cumple igual y no pide de más (solo vieja o en error). Que lo fije un caso: el salto entre clases con B sana y fresca no pide nada.
- **C-13 (ya arbitrada):** el tester la aplica en la ronda 0 de 06b, junto con C-3 a C-9.
- **Lo que 06a cambió en la base de 06b:**
  - `useAvisoDeRecargaFallida` de clases tiene una firma nueva (`clave` antes de `idDelAviso`);
  - las secciones llevan `` `${claseId}:${seccion.clave}` ``;
  - `enfocarPublicacion` y `enfocarDuda` empiezan con la línea de H-R2.
  
  La lista cerrada y §D-R0 de 06b no los nombran. Las pruebas de 06b que monten Recursos y Actividades con un salto de clase deben esperar esa conducta.
- **¿Hace falta una enmienda antes de arrancar 06b?** Sí, una enmienda corta (Enmienda 3) del arquitecto, sin decisiones nuevas para el humano salvo O-08:
  1. C-13 en §D-R0 y el conteo (33, hasta 35);
  2. el criterio del inventario por ganchos y memoria en "Hermanos";
  3. la regla de la clave para los ganchos nuevos con ref, con su caso de salto de clase;
  4. O-08, como decisión con recomendación;
  5. un `grep` de la lista cerrada de 06b contra la base nueva (el commit de 06a), porque cambió la firma de `useAvisoDeRecargaFallida` y las `key` de las secciones.
  
  Basta que la verifique el manager. El humano solo decide O-08.

### El cambio visible de 06a, para el resumen de cierre
- **PA-1, aprobado por el humano:** si guardas una tarea (nueva o editada) y te vas a otra sección antes de que el servidor conteste, la app ya no te regresa a la tarea: te quedas donde fuiste y ves el aviso de que se guardó.
- **Lo abierto es de su clase:** si saltas con «Atrás» o «Adelante» a otra clase, tarea, alumno o recurso, ya no aparece abierta la confirmación, el formulario o lo escrito del anterior, ni se envía nada al otro.
- **El foco al saltar de clase:**
  - si estaba en un formulario, en Personas o en Calificaciones, va al nombre de la clase;
  - al saltar de tarea, alumno o recurso, va a la vista;
  - en Avisos, Dudas, Actividades y Recursos, una fila o «Ver más» con el foco lo lleva al encabezado de la lista (antes podía caer en una fila de la otra clase).
- **Avisos que ya no salen:**
  - con la sesión vencida o el acceso restringido, ya no sale un aviso de error mientras la app te manda al inicio de sesión o a la pantalla que corresponde;
  - el aviso "No pudimos actualizar…" de una clase ya no se repite al pasar a otra.
- **Las entregas de una tarea:** «Ver más alumnos» de otra tarea ya no se queda sin responder mientras carga la página de la anterior.

### Para el orquestador: `docs/ESTADO.md`, `DESIGN.md` y `CLAUDE.md` al cerrar 06a
Lo escribe el orquestador. Yo lo verifico en una pasada corta antes del commit.

**Sección 2 (en curso), la entrada de CHORE-06:**
- 06a cerrada el 2026-11-12, con el commit que se anote después.
- 38 archivos en `frontend/`.
- 4 rondas del tester: r0 y r1 a r3; la r3 RESISTE.
- Hallazgos T-01 a T-03 corregidos en 2 rondas de corrección.
- Decisiones del humano de hoy: PA-1 (a), la autorización de `entregas-view.tsx` y T-03 R-a.
- 06b arranca después del commit de 06a, con la Enmienda 3 del plan ("Lo que cambia para 06b").

**Sección 3, filas que se cierran con 06a** (ubicadas por su inicio; A-3 del plan, con lo de 06a):
- "CHORE-04 (M-01 de la revisión de su plan), el aviso de más mientras `apiClient` redirige…" → hecho en CHORE-06a (además, `features/tareas` y los sitios de M-02).
- "**CHORE-04, H-3 (S-07 de su plan), con O-r1-1 (prioritario) y O-E3-1.**…" → hecho en CHORE-06a.
- "ADMIN-01d1 (decisión 2 de su implementación): 12 entradas…" → hecho en CHORE-06a.
- "O-r1c-2 de CALIFICACIONES-01c…" → hecho en CHORE-06a (la `key` compuesta por tarea y alumno).
- "`key={claseId}` de CALIFICACIONES-01d…" → hecho en CHORE-06a (`GradebookView` y `MisCalificacionesView` llevan su `key`).
- Las demás filas de A-3 (H-2, O-03, el hermano de T-02 de CLASES-03e, N-52, N-54, la barra y «Ver más clases») se cierran con 06b.

**Sección 3, filas nuevas o que cambian:**
1. **Los "sin caso" de CH6-A14 (nueva):** "CHORE-06a: sin caso de 'campo pintado solo en otro modo' en la tarea nueva y la edición de tarea, ni de 'rechazo del servidor seguido de uno local' en la tarea nueva, la edición de tarea y el panel de calificación. La conducta no cambió en 06a (§D-2); tabla en `resumen-programador.md`, 'Corrección del resumen (M-01)'." Destino: el próximo encargo que toque esos formularios.
2. **La descarga de `components/adjuntos` (nueva; la de A-4 del plan, con su texto):** destino ENVIVO o el `chore` de accesibilidad del marco, lo que llegue antes.
3. **O-01 (nueva):** "CHORE-06a: la página siguiente de «Ver más alumnos» de una tarea que falla después de saltar a otra tarea no se avisa nunca (conducta de vista desmontada). Al volver, la consulta queda en error con sus datos y «Ver más alumnos» se puede repetir." Destino: 06b (§D-5), que decide qué ve la persona ante el fallo de la página siguiente. Si 06b no lo cambia, se cierra como decisión tomada.
4. **O-07 (nueva):** `useDetalleViejoAnteClaseArchivada` marca viejo el detalle de la clase actual ante un `409 CLASE_ARCHIVADA` de otra (una lectura de más, sin efecto visible; ATQ-CH6-34). Destino: el `chore` de accesibilidad del marco o el próximo encargo que toque `clase-layout.tsx`.
5. **O-08:** no lleva fila; va a la Enmienda 3 de 06b.
6. **A-4 del plan** (cambios de destino a los dos encargos de §2b), como dice el plan. Ya se puede aplicar, porque no depende de 06b.

**Sección 4 (decisiones del humano de hoy en CHORE-06a,** registradas en `aprobacion.md`):
- **PA-1 (a):** un guardado de tarea que llega con la vista desmontada avisa y no navega. Es la regla de la familia: crear, editar y borrar tarea, crear y editar clase, editar recurso y duplicar.
- **La autorización de `entregas-view.tsx`,** solo para la Forma C.
- **T-03, R-a:** `useAvisoDeRecargaFallida` de clases guarda la clave que protege. Es la regla para todo gancho con memoria en una vista que sobrevive al cambio de un id.

**Sección 6 (agentes):** la medición de 06a, abajo.

**`docs/DESIGN.md` §7.14 (A-2), ya en 06a,** con el texto del plan más dos frases:
- "Tampoco pasa a la nueva un aviso de la anterior (por ejemplo, el de una recarga que falló), y en Avisos, Dudas, Actividades y Recursos el foco que estaba en «Ver más» va también al encabezado."
- "Si la persona se fue de la vista antes de que una acción termine, al terminar solo sale el aviso: la app no la regresa a la vista (CHORE-06a)."

Con la marca "propuesta (CHORE-06a)".

**`CLAUDE.md` (A-1), al cerrar 06b como dice el plan,** con dos ajustes a la viñeta "Lo abierto es del id de la ruta":
- después de "…en el contenido debajo de ella (como `FichaDeLaCuenta`)", agregar: "Si la vista se conserva a propósito al cambiar de clase (las listas de Avisos, Dudas, Actividades y Recursos, por su foco), cada gancho con memoria que use guarda la clave que protege (`useFocoAlPasarAError`, `useAvisoDeRecargaFallida`) y cada subcomponente con una `key` que se repite entre clases (la sección «Sin tema») la lleva con la clase";
- y cambiar "en los render props de `ConClaseDeLaRuta`" por "en los render props de `ConClaseDeLaRuta`, en las cuatro listas y en las vistas de tarea, entrega y recurso".

### La medición de 06a
| Concepto | Valor |
|---|---|
| Rondas del tester | r0 (C-1, C-2 y C-11; no es de ataque) + r1 ROTO (T-01) + r2 ROTO (T-02 y T-03) + r3 RESISTE: 3 rondas de ataque, 2 extra |
| Rondas extra por hermanos o estados vecinos | **1** (T-03, de falla compartida: el inventario del programador en la corrección de T-01 y mi verificación). T-01 y T-02 se atribuyen al inventario del plan. Umbral (2 o más): no |
| Resúmenes devueltos | 1 de 4 (la implementación, por M-01, solo de texto). La corrección de M-01 y las correcciones de las rondas 1 y 2 se aceptaron a la primera |
| Paradas | 1 (PA-1, ADM-1D221; bien detenida) |
| Decisiones llevadas al humano | 3 (PA-1, la autorización de `entregas-view.tsx` y T-03 R-a) |
| Enmiendas del plan durante la implementación | 0 (todo por arbitraje: C-11, C-12, PA-1, T-01, T-02, T-03 y H-R2) |
| Hallazgos que vinieron del inventario del plan | 4 de 5 cambios fuera del plan (C-11, PA-1, T-01, T-02); T-03 también tiene origen en el plan (§D-1 no miró los ganchos de la Forma B) |

**Incidencias de proceso:**
1. Mi primer intento de MGR8 (ronda 2) borró de más con un `sed` sin acotar. Lo descarté, restauré y lo repetí acotado; quedó declarado.
2. En esta revisión corrí dos `git add -n` a la vez y uno chocó con el `index.lock` del otro. Sin daño: el lock no quedó y la comparación se repitió en serie.
3. Ningún agente corrió dos suites a la vez ni abrió un navegador.

**Lecciones para 06b:**
1. **El inventario de hermanos se hace por mecanismo, con refs del componente y de sus ganchos, memoria de módulo, contextos y caché, no por `useState`.** Las tres rondas con hallazgo vinieron de memorias fuera de `useState`.
2. **Una vista que se conserva a propósito al cambiar de id** (para no perder su foco) **es el lugar de riesgo.** Ahí todo gancho con memoria necesita su clave, y toda `key` de un subcomponente debe ser única entre ids.
3. **Al arbitrar un punto de ataque, conviene dejar la salida decidida** (como «Sin tema» y H-R2): el programador lo corrigió en la misma ronda, sin otra vuelta.

### El conjunto del commit
- **Las rutas para `git add`:** `frontend`, `docs/ESTADO.md`, `docs/trabajo/CHORE-06-foco-y-navegacion` y `docs/trabajo/DOCS-05-envivo-bigbluebutton/aprobacion.md`.
- **El cotejo:**
  - `git add -n` con esas rutas da 45 entradas: los 38 de `frontend/`, los 5 archivos de la carpeta del encargo, `docs/ESTADO.md` y el `aprobacion.md` de DOCS-05;
  - `git add -n -A` da 46;
  - la única diferencia es `docs/trabajo/DEPLOY-investigacion-vps.md`, que queda fuera, como debe.
- Después de que el orquestador escriba `ESTADO.md` y `DESIGN.md`, el conjunto suma `docs/DESIGN.md` (si A-2 va en 06a). Lo vuelvo a cotejar en la pasada corta.

### Documentos a actualizar
Los de "Para el orquestador", arriba:
- `docs/ESTADO.md`: secciones 2, 3, 4 y 6;
- `docs/DESIGN.md` §7.14 (A-2), ya en 06a;
- `CLAUDE.md` (A-1), al cerrar 06b, con los dos ajustes.

No cambia ningún comando ni decisión de `ARCHITECTURE-ESSENTIALS.md`.

### Para el humano
Nada que decidir para cerrar 06a. Antes de 06b, solo O-08: si un salto del historial a otra clase cuenta como "pulsar la sección" (mi recomendación es que sí, porque solo vuelve a pedir lo que está viejo o en error). Lo presenta la Enmienda 3.

### Resumen para el humano (máximo 15 líneas)
1. CHORE-06a está lista para el commit. lint y build en verde, y la suite completa del frontend también: 7928 de 7928 pruebas, 338 archivos.
2. Qué cambia para la persona: al saltar con «Atrás» o «Adelante» a otra clase, tarea, alumno o recurso, ya no aparece abierto ni se envía nada de lo anterior. Antes podía quitar a un maestro o calificar en el lugar equivocado.
3. El foco va al nombre de la clase, a la vista o al encabezado de la lista, nunca a una fila de la otra clase.
4. Ya no salen avisos de error mientras la app te manda al inicio de sesión. El aviso "No pudimos actualizar…" de una clase ya no se repite en otra.
5. Lo que aprobaste hoy: si guardas una tarea y te vas antes de la respuesta, ya no te regresa a la tarea; ves el aviso de que se guardó.
6. También autorizaste tocar las entregas de una tarea y el aviso de recarga; los dos quedaron corregidos y probados.
7. El tester hizo 3 rondas. Halló 3 problemas (uno de las entregas y dos de Recursos y Actividades), todos corregidos; la última ronda resistió.
8. 38 archivos, todos del frontend. Sin backend ni base de datos.
9. Una ronda extra salió de un caso que nadie había buscado (la memoria dentro de un gancho). Para 06b, ese inventario ya se hace completo.
10. Antes de 06b: una enmienda corta del plan y una sola decisión tuya (O-08), si saltar a otra clase cuenta como "pulsar la sección".
11. Al cerrar, el orquestador anota en `docs/ESTADO.md` los pendientes nuevos (casos que faltan en algunos formularios, la descarga de adjuntos y dos observaciones menores) y documenta el patrón en `DESIGN.md`.
12. La comprobación en el navegador sigue prevista al cerrar 06b (unos 8 minutos).

## Verificación de los documentos del cierre — CHORE-06a (2026-11-12)
Manager. Solo lectura, sin suites. Revisé `docs/DESIGN.md` (`99063281…`) y `docs/ESTADO.md` (`b6a6dc0f…`). `ESTADO.md` lo comparé con `git diff --no-index` contra la copia `scratchpad/ESTADO-antes-cierre-06a.md` (`9cd437d6…`, comprobado): 18 bloques, 44 inserciones y 18 borrados. `frontend/` sigue en 38 archivos y el índice está vacío.

**Veredicto: APROBADO, sin correcciones obligatorias.** Los dos documentos dicen lo que pasó, cumplen mi lista "Para el orquestador" y A-3 y A-4 del plan en lo que toca a 06a, no contradicen la viñeta "Dos encargos nuevos que salen de CHORE-06" de 2b (que no cambió) y conservan el formato.

### `docs/DESIGN.md` §7.14
- Hay 2 líneas nuevas (el párrafo y una línea en blanco), al final de §7.14 y antes de "### 7.15". No cambia nada más.
- El texto es el de A-2 del plan, palabra por palabra, más mis dos frases exactas: "Tampoco pasa a la nueva un aviso de la anterior…" y "Si la persona se fue de la vista antes de que una acción termine…".
- Lleva la marca "(CHORE-06a, propuesta)".

### `docs/ESTADO.md`
- **Lo que afirma es cierto.** Contrasté cada dato con `revision.md`, `reporte-tester.md` y `aprobacion.md`:
  - **Archivos:** 38 en `frontend/` (26 de producción, 4 pruebas nuevas, 2 de la lista cerrada y 3 + 3 `*.ataque`).
  - **Pruebas:** la suite completa con 338 archivos y 7928 casos; 224 casos del programador y 45, 16 y 17 del tester; 288 `*.ataque` (desde 285).
  - **Rondas:** r0, r1 y r2 ROTO, r3 RESISTE; dos rondas de corrección.
  - **Decisiones:** las nueve DH del plan y las tres del humano durante la implementación.
  - **Cambios visibles** (los cinco de mi lista) y **lo que sigue en 06b** (Enmienda 3 con C-13 y el conteo 33 a 35, y O-08 para el humano).
- **Cumple A-3 (solo 06a).** Las cinco filas que cierra 06a llevan "Hecho en CHORE-06a (2026-11-12)" con lo que se hizo y su caso:
  - el aviso de más de CHORE-04 (M-01), con lo de M-02 y la descarga fuera;
  - H-3 con O-r1-1 y O-E3-1;
  - ADMIN-01d1 (12 entradas);
  - O-r1c-2;
  - `key={claseId}` de CALIFICACIONES-01d.
  
  Las filas de 06b (H-2, O-03, el hermano de T-02 de CLASES-03e, N-52, N-54 y la barra) siguen abiertas.
- **Cumple mi lista de filas nuevas:** los "sin caso" de CH6-A14, la descarga de `components/adjuntos` (con el texto de A-4), O-01 (destino 06b) y O-07. O-08 no lleva fila, como pedí.
- **Cumple A-4:**
  - el foco al cambiar de ruta y el punto (3) de "Foco tras navegar…" van al encargo de antes de DEPLOY;
  - los puntos (1), (2), (4) y (5), O-1/O-2 y O-7/O-8 de CLASES-03e, O-r1-6 de CHORE-03, O-r1-1 de CLASES-03e y el punto 9 de CALIFICACIONES-02b van al `chore` de accesibilidad del marco;
  - todos remiten a 2b, "Dos encargos nuevos que salen de CHORE-06", punto 1;
  - la defensa del servidor no lleva fila.
- **Secciones 4 y 6:** las decisiones del humano de CHORE-06 y la medición de 06a son las mías, con sus cifras.
- **Formato:**
  - ninguna secuencia `****`;
  - las negritas de las líneas editadas están pareadas;
  - todas las filas de la sección 3 tienen sus tres columnas (la única fila con un `|` de más es la de M-29 de ADMIN-01, con un `\|` escapado, anterior y sin cambio);
  - la tabla de la medición tiene sus dos columnas.

### Los cuatro puntos que dejó el agente
1. **Lección 1: vale la frase del agente,** "Los tres hallazgos (T-01 a T-03) vinieron de memorias fuera de `useState`". La mía ("las tres rondas con hallazgo") estaba mal: hubo dos rondas ROTO. La suya es exacta: refs del componente (T-01), una `key` constante con memoria de foco (T-02) y una ref dentro de un gancho (T-03).
2. **Las celdas de destino reemplazadas por "Hecho en…" en cuatro filas, y la quinta con su nota, quedan bien.** Es la forma de las filas cerradas de ADMIN-01. En la quinta conviene conservar el "Hecho en ADMIN-01d2" y decir que su nota dejó de valer, porque es cierto: el salto entre las calificaciones de dos clases sí se alcanzaba.
3. **"Confirmado en CHORE-06…" en las dos filas que ya decían "el `chore` de accesibilidad del marco" queda bien.** No es un cambio de destino.
4. **Las filas que todavía nombran "el `chore` de foco y navegación del marco" se ajustan al cerrar 06b, no ahora.** Son las de 06b (H-2, O-03, el hermano de T-02 de CLASES-03e, la barra de ADMIN-01d2, N-52 y N-54), donde ese `chore` es CHORE-06 mismo. Hay dos más que lo nombran como alternativa: `useTemasDelRecurso` ("Carril trivial… o el `chore` de foco y navegación del marco") y la cola de O-16 y O-r2-1 de CHORE-03. Que la primera vaya fuera de CHORE-06 ya lo decidió DH-05 (b). Ajustarla ahora no es necesario y la dejaría editada dos veces.
   - **Para el cierre de 06b (orquestador):** recorrer la sección 3 buscando "el `chore` de foco y navegación del marco". Cada fila que lo nombre queda "Hecho en CHORE-06b" o pasa, con "Cambio de destino (CHORE-06, DH-05 (b))", al `chore` de accesibilidad del marco. En particular, la de `useTemasDelRecurso` va a ese `chore` (o al carril trivial). Ninguna fila debe quedar con el nombre de un `chore` ya cerrado.

### El commit de 06a
- `git add -n -A -- frontend docs/ESTADO.md docs/DESIGN.md docs/trabajo/CHORE-06-foco-y-navegacion docs/trabajo/DOCS-05-envivo-bigbluebutton/aprobacion.md` da **46 rutas**: los 38 de `frontend/`, los 5 archivos de la carpeta del encargo, `docs/ESTADO.md`, `docs/DESIGN.md` y el `aprobacion.md` de DOCS-05.
- `git add -n -A` da 47. La única diferencia es `docs/trabajo/DEPLOY-investigacion-vps.md`, que queda fuera, como debe.
- `git status --porcelain` da 43 líneas, con la carpeta del encargo en una sola. Los `git add -n` los corrí en serie. El índice sigue vacío.
- `revision.md` cambia con esta sección y sigue dentro de la carpeta del encargo, así que el conteo no cambia.

## Verificación de la Enmienda 3 — CHORE-06b (2026-11-12)
Manager, modo plan. Solo lectura, sin suites. Revisé:
- `plan.md`: 908 líneas, SHA-256 `824af180c9afa1884b1ba9873d224161c6131d9dc2d38c7855149534acfd2e31`, igual al que anotó el orquestador;
- la copia de antes `plan-ch6-antes-e3-c5fe10fc.md` (`c5fe10fc…`, comprobado). El `git diff --no-index` completo da 246 inserciones y 32 borrados, y lo leí bloque por bloque;
- `revision.md` (`d1b2f393…`), `aprobacion.md` (hasta la entrada de la Enmienda 3) y `reporte-tester.md` (O-01, O-06 a O-09);
- el código en `023b450`. `frontend/` está limpio contra ese commit (`git status --porcelain frontend` vacío). También leí `@tanstack/query-core` 5.103.2 instalado (`node_modules/@tanstack/query-core/build/modern/`).

**Veredicto: CAMBIOS REQUERIDOS.** Hay dos problemas que bloquean: M-01 y M-02. Los dos salen de cómo maneja TanStack Query 5.103.2 el estado de una consulta, no de las decisiones del humano. Ninguno reabre DH-01 a DH-10, el alcance de 06b ni nada de 06a. Regresa al arquitecto con una enmienda corta (3b) que verifico yo. Antes de esa enmienda, el orquestador guarda la copia de `plan.md`.

**Lo que está bien y no se toca:**
- **La enmienda trae los cinco puntos de "Lo que cambia para 06b":**
  - el inventario por ganchos y memoria (M-5);
  - la clave en todo gancho nuevo con ref, con su caso de salto (Regla de la clave, CH6-B18);
  - O-08 (DH-10);
  - C-13;
  - el grep contra `023b450`, con la firma nueva de `useAvisoDeRecargaFallida`, las `key` de las secciones y la línea de H-R2 protegidas en "No se toca, además".
- **No cambia nada de 06a,** ni las nueve decisiones. DH-10 entra como décima, con el texto literal del humano.
- **El alcance de 06b solo crece en dos cosas:** DH-10, que decidió el humano, y `tambienEnVuelo`, que M-01 pide retirar.
- **Líneas comprobadas en `023b450`, todas exactas:**
  - C-13: `guardas-ch4-r1.ataque.test.ts:113-120` son el comentario y las siete líneas;
  - C-4 (`:351`, `:352`, `:361`, `:363` y `:364`), C-5 (`:386`, `:388`, `:397` y `:399`), C-7 (`:809` a `:825`) y C-17 (`:316-327`, `:324` y `:325`, con un `500`);
  - C-18: 7 `CASOS` por 2 = 14 casos. Con la función nueva cambian 4; con la de antes habrían cambiado 10;
  - las líneas "Hoy" de los siete sitios de §D-4, `seccion-de-recursos.tsx:65-73`, `hooks.ts:1027-1031`, `:1105-1116` y `:1811-1824`, y `lib.ts:734`.
- **Conteo:** 14 + 2 + 3 = 19 de producción, 4 pruebas nuevas, 3 de la lista cerrada y 12 `*.ataque` (C-3 a C-9, C-13 y C-15 a C-18): 38. Las condicionales son PR-C18, C-10 y C-14: hasta 41.
- **"Dónde se dispara" (DH-10) es cierto.** `useAlPulsarLaSeccionActiva` se llama en `muro-view:69`, `dudas-view:60`, `recursos-view:77` (en `BloqueDeRecursos`, `key={bloque}`) y `trabajo-view:122`, y esas cuatro vistas sobreviven al cambio de clase. Las demás llamadas viven en componentes que se montan de nuevo con el salto, y su ref empieza con la `location.key` nueva:
  - `seccion-de-recursos:85` y `seccion-de-tema:63`, con `` key={`${claseId}:${seccion.clave}`} `` en `recursos-view:139` y `trabajo-view:247`;
  - `respuestas-de-duda:166`, en la fila con `key={duda.id}`;
  - `gradebook-view:86` y `mis-calificaciones-view:109`, con `key={claseId}` en `:223` y `:254`.

### Problemas que bloquean

#### M-01 — En 5.103.2, toda consulta que falla queda vieja: `tambienEnVuelo` no hace nada y varias mutaciones no pueden caer
**Dónde:**
- §D-4: PR-1 bis, "Qué hace", y PR-2 con la Enmienda 3;
- "Dónde vive", el párrafo de `tambienEnVuelo`;
- CH6-B02 (a) a (c), CH6-B04 (c′), CH6-B12 (c) y CH6-B16 (c);
- "Mutaciones": las filas de DH-10 en `dudas-view.tsx`, de `tambienEnVuelo`, de `huella` y de `useMarcarViejaSiQuedoEnError` de Avisos;
- §D-5, "O-01";
- R-11 y la fila nueva de A-4 en "Al cierre";
- y el texto de M-3 en "Alcance" (`plan.md:184`), anterior a esta enmienda.

**El hecho:**
- En `@tanstack/query-core` 5.103.2, la acción `error` pone `isInvalidated: true` (`query.js:450-462`). Solo `success` lo regresa a `false` (`successState`, `:497-505`).
- `isStaleByTime` da `true` con `isInvalidated`, antes de mirar el tiempo (`:213-218`). También con el `staleTime` propio de Avisos.
- Por eso una consulta que falla queda vieja enseguida. Así:
  - **al montarse de nuevo, se pide:** `shouldFetchOnMount`, `queryObserver.js:434-443`, con `refetchOnMount` por omisión, porque `app/providers.tsx` no lo cambia;
  - **al cambiar el observador a su clave, también se pide:** `shouldFetchOptionally`, `:444-446`.
- El manager de ADMIN-01 ya lo había comprobado (`docs/trabajo/ADMIN-01-administracion/revision.md:6421`), y la versión es la misma desde que se armó el frontend.

**Por qué importa:**
1. **La premisa de la segunda corrección de diseño es falsa.** El plan dice: "Sin esto, el fallo con la vista desmontada dejaba la consulta en error, fresca y sin marca". No es así: el fallo ya la deja marcada. Lo que pasa con una petición que sigue en vuelo al salir:
   - **si falla después,** la marca la pone la librería;
   - **si responde bien,** `success` la quita;
   - **si consume `signal`** (`useTrabajo` y `useRecursos`), se aborta y el estado vuelve al de antes de pedir (`query.js:249` y `:357-362`), y la marca de `tambienEnVuelo` se pierde con él.

   `tambienEnVuelo` no cancela ni duplica nada, pero tampoco cambia nada que se pueda observar:
   - sus tres mutaciones (CH6-B02 (a), CH6-B04 (c′) y CH6-B12 (c)) no pueden caer, así que el programador llega seguro a una PA-7;
   - además, agrega un parámetro sin efecto a un gancho compartido;
   - R-11 y la fila de A-4 meterían en `docs/ESTADO.md` una "laguna" de `features/admin` que no existe.
2. **PR-1 bis no es lo que pide B en el salto.** El estado "en error sin estar vieja" de "Qué hace" y de CH6-B16 (c) no se puede armar: una consulta en error siempre está vieja. En un salto de clase, B se pide siempre por el observador, si está vieja o en error, en el mismo render del salto. En el resultado optimista `isFetching` ya viene en `true` (`queryObserver.js:createResult`, `fetchOptionally`), así que PR-1 bis nunca pide nada.
   - **Lo que sí garantiza** es que no salga una segunda petición: es PR-3, con `isFetching` y `cancelRefetch: false`.
   - **Hoy, en `023b450`, ese salto pide dos veces:** las cuatro vistas llaman a `x.refetch()`, que cancela la petición del observador y lanza otra. Por eso CH6-B16 (c) y (d) salen rojas antes del cambio y pasan después.
   - **La decisión del humano se cumple** ("renueva solo si está en error o vieja"). Lo que está mal es cómo la explica el plan.
   - **Una mutación no puede caer:** "quitar la llamada de `useRecargarAlPulsarLaSeccion` en `dudas-view.tsx` → CH6-B16 (c) Dudas". Sin la llamada sale una sola petición, la del observador, y el mensaje desaparece. Es otra PA-7 segura.
3. **PR-2 es redundante con esta versión,** como ya se aceptó en ADMIN-01: se puede dejar como garantía escrita. Pero sus filas de mutación no caen a nivel de vista, porque la librería ya marcó la consulta:
   - "`useMarcarViejaSiQuedoEnError` de una lista (Avisos) → CH6-B04", una fila anterior a esta enmienda;
   - "`huella` → CH6-B18 (b)".

   Solo pueden caer en una prueba del gancho que arme a mano un error sin `isInvalidated` (con `setState` de la consulta). Esa forma de armarlo hay que escribirla en el plan.
4. **§D-5, "O-01", afirma dos cosas falsas:**
   - "al volver a T1, la lista se ve como estaba": las consultas de `features/tareas` no consumen `signal`, así que el fallo de T1 la deja vieja y al volver se pide desde la primera página;
   - "PR-2 con `tambienEnVuelo`" como lo que hace que se pida.

   La decisión (no avisar con la vista desmontada; R8) no cambia. Cambia su porqué.
5. **CH6-B12 (c) dice "en las 9 listas", y en una no se cumple.** El tema de Actividades (`useTrabajo`) consume `signal`: al salir, la página en vuelo se aborta y se revierte, nunca falla, y al volver no se pide nada (la lista sigue con su «Ver más»). El caso debe decirlo para esa lista. CH6-B04 (c′) ya elige bien sus listas, las que no consumen `signal`.

**Qué se espera:**
- **`tambienEnVuelo` sale del plan:** el parámetro, su párrafo, CH6-B02 (a) a (c), su fila de mutación, R-11 y la fila de A-4. CH6-B04 (c′) y CH6-B12 (c) se quedan como casos de camino, que ya cumple la librería.
- **PR-1 bis y M-3 dicen la verdad del mecanismo.** En el salto, B la pide el observador si está vieja o en error. PR-1 bis aporta que no salga una segunda petición. CH6-B16 junta (c) y (d) en "en error", o arma (c) con un estado que exista.
- **Ninguna fila de "Mutaciones" queda sin poder caer.** Se cambia por una que caiga o se declara redundante, con su mecanismo y el caso que sí cae, como O-05. Por ejemplo:
  - en `dudas-view.tsx`, volver a la llamada de `023b450` (`if (!dudas.isError) return; void dudas.refetch()`) hace caer CH6-B16 (c) Dudas por conteo (dos peticiones);
  - PR-2 y `huella` se vigilan con un caso del gancho que arme a mano el error sin `isInvalidated`, o se declaran redundantes.
- **El paso 13 (rojo primero) dice qué casos salen verdes antes del cambio, y por qué:** como mínimo CH6-B04 (c′), CH6-B12 (c), CH6-B16 (b) y CH6-B18 (b).
- **"O-01" se corrige** y la decisión no cambia. CH6-B12 (c) dice qué pasa en el tema de Actividades.
- **El conteo no cambia** (38, hasta 41).

#### M-02 — Tras conservar la lista, la recarga que la recupera la reemplaza por el error mientras vuela
**Dónde:** §D-5, pasos 1, 2, 4 y 5 (`conserva` se calcula con `isFetchNextPageError`), y los casos que recuperan una lista conservada:
- CH6-B01 (e) y CH6-B03 (pulsar);
- CH6-B04 y CH6-B10 (salir y volver);
- CH6-B16 y CH6-B17, con B cuya página falló;
- CH6-B18 (a), el regreso a A.

Es anterior a la Enmienda 3, pero la enmienda reescribió esa función y sumó DH-10, que pasa por ahí. Es un estado vecino del mecanismo M-4.

**El hecho:**
- `isFetchNextPageError` es `isError && fetchMeta?.fetchMore?.direction === "forward"` (`infiniteQueryObserver.js:104-105`).
- Toda recarga (`refetch`, el montaje que pide, el observador que cambia de clave o una invalidación) despacha `fetch` sin `meta`, y eso deja `fetchMeta: null` (`query.js:353-356` y la acción `fetch`).
- Mientras tanto, `status` sigue en `"error"` hasta que llega un `success`: `fetchState` solo lo toca si no hay datos.

**Qué ve la persona.** Después de un «Ver más» que falló por red o `5xx` (la lista se conservó y salió el aviso), cualquier camino de recuperación pasa por un render en el que `conserva` es falso e `isError` es verdadero. La rama "error primero" pinta entonces el `MensajeError`:
- dice «Algo salió mal. Inténtalo de nuevo.», y su `role="alert"` lo anuncia;
- en el inicio, el título dice "No pudimos cargar tus clases";
- en Personas, la vista deja de contar como cargada.

Todo eso mientras la recarga vuela. Después vuelve la lista. Si el foco estaba en la lista o en «Ver más», el control se desmonta y el foco salta.

Pasa por todos los caminos:
- pulsar la sección;
- volver de otra sección (la librería pide al montar, M-01);
- el salto de DH-10 a una B cuya página falló;
- el regreso a A en CH6-B18 (a);
- una invalidación por una mutación, por ejemplo publicar un comentario, que invalida el muro.

Recursos, el modelo que cita DH-02 (a), no lo hace: su condición (`isError && (filas === undefined || esErrorDeCursor(error))`, `seccion-de-recursos.tsx:62-63`) no depende de la dirección.

**Por qué importa:**
- La frase de recuperación promete "Inténtalo de nuevo". Al cumplirla, la vista anuncia un error que ya no es cierto.
- Ningún caso del plan fija qué se ve durante esa recarga, así que es un hallazgo seguro del tester (una ronda extra por un estado vecino).
- Toca la condición (a) de DH-10 ("la renovación no mueve el foco") cuando B llega con su página fallida.

**Qué se espera:**
- **El plan decide qué se ve mientras vuela la recarga que recupera una lista conservada,** y lo fija en los casos de cada camino: qué se pinta, qué se anuncia y dónde queda el foco. Dos salidas posibles; el arquitecto elige y argumenta:
  1. que la lista siga a la vista mientras vuela esa recarga, con «Ver más» en espera;
  2. que se acepte el error momentáneo y se declare.

  Si elige 2, es una conducta visible que DH-02 (a) no cubrió, y va al humano. Si elige 1, se cuida que no cambie lo que DH-02 (a) dejó igual: una recarga de fondo que falla sin que antes fallara una página sigue reemplazando la lista.
- **§D-5 dice qué recibe `useFocoAlPasarAError` en Avisos y Dudas** (`isError && !conserva`, o lo que decida el punto anterior). "Sigue igual" no basta: su memoria `eraError` cambia de sentido con la lista conservada.
- **Cada caso de recuperación de §D-5 y de DH-10 verifica, además de la petición, que no aparezca un `role="alert"` ni el texto de error** mientras la recarga vuela, si se elige la salida 1.

### Las dos correcciones de diseño
**1. `conservaLaListaTrasLaPagina` solo con red o `5xx`: corrección de coherencia, no de producto. La acepto.**
- **DH-02 (a), en el texto que aprobó el humano,** nombra lo que se conserva: "(red, `5xx`)".
- **La función anterior contradecía el propio plan,** porque conservaba cualquier error que no fuera de cursor, de acceso o de redirección:
  - contra CH6-B13: un `404 PUBLICACION_NO_ENCONTRADA` en «Ver más comentarios» debe decir «Esa publicación ya no existe.»;
  - contra una vigilada de §D-R0, `consultas-ch3.test.tsx`: un `400 VALIDACION` fuera de contrato en «Ver más comentarios», en «Ver más clases» y en «Ver más alumnos» de Personas espera el texto fijo del lugar. Con la función de antes, esa prueba habría caído.
- **Qué ve la persona con la función nueva, error por error.** Comprobado contra `CASOS` de `muro-c-r3` y `lib.ts`:
  - **red o `5xx`** (`SIN_CONEXION` con `estado` 0 o 500 a 504, y cualquier otro `5xx`): la lista se queda, sale un aviso y «Ver más» sigue. Es lo nuevo que pidió el humano;
  - **un error que no es `ApiError`:** igual que la red, con el texto genérico;
  - **`400` del cursor:** la frase "…Vuelve a abrir…" reemplaza la lista, como hoy;
  - **`400 VALIDACION` de otro campo:** el texto fijo del lugar reemplaza la lista, como hoy;
  - **`400` que no es `VALIDACION` y `429`:** el texto de la consulta reemplaza la lista, como hoy;
  - **`403 SIN_ACCESO_A_LA_CLASE`:** «No tienes acceso a esta clase.», como hoy;
  - **`401` sin refresco, `403 ACCESO_RESTRINGIDO` y `403 CAMBIO_DE_CONTRASENA_REQUERIDO`:** sin aviso, y `apiClient` redirige;
  - **`404 PUBLICACION_NO_ENCONTRADA` o `DUDA_NO_ENCONTRADA`:** el mensaje del bloque y la lista renovada (CH6-B13).

  Ningún `4xx` cambia de conducta frente a `023b450`.
- **Un matiz para el resumen del humano, que no requiere decisión:** Recursos, que DH-02 (a) cita como modelo, conserva también ante un `429` o un `400` de otro campo. Las 9 listas no. Es la lectura literal de DH-02 (a) y no rompe ningún caso.

**2. `tambienEnVuelo`: no es una decisión de producto, pero se apoya en una premisa falsa. Se retira (M-01).**
- No cancela ni duplica peticiones: marcar con `refetchType: "none"` no pide nada, y una vuelta antes de la respuesta se une a la petición en vuelo.
- Tampoco cambia nada: la librería ya marca el fallo, y `success` o la reversión de una consulta con `signal` borran la marca.
- Lo que prometía (CH6-B12 (c) y el camino "otra sección y regreso" de CH6-B04 (c′)) ya se cumple sin él. Esos casos se quedan.

### O-08 (DH-10): fidelidad y casos
- **El texto de DH-10 es el literal del humano** (`aprobacion.md:50`), con sus dos condiciones y un caso para cada una: CH6-B16 para (a) y CH6-B17 para (b).
- **La interpretación de (b) en Avisos y Dudas es correcta y está dicha:** ahí una recarga que falla no da aviso, sino el `MensajeError` de B, como hoy (DH-02 (a)). Lo importante es que nunca salga nada de A, y CH6-B17 lo cubre en las cuatro vistas, también con la renovación de A en vuelo. Esas cuatro listas no consumen `signal`, así que ese caso se puede armar.
- **"Dónde se dispara" es cierto** (lo verifiqué arriba).
- **Lo que no sirve es el mecanismo de "Qué hace" y el estado (c)** (M-01). Las cifras que esperan los casos son correctas: 0, 1, 1, 1 y 0 peticiones.
- **Dos precisiones de foco en CH6-B16, sin bloquear:**
  - **Una frase de PR-1 bis no cuadra con CH6-B16.** La condición (a) dice que el foco va "al `h2` de la lista si lo tenía una fila o «Ver más»". Pero CH6-B16 y ATQ-CH6-31 (de 06a, en verde) fijan que, si B también tiene página siguiente, el foco se queda en «Ver más» de B: el botón es el mismo nodo. Hay que alinear la frase con el caso.
  - **"Nunca a una fila" no siempre es cierto.** Cuando la renovación de B quita «Ver más», `useFocoAlCargarMas` lleva el foco a la primera fila nueva, si la respuesta trae alguna (`components/foco/hooks.ts:155-157`; ATQ-CH6-33, en la misma clase). Así que "nunca a una fila" solo vale si la respuesta no trae filas nuevas. El caso fija esa respuesta, o espera "la primera fila nueva de B o el `h2`".

### El inventario M-5 y la Regla de la clave
- **Mi grep sale igual que la tabla de M-5,** salvo una omisión menor. Busqué `useRef`, `useState`, `useContext`, `getQuery*`, `.subscribe(` y memoria de módulo en los 12 archivos de producción de `features/clases` de 06b y en los ganchos que llaman.
  - **Lo que falta:** `limiteDeRecursos`, la memoria de módulo de `useRecursos` (`hooks.ts:1551`), que usa `SeccionDeRecursos`. No lleva nada de A a B, porque el `signal` saca de la fila a la sección que se desmonta; pero debe figurar junto a `limiteDeTrabajo`.
- **Las refs y estados que aparecen en esos archivos son de 06a o anteriores,** y ya están en la tabla de "Arbitraje de la ronda 2":
  - `clasePrevia`, `idsPrevios`, `clavesPrevias` y los de orden en Trabajo;
  - las confirmaciones de las filas, `botonesQuitar`, etc.
- **Lo nuevo con memoria es lo que dice la tabla:** `useAvisoDeRecargaFallida` en 9 sitios, `useRenovarSiLaPublicacionYaNoEsta` y `useMarcarViejaSiQuedoEnError`.
- **La clave de cada sitio es la correcta,** incluida la huella constante de los inicios.
- **La Regla de la clave, con su caso `renderHook` donde la `key` ya protege, está bien planteada:** CH6-B18 (c) y (d), declarada como segunda red. La mutación de la clave en `muro-view.tsx` sí hace caer CH6-B18 (a). Al volver a A, el render optimista conserva `fetchMeta` hacia adelante, así que `conserva` es verdadero y el aviso se repetiría. Ojo: ese mismo regreso cae en M-02.

### La lista cerrada y §D-R0 contra `023b450` (mi grep)
- **Sin router.** Pinté la búsqueda sobre los componentes de las 12 listas y sus vistas (`<PublicacionDelMuro`, `<ComentariosDePublicacion`, `<TablaAlumnos`, `<PersonasDeLaClase`, `<PanelMisClases`, las vistas de los inicios, de Avisos, de Dudas, de Personas, de Actividades y de Recursos, y las secciones). Solo dos archivos no montan ningún router:
  - `publicacion-del-muro.test.tsx`, ya en la lista cerrada;
  - `adjuntos-de-publicacion.test.tsx`, vigilada: no abre los comentarios, lo comprobé.

  Son los del plan. El arquitecto dice "27 llamadas a `abrirComentarios`" y son 10; el remedio no cambia.
- **`vi.mock` de `./hooks`.** Solo C-15 y C-16. **Precisión, sin bloquear:** C-15 y C-16 suman a la fábrica `useAvisoDeRecargaFallida` y un `QueryClientProvider`. Eso basta solo si los inicios importan `useRecargarAlPulsarLaSeccion` y `useMarcarViejaSiQuedoEnError` de `@/components/seccion/hooks`, no reexportados por `./hooks`. El plan debe decirlo en §D-4, "Sitios", para que el programador no tropiece con una PA-2.
- **«Ver más» que falla por red o `5xx` y espera un `MensajeError` o el foco en un encabezado.** Crucé los archivos que pulsan un «Ver más» de las 9 listas con los que responden `5xx` o sin red y esperan `alert`, `GENERICO` o el texto de error. Todos los que cambian de sentido ya están en el plan:
  - C-3 a C-7, C-17 y C-18;
  - la lista cerrada (`ver-mas-y-orden-ch4` y `personas-view`).

  Los demás no cambian:
  - el `503` de `dudas-03e.test.tsx:1388` es del `DELETE`;
  - `trabajo-view.test.tsx:1434` y `ver-mas-01e-r3:194` son recargas, que siguen reemplazando la lista;
  - los `400` y `403` de `muro-c-r2`, de `muro-view.test` y de los inicios siguen reemplazando;
  - `consultas-ch3` es `VALIDACION`, que sigue reemplazando.
- **Las que cuentan peticiones tras un salto de clase.** Con M-01, PR-1 bis no agrega peticiones a las del observador. Solo quita la segunda que hoy lanza el `refetch()` de las cuatro vistas cuando B está en error. Ninguna prueba de 06a cuenta las peticiones de B en ese estado: CH6-A21 y ATQ-CH6-26 cuentan avisos, no peticiones. Sigo de acuerdo con que queden vigiladas y C-14 condicional.
- **Doble que no se limpia (precisión para C-6 y C-18, sin bloquear).** Hay que contar los avisos desde el inicio de cada caso (con `mockClear` al empezar, o la diferencia entre antes y después):
  - `muro-c-r3` dobla `toast.error` sin limpiarlo entre casos, así que el segundo de los dos casos que conservan acumula llamadas;
  - `foco-pestana-02d-r3` usa `vi.restoreAllMocks()`, que en Vitest 4 no borra las llamadas de un `vi.fn()`;
  - C-17 sí limpia (`alumnos-b-r5:191-193`).

  Si no se precisa, "una vez" falla por el arnés y no por el código.
- **C-13, C-14 y la precisión de C-3 a C-7 conservan la intención de sus pruebas.** C-15 y C-16 también: siguen protegiendo "sin datos no afirma vacío ni total".

### Reglas de `AGENTS.md` para planes
- **Un caso por camino de cada frase de recuperación:** no hay frases nuevas. El salto de clase es un camino nuevo para las frases que ya existían, y CH6-B16 y CH6-B17 lo cubren en las cuatro vistas. Pero con M-02, varios caminos de §D-5 no cumplen la frase sin pasar por un error falso.
- **"Error primero":** ninguna viñeta de la enmienda lo contradice. M-02 es justamente el estado vecino que ese orden deja al descubierto.
- **Mutaciones en el rojo primero:** M-01 enumera las filas que no pueden caer.
- **Estados vecinos por mecanismo:** la matriz de §D-7 de la enmienda está completa para DH-10: B en cada estado, A en vuelo, ida y vuelta, `StrictMode` y un fallo en el render del salto. Le falta "la recarga que recupera una lista conservada" (M-02) y el tema de Actividades con `signal` (M-01, punto 5).

### Problemas que no bloquean
- **N-01:** la frase de PR-1 bis (a) sobre «Ver más», y "nunca a una fila" en CH6-B16 (arriba, en "O-08").
- **N-02:** C-15 y C-16, de dónde importan los inicios los dos ganchos de `components/seccion/hooks.ts`.
- **N-03:** C-6 y C-18, contar los avisos desde el inicio del caso.
- **N-04:** M-5 nombra `limiteDeRecursos`.

### Detalles menores
- "27 llamadas a `abrirComentarios`": son 10.
- §D-0 todavía dice "Dos subentregas: … CHORE-06b (32 archivos)" en "Rama" y en "Entra". La enmienda lo anota al lado; se puede dejar así, porque es historial.

### Tamaño: 38 archivos (hasta 41) frente a "unos 30" y a DH-06 (a)
- **Postura: no partir.**
  - **Lo que crece desde los 32 son pruebas existentes, con su reescritura ya redactada:** C-13 y C-15 a C-18, que son del tester en la ronda 0, y `publicacion-del-muro.test.tsx`. El trabajo propio del programador son 26 archivos.
  - **06a cerró con 38 y tres rondas,** sin problemas de tamaño.
  - **M-01 y M-02 no cambian el conteo:** M-01 quita código y M-02 toca archivos que ya están en la lista.
- **El corte por mecanismo es peor:** M-3 y DH-10 por un lado, M-4 por el otro. Toca dos veces las 9 listas: unos 48 archivos en total. Coincido con el arquitecto.
- **El único corte limpio que encontré, si el humano prefiere acercarse a 30:**
  - una 06c con N-52 del gradebook (§D-6, primera viñeta), de 4 archivos: `features/calificaciones/gradebook-view.tsx`, `features/calificaciones/hooks.ts`, `features/calificaciones/gradebook-ch6.test.tsx` y C-8 (`gradebook-01d-r3.ataque.test.tsx`);
  - no comparte archivos con el resto de 06b. 06b quedaría en 34 (hasta 37) y 06c en 4;
  - el costo es un ciclo completo más: commit, rondas y cierre, por cuatro archivos.

  No lo recomiendo.
- **Va al humano como confirmación:** 38 pasa de "unos 30" y de los 32 de DH-06 (a). Mi recomendación es no partir.

### Para el humano
1. **El tamaño de 06b:** 38 archivos (hasta 41). Recomiendo no partir. Si prefiere partir, el corte es "06c = N-52 del gradebook, 4 archivos".
2. **Solo si el arquitecto elige la salida 2 de M-02,** que el error se vea un momento al recuperar una lista conservada: es una conducta visible que DH-02 (a) no cubrió y la decide el humano. Si elige la 1, no hay nada que decidir.
3. **Para el resumen, sin decisión:**
   - la corrección de `conservaLaListaTrasLaPagina` es fiel a DH-02 (a), con el matiz de Recursos ante un `429`;
   - la decisión sobre O-08 se cumple tal como la escribió.

### Para el orquestador
- **Antes de la enmienda 3b:** guardar la copia de `plan.md` (`824af180…`) en el scratchpad y anotar su SHA-256 en `aprobacion.md`. Verifico 3b con `git diff --no-index` completo contra esa copia.
- **06b no arranca hasta que 3b quede APROBADA.**
- **Nada de lo que propone R-11 entra en `docs/ESTADO.md`** (M-01).

## Verificación de la Enmienda 3b — CHORE-06b (2026-11-12)
Manager, modo plan. Solo lectura, sin suites. Revisé:
- `plan.md`: 1009 líneas, SHA-256 `48f981d74e19d5690bbd9046615173e3aec6896501b15ef0e234a41428996942`, comprobado;
- la copia de antes `plan-ch6-antes-e3b-824af180.md` (`824af180…`, comprobado). El `git diff --no-index` completo da 154 inserciones y 53 borrados, y leí todos los hunks;
- que nada más cambió: `revision.md` estaba en `46e89370…` antes de esta sección y `docs/ESTADO.md` en `2ce202ea…`. `frontend/` está limpio contra `023b450`;
- la librería instalada: `@tanstack/query-core` 5.103.2 (`query.js`, `queryObserver.js` e `infiniteQueryObserver.js`) y `@tanstack/react-query` (`useBaseQuery.js`).

**Veredicto: APROBADO.** M-01 y M-02 quedan cerrados, y también N-01 a N-04. Queda un hallazgo que no bloquea (N-05) y dos detalles de texto, que el programador puede leer sin enmienda. La enmienda no reabre ninguna decisión del humano, el alcance de 06b ni nada de 06a. El conteo sigue en 38 (hasta 41): el gancho nuevo va en `features/clases/hooks.ts`, que ya está en la lista. No queda nada para el humano.

### M-01: cerrado
- **`tambienEnVuelo` salió del plan, con todo lo que dependía de él:** el parámetro (`:380`), PR-2 (`:373`), los casos de CH6-B02, su fila de mutación, R-11 (`:917`, retirado), A-1 y la fila de A-4 (`:1008`, retirada).
  - Lo busqué con `grep`. Solo queda en líneas que dicen que se retiró (`:37`, `:380`, `:917`).
  - `Sitios` ya pasa un solo argumento a `useMarcarViejaSiQuedoEnError`.
- **PR-1 bis, "Qué hace" (`:351-356`), describe el mecanismo real y queda bien sostenido en la librería:**
  - el observador pide B en el render del salto (`queryObserver.js:444-446` y `:301-308`);
  - PR-1 bis evita la segunda petición;
  - hoy, en `023b450`, salen dos.
  - Las cifras esperadas son 0, 1, 1 y 0.
- **CH6-B16 junta (c) y (d)** en un solo estado "en error", con dos variantes que sí se pueden armar. CH6-B17 elige la variante "falló con B fuera de la vista", que no deja ningún aviso previo.
- **M-3 (`:198`) se corrige en su lugar,** y PR-2 queda como garantía escrita, igual que en ADMIN-01.
- **"O-01" (`:510-511`) se corrige,** y la decisión no cambia: en `features/tareas` la lista de T1 se vuelve a pedir al volver.
- **CH6-B12 (c) separa las 8 listas sin `signal` del tema de Actividades,** que se aborta y no falla.
- **El paso 13 dice qué sale verde y qué sale rojo antes del cambio, y por qué.** Lo contrasté con `023b450`:
  - hoy, las cuatro vistas llaman a `x.refetch()`, que cancela la petición del observador, solo con B en error. Por eso CH6-B16 (c) y (e) salen rojas y (a) y (b) verdes;
  - CH6-B04 (c′), CH6-B12 (c) en su parte "se pide" y CH6-B18 (b) los cumple la librería.

### M-02: cerrado. La premisa del gancho nuevo, camino por camino
Lo que sostiene la premisa:
- `useBaseQuery.js:27-28` calcula el resultado del render con `observer.getOptimisticResult(...)`.
- `setOptions`, que es lo que cambia la clave y lanza la petición, corre en un `useEffect` (`:35-36`).
- La suscripción, que hace la petición del montaje en `onSubscribe`, corre en la fase de *commit* (`useSyncExternalStore`, `:30-33`).
- El resultado optimista suma `fetchState`, que no toca `fetchMeta` (`queryObserver.js:305-308`, `query.js:486-496`).

Así que el render anterior a la petición todavía ve la dirección "hacia adelante". La marca se toma con un `setState` durante el render, como `creandoEn` en `trabajo-view.tsx:87`, que ya pasa el lint con `eslint-plugin-react-hooks` 7. React vuelve a pintar el componente antes del *commit*, y en ese segundo render el resultado optimista sigue igual.

| Camino | ¿Hay un render con la dirección "hacia adelante" antes de la recarga? | Resultado |
|---|---|---|
| El «Ver más» falla con la vista montada | Sí: el render del fallo (`isFetchNextPageError` verdadero). La marca se toma ahí | Se conserva y sale un aviso |
| Pulsar la sección | La marca ya está, desde el render del fallo. `refetch` corre en un efecto | Se conserva mientras vuela: `isError` sigue verdadero y `errorUpdateCount` no cambia |
| Una invalidación (comentar) con la vista montada | Igual que pulsar | Se conserva |
| Volver de otra sección (montaje) | Sí: el primer render usa el resultado optimista del observador nuevo, con el `fetchMeta` del caché, y la petición sale en `onSubscribe`, después del *commit* | Se conserva. Sin aviso: `useAvisoDeRecargaFallida` arranca con el contador actual |
| Cambio de clave del observador (el salto de DH-10 a B con la página fallida) | Sí: el render del salto calcula el resultado optimista de B con el estado de B, y `setOptions` corre en el efecto | Se conserva B, con su propia marca (`B:n`); la de A ya no cuenta |
| El regreso a A de CH6-B18 (a) | Igual que el salto | Se conserva A |
| `StrictMode` | El doble render da la misma marca. El suscribirse, darse de baja y volver a suscribirse une la segunda petición a la primera (`continueRetry`) | Sin cambio |
| La página falló con la vista desmontada (CH6-B12 (c)) | Igual que "volver" | Se conserva, sin aviso |
| La recarga que recupera falla | `errorUpdateCount` sube, `actual` cambia y la marca vieja deja de valer | Se reemplaza, sin aviso: `conserva` es falso para `useAvisoDeRecargaFallida` |
| La recarga que recupera responde bien | `isError` pasa a falso | La lista se renueva. La marca queda, pero no sirve: el contador solo sube |
| Un «Ver más» que vuelve a fallar | El fallo nuevo trae `isFetchNextPageError` y otro contador | Se conserva, con un aviso nuevo |
| Una recarga de fondo que falla sin que antes fallara una página | No hay marca | Se reemplaza, como hoy (DH-02 (a)) |

**Lo que DH-02 (a) dejó igual sigue igual.** La única conducta visible nueva es que la lista se vea mientras vuela la recarga que la recupera. Es la salida 1 de M-02, que no requería al humano, y queda declarada en R-05 y en A-2.

### "Mutaciones", fila por fila (las que tocó la 3b)
- **DH-10 en `dudas-view.tsx`, volviendo a la llamada de `023b450`:** hace caer CH6-B16 (c) de Dudas por conteo. En el mismo componente, el efecto de `setOptions` corre antes que el de `useAlPulsarLaSeccionActiva` y lanza la primera petición. Después, `refetch()` con `cancelRefetch: true` la cancela y lanza otra. Son dos peticiones.
- **PR-3, `isFetching` y `cancelRefetch: false` quitados a la vez:** cae CH6-B16 (e), porque `refetch()` cancela la petición retenida.
- **`huella` y la limpieza de `useMarcarViejaSiQuedoEnError`:** caen CH6-B02 (a) y (b), con el error armado a mano. Sin `huella`, el efecto no vuelve a correr al cambiar la clave y la clave anterior no se marca.
  - **Lo que pregunta el orquestador sobre CH6-B02 (b):** el estado "en error sin `isInvalidated`" no ocurre en producción con 5.103.2. A `status: "error"` solo se llega por la acción `error`, que lo marca (`query.js:450-462`). Una reversión restaura un estado que ya venía marcado (`:357-362`), y ningún código de producción llama al `setState` de una consulta.
  - Ese caso **solo fija la garantía escrita** de PR-2, para el día en que cambie la librería, como se aceptó en ADMIN-01. No prueba una conducta que la persona pueda ver hoy. Lo acepto así, y el resumen del programador lo dice con esas palabras.
- **`useMarcarViejaSiQuedoEnError` en la vista de Avisos:** la redundancia está bien declarada, con su mecanismo (la acción `error`), y CH6-B04 sigue como caso de camino.
- **`useListaConservadaTrasLaPagina` devolviendo solo `ahora`:** caen CH6-B10 (la recuperación), CH6-B16 (f), CH6-B18 (a) y (e). En cuanto se despacha la recarga, `ahora` es falso y vuelve el `role="alert"`.
- **La marca sin la clave:** cae CH6-B18 (e), con `renderHook` y otra clave con el mismo contador. Ver N-05.
- **El argumento de `useFocoAlPasarAError` de vuelta a `isError`:** la fila deja dicho qué hacer si no cae (declarar la redundancia con su mecanismo y nombrar el caso que sí lo vigila). Es lo que pide la regla del 2026-11-11, así que no lo cuento como hueco.
- **Las filas de la Enmienda 3 que no cambian** (las claves de `useAvisoDeRecargaFallida`, H-R2, el bloque de la clave de `useRenovarSiLaPublicacionYaNoEsta`, red o `5xx`, y §D-6 (b)) las verifiqué en la revisión anterior y siguen cayendo.

### Las dos condiciones del humano sobre O-08
- **(a) La renovación no mueve el foco:** CH6-B16, en (b), (c) y (f), con los tres puntos de partida del foco. N-01 está corregido (`:357-366` y la viñeta de Avisos de CH6-B16): el foco se queda en «Ver más» de B si existe (ATQ-CH6-31), y si la respuesta trae filas nuevas va a la primera fila nueva de B.
- **(b) Si falla, el aviso es el de B:** CH6-B17, en las cuatro vistas, con la renovación de A en vuelo. Las cuatro listas no consumen `signal`, así que ese fallo sí llega.

### La lista cerrada y C-3 a C-18
- **Lo que M-01 y M-02 obligaron a tocar está inventariado:**
  - las fábricas de C-15 y C-16 suman `useListaConservadaTrasLaPagina: () => false`;
  - los dos ganchos de `components/seccion/hooks.ts` se importan sin pasar por `./hooks` (N-02, `:381`).

  Volví a buscar `vi.mock` de `./hooks` y de `@/components/seccion/hooks`: solo están esas dos fábricas. Ninguna otra prueba dobla `features/clases/hooks.ts`, así que el gancho nuevo no rompe ninguna más.
- **C-6 y C-18 cuentan los avisos desde el inicio de cada caso** (N-03).
- **La vigilada ATQ-CH6-29 y 32 queda con la explicación correcta** (`:752`).
- **El conteo de 38 (hasta 41) se sostiene:** ni la 3b ni M-02 suman archivos.

### Problemas que no bloquean
- **N-05 — Sobre la clave de `useListaConservadaTrasLaPagina`, ningún caso de vista vigila el salto en negativo.** La Regla de la clave pide un caso con el salto de clase por cada gancho con memoria. CH6-B16 (f) es el salto en positivo, y la mutación "sin la clave" solo la hace caer `renderHook` (CH6-B18 (e)).
  - En Avisos y en Dudas, que sobreviven al cambio de clase, falta el salto en negativo: A con su lista conservada (marca `A:n`) y B en error por una **recarga**, con el mismo `errorUpdateCount` `n`. Al llegar, B debe mostrar su `MensajeError` mientras vuela su renovación.
  - Se resuelve sin enmienda: el programador arma así una de las variantes de CH6-B16 (c) en Avisos y lo dice en el resumen.
- **N-06 — Un caso extremo de la marca, sin caso propio.** Si la consulta se vacía con la vista montada (`removeQueries` o `clear` de `features/auth/hooks.ts:46` y `:118`, al cambiar de sesión), `errorUpdateCount` vuelve a 0. Un fallo de recarga posterior podría repetir el número de la marca y conservar la lista sin deber.
  - Al cambiar de sesión la vista se desmonta, así que no lo veo alcanzable.
  - Si el programador quiere cerrarlo, basta sumar `errorUpdatedAt` a la marca. No lo exijo.

### Detalles menores
Quedan tres frases vivas con el mecanismo viejo. No cambian ninguna instrucción, porque las líneas de la 3b que las rodean ya dicen el correcto:
- `:649`: "En CH6-A21, B sale en error y PR-2 la marca". La marca la pone la librería.
- `:792`: CH6-B12 (c) conserva "(PR-2)" justo antes de su corrección.
- `:902`: "piden según `refetchOnMount` y PR-2".

### Para el humano
Nada. La 3b eligió la salida 1 de M-02 (la lista sigue a la vista mientras se recupera), que no requería su decisión. La decisión de no partir 06b (38, hasta 41) y la de O-08 se respetan.

### Para el orquestador
Se puede arrancar 06b con la ronda 0 del tester (paso 12).

## Verificación de la Enmienda 4 — CHORE-06b (2026-11-12)
Manager, modo plan. Solo lectura; no corrí pruebas. Revisé:
- `plan.md`: 1109 líneas, SHA-256 `306b9594d316f3212934cb496765b305eb17ff5c0118ad0394d3040652acda05`, comprobado;
- la copia de antes `plan-ch6-antes-e4-48f981d7.md` (`48f981d7…`, comprobado). El `git diff --no-index` completo da 114 inserciones y 14 borrados, y leí todos los hunks;
- `resumen-programador.md:590-674`, con P-1 y P-2;
- `reporte-tester.md`, ronda 0 de 06b;
- el árbol actual: 38 archivos en `frontend/`, con los cambios de 06b sin commit;
- `@tanstack/query-core` 5.103.2 instalado.

**Veredicto: CAMBIOS REQUERIDOS.** Hay un problema que bloquea (M-01): la condición nueva de P-1 deja sin cumplir un camino de la frase «Vuelve a abrir Calificaciones». Lo demás está bien:
- P-2 es correcto contra la librería, con una observación (N-01);
- el inventario de marcas está completo;
- C-19 y C-20 conservan la intención de sus pruebas, con un ajuste que no bloquea (N-02);
- el conteo de 40 archivos es cierto;
- acepto la desviación de C-17.

Ningún punto va al humano.

### Problemas que bloquean
#### M-01 — Con la frase solo "a la vista", ir a otra ventana antes de pulsar, salir o saltar deja la ventana vacía vieja en la caché
**Dónde:** §D-6, "(Enmienda 4, P-1) La forma de (a)" (`plan.md:530-547`). También la limpieza de (b) (`:529`; la misma condición en `gradebook-view.tsx:163-172` del árbol) y CH6-B14.

**El hecho:**
- La frase de la ventana vacía deja «Alumnos anteriores» a la vista ("el resumen y la navegación siguen, para poder regresar"; `gradebook-view.tsx:132-136`).
- **Regresar no marca la ventana vacía.** La deja fresca en la caché, y volver a avanzar la sirve de ahí sin pedirla. Lo fijan dos pruebas:
  - CAL-1D02ac (`gradebook-01d.test.tsx:1222-1251`): `llamadas.slice(desde)` en 0 e `isInvalidated` de la ventana vacía en `false`;
  - CAL-T-201.
- El camino que falla:
  1. la persona ve la frase en la ventana W;
  2. pulsa «Alumnos anteriores», y la frase desaparece;
  3. hace lo que le pidió la frase: pulsa «Calificaciones», o sale y vuelve, o salta de clase y regresa;
  4. en el render del paso 3, `ocurrenciaDelCursor` es `null`, así que ni (a) ni (b) marcan nada;
  5. «Alumnos siguientes» pide la misma clave antes de 30 s, porque la primera ventana trae el mismo cursor. Es el escenario de CAL-T-248.

  Resultado: W se sirve vieja de la caché y la frase vuelve.
- `AGENTS.md` (frases de recuperación) exige cubrir cada camino que la interfaz permite, "otra ventana" entre ellos.
- **El hueco no es solo de la Enmienda 4.** En (b) y en el salto ya estaba en el plan aprobado, porque la limpieza siempre pidió la frase a la vista. La Enmienda 4 lo extiende a (a), donde la 3b marcaba siempre.

**Qué se espera:**
- **La condición de (a) y de (b) pasa a "la frase se vio en esta vista desde la última marca de N-52",** no "se ve ahora". Por ejemplo, una ref que se enciende cuando hay una ocurrencia y se apaga al marcar, sumada a la ocurrencia del render en curso.
  - Con eso no cambia nada de lo que la Enmienda 4 quería conservar:
    - la tabla sana, sin frase en ese montaje, no marca (CAL-1D03e);
    - CAL-1D03d, C-19 y C-20 dan las mismas cifras;
    - en C-20, la primera pulsación apaga la marca y la segunda no marca.
  - El arquitecto revisa que ninguna otra prueba del inventario cuente marcas después de regresar y pulsar o desmontar. En mi grep no hay ninguna: CAL-T-241 y CAL-1D02ac no pulsan ni desmontan.
- **CH6-B14 suma un caso por camino** (pulsar, salir y volver, saltar de clase y regresar): con la frase vista en W, «Alumnos anteriores» y después ese camino; «Alumnos siguientes» pide W una vez. Su mutación es volver a la condición "solo a la vista".
- **El conteo no cambia:** 40 archivos.
- **No requiere al humano:** es cumplir N-52, ya decidido, por un camino que la regla obliga a cubrir.

### P-1, camino por camino (con la condición de la Enmienda 4)
| Camino de «Vuelve a abrir Calificaciones» | ¿Marca? | ¿Se cumple N-52? |
|---|---|---|
| Pulsar la sección con la frase a la vista | Sí, por (a) | Sí (CH6-B14 (a) y CAL-1D03d) |
| Salir y volver con la frase a la vista | Sí, por la limpieza de (b) | Sí (CH6-B14 (b) y CAL-T-248) |
| Saltar de clase con la frase a la vista | Sí: `key={claseId}` monta de nuevo y corre la limpieza de A | Sí (CH6-B14 (d)) |
| Repetir el control que falló | El `400` deja la ventana en error y la librería la marca (`query.js:450-462`). La ventana vacía se rige por CAL-T-201, con la vista quieta | Sin cambio |
| Otra ventana («Alumnos anteriores») y después pulsar, salir o saltar | **No** | **No (M-01)** |
| Tabla sana y pulsar | No; solo pide la primera ventana | Sí (CAL-1D03e, CH6-B14 (e)) |

Que pulsar no marque con la tabla sana es correcto, y la razón para no ensanchar la marca de `useRecargarLaPrimeraVentana` también. Subir el cálculo de `ocurrenciaDelCursor` por encima de `useAlPulsarLaSeccionActiva` no cambia el orden de los ganchos: son líneas puras.

### P-2 contra la librería (5.103.2)
Todas las citas son exactas:
- `queryClient.js:297-306`: marca todas las consultas que pasan el filtro y después llama a `refetchQueries` con `type: "active"`;
- `:326-329`: `cancelRefetch` vale `true` por omisión;
- `utils.js:40-47`: la consulta activa se filtra antes que el `predicate`;
- `query.js:214-218`: `isStaleByTime`;
- `:284-286`: `invalidate()` no hace nada si ya está inválida;
- `:298-303`: `fetch` con una petición en vuelo.

Los dos efectos son reales: `clase-layout.tsx:49` y `clase-anterior-view.tsx:31`. Lo que comprobé, caso por caso:
- **Una lista sin datos:** `listaTraeLaClase` da falso y no se toca. Cuando la pida, la respuesta ya no trae la clase. Bien.
- **Un inicio inactivo que la recolección borra** (5 min): sale de la caché y se pide de cero al montarse. Bien.
- **Un inicio inactivo que se invalida:** se pide al montarse, por `isInvalidated`. Mientras llega se ve la clase un momento, como cualquier lista vieja. Bien.
- **La segunda corrida del efecto:** el `predicate` y el filtro de activas evitan pedir de nuevo. La mutación del `predicate` hace caer CH6-B15, con 3 peticiones del alumno donde se esperan 2, como observó el programador.
- **`{ cancelRefetch: false }`:** su fila de mutación cae, siempre que el caso retenga la barra, como dice la fila. Ver N-01.

### Inventario de las marcas (mi grep)
Busqué `marcasViejas|espiarMarcas|marcas\(\)|refetchType|spyOn(…, "invalidateQueries")|isInvalidated` en las pruebas de `frontend/src`. Salen 27 archivos.
- **Los nueve que el plan no nombra** no cuentan marcas del gradebook ni la forma de la invalidación de las listas del inicio:
  - `app/estado-por-id-ch6.test.tsx`, `app/invalidaciones-03c2-r1.ataque.test.tsx`, `alumnos-view.test.tsx`, `clase-archivada-01d1-vista.test.tsx`, `clase-archivada-01d2-vista.test.tsx`, `formulario-publicacion.test.tsx`, `guardas-ch4.test.tsx` y `recursos-03d.test.tsx` leen `isInvalidated` de otras claves o preparan el caso con `invalidateQueries`;
  - `clases-admin-01c.test.tsx:310` (ADM-1C14) espía `invalidateQueries`, pero con `toContain` sobre las claves de sus mutaciones. Una llamada más con `predicate` no lo rompe.
- **De los espías de las marcas del gradebook,** solo cambian las tres que dice el plan:
  - `gradebook-01d-r3:210`: CAL-T-232, 234 y 246 cuentan antes de desmontar; CAL-T-242 desmonta sin frase; CAL-T-244 desmonta con frase (C-19);
  - `gradebook-01d:1225`, `:1256`, `:1335` y `:1363`: CAL-1D03d cambia y CAL-1D02ac, CAL-1D02ad y CAL-1D03e no;
  - `secciones-01d-r4:197`: CAL-T-258 (C-20).
- **CAL-1D03d se puede escribir como dice la entrada 6:** `DESTINOS` (`:671`) y `claveGradebook` (`:6`) existen.
- **Las líneas de C-19 y C-20 son exactas.** `gradebook-01d.test.tsx` y `secciones-01d-r4` no cambiaron contra `023b450`, y `gradebook-01d-r3` solo cambió en C-8.
- **El inventario sigue valiendo con el remedio de M-01:** ninguna de estas pruebas regresa a otra ventana y después pulsa o desmonta.

### C-19 y C-20: conservan la intención
- **C-20:** la marca de N-52 se comprueba entre las dos pulsaciones, y la segunda, con la tabla sana, no marca. Sigue vigilando "ninguna pulsación repite la marca de la ocurrencia".
- **C-19 (CAL-T-244):** sigue vigilando que mientras llega la ventana y al llegar no se agreguen marcas, porque la base de 2 es fija: una por la ocurrencia y otra por la limpieza de (b). Pero mezcla las dos cosas en una sola cifra. Ver N-02.

### Problemas que no bloquean
- **N-01 — `{ cancelRefetch: false }` se puede unir a una petición de la barra que salió antes de saber que la clase estaba archivada.**
  - Si la barra ya estaba pidiendo cuando corre el primer efecto, la invalidación se une a esa petición (`query.js:298-303`). Si el servidor la contestó antes de archivar, la barra se queda con la clase hasta la siguiente recarga.
  - En el maestro, el efecto no vuelve a correr. En el alumno, la segunda corrida llega casi siempre antes de esa respuesta y vuelve a unirse a ella.
  - El propio gancho documenta lo contrario para "Clases anteriores" (`features/clases/hooks.ts:449-452`, T-04 de ADMIN-01d2): "lo que está en vuelo se pidió antes de saberlo".
  - El daño es bajo: la clase se abre en solo lectura y desaparece en la siguiente recarga, en 30 s.
  - Basta declararlo en "Riesgos" (o en "Decisiones tomadas que no son hallazgo") como precio de PR-3. Pido esa línea en la misma enmienda de M-01.
- **N-02 — C-19 mezcla en una cifra la marca de la limpieza y el "ninguna marca más".** Mejor: después de `primera.unmount()` (`:591`), `const tras = marcas(); expect(tras).toBe(2)`, y al final `expect(marcas()).toBe(tras)`. El tester lo aplica sin enmienda si el arquitecto lo deja escrito en C-19.

### La desviación de C-17: aceptada
- En `023b450`, `encabezadoAlumnos` (`alumnos-b-r5.ataque.test.tsx:197`) solo se usaba en `:325`, la línea que C-17 reescribe. Quedó sin uso, y el lint lo rechaza.
- Borrarla no cambia lo que vigila ninguna prueba.
- El diff contra `023b450` es exactamente C-17 más esa línea.

### Pasos de reanudación y conteo
- **R-0 a R-4 están en buen orden:**
  - el tester aplica C-19 y C-20 antes, como pide `AGENTS.md`;
  - después van la lista cerrada, P-1, P-2, la corrida corta y los pasos 18 a 20 completos, con la suite de "Regresión" otra vez.

  Con M-01, R-2 cambia de condición y CH6-B14 suma sus casos. R-4 debe contarlos.
- **Conteo:**
  - en el árbol hoy hay 38 archivos;
  - R-0 suma `secciones-01d-r4.ataque.test.tsx`, porque `gradebook-01d-r3` ya cuenta por C-8;
  - R-1 suma `gradebook-01d.test.tsx`.

  Total: **40** = 19 + 4 + 4 + 13, hasta 43 con las tres condicionales, que no cayeron. Sin las condicionales no pasa de 41, así que la decisión del humano de no partir sigue valiendo.

### Para el humano
Nada.

### Para el orquestador
- Devolver M-01, con N-01 y N-02, al arquitecto para una Enmienda 4b corta.
- Antes, guardar la copia de `plan.md` (`306b9594…`).
- El tester no aplica C-19 hasta que 4b la confirme (N-02).

## Verificación de la Enmienda 4b — CHORE-06b (2026-11-12)
Manager, modo plan. Solo lectura, sin pruebas. Revisé:
- `plan.md`: 1156 líneas, SHA-256 `201dc71fa4539ac3af13fd59a1a2ff0cf26b937a5cb0224215eef41239094984`, comprobado;
- la copia de antes `plan-ch6-antes-e4b-306b9594.md` (`306b9594…`, comprobado). El `git diff --no-index` completo da 54 inserciones y 7 borrados, y leí todos los hunks;
- el árbol actual: 38 archivos en `frontend/`, con `gradebook-view.tsx` y `components/seccion/hooks.ts` como están.

**Veredicto: APROBADO.** M-01, N-01 y N-02 quedan cerrados. Solo queda un detalle de texto, que no cambia ninguna instrucción. Nada va al humano. El conteo sigue en 40 (hasta 43).

### M-01: cerrado. El orden de los efectos
- **`useAlPulsarLaSeccionActiva`** (`components/seccion/hooks.ts:8-15`) llama a `alPulsar()` dentro de su `useEffect([key, alPulsar])`, en la confirmación del render en que llega la `location.key` nueva. El primer render no cuenta: la ref nace con la `key` de ese momento.
- **En una misma confirmación, React corre los efectos pasivos de un componente en el orden en que se declaran.** El efecto que enciende la frase (sin dependencias, `plan.md:552-554`) va antes de la llamada al gancho. Así:
  - **la frase llega en el mismo render que la pulsación:** primero la enciende y después el manejador la marca y la apaga;
  - **la frase se vio en una confirmación anterior:** la ref ya está encendida;
  - **el primer render tras un montaje:** el gancho no dispara, así que no hay nada que ordenar.
- **Leer la ref en el manejador es seguro.** El manejador es el cierre del render, pero las refs se leen en el momento de la llamada.
- **Después de marcar, nada la vuelve a encender.** El render siguiente ya está en la ventana inicial: con `keepPreviousData`, `ventanaVaciaConCursor` pide `!isPlaceholderData` y una ventana con cursor, y la ventana inicial no está en error. Así que la ocurrencia es `null`. Aunque no lo fuera, la comparación con `fraseMarcadaRef` impide encenderla otra vez.
- **Precondición:** el cálculo puro de `ocurrenciaDelCursor` tiene que ir antes de ese efecto y de `useAlPulsarLaSeccionActiva`. Ya lo pide la Enmienda 4 (`:541`), y moverlo no cambia el orden de los ganchos.

### M-01: la limpieza con dos refs
- **El efecto `[marcarViejasLasVentanas]` lee en su limpieza el valor actual de las refs, no el de su cierre.** Es lo correcto: son las refs de la instancia que se desmonta.
  - `marcarViejasLasVentanas` lleva el `claseId` de su cierre (`useCallback([claseId, queryClient])`, `features/calificaciones/hooks.ts:99-107`).
  - Con `key={claseId}`, la instancia de A marca las ventanas de A y nunca las de B (CH6-B14 (d) y (h)).
- **"La frase aparece y la vista se desmonta" no deja una frase sin marcar:**
  - si el render con la frase no llega a confirmarse, la persona nunca la vio;
  - si se confirma, React vacía los efectos pasivos pendientes antes de la confirmación siguiente, así que el efecto que la enciende corre antes de la limpieza que desmonta.
- **`StrictMode`:** la limpieza simulada marca a lo más una vez de más, sin pedir nada. Después, la frase ya está en `fraseMarcadaRef` y no se vuelve a encender. La ventana queda marcada, así que la marca de la pulsación siguiente sobra pero no falta. Está declarado en `:1026`.
  - **Matiz sin efecto:** al primer montaje casi nunca hay frase, porque los datos no llegan antes de la limpieza simulada. El caso descrito en `:557` (CAL-1D02ad) solo ocurre con la caché ya llena.

### M-01: los casos y las cifras
- **(f), (g) y (h) se pueden armar** con el escenario de CAL-T-248, el que `gradebook-01d-r3` ya monta:
  - «Alumnos anteriores» pide la primera ventana, que `useMarcarViejoElGradebook` marcó, y vuelve con el mismo cursor, así que W tiene la misma clave;
  - CAL-1D02ac fija que W queda fresca y sin marcar.
  - **(f)** marca al pulsar; **(g)** marca en la limpieza; **(h)** marca en la limpieza de la instancia de A, y al regresar A pide su primera ventana y W.
- **Las mutaciones:**
  - **volver a "se ve ahora":** caen (f), (g) y (h), porque W se sirve de la caché;
  - **no apagar la frase:** cae la segunda pulsación de C-20 y la última de (f);
  - **quitar la comparación con `fraseMarcadaRef`:** debería caer (f). Mientras se vuelve a pedir W, la consulta tiene sus propios datos (no los de respaldo), así que `ventanaVaciaConCursor` es verdadero con la misma ocurrencia `vacia:<dataUpdatedAt>`. Sin la comparación, la frase se encendería otra vez. La salida, por si no cae, está escrita (`:968`).
- **Las cifras no cambian:**
  - **CAL-1D03d:** la frase se ve al pulsar, así que suma una marca;
  - **CAL-1D03e:** sin frase, cero marcas;
  - **C-20:** la primera pulsación suma una y apaga la frase; la segunda, sin ocurrencia, no marca;
  - **C-19 en su forma nueva:** `tras` es 2 (una marca de `useMarcarViejoElGradebook` por la ocurrencia y otra de la limpieza, con la frase vista y sin marcar). El montaje nuevo nace con las refs en `null`, la primera ventana vacía "de verdad" no tiene cursor y no hay ocurrencia, así que el final es igual a `tras`.
- **Las líneas de C-19 son exactas:** `:591`, y `:626` pasa a `:629` con las tres líneas nuevas.

### N-01 (R-12) y N-02: cerrados
- **R-12 basta como declaración.** Trae:
  - el mecanismo, con su línea;
  - el choque con `hooks.ts:449-452`;
  - por qué se acepta, como precio de PR-3;
  - el daño, bajo y que se corrige solo: abrir la clase vuelve a correr el efecto, el `predicate` encuentra la barra con la clase y la renueva;
  - por qué no hay remedio barato.

  Está también en "Decisiones tomadas que no son hallazgo" (`:1025`).
- **N-02:** C-19 separa la marca de la limpieza del "ninguna marca más".

### Detalles menores
- Siguen vivas, sin marca de reemplazo junto a ellas, tres frases de la Enmienda 4:
  - "solo con la frase … a la vista" en `:50`;
  - "La forma de (a): solo con la frase a la vista" y "*El cambio* … `ocurrenciaDelCursor !== null`, la misma condición que la limpieza de (b)" en `:539-540`;
  - la frase original de (b) en `:538`.

  No cambian ninguna instrucción: `:547` dice expresamente que la 4b las reemplaza, "tanto al pulsar como en la limpieza", y R-2 (`:1121`) también. Si hay otra enmienda, conviene marcarlas.

### Para el humano
Nada.

### Para el orquestador
El tester aplica C-19 (con la forma de la 4b) y C-20 (R-0), y después el programador reanuda en R-1.

**Fe de erratas de esta sección:** el efecto que enciende la frase está en `plan.md:550-552`, no en `:552-554`, y el párrafo de `StrictMode` está en `:560`, no en `:557`. El contenido no cambia.

## Verificación del resumen del programador — CHORE-06b (2026-11-12)
Manager. Contra `resumen-programador.md` (925 líneas, SHA-256 `6e7e816d…` comprobado), "## Implementación — CHORE-06b" (el registro de la parada) y "## Reanudación — CHORE-06b: R-1 a R-4 y pasos 18 a 20". Plan `201dc71f…` (1156 líneas, comprobado), con las Enmiendas 1 a 4b; manda la posterior. Base `023b450`. Leí `reporte-tester.md` (ronda 0 y ronda 0 bis de 06b), el diff completo de producción y de la lista cerrada, y las cuatro pruebas nuevas completas. Equipo con corriente (`Win32_Battery.BatteryStatus` 2). Según el orquestador, la otra copia de trabajo ya no se usa. Corrí una cosa a la vez y no corrí la suite completa, que va en la revisión final. No hice mutaciones.

**Veredicto del resumen: DEVUELTO, con dos hallazgos (M-01 y M-02).** Los dos son de pruebas que faltan o que afirman menos de lo que pide su viñeta. No hay que tocar código de producción. Todas las cifras coinciden, el diff se queda en lo que pide el plan y cada fila de "Mutaciones" de 06b tiene su corrida, con las redundancias ciertas contra la librería. Lo que falla es esto: la frase del cursor ("…Vuelve a abrir…", "Vuelve a abrirlos", "Vuelve a abrirlas", "Vuelve a entrar") solo tiene caso por el camino "pulsar". Para los demás caminos, el resumen cita casos que prueban otro error, o archivos que no recorren esos caminos. Además, el foco de CH6-B16 (f) cubre una sola de sus tres variantes. Después de la corrección, el tester puede atacar.

### Mis corridas (desde `frontend/`, una a la vez)
| Qué | Comando | Última línea (mía) | Resumen |
|---|---|---|---|
| lint | `npm run lint` | `> tsc -b`, salida 0 (antes, `All matched files use Prettier code style!`) | igual |
| regresión de 06b | `npx vitest run src/features/clases src/features/calificaciones src/features/admin src/components/seccion src/app src/lib` | `Tests  5367 passed (5367)` (`Test Files  240 passed (240)`; `Duration  292.92s`) | `5367 passed (5367)` y `240 passed (240)`: coincide |
| build | `npm run build` | `✓ built in 789ms`, salida 0 | `✓ built in 804ms`: coincide (el tiempo varía) |
| conteo | `npx vitest list` de las cuatro pruebas nuevas, contado con `grep -a -c '> CH6-B'` | 294 = 12 + 133 + 142 + 7 | 294 (12, 133, 142 y 7): coincide |

**Conteo por id**, con `grep -a -c "> CH6-Bxx"`: B01 9, B02 3, B03 25, B04 27, B05 3, B06 2, B07 7, B08 1, B09 3, B10 48, B11 45, B12 45, B13 4, B14 7, B15 7, B16 43, B17 8 y B18 7. Todos coinciden con las plantillas que nombra el resumen.

**V-01:** `sha256sum -c scratchpad/v01-ch6b-r0bis.txt` desde la raíz da 288 líneas, todas OK. El programador no tocó ninguna `*.ataque`.

### Problemas que bloquean

#### M-01 — La frase del cursor no tiene caso por cada camino (CH6-B04, B05, B06 y el salto)
**Dónde.**
- `features/clases/recargas-ch6.test.tsx`: CH6-B04 (`:789-840`), CH6-B05 (`:878-902`) y CH6-B06 (`:908-925`).
- El resumen: la tabla "Frases de recuperación: el caso de cada camino" (`resumen-programador.md:891`) y la viñeta de CH6-B06 (`:637`).

**Qué pasa.** `cursorVencido` (el `400` del cursor) solo se usa en CH6-B03 (pulsar) y en CH6-B18 (b) (`grep` de `cursorVencido`: `:719` y `:1812`). Para los demás caminos de esa frase, el resumen cita casos o archivos que no la ejercen:
- **CH6-B06.** El plan pide "cerrar y abrir los comentarios y las respuestas ("Vuelve a abrirlos", "Vuelve a abrirlas")". Esos dos textos son la frase del cursor (`TEXTOS_COMENTARIOS.cambioMientrasLosVeias`, `data.ts:571-572`; `TEXTOS_RESPUESTAS.cambioMientrasLasVeias`, `:855-856`). El caso arma la primera carga fallida con un `500`, cuyo mensaje es el genérico. Así, el caso afirma menos que su viñeta: nunca se ve "Vuelve a abrirlos" ni se comprueba que reabrir no repita el cursor vencido.
- **Otra sección y regreso.** CH6-B04 pide "con datos (una recarga o una página que falló)… en las 12". El caso "con datos" solo arma una recarga fallida (`503`), y la página que falló con el `400` del cursor no tiene caso. El resumen cita además "los existentes de `recuperar-ch3.test.tsx` y `consultas-ch3.test.tsx`", pero ninguno de los dos recorre una lista:
  - `recuperar-ch3.test.tsx` tiene CH3-B10 y CH3-B17, que son formularios (crear tema y editar clase);
  - `consultas-ch3.test.tsx` tiene CH3-B09, que solo comprueba el texto.

  Tampoco encontré, en otra prueba de `features/clases`, un caso de "salir y volver" con el `400` del cursor en esas listas.
- **Atrás y adelante.** CH6-B05 se arma con un `503` de recarga, no con el cursor.
- **Salto de clase.** El resumen cita CH6-B18 (b) para la frase del cursor, pero ese caso solo comprueba `isInvalidated` (la regresión de la librería). No comprueba que, al llegar a la clase con la frase, la lista se pida desde la primera página sin el cursor vencido ni que la frase desaparezca.

**Por qué importa.** `AGENTS.md` ("Toda frase de recuperación…", decisión del 2026-10-26) exige un caso por camino y por frase, con el router real. Como mínimo son pulsar, ir a otra sección y regresar y repetir el control, más cada camino que permita la interfaz. Lo que importa en esta frase es no repetir el cursor vencido, y eso solo pasa con páginas ya cargadas, no con la primera carga fallida ni con una recarga. Según la regla del manager, la viñeta que falta y la cita equivocada devuelven el resumen. Además, `AGENTS.md` nació justo de caminos de "Vuelve a abrir…" sin inventariar (CALIFICACIONES-01d).

**Qué se espera.** Para la frase del `400` del cursor, un caso por camino, con el router real y la caché de `providers.tsx`. En cada uno se pide una vez, desde la primera página y sin el `cursor` vencido, la frase desaparece y no sale ningún aviso:
- (a) ir a otra sección y regresar antes de 30 s, en las 10 listas paginadas;
- (b) cerrar y volver a abrir los comentarios y las respuestas, con "Vuelve a abrirlos" o "Vuelve a abrirlas" a la vista antes de cerrar;
- (c) atrás del historial en Avisos, Dudas y el inicio del estudiante, las de CH6-B05;
- (d) el salto de clase en Avisos y Dudas, las dos paginadas de las cuatro que sobreviven: B con la frase del cursor y salto a B.

En lugar de un caso nuevo, se puede citar uno existente, pero con archivo y título exacto por lista y por camino, y que de verdad arme el `400` del cursor con páginas cargadas. Hay que corregir la tabla de frases y la viñeta de CH6-B06 del resumen. Si alguno de estos caminos no cumple, es PA-1 y se detiene: no se ajusta el texto.

#### M-02 — CH6-B16 (f) no tiene dos de sus tres variantes de foco
**Dónde.** `features/clases/recargas-ch6.test.tsx:1477-1520`. El plan dice, en CH6-B16: "Foco, en (b), (c) y (f)".

**Qué pasa.** En (f) (B con su lista conservada tras un «Ver más» fallido), el único foco que se prueba es el del control segmentado. Ni el foco en una fila de A, que debe ir al `h2` de B y quedarse ahí tras la respuesta, ni el foco en «Ver más avisos» de A, que debe quedarse en «Ver más avisos» de B mientras está en espera y después de la respuesta, tienen caso en (f). Los casos "foco" (`:1543-1585`) cubren solo (b) y (c), y los de N-01 (`:1587-1678`) arman B vieja, no conservada.

**Por qué importa.** Es la condición (a) de DH-10 ("la renovación no mueve el foco") en el estado nuevo de M-02. Ahí la lista de B no se reemplaza mientras vuela, así que el foco que llega por el salto sigue un camino distinto al de (b) y (c).

**Qué se espera.** En Avisos y Dudas, con B en el estado (f):
- con el foco en una fila de A: tras el salto, en el `h2` de B, y ahí sigue después de la respuesta;
- (Avisos) con el foco en «Ver más avisos» de A: tras el salto, en «Ver más avisos» de B, en espera, y ahí sigue después de la respuesta.

Nunca en `<body>` ni en una fila de A.

### "Se toca" y "No se toca" (contra `023b450`)
- **40 archivos bajo `frontend/`:** 19 de producción, que son exactamente la columna 06b de §D-0 (uno nuevo, `components/seccion/types.ts`); 4 pruebas nuevas; 4 de la lista cerrada; y 13 `*.ataque` de la ronda 0 y la ronda 0 bis. Nada cambia en `shared/`, `backend/`, `infra/`, `package*.json`, `CLAUDE.md`, `AGENTS.md` ni `docs/DESIGN.md` (`git diff --stat`, vacío).
- **`features/clases/hooks.ts`:** cambian solo cinco cosas, todas permitidas por §D-4 a §D-6 y la Enmienda 3b:
  - las dos guardas de `fetchStatus` (`useRecuperarListaDeClasesAnteriores` y `useRecuperarListaDeClasesAdmin`);
  - `useClaseArchivadaEnSuLista`, con su ayuda `renovarLasListasSiTraenLaClase`;
  - `useListaConservadaTrasLaPagina`, con la forma literal del plan;
  - `useRenovarSiLaPublicacionYaNoEsta`, con la firma de cuatro argumentos y `clavePrevia`;
  - dos importaciones.

  `useAvisoDeRecargaFallida` no cambia de firma (en el diff solo aparece como contexto) y `useRenovarSiLaDudaYaNoEsta` no se toca.
- **`features/admin/hooks.ts`:** se quitan las dos definiciones y se reexporta el gancho en una línea, nada más. No quedó ninguna importación sin uso: el lint pasa.
- **`features/calificaciones/`:** en `hooks.ts`, solo `useMarcarViejasLasVentanas`. En `gradebook-view.tsx`, el cálculo de la ocurrencia sube sin ganchos entre medio, se agregan las dos refs con el efecto que enciende la frase antes de `useAlPulsarLaSeccionActiva`, y el manejador y la limpieza marcan y apagan. Es la forma de la Enmienda 4b.
- **Ningún gancho de mutación gana `mutationKey`:** `git diff 023b450 -- src | grep mutationKey` está vacío. Tampoco cambia ningún `enEspera` ni ninguna guarda de doble clic (PA-6).
- **Lo que fija CH6-A30 y "No se toca, además":** las `key` de los formularios, `creandoEn !== claseId`, las `key` de las secciones, la línea de H-R2 en `enfocarPublicacion` y `enfocarDuda`, y la clave de los cinco llamadores de `useAvisoDeRecargaFallida` no aparecen en el diff.
- **Las 12 listas importan los dos ganchos de `@/components/seccion/hooks`** (N-02). Cada clave sale de la misma función que usa el gancho de la consulta (`claveDudas`, `claveTemasDeLaSeccion(claseId, bloque)`, `claveRecursos`, `claveTrabajo(claseId, seccion.clave)`, `claveComentarios`, `claveRespuestas`, `clavePersonas`, `claveAlumnos`, `clavePublicaciones` y `CLAVE_CLASES_*`). Lo cotejé con `features/clases/hooks.ts:203-214`, `:769-780`, `:1045`, `:1124`, `:1265`, `:1280`, `:1605`, `:1789` y `:1809`.

### Lista cerrada
Los cuatro archivos cambian exactamente lo que dice su entrada:
- `ver-mas-y-orden-ch4.test.tsx`: la ayuda `comprobarFalloDeLaPagina`, que solo usan CH4-30 (c) y CH4-31 (c), sus dos títulos y aserciones (las filas, un aviso, ningún `role="alert"`, «Ver más» fuera de espera y, en los inicios, sin `TEXTOS_PANEL.error`) y la importación de `mensajeDeConsultaClases` en lugar de `mensajeDeErrorDeLista`, que quedó sin uso. El cambio de importación está declarado.
- `personas-view.test.tsx:263-277`: el título, el espía de `toast.error`, que se restaura al final del caso, sin `role="alert"`, «Ver más alumnos» fuera de espera y con el foco. `:276` no cambia.
- `publicacion-del-muro.test.tsx`: solo el `MemoryRouter`.
- `gradebook-01d.test.tsx` (entrada 6): el título de CAL-1D03d, `marcas + 1` y la línea de `isInvalidated` de `DESTINOS[caso.pulsar].destino`. CAL-1D03e no se toca.

Las tres condicionales (PR-C18, C-10 y C-14) siguen en verde sin tocarse, en mi corrida.

### Pruebas requeridas (contraste caso por caso)
Todos los títulos del resumen existen tal cual (plantillas de `it.each` incluidas). Salvo lo de M-01 y M-02, cada caso afirma lo que pide su viñeta:
- **CH6-B01 y B02:** (a) a (i) con su conteo exacto. (e) comprueba que la única petición nueva no lleva `cursor`; (f) y (g) usan la petición retenida y aplican su respuesta; (h) monta con datos viejos y `refetchOnMount: false`. B02 arma el error sin `isInvalidated` con `setState`, como pide la Enmienda 3b.
- **CH6-B03:** las 12 listas con la primera carga fallida, las 10 paginadas con el cursor sin repetirlo, el enlace del control segmentado y «Inicio» de la barra.
- **CH6-B04:** "sin datos", "con datos" (recarga) y (c′) en Avisos, Personas y el inicio del estudiante. La parte M-02 va en CH6-B10 (volver). El hueco del cursor es M-01.
- **CH6-B07 a B09:** las siete de H-2, con datos y la petición retenida; O-03 con los conteos renovados; los tres caminos del hermano de T-07.
- **CH6-B10 a B13:** el `500` y la red en las 9 listas, con el foco en «Ver más» y el mismo cursor al repetir. Los tres caminos de recuperación (pulsar, volver y la recuperación que falla) en las 9, la invalidación por comentar y la fila con el foco en Avisos y Dudas. B11 cubre el `400` del cursor, el `VALIDACION` de otro campo, el `429`, el `403` y los dos `404`, más el `401` con `irA("/login")`. B12 (a) a (e), con (c) partido entre las listas sin `signal` y el tema de Actividades. B13: abrir, «Ver más comentarios», un recurso y dos fallos.
- **CH6-B14:** (a) a (d) y (f) a (h); (e) lo cubre CAL-1D03e, como permite el plan.
- **CH6-B15:** los siete casos, con el del maestro con el inicio en caché y el de la barra en vuelo.
- **CH6-B16 a B18:**
  - CH6-B16: (a), (b), (c) en sus dos variantes, N-05, (e), (f), el foco en (b) y (c) y las cuatro N-01;
  - CH6-B17: las tres plantillas;
  - CH6-B18: (a) a (e).

  El foco de (f) es M-02.

### Mutaciones
No hice mutaciones (no me tocan). La tabla del resumen cubre todas las filas de 06b del plan, incluidas las de las Enmiendas 3, 3b, 4 y 4b:
- M01 a M08 y M19;
- G1 a G6, que incluyen la limpieza de §D-6 (b) (fila `:985`, en G2);
- C1 a C4;
- D1 a D4;
- E1 a E6.

Cada fila dice qué se quitó, qué cayó y "cmp igual". Comprobé las redundancias declaradas contra `@tanstack/query-core` 5.103.2 (`node_modules/@tanstack/query-core/build/modern/`):
- **`isFetching` sola (M02 y M03):** `query.fetch` con `cancelRefetch: false` y una petición en vuelo devuelve la promesa que ya existe (`query.js:298-303`). Es cierta.
- **CH6-B01 (f) dentro de M04:** sin datos, `fetch` no cancela aunque `cancelRefetch` sea verdadero (`query.js:299` exige `data !== undefined`). Es cierta, y CH6-B07 y CH6-B16 (e), que sí tienen datos, la vigilan.
- **M05 (`useMarcarViejaSiQuedoEnError` en la vista):** la acción `error` pone `isInvalidated: true` (`query.js:450-462`). Es cierta. E1 y E2 vigilan el gancho con CH6-B02.

**Los dos casos que sumó el programador para que cayeran dos filas:**
- **«CH6-B15 (alumno, la barra en vuelo)»** (`recargas-ch6.test.tsx:1155-1175`). Retiene la petición de la barra que lanza el primer efecto, así que el segundo (`ClaseAnteriorView`) la encuentra en vuelo y todavía con la clase. Sin `cancelRefetch: false`, `fetch` cancela, porque hay datos, y pide otra: la barra sube a `barraAntes + 2` y el caso, que exige `+1` con la petición todavía retenida, cae. Vigila lo que dice. Es la retención que prevé la fila `:972` del plan.
- **«CH6-B16 (Avisos, N-01, B vieja y sin página siguiente al llegar)»** (`:1603-1621`). B llega sin página siguiente, así que «Ver más avisos» de A se desmonta en el salto. Sin la línea de H-R2, `useFocoAlCargarMas` toma las publicaciones de B como "filas nuevas" y lleva el foco a una de ellas. El caso exige el `h2` y cae. Vigila la fila `:975`.

### Hermanos, inventario de M-5, estados vecinos y matriz (contrastados con el código)
- **§D-4:** en `023b450` hay 16 llamadas a `useAlPulsarLaSeccionActiva(`. Hoy son 10: las 9 que no son de `features/clases`, más la base de `useRecargarAlPulsarLaSeccion`. A eso se suman 12 sitios con `useRecargarAlPulsarLaSeccion(` y 19 con `useMarcarViejaSiQuedoEnError(`: las 12 listas, una por bloque de Recursos, y `features/admin`. La tabla del resumen coincide, sitio por sitio, con las variantes registradas sin cambio.
- **§D-5:** las 9 listas tienen `useListaConservadaTrasLaPagina` con su clave, el error con `&& !conserva` y `useAvisoDeRecargaFallida(…, conserva, mensajeDeConsultaClases(…), clave)`. Además:
  - los inicios usan `errorALaVista` en el panel y en `BloqueDestacado`;
  - Personas, `cargada`;
  - las respuestas, las dos condiciones de `:270` y `:274` (la de `:181` no cambia);
  - `useFocoAlPasarAError` recibe `isError && !conserva` en Avisos y Dudas.

  `seccion-de-recursos.tsx` cambia solo PR-1.
- **§D-6:**
  - N-52 vive solo en el gradebook. "Mis calificaciones" no tiene ventanas, así que no le aplica, y es cierto.
  - `useClaseArchivadaEnSuLista` corre en `ClaseLayout` y en `ClaseAnteriorView` y llama a la ayuda con el `predicate`.
- **M-5, gancho por gancho:** cada clave del resumen es la del código.
  - `claseId` en Avisos, Dudas, el tema, Personas y el roster;
  - `publicacionId` en los comentarios;
  - `dudaId` en las respuestas;
  - `JSON.stringify(CLAVE_CLASES_*)` en los inicios;
  - `` `${claseId}:${publicacionId}` `` en `useRenovarSiLaPublicacionYaNoEsta`;
  - `huella` en `useMarcarViejaSiQuedoEnError`;
  - la `key` y el `claseId` del cierre en la limpieza del gradebook.

  Las memorias de módulo (`limiteDeTrabajo` y `limiteDeRecursos`) no cambian.
- **Estados vecinos de DH-10 y de las dos refs del gradebook:** cada fila nombra un caso que existe y afirma esa conducta. El foco de (f) es M-02, y la frase del cursor en el salto, M-01. `StrictMode` y "un fallo en el render del salto" van sin caso, con su razón (abajo).
- **Matriz de §D-7:** coteja con el código y los casos fila por fila. Junta las listas en una sola fila y separa las excepciones (Recursos y Actividades, el `signal` del tema). Una imprecisión menor en "Detalles". Las filas de "pulsar «Calificaciones»" (con y sin la frase) y de "la clase archivada leída dos veces" (alumno y maestro con el inicio en caché) están, como pide la reanudación.
- **Frases de recuperación:** la tabla cubre el texto de la consulta, el texto fijo del lugar, el aviso de «Ver más», «No pudimos actualizar…» y "Vuelve a abrir Calificaciones", y las citas de esas filas son correctas. La fila del cursor es M-01.

### Lo que arbitro (inciso 7 del encargo)
1. **R-3, sin `laTraen`: es cierto y equivalente.** El plan lo deja a elección del programador (Enmienda 4, `plan.md:581`: "puede quedarse o quitarse: el `predicate` ya decide. El programador dice cuál deja"), y él lo dice en `resumen-programador.md:703`. En 5.103.2:
   - `invalidateQueries` invalida `findAll(filters)` y después llama a `refetchQueries` con los mismos filtros, `predicate` incluido (`queryClient.js:298-306`);
   - `matchQuery` evalúa el `predicate` en los dos pasos (`utils.js:35-47`), con los mismos `state.data` dentro del mismo `batch`.

   Si ninguna consulta trae la clase, nada se invalida y nada se pide, como con `laTraen`. C3 (la forma anterior) y C2 (sin `predicate`) hacen caer sus casos.
2. **`StrictMode`: basta el razonamiento, y queda como punto de ataque.** El plan no pide un caso de 06b con `StrictMode`: ninguna viñeta CH6-B lo nombra. El paso 20 pide nombrar ese estado vecino en el resumen, y el resumen lo nombra con su porqué. "Puntos de ataque" 4 bis lo deja para el tester, y "Decisiones tomadas" acepta la marca de más del gradebook. Lo contrasté con el código:
   - `useListaConservadaTrasLaPagina` ajusta el estado en el render solo si la marca cambia, y en el doble render la marca es la misma;
   - el efecto de `useRenovarSiLaPublicacionYaNoEsta` no hace nada en el doble montaje, porque `fallosVistos` nace con el contador;
   - `useRecargarAlPulsarLaSeccion` no tiene memoria y se apoya en `useAlPulsarLaSeccionActiva`, que no cambia;
   - la limpieza del gradebook marca a lo más una vez de más, sin pedir nada.

   CH6-A13 (d) de 06a sigue en verde. No le pido un caso al programador; es el punto de ataque 4.
3. **El rojo primero de CH6-B14 (f): el caso sí vigila la condición nueva.** Antes de R-2, el árbol marcaba siempre al pulsar, así que W quedaba inválida y (f) cayó por su otra mitad, la pulsación con la tabla sana. Con "se ve ahora", en cambio, tras «Alumnos anteriores» `ocurrenciaDelCursor` es `null` en el render de la pulsación (la ventana inicial no tiene cursor), así que nada marca W. Entonces la espera de `wInvalidada(cliente)` en verdadero (`gradebook-ch6.test.tsx:308`) no se cumple y el caso cae. Eso es lo que reporta G4 (el efecto copia también el `null`): caen (f), (g) y (h). G5 y G6 vigilan la otra mitad. Lo acepto.
4. **La desviación de C-17 y R-12 están declaradas:**
   - C-17: `reporte-tester.md`, ronda 0, "Desviación para el manager" (la ayuda `encabezadoAlumnos`, que quedó sin uso);
   - R-12: `plan.md:1043-1048` y "Decisiones tomadas"; el resumen la repite en `:925`, sin caso.
5. **Estilo de `CLAUDE.md` en el código nuevo:**
   - `ConsultaQueSeRecarga` va en `components/seccion/types.ts`. El tipo en línea de `conservaLaListaTrasLaPagina` lo permite el plan, y el lint no lo rechaza. `useListaConservadaTrasLaPagina` recibe parámetros sueltos, sin tipo nuevo en el archivo de ganchos.
   - No hay textos nuevos: los avisos usan `mensajeDeConsultaClases` (`lib/errores-de-api.ts`).
   - Hay retornos tempranos en `listaTraeLaClase`, `traeLaClaseEnSusFilas` (sin `as`), las guardas de `fetchStatus` y la limpieza del gradebook.
   - No hay `any` ni `?? []`. El arreglo condicional de las respuestas (`pedir`) es una lista de argumentos, no un valor por defecto que oculte datos.
   - Las guardas de doble clic y los `enEspera` no cambian.

### Problemas que no bloquean
- **N-01 · La parte M-02 de CH6-B04 afirma menos que su viñeta.** En CH6-B10 (volver de otra sección) no se afirma "el foco donde lo dejó el montaje". Tampoco hay caso de que, al volver con la consulta en error por una **recarga**, el `MensajeError` siga mientras vuela, que es "como hoy" según DH-02 (a): CH6-B04 "con datos" no retiene la recarga. El salto lo fija N-05. Si el programador ya está en M-01, puede sumarlo ahí. Si no, va al tester (punto 2).
- **N-02 · CH6-B03 prueba los comentarios solo al pulsar «Avisos».** No prueba los comentarios de un recurso al pulsar «Recursos». El plan dice "«Avisos» o «Recursos»" y el componente es el mismo, así que no lo exijo. Va al tester (punto 5).

### Detalles menores
- El comentario de `useMarcarViejasLasVentanas` (`features/calificaciones/hooks.ts:95-98`) dice "al desmontarse con la frase … a la vista", que es la forma anterior a la Enmienda 4b. Debería decir "vista y sin marcar".
- En la matriz, la fila "Pulsar, en error con datos (recarga fallida)" dice "Recursos y Actividades: la lista". Lo cierto es que "Actividades (un tema)" reemplaza: solo los temas del bloque y de Actividades conservan.
- CH6-B13 («Ver más comentarios») no cuenta "un solo mensaje", como sí lo hace el caso "abrir". En `personas-view.test.tsx`, `aviso.mockRestore()` va al final del caso, no en un `finally`, como lo pide el plan.

### Para el tester (ronda 1), además de "Puntos de ataque para el Tester" del plan
Por prioridad:
1. **La frase del cursor por cada camino**, en las 10 listas paginadas, una vez corregido M-01: salir y volver, cerrar y abrir, atrás y adelante, y el salto en Avisos y Dudas. Que no se repita el cursor vencido y que la frase desaparezca.
2. **`useListaConservadaTrasLaPagina` en secuencias:**
   - una página que falla con `5xx` y después una recuperación que falla con un `4xx` (`403`, `404` en los comentarios);
   - una página que falla y después una mutación que invalida y falla, con el foco en una fila;
   - una recarga de fondo que falla sin un fallo de página antes, también al volver de otra sección: el `MensajeError` debe seguir mientras vuela (N-01);
   - el reflejo de N-05 en Dudas;
   - A → B → A → B con las dos listas conservadas.
3. **El gradebook por la otra dimensión.** CH6-B14 (f) a (h) usan solo «Alumnos siguientes» y «Alumnos anteriores». Hay que probar la frase de la ventana vacía de tareas (`cursorTareas`) y las dos dimensiones a la vez, y una segunda ocurrencia distinta después de haber marcado la primera.
4. **`StrictMode`** en las 9 listas, en los comentarios con un `404` y en el gradebook (inciso 7.2).
5. **Comentarios dentro de Recursos:** pulsar «Recursos» con los comentarios de un recurso en error o conservados, su «Ver más» con `5xx`, y `PUBLICACION_NO_ENCONTRADA` desde un recurso con el foco en el bloque (N-02).
6. **DH-10 con una página de A en vuelo**, no una recarga, que falla ya en B. Y el salto con B pidiendo una página.
7. **`listaTraeLaClase` con formas raras** (punto 5 del plan) y la clase archivada leída por el alumno con el inicio en caché y la barra ya respondida.

### Para el humano
Nada. M-01 y M-02 son pruebas que faltan o afirman menos que su viñeta, dentro del plan aprobado. No reabren ninguna decisión ni cambian el tamaño de 06b: van en archivos que ya están en la lista.

### Qué hace el programador
Corregir M-01 y M-02 en `features/clases/recargas-ch6.test.tsx` (o en `ver-mas-ch6.test.tsx`, si le acomoda) y la tabla de frases y la viñeta de CH6-B06 del resumen. Si quiere, también N-01 y el comentario de `useMarcarViejasLasVentanas`.

Cada caso nuevo se comprueba con una mutación real que lo haga caer, por ejemplo, pedir de nuevo con el cursor vencido en lugar de desde la primera página. Si no hay mutación que lo haga caer, declara la redundancia con su mecanismo.

En el resumen de la corrección van:
- los hermanos: cada lista paginada por cada camino;
- los estados vecinos del mecanismo: con datos y sin datos, cursor y `5xx`, y la vista montada o desmontada;
- `npm run lint`, la suite de `src/features/clases` y el conteo con `npx vitest list`, con su última línea.

Si algún camino no cumple con el código de hoy, es PA-1 y se detiene.

## Verificación de la corrección de M-01 y M-02 — CHORE-06b (2026-11-12)
Manager. Contra `resumen-programador.md` (1101 líneas, SHA-256 `f7db46f0…` comprobado), sección "## Corrección tras la verificación del manager — CHORE-06b: M-01 y M-02 (2026-11-12)" (`:927`). Plan `201dc71f…`. Leí los casos nuevos y los cambiados de `features/clases/recargas-ch6.test.tsx` (`:775-800`, `:878-919`, `:1007-1099` y `:1855-1979`), de `ver-mas-ch6.test.tsx` (CH6-B10 volver y CH6-B13) y de `personas-view.test.tsx`, y el diff del comentario de `features/calificaciones/hooks.ts`. Equipo con corriente. Sin otra suite corriendo. Corrí una cosa a la vez y no hice mutaciones.

**Veredicto: ACEPTADO. El tester puede atacar.** M-01 y M-02 quedan corregidos y las cifras coinciden. La mutación temporal en `components/foco/hooks.ts` (K14) se acepta como desviación menor, declarada y sin rastro en el árbol. No queda nada para el humano.

### Mis corridas (desde `frontend/`, una a la vez)
| Qué | Comando | Última línea (mía) | Resumen |
|---|---|---|---|
| lint | `npm run lint` | `> tsc -b`, salida 0 | igual |
| regresión de 06b | `npx vitest run src/features/clases src/features/calificaciones src/features/admin src/components/seccion src/app src/lib` | `Tests  5401 passed (5401)` (`Test Files  240 passed (240)`; `Duration  293.91s`) | `5401 passed (5401)` y `240 passed (240)`: coincide |
| build | `npm run build` | `✓ built in 830ms`, salida 0 | `✓ built in 795ms`: coincide (el tiempo varía) |
| conteo | `npx vitest list` de las 4 pruebas nuevas, con `grep -a -c '> CH6-B'` | 328 = 12 + 167 + 142 + 7 | 328 (12, 167, 142 y 7): coincide |

- Casos con "el 400 del cursor" en el título: 28. Son los 10 de CH6-B03, CH6-B18 (b) y los 17 nuevos (10 + 2 + 3 + 2), como dice el resumen.
- `git status --short frontend`: 40 archivos.
- `sha256sum -c v01-ch6b-r0bis.txt`: las 288 `*.ataque`, todas OK.
- `git diff --quiet 023b450 -- frontend/src/components/foco`: limpio.

### M-01: corregido
Los 17 casos se arman con el `400` del cursor de verdad, sobre páginas cargadas. `enErrorDelCursor` (`:718-727`) carga la primera página, hace fallar dos veces la petición con `cursor` usando `cursorVencido`, y espera la frase. En CH6-B05 y CH6-B16 se arma igual, inline. Antes del camino, cada caso comprueba que la frase de esa lista está a la vista. `FRASE_DEL_CURSOR` (`:1013-1024`) sale de los `cambioMientras…` de `data.ts` y, en Personas y el roster, de `mensajeDeConsultaClases` del mismo `400`. Además, CH6-B06 comprueba que la frase es "Vuelve a abrirlos" o "Vuelve a abrirlas".

Después del camino, `cumpleLaFraseDelCursor` (`:1034-1042`) comprueba cuatro cosas: que la lista se ve sin `role="alert"`, que sale **exactamente una** petición nueva de la lista, que esa petición va **sin `cursor`**, y que la frase ya no está y no hay ningún aviso. Todo con el router real (`rutas`) y las `defaultOptions` de `app/providers.tsx` (`nuevoCliente`, `:453-456`). Es lo que pide `AGENTS.md`: la acción vuelve a pedir lo que el texto promete, sin servir la caché que se sabe vieja (la petición nueva lo prueba), y el texto desaparece.

Los caminos que faltaban ya están:
- salir y volver en las 10 listas paginadas;
- cerrar y abrir en comentarios y respuestas;
- atrás en Avisos, Dudas y el inicio del estudiante, después de dos pulsaciones;
- el salto a B en Avisos y Dudas: B con la frase, se va a A y se regresa con el historial.

La tabla de frases del resumen se reemplazó y ya cita casos que existen y arman el error de cada frase. Ya no cita `recuperar-ch3` ni `consultas-ch3`.

### M-02: corregido
Las variantes nuevas arman B en el estado (f) con `conBConservada` (`:1880-1899`): «Ver más» de B falla con un `500` y deja un aviso, y la lista queda conservada y fuera de espera. Después se salta a A, se pone el foco y se regresa con la renovación de B retenida.
- **«CH6-B16 (f) (%s, foco en una fila de A)»** (Avisos y Dudas). Mientras vuela la renovación, el foco está en el `h2` de B, la lista de B se ve y no hay `role="alert"`. Después de la respuesta, el foco sigue en el `h2` y no hay ningún aviso más.
- **«CH6-B16 (f) (Avisos, foco en «Ver más avisos» de A)».** Mientras vuela, «Ver más avisos» de B está con `aria-busy="true"` y tiene el foco, sin `role="alert"`. Después de la respuesta, el botón sale de la espera, sigue con el foco, el foco no está en `<body>` y no hay ningún aviso más.
- **El hermano en el estado (c)** («CH6-B16 (c) (Avisos, foco en «Ver más avisos» de A)», `:1928-1947`). Como B no tiene «Ver más», el foco va al `h2`, mientras vuela y después de la respuesta. Es lo que dice el plan ("si no, va al `h2`").

Afirman el foco en espera y tras la respuesta, como pide la viñeta. K9 (devolver solo `ahora`) y K11 (quitar el envío al `h2` de la rama `clasePrevia`) hacen caer las variantes de (f), según la tabla.

### N-01, N-02 y detalles
- **N-01.** CH6-B10 (volver) guarda el foco del montaje y comprueba que sigue en el mismo elemento tras la respuesta. Es una afirmación débil (solo pide que no sea nulo y que no cambie), pero cumple la viñeta.
- **El caso nuevo de la recarga al volver** («CH6-B04 (%s, recarga fallida y la nueva petición retenida al volver)», 12 listas). Mientras vuela, en las listas que reemplazan sigue el `MensajeError`, y en las 3 con `conservaLaRecarga` se ve la lista sin `role="alert"`. Al responder no sale ningún aviso nuevo. K8 hace caer las 9 que reemplazan.
- **N-02.** «CH6-B03 (comentarios de un recurso, pulsando «Recursos»)» falla la primera carga de los comentarios del recurso, pulsa «Recursos» estando ahí y pide una vez. K10 lo hace caer.
- **Lo que cambió del doble del servidor** (3 comentarios en el recurso 1) no rompe nada: la regresión está en verde.
- **Detalles.** CH6-B13 («Ver más comentarios») cuenta un solo mensaje dos veces. En `personas-view.test.tsx` el espía se restaura en un `finally`. Sigue siendo la entrada de la lista cerrada, solo que el cuerpo queda dentro del `try`. El comentario de `useMarcarViejasLasVentanas` ya dice la condición de la Enmienda 4b. En producción no cambió nada más.

### Lo que arbitro
- **K14, la mutación temporal en `components/foco/hooks.ts` ("No se toca"): la acepto como desviación menor, sin hallazgo.**
  - "No se toca" protege el resultado contra la base, y el resultado no cambió: `git diff --quiet 023b450 -- frontend/src/components/foco` está limpio, y el programador comparó byte a byte.
  - Es el método que pide la regla de las mutaciones (`AGENTS.md`, "Pruebas", decisión del 2026-11-11: en el archivo real, restaurado), y la declaró en el resumen.
  - Pero el plan no la previó. No está en la tabla de "Mutaciones" y vigila un caso que el mismo programador sumó. Además, PA-4 pide detenerse antes de tocar un archivo de "No se toca".
  - El tester debe repetir V-01 y el `git diff --quiet` de `components/foco` al empezar su ronda.
  - Para lo que sigue: si una mutación necesita un archivo de "No se toca", se declara la redundancia con su mecanismo y se pregunta antes. No se toca el archivo.
- **K6 y K7 son redundancias ciertas, y los casos bastan para la regla de las frases.**
  - Lo comprobé en 5.103.2:
    - la acción `error` deja la consulta inválida (`query.js:450-462`) y `isStaleByTime` la da por vieja (`:212-218`);
    - al montarse, el observador la pide, y `infiniteQueryBehavior` vuelve a pedir solo las páginas que había, que es una sola porque la segunda falló, así que el cursor vencido no se repite;
    - plegar los comentarios no los quita de la caché, porque el único `removeQueries` de esa clave es el de una duda que se borra (`features/clases/hooks.ts:1976-1988`).
  - Los casos no dicen vigilar ninguna guarda nuestra. Prueban que la promesa del texto se cumple por ese camino, con nuestras vistas (`conserva` es falso ante un `4xx`, la rama de error y el montaje), que es lo que exige la regla de las frases de recuperación. No son vacíos: caerían si una de esas consultas dejara de pedirse al montarse, por ejemplo con `refetchOnMount: false` o un `staleTime: "static"` en su gancho, o si el `400` del cursor pasara a conservarse.
  - El caso del salto (d) y el de atrás (c) sí tienen remedio nuestro, y caen con K1 a K5.
  - No falta nada.
- **K12 y K13: acepto la redundancia.** En el estado (c), B no tiene «Ver más» ni publicaciones pintadas, así que la línea de H-R2 no tiene ninguna fila de B a la cual no mandar el foco (K12). Si se quita `enfocarEncabezado` (K13), la defensa de `useFocoAlCargarMas` lleva el foco al primer enfocable de la sección, que es el `h2`. Quitar los dos (K14) hace caer el caso. Es la misma forma que PR-3 (O-05).

### Hermanos de M-01 y M-02, contra las viñetas CH6-B
La lista del resumen (`:1013-1079`) coincide con las viñetas y con lo que leí:
- **Ya estaban:** CH6-B01 a B03, B07 a B15, B17 y B18, cada una armada con el estado o el código que nombra.
- **Lo que faltaba:**
  - CH6-B04, la página que falló con el `400`;
  - CH6-B05 y CH6-B06, con el `400`;
  - CH6-B16, el salto con la frase del cursor, la fila y «Ver más avisos» en (f), y «Ver más avisos» en (c).

  Ya tiene caso.
- **Lo que queda sin caso, declarado:** la rama "o al `h2`" de CH6-B13, cuando no hay vecina. El plan escribe "o", la alternativa que corresponda, y el efecto de fila del muro es anterior a 06b. No lo exijo; va al tester (punto 2).

### Puntos de ataque para el tester (ronda 1, actualizados; reemplazan los de la verificación anterior)
Por prioridad, además de "Puntos de ataque para el Tester" del plan:
1. **`useListaConservadaTrasLaPagina` en secuencias:**
   - un fallo de página con `5xx` seguido de una recuperación que falla con un `4xx` (`403`, o `404` en los comentarios);
   - una página que falla y después una mutación que invalida y falla, con el foco en una fila;
   - el reflejo de N-05 en Dudas;
   - A → B → A → B con las dos listas conservadas;
   - un `400` del cursor después de una lista conservada (que reemplace con su frase y no la marca).
2. **CH6-B13 sin vecina:** `PUBLICACION_NO_ENCONTRADA` en la única publicación, o en la última, con el foco en el bloque. El foco debe ir al `h2` de Avisos, nunca a `<body>`. Y lo mismo desde un recurso.
3. **El gradebook por la otra dimensión:**
   - la frase de la ventana vacía de tareas (`cursorTareas`) por (f), (g) y (h);
   - las dos dimensiones a la vez;
   - una segunda ocurrencia distinta después de marcar la primera.
4. **`StrictMode`** en las 9 listas, en los comentarios con un `404` y en el gradebook (marca de más declarada, sin peticiones).
5. **Comentarios dentro de Recursos**, más allá de N-02:
   - pulsar «Recursos» con los comentarios conservados;
   - su «Ver más» con `5xx` y con el `400` del cursor;
   - salir y volver.
6. **DH-10 con una página de A en vuelo**, no una recarga, que falla ya en B. Y el salto a B con B pidiendo una página.
7. **`listaTraeLaClase` con formas raras** (punto 5 del plan), y la clase archivada leída por el alumno con el inicio en caché y la barra ya respondida.
8. **Al empezar:** V-01 y `git diff --quiet 023b450 -- frontend/src/components/foco` (por K14).

### Para el humano
Nada.

## Verificación de la Enmienda 5 — CHORE-06b (2026-11-13)
Manager, modo plan. Solo lectura, sin pruebas. Revisé:
- `plan.md`: 1302 líneas, SHA-256 `73861b132a421741961986d72c50d838b0073c66a034c1ea052ad40382cad1de`, comprobado;
- la copia de antes `plan-ch6-antes-e5-201dc71f.md` (`201dc71f…`, comprobado). El `git diff --no-index` completo da 151 inserciones y 5 borrados, y leí todos los hunks;
- `reporte-tester.md:663-775` (ronda 1, T-04 y T-05);
- el árbol actual: 42 archivos en `frontend/`, con el gancho en `features/clases/hooks.ts:1336-1353` y sus 9 llamadores;
- `@tanstack/query-core` 5.103.2 (`query.js` y `queryObserver.js`).

**Veredicto: APROBADO.** El remedio, una marca por instancia de consulta guardada en un `WeakMap` de módulo, cierra T-04 y T-05 sin cambiar lo que DH-02 (a) dejó igual. Quedan tres puntos que no bloquean (N-01 a N-03), una observación (O-01) y un detalle. Ninguno requiere enmienda: el programador los recoge en K-1 y en su resumen. Nada va al humano, salvo la confirmación del tamaño, que ya se le preguntó.

### Punto 1 · El efecto que registra la marca
- **Por qué llega a tiempo.** El render que ve el fallo de página (`isFetchNextPageError`) ya decide con `ahora`. React vacía los efectos pasivos pendientes de una confirmación antes de empezar el render siguiente, y también antes de confirmar un desmontaje. Así, el efecto de ese render registra la marca, con su propio cierre (`consulta` y `fallo`), antes de que exista un render en que `fetchMeta` ya sea `null`. Camino por camino:
  - **La página falla con la vista montada:** el render del fallo conserva la lista. Su efecto registra la marca, y la pulsación, la invalidación o el montaje nuevo la leen después. Es el camino de T-04 (ATQ-CH6-36).
  - **La página falla con la vista desmontada** (CH6-B12 (c)):
    - el reintento se cancela al quedarse sin observadores (`query.js:244-251`), y el error deja `fetchMeta` hacia adelante;
    - al volver, el primer render usa el resultado optimista, que conserva `fetchMeta` (`queryObserver.js:301-308`), así que `ahora` es verdadero;
    - la suscripción, que lanza la recarga, corre en un efecto, y la notificación llega en un render posterior;
    - para entonces la marca ya está escrita.
  - **Qué ve la persona en ese caso:** la lista a la vista mientras vuela la recarga, con «Ver más» en espera, y sin aviso (`useAvisoDeRecargaFallida` nace con el contador del momento, R8). Es lo que piden M-02 y DH-02 (a).
  - **`StrictMode`:** el efecto corre dos veces con el mismo valor y no tiene limpieza. Bien (ATQ-CH6-42).
  - **La pestaña oculta:** los efectos se vacían igual antes del render siguiente. Bien.
  - **Desmontar en la confirmación siguiente a la del fallo:** React vacía los efectos de la confirmación del fallo antes de desmontar. Bien.
- **O-01 — La única excepción es una carrera.** Si el fallo de la página y el despacho de otra recarga de la misma clave (por ejemplo, una invalidación por una mutación) caen en el mismo lote de notificaciones de la librería, ningún render ve la dirección. No se registra la marca y se ve el `MensajeError` mientras vuela esa recarga.
  - La forma de la 3b tenía la misma propiedad, y la conducta es la de antes de 06b.
  - Es casi inalcanzable, porque requiere que la mutación termine en el mismo instante que la página. La acepto como observación, sin caso ni enmienda.

### Punto 2 · La instancia en el render
- **`find({ queryKey, exact: true })` encuentra la consulta en ese render en los 9 llamadores:**
  - el gancho de la lista se llama antes en el mismo componente (`muro-view.tsx:57` y `:63`; `dudas-view.tsx:51` y `:56`);
  - `useBaseQuery` construye la consulta en el constructor del observador, porque `setOptions` llama a `build` (`queryObserver.js:44-51`), y otra vez en `getOptimisticResult` (`:132-134`).
- **El salto de clase en Avisos y Dudas:** el observador ya construyó la consulta de B en `getOptimisticResult` de ese mismo render, aunque `setOptions` llegue después, en un efecto. Así que `find` devuelve la instancia de B.
- **Las respuestas sin `pedir`** (`enabled: false`): la consulta también se construye. La marca no se registra porque no hay fallo de página.
- **Las claves coinciden exactamente con las de las consultas:** `clavePublicaciones`, `claveDudas`, `claveComentarios`, `claveRespuestas`, `claveTrabajo`, `clavePersonas`, `claveAlumnos`, `CLAVE_CLASES_INSCRITAS` y `CLAVE_CLASES_IMPARTIDAS` (`hooks.ts:203`, `:214`, `:769`, `:780`, `:1045`, `:1124`, `:1280`, `:1789` y `:1809`).
  - Son las mismas que cada llamador ya pasa hoy a `useMarcarViejaSiQuedoEnError`.
  - La barra cuelga de la clave del inicio pero tiene otra clave, y `exact` la deja fuera.
- **Si `find` devolviera `undefined`, el gancho decide solo con `ahora`, sin marca.** Es seguro.

### Punto 3 · La marca no conserva de más
- **Cada acción `error` sube `errorUpdateCount` y fija `errorUpdatedAt`** (`query.js:450-462`). La marca solo coincide mientras el error actual es el mismo fallo de página que conservó la lista. Así:
  - **una recarga de fondo que falla sin un fallo de página antes:** no hay marca y se reemplaza (ATQ-CH6-38);
  - **la recuperación que falla** (con `5xx` o con `4xx`, ATQ-CH6-39): cambia el par y se reemplaza sin aviso;
  - **el `400` del cursor después de una lista conservada** (ATQ-CH6-40): `ahora` es falso y el par es otro, así que se reemplaza con su frase;
  - **N-05 y su reflejo en Dudas:** A y B son dos instancias distintas, cada una con su marca.
- **`resetQueries`:**
  - `query.reset()` deja la misma instancia con el estado inicial, contador 0 y hora 0 (`query.js:142-145`);
  - un error posterior trae otra hora;
  - dos errores en el mismo milisegundo con `resetQueries` en medio solo pueden darse con el reloj fijo de una prueba, y CH6-B18 (e) lo arma a propósito;
  - ninguna de las 9 listas usa `resetQueries`.
- **Una mejora frente a la 3b:** "la recuperación falla con la vista desmontada y se vuelve" también reemplaza. El par cambió y `ahora` es falso, así que el `MensajeError` se ve mientras se pide de nuevo. Es lo correcto según DH-02 (a), porque el último fallo es de una recarga. Ver N-02.

### Punto 4 · La memoria de módulo
- **El `WeakMap` tiene como clave la instancia `Query`.** Cada `QueryClient` tiene su propia `QueryCache` y sus propias instancias, así que dos clientes, o dos pruebas, nunca comparten una marca. La mutación "un `Map` por `queryHash`" lo comprueba en CH6-B18 (e).
- **Ninguna ruta revive una marca vieja:**
  - `removeQueries`, la recolección y `clear` al cerrar sesión (`features/auth/hooks.ts:46` y `:118`) sacan la instancia de la caché, y la que se construye después es otra, sin entrada;
  - el `WeakMap` no retiene la instancia;
  - `resetQueries` conserva la instancia, pero no el par;
  - mientras la vista está montada, la lista solo se conserva si el error actual es el que se registró.
- **Hay precedente en el repositorio:** `ultimoFalloAvisado` (`features/tareas/hooks.ts:265`), también un `WeakMap` por consulta.
- **Leer el `WeakMap` durante el render es una lectura, no una mutación,** así que la regla `globals` de `eslint-plugin-react-hooks` 7 no debería rechazarla. Si el lint la rechaza, PA-4 (§D-5).

### Punto 5 · Mutaciones y CH6-B19
- **Las cuatro filas nuevas pueden caer:**
  - **la marca en `useState`:** cae ATQ-CH6-36, y también el caso de CH6-B18 (e) de montar de nuevo con el mismo par y sin dirección (el estado nace en `null`);
  - **una sola variable de módulo:** cae ATQ-CH6-37 (B pisa a A). En CH6-B18 (e), "otra consulta con el mismo par" da verdadero;
  - **la marca sin `errorUpdatedAt`:** cae en CH6-B18 (e), si el caso marca con el contador 1, llama a `resetQueries` y produce un error nuevo con contador 1. Hay que armarlo así;
  - **un `Map` por `queryHash`:** cae con el cliente nuevo, la misma clave, el mismo par y `Date` fijo.
- **CH6-B19 (a), (b), (d), (e) y (f) se pueden armar tal como están escritos.** Los demás piden ajuste:
  - **N-01 — CH6-B19 (c), en comentarios, no se puede armar como está escrito.** Las filas de Avisos llevan `key={publicacion.id}`, y saltar A → B desmonta las filas de A. Al volver, la fila nace con `abierto` en falso (`publicacion-del-muro.tsx:31`) y el bloque de comentarios está cerrado, así que no hay lista que conservar sin volver a abrirlo. El caso de comentarios tiene que decir "salta A → B → A **y vuelve a abrir el bloque**", que es el camino de T-04 por cerrar y abrir. Personas tal como está.
  - **N-02 — Un estado vecino del inventario sin caso:** "la recuperación falla con la vista desmontada y después se vuelve". Debe verse el `MensajeError`, sin aviso, mientras se pide de nuevo, y nunca la lista conservada por una marca que ya no corresponde. Mecánicamente lo vigila CH6-B19 (e), que sigue la misma rama de decisión, pero es el camino nuevo que abre una marca que sobrevive al desmontaje. Conviene sumarlo como variante de (e) en Avisos.
- **Lo que falta en el inventario de estados vecinos:** solo N-02. Los demás (montar dos veces, invalidación y salir, salto con montaje nuevo, A → B → A → B, recuperación que falla, `removeQueries`, `StrictMode` y el tema con `signal`) tienen caso, aquí o en la ronda 1.

### Punto 6 · La firma
- **Los 9 llamadores tienen la clave a mano:** ya la pasan a `useMarcarViejaSiQuedoEnError` en el mismo componente (`muro-view.tsx:104`, `dudas-view.tsx:94`, `personas-view.tsx:72`, `inicio-estudiante-view.tsx:52`, `inicio-maestro-view.tsx:50`, `comentarios-de-publicacion.tsx:175`, `respuestas-de-duda.tsx:188`, `seccion-de-tema.tsx:91` y `tabla-alumnos.tsx:183`). Son las mismas funciones con que se construye la consulta.
- **Grep de los llamadores con la firma vieja en pruebas:**
  - solo `recargas-ch6.test.tsx:2188` (CH6-B18 (e)), que el plan reescribe;
  - las fábricas de C-15 y C-16 (`() => false`) no miran los argumentos;
  - `recargas-ch6b-r1.ataque.test.tsx` lo menciona solo en un comentario (`:34`).

### Punto 7 · Texto vivo de la 3b
- **Lo reemplazado está bien marcado:**
  - el bloque de código de la 3b (`plan.md:505-515`) y su "Por qué funciona en cada camino" quedan bajo "(Enmienda 5) … Reemplaza la forma de arriba";
  - la "Regla de la clave" (`:420`) y la tabla de M-5 (`:250`) llevan la marca de reemplazo;
  - la fila "comparar solo el `errorUpdateCount`, sin la clave" dice que la reemplazan las cuatro nuevas.
- **N-03 (detalle) — Una frase que contradice la Enmienda 5:** la observación de N-06 de la Enmienda 4 (`plan.md:1142`) dice todavía "la marca no suma `errorUpdatedAt`. Es observación". La Enmienda 5 la suma y da N-06 por cerrado (`:531`). El programador sigue `:531`.

### Tamaño
No partir. Los 2 archivos que hacen pasar de 41 son pruebas del tester, y partir a mitad de las rondas reparte pruebas que atacan código ya escrito. Si el humano quiere partir, el corte limpio sigue siendo una 06c con N-52 (unos 7 archivos).

### Para el humano
Solo la confirmación del tamaño, que ya pidió el orquestador.

### Para el orquestador
El programador sigue K-1 a K-6. Que recoja N-01 (reabrir el bloque en CH6-B19 (c) de comentarios), N-02 (la variante de (e) con la recuperación que falla con la vista desmontada) y el armado de la mutación "sin `errorUpdatedAt`" (contador 1, `resetQueries` y contador 1 otra vez), y que los nombre en su resumen. No hace falta enmienda.

## Verificación de la corrección de la ronda 1 (T-04 y T-05) — CHORE-06b (2026-11-14)
Manager. Contra `resumen-programador.md` (1266 líneas, SHA-256 `67e1952e…` comprobado), "## Corrección de la ronda 1 — CHORE-06b: T-04 y T-05 (2026-11-14)" (`:1103`). Plan `73861b13…` (1302 líneas, comprobado), con la Enmienda 5. Leí además el reporte de la ronda 1 (`reporte-tester.md:664-775`) y la verificación de la Enmienda 5 (`revision.md:2105`). Equipo con corriente. Según el orquestador, no hay otra suite corriendo. Corrí una cosa a la vez y no hice mutaciones.

### El gancho contra la Enmienda 5
- **`useListaConservadaTrasLaPagina` (`features/clases/hooks.ts:1338-1365`) es, línea por línea, la forma de referencia de §D-5 (`plan.md:535-557`):**
  - `const fallosDePaginaConservados = new WeakMap<Query, string>()` es memoria de módulo, con la instancia de la consulta como clave;
  - la firma es `(queryKey, isFetchNextPageError, isError, errorUpdateCount, errorUpdatedAt, error)`;
  - la instancia se obtiene con `useQueryClient().getQueryCache().find({ queryKey, exact: true })`;
  - el valor es `` `${String(errorUpdateCount)}:${String(errorUpdatedAt)}` ``;
  - el `WeakMap` **solo se escribe en el `useEffect`**, con `[ahora, consulta, fallo]` y la guarda `if (!ahora || consulta === undefined) return`. En el render solo se lee;
  - el resultado es `ahora || (isError && consulta !== undefined && fallosDePaginaConservados.get(consulta) === fallo)`, como en el plan.

  `Query` y `QueryKey` entran como tipos en la importación de `@tanstack/react-query` (`:53-54`). No queda ningún `useState` en el gancho. El lint aceptó los seis parámetros, así que no hizo falta leer `errorUpdatedAt` del estado.
- **Los 9 llamadores pasan los seis argumentos en orden, y la `queryKey` exacta de su consulta.** La cotejé con la que construye cada gancho de lista en `features/clases/hooks.ts`:

| Llamador | Primer argumento | Gancho de la lista y su `queryKey` |
|---|---|---|
| `muro-view.tsx:63` | `clavePublicaciones(claseId)` | `usePublicaciones(claseId)`, `:1045-1047` |
| `dudas-view.tsx:56` | `claveDudas(claseId)` | `useDudas(claseId)`, `:1801-1803` |
| `components/comentarios-de-publicacion.tsx:159` | `claveComentarios(claseId, publicacionId)` | `useComentarios(claseId, publicacionId)` (`:141`), `:1124-1126` |
| `components/respuestas-de-duda.tsx:156` | `claveRespuestas(claseId, dudaId)` | `useRespuestas(claseId, dudaId, pedir)` (`:149`), `:1820-1823` |
| `components/seccion-de-tema.tsx:65` | `claveTrabajo(claseId, seccion.clave)` | `useTrabajo(claseId, seccion.clave)` (`:55`), `:1280-1282` |
| `personas-view.tsx:57` | `clavePersonas(claseId)` | `usePersonas(claseId)`, `:769-771` |
| `components/tabla-alumnos.tsx:168` | `claveAlumnos(claseId)` | `useAlumnos(claseId)`, `:780-782` |
| `inicio-estudiante-view.tsx:36` | `CLAVE_CLASES_INSCRITAS` | `useClasesInscritas()`, `:203-205` |
| `inicio-maestro-view.tsx:34` | `CLAVE_CLASES_IMPARTIDAS` | `useClasesImpartidas()`, `:214-216` |

  En las 9 son la misma función, con los mismos argumentos y en el mismo componente, y se llama al gancho de la lista antes, así que la instancia existe en ese render. Es también la clave que cada uno pasa a `useMarcarViejaSiQuedoEnError`. Ninguna conservaría ni reemplazaría la lista de otra consulta.
- **No cambió nada más en producción:** `git diff 023b450 --stat` de lo que no es prueba da 18 archivos rastreados más `components/seccion/types.ts`, sin rastrear, que son los 19 de siempre. En `features/clases/hooks.ts` el cambio está dentro de lo que la Enmienda 5 permite (K-2). `useAvisoDeRecargaFallida` no cambia y el resto de las vistas tampoco.

### Los casos de CH6-B18 (e) y CH6-B19
- **CH6-B18 (e)** (`recargas-ch6.test.tsx:2175-2302`, 7 casos). Antes de llamar al gancho, cada caso construye su consulta con `getQueryCache().build` y comprueba con `find` que existe: si falta, el caso falla con un mensaje. Cubre las viñetas del plan (`:1041-1046`):
  - con un `503` es verdadero; sin la dirección y con el mismo par, verdadero; con otra consulta y el mismo par, o con otro contador, falso;
  - el `400` del cursor es falso;
  - desmontar y montar otra vez es verdadero (T-04 a nivel del gancho);
  - otra consulta con el mismo par es falso y A sigue verdadero (T-05);
  - dos ganchos a la vez sobre la misma consulta, los dos verdaderos;
  - `resetQueries` con la marca tomada con el contador en 1 y después contador 1 con otra hora es falso. Es el armado que pidió la verificación de la Enmienda 5 para que caiga la mutación "sin `errorUpdatedAt`";
  - un `QueryClient` nuevo con la misma clave y el mismo par es falso.

  Un detalle: en este último, el `Date` fijo no cambia nada, porque el par lo dan las props. Se dejó como lo pide el plan.
- **La explicación del rojo primero de CH6-B18 (e) es cierta.** Con la firma vieja `(isFetchNextPageError, isError, errorUpdateCount, error, clave)`, la llamada nueva corre los argumentos:
  - la `queryKey` (un arreglo, verdadero) entra como `isFetchNextPageError`;
  - el contador (un número, que no es `ApiError`) entra como `error`.

  Así, `conservaLaListaTrasLaPagina` da `arreglo && (!esApiError(número) || …)`, que es verdadero, y el gancho devuelve verdadero siempre. Por eso cayeron los cinco casos que esperan falso y pasaron los dos que solo esperan verdadero. Que "montar de nuevo" saliera verde antes del cambio no le resta valor: Q1 (volver al `useState`) lo hace caer.
- **CH6-B19** (`ver-mas-ch6.test.tsx:1243-1528`, 9 casos). Usan el router real y las `defaultOptions` de `providers.tsx`, con la recuperación retenida. La ayuda `conservadaMientrasVuela` comprueba cuatro cosas: «Ver más» con `aria-busy="true"`, la primera fila de la lista junto a él, ningún `role="alert"` y ningún texto de error. Al soltar la respuesta, el caso comprueba que «Ver más» sale de la espera, que hay un solo aviso (el del fallo de página) y que no salió ninguna petición de más.
  - (a) Avisos y Personas, dos regresos seguidos: la segunda vuelta no pide nada y sigue conservada.
  - (b) La invalidación por comentar, y después salir y volver.
  - (c) Personas: A → B → A con el historial, montada de nuevo por su `key`. Comentarios: igual, pero con el bloque abierto de nuevo, como pidió N-01.
  - (d) Dudas: A → B → A → B con las dos conservadas y retenidas. B y A se conservan en cada llegada.
  - (e) La recuperación que falla después de volver: un solo `role="alert"`, sin «Ver más» y sin aviso nuevo. Y la variante de N-02 (falla con la vista desmontada): al volver se ve el `MensajeError` mientras se pide otra vez, nunca la lista.
  - (f) `removeQueries` con la vista en otra sección: la carga nueva que falla reemplaza.

  Cada caso afirma lo que pide su viñeta (`plan.md:1048-1054`).

### Mutaciones Q1 a Q5
La tabla cubre las cinco filas que tocan el gancho: las cuatro de la Enmienda 5 (`plan.md:1097-1100`) y la de M-02 de la 3b, "devolver solo `ahora`" (`:1095`). Cada una cae con lo que el plan espera:
- **Q1** (`useState`): ATQ-CH6-36, CH6-B19 (a), (b) y (c), y CH6-B18 (e) "montar de nuevo".
- **Q2** (una sola variable de módulo): ATQ-CH6-37, CH6-B19 (d), y CH6-B18 (e) "otra consulta con el mismo par".
- **Q3** (sin `errorUpdatedAt`): CH6-B18 (e), el caso de `resetQueries`.
- **Q4** (un `Map` por `queryHash`): CH6-B18 (e), el caso del `QueryClient` nuevo.
- **Q5** (solo `ahora`): 35 casos.

Que con Q2 y Q4 caigan además casos de otras pruebas (la marca pasa de un caso o de un cliente a otro) confirma que el aislamiento por instancia es lo que cuenta. No hay redundancias, todas las mutaciones están en `features/clases/hooks.ts` ("Se toca") y ninguna tocó un archivo de "No se toca". No hice mutaciones; contrasté la tabla con el código y con los casos.

### Mis corridas (desde `frontend/`, una a la vez)
| Qué | Comando | Última línea (mía) | Resumen |
|---|---|---|---|
| lint | `npm run lint` | `> tsc -b`, salida 0 | salida 0: coincide |
| regresión de 06b | `npx vitest run src/features/clases src/features/calificaciones src/features/admin src/components/seccion src/app src/lib` | `Tests  5491 passed (5491)` (`Test Files  242 passed (242)`; `Duration  517.40s`) | `5491 passed (5491)` y `242 passed (242)`: coincide |
| build | `npm run build` | `✓ built in 1.55s`, salida 0 | `✓ built in 2.05s`: coincide (el tiempo varía) |
| conteo | `npx vitest list` de las 4 pruebas nuevas, con `grep -a -c '> CH6-B'` | 342 = 12 + 172 + 151 + 7 | 342 (12, 172, 151 y 7): coincide |

- CH6-B19 tiene 9 casos y CH6-B18 (e) tiene 7, como dice el resumen.
- `git status --short frontend`: 42 archivos.
- `sha256sum -c v01-ch6b-r1.txt`: las 290 `*.ataque`, todas OK. El programador no tocó ninguna, y los 13 casos de T-04 y T-05 pasan sin cambios en la regresión.
- `git diff --quiet 023b450 -- frontend/src/components/foco`: limpio.

### Hermanos y estados vecinos (contrastados con el código)
- **Las 9 listas:** la tabla del resumen (`:1194-1207`) coincide con el código (la tabla de arriba). El remedio es uno solo, la marca por consulta, y se aplicó en las 9. Cada una tiene caso con la recuperación en vuelo y un montaje nuevo: ATQ-CH6-36 cubre las 9 y los comentarios de un recurso, y CH6-B19 suma los caminos vecinos. El tema de Actividades está cubierto por el control con `signal` de ATQ-CH6-36 y por CH6-B12 (c).
- **Estados vecinos de §D-5, "Inventario por mecanismo"** (`plan.md:591-604`): cada uno tiene el caso que nombra el resumen (`:1209-1230`), y lo comprobé en el archivo:
  - primera carga que falla;
  - fallo de página;
  - montaje nuevo con la recuperación en vuelo, por otra sección, por la invalidación y por el salto;
  - cerrar y abrir;
  - A → B → A y A → B → A → B;
  - la recuperación que responde bien o falla, con la vista montada o desmontada;
  - un fallo de página nuevo;
  - `removeQueries`, `resetQueries` y un cliente nuevo;
  - dos observadores;
  - `StrictMode` (ATQ-CH6-42);
  - el `signal`.

  Solo "la clase pasa a archivada" queda sin caso propio (abajo).
- **Los demás ganchos con memoria**, uno por uno, contra el código:
  - `useAvisoDeRecargaFallida` (ref `fallosVistos` y `clavePrevia`, de 06a): al montarse de nuevo nace con el contador del momento. Olvidar un fallo ya ocurrido es justo R8, así que no tiene el hueco.
  - `useRenovarSiLaPublicacionYaNoEsta` (`fallosVistos` nace con el contador, más `clavePrevia`): al reabrir el bloque, la consulta en error se pide otra vez y el `404` nuevo sube el contador. No tiene el hueco.
  - `useMarcarViejaSiQuedoEnError`: la clave va en su efecto. No tiene el hueco.
  - `useRecargarAlPulsarLaSeccion` y `renovarLasListasSiTraenLaClase`: no tienen memoria.
  - Las dos refs del gradebook: la limpieza deja su saber en la caché antes de perderse (ATQ-CH6-46 a 49 en verde).
  - `useFocoAlPasarAError`: decide con `isError && !conserva`, ya corregido.
  - Memoria de módulo nueva: solo `fallosDePaginaConservados`. `limiteDeTrabajo` y `limiteDeRecursos` no cambian.

  Coincide con el resumen: ningún otro tiene el hueco de "la memoria es del componente y una sola".
- **La fila de la matriz de §D-7** ("volver, cerrar y abrir o el salto que monta de nuevo, con la recuperación todavía en vuelo") dice lo que hace el código y lo que fijan ATQ-CH6-36, ATQ-CH6-37 y CH6-B19: no sale ninguna petición nueva ni ningún aviso, se ve la lista con «Ver más» en espera y sin `role="alert"`, y el foco queda donde lo deja el montaje. Si la recuperación falla, sale el `MensajeError` sin aviso, también cuando falló con la vista desmontada (N-02). Las demás filas no cambian, porque el `conserva` de los caminos ya probados (con la vista montada) da lo mismo con la marca por consulta. La regresión en verde lo confirma.

### Lo que arbitro
- **¿T-04 y T-05 cuentan como rondas extra por hermanos o estados vecinos del programador? No. Las cuento como 0 rondas imputables al programador, y lo dejo anotado como 1 ronda extra de la subentrega por estados vecinos del mecanismo M-02, imputable al plan.**
  - Los dos son estados vecinos del mismo mecanismo (la marca de M-02), pero de la **forma literal del plan**: §D-5 de la Enmienda 3b dio el gancho con su `useState` y una sola marca, y mandó detenerse (PA-4) si hacía falta otra forma.
  - El programador la aplicó tal cual y cubrió los caminos que nombraban el plan y M-02 (pulsar, volver con la recarga lanzada por el montaje, el salto, el regreso y la invalidación). No dejó sin extender un remedio a sus hermanos.
  - El tester los clasificó como huecos del plan. Lo confirmo: el remedio necesitó la Enmienda 5.
  - Tampoco lo vimos en las revisiones: ni el manager de la 3b ni yo, cuando acepté M-01 y M-02, lo detectamos.
  - **Para el umbral de la decisión del humano (2026-10-05), que dice "2 o más rondas extra del tester por este patrón", el programador sigue en 0.** Si la ronda 2 encuentra otro estado vecino de este mismo mecanismo y lo que falla es la ejecución del programador, no el plan, esa sería su primera ronda extra. La regla de CLASES-02c dice que rondas seguidas sobre el mismo mecanismo cuentan como una sola por hermanos, así que el orquestador debe decidir si se suma a esta.
- **"La clase pasa a archivada" sin caso: basta la remisión, y queda como punto de ataque de prioridad baja.**
  - En la decisión de `conserva`, un `409 CLASE_ARCHIVADA` sigue la misma rama que el `403` y el `404` de ATQ-CH6-39: es un `4xx`, así que `ahora` es falso, y en la recuperación cambia el par, así que la lista se reemplaza. No hay línea propia que vigilar.
  - Pero ese `409` tiene efectos laterales que los otros `4xx` no tienen: el detalle de la clase se marca viejo (`useDetalleViejoAnteClaseArchivada`), la clase pasa a solo lectura y aparece el aviso fijo. Su combinación con una lista conservada no está probada.
  - No lo exijo al programador: el plan no lo pide como caso, y el inventario lo da por cubierto por la rama. Va al tester (punto 4).
- **Los detalles de la corrección no bloquean.** La Enmienda 5 no tenía notas sin atender: N-01 (reabrir el bloque en CH6-B19 (c)), N-02 (la variante de (e)) y N-03 (seguir `:531`) están aplicadas, el armado de Q3 es el pedido y O-01 queda aceptada sin caso.

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean y detalles
- En el caso del `QueryClient` nuevo de CH6-B18 (e), el reloj fijo no cambia nada, porque el par lo dan las props. Es inofensivo y lo pide el plan.

### Puntos de ataque para el tester (ronda 2), por prioridad
Además de los del plan:
1. **La marca por consulta frente a la vida de la caché:**
   - una lista conservada que vence su `gcTime` sin observadores y vuelve: es una instancia nueva y no tiene marca;
   - `clear()` al cerrar sesión y entrar con otra cuenta;
   - `resetQueries` desde otra vista, si se alcanza;
   - dos `QueryClient` en la misma página: no se alcanza en la app; solo para confirmarlo.
2. **Carreras de la marca:**
   - el fallo de página y una invalidación en el mismo lote (O-01, aceptada; confirmar que el resultado es el `MensajeError` y nada peor, sin aviso doble ni foco en `<body>`);
   - «Ver más» que vuelve a fallar mientras otra vista de la misma consulta está montada;
   - el efecto que registra la marca contra un desmontaje inmediato tras el fallo: falla la página y la persona sale en el mismo `act`.
3. **Los nueve llamadores con claves cruzadas:**
   - dos publicaciones con los comentarios abiertos a la vez, una conservada y la otra no;
   - dos dudas con las respuestas abiertas;
   - dos temas de Actividades con «Ver más», uno con fallo de página y el otro con fallo de recarga.

   La marca de uno nunca debe conservar al otro.
4. **La clase que pasa a archivada con una lista conservada:** la recuperación responde `409 CLASE_ARCHIVADA` (la lista se reemplaza sin aviso, la vista pasa a solo lectura y el foco no cae en `<body>`). También el salto a una clase archivada con su lista conservada en caché.
5. **Lo que sigue de la ronda 1, sin hallazgo:**
   - la frase del cursor y el aviso de «Ver más» por cada camino, después de una lista conservada y recuperada;
   - `StrictMode` con la recuperación en vuelo y un montaje nuevo;
   - el inicio del maestro y el del estudiante, con «Inicio» de la barra pulsado varias veces seguidas con la recuperación en vuelo.
6. **Al empezar:** V-01 contra `v01-ch6b-r1.txt` y `git diff --quiet 023b450 -- frontend/src/components/foco`.

### Para el humano
Nada. El tamaño (42 archivos) ya lo confirmó. Lo de las rondas extra es un dato para el orquestador y no exige ninguna decisión hoy: el programador sigue en 0 rondas imputables.

### Veredicto
**ACEPTADO.** El tester puede hacer la ronda 2.

## Revisión final — CHORE-06b (2026-11-14)
Manager, modo final. Plan `73861b13…` (1302 líneas, Enmiendas 1 a 5). Base `023b450` dentro de `frontend/` y `47c3339` fuera de los paquetes; `docs/trabajo/CHORE-06-foco-y-navegacion/` y `docs/ESTADO.md` quedan fuera. Leí la ronda 2 del tester (`reporte-tester.md:776-848`, RESISTE). Equipo con corriente (`BatteryStatus` 2). Según el orquestador, no hay otra suite corriendo. Corrí una cosa a la vez.

### "Se toca" y "No se toca"
- **`frontend/` contra `023b450`: 43 archivos, todos en la lista.**
  - 19 de producción, la columna 06b de §D-0 (con `components/seccion/types.ts`, nuevo).
  - 4 pruebas nuevas.
  - 4 de la lista cerrada: `ver-mas-y-orden-ch4`, `personas-view`, `publicacion-del-muro` y `gradebook-01d`.
  - 16 `*.ataque`:
    - los 13 de C-3 a C-9, C-13 y C-15 a C-20 de §D-R0;
    - los 3 nuevos del tester: `recargas-ch6b-r1`, `gradebook-ch6b-r1` y `recargas-ch6b-r2`.

  Ninguna condicional cayó (PR-C18, C-10 y C-14).
- **Fuera de los paquetes, contra `47c3339`:** solo `docs/DESIGN.md` (§7.14 de 06a) y `docs/trabajo/DOCS-05…/aprobacion.md`. Los dos entraron en el commit de 06a (`023b450`), autorizados y verificados entonces, y no cambian desde `023b450`. `docs/trabajo/DEPLOY-investigacion-vps.md` ya estaba sin rastrear antes del encargo.
- **No cambia nada contra `023b450` en** `CLAUDE.md`, `AGENTS.md`, `docs/DESIGN.md`, `shared/`, `backend/`, `infra/` ni los `package*.json` (`git diff --quiet`).
- **`components/foco` sigue limpio** (por K14), y ningún archivo de "No se toca" aparece en el diff: `clase-layout.tsx`, `components/clase`, `components/layout`, `components/adjuntos`, `services/`, `app/` de producción, `panel-mis-clases.tsx` y `bloque-destacado.tsx`.
- **En los archivos de "Se toca"**, solo cambia lo permitido. Lo verifiqué en mis tres verificaciones anteriores y la producción no cambió desde la última:
  - en `features/clases/hooks.ts`, las dos guardas de `fetchStatus`, `useClaseArchivadaEnSuLista` con `renovarLasListasSiTraenLaClase`, `useListaConservadaTrasLaPagina` con su `WeakMap` y `useRenovarSiLaPublicacionYaNoEsta`;
  - en `features/admin/hooks.ts`, la reexportación;
  - en `features/calificaciones`, `useMarcarViejasLasVentanas` y las dos refs.

  Ningún gancho de mutación gana `mutationKey`, `useAvisoDeRecargaFallida` conserva su firma y nada de lo que fija CH6-A30 cambia.
- **V-01:** `sha256sum -c v01-ch6b-r2.txt` (291 líneas, `b4ec4372…`): todas OK. Los 19 archivos de producción coinciden con la huella que tomó el tester antes y después de sus mutaciones de la ronda 2 (`scratchpad/r2b/prod-antes.sha`, 19 de 19 OK).

### Cumplimiento del plan y de las decisiones del humano
- **DH-02 (a), la página siguiente:** en las 9 listas, la red o un `5xx` conserva la lista, da un aviso y deja «Ver más» para repetir, con el foco en él. Cualquier `4xx` reemplaza la lista con su frase. Una recarga de fondo que falla la reemplaza como siempre. Lo fijan CH6-B10 a B12, ATQ-CH6-39 y 40. Las tres listas que conservan por otra regla no cambian.
- **M-02 de la 3b, con la Enmienda 5:** mientras una recarga recupera una lista conservada, la lista sigue a la vista con «Ver más» en espera, sin `role="alert"` y sin mover el foco. Vale por cada camino: pulsar, volver, cerrar y abrir, la invalidación, el salto y el regreso. La marca es de la consulta (`WeakMap` por instancia). Lo fijan CH6-B10, B16 (f), B18 (a) y (e), B19, ATQ-CH6-36 y 37, y ATQ-CH6-50 a 54. La excepción aceptada es O-01: si el fallo y una recarga caen en el mismo lote, se ve el `MensajeError` sin aviso (ATQ-CH6-50).
- **DH-03 (b), pulsar la sección:** en error o vieja, se pide; sana y fresca, nada; nunca se cancela ni se duplica lo que vuela (PR-3). Lo fijan CH6-B01, B03, B07 y B08. El hermano de T-07 en `/admin/clases` y "Clases anteriores" es CH6-B09. Las variantes registradas no cambian.
- **DH-10 / O-08, el salto de clase cuenta como pulsar.** En las cuatro listas que sobreviven al cambio de clase, B se pide solo si está en error o vieja, una sola vez. Las dos condiciones del humano tienen caso:
  - **(a) La renovación no mueve el foco:** la fila de A va al `h2`, el control segmentado se queda, y «Ver más» se queda en el de B o va al `h2` o a la primera fila nueva. Lo fijan CH6-B16 (foco, N-01, (f) y (c)) con sus mutaciones D2, K11 y K14.
  - **(b) Si falla, el aviso es el de B**, y un fallo de A no se avisa en B ni al volver (R8). Lo fijan CH6-B17 y ATQ-CH6-43, con D3 y D4.
- **P-1 y P-2 (Enmiendas 4 y 4b):**
  - En el gradebook, las ventanas se marcan viejas al pulsar o al salir solo si la frase se vio y aún no se marcó. CH6-B14 (a) a (h) y CAL-1D03d y e lo fijan, igual que C-19, C-20 y ATQ-CH6-46 a 49 por la dimensión de tareas.
  - La barra y los inicios se renuevan solo si todavía traen la clase archivada, con `{ cancelRefetch: false }`. Lo fijan CH6-B15 (7 casos) y ATQ-CH6-44 y 45.
- **DH-06, el tamaño:** el plan pedía 40 archivos; el árbol tiene 43, porque suma 3 `*.ataque` que creó el tester. El humano confirmó dos veces no partir.
- **Pruebas requeridas de 06b:** CH6-B01 a B19, cada una con su caso. Lo comprobé caso por caso en mis tres verificaciones (`revision.md:1884-1898`, `:2006-2103` y `:2199-2353`).
- **Mutaciones:** cada fila de 06b de la tabla del plan tiene su corrida o su redundancia declarada con su mecanismo:
  - M01 a M08, M19, G1 a G6, C1 a C4, D1 a D4 y E1 a E6 (implementación);
  - K1 a K14 (corrección de M-01 y M-02);
  - Q1 a Q5 (Enmienda 5);
  - además, las del tester: MT16 a MT30.
- **Regla de "Mutaciones" y PA-7:** no quedó ningún caso que pase sin su remedio y sin redundancia declarada.
- **Reglas que no se rompen:** sin backend ni `shared/`; no hay consultas nuevas al servidor; las capas y el middleware no cambian; no hay textos nuevos; los avisos pasan por `mensajeDeConsultaClases` (`lib/errores-de-api.ts`); y las guardas de doble clic y los `enEspera` no cambian (PA-6).
- **Estilo de `CLAUDE.md`:** el tipo nuevo va en `types.ts`; hay retornos tempranos; no hay `any`, `?? []` ni `as` en el código nuevo. La memoria de módulo (`WeakMap`) se escribe solo en un efecto.
- **Diseño:** no hay componentes, tokens, colores ni textos nuevos. El único patrón visual nuevo es el de §7.10 ("Error de la página siguiente"), que el orquestador aplica al cierre (A-2).

### Lo aceptado sin caso o declarado (en un solo lugar)
| Qué | Dónde se aceptó | ¿Va a `docs/ESTADO.md` §3? |
|---|---|---|
| **R-12:** una petición de la barra que ya volaba antes de que se archivara la clase se une a la invalidación (`cancelRefetch: false`). La clase puede quedar en la barra hasta su siguiente recarga, y abrirla lleva a su vista de solo lectura | `plan.md:1162-1171` y "Decisiones tomadas" | **Sí**, como riesgo aceptado. Destino: **DEPLOY / piloto**; se reabre solo si se observa con datos reales, y se toca junto con `useClaseArchivadaEnSuLista` |
| **O-01 de la Enmienda 5 (O-12 del tester):** si el fallo de la página y una recarga de la misma clave caen en el mismo lote, no hay marca y se ve el `MensajeError` sin aviso mientras vuela. Se confirmó que no hay aviso doble y que el foco va al `h2` (ATQ-CH6-50) | `revision.md`, verificación de la Enmienda 5 | **Sí**, como observación. Destino: **el `chore` de accesibilidad del marco** (es qué anuncia el lector de pantalla), sin prioridad |
| **El salto a una clase archivada con su lista conservada en caché:** el detalle fresco no se vuelve a pedir, así que la vista no sabe que se archivó hasta que algo lo marque viejo. Es conducta anterior a 06b (`useDetalleViejoAnteClaseArchivada`, "No se toca"); el servidor responde `409 CLASE_ARCHIVADA` a toda escritura | "No atacado" de la ronda 2 del tester | **Sí**, si §3 no la tiene ya. Destino: **el próximo encargo que toque `clase-layout.tsx` o `useDetalleViejoAnteClaseArchivada`**, sin prioridad |
| **O-10 del tester:** la ocurrencia de la frase del gradebook no lleva la ventana. Dos ventanas que respondieran en el mismo milisegundo darían la misma ocurrencia. Inalcanzable con el reloj real; es un riesgo de las pruebas que fijan `Date` | ronda 1 del tester | **Sí**, como nota. Destino: **el próximo encargo que toque `gradebook-view.tsx`**, por el carril trivial (sumar la ventana a la ocurrencia) |
| **K14:** mutación temporal en `components/foco/hooks.ts` ("No se toca"), restaurada byte a byte | mi verificación de la corrección de M-01 y M-02 | No: desviación de proceso, registrada aquí y en `aprobacion.md` |
| **C-17:** el tester borró la ayuda `encabezadoAlumnos`, que quedó sin uso | ronda 0 del tester | No: desviación aceptada |
| **Redundancias declaradas:** PR-3 (M02 y M03, `isFetching` frente a `cancelRefetch: false`); CH6-B01 (f) sin datos; PR-2 en la vista (M05 y E-filas: la librería invalida el error); K6 y K7 (el cursor al volver y al reabrir los sostiene la librería); K12 y K13 (dos caminos al `h2`); O-11 y O-13 del tester (casos de regresión sin guarda propia) | resúmenes y reportes, cada una con su mecanismo, verificado contra 5.103.2 | No |
| **No atacado por el tester:** vencer el `gcTime` y `clear()` (mismo camino que `removeQueries`, CH6-B19 (f)), y dos `QueryClient` en la misma página (inalcanzable; CH6-B18 (e)) | ronda 2 del tester | No |
| **Riesgos y decisiones ya registrados por el plan:** R-02 (CH6-A30 solo ve la forma de una línea), R-06 (dos implementaciones de la política, `CLAUDE.md`), R-08 (el foco al cambiar de ruta), R-10 (la descarga de `components/adjuntos`), DH-05 y DH-09 | plan | Los lleva A-4 (o ya están en 2b) |

### Conteo de rondas de 06b (para el registro)
- **Rondas de ataque del tester: 2.** La ronda 1 salió ROTO (T-04 y T-05) y la ronda 2, RESISTE. Las rondas 0 y 0 bis fueron de preparación (C-n), no de ataque.
- **Rondas extra: 1** (la ronda 2, que hizo falta por la ronda 1). T-04 y T-05 son estados vecinos del mecanismo de M-02, pero salen de la forma literal que dictaba el plan (§D-5 de la 3b), así que **se imputan al plan, no al programador**. El programador queda en **0 rondas extra** por hermanos o estados vecinos.
- **Devoluciones del manager al resumen del programador: 1** (M-01 y M-02: casos que faltaban por camino de la frase del cursor y las variantes de foco de (f)). Las otras dos verificaciones salieron ACEPTADO.
- **Paradas del programador: 2** (P-1 y P-2, contradicciones del plan en §D-6), resueltas con las Enmiendas 4 y 4b. Se imputan al plan.
- **Enmiendas del plan en 06b: 5** (3, 3b, 4, 4b y 5), además de las 1 y 2 previas a 06a.
- **La regla del modelo no aplica, por dos razones.** `AGENTS.md` y la decisión del 2026-10-05 piden 2 o más rondas extra imputables al programador por no extender un remedio a sus hermanos o estados vecinos, y además la regla es para el carril sensible. Aquí hay 0 imputables y el carril es normal. El programador sigue en `sonnet`.
- **Lo que pesa en la subentrega es el plan:** dos paradas y una ronda extra salieron de supuestos sobre TanStack Query y de formas literales del plan. Las verificaciones de las enmiendas (la de la 3b incluida) tampoco lo detectaron, y yo tampoco al aceptar M-01 y M-02.

### Documentos a actualizar (A-1 a A-4; ajustes que recomiendo por lo que quedó implementado)
Los aplica el orquestador al cierre, con la autorización del humano. No los cuento como faltantes. Ajustes:
- **A-1, la viñeta de `components/seccion/`:**
  - "`useMarcarViejaSiQuedoEnError` … marca vieja al salir una consulta que quedó en error, así que volver antes del `staleTime` la pide" es **inexacto desde la Enmienda 3b**: con TanStack Query 5.103.2, la librería ya deja inválida toda consulta en error. Propongo: "…y `useMarcarViejaSiQuedoEnError` (movido desde `features/admin`, que lo reexporta) marca vieja al salir una consulta que quedó en error; con TanStack Query 5.103.2 es una garantía escrita, porque la librería ya la deja inválida".
  - La variante de `features/calificaciones` puede sumar: "y el gradebook marca viejas sus ventanas al pulsar o al salir si vio la frase de la clase cambiada (N-52)".
  - La frase de la Enmienda 3 sobre el salto (DH-10) va como dice el plan.
- **A-1, recomendación opcional** en "Componentes" o "Manejo de errores": "Lo que una lista debe recordar de su consulta más allá del montaje de la vista (por ejemplo, que un fallo de página la conservó) va en memoria por consulta (`WeakMap` con la instancia de la caché como clave, escrito en un efecto), no en el estado del componente: la vista se monta de nuevo con la recarga en vuelo (CHORE-06b, T-04 y T-05)". Es la lección de la ronda 1. Decide el humano si sube a regla.
- **A-2, el patrón de §7.10:**
  1. En "Lo implementan…", **"Actividades" debe decir "un tema de Actividades"**: la lista de temas de Actividades conserva también ante una recarga de fondo, como Recursos. Así, la frase "van más allá" queda: "Recursos (los temas y un tema), la lista de temas de Actividades, Entregas y Mis calificaciones van más allá…".
  2. La frase de M-02 (Enmienda 3b) dice "(al pulsar la sección, al volver a ella o al saltar de clase)". Con lo implementado, mejor: "(al pulsar la sección, al volver a ella, al abrir de nuevo un bloque de comentarios o respuestas, al saltar de clase o tras una acción que la renueva)". El resto de la frase ("si esa recarga falla, la reemplaza como cualquier recarga fallida") es exacto.
  3. El texto de A-2 sí describe lo implementado: red o servidor, un solo aviso, «Ver más» sigue, el foco en el botón, y el cursor, el acceso y una recarga de fondo reemplazan.
- **A-3 y A-4:** sin cambio. Suman las filas de la tabla de arriba con "Sí".

### Comprobación humana (`plan.md:1179-1184`)
Los cuatro puntos siguen siendo los correctos: lo que jsdom no ve es el historial real, la red cortada de verdad y el lector de pantalla.
- **H-1 y H-2** son de 06a y siguen igual.
- **H-3 necesita una precisión.** En "volver la red y pulsarlo", la persona debe **volver la red antes de navegar a otra sección**. Si con la red cortada va a otra sección y regresa, la recarga del montaje también falla, y eso reemplaza la lista: es lo decidido (DH-02 (a)), pero el humano podría tomarlo por error. Opcional, sin pasar de 4 puntos ni de 8 minutos: tras el aviso de H-3, con la red ya restablecida, pulsar «Avisos» estando ahí. La lista sigue a la vista con «Ver más avisos» en espera y sin mensaje de error, y después llegan los avisos. Es M-02 en un navegador real.
- **H-4** no cambia.

### Verificación propia (desde `frontend/`, una a la vez, con corriente)
| Qué | Comando | Última línea |
|---|---|---|
| lint | `npm run lint` | `> tsc -b`, salida 0 (ESLint y Prettier sin errores) |
| **suite completa del frontend** | `npx vitest run` | `Tests  8372 passed (8372)` (`Test Files  345 passed (345)`; `Duration  579.21s`), salida 0 |
| build | `npm run build` | `✓ built in 1.05s`, salida 0 |

**Cuadre con 06a**, que cerró con `338 passed (338)` y `7928 passed (7928)`:
- **archivos:** +7, que son las 4 pruebas nuevas del programador y los 3 `*.ataque` del tester;
- **casos:** +444, que son los 342 de las cuatro pruebas nuevas, los 76 de la ronda 1 del tester y los 26 de su ronda 2.

Las pruebas de la lista cerrada y los C-n cambian su contenido, no cuántas hay. Cuadra exacto.

Sin backend: el encargo no toca `shared/` ni el backend, así que no corresponde su suite (`AGENTS.md`, "Pruebas").

### Definición de terminado (`AGENTS.md`)
- [x] Cumple lo que pide el plan: no hay `RF-xx` nuevo; cierra las filas de `docs/ESTADO.md` §3 que tenían este destino (A-3).
- [x] Respeta las capas y el middleware (solo frontend; sin endpoint nuevo).
- [x] `lint`, `build` y `test` en verde (arriba).
- [x] Pruebas de autorización: no aplica, no hay endpoint nuevo.
- [x] Migración: no aplica.
- [x] `infra/` y `.env.example`: no aplica.
- [ ] Documentos (A-1 a A-4): pendientes del orquestador con la autorización del humano. Recomiendo los ajustes de arriba. Los verifico aparte, como en 06a.

### Problemas que bloquean
Ninguno.

### Problemas que no bloquean
- **N-01 · Los textos de cierre A-1 y A-2 quedaron atrás de las Enmiendas 3b a 5.** En A-1, la frase de `useMarcarViejaSiQuedoEnError` es inexacta con la librería instalada. En A-2, "Actividades" y la lista de caminos de M-02 se quedan cortos. Los ajustes están en "Documentos a actualizar". No es código: lo resuelve el orquestador al aplicar los textos.
- **N-02 · Precisión en H-3:** restablecer la red antes de navegar (ver "Comprobación humana").

### Detalles menores
- En CH6-B18 (e), el caso del `QueryClient` nuevo fija `Date` sin que importe, porque el par sale de las props.
- CH6-B10 (volver) afirma el foco del montaje solo como "el mismo elemento antes y después".

### Desacuerdos arbitrados
- Ninguno abierto entre programador y tester en 06b.
- Lo arbitrado durante la subentrega ya está escrito en sus secciones:
  - K14, aceptada como desviación;
  - K6 y K7, K12 y K13, redundancias ciertas;
  - el rojo primero de CH6-B14 (f) y el de CH6-B18 (e);
  - `laTraen`;
  - `StrictMode`;
  - "la clase pasa a archivada" (ATQ-CH6-52 lo cubrió después).

### Para el humano (resumen)
1. **06b: APROBADO.** Hace cuatro cosas:
   - pulsar la sección vuelve a pedir una lista en error o vieja, sin peticiones duplicadas, y el salto de clase cuenta como pulsar;
   - un «Ver más» que falla por red o servidor ya no borra la lista: sale un aviso y el botón sigue;
   - la lista conservada no muestra un error falso mientras se recupera;
   - la barra y los inicios sueltan una clase que se leyó archivada, y el gradebook ya no sirve de la caché una ventana vacía vieja.
2. **Corridas del manager:** suite completa del frontend `8372 passed`, en 345 archivos; lint y build en verde.
3. **Tamaño:** 43 archivos en `frontend/`, como confirmó dos veces el humano. Solo frontend.
4. **Rondas:** 2 rondas del tester (ROTO y luego RESISTE). La ronda extra se imputa al plan (T-04 y T-05), no al programador. El programador sigue en `sonnet`.
5. **Tu comprobación en el navegador:** H-1 a H-4, unos 8 minutos. En H-3, restablece la red antes de cambiar de sección.
6. **Lo que queda registrado en `docs/ESTADO.md` §3:**
   - R-12, la barra con una clase recién archivada, como riesgo aceptado;
   - O-01, el error sin aviso en una carrera rara;
   - el salto a una clase archivada todavía en caché;
   - O-10 del gradebook.

   Ninguno bloquea.
7. **Al cierre:** el orquestador aplica `CLAUDE.md` y `docs/DESIGN.md` §7.10 con tu autorización, con los ajustes que recomiendo, y después los verifico.

### Veredicto
**APROBADO.** Sin problemas que bloqueen. Quedan pendientes los documentos del cierre (A-1 a A-4), con los ajustes recomendados, y su verificación aparte.

## Verificación de los documentos del cierre — CHORE-06b (2026-11-14)
Manager, solo lectura. Corrí una sola prueba: la que lee `docs/DESIGN.md`.

Archivos verificados:
- `CLAUDE.md`: SHA-256 `bad2a776…`, comprobado; `git diff` da 4 inserciones y 2 eliminaciones.
- `docs/DESIGN.md`: `c340ccaa…`, comprobado; 1 inserción.
- `docs/ESTADO.md`: `713b0b28…`, comprobado. Contra la copia `ESTADO-antes-cierre-06b.md` (`3ecca55f…`, comprobada), `git diff --no-index` da 40 inserciones y 15 eliminaciones, y los leí todos con `--word-diff`.

Cada texto lo contrasté con el plan (`:1280-1302`), con los ajustes pedidos (`revision.md:1155-1157` para 06a y mi revisión final de 06b) y con el código.

**Veredicto: CORRECCIONES.** Son cuatro, todas de `docs/ESTADO.md`: frases que afirman de más o citan un caso que no corresponde. `CLAUDE.md` y `docs/DESIGN.md` quedan aprobados tal como están.

### `CLAUDE.md` (A-1): aprobado
- **La viñeta de `components/seccion/`** es el texto de A-1 con lo que se pidió:
  - la frase de la Enmienda 3 sobre el salto del historial (DH-10);
  - `useMarcarViejaSiQuedoEnError` como garantía escrita con 5.103.2;
  - el gradebook y N-52.

  Coincide con el código: `useRecargarAlPulsarLaSeccion` y `useMarcarViejaSiQuedoEnError` viven en `components/seccion/hooks.ts`, `features/admin/hooks.ts` lo reexporta, y las 12 listas de `features/clases` los usan. Para el gradebook dice "si vio la frase", donde la condición exacta es "si la vio y aún no la marcó"; para una guía de ubicaciones, la simplificación es aceptable.
- **"Lo abierto es del id de la ruta":** es el texto de `plan.md:1284`, con los dos ajustes de la revisión final de 06a palabra por palabra, la frase de la conservación a propósito y "en las cuatro listas y en las vistas de tarea, entrega y recurso". Coincide con CH6-A30.
- **La viñeta nueva de la memoria por consulta** es mi texto, tal cual, y describe `fallosDePaginaConservados` (`features/clases/hooks.ts`: un `WeakMap` por instancia, escrito en un efecto).
- **"Textos del servidor"** suma el texto de `plan.md:1285`, palabra por palabra.

### `docs/DESIGN.md` §7.10 (A-2): aprobado
- La viñeta "Error de la página siguiente (CHORE-06b, propuesta)" va después de **Error**, con la marca de propuesta. Es el texto de A-2 con los ajustes de mi revisión final:
  - la frase de M-02 con todos los caminos;
  - "un tema de Actividades";
  - "Recursos (los temas y un tema), la lista de temas de Actividades, Entregas y Mis calificaciones van más allá".
- **Describe lo implementado.** La red o el `5xx` conservan la lista (`conservaLaListaTrasLaPagina`), sale un solo aviso con `mensajeDeConsultaClases`, «Ver más» sigue y el foco se queda en él. La lista sigue a la vista mientras se recupera (`useListaConservadaTrasLaPagina`); si la recuperación falla, se reemplaza. El cursor, el acceso y una recarga de fondo reemplazan. La lista de quién lo implementa coincide con los 9 llamadores, y la de quién va más allá, con `conservaLaRecarga` de las pruebas (los temas de Recursos y de Actividades y un tema de Recursos).
- **Cumple `AGENTS.md`:** el único patrón visual nuevo de 06b queda documentado en el mismo encargo.
- **Prueba:** `npx vitest run src/styles/tokens-r1.ataque.test.ts`, desde `frontend/`, da `Tests  19 passed (19)` (`Test Files  1 passed (1)`).

### `docs/ESTADO.md`: cuatro correcciones
Lo demás es cierto y está bien:
- el encabezado;
- el párrafo de 06b: recorrido, qué quedó, las dos condiciones de O-08 con su caso (CH6-B16 y CH6-B17), los cambios visibles y las cifras (43 archivos; 345 y 8372; 342 = 12 + 172 + 151 + 7; 70, 6 y 26; 291 `*.ataque` desde 288);
- la hoja de ruta y la sección 2b;
- las filas cerradas: O-01 de 06a, ADMIN-01d2 (CH6-B15), O-03 (CH6-B08 y C-9), N-54, N-52 (CH6-B14 (a) a (h), ATQ-CH6-46 a 49, C-8, C-19, C-20 y CAL-1D03d) y "Ver más clases" (CH6-B03 a B05 con el cursor en los inicios);
- los dos cambios de destino (`useTemasDelRecurso` y `useGuardarCategorias`);
- las cuatro filas nuevas, con el destino de mi tabla;
- la sección 4 y la sección 6: rondas, devoluciones, paradas, decisiones y enmiendas. La interrupción del manager de la Enmienda 5 está en `aprobacion.md:70`.

**Las tres lecciones son justas.** Coinciden con mi revisión final (plan, inventario por contador y memoria por consulta), y la 2 enlaza bien con la lección 2 de 06a.

**Formato:** las 6 filas de CHORE-06 en §3 tienen tres columnas, y no hay ninguna secuencia de cuatro asteriscos. Hay dos líneas con negritas impares, la 56 y la 489, pero ya lo estaban en la copia (la 56 y la 483) y no son de este cierre.

Las correcciones, con el texto exacto para reemplazar (antes → después):

1. **El párrafo de 06b (sección 2), R-12 afirma de más.** La barra no tiene `refetchInterval` ni se pide al volver el foco (`app/providers.tsx`), así que la clase no se queda "unos segundos": se queda hasta la siguiente recarga de la barra (por ejemplo, al volver a abrir la clase, que corre otra vez el efecto). Lo dice `plan.md:1162-1171`.
   - Antes: `la barra puede conservar unos segundos una clase recién archivada si su petición ya volaba.`
   - Después: `si su petición ya volaba, la barra puede conservar una clase recién archivada hasta su siguiente recarga (por ejemplo, al volver a abrir esa clase).`
2. **La fila nueva de R-12 (§3), por lo mismo.**
   - Antes: `hasta su siguiente recarga (unos 30 s)`
   - Después: `hasta su siguiente recarga (por ejemplo, al volver a abrir esa clase, que corre otra vez el efecto)`
3. **La fila de H-2 de CHORE-04 (§3) cita un caso que no es de esos siete sitios.** CH6-B09 es el hermano de T-07 en `/admin/clases` y "Clases anteriores". Los siete sitios los fijan CH6-B07 y, para el gancho, CH6-B01 (f) y (g).
   - Antes: `(CH6-B07 y CH6-B09)`
   - Después: `(CH6-B07; el gancho, CH6-B01 (f) y (g))`
4. **La fila del hermano de T-02 (§3), punto (3): falta el caso de la frase del aviso de «Ver más».** Esa fila habla de la frase que sale tras el fallo de una página, y sus caminos (pulsar, volver y repetir) los fija CH6-B10; cerrar y abrir lo fija ATQ-CH6-36. CH6-B03 a B06 y CH6-B16 son de otras frases.
   - Antes: `Cada frase de recuperación tiene un caso por camino (CH6-B03 a CH6-B06 y CH6-B16)`
   - Después: `Cada frase de recuperación tiene un caso por camino (CH6-B03 a CH6-B06, CH6-B10, CH6-B16 y, para cerrar y abrir tras el fallo de una página, ATQ-CH6-36)`

Una precisión más en la sección 6, que es la quinta y la dejo a criterio del orquestador porque no cambia ninguna cifra. La fila "Hallazgos que vinieron del plan | todos: …" es cierta para los hallazgos del tester y para las paradas, pero no para los míos: M-01 y M-02 fueron casos que faltaban en el resumen del programador.
- Antes: `| Hallazgos que vinieron del plan | todos: dos premisas falsas`
- Después: `| Hallazgos que vinieron del plan | todos los del tester y las paradas (M-01 y M-02 del manager fueron casos que faltaban en el resumen del programador): dos premisas falsas`

### Lo que falta de A-1 a A-4 o de mi lista "Para el orquestador"
Nada:
- A-1 y A-2 están aplicados con los ajustes.
- A-3: las filas de 06b están marcadas como hechas y O-01 de 06a está cerrada.
- A-4: los cambios de destino pendientes están hechos y ninguna fila de §3 queda con destino en "el `chore` de foco y navegación del marco" sin cerrar o cambiar.
- Las cuatro filas nuevas de mi tabla están.

El hash del commit de 06b lo anota el orquestador después del commit del humano, como en 06a.

### El commit de 06b
`git add -n -A -- frontend CLAUDE.md docs/ESTADO.md docs/DESIGN.md docs/trabajo/CHORE-06-foco-y-navegacion` da **51 rutas**:
- los 43 archivos de `frontend/`;
- `CLAUDE.md`, `docs/DESIGN.md` y `docs/ESTADO.md`;
- los 5 archivos de la carpeta del encargo (`aprobacion.md`, `plan.md`, `reporte-tester.md`, `resumen-programador.md` y `revision.md`).

`docs/trabajo/DEPLOY-investigacion-vps.md` **queda fuera** (0 coincidencias). No ejecuté ningún `git add` real ni commit.

Las correcciones son de texto y no cambian el número de rutas: después de aplicarlas, 51 sigue valiendo.

### Veredicto
**CORRECCIONES:** cuatro reemplazos exactos en `docs/ESTADO.md` (1 a 4) y uno opcional en la sección 6. No hace falta otra verificación completa: basta comprobar que las cuatro cadenas "después" estén y las cuatro "antes" no.
