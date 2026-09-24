# DOCS-02a — Clases en vivo en desarrollo, requisitos de DEPLOY y modelos de los agentes

Fecha: 2026-09-24
Carril: trivial (solo documentos y configuración de agentes), aplicado por el orquestador a pedido del humano. Sin commit.

## Texto del encargo
> Encargo DOCS-02a, carril trivial, solo documentos y configuración de agentes; aplícalo tú. Tres partes:
> 1. README §7: la línea que sugirió el manager remitiendo a la regla de redes de AGENTS.md.
> 2. Decisiones de clases en vivo, en ARCHITECTURE.md (§12 y §18), en ESSENTIALS ("Clases en vivo") y como D-26 en §20: en desarrollo, las clases en vivo usan el LiveKit local de infra; LiveKit Cloud se conecta hasta el encargo DEPLOY y el cambio es de configuración (URL, llaves, destino de grabaciones, URL pública del webhook). Las grabaciones no se prueban de punta a punta en desarrollo; en ENVIVO el código de grabación se escribe y se prueba con dobles, y el botón de grabar queda detrás de un interruptor de configuración: desactivado en dev, con el texto "Grabación disponible solo en el servidor". DEPLOY incluye dos verificaciones de punta a punta con servicios reales: un correo de recuperación que llegue a la bandeja de entrada, y una grabación completa que llegue a R2 y aparezca en la lista del alumno. Añádelas a los requisitos de DEPLOY.
> 3. Modelos de los agentes: confirmar si el frontmatter acepta "effort"; model a opus en arquitecto, manager y tester, y a sonnet en programador, a prueba. Si effort está soportado: high en arquitecto, manager y tester, medium en programador. Anotar en AGENTS.md ("Equipo de agentes") el modelo de cada uno y que el del programador está a prueba hasta revisarlo después del encargo CLASES.

## Cambios aplicados
1. **`README.md` §7 ("Backend en local", Pruebas):** una línea tras la comprobación de contenedores: Ryuk publica su puerto en todas las interfaces mientras dura la corrida; no correr la suite en una red pública o no confiable sin la mitigación del firewall; remite a `AGENTS.md` ("Pruebas") y a `docs/trabajo/CHORE-01-testcontainers/mitigacion-ryuk.md`.
2. **Clases en vivo:**
   - `docs/ARCHITECTURE.md` §12: el primer punto pasa de "LiveKit Cloud. Un proyecto para `dev` y otro para `prod`" a "LiveKit Cloud en `prod`; LiveKit local en `dev`", con el paso a Cloud en DEPLOY por configuración (URL, llaves, destino de grabaciones, URL pública del webhook). Punto nuevo "Grabaciones en desarrollo": sin prueba de punta a punta en `dev`; código con dobles en ENVIVO; botón detrás de un interruptor desactivado en `dev` con el texto "Grabación disponible solo en el servidor"; la primera grabación real se verifica en DEPLOY.
   - `docs/ARCHITECTURE.md` §18, paso 4 "Verificación": se añaden las dos verificaciones de punta a punta del encargo DEPLOY (correo de recuperación en la bandeja de entrada; grabación completa en R2 y en la lista del alumno).
   - `docs/ARCHITECTURE.md` §4, fila `dev` de "Entornos": decía "Las grabaciones se prueban contra un proyecto de LiveKit Cloud de desarrollo", que contradice la decisión nueva. Ahora dice que las clases en vivo usan el LiveKit local de `infra/` y que las grabaciones no se prueban de punta a punta en `dev`. **No estaba en la lista de secciones del encargo**; se corrigió para no dejar una contradicción.
   - `docs/ARCHITECTURE-ESSENTIALS.md` "Clases en vivo": el primer punto refleja LiveKit Cloud en `prod` y el local en `dev`, con el cambio de configuración; punto nuevo sobre las grabaciones en `dev` y la verificación en DEPLOY.
   - `docs/ARCHITECTURE.md` §20: **D-26** nueva al final (D-01..D-26 contiguas).
3. **Modelos de los agentes:**
   - Confirmación de `effort`: la documentación oficial de Claude Code lo recoge en la página de configuración de modelos (sección de configuración de subagentes y skills, ejemplo con `model: opus` y `effort: high`); valores documentados `low`, `medium`, `high`, `xhigh`, `max`. La tabla principal de campos de la página de subagentes todavía no lo lista (desfase de la documentación). La herramienta de agentes de esta sesión declara además que el esfuerzo de cada tipo de agente se toma de su frontmatter.
   - `.claude/agents/arquitecto.md`, `manager.md`, `tester.md`: `model: opus`, `effort: high` (antes `model: inherit`).
   - `.claude/agents/programador.md`: `model: sonnet`, `effort: medium` (a prueba).
   - `AGENTS.md` "Equipo de agentes y flujo de trabajo": columna "Modelo" en la tabla y una línea: el modelo y el esfuerzo se fijan en el frontmatter; el del `programador` está a prueba y se revisa después del encargo CLASES.

## Requisitos del encargo DEPLOY
La lista consolidada, con la fuente de cada requisito, vive en `docs/ARCHITECTURE.md` §18, subsección "Requisitos previos a abrir la plataforma".

## Verificación
- `git diff --stat`: `README.md`, `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-ESSENTIALS.md`, `AGENTS.md` y los cuatro `.claude/agents/*.md`. Ningún archivo de código ni de configuración de la aplicación.
- D-01..D-26 contiguas en §20; `docs/PRD.md` sin cambios.
- Todos los archivos tocados en LF, sin retornos de carro.
- Sin `lint`, `test` ni `build`: solo documentos y frontmatter de agentes.
- El cambio de modelo de los agentes surte efecto en la próxima invocación de cada uno; no se probó en este encargo.
