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
