# Revisión del Manager — CLASES-02 · clases administradas, maestros por clase, autoría y barra lateral — plan
Fecha: 2026-10-03 · Plan revisado: `plan.md`, SHA-256 `081632b1428be2442e5f9d38fe82b54bdc182854730141a972fef26f2a94dd1e` (el de `aprobacion.md`; no lo edité)

Veredicto: **CAMBIOS REQUERIDOS** (regresa al arquitecto por M-01 a M-03; P-01 y P-02 siguen esperando al humano y no son motivo de este veredicto)

Verificación propia (sin correr suites, por instrucción):
- `npm run lint` desde la raíz (shared, backend y frontend): código de salida 0; Prettier "All matched files use Prettier code style!" y `tsc -b` sin errores.
- Cifras de partida: 132 archivos de prueba en `backend/`, 104 en `frontend/` y 115 `*.ataque` (`git ls-files`): coinciden con el plan. Las 115 `*.ataque` coinciden una por una con la tabla de SHA-256 de la ronda 6 de CHORE-02 (`reporte-tester.md`, línea 1624): 115 de 115. Los conteos de casos (1623 y 1396) **no** los verifiqué: piden `npx vitest list` y quedan para V-07 del programador.
- Contrasté con el código: `middleware/index.ts`, `pertenencia.ts`, `guarda-de-rutas.ts`, `rutas-publicas.ts` (10 rutas, coincide), `core/clases/pertenencia.ts`, `handlers/clases/{clases,alumnos,muro}.ts`, `handlers/archivos.ts`, `adapters/db/{clases,publicaciones}.ts`, `schema.prisma`, `test/ayudas-clases.ts`, `features/clases/**`, `components/layout/**`, `components/ui/badge.tsx` y las pruebas estáticas con listas cerradas.

## Juicio de §D-2.0 (el admin pasa el sexto paso)

**La decisión es correcta y la apruebo en lo sustancial.**
- **Cumple la fila de `ESTADO.md` §3.** No hay excepción en la guarda. `/api/admin/clases/:claseId…` lleva el sexto paso, así que pasa `TIENE_CLASE_ID`. Sus dos primeros segmentos son literales, y `segmentoDeClaseInvalido` ve `:claseId` justo después de `/clases/`. `guarda-de-rutas.ts` y `rutas-publicas.ts` quedan intactos.
- **No abre una vía a un estudiante ni a un maestro.** `relacionConClase` sigue exigiendo `inscrito` (estudiante) o `esMaestro` (maestro), con el rol leído de la base en cada petición. El valor `"admin"` solo sale con `perfil.rol === "admin"`. PR-2A01 cubre los datos imposibles en los dos sentidos.
- **La respuesta para "clase inexistente o ajena" se conserva.** Para estudiante y maestro sigue siendo `403 SIN_ACCESO_A_LA_CLASE`. Al admin, una clase inexistente le da la misma respuesta. Para él no hay riesgo de enumeración (ve todas), y la uniformidad evita una rama más.
- **Ningún handler de hoy decide nada con `relacion`** (lo busqué). Abrir rutas al admin no activa ninguna rama de datos por accidente.
- **Las 17 rutas de hoy con `:claseId` están todas en la matriz**, cada una con la decisión de si se abre o no al admin.

**La defensa contra el olvido no está bien resuelta (M-01).** Lanzar desde `protegido()` rompe la suite de regresión de la guarda que cerró CHORE-02. Se puede conseguir lo mismo sin romper nada.

## Juicio de la escritura doble (P-06 a) y de las invariantes

- **Dos fuentes de verdad.** Mientras dure el encargo, el riesgo real es que alguna lectura de `clases.maestro_id` sobreviva. Hay tres mitigaciones suficientes: PA-14 (ninguna lectura), V-04 (búsqueda de `maestroId` y de `maestro:` en `select` de `clase`) y el punto 4 del tester (cambiar a mano la columna en la base desechable sin que cambie nada). La columna nunca apunta a un maestro sin asignar: al crear se escribe el primer maestro, al retirar se reescribe dentro de la misma transacción, y la migración copia los datos existentes.
- **Reversión del código.** Con (a), el backend anterior sigue funcionando sobre el esquema nuevo: el maestro "principal" conserva la propiedad. Con (c), fallaría con cualquier clase nueva. Es lo que pide la regla de compatibilidad.
- **"Nunca sin maestro" y el tope de 2 en concurrencia.**
  - Crear exige de 1 a 2 maestros en un `create` anidado y atómico.
  - Asignar y retirar toman primero el candado de la fila de `clases` (`UPDATE` de `actualizado_en`, `FOR NO KEY UPDATE`) y después leen y deciden en `core/`. En READ COMMITTED, la segunda transacción espera el candado y luego lee lo ya confirmado. La serialización es correcta.
  - El candado no choca con los `FOR KEY SHARE` de las FK de `maestros_de_clase`, `inscripciones`, `publicaciones` ni `archivos`. La PK impide duplicados.
  - La invariante vive en código y no en la base (no hay forma sana de expresarla con un `CHECK`). ESSENTIALS ya lo dice así.
  - PR-2A15 cubre las tres carreras, pero el caso (a) tiene un error aritmético (M-05).

## Problemas que bloquean

### M-01 — Que `protegido()` lance con `pertenencia` sin `roles` rompe 11 archivos de prueba, incluida la suite de la guarda de CHORE-02, y el plan no lo inventaría
Dónde: §D-2.0 ("Defensa contra el olvido"), §D-2A2, PR-2A06, §D-2R0 (ningún C-n lo cubre), PA-16 y PA-17.

Por qué importa: hoy hay pruebas que llaman a `protegido({ pertenencia })` **sin** roles para ejercitar la guarda y el sexto paso.
- `*.ataque` (7): `clases-r3:111`, `guarda-ch-r1:126` y `:142`, `guarda-ch-r2` (cinco llamadas), `guarda-ch-r3` (nueve), `guarda-clase-r1:77` (vía `arrancaCon`), `guarda-clase-r2:110` y `guarda-r2:59-60` y `:103`.
- Normales (4): `guarda-clase.integracion` (seis), `guarda-todas-las-rutas` (`:87-88` a nivel de módulo, y `:120-131`, `:276`, `:383`), `middleware-orden:41` (`/prueba/pertenencia` "no exige roles") y `src/middleware/index.test.ts:30`.

Con el lanzamiento de §D-2.0 pasa esto:
- `guarda-todas-las-rutas` falla **al importarse**, porque arma `CON_CADENA` con esas llamadas a nivel de módulo, y caen todos sus casos.
- Los controles positivos ("arranca", PR-CH-05c, `guarda-r2` "protegido(pertenencia …) arranca bajo /api") se invierten.
- Los casos que esperan un motivo concreto de la guarda reciben otro error.

Ninguno de esos archivos está en un C-n. `guarda-clase.integracion` no está en PA-16, y `middleware-orden` está limitado a "solo si lista rutas". PA-17 solo cubre rutas de producción. El resultado sería una ronda 0 que reescribe, en masa, la barrera de regresión que pide la fila de ESTADO §3, o un programador detenido por PA-05 y PA-16 en el primer `npm test`. Es justo el patrón de rondas en cadena de CHORE-02 (R-10 del propio plan).

Qué se espera: una defensa que cumpla lo mismo que R-01 sin romper la suite de la guarda, en una de estas dos formas, decidida y escrita en una enmienda:
- **(preferida) Cerrada por defecto, sin lanzar.** El admin pasa el sexto paso **solo** en las rutas cuyos `roles` lo incluyen de forma explícita. Una ruta con `pertenencia` y sin `roles` lo deja fuera con `403 SIN_ACCESO_A_LA_CLASE`, como hoy. No cambia ninguna prueba existente, no hay lanzamientos al importar, y el olvido falla cerrado, que es más fuerte que no arrancar. Pide ampliar A-1 a `require-membership.ts` y `require-ownership.ts` (hoy en "No se toca") o pasar la condición por `pertenencia.ts` desde `index.ts`. PR-2A06 pasa a probar esto (ruta sin roles: el admin, `403`; ruta con `admin` en roles: `200`). La regla queda en ESSENTIALS y en `middleware/README.md`.
- **(alternativa) Conservar el lanzamiento.** En ese caso se necesita un C-n con el inventario completo de arriba y el procedimiento: agregar `roles` (por ejemplo `["estudiante"]`) sin tocar lo que el caso protege. También: PA-16 con los cuatro archivos normales, A-3 explícita para las siete `*.ataque`, y una nota de por qué la reescritura no debilita ningún control de la guarda.

### M-02 — PR-2A07 ejecuta la migración de datos sobre toda la base de pruebas compartida
Dónde: PR-2A07, PR-2A09, §D-2A1 (bloque `-- CLASES-02 · datos`).

Por qué importa:
- El bloque es `INSERT INTO maestros_de_clase … SELECT … FROM clases` **sobre todas las clases**. En la suite, los archivos corren en paralelo contra la misma base desechable. Ejecutarlo en un caso inserta asignaciones en clases de **otros** archivos que en ese instante no tienen fila. Entre ellas están las del tester (punto 4 de 02a: `maestro_id` cambiado a mano a un maestro sin asignar; punto 3: clases sin maestros) y cualquier clase de `crearClaseDePrueba` en la ventana entre su `create` y el de su asignación, si PR-2A09 los hace en dos sentencias. En ese último caso, la ayuda del otro archivo falla después por la PK.
- Además, la sentencia toma `FOR KEY SHARE` sobre filas de `usuarios` para las FK, mientras otras pruebas retienen `usuarios` (R-09). Eso da intermitencias que son PA-09 o PA-12.

Qué se espera:
- Que PR-2A07 pruebe la sentencia **tal cual está en el archivo de la migración**, pero aislada de las demás clases. Existe el precedente de PR-B05 en CHORE-02 (§E4-3, tabla temporal): por ejemplo, dentro de una transacción, tablas temporales `clases` y `maestros_de_clase` que la sombreen (`pg_temp` va primero en la ruta de búsqueda), con solo las filas del caso, y la transacción revertida al final.
- Que `crearClaseDePrueba` cree la clase y su asignación en **un solo** `create` anidado, sin ventana entre las dos.

### M-03 — El inventario de listas cerradas que el plan cambia está incompleto (C-n y PA-16)
Dónde: §D-2R0, "Pruebas: listas cerradas por subentrega" (PA-16) y "Ronda 0", punto 2 ("Si ningún C-n lo contradice, es un hallazgo: no lo reescribes").

Por qué importa: el plan mismo convierte cada contradicción sin C-n en un hallazgo, y cada prueba normal fuera de la lista en PA-16. Encontré estas, que el plan provoca y no cubre:

**`*.ataque` sin C-n:**
- `frontend/src/components/ui/badge-03b-r1.ataque.test.ts:44-45`: exactamente cuatro variantes (`danger`, `muted`, `success`, `warning`). La variante `institucional` (02c) lo rompe.
- `frontend/src/styles/clases-r1.ataque.test.ts`:
  - V-06 (`:126-205`): 36 `enEspera=`, la tabla `fijos` y "resto de `features/clases/components/` = 3". En 02c se suman "Cargar más clases", "Sí, quitar" de maestros y probablemente "Asignar a la clase" y "Elegir".
  - V-07 (`:233-241`): lista exacta de `vidrio-fuerte`. En 02d se suma la insignia "blanca" de `lista-de-clases.tsx` (C-18 solo nombra el formulario).
- `frontend/src/components/layout/estatico-r1.ataque.test.ts:131-147`: lista exacta de valores arbitrarios. `translate-x-[200%]`, de las tres secciones (§D-2C1, 02c), no está.
- `backend/test/alumnos-b-r1.ataque.test.ts:1106`: `inscripciones.ts` no debe contener `orderBy[^\n]*creadoEn`. El orden S-05 de los maestros en `listarPersonas` (02b) lo rompe si se escribe en una línea dentro de ese archivo.

**Pruebas normales que se rompen y no están en PA-16:**
- `features/clases/adjuntos-de-publicacion.test.tsx`: pasa la prop `esMaestro`, que 02c retira, así que falla `tsc -b`.
- `features/clases/inicio-estudiante-view.test.tsx`: es donde vive la tarjeta para PR-2C10.
- `components/ui/badge.test.tsx`: la variante nueva.
- En 02d, las pruebas normales que montan el router completo y llegan a un marco de rol (`app/router.test.tsx`, `features/auth/login-view.test.tsx`, `registro-view.test.tsx`, `registro-maestro-view.test.tsx` y `cambio-de-identidad.test.tsx`). La barra hace un `GET` más al montar, y sus dobles de `fetch` responden `/me` a cualquier ruta, así que la lista entra en estado de error.

Qué se espera:
- Un C-n (o los que hagan falta) por cada lista cerrada de arriba, con su subentrega.
- Las pruebas normales agregadas a la columna "Cambiar" de su subentrega.
- Para el caso del backend, o un C-n o la instrucción de definir el orden S-05 **una sola vez** fuera de `inscripciones.ts` (ver "Detalles menores").
- Que el arquitecto haga una búsqueda propia de listas cerradas en `frontend/src/**/*.ataque*` y `frontend/src/styles/` (`toEqual([` con rutas, `toHaveLength(` y conteos) contra los archivos nuevos de 02c y 02d. Esta lista no pretende ser exhaustiva.

## Problemas que no bloquean (se corrigen en la misma enmienda)

### M-04 — PR-2C11 no se puede cumplir con los archivos de 02c
Dónde: PR-2C11; "Cambios por capa" de 02c (`components/layout/data.ts` como único archivo del marco).
Por qué importa: `BarraNavegacion` pone `end` fijo en todos los `NavLink` (`barra-navegacion.tsx:24`) y `Destino` (`components/layout/types.ts`) no tiene cómo pedir otra cosa. Sin tocar esos dos archivos, "Clases" no queda activo en `/admin/clases/:claseId`. Y "Cuentas" (`/admin`) **sí** necesita `end`. El programador tendría que adivinar el mecanismo y salir de la lista de archivos.
Qué se espera: que el plan diga cómo un destino declara si coincide de forma exacta o por prefijo, sin un valor por defecto silencioso, y que sume `barra-navegacion.tsx` y `types.ts` a 02c.

### M-05 — PR-2A15 (a) tiene un error aritmético
Dónde: PR-2A15 (a): "tres asignaciones simultáneas de maestros distintos a una clase con 1 → al final exactamente 2, **una** respuesta `409`".
Por qué importa: con 1 maestro queda un solo lugar. De tres maestros nuevos, uno entra y **dos** reciben `409`. Escrito así, la prueba correcta falla o el programador ajusta el caso para que pase.
Qué se espera: "una `200` y dos `409`" (o decir que uno de los tres es el ya asignado, que daría `200` idempotente).

### M-06 — `backend/src/adapters/README.md` queda falso y el plan no lo actualiza
Dónde: "Textos propuestos" y "Cambios por capa".
Por qué importa: la sección `db/clases.ts` describe `crearClase` y la defensa extra M-01 (las dos se retiran en 02a). La sección `db/inscripciones.ts` dice que "`listarPersonas` solo trae id y nombre" y que "`listarAlumnosDeClase` es la **única** función que selecciona el correo completo, el estado de pago y la restricción". Desde 02a, `buscarMaestrosCandidatos` selecciona correos, y desde 02b, `listarPersonas` también. Esa frase es una invariante de privacidad que la próxima revisión va a usar como referencia. Falta además la sección de `maestros-de-clase.ts` (candado de la fila de la clase y escritura doble).
Qué se espera: textos para `adapters/README.md` al cerrar 02a y 02b, que sigan diciendo con exactitud qué función selecciona qué dato (el estado de pago y la restricción solo en el roster). En la misma línea, la viñeta de búsqueda de `ARCHITECTURE.md` §14 (buscador de maestros con correo completo) debe aplicarse al cerrar **02a**, cuando nace la ruta, no en 02b.

### M-07 — Retirar la defensa extra M-01 de CLASES-a necesita una autorización explícita
Dónde: §D-2A6, R-04 y la lista A-1 a A-9.
Por qué importa: es revertir un hallazgo aceptado del manager en carril sensible, y reduce defensa en profundidad. El argumento del plan es correcto (repetir en el adaptador la regla de "maestro de la clase o admin" sería una segunda implementación de la autorización), pero hoy la decisión queda escondida en un riesgo.
Qué se espera: un A-10 ("retirar el filtro por `maestro_id` de `editarClase`, `leerCodigo` y `regenerarCodigo`; la única autorización es el sexto paso"), que el humano firme con las demás.

## Detalles menores
- **Orden S-05 en un solo lugar.** El orden `(creado_en, maestro_id)` aparece en el detalle, `inscritas`, la lista del admin, "Personas" y la lista de maestros. Conviene una sola constante en `adapters/db/` (por ejemplo, en `clases.ts`), reutilizada por todos. Así se evita la trampa de `alumnos-b-r1:1106` (M-03) y los órdenes no se separan.
- **R-13 sin columna nueva.** El orden de elección del admin se conserva si `crearClaseAdministrada` escribe `creado_en` explícito y creciente para el segundo maestro (+1 ms). Es opcional; si no se hace, R-13 queda como está.
- **El tipo de `varianteDeClase` (02d).** Al mover la función a `lib/variante-de-clase.ts`, el plan no dice dónde vive `VarianteDeClase`, que hoy está en `features/clases/types.ts` y que `lib/` no puede importar (regla 9). Hay que decirlo para que el programador no lo declare dos veces.
- **Iniciales repetidas en la barra (P-02 A).** `inicialesDe` toma las dos primeras palabras: "Derecho Penal I" y "Derecho Penal II" dan "DP" y se recortan casi igual. Conviene que H-3 lo incluya con dos clases así.
- **PR-2D02.** El alta y la baja no cambian la lista de la barra (solo el conteo del inicio). Basta con que la invalidación por prefijo la alcance, sin afirmar que "se refresca" por algo visible.
- **El encolado del admin** reutiliza `crearPublicacion` con el mismo `encolar` dentro de la transacción. PR-2B03 ya prueba la transacción revertida. Bien.
- **Carriles por subentrega:** 02a y 02b son sensibles de verdad (migración con datos, middleware y autorización del muro). 02c y 02d serían "normal" por sí solas, pero bajo un plan sensible ya aprobado por escrito no agregan pasos: confirmo que sigan como están.

