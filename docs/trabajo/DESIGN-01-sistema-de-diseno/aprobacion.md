# Aprobación del humano — DESIGN-01a

Fecha: 2026-09-27
Aprobó: Carlos Salazar
Carril: DESIGN-01a **sensible** (aprobación escrita del plan y revisión humana del diff antes del commit); DESIGN-01b **normal**, con la condición de detención de su resumen
Registró: orquestador (sesión principal), a partir del mensaje del humano.

## Base de V-08
- `frontend/` y `package-lock.json`: `6868e4d` (fusión de DOCS-03).
- Todo lo que está fuera de `frontend/`: **`<A>` = `5a32230`** (`5a32230f702f27cb7cf094e2bbb43eb47ca94a20`, "docs(design-01): plan 01a replaneado sobre D3 y aprobado", commit del humano del 2026-09-27). El orquestador comprobó que existe (`git cat-file -e '5a32230^{commit}'`, código 0) y que incluye `.claude/agents/tester.md`, `docs/DESIGN.md`, `docs/ESTADO.md` y los 5 archivos de esta carpeta. Tras el commit, el árbol de trabajo quedó limpio y `git diff --quiet 6868e4d -- frontend/` salió con código 0.

## Texto de la aprobación
> APRUEBO el plan de DESIGN-01a tal como está en plan.md (estado LISTO).
>
> - Acepto la condición ampliada de 01b: no toca require-rol.tsx, require-sesion.tsx, require-cambio-de-contrasena.tsx ni las guardas de router.tsx. Si lo necesita, se detiene y me avisa.
> - Acepto fichaDe como solución temporal (R-15). Agrega a los pendientes de ADMIN en ESTADO.md: "Dar rol accesible a la ficha de cuenta (role=region con nombre accesible) y que las pruebas de ataque la localicen por ese rol en lugar de fichaDe."
> - whitespace-nowrap y el peso de títulos de anuncios los juzgo en H-10.
>
> Registra la aprobación en aprobacion.md y actualiza ESTADO.md. No hagas commit ni inicies la ronda 0: avísame cuando esté listo para que yo haga el commit.

## Decisiones del humano durante la planeación (2026-09-27)
El detalle de cada una está en `plan.md`, "Respuestas del humano que este plan aplica".

| Tema | Decisión |
|---|---|
| Dirección visual | D3, "Vidrio líquido con fondo flotante" (`docs/DESIGN.md`, D-28). El plan de la dirección C queda como antecedente en `plan-direccion-c.md` y `revision-direccion-c.md` |
| Barra lateral (P-01) | Solo destinos que ya existen; ninguna ruta nueva |
| Administrador (P-02) | Sin componente de tabla; sus pantallas van opacas, sin vidrio |
| Ronda 0 (P-03) | Sí, antes del programador |
| División (P-04 y P-07) | 01a: tokens, materiales de vidrio con respaldo sólido sin `backdrop-filter`, fuentes, componentes base, migración de clases, `enEspera` en los 13 botones y T-14. 01b: marco, composición y `FondoAnimado` con orbes, con `prefers-reduced-motion` |
| Fuentes (P-05) | Las tres de `@fontsource`, solo el subconjunto `latin` |
| Carril (P-06) | 01a sensible; 01b normal |
| Controles del admin | 36 px en escritorio y 44 px en pantallas angostas (corte de 768 px) |
| M-01 | Se autoriza modificar `frontend/vitest.config.ts` (excepción E-3 del plan) |
| Rojos previstos | El humano acepta el cambio en los 6 `*.ataque` que arbitró el manager, con sus cuatro condiciones |
| Selectores de la ficha (P-08) | (B): en la ronda 0, el tester los cambia por uno que funcione antes y después del cambio, por rol, etiqueta o texto accesible, nunca por clase de estilo. Se acepta `fichaDe` como solución temporal (R-15) |
| Orbes fuera de login e inicio (P-09) | (A): quietos, como dice `DESIGN.md` §7.1 |
| Condición de 01b | No toca `require-rol.tsx`, `require-sesion.tsx`, `require-cambio-de-contrasena.tsx` ni las guardas de `router.tsx`. Si lo necesita, se detiene y avisa al humano |
| Foco de los botones azules y rojos | Contorno blanco por dentro; el humano lo confirma en H-04 |
| Campos del admin | Texto de 16 px, por el zoom de Safari en iOS |
| Precondición de la ronda 0 | "`frontend/` sin cambios desde `6868e4d`"; el humano hace commit de los documentos antes |
| `whitespace-nowrap` del tamaño `enlace` y peso de los títulos de los anuncios | Los juzga el humano en H-10 |

Reglas de D3 que el humano pidió respetar: orbes animados solo con `transform`; pantallas densas (calificaciones, admin) opacas; el rojo nunca como texto sobre vidrio al 62 %; contraste AA verificado en navegador, no solo calculado. Lo mide el humano (H-09); ningún agente abre un navegador.

## Documentos que aplicó el orquestador (autorizados)
- `.claude/agents/tester.md`, "Reglas de combate": "Las pruebas de ataque no localizan elementos por clases de estilo. Usa el rol, la etiqueta o el texto accesible; una clase cambia con el diseño sin que cambie el comportamiento."
- `docs/DESIGN.md` §8: la fila del administrador dice "texto de 14 px (16 px en campos de texto)", y un párrafo debajo de la tabla explica el zoom de Safari en iOS.

## Flujo
1. El humano hace commit de los documentos del plan. Deben ir `.claude/agents/tester.md`, `docs/DESIGN.md` y esta carpeta.
2. El orquestador anota el hash `<A>` arriba.
3. Ronda 0 del tester (plan, §D-8): confirmación de T-14 y selectores de la ficha.
4. `programador` (DESIGN-01a).
5. `tester`, rondas 1 a 3.
6. `manager` en modo final.
7. El humano hace la comprobación visual y revisa el diff antes del commit.

Ningún agente hace commit, push ni deploy.

## Pendientes para encargos siguientes
- **ADMIN:** "Dar rol accesible a la ficha de cuenta (role=region con nombre accesible) y que las pruebas de ataque la localicen por ese rol en lugar de fichaDe." (R-15).
- **DESIGN-01b:** plan detallado en `plan-01b.md`, desde una rama nueva después de fusionar 01a.