## Lo que revisé y está bien
- **Cobertura.** El plan cubre completos los 7 puntos del alcance, RF-10, RF-11, RF-19, RF-30, RF-31, RF-33, RF-38, RF-52 y RF-59, y RN-02, RN-04, RN-06 y RN-07. Nada que no se haya pedido. Los "No entra" tienen destino.
- **Datos.**
  - Toda consulta usa un índice: el nuevo `clases(creado_en DESC, id DESC)`, el nuevo `maestros_de_clase(maestro_id, creado_en DESC, clase_id DESC)`, las PK y el GIN de trigramas.
  - Toda lista se pagina (50 por página en el admin, 100 en la barra, máx. 100). Los cursores se leen por PK antes de usarse (T-18).
  - Sin N+1: las relaciones van por `IN` de Prisma por página. Sin SQL crudo nuevo.
  - Las escrituras compuestas van en `enTransaccion` (asignar, retirar y los dos borrados con autoría). El `P2028` responde `503`.
  - R-08 (`COUNT(*)` de `clases`) es aceptable en esta fase.
- **Migración.** Compatible hacia atrás: es solo aditiva, `maestro_id` se conserva `NOT NULL` y los renombres son solo de TypeScript (PA-04 los vigila). Revertir el código no rompe la base.
- **Cadena de middleware y campos que se omiten.** La matriz va ruta por ruta. El estado de pago nunca sale a un estudiante. "Personas" gana el correo, no el estado de pago. La firma no lleva el rol ni el nombre real del admin.
- **Pruebas de autorización.** Cubren, por endpoint, rol incorrecto, clase ajena, restringido, cambio pendiente, cuenta inactiva, clase inexistente y fuga del estado de pago (PR-2A22, PR-2A23 y PR-2B10).
- **Puntos de ataque.** PA-07 (lista de `P2028` permitidos) coincide exactamente con la regla permanente de `.claude/agents/tester.md`; el control positivo no cambia. PA-12 y PA-13 están heredados de CHORE-02. Los hermanos para el tester están bien elegidos.
- **"No se toca", V-01 a V-07 y PARADAS PA-01 a PA-18.** Completos y mecánicos, salvo lo que piden M-01 y M-04.
- **Textos propuestos** para ESSENTIALS, `ARCHITECTURE.md`, `CLAUDE.md`, `PRD.md` (RN-07), `DESIGN.md` y `middleware/README.md`. Coherentes con ESSENTIALS y `AGENTS.md`. Ninguna decisión de ESSENTIALS se contradice: el plan fija lo que ESSENTIALS dejó "a ese plan". `README.md` sin cambios: correcto.
- **Diseño (02c y 02d).** Solo tokens. La variante `institucional` usa un par ya verificado (`--link` sobre `--accent-soft`, 9.1). El estado nunca va solo con color (texto e icono). Hay una sola acción principal por vista, `autoComplete="off"` en los formularios del admin, el vacío del admin con su CTA y el del maestro sin acción (PRD §7). El indicador se adapta al contexto opaco y hay un patrón nuevo documentado en `DESIGN.md` por subentrega (A-7).

## Subentregas, carriles y autorizaciones
- **Subentregas.** Confirmo las cuatro (02a, 02b, 02c, 02d) con un commit cada una, en ese orden. 02a deja el frontend coherente solo en sus dobles; es aceptable porque nada se despliega hasta DEPLOY (S-13 y R-05).
- **Carriles.** Sensible para todo el plan (02a y 02b lo son por sí mismas; 02c y 02d, por estar bajo el mismo plan).
- **Autorizaciones.** A-1 a A-9 son correctas y no sobra ninguna. Faltan:
  - **A-10** (M-07): retirar la defensa extra M-01.
  - **Ampliar A-1**: si se adopta la forma preferida de M-01, `require-membership.ts` y `require-ownership.ts` (o decir que la condición pasa por `pertenencia.ts` sin tocarlos).
  - **Ampliar A-3**: que cubra explícitamente los C-n nuevos de M-03 (listas estáticas del frontend y `alumnos-b-r1:1106`).

## Desacuerdos arbitrados
Ninguno todavía: no hay ronda del tester. Con el arquitecto coincido en las nueve preguntas (tabla de abajo).

## Documentos a actualizar
- `backend/src/adapters/README.md` (M-06): no está en el plan.
- La viñeta de búsqueda de `ARCHITECTURE.md` §14 debe pasar del cierre de 02b al cierre de 02a (M-06).
- Si se adopta la forma preferida de M-01, los textos de ESSENTIALS ("Autorización") y de `middleware/README.md` cambian de "`protegido()` no arranca sin ellos" a "el admin pasa solo donde `roles` lo incluye".
- El resto de los "Textos propuestos" está bien.

## Recomendación del manager para P-01 a P-09
La entrego aquí en lugar de editar `plan.md`: mi único archivo es `revision.md`, y editar el plan cambiaría el SHA-256 registrado en `aprobacion.md`. El orquestador puede copiar esta columna a la tabla del plan.

| ID | Recomendación del manager | Motivo (y riesgo de las otras opciones donde importa) |
|---|---|---|
| P-01 | **(b) Moderación**, igual que el arquitecto | Conserva la moderación del muro que existe desde CLASES-01 y nunca deja tocar lo del admin ni lo del otro maestro. Con (a), la única persona que puede quitar un comentario indebido de un alumno es el admin, y el muro de cada clase queda sin moderación inmediata. Con (c), dos maestros de la misma clase se borran entre sí, que es lo que "cada autor borra solo lo suyo" protege. Con (b), un maestro también puede borrar el comentario de un alumno **debajo de una publicación del admin**: el comentario es del alumno, no del admin; el humano debe saberlo. (b) exige la línea nueva de RN-07 y de ESSENTIALS (ya propuesta) |
| P-02 | **(A) Barra de 96 px**, igual que el arquitecto | Cumple PRD §7 sin rehacer el marco aprobado en DESIGN-01, y es reversible. Riesgo de (A): nombres parecidos con iniciales iguales ("Derecho Penal I" y "II") y solo 6 a 8 letras visibles; en pantallas táctiles de 768 a 1023 px no hay `title` al pasar el cursor. Que H-3 lo mire con dos clases así. Riesgo de (B): cambia la rejilla y los márgenes aprobados; si el humano la prefiere, conviene verla primero en pantalla. Riesgo de (C): un clic más y un popover dentro de la `nav` |
| P-03 | **(a)** No comenta | RF-59 no lo pide. El esquema ya lleva la firma, así que agregarlo después es barato |
| P-04 | **(a)** Ve y regenera | RN-06: "la gestiona"; son las mismas dos rutas con un rol más. Riesgo aceptable: si el admin regenera, el código que repartió el maestro deja de servir, igual que si lo regenera un comaestro |
| P-05 | **(a)** Enmascarado | Una sola forma de respuesta en una ruta compartida evita que un error de rama le muestre el correo completo a un maestro. El admin ya ve el completo en el roster y en `/admin` |
| P-06 | **(a)** Conservar `NOT NULL`, escribir y nunca leer | Es la única opción con la que el backend anterior convive con el esquema nuevo (revertir el código no rompe la base). (b) rompe el despliegue escalonado y (c), el backend anterior con cualquier clase nueva. PA-14, V-04 y el punto 4 del tester vigilan que no aparezca una lectura |
| P-07 | **(a)** Destino "Clases" | El admin alcanza todas las clases; su lista es la tabla de `/admin/clases` (densidad tabular, §8) |
| P-08 | **(a)** `actorId @map("maestro_id")` | Sin migración ni riesgo; el nombre correcto en el código. ADMIN puede renombrar la columna cuando construya la consulta y sus índices |
| P-09 | **(a)** `CASCADE` hacia `clases`, `RESTRICT` hacia `usuarios` | Una asignación no existe sin su clase (igual que `inscripciones`). El historial sí se protege: `movimientos_inscripcion` sigue con `RESTRICT`. Ninguna ruta borra clases (S-09), así que (b) solo cambiaría la ayuda `borrarClasesDePrueba` (es la única que borra clases en las pruebas; lo comprobé). Corrige `ARCHITECTURE.md` §14, no ESSENTIALS |

## Para el humano
- **P-01 y P-02** son tuyas (tabla de arriba, con las dos recomendaciones).
- **Dónde viven las vistas de clases del admin.** El plan las pone en `features/clases` y no en `features/admin`, y cambia por eso las filas `clases` y `admin` de la tabla de módulos de `CLAUDE.md` (A-8). El motivo es sólido: las claves de TanStack Query de las clases tienen un solo dueño y se cumple la regla 9. Pero cambia lo que hoy dice `CLAUDE.md`: confírmalo al aprobar.
- **S-11.** Lo que publica el admin lleva en `autor.id` el id real de su cuenta (no su nombre). No abre nada, porque toda ruta del admin exige su rol, y quitarlo rompería el frontend anterior. Lo dejo visible por si prefieres otra cosa.
- **M-01.** Es una decisión técnica de autorización en carril sensible. Si el arquitecto adopta la forma preferida (el admin pasa solo donde `roles` lo incluye, sin lanzar), tu aprobación por escrito cubrirá también A-1 ampliada.

## Tu siguiente paso
El plan regresa al arquitecto por M-01 a M-03, con M-04 a M-07 en la misma enmienda. Después vuelve a revisión del manager (solo la enmienda) y luego va al humano con P-01, P-02 y las autorizaciones.

## Revisión de la Enmienda 1
Fecha: 2026-10-03 · Plan revisado: `plan.md`, SHA-256 `8fe2c9ca42eccceda228afb275e46e54ac75094e742466655e53106d52a29599` (estado LISTO; respuestas del humano: P-01 (b), P-02 (A), P-10 y P-11 sí, P-03 a P-09 (a))

Veredicto del plan completo: **APROBADO**
Verificación propia: sin suite, por instrucción. Lecturas contra el código de `middleware/index.ts`, los cinco `handlers/` con `protegido(`, los llamadores de los pasos de la cadena en `test/` y `src/`, `alumnos-b-r1.ataque:1100-1112`, `higiene-de-pruebas` (PR-CH-04h), los precedentes de PR-B05 y las pruebas del frontend que montan el router. El `lint` del comienzo de esta revisión sigue valiendo, porque la enmienda no toca código.

### M-01: resuelto
- **La forma es correcta.** `admiteAdmin = (roles ?? []).includes("admin")` se calcula en `protegido()` y baja por `requireMembership`/`requireOwnership` → `resolverClaseDeLaRuta` → `evaluarPertenencia` (core), sin valor por defecto. Con `pertenencia` y sin `roles`, la relación `"admin"` se niega con `403 SIN_ACCESO_A_LA_CLASE`, igual que hoy. Nada lanza.
- **No rompe las 11 pruebas.** Comprobé que `requireMembership()` y `requireOwnership()` solo se llaman en `middleware/index.ts:24` y `:27`. En las pruebas solo aparecen como textos de mensajes o marcas. Ninguna prueba combina `admin` en `roles` con `pertenencia`. La única que llama a `evaluarPertenencia` con dos argumentos es `src/core/clases/pertenencia.test.ts`, que es normal y ya está en PA-16 de 02a: PR-2A02 la reescribe.
- **Completa contra el código.** Toda ruta que el admin necesita para `/admin/clases/:claseId` lleva `admin` en `roles` según la matriz: detalle, código ×2, roster, candidatos, alta, baja, muro (listar, publicar, borrar), comentarios (listar y borrar), archivos ×2 y las tres de gestión con `:claseId`. Ninguna ruta de alumno o maestro lo gana sin querer: `personas`, `POST …/comentarios`, `mis-comentarios`, `inscritas`, `impartidas` y `unirse` quedan sin `admin`, y PR-2A23 lo prueba. Si a una ruta futura se le olvida `admin`, falla cerrado.
- **Clase inexistente:** `datos = null` → relación `null` → `403 SIN_ACCESO_A_LA_CLASE` para todos, también para el admin. Se conserva.
- **El resto quedó coherente con la forma nueva:** PR-2A06, PA-17, R-01, ataque 1 de 02a y los textos de ESSENTIALS, `ARCHITECTURE.md` §6 y `middleware/README.md`. No queda ninguna mención al lanzamiento retirado.

### M-02: resuelto
- PR-2A07 ejecuta la sentencia tal cual del `migration.sql`, dentro de una transacción que se revierte, sobre tablas temporales `clases` y `maestros_de_clase` sin FK. `pg_temp` va primero en la ruta de búsqueda y la sentencia no lleva esquema, así que no toca `public` ni toma candados sobre `usuarios`.
- Hay una precondición con aserción (`to_regclass`). La PK temporal permite probar `ON CONFLICT DO NOTHING`. Las tablas mueren con la transacción y la conexión del pool queda limpia.
- `$transaction(` en una prueba es legítimo: PR-CH-04h solo vigila `src/`. Es el mismo patrón que PR-B05.
- `crearClaseDePrueba` crea la clase y su asignación en un solo `create` anidado. Se cierra la ventana.

### M-03: resuelto
- C-19 a C-22 cubren mi inventario:
  - C-19: `badge-03b-r1:44-45`.
  - C-20: V-06, con cifras fijas de 39 y 40 y la ubicación de cada `enEspera`, coherentes con la regla de "resto" (los archivos nuevos fuera de `features/clases/components/` van en `fijos`).
  - C-21: V-07, con la insignia de la barra y el grupo del tipo.
  - C-22: `translate-x-[200%]`.
- C-16 queda ampliado a los dobles de `fetch` que responden `/me` a cualquier ruta.
- PA-16 suma las pruebas normales que nombré, y `features/auth/**` tiene su excepción, acotada, en "No se toca".
- **El argumento de `alumnos-b-r1:1106` se sostiene.** La regla busca `orderBy[^\n]*creadoEn` en una sola línea de `inscripciones.ts`. Con `ORDEN_DE_MAESTROS` definido una vez en `adapters/db/clases.ts` e importado, `inscripciones.ts` solo escribe `orderBy: ORDEN_DE_MAESTROS`. Lo que la regla protege (que nada ordene movimientos por `creado_en`) sigue intacto. Hacen falta dos condiciones: que `listarPersonas` no lea `.rol` en `handlers/clases/alumnos.ts` (regla de `:1110-1112`; no lo necesita, porque la firma y `puedeBorrar` viven en `muro.ts`) y que el programador no escriba el orden en línea en `inscripciones.ts`, cosa que V-04 puede cubrir con una búsqueda.
- Confirmé que `app/fondo-de-la-app.test.tsx` monta `rutasMinimas`, no el router completo, y que ninguna prueba normal arma un `Destino` (C-14 basta para las `*.ataque`).

### M-04 a M-07 y detalles menores: resueltos
- M-04: `coincidencia: "exacta" | "prefijo"` es obligatorio. PR-2C11 queda verificable y 02c suma `types.ts` y `barra-navegacion.tsx`.
- M-05: "una `200` y dos `409`".
- M-06: textos literales para `adapters/README.md` en 02a y 02b, con la invariante del roster. La viñeta del buscador de maestros pasa a 02a.
- M-07: A-10 nueva.
- Acepto el rechazo del +1 ms de R-13: mezclar el reloj de la app con el `now()` de la base en asignaciones posteriores sí es peor que el desempate por id.

### Observación (no bloquea)
- **O-E1 · PR-2A09** afirma que la clase y su asignación comparten `creado_en` porque "las dos toman `now()` de la misma transacción". Eso vale si Prisma deja el valor al `DEFAULT CURRENT_TIMESTAMP` de la base. Si la prueba muestra lo contrario, es un hallazgo que se resuelve sin aflojar la aserción (por ejemplo, dar a la asignación el mismo valor explícito); no se borra la igualdad. No cambia S-05: con valores distintos, el orden sigue siendo determinista.

### Autorizaciones para presentar al humano (confirmadas, A-1 a A-10)
| ID | Qué autoriza |
|---|---|
| A-1 | `middleware/index.ts`, `pertenencia.ts`, `require-membership.ts`, `require-ownership.ts` y `middleware/README.md` (02a, cerrado por defecto con `admiteAdmin`); `guarda-de-rutas.ts`, `rutas-publicas.ts` y los demás pasos siguen en "No se toca" |
| A-2 | Migración `clases_administradas` con datos y su aplicación en `campus_dev` (`prisma migrate dev`); renombres de `MovimientoInscripcion` solo en TypeScript |
| A-3 | Reescritura por el tester, en la ronda 0, de las `*.ataque` contradichas por un C-n, incluidos C-16 ampliado y C-19 a C-22; `alumnos-b-r1:1106` y `:1110-1111` no se reescriben |
| A-4 | Cambios del programador en las pruebas normales de PA-16 (solo los casos contradichos y los dobles), y las de I-2 |
| A-5 | Retirar `POST /api/clases`, `PUT /api/clases/:claseId`, `crearClase` y `useBorrarMiComentario`, sin borrar archivos |
| A-6 | Mover `varianteDeClase` (con `VarianteDeClase`) a `lib/` y las claves de clases a `services/clasesService.ts`, con reexportes |
| A-7 | Que el programador edite `docs/DESIGN.md` con los textos de 02c y 02d, marcados "propuesta (CLASES-02x)" |
| A-8 | Que el orquestador aplique los textos de ESSENTIALS, `ARCHITECTURE.md`, `CLAUDE.md` (con P-10), `PRD.md` (RN-07, con P-01 b) y `middleware/README.md` al cierre de cada subentrega, con su SHA-256 en `aprobacion.md` |
| A-9 | Una línea en `backend/src/app.ts` (registro de `gestionDeClasesHandler`) |
| A-10 | Retirar la defensa extra M-01 de CLASES-a (filtro por `maestro_id` en `editarClase`, `leerCodigo` y `regenerarCodigo`); la única autorización es el sexto paso |

Siguiente paso: el plan pasa al humano para la aprobación **por escrito** del carril sensible con A-1 a A-10. El orquestador la registra en `aprobacion.md` con `<R>` = `e4396a0` y el SHA-256 de arriba.

## Revisión de la Enmienda 2
Fecha: 2026-10-03 · Plan revisado: `plan.md`, SHA-256 `2a4cf22fc8fc6d873374f7f199ae102a2463c16b4c6ccf9f5a6b10aafb331de0`

Veredicto de la enmienda: **APROBADA** (el plan completo sigue APROBADO)

- **La parada era legítima y la corrección es mínima.**
  - `shared/package.json` exporta solo `"."` (`dist/index.js`), y `shared/src/index.ts` reexporta `./clases.js` por nombre (línea 132). Sin tocar `index.ts`, nada nuevo de `clases.ts` se puede importar.
  - La Enmienda 2 abre `index.ts` solo para agregar reexportaciones nombradas de lo nuevo de `clases.ts`, sin tocar las existentes ni agregar archivos. Lo dicen en el mismo sentido "Cambios por capa", "No se toca", los pasos 2 y 13 y A-11.
  - Las listas de 02a y 02b coinciden con los esquemas y constantes nuevos de esas subentregas. Lo que solo amplía un objeto existente (`CODIGOS_CLASES`, `autorDelMuroSchema`, `personasRespuestaSchema`…) no pide una exportación nueva.
- **Comprobé la afirmación sobre las pruebas, y se sostiene.**
  - `shared/` no tiene pruebas.
  - En `backend/src`, `backend/test` y `frontend/src` ninguna prueba hace `import *` de `@campus/shared`, lee `shared/src/index.ts` ni fija la lista de sus exportaciones.
  - Las únicas pruebas que nombran archivos de `shared/` son `arquitectura-cuentas-r1.ataque:134`, que lee `shared/package.json` buscando dependencias prohibidas y no cambia, y `muro-c-r1.ataque:1118`, que busca copias de una regla en `backend/src` y `frontend/src`, no en `shared/`.
  - No hace falta un C-n ni una entrada de PA-16.
- **A-11 es correcta y suficiente**, y el humano ya la autorizó por escrito (`aprobacion.md`). Autorizaciones vigentes: A-1 a A-11.
- **Detalle menor (no bloquea):** en "Cambios por capa / shared" el encabezado sigue diciendo "`shared/src/clases.ts` (único archivo de `shared/` que cambia)", y la última viñeta, "Ningún otro archivo de `shared/` cambia". La viñeta nueva de `index.ts` manda sobre las dos, pero conviene que el arquitecto ajuste esas frases en su próxima edición del plan para que no se contradigan.

## Verificación del resumen — CLASES-02a — implementación
Fecha: 2026-10-03 · Plan `2a4cf22f…` (Enmiendas 1 y 2) · Resumen: `resumen-programador.md`, "CLASES-02a — Implementación"

Veredicto: **ACEPTADO.** Todas las cifras coinciden con mis corridas, cada viñeta de "Pruebas requeridas" tiene su caso, y los hermanos coinciden con el código. Hay un hallazgo menor (M-08), que no bloquea el ataque del tester.

### Mis corridas (una a la vez; PA-01: regla del firewall habilitada, Inbound/Block/Public; red `IZZI-F281-5G` en perfil Public; Docker 28.5.1)
| Comando | Resumen del programador | Mi corrida |
|---|---|---|
| `cd backend; npm run lint` | código 0; última línea `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | código 0; misma última línea |
| `cd backend; npm run build` | (incluido en el `build` de la raíz) | código 0 (`tsc -p tsconfig.json`) |
| `cd backend; npx prisma validate` | "The schema at prisma\schema.prisma is valid" | igual |
| `cd backend; npm test` (una corrida completa) | `Test Files 136 passed (136)` · `Tests 1673 passed (1673)` | `Test Files 136 passed (136)` · `Tests 1673 passed (1673)` · 92.59 s |
| PA-07 | 0/0/0/0 · 10 "Error no controlado" = I-1 · 5 `P2028` permitidos, con control positivo | 0 `40P01`, 0 `deadlock detected`, 0 `could not serialize`, 0 `too many clients`, 0 `Unable to start a transaction`; **10** "Error no controlado", los mismos 10 de I-1 (5 + 1 de `intentos-r2`, `ZodError` en `archivos.ts:61`, `archivos.ts:90` y `muro.ts:140`, `boom`); **5** `P2028`: `cambiar-contrasena` (`tx.sesion.findFirst`), `refrescar` (`tx.sesion.updateMany`), comentarios (`$queryRawUnsafe` al encolar), `login` (`tx.sesion.create`) y `restablecer` (`tx.tokenCuenta.updateMany`). Están los tres del control positivo y ninguno es de una ruta de CLASES-02 |
| `cd frontend; npm test` | `104 passed` · `1396 passed` | `Test Files 104 passed (104)` · `Tests 1396 passed (1396)` |
| `cd frontend; npm run lint` | código 0; última línea `tsc -b` | código 0; misma última línea |
| `cd shared; npm run lint`, `npm run build` en la raíz | código 0; `✓ built in 2.08s` | código 0; `✓ built in 888ms` (el tiempo no es una cifra a contrastar) |
| Casos con `PR-2A` en el título | 59 | 59 casos `it("PR-2A…` en el código fuente, sin `it.each`, repartidos así: 01:10, 02:3, 03:3, 04:4, 05:4, 06:4, 07:1, 08:1, 09:1, 10:4, 11:1, 12:2, 13:2, 14:2, 15:2, 16:1, 17:2, 18:1, 19:1, 20:1, 21:1, 22:5, 23:2, 24:1. Coincide con los títulos y archivos del resumen |
| V-01 | 115/115 contra `tabla-02a-r0.md` | 115/115 contra la tabla de `reporte-tester.md` (ronda 0 de 02a). Las 14 `*.ataque` modificadas son exactamente las 14 marcadas "cambia" por el tester; el programador no tocó ninguna `*.ataque` y no hay ninguna sin rastrear |

### Diff contra `e4396a0` (46 archivos rastreados y 8 nuevos) frente a A-1 a A-11 y "Cambios por capa"
Ningún archivo queda fuera:
- `shared/src/clases.ts` e `index.ts` (A-11).
- Esquema y la migración nueva (A-2), la única carpeta nueva en `migrations/`.
- `core/clases/{pertenencia,maestros,texto}.ts`.
- `adapters/db/{clases,maestros-de-clase,inscripciones,index}.ts`.
- Los cuatro archivos de `middleware/` de A-1 y su README.
- `handlers/clases/{gestion,clases,alumnos}.ts`, `app.ts` (A-9) y los tres README.
- Las pruebas normales de PA-16 y los cuatro dobles del frontend (solo se agregó `maestros`, sin tocar ninguna aserción).

La guarda, `rutas-publicas.ts`, `require-role.ts`, `tipos.ts`, los `package.json` y `docs/` (fuera de esta carpeta y de `ESTADO.md`) no cambian. El diff de `docs/ESTADO.md` y del `aprobacion.md` de CHORE-02 es del orquestador.

### Revisión del código
- **Sexto paso (§D-2.0, Enmienda 1).** `protegido()` calcula `admiteAdmin` una sola vez de `roles` y lo pasa a `requireMembership` y `requireOwnership`, que lo reciben sin valor por defecto, y de ahí a `resolverClaseDeLaRuta` y a `evaluarPertenencia`. Con `"admin"` y `admiteAdmin` falso responde `403`. Nada lanza.
- **`relacionConClase`.** El rol manda, y se rechazan los datos imposibles (un maestro inscrito, un estudiante asignado). Una clase inexistente da `null`, es decir `403`, para todos.
- **Matriz de roles, ruta por ruta.** Comparé los 26 `protegido(` de `handlers/clases/*` y `archivos.ts`:
  - `admin` aparece exactamente en el detalle, el código ×2, el roster, los candidatos, el alta, la baja y las seis rutas de gestión.
  - No aparece en `personas`, `inscritas`, `impartidas`, `unirse`, las siete del muro ni las dos de archivos (esas se abren en 02b).
  - Ninguna ruta de alumno o maestro lo ganó sin querer.
- **Migración.** El SQL es igual a §D-2A1, más el bloque de datos `INSERT … SELECT … ON CONFLICT DO NOTHING`. Es solo aditiva: sin `DROP` ni `ALTER` de columnas existentes. `clases.maestro_id` sigue `NOT NULL` con su FK y su índice, así que es compatible hacia atrás.
- **Escritura doble y PA-14.** `clases.maestro_id` solo se escribe en dos lugares: `crearClaseAdministrada` (`maestroId: primero`) y el `updateMany` de `retirarMaestro` (`where: { id, maestroId: retirado }`, `data: { maestroId: restante }`), los dos dentro de la transacción. Los `maestro:` que aparecen en un `select` son la relación de `MaestroDeClase`, no la de `Clase`. Ninguna lectura de `Clase.maestroId` ni de `clasesImpartidas`.
- **`core/` y la concurrencia.** `decidirAsignacion` (tope de `MAXIMO_MAESTROS_POR_CLASE`, idempotente) y `decidirRetiro` (mínimo de uno, idempotente) son puras. `asignarMaestro` y `retirarMaestro` bloquean primero la fila de la clase (`updateMany` de `actualizado_en`) y después leen y deciden, en `enTransaccion`. PR-2A15 pasa en la corrida completa.
- **Estado de pago.** Los archivos de `backend/src` que mencionan `estadoPago` son los mismos ocho que en `e4396a0`. "Personas" sigue sin estado de pago ni restricción. PR-2A22 revisa las respuestas a estudiantes.
- **Hermanos.** La lista del resumen coincide con el código:
  - las 7 rutas abiertas al admin y las 13 que siguen cerradas;
  - los 8 lugares que leían `clases.maestro_id` o `Clase.maestro`, ya migrados;
  - las tres operaciones sin el filtro M-01 (A-10);
  - `actorId` en el adaptador y en los dos handlers;
  - los dos pasos con `admiteAdmin`.
  No encontré ninguno que falte.

### Arbitraje de las desviaciones
Numeradas como las presentó el orquestador; las del resumen que no estaban en su lista van al final.
1. **`listarPersonas` lee `maestros_de_clase` en 02a.** **Aceptada.** Era obligatoria: dejarla en `Clase.maestro` habría violado PA-14. La respuesta no cambia (`maestro` es el primero), y devolver `null` sin maestros mantiene el `403`.
2. **`crearClaseAdministrada` fija un `creadoEn` explícito y `maestro_id` es el id menor.** **Aceptada, con una nota.** El `maestro_id` menor coincide con el orden S-05, que desempata por id, así que es coherente. El `creadoEn` explícito usa el reloj de la aplicación, que es justo lo que el arquitecto quiso evitar en R-13. El riesgo práctico es nulo: la aplicación y la base corren en el mismo host, y `Date` va en UTC. No pido revertirlo, pero no debe extenderse a otras escrituras: las asignaciones posteriores siguen con el `DEFAULT` de la base.
3. **El candado toca `actualizado_en` también en las respuestas idempotentes.** **Aceptada.** Es el paso 1 de §D-2A4: el candado va antes de decidir, porque solo así se ponen en serie las peticiones. Que `actualizado_en` cambie sin un cambio de datos es un efecto conocido y nadie lo lee.
4. **PR-2A06 vive en `src/middleware/index.test.ts` e importa ayudas de `../../test/`.** **Aceptada.** PA-16 solo permitía ese archivo para middleware. `lint`, que incluye `tsconfig.test.json`, y `build` lo aceptan. Desde ahora ese archivo necesita la base desechable; queda dicho para el tester.
5. **El programador editó `middleware/README.md`, `adapters/README.md` y `handlers/README.md`.** **Aceptada.** El paso 7 del plan pone `middleware/README.md` en la lista del programador. M-06 (Enmienda 1) dice "lo edita el programador" para `adapters/README.md`, y `handlers/README.md` está en sus archivos de 02a. A-8 los nombra también para el orquestador: es un traslape del plan, no una desviación. Contrasté el texto de `middleware/README.md` con "Textos propuestos": coincide. El realineado de Prettier se hizo dentro de `backend/`, como permite la regla de formateadores. **El orquestador no debe volver a aplicar esos tres textos al cerrar 02a**: le quedan ESSENTIALS, `ARCHITECTURE.md`, `CLAUDE.md` y `ESTADO.md`.
6. **PR-2A12 comprueba `total` como "mayor o igual a 5".** **Aceptada como prueba, con el hallazgo M-08.** El paralelismo impide la igualdad exacta, pero "≥ 5" no detectaría un `total` que fuera la longitud de la página o un conteo con filtro equivocado.
7. **PR-2A06 sin "undefined explícito" ni "otra capitalización".** **Aceptada.** Esas variantes eran del punto de ataque 1 del tester, no de las viñetas de PR-2A06. `exactOptionalPropertyTypes` impide pasar `roles: undefined`, y `"Admin"` no es un `Rol`. Quedan para el tester.
8. **PR-2A17 sin la comprobación de que el correo completo no salga en los logs.** **Aceptada.** No es viñeta de PR-2A17: es PA-10 y el punto 7 del ataque del tester.
- **(del resumen) `clases.ts` exporta `generarCodigo` y `conMaestroPrincipal` para `gestion.ts`.** Aceptada: el plan lo permitía ("se exporta desde ahí o se mueve").
- **(del resumen) El `HEAD` de `GET /api/admin/clases` lo deriva Fastify.** Aceptada: lo prueban V-06 y PR-2A24.
- **(del resumen) Un maestro ya asignado que pasó a inactivo recibe `404` al "asignar de nuevo".** Aceptada: es el orden de §D-2A4, paso 2, y hoy ninguna ruta desactiva cuentas. Va con R-06 a ADMIN.

### Hallazgos
- **M-08 (no bloquea; se corrige en la siguiente ronda del programador).** `backend/test/gestion-clases.integracion.test.ts:361`: `expect(cuerpo.total).toBeGreaterThanOrEqual(5)` es demasiado débil para la viñeta "`total`" de PR-2A12. Se espera que `total` quede acotado por un `COUNT` de `clases` tomado antes y otro tomado después de la petición (`antes ≤ total ≤ después`) en el mismo caso, para que un `total` mal calculado falle sin depender de las pruebas que corren en paralelo. Hermano revisado: `impartidas` (PR-2A18) ya compara `total` con igualdad sobre datos propios; está bien.

### Qué sigue
Que el tester ataque 02a (ronda 1), con V-01 contra la tabla de su ronda 0. M-08 entra en la siguiente corrección del programador, junto con lo que reporte el tester.

## Arbitraje — ronda 1 de 02a
Fecha: 2026-10-03 · Sobre `reporte-tester.md`, "CLASES-02a — Ronda 1" (ROTO solo por T-01, de severidad baja)

**(1) T-01: recomiendo corregirlo en `handlers/validacion.ts`, con la autorización nueva A-12.**
- **El remedio es general.** La causa vive en una sola función: `validarCuerpo` comprueba `typeof cuerpo !== "object"` y deja pasar los arreglos. Las 21 llamadas de `handlers/` heredan el defecto: los hermanos que nombra el tester más `gestion.ts`. Basta agregar `Array.isArray(cuerpo)` a esa guarda, con el mismo `400 VALIDACION` "cuerpo: debe ser un objeto JSON", en español.
- **Una corrección local en `gestion.ts` sería peor.** Duplicaría la guarda en un handler, contra la regla de hermanos de `AGENTS.md` y contra la idea de que los handlers son delgados. Los otros seis caminos quedarían con el mensaje en inglés como pendiente, sin ninguna ventaja.
- **Riesgo bajo.** Busqué en `backend/test` y `backend/src`: ninguna prueba fija el mensaje en inglés para un arreglo. La única que fija el texto en español (`auth-login.integracion:166`) ya espera el mensaje que dará la corrección. Ningún esquema de cuerpo de hoy acepta un arreglo en la raíz.
- **Prueba que se pide:** una unitaria de `validarCuerpo` (`[]`, `["x"]` y `[{}]` dan `400` con "cuerpo: debe ser un objeto JSON"; un objeto válido sigue pasando). Además, el caso T-01 de `gestion-02a-r1.ataque.test.ts` en verde, sin tocarlo. Como todos los hermanos pasan por la misma función, la unitaria los cubre. Si el humano quiere una prueba por ruta, el tester la agrega en la ronda 2 sin rehacer nada.
- **Hermanos que el programador debe listar uno por uno** (regla de hermanos):
  - `POST /api/admin/clases` y `/maestros`, y `PUT /api/admin/clases/:claseId`;
  - `POST /api/clases/:claseId/alumnos` y `POST /api/clases/unirse`;
  - las rutas de `handlers/auth/**` y `handlers/admin.ts`;
  - la subida de archivos;
  - las de `muro.ts`, que no nombró el tester.
- **Si el humano no autoriza A-12:** la corrección local en `gestion.ts` es aceptable como mínimo, con una fila en ESTADO §3 ("`validarCuerpo` acepta arreglos; mensaje en inglés en siete caminos", destino ADMIN o el próximo `chore` del backend).

**(2) O-03: es un error de redacción del plan; basta corregir el texto.**
La regla vigente es la de CHORE-02 (ESSENTIALS, "Autorización"): una ruta no pública no puede tener un parámetro o un comodín en sus **dos primeros** segmentos. `/api/admin/:x/…` lleva el parámetro en el tercero, y debe arrancar: es la misma forma que `PUT /api/admin/usuarios/:id/correo`, que existe desde AUTH-02.

No hay un riesgo real:
- Esa ruta igual pasa por `protegido()` completo (la guarda lo exige).
- Bajo `/api/admin` todo exige `roles: ["admin"]`, y el admin alcanza cualquier clase.
- Si el parámetro se llamara `:claseId`, la regla de `:claseId` exigiría el sexto paso.
- La guarda no cambió en 02a.

Qué hacer: el arquitecto corrige el punto 2 del ataque de 02a en el plan para que diga "que `/:x/…` y `/api/:x/…` sigan rechazándose por los dos primeros segmentos". Sin código ni prueba nueva; la prueba del tester ya afirma lo correcto.

**(3) O-04: pendiente con destino, sin cambio en CLASES-02.**
El correo que queda en el log es entrada que escribió el propio admin en la URL del buscador, no un dato que la API saque de la base. Es el mismo comportamiento que el buscador de alumnos desde CLASES-b. Lo que PA-10 protege, que no salga en el log el correo de un candidato, resistió (`logs-02a-r1`).

Aun así, la URL completa con la consulta en cada log es una fuga general de lo que el usuario escriba. Fila nueva en ESTADO §3: "Los logs de petición incluyen `req.url` con la consulta; un término de búsqueda (alumnos o maestros) queda en el log tal como se escribió. Decidir si el serializador de la petición omite la consulta". Destino: DEPLOY (configuración del logger en `config/logger.ts`, que está en "No se toca" de CLASES-02).

**(4) M-08 va en la misma corrección del programador que T-01:** PR-2A12, con `total` acotado por un `COUNT` antes y otro después de la petición.

**Siguiente paso:**
1. El humano decide A-12 (`handlers/validacion.ts`).
2. Con A-12, el arquitecto anota en el plan la autorización y la corrección de redacción de O-03 (una línea cada una).
3. El programador corrige T-01 y M-08 con su lista de hermanos.
4. El manager verifica el resumen y el tester ataca la ronda 2.

## Verificación del resumen — CLASES-02a — corrección de la ronda 1
Fecha: 2026-10-03 · Resumen: `resumen-programador.md`, "CLASES-02a — Corrección de la ronda 1"

Veredicto: **ACEPTADO.** Las cifras coinciden, la corrección se limita a la guarda y los hermanos coinciden con el código. No hay hallazgos nuevos.

### Mis corridas (una sola corrida completa; PA-01: regla del firewall habilitada; red en perfil Public)
| Comando | Resumen | Mi corrida |
|---|---|---|
| `cd backend; npm run lint` | código 0; `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` | código 0; misma última línea |
| `cd backend; npm run build` | código 0 | código 0 |
| `cd backend; npm test` | `Test Files 141 passed (141)` · `Tests 1700 passed (1700)` | `Test Files 141 passed (141)` · `Tests 1700 passed (1700)` |
| PA-07 | limpia, con control positivo | 0 `40P01`, 0 `deadlock detected`, 0 `could not serialize`, 0 `too many clients`, 0 `Unable to start a transaction`. **10** "Error no controlado", los de I-1: 5 "fallo simulado … búsqueda", 1 "… al crear la sesión", `ZodError` en `archivos.ts:61`, `archivos.ts:90` y `muro.ts:140`, y `boom`. **5** `P2028`, los permitidos: `cuentas.ts:202` (cambiar contraseña), `index.ts:134` (login), `index.ts:180` (refrescar), `cuentas.ts:106` (restablecer) y el de la cola de comentarios. Están los tres del control positivo |
| Conteos | 141 archivos y 1700 casos (+5 y +27 desde 136 y 1673) | Cuadran. +4 archivos `*.ataque` del tester y +1 `validacion.test.ts`. 1673 + 25 casos del tester = 1698, como reporta su ronda 1, + 2 casos de `validacion.test.ts` = 1700 |
| V-01 | 119/119 | 119/119: las 115 de la tabla de la ronda 0 más las 4 nuevas de la tabla de la ronda 1 (`concurrencia-02a-r1`, `gestion-02a-r1`, `logs-02a-r1`, `sexto-paso-02a-r1`). Hay 119 `*.ataque` entre rastreadas y no rastreadas, y el programador no tocó ninguna |

### Revisión
- **`handlers/validacion.ts` (A-12).** El diff contra `e4396a0` es exactamente una condición: `|| Array.isArray(cuerpo)` en la guarda de `validarCuerpo`. Conserva el mensaje en español de siempre. `validarParametros` no cambia.
- **Hermanos.** Hay 21 llamadas a `validarCuerpo` en `handlers/`: 5 en `admin.ts`, 1 en `archivos.ts`, 5 en `auth/cuentas.ts`, 2 en `auth/index.ts`, 1 en `auth/registro-maestro.ts`, 1 en `clases/alumnos.ts`, 1 en `clases/clases.ts`, 3 en `clases/gestion.ts` y 2 en `clases/muro.ts`. Coinciden una por una con la lista del resumen. Todas pasan por la función corregida y ninguna necesitó un cambio local.
- **M-08 (PR-2A12), resuelto.** El caso toma `clase.count()` antes y después de la petición y exige `min(antes, después) ≤ total ≤ max(antes, después)`, además del piso de 5. Usar el mínimo y el máximo, en lugar de antes y después tal cual, es correcto porque otros archivos también borran clases a la vez.
- **Archivos tocados en esta corrección:** solo `validacion.ts`, `validacion.test.ts` y `gestion-clases.integracion.test.ts`.

### Arbitraje de la desviación: `backend/src/handlers/validacion.test.ts`, archivo de pruebas nuevo fuera de PA-16
**Aceptada, como excepción de PA-16 decidida por el manager.** Se registra así, no como parte de A-12.
- **Por qué no la cubre A-12.** A-12 autoriza cambiar el archivo de producción `validacion.ts`. PA-16 es la lista cerrada de archivos de **prueba** de cada subentrega. La prueba la pidió el arbitraje de la ronda 1 ("una unitaria de `validarCuerpo`"), así que su origen es una decisión del manager, no una desviación del programador.
- **Qué falta.** Que el arquitecto agregue `backend/src/handlers/validacion.test.ts` a la columna "Crear" de 02a en "Pruebas: listas cerradas por subentrega" (una línea, citando este arbitraje), para que la lista cerrada vuelva a coincidir con el árbol. No requiere al humano ni una autorización nueva.

### Qué sigue
La ronda 2 del tester sobre 02a, con V-01 contra la tabla de su ronda 1 (119). La línea de PA-16 la puede agregar el arquitecto en paralelo; no bloquea la ronda.

## Revisión final — CLASES-02a
Fecha: 2026-10-03 · Plan con Enmiendas 1 y 2 y las correcciones de texto (A-12, O-03, la línea de PA-16) · Tester: ronda 0, ronda 1 (ROTO por T-01, de severidad baja) y ronda 2 (RESISTE)

Veredicto: **APROBADO CON OBSERVACIONES.** Nada bloquea el commit de 02a. M-09 no bloquea y tiene destino 02b.

Verificación propia:
- **PA-01:** regla del firewall habilitada, red en perfil Public.
- **Backend:** `npm run lint` código 0 · `npm run build` código 0 · `npx prisma validate` "valid" · `npx prisma migrate status` "10 migrations found… Database schema is up to date!" · `migrate diff --exit-code` código 0, "No difference detected.".
- **Una corrida completa:** `Test Files 142 passed (142)` · `Tests 1703 passed (1703)` · 97.00 s. Coincide con las tres corridas del tester en la ronda 2.
- **PA-07:**
  - 0 `40P01`, 0 `deadlock detected`, 0 `could not serialize`, 0 `too many clients`, 0 `Unable to start a transaction`.
  - 10 "Error no controlado", exactamente I-1 (los 6 de `intentos-r2`, `ZodError` en `archivos.ts:61`, `:90` y `muro.ts:140`, y `boom`).
  - 5 `P2028`, los permitidos (`cuentas.ts:202` y `:106`, `index.ts:134` y `:180`, y la cola de comentarios), con el control positivo.
- **Frontend:** sin cambios desde mi verificación de la implementación. Siguen los mismos 11 archivos de prueba (7 `*.ataque` del tester y 4 dobles con `maestros`) y ningún archivo de producción. Su última corrida verificada: 104 archivos y 1396 casos, `lint` código 0.
- **V-01:** 120/120 contra la tabla de la ronda 2. Hay 120 `*.ataque` entre rastreadas y no rastreadas; las cambiadas y las nuevas son todas del tester (14 en la ronda 0 y 6 nuevas en las rondas 1 y 2). El programador no tocó ninguna.

### 1. Lo planeado, solo lo planeado y todo lo planeado (02a)
Comparé "Alcance 02a", puntos 1 a 7, contra el código.
1. **`maestros_de_clase`.** Migración `20261003191319_clases_administradas` con el SQL de §D-2A1 y el bloque de datos. Escritura doble en `clases.maestro_id`.
2. **Sexto paso cerrado por defecto.** `admiteAdmin` sale de `roles`; la guarda no cambió.
3. **Seis rutas de gestión** en `handlers/clases/gestion.ts`: lista, crear, editar, asignar, retirar y candidatos.
4. **Rutas existentes abiertas al admin:** detalle, código ×2, roster, candidatos, alta y baja con `actorId`.
5. **`POST /api/clases` y `PUT /api/clases/:claseId` retirados.** `crearClase` ya no existe.
6. **Respuestas con `maestros`,** conservando `maestro` como campo de compatibilidad.
7. **El trivial del mensaje de `descripcionClaseSchema`.**

Además entraron cosas fuera de la lista original, todas autorizadas o arbitradas:
- T-01 en `handlers/validacion.ts` (A-12), con su unitaria (excepción de PA-16).
- `conTextosNormalizados` en `core/clases/texto.ts` (§D-2B5, parte de 02a).
- Los tres README.
- Las desviaciones aceptadas en la verificación de la implementación.

No falta nada de 02a.

### 2. "No se toca", autorizaciones y "Cambios por capa"
- **`git diff --stat e4396a0` sin `docs/`:** 45 archivos rastreados (+1234/−433) y 14 nuevos. Todos encajan en "Cambios por capa" de 02a, en A-1, A-2, A-4, A-5, A-9, A-10, A-11 o A-12, o en el trabajo del tester (A-3).
- **"No se toca", archivo por archivo con `git diff --quiet e4396a0`:** guarda, `rutas-publicas.ts`, `authenticate.ts`, `with-profile.ts`, `with-password-gate.ts`, `with-access.ts`, `require-role.ts` y `tipos.ts`; `adapters/{auth,notifier,queue,scheduler,storage,live}/**`; los diez archivos de `adapters/db` protegidos; `config/**` y `workers/**`; `core/{auth,correo,eventos,archivos}/**`, `errores.ts`, `paginacion.ts`, `codigo.ts` y `busqueda.ts`; `handlers/auth/**`, `admin.ts`, `usuarios.ts`, `salud.ts` y `errores.ts`; `test/global-setup.ts`, `setup.ts`, `vitest.config.ts`, `tsconfig*.json` y `eslint.config.mjs`. **Sin cambios.**
- **Fuera de los paquetes:** sin cambios en `infra/`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `.claude/`, los `package.json` (raíz y tres paquetes) ni `package-lock.json`.
- **Migraciones y `shared/`:** en `migrations/` solo está la carpeta nueva. En `shared/` solo cambian `clases.ts` e `index.ts` (A-11).

### 3. Verificaciones del plan que aplican a 02a
- **V-01:** 120/120 (arriba).
- **V-02:** las corridas de arriba.
- **V-03:** `validate`, `migrate status` y `migrate diff` en código 0. `generate` y `format --check` los reportó el programador, y la corrida de pruebas no habría compilado sin el cliente generado.
- **V-04:**
  - 1 `$queryRawUnsafe(`, en `cliente.ts`. Ningún `$queryRaw` ni `$executeRaw` nuevo.
  - 0 `addHook` en `handlers/` y 0 `console.` en los archivos nuevos.
  - `movimientoInscripcion` solo con `.create(`, en `inscripciones.ts:231` y `:250`, con `actorId`.
  - `clases.maestro_id` solo se escribe en `crearClaseAdministrada` y en el `updateMany` del retiro. Ninguna lectura de `Clase.maestroId`, de `Clase.maestro` ni de `clasesImpartidas`: **PA-14 se cumple**.
  - Los archivos con `estadoPago` son los mismos ocho de `e4396a0`.
- **V-05:** arriba.
- **V-06:** lo prueban PR-2A24 y la lista cerrada de `sesiones-y-cadena.ataque` (en verde).
- **V-07:** 142 archivos y 1703 casos, iguales a `vitest list` del tester.

### 4. Reglas que no se rompen y autorización
- **Capas:**
  - `core/clases/maestros.ts` es puro: solo importa `@campus/shared` y `AppError`.
  - Prisma vive solo en `adapters/db`.
  - Los handlers son delgados y no verifican rol ni pertenencia a mano.
  - La autorización vive en el sexto paso: tras A-10 no queda ningún filtro duplicado.
- **Matriz de autorización:** los 26 `protegido(` coinciden con la matriz de 02a. Lo prueban PR-2A20, PR-2A22, PR-2A23, `sexto-paso-02a-r1` y `cuerpos-02a-r2`.
  - El admin entra en el detalle, el código ×2, el roster, los candidatos, el alta, la baja y la gestión.
  - Queda fuera de `personas`, `inscritas`, `impartidas`, `unirse`, el muro y los archivos, con `403 ROL_NO_PERMITIDO`.
  - Una clase inexistente da `403 SIN_ACCESO_A_LA_CLASE` a todos.
- **Datos que reciben los estudiantes:** el detalle y `inscritas` traen `maestros` con `{ id, nombre }` (en `inscritas`, solo `nombre`). Ningún correo, rol ni estado de maestros. `personas` no cambia de forma en 02a (los correos llegan en 02b). Ninguna respuesta a un estudiante lleva `estadoPago` ni `accesoRestringido` (PR-2A22).
- **Consultas:** todas filtran por índice, incluidos los dos índices nuevos. Las listas paginan con cursor validado por PK. Sin N+1. Las escrituras compuestas van en `enTransaccion`, con la fila de la clase bloqueada.
- **Fechas** en UTC; **secretos**, ninguno; **cola**, sin eventos nuevos (S-10).
- **Migración:** compatible hacia atrás. Es aditiva, `maestro_id` sigue `NOT NULL`, y está aplicada en `campus_dev` ("up to date").

### 5. Definición de terminado (`AGENTS.md`), para 02a
- [x] Cumple la parte de 02a de RF-52, RF-31, RF-38, RN-04 y RN-06.
- [x] Respeta las capas y pasa por el middleware.
- [x] `lint`, `build` y `test` en verde (backend; frontend en su última corrida verificada).
- [x] Pruebas de autorización por endpoint (PR-2A22 a PR-2A24 y las `*.ataque`).
- [x] Migración incluida y compatible hacia atrás.
- [x] `infra/` y `.env.example` sin cambios (no hacía falta).
- [ ] **Documentos:** los tres README del backend ya están. Faltan los textos de ESSENTIALS, `ARCHITECTURE.md` y `CLAUDE.md` (abajo) y las filas de ESTADO, que aplica el orquestador al cerrar 02a.

### Hallazgos
- **M-09 (no bloquea; destino 02b, carril trivial dentro de §D-2B5).**
  - **Dónde:** `core/clases/texto.ts`, `conTextosNormalizados`.
  - **El problema:** la función hace `{ ...cuerpo }`, así que convierte un arreglo en objeto antes de `validarCuerpo`. Las rutas que normalizan antes de validar (crear y editar clase hoy; publicar y comentar cuando `muro.ts` use la versión de `core/` en 02b) responden `400` con el mensaje del primer campo, en lugar de "cuerpo: debe ser un objeto JSON". El estado `400` y el español son correctos; lo que falla es la coherencia del mensaje con las demás rutas (lo observó el tester en la ronda 2).
  - **Qué se espera:** que en 02b `conTextosNormalizados` devuelva intacto un arreglo, como ya hace con lo que no es objeto, para que la guarda de A-12 responda el mensaje uniforme. Se agrega su caso a PR-2A05 (`texto.test.ts`, ya en PA-16).

### Medición del programador en 02a (regla de "Resúmenes verificables")
- **Rondas del tester:** ronda 0, ronda 1 (ROTO por un hallazgo de severidad baja) y ronda 2 (RESISTE). **Rondas extra por no extender un remedio a sus hermanos: 0.** T-01 era un defecto previo de `validarCuerpo`, no un remedio incompleto. Su corrección general cubrió las 21 llamadas, como confirmó la ronda 2.
- **Resúmenes devueltos:** 0 de 2. Las cifras coincidieron las dos veces.
- **PARADAS:** 1 (PA-06, `shared/src/index.ts`): fue un hueco del plan, resuelto con la Enmienda 2.
- **Desviaciones declaradas:** 8 en la implementación más 3 en el resumen, y 1 en la corrección. Todas aceptadas.
- **Hermanos:** listados las dos veces y correctos contra el código.
- **El umbral para pasar al programador a `opus`** (2 o más rondas extra por hermanos en una subentrega) **no se alcanzó.**

### Textos que el orquestador aplica al cerrar 02a (con A-8 y el SHA-256 en `aprobacion.md`)
Son los de "Textos propuestos → Al cerrar 02a" del plan, literales:
1. **`docs/ARCHITECTURE-ESSENTIALS.md`, "Autorización":** la viñeta que empieza "`requireMembership`: estudiante inscrito…".
2. **ESSENTIALS, "Tablas" → "Restricciones clave":** la parte de `maestros_de_clase`.
3. **ESSENTIALS, "Reglas de negocio que tocan código":** la última oración de la viñeta "Alta manual".
4. **`docs/ARCHITECTURE.md` §6:** fila 6 de la tabla, la oración que empieza "El administrador alcanza cualquier clase desde CLASES-02…".
5. **ARCHITECTURE §6:** la viñeta "Las rutas de clases del administrador (`/admin/clases/{claseId}…`…)".
6. **ARCHITECTURE §7:** la fila `clases` (quitar `POST /clases` y el `PUT`; sustituir la nota "**CLASES-02 (decidido el 2026-10-02…**").
7. **ARCHITECTURE §7:** la fila `admin`, la parte "clases (CLASES-02: …; rutas exactas en su plan)".
8. **ARCHITECTURE §14:** filas `clases`, `maestros_de_clase` (incluye P-09, `CASCADE` hacia `clases`) y `movimientos_inscripcion`.
9. **ARCHITECTURE §14, "Reglas de acceso a datos":** al final de la viñeta de la búsqueda, el buscador de maestros (M-06: va en 02a).
10. **`CLAUDE.md`, tabla de módulos:** filas `clases` y `admin` (P-10).

**No se vuelven a aplicar** `backend/src/middleware/README.md`, `adapters/README.md` ni `handlers/README.md`: ya los aplicó el programador y los verifiqué. Ningún texto de 02a toca `PRD.md`, `DESIGN.md` ni `README.md`.

### Pendientes para `ESTADO.md` §3 (filas nuevas y cierres)
- **Nueva:** retiro de compatibilidad de CLASES-02 (`clases.maestro_id` con su FK e índice, el campo `maestro` de las respuestas de clase y de personas, y `DELETE /clases/{claseId}/mis-comentarios/{comentarioId}`). Destino: antes del primer DEPLOY o, si ya ocurrió, cuando CLASES-02 esté en `prod`.
- **Nueva:** R-06, al agregar la baja de usuarios o el cambio de rol, revisar la validación de maestros al crear una clase y el `404` al reasignar a un maestro ya asignado que pasó a inactivo. Destino: ADMIN.
- **Nueva:** O-04, los logs de petición incluyen `req.url` con la consulta, así que un término de búsqueda (alumnos o maestros) queda tal cual en el log. Decidir si el serializador omite la consulta (`config/logger.ts`). Destino: DEPLOY.
- **Nueva:** M-09. Destino: 02b (§D-2B5).
- **Nueva (del resumen):** `backend/src/handlers/README.md` aún dice "roster del dueño" para `clases/alumnos.ts`; desde 02a también lo ve el admin. Destino: 02b, carril trivial, con el texto de "Personas".
- **Se cierran:**
  - la fila "CLASES-02: la excepción de la guarda para las rutas de clases del administrador…": no hizo falta ninguna excepción;
  - la de M-20 de CLASES-01: ya estaba resuelta desde CLASES-a;
  - la del mensaje de tipo de `descripcionClaseSchema` (trivial de 02a hecho).

### Cifras finales de 02a
| | Archivos | Casos |
|---|---|---|
| Backend | 142 (desde 132) | 1703 (desde 1623) |
| Frontend | 104 | 1396 |
| `*.ataque` | 120 (desde 115; tabla de la ronda 2, base de V-01 de 02b) | |

Siguiente paso: el orquestador aplica los textos y las filas de arriba, le da al humano el bloque del commit `<K2a>` y, después del commit, arranca la ronda 0 de 02b.

## Verificación del resumen — CLASES-02b — implementación
Fecha: 2026-10-05 · Base de "No se toca" dentro de los paquetes: `<K2a>` = `07c992f` (fuera de ellos, `e4396a0`) · Resumen: `resumen-programador.md`, "CLASES-02b — Implementación"

Veredicto: **ACEPTADO.** Todas las cifras coinciden, cada viñeta PR-2B tiene su caso, y la regla de autoría se aplica en el backend dentro de la transacción. No hay hallazgos nuevos.

### Mis corridas (una a la vez)
PA-01: red `uacam5 2`, categoría Pública, aceptada por el humano solo para hoy (`aprobacion.md`); regla del firewall habilitada (Inbound/Block/Public); Docker 28.5.1. No toqué ningún proceso del humano.

| Comando | Resumen del programador | Mi corrida |
|---|---|---|
| `cd backend; npm run lint` | código 0 | código 0; última línea `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json` |
| `cd backend; npm run build` | código 0 | código 0 |
| `cd backend; npx prisma validate` | — | "The schema at prisma\schema.prisma is valid" (el esquema no cambió en 02b) |
| `cd backend; npm test` (una corrida completa) | `Test Files 144 passed (144)` · `Tests 1720 passed (1720)` | `Test Files 144 passed (144)` · `Tests 1720 passed (1720)` · 123.84 s |
| PA-07 | limpia, con control positivo; origen de los 10 "Error no controlado" no verificado | 0 `40P01`, 0 `deadlock detected`, 0 `could not serialize`, 0 `too many clients`, 0 `Unable to start a transaction`. **5** `P2028`, exactamente los permitidos y con el control positivo: `cuentas.ts:202` (cambiar contraseña), `index.ts:134` (login), `index.ts:180` (refrescar), `cuentas.ts:106` (restablecer) y `$queryRawUnsafe` de la cola de comentarios. **10** "Error no controlado", que **verifiqué uno por uno contra I-1 de la ronda 0 de 02b**: 5 "fallo simulado de la base en la búsqueda" y 1 "al crear la sesión" (`intentos-r2`, login); 3 `ZodError` al armar la respuesta en `handlers/archivos.ts:61` (subida), `:90` (descarga) y `handlers/clases/muro.ts:135` (lista de publicaciones; antes `:140`, la línea cambió con 02b como previó el tester); y `boom` (`salud.integracion.test.ts:29`). Coinciden por ruta y llamada |
| `cd shared; npm run build` | código 0 | código 0 |
| `npm run build` (raíz) | `✓ built in 2.29s` | código 0, `✓ built in 1.61s` (el tiempo no se contrasta) |
| `cd frontend; npm test` | `104 passed` · `1396 passed` | `Test Files 104 passed (104)` · `Tests 1396 passed (1396)` |
| `cd frontend; npm run lint` | código 0; `tsc -b` | código 0; última línea `tsc -b` |
| Conteos | 144 archivos y 1720 casos (+2 y +17) | 142 + `autoria.test.ts` + `muro-admin.integracion.test.ts` = 144. Casos `it("PR-2B…` en el código: 01:3, 02:3, 03:2, 04:1, 05:1, 06:2, 07:1, 08:1, 09:1, 10:1, es decir 16, más 1 de `texto.test.ts` (M-09) = 17. Coinciden con el mapa del resumen |
| V-01 | 120/120 | 120/120 contra la tabla de la ronda 0 de 02b. Las 15 `*.ataque` modificadas son exactamente las 15 marcadas "cambia" por el tester; el programador no tocó ninguna y no hay ninguna sin rastrear |

### Diff contra `07c992f` (38 archivos rastreados, +578/−173, y 3 nuevos)
Lo que cambió, por grupo:
- **Producción:**
  - `shared/src/clases.ts` e `index.ts` (A-11).
  - `core/autoria.ts` (nuevo) y `core/clases/texto.ts` (M-09).
  - `adapters/db/{publicaciones,inscripciones,index}.ts`.
  - `handlers/clases/muro.ts` y `handlers/archivos.ts`.
  - Los README de `adapters` y `handlers`.
- **Pruebas:**
  - Nuevas: `autoria.test.ts` y `muro-admin.integracion.test.ts`.
  - Normales de la lista de 02b: `muro`, `muro-autorizacion`, `archivos-autorizacion` y `alumnos`.
  - Las dos de I-2: `gestion-clases-autorizacion` y `texto.test.ts`.
  - Los 7 dobles del frontend, que solo agregan `administracion`, `puedeBorrar`, `maestros` y `email` (lo revisé en `publicacion-del-muro.test.tsx` y `personas-view.test.tsx`).
- **Las 15 `*.ataque` del tester.**

Sin cambios contra `07c992f`: `middleware/**`, `handlers/validacion.ts`, `handlers/auth/**`, `handlers/admin.ts`, `adapters/db/{archivos,cliente}.ts`, `core/archivos/**`, `backend/prisma/**` (V-03 de 02b), los `package.json`, `package-lock.json`, `infra/`, `AGENTS.md`, `CLAUDE.md`, `README.md` y `.claude/`. El frontend no tiene ningún archivo de producción modificado.

### Revisión del código
- **`core/autoria.ts` contra P-01 (b) y RN-07.** `puedeBorrar` es pura:
  - si el actor es admin, puede siempre;
  - si el actor es el autor, puede (la identidad manda);
  - si no, solo un maestro frente a un autor estudiante.
  Así, el maestro nunca borra lo del admin ni lo del otro maestro, y el estudiante solo borra lo suyo. Que el maestro sea de **esa** clase lo garantiza el sexto paso.
- **`firmaDelAutor`** devuelve `{ id, nombre: FIRMA_ADMINISTRACION, administracion: true }` para el admin, con su `id` real (P-11), y el nombre de la persona con `administracion: false` para los demás. El rol nunca sale. La firma se deriva al leer: no hay columna ni migración nueva.
- **La regla se aplica en el backend, no solo en la interfaz.**
  - `borrarPublicacion` y `borrarComentario` corren en `enTransaccion`: leen el autor (con `rol`) filtrando por la clase, devuelven `false` (404) si no existe, y lanzan `403 BORRADO_NO_PERMITIDO` **sin escribir** si `puedeBorrar` es falso. Solo después descartan los archivos y borran.
  - `borrarComentario` pasó de un `deleteMany` suelto a transacción, como pedía el plan.
  - `puedeBorrar` por elemento sale de la misma función, con el actor de la petición.
- **Matriz de roles de 02b.**
  - `admin` aparece en el GET y el POST de publicaciones, el DELETE de publicación, el GET de comentarios, el DELETE de comentario (que también pasa a `inscripcion` con estudiante) y las dos rutas de archivos.
  - No aparece en `POST …/comentarios` (el admin no comenta, P-03 a) ni en `mis-comentarios`.
  - `personas` sigue con `["estudiante", "maestro"]`.
- **"Personas".** `listarPersonas` selecciona id, nombre y correo de los maestros (en el orden de `ORDEN_DE_MAESTROS`) y de los alumnos. No selecciona `estadoPago` ni `accesoRestringido`: en `inscripciones.ts` esos campos solo aparecen en `listarAlumnosDeClase`, el roster. Los archivos de `backend/src` que mencionan `estadoPago` son los mismos ocho de antes. PR-2B08 los busca en profundidad, también con compañeros deudores y restringidos.
- **M-09.** `conTextosNormalizados` devuelve intacto un arreglo y queda definida una sola vez, en `core/clases/texto.ts`: `muro.ts` borró su copia.
- **Hermanos.** La lista del resumen coincide con el código:
  - las 7 rutas abiertas al admin y las 2 que no (comentar y `mis-comentarios`), más las cuatro de 02a;
  - los 4 lugares que arman el `autor`, todos con `firmaDelAutor`;
  - los 2 borrados y las 4 salidas de `puedeBorrar`, todos con `core/autoria.ts`;
  - las 5 rutas que normalizan texto.

### Arbitraje de las desviaciones
1. **`puedeBorrar` por elemento lo calcula el adaptador con el actor.** **Aceptada.** Es lo que dice "Cambios por capa" ("la autoría se decide en `core/autoria.ts` y se aplica en el adaptador") y deja al handler sin decisiones de autorización (regla 2). El handler solo arma la firma.
2. **`handlers/clases/alumnos.ts` no cambió.** **Aceptada.** El adaptador y `personasRespuestaSchema` ya entregan la forma nueva, así que tocar el handler habría sido un cambio vacío. Su descripción en `handlers/README.md` sí se actualizó, lo que cierra el pendiente "roster del dueño" de la revisión final de 02a.
3. **`listarPersonas` devuelve `null` sin maestros.** **Aceptada.** Es el mismo camino que ya acepté en 02a (desviación 1) y responde `403 SIN_ACCESO_A_LA_CLASE`, no `500`. Ninguna clase válida lo recorre (RN-06).
4. **PR-C08e baja de 3 a 2 rutas con "rol incorrecto".** **Aceptada.** Es consecuencia directa de §D-2B3, porque el `DELETE` de comentarios ahora admite al estudiante (C-8). La cobertura que se pierde la sustituye la autoría: un estudiante frente al comentario de otro recibe `403 BORRADO_NO_PERMITIDO`, como prueban PR-2B05 y PR-2B06. El archivo está en la lista de PA-16 de 02b.

**Pendiente que el programador anota para 02c:** la variable local `puedeBorrar` de `comentarios-de-publicacion.tsx`, que hoy sale del rol. Ya es C-13 y §D-2C4 del plan, así que no hace falta una fila nueva.

### Qué sigue
La ronda 1 del tester sobre 02b, con V-01 contra la tabla de su ronda 0 (120). Al cerrar 02b, el orquestador aplica los textos de "Al cerrar 02b" (ESSENTIALS "Autoría", `PRD.md` RN-07, `ARCHITECTURE.md` §14 `publicaciones` y "Personas" en la viñeta de la búsqueda). Los dos README del backend ya están aplicados y no se vuelven a aplicar.

## Revisión final — CLASES-02b
Fecha: 2026-10-05 · Base dentro de los paquetes: `<K2a>` = `07c992f` · Tester: ronda 0 y ronda 1 (RESISTE, sin hallazgos)

Veredicto: **APROBADO CON OBSERVACIONES.** Nada bloquea el commit `<K2b>`. Hay una decisión de redacción para el humano (O-05), y O-06 y O-07 tienen destino.

Verificación propia (PA-01: `uacam5 2` aceptada por el humano para hoy, firewall habilitado, Docker 28.5.1):
- **Backend:** `npm run lint` código 0 · `npm run build` código 0 · `npx prisma validate` "valid".
- **Una corrida completa:** `Test Files 147 passed (147)` · `Tests 1746 passed (1746)` · 104.73 s. Coincide con las tres corridas del tester.
- **PA-07:**
  - 0 `40P01`, 0 `deadlock detected`, 0 `could not serialize`, 0 `too many clients`, 0 `Unable to start a transaction`.
  - 10 "Error no controlado", exactamente I-1 de 02b: 6 de `intentos-r2`, `ZodError` en `archivos.ts:61` y `:90` y en `muro.ts:135`, y `boom`.
  - 5 `P2028` permitidos (`cuentas.ts:202` y `:106`, `index.ts:134` y `:180`, y la cola de comentarios), con el control positivo.
- **Frontend:** sin cambios de producción desde mi verificación de la implementación; solo los 7 dobles de prueba y las 11 `*.ataque` del tester. Su última corrida verificada (hoy): 104 archivos y 1396 casos; `lint` código 0.
- **V-01:** 123/123. Las 120 de la ronda 0 de 02b no cambiaron, y se suman las 3 nuevas de la ronda 1 (`admin-muro-02b-r1`, `autoria-02b-r1`, `logs-02b-r1`). Las 15 `*.ataque` modificadas son del tester; el programador no tocó ninguna.

### 1. Lo planeado, solo lo planeado y todo lo planeado (02b)
Alcance de 02b, punto por punto:
1. **El admin publica** anuncios y material con adjuntos, lee el muro y los comentarios, y no comenta (P-03 a).
2. **Firma "Administración"** derivada del rol al leer, sin guardar nada y con el `autor.id` real (P-11).
3. **`core/autoria.ts`.** `puedeBorrar` se aplica dentro de la transacción de los dos borrados y se devuelve por elemento.
4. **Archivos del admin:** pide subidas y descargas.
5. **"Personas"** con `maestros` y correo completo.
6. **`conTextosNormalizados`** queda definida una sola vez, en `core/` (más M-09).

Fuera de esa lista entró solo lo arbitrado: M-09, los dos README y el texto de `handlers/README.md` que cerró el pendiente "roster del dueño". No falta nada de 02b.

### 2. "No se toca", autorizaciones y "Cambios por capa"
El diff contra `07c992f` es el mismo conjunto que verifiqué en la implementación (sin `docs/`): 23 archivos de producción y pruebas normales, 3 nuevos del programador y las 18 `*.ataque` del tester. Todo cae en "Cambios por capa" de 02b, A-3, A-4 (I-2), A-11 y la regla de "Dobles del frontend".

Sin cambios: `middleware/**`, `handlers/validacion.ts`, `handlers/auth/**`, `handlers/admin.ts`, `adapters/db/{archivos,cliente}.ts`, `backend/prisma/**` (V-03 de 02b: el esquema no cambia), los `package.json`, `package-lock.json`, `infra/`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `.claude/` y todo el código de producción del frontend.

### 3. Reglas y autorización
- **`core/autoria.ts` contra RN-07 y P-01 (b):** el admin borra todo; cada quien, lo suyo; el maestro además, lo de un estudiante. Nunca lo del admin ni lo del otro maestro, y el estudiante solo lo suyo.
  - Se aplica en el backend: los dos borrados leen la autoría dentro de la transacción y responden `403 BORRADO_NO_PERMITIDO` sin escribir.
  - `autoria-02b-r1` lo confirmó con 8 actores contra un oráculo de la matriz, incluido que `puedeBorrar` de la lista sea igual al resultado del `DELETE`.
- **Matriz de 02b:** el admin entra al GET y al POST de publicaciones, al DELETE de publicación, al GET de comentarios, al DELETE de comentario y a las dos rutas de archivos. Queda fuera de comentar, de `mis-comentarios` y de `personas`.
- **Estudiantes:** ninguna respuesta lleva `estadoPago` ni `accesoRestringido`. "Personas" agrega solo el correo, y el roster sigue siendo la única función que selecciona el estado de pago y la restricción. El muro no expone el rol, el correo ni el nombre real del admin (`admin-muro-02b-r1`). Los logs pasan PA-10 (`logs-02b-r1`).
- **Capas, consultas y cola:**
  - `core/autoria.ts` es puro.
  - El rol del autor sale de la misma relación ya cargada: sin N+1 ni SQL crudo nuevo.
  - Las publicaciones del admin encolan `PUBLICACION_CREADA` o `MATERIAL_CREADO` con solo ids, en la misma transacción.

### 4. Definición de terminado, para 02b
- [x] RF-59, RF-19, RF-33 y RN-07 (parte de 02b)
- [x] Capas y middleware
- [x] `lint`, `build` y `test` en verde
- [x] Pruebas de autorización (PR-2B10, la matriz de `muro-autorizacion` y `archivos-autorizacion`, y las `*.ataque`)
- [x] Sin migración (no cambió el esquema)
- [x] `infra/` sin cambios
- [ ] **Documentos:** los README del backend ya están; faltan los textos de "Al cerrar 02b" (abajo), que aplica el orquestador

### Hallazgos
Ninguno nuevo (ningún M-10).

### Arbitraje de las observaciones del tester
- **O-05, cascada de comentarios al borrar una publicación: es coherente con RN-07, pero conviene escribirlo. Decisión de redacción del humano; no bloquea el commit.**
  - **Por qué es coherente.** Borrar una publicación borra su hilo. Es el comportamiento de CLASES-01 y del esquema (`comentarios.publicacion_id` con `ON DELETE CASCADE`), y §D-2B3 lo conservó ("como hoy"). La regla de autoría decide **qué publicación** puede borrar cada quien; los comentarios caen como parte del hilo, no como un borrado del contenido del otro maestro. Además:
    - lo que un maestro puede borrar con cascada es solo su propia publicación;
    - los comentarios de estudiantes ya los puede borrar por moderación;
    - el admin hoy no comenta (P-03 a), así que la cascada no puede tocar nada suyo.
  - **El riesgo, a futuro.** El comentario del otro maestro sí desaparece sin que él intervenga. Y si algún día el admin comenta (P-03 b), un maestro borraría lo del admin al borrar su propia publicación, contra "nunca lo del admin".
  - **Recomendación del manager:** aceptar la cascada y escribirla en RN-07 y en ESSENTIALS "Autoría" (texto abajo, como agregado a los textos de 02b). Agregar una fila en ESTADO para revisarla si el admin llega a comentar.
  - **Alternativa que no recomiendo:** impedir que un maestro borre su publicación si tiene comentarios del otro maestro o del admin. Agrega una regla, un error y una rama en la interfaz para un caso raro, y deja al autor sin poder retirar su propio contenido.
  - **Texto propuesto para RN-07,** después de la línea de moderación del maestro: "Borrar una publicación borra también su hilo de comentarios, de quien sea." El mismo, al final de la viñeta "Autoría" de ESSENTIALS. Si el humano lo aprueba, el orquestador lo aplica con A-8 junto con los demás textos de 02b. Si prefiere la alternativa, es una decisión de producto nueva y va a un encargo aparte.
- **O-06, el comentario "Roster del dueño" en `shared/src/clases.ts:291`:** trivial, un comentario sin cambio de comportamiento. Como `shared/src/clases.ts` está en la lista de 02b, lo más barato es que el programador lo corrija **antes del commit `<K2b>`**, con `shared` `build` y `lint` (sin ronda del tester), a "Roster de la clase (maestros y administrador): el único lugar donde salen el correo completo junto con los datos de pago". Si el orquestador prefiere no reabrir 02b, queda una fila en ESTADO con destino "el próximo cambio a `shared/src/clases.ts`" (02c y 02d no tocan `shared/`).
- **O-07, la firma en la interfaz:** regla para 02c, dentro de C-13 y §D-2C4. `FirmaDelAutor` decide **solo** con `autor.administracion` y nunca compara `autor.nombre` con "Administración": un maestro que se llame así no recibe la insignia. Que el tester lo ataque en la ronda 0 o 1 de 02c (el punto 4 del ataque de 02c ya incluye la insignia). No requiere enmienda: §D-2C4 ya dice "el frontend no usa `autor.nombre` para la firma del admin".

### Medición del programador en 02b
- **Rondas del tester:** ronda 0 y ronda 1 (RESISTE). **Rondas extra: 0**, y ninguna por hermanos.
- **Resúmenes devueltos:** 0 de 1.
- **PARADAS:** 0.
- **Desviaciones:** 4 declaradas, las cuatro aceptadas.
- **Hermanos:** listados y correctos contra el código.
- **El umbral para pasar al programador a `opus` no se alcanzó.**

### Textos que el orquestador aplica al cerrar 02b (A-8, con el SHA-256 en `aprobacion.md`)
De "Textos propuestos → Al cerrar 02b" del plan, literales:
1. **`docs/ARCHITECTURE-ESSENTIALS.md`, "Reglas de negocio que tocan código", viñeta "Autoría":** después de "el admin borra cualquier publicación o comentario de cualquier clase." se agrega la oración de la moderación del maestro, de `core/autoria.ts` y de `puedeBorrar` por elemento.
2. **`docs/PRD.md`, RN-07:** después de "Cada autor borra solo lo suyo." se agrega "El maestro también borra los comentarios de los alumnos en las clases que imparte; nunca lo que publicó otro maestro de la clase (CLASES-02)."
3. **`docs/ARCHITECTURE.md` §14, fila `publicaciones`:** se agrega "· el autor sale como `{ id, nombre, administracion }`: con `administracion: true`, `nombre` es "Administración"; el rol nunca sale".
4. **ARCHITECTURE §14, "Reglas de acceso a datos", viñeta de la búsqueda:** la oración del correo completo en el roster y en "Personas" queda como dice el plan (con los maestros de la clase). La parte del buscador de maestros ya se aplicó en 02a.
5. **Solo si el humano aprueba O-05:** la oración de la cascada en RN-07 y en ESSENTIALS "Autoría" (arriba).

**No se vuelven a aplicar** los textos de `backend/src/adapters/README.md` (secciones `db/inscripciones.ts` y `db/publicaciones.ts`) ni de `handlers/README.md`: ya los aplicó el programador y los verifiqué. `ARCHITECTURE.md` §7, fila `archivos`, no cambia.

### Pendientes para `ESTADO.md` §3
- **Nueva:** "Si el administrador llega a comentar (P-03 b de CLASES-02), revisar la cascada de comentarios al borrar una publicación: un maestro borraría lo del admin". Destino: el encargo que habilite los comentarios del admin.
- **Nueva, solo si O-06 no se corrige antes del commit:** "Comentario 'Roster del dueño' en `shared/src/clases.ts:291`". Destino: el próximo cambio a ese archivo, carril trivial.
- **Nueva:** O-07 como recordatorio de 02c, si el orquestador quiere tenerlo a la vista (ya está en §D-2C4).
- **Se cierran:**
  - M-09 (resuelto en 02b);
  - el pendiente de `handlers/README.md` "roster del dueño" (resuelto en 02b).
- **Siguen como estaban:** O-04 (DEPLOY), R-06 (ADMIN) y el retiro de compatibilidad (antes del primer DEPLOY).

### Cifras finales de 02b
| | Archivos | Casos |
|---|---|---|
| Backend | 147 (desde 142 al cerrar 02a) | 1746 (desde 1703) |
| Frontend | 104 | 1396 |
| `*.ataque` | 123 (desde 120; tabla de la ronda 1 de 02b, base de V-01 de 02c) | |

Siguiente paso:
1. El humano decide el texto de O-05.
2. El programador corrige O-06, si el orquestador lo prefiere así.
3. El orquestador aplica los textos y las filas.
4. El humano hace el commit `<K2b>`.
5. Arranca la ronda 0 de 02c, que incluye O-07.

## Verificación del resumen — CLASES-02c — implementación
Fecha: 2026-10-05 · Base dentro de los paquetes: `<K2b>` = `7544fb9` · Resumen: `resumen-programador.md`, "CLASES-02c — Implementación"

Veredicto: **ACEPTADO.** Todas las cifras coinciden y el código cumple con `CLAUDE.md` y `DESIGN.md`. No hay hallazgos nuevos.

### Mis corridas (una a la vez; el backend no se corrió porque el diff no toca `backend/` ni `shared/`)
| Comando | Resumen | Mi corrida |
|---|---|---|
| `cd frontend; npm test` | `Test Files 107 passed (107)` · `Tests 1458 passed (1458)` | `Test Files 107 passed (107)` · `Tests 1458 passed (1458)` |
| `cd frontend; npm run lint` | código 0 | código 0; última línea `tsc -b` |
| `npm run build` (raíz) | `✓ built in 1.67s` | código 0; `✓ built in 685ms` (el tiempo no se contrasta) |
| `npm run lint` (raíz) | código 0 | código 0 |
| `cd frontend; npx vitest list` | 107 archivos y 1458 casos; PR-2C 01:3, 02:2, 03:9, 04:8, 05:2, 06:8, 07:4, 08:5, 09:5, 10:2, 12:2 | 107 archivos y 1458 casos; los mismos conteos por ID |
| PR-2C11 | sin prefijo en el título; en `contenedor-rol.test.tsx` | Confirmado: el caso de los tres enlaces y los de "solo queda activo" están en ese archivo |
| V-01 | 123/123 | 123/123 contra la tabla de la ronda 0 de 02c. Las 12 `*.ataque` modificadas son exactamente las 12 marcadas por el tester; no hay ninguna sin rastrear |

El mapa PR-2C01 a PR-2C12 → archivo coincide con `vitest list`:
- `lib.test`, `clases-admin-view.test`, `crear-clase-view.test`, `formulario-clase.test`, `maestros-de-clase-view.test`;
- `clase-layout.test`, `inicio-maestro-view.test`, `inicio-estudiante-view.test`, `publicacion-del-muro.test`, `muro-view.test`;
- `router.test` y `contenedor-rol.test`.

### Diff contra `7544fb9` (44 archivos rastreados, +1550/−352, y 10 nuevos)
Ningún archivo queda fuera de "Cambios por capa" de 02c, A-3 (las 12 `*.ataque` del tester), A-5 (`useBorrarMiComentario` retirado), A-7 (`docs/DESIGN.md`), PA-16 de 02c, ni las desviaciones de abajo.

Sin cambios contra `7544fb9`: `backend/`, `shared/`, `features/admin/**`, `features/auth/**`, `services/**`, `lib/**`, `styles/tokens.css` e `index.css`, `components/ui/**` salvo `badge.tsx` y `badge.test.tsx`, los componentes compartidos protegidos, los `package.json`, `package-lock.json`, `infra/`, `AGENTS.md`, `CLAUDE.md`, `README.md` y `.claude/`. De `app/` solo cambian `router.tsx` y sus pruebas.

### Revisión del código contra `CLAUDE.md` y `DESIGN.md`
- **Estructura del módulo.**
  - Textos en `data.ts` (`TEXTOS_CLASES_ADMIN`, `TEXTOS_BUSCADOR_MAESTROS`, `TEXTOS_MURO.firmaAdministracion`…).
  - Funciones puras en `lib.ts` (`perspectivaDeRuta`, `textoDeMaestros`, `formatearFechaDeClase`, `esErrorDeCursor`), hooks en `hooks.ts` y tipos en `types.ts`.
  - Los componentes nuevos solo declaran interfaces `Props`. Las constantes de id de `buscador-de-maestros.tsx` siguen el precedente de `buscador-alumnos.tsx`.
  - Ningún `fetch` (el único acierto de la búsqueda es `refetch()` en `muro-view.tsx`).
  - Ningún import de `features/` en `components/`, `lib/` o `services/`; ningún `?? []`; ninguna clase de la escala por defecto de Tailwind ni color suelto (los vigilan también `styles/clases-r1` y `estatico-r1`, en verde).
- **Contexto del admin.** `data-material="opaco"` y `data-densidad="densa"` siguen saliendo solo de `ContenedorRol` para el rol `admin`, y las pantallas de `/admin/clases*` cuelgan de él.
- **Componentes de `components/ui/`:** `Table`, `Button`, `Card`, `Badge` y `buttonVariants` en los enlaces.
- **Botones y formularios.**
  - `enEspera` en "Cargar más clases", "Sí, quitar" y "Asignar a la clase".
  - `autoComplete="off"` en los campos de `FormularioClase` y del buscador de maestros.
  - `ErrorDeCampo` para "Elige al menos un maestro" y para el término largo.
- **Retornos tempranos y estados.** Las vistas siguen el orden error → cargando → vacío → datos. El vacío del admin trae su CTA en `outline`, y la única acción `primary` de la vista es "Crear clase".
- **Firma "Administración" (O-07).** `FirmaDelAutor` decide **solo** con `autor.administracion` y nunca compara el nombre. La insignia `institucional` lleva texto e icono `Landmark`, así que no depende solo del color.
- **Botones de borrar.** "Borrar publicación" y "Borrar" salen de `publicacion.puedeBorrar` y `comentario.puedeBorrar`. No queda ningún `esMaestro`, `esDueno`, `startsWith("/maestro")` ni `mis-comentarios` en producción.
- **Barra lateral.** `Destino.coincidencia` es obligatorio; `BarraNavegacion` usa `end={destino.coincidencia === "exacta"}`. "Clases" es `"prefijo"` y los demás `"exacta"`.
- **`DESIGN.md` (A-7),** con 13 marcas "propuesta (CLASES-02c)" y sin tocar ningún token. Documenta cada patrón nuevo:
  - el alcance opaco de `/admin/clases*` (§7.1);
  - el indicador en contexto opaco y con tres opciones (§7.3);
  - el destino "Clases" (§7.4);
  - la variante `institucional` y la firma (§7.8 y §7.18);
  - la tabla de clases y "Cargar más clases" (§7.9);
  - los vacíos del maestro y del admin (§7.10);
  - las perspectivas, el encabezado con dos maestros y "Volver a la lista de clases" (§7.16);
  - el buscador de maestros con "Ya da esta clase" (§7.17);
  - el borrado según `puedeBorrar` (§7.18).
- **Hermanos.** La lista del resumen coincide con el código:
  - los lugares de "Crear/Editar clase" del maestro, todos retirados;
  - los 3 caminos de borrado;
  - los 2 lugares de la firma;
  - los 7 componentes que pasan a la perspectiva;
  - las rutas del router;
  - los 3 lugares con uno o dos maestros.

### Arbitraje de las desviaciones
1. **O-01: `/maestro/clases/nueva` con una ruta literal que redirige a `/login`.** **Aceptada.** Sin ella, "nueva" coincidiría con `clases/:claseId` y se pediría `GET /api/clases/nueva`. El resultado es el que el plan esperaba (R-07: una ruta retirada manda a `/login`, como cualquier ruta desconocida). `/maestro/clases/:id/editar` no tiene hijo y cae en el `*`. El tester debe atacar ambas en su ronda.
2. **Archivo nuevo `components/selector-de-maestros.tsx`.** **Aceptada.** §D-2C2 nombra el componente `SelectorDeMaestros`; solo faltaba en la lista de archivos. Es un envoltorio delgado que compone el buscador y la lista, sin lógica de datos.
3. **`ListaMaestrosDeClase` con dos usos (con y sin confirmación).** **Aceptada.** Es el mismo patrón visual (§7.14 y §7.17) y evita duplicar el foco al quitar. La confirmación y la petición dependen de props explícitas (`confirmar`, `quitando`, `puedeQuitar`), sin valores por defecto escondidos.
4. **`formatearFechaDeClase` en `features/clases/lib.ts`.** **Aceptada como local, con un pendiente. No sube en 02d,** porque `lib/format.ts` también está en "No se toca" de 02d y moverla no lo justifica. Queda una fila en ESTADO §3: "Mover `formatearFechaDeClase` a `lib/format.ts` (fecha corta, junto a `formatearFechaHora` y `formatearFechaLarga`) y revisar que una fecha inválida devuelva un valor explícito en lugar del texto ISO", con destino el próximo encargo que toque `lib/format.ts` (ADMIN o TAREAS).
5. **`BloqueDestacado` y `PanelMisClases` con props opcionales.** **Aceptada.** Es lo que pide el plan (`accionVacio` opcional; el maestro sin tarjeta interna, PRD §7 y `DESIGN.md` §7.5). La ausencia significa "sin acción", no un dato que falta: no es un valor por defecto silencioso.

### Qué sigue
La ronda 1 del tester sobre 02c, con V-01 contra la tabla de su ronda 0 (123). Puntos que debe cubrir: O-01 (las dos rutas retiradas), O-07 (un autor llamado "Administración" sin `administracion`), el foco de §7.14 en el selector y la lista de maestros, y la barra del admin en sus subrutas.

## Verificación del resumen — CLASES-02c — corrección de la ronda 1
Fecha: 2026-10-05 · Resumen: `resumen-programador.md`, "CLASES-02c — Corrección de la ronda 1" · Hallazgo: T-02 (media)

Veredicto: **ACEPTADO.** Las cifras coinciden y el remedio de T-02 es correcto y se extendió a sus hermanos. Quedan dos hallazgos menores que no bloquean la ronda 2: M-10, de estilo, y M-11, de exactitud del registro de hermanos.

### Mis corridas
| Comando | Resumen | Mi corrida |
|---|---|---|
| `cd frontend; npm test` | `Test Files 113 passed (113)` · `Tests 1620 passed (1620)` | `Test Files 113 passed (113)` · `Tests 1620 passed (1620)` |
| `cd frontend; npm run lint` | código 0 | código 0 |
| `npm run build` y `npm run lint` (raíz) | código 0 | código 0 y 0 (`✓ built in 668ms`) |
| V-01 | 129/129 | 129/129: las 123 de la ronda 0 de 02c más las 6 nuevas de la ronda 1, contra sus tablas. Las modificadas y las nuevas son todas del tester |

Los archivos de producción del frontend son los mismos de la implementación de 02c: `hooks.ts` y los cinco de "Cargar más" ya estaban en "Cambios por capa" de 02c. `tabla-alumnos.tsx` y `personas-view.tsx` no se tocaron. No cambió nada fuera del frontend.

### Revisión del remedio (diff de `features/clases/hooks.ts`)
- **Mecanismo.** Las funciones auxiliares de invalidación (`invalidarListasDeClases`, `invalidarMaestrosDeLaClase`, `invalidarPersonasDeLaClase`, `invalidarMuro` e `invalidarComentarios`) ahora son `async` y devuelven el `Promise.all` de sus `invalidateQueries`. El `onSuccess` de asignar, retirar, agregar alumno, quitar alumno, borrar publicación y borrar comentario muestra su aviso y **después** espera la recarga. Así, la mutación sigue `isPending` y su botón en `enEspera` hasta que llega el dato que ya no ofrece la acción. Ningún botón pasa a `disabled`.
- **Si la recarga falla.** `invalidateQueries` se resuelve aunque la consulta recargada falle (TanStack Query no propaga el error al refrescar por invalidación), así que la mutación no queda colgada. El error de la recarga lo muestra la propia consulta en su estado `isError`.
- **Avisos.** El de éxito sale una vez, antes de la espera. El de error sigue saliendo una vez, en `onError`, porque la espera no lanza y no puede disparar un segundo `onError`.
- **Las acciones que navegan** (crear y editar clase) siguen con `void`, sin esperar. Publicar y comentar también, porque el formulario se limpia y no ofrece una acción repetible. Coincide con la lista de "no aplica" del resumen.
- **"Cargar más".** `fetchNextPage({ cancelRefetch: false })` está en los cinco de 02c (`clases-admin-view`, `muro-view`, `comentarios-de-publicacion`, `inicio-maestro-view` e `inicio-estudiante-view`). Un segundo clic ya no cancela la petición en vuelo.

### Hallazgos
- **M-10 (bajo, de estilo; no bloquea).** `useAgregarAlumno`, `onSuccess`: el aviso usa `if (…) { … } else { … }` seguido del `await`. `CLAUDE.md` pide retornos tempranos, y un `else` fuera de un ciclo o de una asignación de valor no es una de las excepciones. Se espera la misma conducta sin `else`: por ejemplo, el aviso en una asignación con dos ramas o en una función auxiliar con retorno temprano. **Destino:** la próxima entrega del programador que toque `hooks.ts` (la corrección de la ronda 2 de 02c si la hay, o 02d; lo autorizo aunque `hooks.ts` no esté en la lista de 02d).
- **M-11 (exactitud del registro de hermanos; no bloquea ni devuelve el resumen).** El resumen dice que "Unirme a la clase" "ya devolvía la recarga". En `7544fb9`, `invalidarListasDeClases` era síncrona y devolvía `undefined`, así que `useUnirseAClase` no esperaba nada. **Ahora sí espera**, como efecto del cambio de la función auxiliar. El resultado es el correcto por analogía con T-02: la navegación posterior ve la lista ya recargada, a costa de una ida y vuelta más (`inscritas`, porque `impartidas` no está activa para un estudiante). No es perceptible frente a lo que ya esperaba. No lo devuelvo porque el remedio quedó aplicado. Queda corregido aquí para el registro; en adelante, el resumen describe el estado de antes contra el código de la base.

### Arbitraje de los pendientes de "Cargar más" (hermanos de O-08)
- **`features/clases/components/tabla-alumnos.tsx` (CLASES-b) y `personas-view.tsx`:** se corrigen **en 02d**, con el mismo `fetchNextPage({ cancelRefetch: false })`. `personas-view.tsx` ya está en "Cambios por capa" de 02d. A `tabla-alumnos.tsx` lo autorizo yo como hermano por analogía: una línea, en `features/clases`, fuera de "No se toca". El programador lo lista en sus hermanos de 02d.
- **`features/admin/components/registrados-del-enlace.tsx` y `tabla-enlaces.tsx`** tienen el mismo patrón y el resumen no los nombró. Están en "No se toca" de CLASES-02 (`features/admin/**`). Fila en ESTADO §3, con destino ADMIN.

### Observaciones de la ronda 1 (O-05 a O-09)
- **O-05, `/admin/` con barra final no marca "Cuentas":** venía de antes de 02c y ningún enlace interno lleva a `/admin/`. Fila en ESTADO §3, de prioridad baja, con destino ADMIN (con la navegación del administrador).
- **O-06, ruta en mayúsculas contra la perspectiva:** no abre nada, porque la perspectiva que resulta es la que menos muestra y el backend decide, pero la página no corresponde a la ruta. **Trivial en 02d** (`features/clases/lib.ts` y `lib.test.ts` están en su lista): `perspectivaDeRuta` compara el prefijo sin distinguir mayúsculas, como el router, y los prefijos parecidos (`/maestros`, `/administrador`, `/admin-x`) siguen dando "estudiante". Si alguna `*.ataque` fija el comportamiento actual con `/Admin` o `/MAESTRO`, el tester la reescribe en la ronda 0 de 02d citando este arbitraje.
- **O-07, `503 SERVICIO_OCUPADO` con el aviso genérico:** **trivial en 02d.** Se suma `SERVICIO_OCUPADO` a `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` (`features/clases/lib.ts`) para que se vea el mensaje del servidor, que ya está en español. R-3 de CHORE-02 (el `503` de `/auth/refrescar` en `apiClient`) sigue aparte, con su destino.
- **O-08:** aplicado en 02c; sus hermanos van como dice arriba.
- **O-09, términos de 3 puntos de código "invisibles":** es la regla compartida de `shared/` (T-20 de CLASES-b) y el servidor la aplica igual. Sin acción ni fila.

### Qué sigue
La ronda 2 del tester sobre 02c, con V-01 contra las 129 de su ronda 1. M-10, O-06, O-07 y los dos hermanos de "Cargar más" pasan a 02d. Al cerrar 02c, las filas de ESTADO son: O-05 a ADMIN, los dos "Cargar más" de `features/admin` a ADMIN, y `formatearFechaDeClase` (de la verificación de la implementación de 02c).

## Arbitraje — ronda 2 de 02c
Fecha: 2026-10-05 · Sobre `reporte-tester.md`, "CLASES-02c — Ronda 2" (ROTO por T-03, baja, y T-04, media). La ronda 3 es la última antes de escalar: este arbitraje acota su alcance.

### T-03 (dos clics en el mismo instante, sin repintado): decisión **(b)**, observación con destino, no hallazgo
- **El criterio de `DESIGN.md` §6 (botones con petición en vuelo, punto 4)** pone el candado síncrono (`enviandoRef`) "donde hace falta". Hasta hoy, eso es donde un duplicado tiene un **efecto no idempotente**: login y registro (DESIGN-01a), el restablecimiento con contraseña temporal (`ficha-de-cuenta.tsx`) y la revocación de un enlace (`tabla-enlaces.tsx`).
- **Los seis hermanos de T-03 son idempotentes en el servidor:**
  - asignar un maestro ya asignado da `200` igual, sin escribir;
  - retirar uno no asignado, lo mismo;
  - el alta de un alumno ya inscrito da `yaEstaba`;
  - la baja de uno no inscrito no escribe;
  - un segundo borrado da `404`.
  El daño posible se limita a un aviso repetido, y solo con dos clics dentro del mismo cuadro, que un navegador real no produce. Con el segundo clic a 30 ms o después del `200`, la ronda 2 confirmó una sola petición y un solo aviso en los seis (12 casos): eso es lo que pedía T-02.
- **En la ronda 3, el tester retira o reescribe los 6 casos de "mismo instante"** de `ventana-02c-r2.ataque.test.tsx`, citando este arbitraje. Es un archivo suyo de esta misma subentrega, aún sin commit, así que no hace falta A-3: A-3 cubre las `*.ataque` ya existentes que contradice un C-n. Si el orquestador prefiere dejar constancia, basta una línea en `aprobacion.md`. Ningún caso se desactiva con `skip`: se retira o se reescribe para afirmar lo que sí se exige (el segundo clic después del repintado).
- **Pendiente con destino (ESTADO §3):** aclarar el punto 4 de `DESIGN.md` §6. Texto propuesto: "El candado síncrono (`enviandoRef`) se usa cuando un envío duplicado tendría un efecto que no se puede repetir sin daño (crear una cuenta, mostrar una contraseña temporal, revocar un enlace). Las acciones idempotentes en el servidor quedan cubiertas por `enEspera` y la guarda del manejador." Destino: los textos de `DESIGN.md` de 02d. El orquestador lo propone al humano, porque no es un texto del plan.

### T-04 (el foco cae en `<body>` cuando la recarga falla después del `200`): **hallazgo; el programador lo corrige antes de la ronda 3**
- **Remedio esperado** (`DESIGN.md` §7.14, "nunca a `<body>`"; el mismo criterio que ya cumple `TablaAlumnos`): cuando la consulta recargada pasa a `isError` y su vista se sustituye por el error **con el foco perdido** (`focoPerdido(document)`, que ya existe en `features/clases/lib.ts`), el foco va a un elemento de la rama de error:
  - a su encabezado, si la rama conserva uno (`h2` o `h1` con `tabIndex={-1}`);
  - si no, a un contenedor propio de la vista, con `tabIndex={-1}`, que envuelve a `MensajeError`.
  El foco se mueve en un efecto que corre cuando el error ya se pintó, no en el `onSuccess`, igual que §7.14 en CLASES-b.
- **`MensajeError` queda intacto.** Sigue en "No se toca": el contenedor enfocable es de la vista que lo usa. Mover el foco al error, y no a "Volver a la lista de clases", conserva el contexto, porque el lector de pantalla llega al mensaje.
- **Hermanos que el programador lista uno por uno**, con si les aplica y si se aplicó:
  - `ClaseLayout` (rama de error; cubre los dos de maestros, porque comparte la clave del detalle);
  - `MaestrosDeClaseView`, si tiene su propia rama de error;
  - la lista del muro en `MuroView` ("Sí, borrar" publicación: el caso heredado de CLASES-c entra en esta misma corrección);
  - `ComentariosDePublicacion` (el tester dice que ahí no cae en `<body>`: confirmar por qué);
  - `ClasesAdminView`;
  - `TablaAlumnos`, que ya lo cumple y es la referencia.
  - `PersonasView` es de 02d: va a la lista de hermanos de 02d.
- **Prueba:** los 3 casos de T-04 del tester en verde sin tocarlos. Si el programador agrega casos normales, solo en archivos de PA-16 de 02c.

### O-10 (el aviso de "Sí, quitar" del roster sale al terminar la recarga): unificar, pero **en 02d, no en esta corrección**
Es incoherente con sus cinco hermanos, pero no viola la regla del aviso único y no es un hallazgo. Para no ampliar la última ronda, se mueve en 02d: el aviso pasa al `onSuccess` de `useQuitarAlumno`, antes de esperar la recarga, y deja el de `mutate` en `tabla-alumnos.tsx`. Es el mismo archivo en el que ya autoricé el `fetchNextPage({ cancelRefetch: false })` para 02d. El programador lo incluye entre sus hermanos de 02d.

### O-11 (`alumnos-b-r2` a 4.5 s, cerca del umbral de 5 s)
Sin acción en 02c. Ningún `timeout` se sube (PA-06). Si en la ronda 3 o en 02d pasa de 5 s o falla por tiempo, se reporta como PA-12, sin repetir la corrida. Queda junto a M-02 de DESIGN-01b, que sigue pendiente en ESTADO.

### Orden
1. El programador corrige **solo T-04**, con su lista de hermanos.
2. El manager verifica su resumen.
3. El tester hace la **ronda 3 (la última)**: retira o reescribe los 6 casos de T-03 según este arbitraje, ataca la corrección de T-04 y vuelve a correr lo demás.
4. Si la ronda 3 resiste, sigue la revisión final de 02c.
5. M-10, O-06, O-07, O-10 y los dos "Cargar más" siguen con destino 02d.

## Verificación del resumen — CLASES-02c — corrección de la ronda 2
Fecha: 2026-10-05 · Resumen: `resumen-programador.md`, "CLASES-02c — Corrección de la ronda 2" · Hallazgo: T-04 (media). T-03 no se corrige, según el arbitraje de la ronda 2.

Veredicto: **ACEPTADO.** No hay hallazgos nuevos.

### Mis corridas (una sola de cada una; nadie más corría nada)
La corrida del frontend empezó a las 14:20. Los cinco archivos de la corrección son de las 14:16 y 14:17, y después no cambió ningún archivo de `frontend/src` ni de `shared/src`; solo `npm run build` regeneró el cliente de Prisma, que no se versiona.

| Comando | Resumen | Mi corrida |
|---|---|---|
| `cd frontend; npm test` | `Test Files 1 failed \| 114 passed (115)` · `Tests 6 failed \| 1650 passed (1656)` | Igual. Los **6 rojos** son exactamente los de T-03, todos en `ventana-02c-r2.ataque.test.tsx` y con el título "…, segundo clic a 0 ms: …": "Agregar a la clase" (roster), "Asignar a la clase" (maestros), "Sí, borrar comentario", "Sí, borrar" (publicación), "Sí, quitar" (maestros) y "Sí, quitar" (roster). El fallo es `peticiones: 2`; los 3 casos de T-04 están en verde |
| `cd frontend; npm run lint` | código 0 | código 0 |
| `npm run build` y `npm run lint` (raíz) | código 0 | código 0 y 0 (última línea del `lint`: `tsc -b`) |
| V-01 | 131/131 | 131/131 contra la tabla de la ronda 2 de 02c; hay 131 `*.ataque` entre rastreadas y no rastreadas, y el programador no tocó ninguna |

### Revisión
- **`useFocoAlPasarAError(esError, destinoRef)`** (`features/clases/hooks.ts`):
  - Recuerda el estado anterior y solo mueve el foco **en la transición a error**. Una vista que ya nace en error no se toca, ni las recargas siguientes con el error ya pintado.
  - Solo actúa si `focoPerdido(document)` es cierto: el elemento activo es `<body>`, `null` o un nodo desconectado. Si la persona ya movió el foco a otro lugar, no se lo quita.
  - Corre en un efecto después del render, no en `onSuccess`, como pide §7.14.
  - No tiene tipos en el archivo de hooks ni valores por defecto.
- **Destinos por vista:**
  - `ClaseLayout` y `MaestrosDeClaseView` usan un contenedor propio con `tabIndex={-1}` que envuelve a `MensajeError`. `MensajeError` no cambia y lleva `role="alert"`, así que al recibir el foco el lector de pantalla lee el mensaje que contiene. El contenedor no necesita nombre propio.
  - `MuroView` usa su `h2` (`sr-only`, `tabIndex={-1}`), que vive fuera de la rama de error y se conserva.
  - `ClasesAdminView` usa su `h1` (`tabIndex={-1}`).
  - Cumple §7.14: el foco va al encabezado o, sin encabezado, a un elemento de la rama de error. Nunca a `<body>`.
- **El argumento sobre `ComentariosDePublicacion` se sostiene.** Si la lista de comentarios falla tras un borrado, su propia lógica de foco lleva el foco a la publicación que lo contiene (`Card` con `data-publicacion-id` y `tabIndex={-1}`), que sigue montada. La ronda 2 ya observó que ahí el foco no cae en `<body>`. No necesitaba cambio.
- **Hermanos:** coinciden con mi lista del arbitraje (`ClaseLayout`, `MaestrosDeClaseView`, el muro, `ClasesAdminView`, `ComentariosDePublicacion`, `TablaAlumnos` como referencia). `PersonasView` queda para 02d.
- **M-10** (`if/else` en `useAgregarAlumno.onSuccess`, `hooks.ts:324-328`): **no se corrigió**, aunque esta corrección tocó `hooks.ts`. No lo devuelvo, porque el arbitraje dejó la corrección de la ronda 2 limitada a T-04. Sigue con destino 02d, junto con O-06, O-07, O-10 y los dos "Cargar más".

### Instrucción para la ronda 3 del tester (la última)
1. **V-01** contra la tabla de la ronda 2 de 02c (131).
2. **T-03:** retira o reescribe, citando el arbitraje de la ronda 2, los 6 casos "…, segundo clic a 0 ms: …" de `ventana-02c-r2.ataque.test.tsx`. No los desactiva con `skip`. Si los reescribe, que afirmen lo que sí se exige: segundo clic después del repintado, o con el botón ya en `enEspera`, igual a una sola petición y un solo aviso.
3. **T-04:** ataca la corrección:
   - la recarga fallida con el foco en el botón, en los tres casos y en sus hermanos (`ClasesAdminView` con "Cargar más clases", y el muro con "Cargar más");
   - que el foco **no** se mueva si la persona ya lo puso en otro sitio, ni en una vista que nace en error;
   - que una segunda recarga fallida no vuelva a robar el foco;
   - que el contenedor del error no quede como tope de tabulación extra.
4. Vuelve a correr todo lo demás. PA-12 aplica si `alumnos-b-r2` pasa de 5 s (O-11).
5. Si la ronda 3 resiste, sigue la revisión final de 02c. Si rompe, se escala al humano (tercera ronda).

## Verificación del resumen — CLASES-02c — corrección de la ronda 3
Fecha: 2026-10-05 · Resumen: `resumen-programador.md`, "CLASES-02c — Corrección de la ronda 3 (T-05)" · Ronda 4 cerrada, autorizada por el humano ("mover el foco solo tras una recarga")

Veredicto: **ACEPTADO.** Sin hallazgos nuevos.

| Comando | Resumen | Mi corrida |
|---|---|---|
| `cd frontend; npm test` | `Test Files 116 passed (116)` · `Tests 1672 passed (1672)` | Igual |
| `cd frontend; npm run lint` | código 0 | código 0 |
| `npm run build` y `npm run lint` (raíz) | código 0 | código 0 y 0 |
| V-01 | 132/132 | 132/132 contra la tabla de la ronda 3 de 02c; hay 132 `*.ataque` y el programador no tocó ninguna |

Los archivos de producción del frontend son los mismos 27 de 02c (20 modificados y 7 nuevos). La corrección no agrega archivos.

**Revisión del gancho.** `useFocoAlPasarAError(esError, tieneDatos, destinoRef)`:
- **`tieneDatos` sale del dato de la propia consulta.** Los cuatro usos (`ClaseLayout`, `MaestrosDeClaseView`, la lista del muro y `ClasesAdminView`) pasan `<consulta>.data !== undefined`, no un estado paralelo.
- **Mueve el foco solo si se cumplen las cuatro condiciones:**
  - la consulta pasa a error en este render;
  - antes no lo estaba;
  - tuvo datos alguna vez (lo recuerda un `useRef`);
  - el foco se perdió.
- **Una primera carga que falla no lo mueve (T-05).** Tampoco una vista que se monta con datos y error ya en la caché: `eraError` nace en verdadero.
- **T-04 se conserva:** si hubo datos y la recarga falla con el foco perdido, el foco va al destino. Los 13 casos de T-04 de la ronda 3 y el caso nuevo siguen en verde en mi corrida.
- `ComentariosDePublicacion` no usa el gancho (su argumento ya se aceptó en la ronda 2). M-10 sigue con destino 02d.

**Instrucción para la ronda 4 cerrada del tester** (alcance: solo "mover el foco solo tras una recarga"):
1. V-01 contra las 132 de la ronda 3.
2. Ataca únicamente el gancho y sus cuatro usos:
   - primera carga que falla, con y sin foco en la página;
   - error ya en la caché al montar, con y sin datos;
   - recarga que falla después de datos (T-04, con el foco en el botón y con el foco movido por la persona);
   - dos fallos seguidos;
   - éxito → error → éxito → error (el foco se mueve en cada paso a error tras datos, solo si se perdió);
   - cambio de clase (de `claseId`) con el gancho montado.
3. No abre frentes nuevos fuera de ese alcance. Lo que encuentre fuera va como observación con destino.
4. Corre la suite completa una vez y reporta.
5. Si resiste, sigue la revisión final de 02c; si rompe, se escala al humano.

## Verificación del resumen — CLASES-02c — corrección de la ronda 4
Fecha: 2026-10-05 · Resumen: `resumen-programador.md`, "CLASES-02c — Corrección de la ronda 4 (T-06)" · Ronda 5 cerrada, autorizada por el humano ("reiniciar la memoria al cambiar de clase")

Veredicto: **ACEPTADO.** Sin hallazgos nuevos.

| Comando | Resumen | Mi corrida |
|---|---|---|
| `cd frontend; npm test` | `Test Files 117 passed (117)` · `Tests 1702 passed (1702)` | Igual |
| `cd frontend; npm run lint` | código 0 | código 0 |
| `npm run build` y `npm run lint` (raíz) | código 0 | código 0 y 0 |
| V-01 | 133/133 | 133/133 contra la tabla de la ronda 4 de 02c; hay 133 `*.ataque` y el programador no tocó ninguna |

La producción del frontend sigue en los mismos 27 archivos de 02c (20 modificados y 7 nuevos).

**Revisión del gancho.** `useFocoAlPasarAError(esError, tieneDatos, clave, destinoRef)`:
- **Reinicio sin mover el foco.** Cuando `clave` cambia, el efecto reinicia `eraError` y `huboDatos` con el estado de la consulta nueva y hace `return` antes de evaluar el foco. Así, el render del cambio de clave **nunca** mueve el foco: la primera carga fallida de la clase nueva no lo mueve (T-06), y si la clase nueva ya tenía datos en caché, `huboDatos` nace en verdadero para su próxima recarga.
- **Fuera del cambio de clave, todo sigue igual:** T-04 (recarga fallida tras datos y con el foco perdido) y T-05 (sin datos nunca) siguen como estaban, y pasan en mi corrida.
- **La clave sale de la ruta.** `ClaseLayout`, `MaestrosDeClaseView` y la lista del muro pasan `claseId`, el mismo que usa su consulta. No se usa `key={claseId}`, que remontaría la vista y perdería el estado y el foco de §7.14.
- **`"clases-admin"` en `ClasesAdminView` es adecuada.** Esa vista tiene una sola consulta (`CLAVE_CLASES_ADMIN`, sin parámetros), así que una clave constante es correcta: nunca cambia y el gancho nunca se reinicia ahí. Es un detalle, no un hallazgo: si se quiere, se deriva de `CLAVE_CLASES_ADMIN` para no tener un texto suelto en la vista. Queda para 02d junto con M-10, sin obligación.

**Instrucción para la ronda 5 cerrada del tester** (alcance: solo el cambio de clave):
1. V-01 contra las 133 de la ronda 4.
2. Atacar únicamente el reinicio por clave en los tres usos con `claseId` (`ClaseLayout`, `MaestrosDeClaseView` y la lista del muro):
   - de A con datos a B cuya primera carga falla, con el foco perdido y sin perderlo: no se mueve;
   - de A a B con datos en caché y después una recarga fallida de B: sí se mueve, si el foco se perdió;
   - de A en error a B en error;
   - ida y vuelta A → B → A con A en caché;
   - cambios rápidos de clase con peticiones en vuelo;
   - que el render del cambio de clave nunca mueva el foco.
3. En `ClasesAdminView`, solo confirmar que la clave constante no altera T-04 ni T-05.
4. Fuera de ese alcance, solo observaciones con destino.
5. Correr la suite completa una vez.
6. Si resiste, sigue la revisión final de 02c; si rompe, se escala al humano.

## Revisión final — CLASES-02c
Fecha: 2026-10-05 · Base dentro de los paquetes: `<K2b>` = `7544fb9`

Tester:
- ronda 0;
- ronda 1, ROTO (T-02, media);
- ronda 2, ROTO (T-03, baja, arbitrado como observación; T-04, media);
- ronda 3, ROTO (T-05, baja);
- rondas 4 y 5, cerradas y autorizadas por el humano: la 4 ROTO (T-06, baja), la 5 RESISTE.

Veredicto: **APROBADO CON OBSERVACIONES.** Nada bloquea el commit `<K2c>`. Las observaciones tienen destino (02d o ESTADO) y hay una nota de medición para el humano.

Verificación propia:
- **Frontend:** `npm test` da `Test Files 118 passed (118)` · `Tests 1725 passed (1725)`, igual que la corrida del tester en la ronda 5; `npm run lint` código 0.
- **Raíz:** `npm run build` código 0 (`✓ built in 688ms`) y `npm run lint` código 0.
- **Backend:** no cambió en 02c (`git diff 7544fb9 -- backend shared` vacío), así que no lo corrí. Su última corrida verificada, al cerrar 02b, dio 147 archivos y 1746 casos.
- **V-01:** 134/134 contra la tabla de la ronda 5 de 02c. Hay 134 `*.ataque` entre rastreadas y no rastreadas. Las 23 cambiadas o nuevas desde `7544fb9` (12 de la ronda 0 y 11 nuevas de las rondas 1 a 5) son todas del tester: el programador no tocó ninguna.

### 1. Lo planeado, solo lo planeado y todo lo planeado (02c)
"Alcance 02c", punto por punto, contra el código:
1. **Pantallas del admin.** `/admin/clases` (tabla opaca y densa, "Crear clase" `primary`, vacío con CTA `outline`, "Cargar más clases"), `/admin/clases/nueva` (selector de 1 o 2 maestros) y `/admin/clases/:claseId` con Muro, Alumnos, Maestros y Editar clase.
2. **Destino "Clases" del admin,** con `Destino.coincidencia` (M-04).
3. **El maestro pierde "Crear clase" y "Editar clase":** rutas (O-01), enlaces, tarjeta interna y textos. Su vacío dice que la administración asigna las clases.
4. **Muro.** El botón de borrar sale de `puedeBorrar`, por la ruta general. `useBorrarMiComentario` se retira (A-5). La firma "Administración" se decide solo con `autor.administracion` (O-07).
5. **Encabezado y tarjetas con uno o dos maestros.**
6. **Triviales heredados:**
   - sin `claseId ?? ""` en `features/clases`;
   - `normalizarTextoLargo` en `formulario-clase.tsx`;
   - el texto del `400` de "Ver más clases";
   - los `describe` de `muro-view.test.tsx` dicen "Enmienda 9".

Además, lo arbitrado en las rondas: T-02 (esperar la recarga) con sus hermanos y `cancelRefetch: false` en los cinco "Cargar más" de 02c, y el foco tras una recarga fallida (T-04 a T-06) con `useFocoAlPasarAError`. No falta nada de 02c. A-6 (mover `varianteDeClase` y las claves) queda para 02d, como dice el plan.

### 2. "No se toca", autorizaciones y "Cambios por capa"
- **Diff contra `7544fb9`** (sin `docs/trabajo/**` ni `docs/ESTADO.md`): 44 archivos rastreados (+1646/−384) y los nuevos.
  - Producción: 20 archivos modificados y 7 nuevos del frontend, todos de "Cambios por capa" de 02c o de las desviaciones aceptadas (`selector-de-maestros.tsx`).
  - Pruebas: las de PA-16 de 02c y las `*.ataque` del tester.
  - Fuera de los paquetes: solo `docs/DESIGN.md` (A-7).
- **Sin cambios contra `7544fb9`:** `backend/`, `shared/`, `features/admin/**`, `features/auth/**`, `services/**`, `lib/**`, `styles/tokens.css` e `index.css`, los componentes compartidos protegidos (`mensaje-error`, `estado-vacio`, `cargando`, `error-de-campo`, `barra-superior`, `pie-de-pagina`, `layout/lib.ts`), `components/ui/**` salvo `badge.tsx` (y su prueba), `app/` salvo `router.tsx` (y sus pruebas), los `package.json`, `package-lock.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `infra/`, `AGENTS.md`, `CLAUDE.md`, `README.md` y `.claude/`.

### 3. `CLAUDE.md` y `DESIGN.md` en el código
- **Estructura del módulo:** tipos en `types.ts`, textos en `data.ts`, puras en `lib.ts`, hooks en `hooks.ts`. Los componentes solo declaran sus interfaces `Props`.
- **Reglas de código:** ningún `fetch` fuera de `apiClient`; ningún import entre módulos; ningún `?? []` ni ternario anidado en JSX; ninguna clase de la escala por defecto ni color suelto.
- **Componentes de `components/ui/`:** `Table`, `Card`, `Button`, `Badge` y `buttonVariants`.
- **Contexto del admin:** opaco y denso solo desde `ContenedorRol`.
- **Botones y formularios:** `enEspera`, nunca `disabled`; `autoComplete="off"` en el formulario y el buscador del admin; `ErrorDeCampo`.
- **Estados:** retornos tempranos en el orden error → cargando → vacío → datos, y una sola acción `primary` por vista.
- **Insignia "Administración":** texto e icono, nunca solo color.
- **Foco (§7.14 y §7.16):** al quitar, al llegar al tope, al cargar lo último y al pasar a error tras una recarga. Nunca cae en `<body>`.
- **Textos:** en español de México, sin emojis.
- **Excepción conocida:** M-10 (`if/else` en `useAgregarAlumno`), con destino 02d.
- **`DESIGN.md` (A-7):** 13 marcas "propuesta (CLASES-02c)" y ninguna fila de tokens tocada (ningún bloque del diff cae en §3). Documenta cada patrón visual nuevo:
  - el alcance opaco de `/admin/clases*` (§7.1);
  - el indicador en contexto opaco y con tres opciones (§7.3);
  - el destino "Clases" (§7.4);
  - el inicio del maestro sin tarjeta interna (§7.5);
  - los metadatos con uno o dos maestros (§7.6);
  - la variante `institucional` y la firma (§7.8 y §7.18);
  - la tabla de clases y "Cargar más clases" (§7.9);
  - los vacíos (§7.10);
  - las perspectivas, el encabezado con dos maestros y "Volver a la lista de clases" (§7.16);
  - el buscador de maestros (§7.17);
  - el borrado según `puedeBorrar` (§7.18).

### 4. Definición de terminado, para 02c
- [x] RF-52 (frontend), RF-31, RF-59 (frontend), RN-07 en la interfaz y PRD §7 (vacío del maestro)
- [x] Capas: la interfaz no decide autorización, solo lee `puedeBorrar` y la perspectiva
- [x] `lint`, `build` y `test` en verde
- [x] Pruebas de cada viñeta PR-2C01 a PR-2C12 y las de las correcciones
- [x] Sin migración ni cambios de `infra/`
- [x] `DESIGN.md` actualizado con cada patrón nuevo (A-7). "Al cerrar 02c" no deja otros textos al orquestador (abajo)

### Hallazgos
Ninguno nuevo (ningún M-12).

### Medición del programador en 02c
- **Rondas del tester:** 0 a 5. Hubo **2 rondas extra** sobre el tope de 3 (las 4 y 5 cerradas), autorizadas por el humano.
- **Rondas extra por no extender un remedio a sus hermanos: 0.**
  - En T-02, el remedio se aplicó desde la primera corrección a sus seis hermanos.
  - T-03 fue un caso sintético, que arbitré como observación.
  - T-04 es un modo de falla nuevo: la recarga que falla. Uno de sus tres casos venía de CLASES-c.
- **Nota para el humano.** T-04 → T-05 → T-06 fueron tres rondas seguidas sobre **el mismo mecanismo** (el foco tras una recarga fallida). Cada corrección cubrió el caso pedido sin anticipar el estado vecino: primero la primera carga y luego el cambio de clase. No es el patrón de "hermanos" que fija `AGENTS.md` (controles o rutas análogos), sino **remedios incompletos de un mismo hallazgo**. El umbral literal para pasar al programador a `opus` (2 o más rondas extra por hermanos en una subentrega) **no se alcanzó**. Lo señalo porque es el mismo costo que esa regla quiere evitar: el humano decide si la regla debe cubrir también "estados vecinos del mismo remedio".
- **Resúmenes devueltos:** 0 de 6 (la implementación y cinco correcciones).
- **PARADAS:** 0. O-01 se resolvió como desviación aceptada.
- **Desviaciones:** 5 en la implementación, todas aceptadas.
- **Hermanos:** correctos en todas las correcciones. La inexactitud M-11 ("Unirme a la clase") se corrigió en el registro.

### Textos que el orquestador aplica al cerrar 02c
- **"Al cerrar 02c" del plan:** `CLAUDE.md`, "Ubicaciones compartidas", **sin cambios** (lo nuevo vive en `features/clases`). La fila `clases` de la tabla de módulos ya se aplicó al cerrar 02a. `DESIGN.md` ya lo editó el programador (A-7) y está verificado arriba. **No hay otro texto de 02c que aplicar.**
- **Propuesta del arbitraje de la ronda 2** (no es un texto del plan; requiere el visto bueno del humano): la aclaración de `DESIGN.md` §6, punto 4, sobre `enviandoRef`. Va con los textos de 02d o donde el humano diga.

### Pendientes para `ESTADO.md` §3 (filas nuevas, con destino)
- **O-05:** `/admin/` con barra final no marca "Cuentas" (venía de antes de 02c). Destino: ADMIN.
- **Los dos "Cargar más" de `features/admin`** (`registrados-del-enlace.tsx` y `tabla-enlaces.tsx`) sin `fetchNextPage({ cancelRefetch: false })`. Destino: ADMIN.
- **`formatearFechaDeClase`:** mover a `lib/format.ts` y que una fecha inválida devuelva un valor explícito en lugar del texto ISO. Destino: el próximo encargo que toque `lib/format.ts`.
- **Aclarar `DESIGN.md` §6, punto 4 (`enviandoRef`):** cuándo hace falta el candado síncrono. Destino: con los textos de 02d, con el visto bueno del humano.
- **O-11:** `alumnos-b-r2` cerca del umbral de 5 s (4.1 s en la ronda 5). Destino: junto a M-02 de DESIGN-01b; se reporta como PA-12 si pasa de 5 s.
- **O-14:** en el muro, el foco en una publicación de la clase A pasa al `h2` al cambiar a B. Destino: 02d.

**Pasan a 02d** (no son filas de ESTADO; el orquestador los incluye en la instrucción del programador de 02d):
- **M-10:** el `if/else` de `useAgregarAlumno`. Autoricé tocar `hooks.ts`.
- **O-06:** la perspectiva sin distinguir mayúsculas, en `lib.ts` y `lib.test.ts`.
- **O-07:** `SERVICIO_OCUPADO` en `CODIGOS_CON_MENSAJE_DEL_SERVIDOR`.
- **O-10:** el aviso de "Sí, quitar" del roster pasa al hook.
- **`tabla-alumnos.tsx` y `personas-view.tsx`:** `cancelRefetch: false` (autoricé `tabla-alumnos.tsx` como hermano).
- **`"clases-admin"`:** derivarla de `CLAVE_CLASES_ADMIN`, opcional.
- **O-14.**

### Comprobación humana (H-1 a H-7, al final de 02d): lo que 02c deja listo
- **Listos desde 02a y 02c:**
  - H-1 (el maestro con clases anteriores a la migración las sigue viendo);
  - H-2 (`/admin/clases`: crear con dos maestros, tabla, encabezado y secciones en material opaco con el indicador visible);
  - H-5 (la insignia "Administración" en el muro del estudiante y el maestro sin "Borrar publicación" en ella);
  - H-7 (el maestro sin "Crear clase" ni "Editar clase", y su inicio sin la tarjeta interna).
- **Dependen de 02d:**
  - H-3 (la barra lateral con la lista de clases);
  - H-4 (360 px con "Personas" y la barra inferior);
  - H-6 ("Tipo de publicación" como control segmentado).

### Cifras finales de 02c
| | Archivos | Casos |
|---|---|---|
| Frontend | 118 (desde 104) | 1725 (desde 1396) |
| Backend (sin cambios en 02c) | 147 | 1746 |
| `*.ataque` | 134 (desde 123; tabla de la ronda 5 de 02c, base de V-01 de 02d) | |

Siguiente paso:
1. El orquestador aplica las filas de ESTADO.
2. El orquestador le pasa al humano la nota de medición.
3. El humano hace el commit `<K2c>`.
4. Arranca la ronda 0 de 02d, con los pendientes de arriba en la instrucción del programador.
