# Reporte del Tester — CHORE-03 · traducción de los errores de la API en el frontend

## Ronda 0 — 03a
Veredicto: **RONDA 0 CERRADA**
Verificación propia: lint frontend `0` · test frontend `197 passed (197)` · `3318 passed (3318)` · `Test timed out` = 0

Rama `chore/chore-03-errores-api`, base `ad10844`. Plan `plan.md` SHA-256 `63f6eef558e3bd3998d351046e6461d93ca9963c4c4f878452192912322aedf2` (Enmienda 1, aprobado por el humano con A-1 a A-5). En esta ronda no se escriben pruebas de ataque ni se ataca nada; solo V-01, la reescritura C-1 (A-5) y la verificación propia.

Archivos tocados por el tester en esta ronda: `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` (C-1) y este reporte. Nada más (`git status --porcelain` tras la ronda: los cinco documentos de la parte A, ya modificados al arrancar; el `*.ataque` de C-1; y la carpeta del encargo sin versionar).

### V-01 — las 204 `*.ataque` de la base, sin cambios (antes de la reescritura)
Comando (Git Bash, desde la raíz):

```bash
git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$' | sort | xargs sha256sum \
  | sed 's/ \*/  /' | awk '{print tolower($1)"  "$2}' | sort -k2 > actual.txt
# base: filas `| <hash> | <archivo> |` de la tabla "Tabla de SHA-256 de las 204 `*.ataque` al cierre
# de la ronda 0 de N-19" de docs/trabajo/N19-texto-tarea-con-entregas/reporte-tester.md, hash en minúsculas
diff base-n19.txt actual.txt && echo IGUALES
```

Resultado: base 204 filas, actual 204 archivos, `diff` vacío, `IGUALES`. **204 de 204 iguales, ninguna de más ni de menos.** Además, `git diff --stat ad10844 -- frontend shared backend` estaba vacío antes de la reescritura.

### Reescritura C-1 (A-5)
Archivo y caso: `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` › "erroresPorCampo y esErrorDeCursor dan lo mismo con incidencias sin campo, repetidas o con llaves que no son texto, y con errores que no son de cursor" (línea 178).

Diff (`git diff -- frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx`):

```diff
@@ -175,7 +175,9 @@ describe("ataque TAREAS-01c r1: mismas salidas que en ebfe126 (tablas con entrad
       null,
       undefined,
     ]
-    expect(errores.map(esErrorDeCursor)).toEqual(errores.map((e) => campoDeEbfe126(e) === "cursor"))
+    expect(errores.map((e) => esErrorDeCursor(e))).toEqual(
+      errores.map((e) => campoDeEbfe126(e) === "cursor"),
+    )
     expect(erroresDeFormularioClases(errores[0], ["cursor"])).toEqual({ cursor: "no es válido" })
```

Nota de forma (no de contenido): la sustitución literal `errores.map(esErrorDeCursor)` → `errores.map((e) => esErrorDeCursor(e))` deja la línea en 110 columnas, y `prettier --check` (que corre dentro de `npm run lint`, `printWidth` 100 en `.prettierrc.json`) la rechazaba. Apliqué `npx prettier --write` solo sobre ese archivo, desde `frontend/`: el único cambio que hizo fue partir esa misma expresión en tres líneas y agregar la coma final que exige `"trailingComma": "all"`. Ni el título, ni las demás aserciones, ni la lista `errores`, ni la copia local `PREFIJO_DE_EBFE126` / `campoDeEbfe126` cambian; lo que la prueba protege es lo mismo. Con la firma actual de `esErrorDeCursor` (un solo parámetro) la reescritura es equivalente; con la de 03a (`campos = ["cursor"]`) evita que `map` le pase el índice.

### `esErrorDeCursor` pasado como referencia (grep)
Comandos (desde la raíz):

```bash
grep -rn 'esErrorDeCursor' frontend/src
grep -rnE 'esErrorDeCursor(DeCalificaciones)?\s*[),]' frontend/src | grep -vE '^\S+:\s*[0-9]+:\s*(import|export)'
grep -rnE '\.(map|filter|some|every|find|findIndex|flatMap|forEach|reduce)\(\s*esErrorDeCursor\s*[,)]' frontend/src shared backend
grep -rnE '\.(map|filter|some|every|find|findIndex|flatMap|forEach)\([a-zA-Z]*Cursor[a-zA-Z]*\s*[,)]' frontend/src
```

Resultado:
- Producción: `esErrorDeCursor` se define una vez (`lib/errores-de-api.ts:35`), se reexporta en `features/clases/lib.ts:171` y se **llama** con paréntesis en `features/clases/clases-admin-view.tsx:49` y `features/tareas/entregas-view.tsx:108`, `:121`, `:162`. `esErrorDeCursorDeCalificaciones` se llama con paréntesis en `gradebook-view.tsx:128` y `mis-calificaciones-view.tsx:123`, `:151`. **Ningún uso en producción la pasa como referencia a `map`, `filter`, `some` ni otro método de arreglo.**
- Pruebas: tras C-1, ninguna `*.ataque` la pasa como referencia. Las únicas apariciones sin llamada son `reexportaciones-01c.test.ts:121` (`expect(esErrorDeCursor).toBe(esErrorDeCursorNuevo)`, identidad: no rompe), `refactor-01c-r1.ataque:434` (una llave de objeto con la ruta donde debe definirse), `estatico-01d.test.ts:131` (texto de una expresión regular) y un comentario de `features/clases/lib.ts:168`. Los `.filter(sinCursor)` de `secciones-01d-r3` y `secciones-01d-r4` son un ayudante local de esas pruebas, no `esErrorDeCursor`.
- Sin hallazgos de ronda 0 por este punto.

### Comandos de la verificación propia
Antes de la corrida completa comprobé los procesos `node.exe` (`tasklist` y `Get-CimInstance Win32_Process`): solo había uno ajeno a las suites (`host-daemon.mjs` de otra herramienta), ninguno de `vitest`. No lo toqué. Una suite a la vez; backend y `shared/` no se corrieron (03a no los toca).

| Comando | Salida | Última línea |
|---|---|---|
| `cd frontend; npx prettier --check src/features/clases/refactor-01c-r1.ataque.test.tsx` (tras la sustitución literal, antes de formatear) | 1 | `Code style issues found in the above file. Run Prettier with --write to fix.` |
| `cd frontend; npx prettier --write src/features/clases/refactor-01c-r1.ataque.test.tsx` | 0 | `src/features/clases/refactor-01c-r1.ataque.test.tsx 146ms` |
| `cd frontend; npm run lint` | 0 | `> tsc -b` (antes: `All matched files use Prettier code style!`) |
| `cd frontend; npm run test` (02:17:03Z a 02:21:30Z) | 0 | `Test Files  197 passed (197)` · `Tests  3318 passed (3318)` · `Duration  256.83s`; `grep -c "Test timed out"` = 0 |
| `cd frontend; npx vitest run src/features/clases/refactor-01c-r1.ataque.test.tsx` | 0 | `Test Files  1 passed (1)` · `Tests  11 passed (11)` |

Las cifras de la corrida completa coinciden con las de la ronda 0 de N-19 (197 archivos, 3318 pruebas). La duración subió de 187 s a 257 s por carga del equipo, sin ningún tiempo límite vencido (no es PA-12).

### Indicación del humano para las rondas posteriores (2026-10-26, literal)
> "Las pruebas de interfaz de los formularios recorren la tabla común de entradas fuera de contrato con una prueba parametrizada por módulo (`it.each` o equivalente), no un caso escrito a mano por formulario y entrada. La cobertura es la misma y la suite no se infla."

Aplica a mis `*.ataque` de interfaz desde la ronda 1 de 03a (y en 03b y 03c).

### Tabla de SHA-256 de las 204 `*.ataque` al cierre de la ronda 0 de CHORE-03 03a (base de V-01 del programador y del manager en 03a)
Una cambia respecto a la tabla de la ronda 0 de N-19 (marcada "Reescrita (CHORE-03 03a, C-1)"); las 203 restantes son iguales. Se reproduce con el comando de V-01 (hash en mayúsculas aquí; compárese sin distinguir mayúsculas).

| SHA-256 | Archivo | Nota |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `5E02A27716D63E8CE0FE6B6171BFF089EB3EE2548260349B16950D7E65A1BCF9` | `backend/test/calificaciones-01a-r1.ataque.test.ts` |  |
| `AFB531E7CCAB1CB53F0322D7D099A7F435DBD42325DE8C225525E3784B93F6CC` | `backend/test/calificaciones-01a-r2.ataque.test.ts` |  |
| `DD919EBD74A2C6AC60C244A1563B46895821B0D25E5051CDA25FFFB72B653416` | `backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` |  |
| `B09BAAEC53455CEA1A0674890EBD9353007E6F2628001446E873B09279FFBA07` | `backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` |  |
| `29EED2E93AF2775A4605160EA533BD462FD03CB1CFE4C47154898358A7255869` | `backend/test/calificaciones-estatico-01b-r1.ataque.test.ts` |  |
| `6E4C0EB47FF8020B0A539E5B70B24C8C1D05F7773EA092CD513E39C68CF4534E` | `backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts` |  |
| `6E3C92C13F146A01C8DCFDC7DD04BEA59F0E2562051F6AC65F95F924EF73E4DB` | `backend/test/categorias-01a-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `47B02C6D3916713BF9236A619FDB59A641D2E805F1F0B7E9B2C161FE719DDC3A` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `E4E9365EA010F3F670B6C1194D1A592E95DB43BFF0496D4EA1646FC5225CA8B4` | `backend/test/gradebook-01b-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `2684916C88B9405706F82DA3F9B2FFD0B3626A11AF79E20EA146FDFD1D52C319` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `3790777831A1FACB053D0719D85AB404593954416B1443A1A59530E09E2C81DC` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `BC6D49F9FC1F5EB20E305945FEF57CAEEBEB108BFF5D5CF4BA10B8040687D69C` | `backend/test/mis-calificaciones-01b-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `CCEA34C962FC8F14A49C64EAFA8119DAE5030E1302ED94FE369299EC49182BB8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `C67FA558FA7AE23821175478C8CB7D4874EE5F4D6CB84D0851F9A551B8AB455B` | `frontend/src/app/rutas-01d-r1.ataque.test.tsx` |  |
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `48F5FF8FEF35FAA6D8500FAE4A53CA953D7F661100A5C4879BA58E68972AB2DE` | `frontend/src/components/foco/foco-01d-r1.ataque.test.ts` |  |
| `36A104515F2EA87F143B2CFC00AEF9A33E6DDDB666844C1A9C977557EECA20EF` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `F0CBA6F9B6C4CF1D74ED52AD89943088661370F5A784502F851CD6230912F606` | `frontend/src/features/calificaciones/estatico-01d-r1.ataque.test.ts` |  |
| `5991D8E3D4E694973309F178E5341A2285584CF9ED6006FBB658D7F5A61DE5DD` | `frontend/src/features/calificaciones/gradebook-01d-r1.ataque.test.tsx` |  |
| `C744FB831FA9992C2A9ED0729F9EC3CC089F3167CA19133C6EEE0133382607A1` | `frontend/src/features/calificaciones/gradebook-01d-r2.ataque.test.tsx` |  |
| `8DEA1C2ADC5D228E166CE6037A1A1A827D26E2BDC6D7C8534F146517EBC1AC44` | `frontend/src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx` |  |
| `6F7496CA7652E7B4441A7EB9822E74270D50127AC40BA27B86C83EDFCD5CC3FA` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r1.ataque.test.tsx` |  |
| `24751F358FC5ECD485C475E7025DD881B87FE892F025459A6FF29F615FC5CC66` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r2.ataque.test.tsx` |  |
| `C504D0AD3690781275A6FFB78638A6148550B2FD4EE1ED25A4B154054FC4F80D` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r3.ataque.test.tsx` |  |
| `A8790F734402A957534D0F0E660EEF342F9029CDFC1991BE421D9B3E3C3E9CB7` | `frontend/src/features/calificaciones/secciones-01d-r3.ataque.test.tsx` |  |
| `FB33F2A27BFCCA906549A12610977478BA72E6E7ED8AFD5C5A0A962DEB3EB802` | `frontend/src/features/calificaciones/secciones-01d-r4.ataque.test.tsx` |  |
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `A3880B67FFAA0D15763D1C761CEF1FF8472029C77BFB2211AB079EADB1685325` | `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` |  |
| `66C0B873BC8B9D8E9E01AC871BD6AAAB4328508BEB5EC9371D69463D7C12430D` | `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` |  |
| `5272DE876597EAD9EF838E4D022185C80AA411AAD9E67325573C87F954C5F7A6` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `827B8ABCA664145D51A1BBD1C0B558B0EDDFED8707A21A774222B4972BE14FF2` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `85A7926A0F6831A8375F544CF38FE5585A8E2DCBF73D9726E9A3CFAAB7F76511` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` | Reescrita (CHORE-03 03a, C-1) |
| `4303EAC77B98E8978495D9E68FD7725AC436F9DB757DBC0C02C59051436908FA` | `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` |  |
| `A4AA15CEF1A377EED688DAB1B92E5CA4A3943490144CEC861CF7B482845B0362` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` |  |
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `2EF258E946084F17E33936E8FA257551A90323B589859DD2E1F70AABEAF711BF` | `frontend/src/features/tareas/aviso-calificar-01c-r3.ataque.test.tsx` |  |
| `E2FEFD7D744F77C7BDD2BA73A08CC51076D0F6130BF4D0A225E0E972A1DCE111` | `frontend/src/features/tareas/avisos-01c-r2.ataque.test.tsx` |  |
| `11BB5433FB30F268B6D93E1E7814D826BBAB8FB1F173E574FAF52F5A96B5A41E` | `frontend/src/features/tareas/calificar-01c-r1.ataque.test.tsx` |  |
| `D8DACCB56C8DE8D9F1B0F8D1B0907C110E327F4F55B016FC0FE7FC0F25CCC79C` | `frontend/src/features/tareas/calificar-vacio-01c-r4.ataque.test.tsx` |  |
| `EF86C46708F0682BCA5A023E85794639C396EC94D207CAC23CEB13585AB39E75` | `frontend/src/features/tareas/campos-01c-r2.ataque.test.tsx` |  |
| `5FF367EDBA10C9BA9C7E50F8ED874032654FA2ABDC0DD8F4A122A000355472AB` | `frontend/src/features/tareas/cruces-01c-r3.ataque.test.tsx` |  |
| `0963F14F4842D6D57288876C932496AC09D44B872FC049492EE6E8BA539F3235` | `frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx` |  |
| `4F486CA37D2A2BB6CC26754281D2ADCE086A9D8D4485A069DE7AE5D54E360ACF` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `93A5A0A648669E9C96494A62B2B16082B07296F279E2892BF2C8D47834EE2FC1` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` |  |
| `432DCDDF119DD0E32E49ADC42D5F51D197698C8896E1058C505AB31F4A8EE838` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` |  |
| `172BE3EFD919C0D3948ECA17C7E808968E2370AFE1F9C2A28CEF7D2DED584B81` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` |  |
| `496652BC59817166F53E00CB828F2119C857C2834063A31764D7876DC150C930` | `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` |  |
| `F614E7369F8C47C40A87AD1F8867FB8EDF7EBC76E94D0BA6C5C59C92CB6347F0` | `frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts` |  |
| `FB387ECBB7E5272D2FFB53D626B51FFD9C57B409D10C560E6A5ECBFA6A2A8C19` | `frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx` |  |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `60BC1FC7011E9A0FE5A4C4AA45420F2C7D38ADB9EE2F8D235D09847DBE13AC3A` | `frontend/src/lib/format-01c-r1.ataque.test.ts` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `FC4963D3FD93297C427EAD0B85B23615C287E4F2C48079BCA8031D1C2AEE0396` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

`diff` de esta tabla contra la de N-19: una sola fila, `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx`, de `2911195DC97BF9B25E7E874E0A0B6C9C0D25A9A878C2E821A752D340D219A740` a `85A7926A0F6831A8375F544CF38FE5585A8E2DCBF73D9726E9A3CFAAB7F76511`.

## Ronda 1 — 03a
Veredicto: **ROTO**
Verificación propia: lint frontend `0` (`> tsc -b`) · test frontend `Test Files  3 failed | 205 passed (208)` · `Tests  9 failed | 3509 passed (3518)` · `Test timed out` = 0. Los 9 rojos son mis pruebas de T-01 (6) y T-02 (3); ninguna prueba del programador ni ninguna `*.ataque` previa falla.

Rama `chore/chore-03-errores-api`, base `ad10844`, plan `63f6eef5…` (Enmienda 1, aprobado). Ataco solo 03a: el contrato de `lib/errores-de-api.ts`, la tabla común, `features/tareas` y `avisoDeFalloAlSubir` de `components/adjuntos`. Leí el código nuevo (`lib/errores-de-api.ts`, la tabla, `tareas/data.ts`, `tareas/lib.ts`, `adjuntos/lib.ts`, las seis vistas y los hooks de `tareas`, `adjuntos-de-publicacion.tsx`), no solo las pruebas. Archivos que toqué: las cuatro `*.ataque` nuevas de abajo y este reporte. Ningún archivo de producción, ninguna prueba del programador y ninguna `*.ataque` previa (V-01 abajo).

Pruebas de ataque nuevas (`npx vitest list <archivo>`, 92 casos):

| Archivo | Casos |
|---|---|
| `frontend/src/lib/errores-ch3-r1.ataque.test.ts` | 14 |
| `frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts` | 8 |
| `frontend/src/components/adjuntos/errores-ch3-r1.ataque.test.ts` | 3 |
| `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx` | 67 |

### Hallazgos

#### T-01 — El 400 real del servidor para un id de la ruta lleva el campo dos veces, y el aviso le enseña la ruta a la persona
Severidad: **media**
Pruebas (las seis fallan):
- `frontend/src/lib/errores-ch3-r1.ataque.test.ts` › "T-01: los mensajes reales del servidor para un id de la ruta o el ?confirmar= de borrar llegan a la persona sin ninguna ruta técnica"
- `frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts` › "T-01: «archivoId: archivoId: …» (descargar un adjunto de la tarea o de una entrega) y «confirmar: confirmar: no es válido» (borrar) dan un aviso sin ruta técnica"
- `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx` › "T-01: un adjunto de la tarea en el detalle: …", "T-01: un archivo de «Tu trabajo»: …" y "T-01: un archivo de la entrega de un alumno: el 400 real del servidor ante un archivoId de la ruta inválido («archivoId: archivoId: …») da un aviso sin ruta técnica"
- ídem › "T-01: borrar la tarea con el 400 real del servidor ante un ?confirmar= inválido («confirmar: confirmar: no es válido») da un aviso sin ruta técnica"

Reproducción del lado del servidor: los esquemas de `shared/` ya traen el campo en su propio mensaje (`idDeRuta` de `shared/src/entregas.ts:135`, `archivoIdParamSchema` de `shared/src/archivos.ts:78`, `tareaIdParamSchema` y `borrarTareaQuerySchema` de `shared/src/tareas.ts:222` y `:231`), y `validarParametros` (`backend/src/handlers/validacion.ts:27`) arma `${campo}: ${mensaje}`. Lo comprobé ejecutando `validarParametros` del backend con `npx tsx` (un script en el scratchpad, sin base ni red). Lo que sale:

```
"tareaId: tareaId: debe ser un identificador válido"
"archivoId: archivoId: debe ser un identificador válido"
"confirmar: confirmar: no es válido"
```

Esperado: un aviso legible y sin ruta técnica (puntos de ataque del plan: "cualquier entrada que deje un aviso … con una ruta técnica"; §D-2, fila "`VALIDACION` `<ruta no pintada>`: Mensaje → un aviso «Mensaje»"; `DESIGN.md` §9, "sin tecnicismos").
Obtenido: al descargar un adjunto (del detalle, de "Tu trabajo" o de la entrega de un alumno), el aviso dice «archivoId: debe ser un identificador válido». Al borrar la tarea dice «confirmar: no es válido». El contrato quita la ruta una sola vez (S-05) y deja la segunda.
Requisito o regla violada: los puntos de ataque del plan y §D-2. El código cumple S-05 al pie de la letra: lo que falla es el supuesto de N-07 y S-05 de que la ruta del mensaje es siempre una sola, que no coincide con lo que el servidor emite de verdad. No figura en "Decisiones tomadas que no son hallazgo". Esas decisiones cubren un solo recorte para «Debe ser 0: 10» (N-36), y aquí el resto que queda es otra ruta, no un texto con dos puntos.
Alcance: el cliente siempre arma `archivoId` y `?confirmar=` válidos, así que hoy solo se llega con una URL manipulada. Es el mismo alcance que el `limite:` que el plan sí trata (R-15).
Hermanos que revisé:
- `tareaId:`, `alumnoId:` y `claseId:` con el campo repetido dan su texto fijo por `textosPorCampo`. Lo comprueba el caso "claseId, tareaId y alumnoId con y sin texto…", en verde.
- En las consultas, cualquier `VALIDACION` da el respaldo, así que solo se ven afectadas las acciones.
- En 03b y 03c pasa lo mismo con `publicacionId`, `comentarioId`, `maestroId`, `temaId` (`temaIdParamSchema`, `moverElementoSchema`, `temaIds.N: temaId: …`), `categoriaId` (`categorias.N.id: categoriaId: …`) y `tema: tema: elige un tema válido` (consulta de "Trabajo de clase", que da el respaldo). No es hallazgo de 03a; lo anoto para el plan de 03b.

#### T-02 — «Descargar» no tiene guarda síncrona: dos clics seguidos mandan dos peticiones y dan dos avisos
Severidad: **baja**
Pruebas (las tres fallan): `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx` › "un adjunto de la tarea en el detalle: dos clics seguidos en «Descargar» que falla mandan una sola petición y dan un solo aviso", y las mismas para "un archivo de «Tu trabajo»" y "un archivo de la entrega de un alumno".
Esperado: una sola petición de la URL de descarga y un solo aviso. Así lo dice la matriz del programador ("Descarga de un adjunto: un solo toast"; "en vuelo a la vez: sin cambio, las guardas con ref siguen").
Obtenido: `{ pedidas: 2, avisos: ["Revisa este valor.", "Revisa este valor."] }`. `VistaDeFicha` solo usa `enEspera={descarga.isPending}`, sin ref (`components/adjuntos/adjuntos-de-publicacion.tsx:33` y `:78-83`), y `enEspera` llega un render tarde. Además, `useMutation` sigue solo la última llamada: cuando la segunda falla, el botón sale de la espera aunque la primera siga en vuelo.
Requisito o regla violada: `CLAUDE.md` › Componentes ("Toda acción que lanza una mutación lleva, además de `enEspera`, una guarda síncrona con una ref…", TAREAS-01e, M-01) y la matriz de §D-6 en el estado "en vuelo a la vez".
Contexto: el defecto ya existía en `ad10844` (el archivo no cambió en 03a) y `adjuntos-de-publicacion.tsx` está en "No se toca" de 03a (`src/components/` salvo `adjuntos/lib.ts`). Corregirlo pide una enmienda o un destino aparte; lo decide el manager. En el camino feliz, dos clics darían dos `window.location.assign`. No lo verifiqué: jsdom no navega y no abro navegadores.

### Atacado sin hallazgos
- **Tabla común por formulario (indicación del humano):** `formularios-ch3-r1.ataque.test.tsx` › "$formulario.nombre: su parte rotativa de ENTRADAS_FUERA_DE_CONTRATO…". Es un `it.each` sobre los 7 formularios (crear, editar con rúbrica, entregar, comentario del alumno, comentario del maestro, panel con rúbrica y panel sin rúbrica) que reenvía el mismo formulario montado.
  - Cada formulario recorre un tercio rotativo de la tabla (índice mod 3), más las entradas de "dos puntos dentro" y "sin ruta". Entre los siete, cada una de las 107 entradas pasa por la interfaz al menos dos veces (caso "entre los siete formularios…").
  - Resultado en todos: exactamente un aviso con `resto ?? genérico`, ningún `ErrorDeCampo`, el foco en el botón, lo escrito conservado y el botón fuera de la espera.
  - La tabla completa por formulario tardaba de 10 a 15 s por caso (unos 90 s en el archivo); con la rotación son 2.5 a 4.5 s. Las pruebas de función recorren la tabla entera.
- **O-01:** "…: F2 en «…» en el primer envío (​, NBSP+​+salto, \u0085)…", 17 campos pintados:
  - crear: `titulo`, `instrucciones`, `fechaLimite`, `puntos`, `categoriaId`, `temaId`, `requiereAdjuntos` y `rubrica`;
  - editar: `titulo`, `rubrica.0.criterio` y `rubrica.1.puntosMax`;
  - entregar: `enlaces` y `enlaces.0`;
  - `texto` en los dos hilos;
  - panel: `comentario`, `puntajes.0.puntos`, `puntajes.1.puntos` y `calificacion`.

  En el **primer** envío, cada uno da un solo `ErrorDeCampo` con el genérico, ningún aviso y la descripción accesible del control con el genérico. El foco va al mismo elemento que con un error con mensaje, medido en otro montaje: el botón en los formularios y el campo en el panel. Lo escrito se conserva y el botón sale de la espera.
- **O-02:** "la tarea dentro de la lista de entregas…", "la tarea dentro de la entrega de un alumno…" y "la primera carga del hilo del maestro…" con «limite: Too big: expected number» muestran el genérico, sin el texto en inglés ni la ruta. Además, las recargas: "una recarga de … que responde «limite: Too big…» en todas sus consultas…" en el detalle del alumno (tarea, "Tu trabajo" e hilo), "Editar tarea", la lista de entregas y la entrega de un alumno (tarea, entrega e hilo). Ni la vista ni los avisos muestran el texto del servidor o la ruta, y todo aviso tiene texto visible.
- **O-03:** "…: «Descargar» con F1/F3/F4 da exactamente un aviso legible y el botón sale de la espera" por el camino real (`AdjuntosDePublicacion` → `useUrlDeDescarga(En)` → `alFallarLaDescarga`). Cubre los tres lugares: el adjunto de la tarea con la ruta de la clase, "Tu trabajo" con la de mi entrega y la entrega de un alumno con la del alumno. 9 casos en verde. Lo que sí rompe: T-01 y T-02.
- **O-04:** "con el genérico bajo el comentario del alumno, ir a «Trabajo de clase» y volver por el enlace de la tarea antes de 30 s…". Usa `rutas` de `app/router` y `Providers`. Se vuelve con el enlace «Ensayo final» de "Trabajo de clase" (`historyAction` `PUSH`, no "atrás") a los 10 s: el `ErrorDeCampo` ya no está y "Enviar comentario" manda un `POST` nuevo.
- **O-05:** `lib/errores-ch3-r1.ataque.test.ts` › "O-05: ninguna copia de la expresión de ruta escrita de otra forma…" (`/^[…]+:` con cualquier clase, `\w+:`, `\S+:`, `[^:]+:`, `.+?:`, con grupo o sin `\s*`, `new RegExp(`, `.split(":")`, `.indexOf(":")` y `quitarPrefijoDeCampo` en `features/tareas` y `components/adjuntos`). También "O-05: el mensaje del servidor solo se lee en las formas conocidas…": cada `.message` de producción en ese alcance es `incidencia.message`, `issues[0]?.message`, `.exec/.test(error.message)`, el `startsWith(prefijo)` de `errorQueReemplazaLaVista` o `textoVisibleOGenerico(error.message,`. Nada pinta ni avisa `x.message` crudo.
- **O-06:** "O-06: ni la prueba estática del chore ni las pruebas de ataque de esta ronda tienen un carácter invisible literal…" (en `lib/`) revisa `errores-de-api-estatico.test.ts`, los `*-ch3*.test.*` y mis `*-ch3-r1.ataque`. La de `features/tareas/errores-ch3-r1.ataque.test.ts` revisa a la de `lib/`, que Vite excluye de su propio `glob`. Busca 23 invisibles, más que los 11 de CH3-A24.
- **O-07:** `TEXTOS_CALIFICAR.avisoRecargaFallida` (`entrega-de-alumno-view.tsx:123` y `:128`) es texto fijo y no lee el mensaje del servidor. La regla O-05 confirma que ese archivo no lee `.message`, así que el remedio no aplica.
- **Dos fallos seguidos** (O-3 de la revisión del plan): "«Ver más alumnos» de la lista de entregas (Providers, retry: 1): dos fallos seguidos…" y lo mismo en el hilo del alumno y en el del maestro. Hay un aviso por fallo (2 en total, con 2 peticiones por fallo por `retry: 1`). El botón sigue disponible, fuera de la espera y con el foco tras cada fallo. Al tercer intento llegan las filas, sin un aviso de más (5 peticiones).
- **En vuelo a la vez:** "…: dos clics seguidos mandan una sola petición de la página siguiente y, si falla, un solo aviso", en los tres "Ver más", también con un tercer clic después de que React vuelve a pintar.
- **Con la vista desmontada:** "…: si la vista se desmonta con la página siguiente en vuelo, su fallo no avisa", en los tres "Ver más".
- **Anular y borrar por la interfaz:** "anular la entrega con F1/F3/F4…" y "borrar la tarea con F1/F3/F4…" dan un solo aviso, sin mensaje en línea ni `ErrorDeCampo`.
- **Contrato con entradas fuera de la tabla:**
  - rutas de 10 000 caracteres, solo de dígitos y con la marca combinante U+0301 (suelta y en «párametro»);
  - «párametro», 200 niveles, `0.0.…`, CJK, árabe, `puntajes.-1.puntos` y `ÁRBOL_Ñ-9.Ü`, con seis separadores (incluidos `:\n`, `: ` y `: 　 `);
  - mezclas de restos: ` ​\n`, U+2028, U+2029, U+00AD, U+180E, U+034F, LRM/RLM, U+FE0F, U+E0020, rellenos Hangul, U+FFA0, U+2062, U+0301, VT/FF, U+2800, U+1D159, U+3164 y 500 × U+200B;
  - una ruta de 100 000 caracteres, sin backtracking catastrófico;
  - ninguna salida de la acción ni de la consulta queda sin texto visible ni empieza con la ruta que traía.
- **Regresiones que las pruebas previas no fijaban:**
  - «Debe ser 0: 10» y «Nota: algo» se recortan una vez en cada camino de campo: título, fila de la rúbrica, enlaces, texto, puntaje, calificación y aviso de calificar.
  - En los 14 códigos con mensaje del servidor no se recorta nada («fecha: La entrega cerró», «a.b.0: c»), ni en la acción ni en la consulta. Con una mezcla invisible dan el genérico.
  - «...» es visible en todos los caminos.
  - `claseId`, `tareaId` y `alumnoId` con y sin texto, con restos invisibles y con «Too big…» dan su texto fijo y reemplazan la vista; «claseId.0:» ya no es el id.
  - Ninguna ruta de la tabla marca un campo de tareas ni de calificar.
  - `avisoDeFalloAlSubir` recorre la tabla entera y `ARCHIVO_INVALIDO` con mezclas da el texto fijo, o el genérico si el módulo no lo conoce. `ARCHIVO_INVALIDO` «tipo: …» no se recorta (es un código).
  - La corrida completa mantiene en verde CAL-T-119 a CAL-T-126, CAL-T-135 y las 204 `*.ataque` previas.
- **El formulario y el hook deciden igual:** lo revisé en el código en `formulario-tarea.tsx` frente a `useCrearTarea` y `useEditarTarea`, `formulario-de-entrega.tsx` frente a `useEntregar`, el hilo frente a `useComentarEnHilo` y el panel frente a `useCalificar` (el panel usa `rubrica` y el hook `cuerpo.puntajes`, que salen de `tarea.rubrica.map` en el mismo orden). Cada campo de `CAMPOS_DEL_FORMULARIO` tiene su `ErrorDeCampo` en la vista. Las pruebas de la tabla y de O-01 lo confirman: nunca hay dos mensajes ni ninguno.
- **`esErrorDeCursor` como referencia:** "esErrorDeCursor nunca se pasa como referencia (map, filter, some, every, find, flatMap, forEach, ni como callback) en código de producción", sobre todo `src/`. Además, "con una lista vacía no reconoce ninguno; con «cursor» repetido sigue igual; no confunde «cursorTareas» con «cursor»".
- **Estática por grep:** ningún `?? []` ni `disabled` en los 10 archivos de producción que cambiaron ni en la tabla. Por el diff contra `ad10844`, no hay textos nuevos fuera de `data.ts` (las vistas solo cambian la llamada y la importación).
- **V-01:** las 204 `*.ataque` de la tabla de la ronda 0 siguen idénticas (`diff` sin otra diferencia que las 4 nuevas).

### No atacado y por qué
- **Backend y PA-07:** 03a no toca el backend y no corrí su suite. Solo ejecuté `validarParametros` y los esquemas de `shared/` con `npx tsx` para reproducir T-01, sin base ni red. Un primer intento con `npx tsx -e` se quedó esperando; terminé esos tres procesos, que había arrancado yo (PID 17884, 21512 y 7604). No toqué el proceso ajeno (`host-daemon.mjs`, PID 18648).
- **Navegador, 360 px y la descarga real** (`window.location.assign`, la descarga doble en el camino feliz de T-02): no abro navegadores. No verificado.
- **Fuera de 03a:** `features/clases`, `calificaciones`, `admin` y `auth`. Anoté para 03b los hermanos de T-01 (los `…Id: …Id:` de `clases` y `tema: tema:`). En `clases` sigue `quitarPrefijoDeCampo`, que no recorta rutas con puntos, como ya declara el plan.
- **Excluido por las decisiones del plan:** los caminos de navegación de las consultas que reemplazan la vista (DH-2), el borde «14:30 …» (N-07), la ruta precedida por espacio o invisible, los códigos del servidor sin recorte y S-01.
- **Recarga de la lista de entregas con datos en caché:** hoy no avisa nada si falla. Ya era así antes de 03a y el plan no lo pide. Solo comprobé que no muestra el texto del servidor.

### Comandos de la verificación propia
Antes de cada corrida comprobé con `Get-CimInstance Win32_Process` que no hubiera ningún `vitest` en marcha. Una suite a la vez, desde `frontend/`. Las salidas están en el scratchpad de la sesión (`r1-lint.txt`, `r1-test.txt`).

| Comando | Salida | Última línea |
|---|---|---|
| `npx prettier --write <mis 4 archivos>` (solo mis archivos) | 0 | — |
| `npm run lint` | 0 | `> tsc -b` (antes: `All matched files use Prettier code style!`) |
| `npm run test` (03:43:21Z a 03:45:42Z) | 1 | `Test Files  3 failed \| 205 passed (208)` · `Tests  9 failed \| 3509 passed (3518)` · `Duration  137.91s`; `grep -c "Test timed out"` = 0. Los 9 rojos: 1 en `lib/errores-ch3-r1`, 1 en `tareas/errores-ch3-r1` y 7 en `tareas/formularios-ch3-r1` (T-01 × 6, T-02 × 3) |
| `npx vitest list <archivo>` de las 4 nuevas | 0 | 14 · 8 · 3 · 67 = 92 |

Hice una corrida completa previa (03:38:44Z a 03:41:05Z) con el mismo resultado (`208` archivos, `9 failed | 3509 passed`, sin tiempos límite). Entre las dos solo cambié la cota de tiempo de un caso de `lib/errores-ch3-r1` (1 s a 5 s), para que no dependa de la carga del equipo. Cifras frente al programador y al manager: 204 a 208 archivos (+4) y 3426 a 3518 casos (+92).

### Tabla de SHA-256 de las 208 `*.ataque` al cierre de la ronda 1 de CHORE-03 03a
Se reproduce con el comando de V-01 (hash en mayúsculas aquí; compárese sin distinguir mayúsculas). Las 204 previas son idénticas a la tabla de la ronda 0; las 4 nuevas van marcadas "Nueva (CHORE-03 03a, r1)".

| SHA-256 | Archivo | Nota |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `5E02A27716D63E8CE0FE6B6171BFF089EB3EE2548260349B16950D7E65A1BCF9` | `backend/test/calificaciones-01a-r1.ataque.test.ts` |  |
| `AFB531E7CCAB1CB53F0322D7D099A7F435DBD42325DE8C225525E3784B93F6CC` | `backend/test/calificaciones-01a-r2.ataque.test.ts` |  |
| `DD919EBD74A2C6AC60C244A1563B46895821B0D25E5051CDA25FFFB72B653416` | `backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` |  |
| `B09BAAEC53455CEA1A0674890EBD9353007E6F2628001446E873B09279FFBA07` | `backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` |  |
| `29EED2E93AF2775A4605160EA533BD462FD03CB1CFE4C47154898358A7255869` | `backend/test/calificaciones-estatico-01b-r1.ataque.test.ts` |  |
| `6E4C0EB47FF8020B0A539E5B70B24C8C1D05F7773EA092CD513E39C68CF4534E` | `backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts` |  |
| `6E3C92C13F146A01C8DCFDC7DD04BEA59F0E2562051F6AC65F95F924EF73E4DB` | `backend/test/categorias-01a-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `47B02C6D3916713BF9236A619FDB59A641D2E805F1F0B7E9B2C161FE719DDC3A` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `E4E9365EA010F3F670B6C1194D1A592E95DB43BFF0496D4EA1646FC5225CA8B4` | `backend/test/gradebook-01b-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `2684916C88B9405706F82DA3F9B2FFD0B3626A11AF79E20EA146FDFD1D52C319` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `3790777831A1FACB053D0719D85AB404593954416B1443A1A59530E09E2C81DC` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `BC6D49F9FC1F5EB20E305945FEF57CAEEBEB108BFF5D5CF4BA10B8040687D69C` | `backend/test/mis-calificaciones-01b-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `CCEA34C962FC8F14A49C64EAFA8119DAE5030E1302ED94FE369299EC49182BB8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `C67FA558FA7AE23821175478C8CB7D4874EE5F4D6CB84D0851F9A551B8AB455B` | `frontend/src/app/rutas-01d-r1.ataque.test.tsx` |  |
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `11C6D9C55BE91AA41E8525345E3795E34B8E1E661FF7CDD901F729760A033CFD` | `frontend/src/components/adjuntos/errores-ch3-r1.ataque.test.ts` | Nueva (CHORE-03 03a, r1) |
| `48F5FF8FEF35FAA6D8500FAE4A53CA953D7F661100A5C4879BA58E68972AB2DE` | `frontend/src/components/foco/foco-01d-r1.ataque.test.ts` |  |
| `36A104515F2EA87F143B2CFC00AEF9A33E6DDDB666844C1A9C977557EECA20EF` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `F0CBA6F9B6C4CF1D74ED52AD89943088661370F5A784502F851CD6230912F606` | `frontend/src/features/calificaciones/estatico-01d-r1.ataque.test.ts` |  |
| `5991D8E3D4E694973309F178E5341A2285584CF9ED6006FBB658D7F5A61DE5DD` | `frontend/src/features/calificaciones/gradebook-01d-r1.ataque.test.tsx` |  |
| `C744FB831FA9992C2A9ED0729F9EC3CC089F3167CA19133C6EEE0133382607A1` | `frontend/src/features/calificaciones/gradebook-01d-r2.ataque.test.tsx` |  |
| `8DEA1C2ADC5D228E166CE6037A1A1A827D26E2BDC6D7C8534F146517EBC1AC44` | `frontend/src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx` |  |
| `6F7496CA7652E7B4441A7EB9822E74270D50127AC40BA27B86C83EDFCD5CC3FA` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r1.ataque.test.tsx` |  |
| `24751F358FC5ECD485C475E7025DD881B87FE892F025459A6FF29F615FC5CC66` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r2.ataque.test.tsx` |  |
| `C504D0AD3690781275A6FFB78638A6148550B2FD4EE1ED25A4B154054FC4F80D` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r3.ataque.test.tsx` |  |
| `A8790F734402A957534D0F0E660EEF342F9029CDFC1991BE421D9B3E3C3E9CB7` | `frontend/src/features/calificaciones/secciones-01d-r3.ataque.test.tsx` |  |
| `FB33F2A27BFCCA906549A12610977478BA72E6E7ED8AFD5C5A0A962DEB3EB802` | `frontend/src/features/calificaciones/secciones-01d-r4.ataque.test.tsx` |  |
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `A3880B67FFAA0D15763D1C761CEF1FF8472029C77BFB2211AB079EADB1685325` | `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` |  |
| `66C0B873BC8B9D8E9E01AC871BD6AAAB4328508BEB5EC9371D69463D7C12430D` | `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` |  |
| `5272DE876597EAD9EF838E4D022185C80AA411AAD9E67325573C87F954C5F7A6` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `827B8ABCA664145D51A1BBD1C0B558B0EDDFED8707A21A774222B4972BE14FF2` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `85A7926A0F6831A8375F544CF38FE5585A8E2DCBF73D9726E9A3CFAAB7F76511` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` | Reescrita (CHORE-03 03a, C-1) |
| `4303EAC77B98E8978495D9E68FD7725AC436F9DB757DBC0C02C59051436908FA` | `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` |  |
| `A4AA15CEF1A377EED688DAB1B92E5CA4A3943490144CEC861CF7B482845B0362` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` |  |
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `2EF258E946084F17E33936E8FA257551A90323B589859DD2E1F70AABEAF711BF` | `frontend/src/features/tareas/aviso-calificar-01c-r3.ataque.test.tsx` |  |
| `E2FEFD7D744F77C7BDD2BA73A08CC51076D0F6130BF4D0A225E0E972A1DCE111` | `frontend/src/features/tareas/avisos-01c-r2.ataque.test.tsx` |  |
| `11BB5433FB30F268B6D93E1E7814D826BBAB8FB1F173E574FAF52F5A96B5A41E` | `frontend/src/features/tareas/calificar-01c-r1.ataque.test.tsx` |  |
| `D8DACCB56C8DE8D9F1B0F8D1B0907C110E327F4F55B016FC0FE7FC0F25CCC79C` | `frontend/src/features/tareas/calificar-vacio-01c-r4.ataque.test.tsx` |  |
| `EF86C46708F0682BCA5A023E85794639C396EC94D207CAC23CEB13585AB39E75` | `frontend/src/features/tareas/campos-01c-r2.ataque.test.tsx` |  |
| `5FF367EDBA10C9BA9C7E50F8ED874032654FA2ABDC0DD8F4A122A000355472AB` | `frontend/src/features/tareas/cruces-01c-r3.ataque.test.tsx` |  |
| `0963F14F4842D6D57288876C932496AC09D44B872FC049492EE6E8BA539F3235` | `frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx` |  |
| `4F486CA37D2A2BB6CC26754281D2ADCE086A9D8D4485A069DE7AE5D54E360ACF` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `93A5A0A648669E9C96494A62B2B16082B07296F279E2892BF2C8D47834EE2FC1` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` |  |
| `432DCDDF119DD0E32E49ADC42D5F51D197698C8896E1058C505AB31F4A8EE838` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` |  |
| `172BE3EFD919C0D3948ECA17C7E808968E2370AFE1F9C2A28CEF7D2DED584B81` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` |  |
| `496652BC59817166F53E00CB828F2119C857C2834063A31764D7876DC150C930` | `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` |  |
| `4E6950F0FE571D6AE41A78380C59C20459FDF19F34C57E9777E4E34A6BC61C58` | `frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts` | Nueva (CHORE-03 03a, r1) |
| `F614E7369F8C47C40A87AD1F8867FB8EDF7EBC76E94D0BA6C5C59C92CB6347F0` | `frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts` |  |
| `FB387ECBB7E5272D2FFB53D626B51FFD9C57B409D10C560E6A5ECBFA6A2A8C19` | `frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx` |  |
| `E662437641E2634539E09C674A84D353477E3BD05E31A1C11DC96ADC8B863B18` | `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx` | Nueva (CHORE-03 03a, r1) |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `72B19B6A00B4ADE43B06829BB5BEF1A5CDECF5A7D2AF57369F1E857A1D4A17F5` | `frontend/src/lib/errores-ch3-r1.ataque.test.ts` | Nueva (CHORE-03 03a, r1) |
| `60BC1FC7011E9A0FE5A4C4AA45420F2C7D38ADB9EE2F8D235D09847DBE13AC3A` | `frontend/src/lib/format-01c-r1.ataque.test.ts` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `FC4963D3FD93297C427EAD0B85B23615C287E4F2C48079BCA8031D1C2AEE0396` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## Ronda 2 — 03a
Veredicto: **RESISTE**
Verificación propia: lint frontend `0` (`> tsc -b`; antes: `All matched files use Prettier code style!`) · test frontend `Test Files  213 passed (213)` · `Tests  3757 passed (3757)` · `Test timed out` = 0.

Rama `chore/chore-03-errores-api`, base `ad10844`, plan `plan.md` SHA-256 `ee08bf2a186e41abdd764f04c340576d954f8eb5e4dedfa769eb23ea127aad14` (Enmiendas 2 y 3). Ataco la corrección de T-01 (`quitarRutaDelMensaje` con `CAMPO_QUE_REPITE_EL_ESQUEMA`, `CON_CAMPO_REPETIDO`) y de T-02 (la guarda con ref de `VistaDeFicha`, DH-6), más los puntos de ataque de la Enmienda 2 que la ronda 1 no cubría. Leí el código corregido (`lib/errores-de-api.ts`, `lib/errores-de-api-fuera-de-contrato.ts`, `components/adjuntos/adjuntos-de-publicacion.tsx`, el envoltorio de `features/clases`, `elemento-de-trabajo.tsx`, `useAvisoDeRecargaFallida` de `tareas/hooks.ts`) y las pruebas nuevas del programador (CH3-A25 y CH3-A26), no solo su resumen.

Archivos que toqué: las cuatro `*.ataque` nuevas de abajo y este reporte (añadido al final). Ningún archivo de producción, ninguna prueba del programador y ninguna `*.ataque` previa (V-01 abajo). La mutación de confirmación no tocó el disco (ver "Mutación de confirmación").

Pruebas de ataque nuevas (`npx vitest list <archivo> | grep -c " > "`, 207 casos):

| Archivo | Casos |
|---|---|
| `frontend/src/lib/errores-ch3-r2.ataque.test.ts` | 84 |
| `frontend/src/features/tareas/errores-ch3-r2.ataque.test.ts` | 99 |
| `frontend/src/features/tareas/descarga-ch3-r2.ataque.test.tsx` | 15 |
| `frontend/src/features/clases/descarga-ch3-r2.ataque.test.tsx` | 9 |

### Regresiones
- **V-01 al inicio:** el comando de V-01 contra las filas de "Tabla de SHA-256 de las 208 `*.ataque` al cierre de la ronda 1 de CHORE-03 03a", en minúsculas: base 208, actual 208, `diff` vacío, `IGUALES`.
- **Mis 4 `*.ataque` de la ronda 1:** `npx vitest run` sobre las cuatro → `Test Files  4 passed (4)` · `Tests  92 passed (92)`. Las 6 de T-01 y las 3 de T-02 pasan sin cambio.
- **Suite completa:** de 209 a 213 archivos (+4, los míos) y de 3550 a 3757 casos (+207, los míos). Ningún rojo, ningún tiempo límite. No hay regresión en las 208 `*.ataque` previas ni en las pruebas del programador.

### Hallazgos
Ninguno.

### Atacado sin hallazgos

#### T-01 — la regla nueva, función por función
Archivo: `lib/errores-ch3-r2.ataque.test.ts`. Es un `it.each` sobre 33 bordes, cada uno con su motivo en el título. Corre dos casos por borde:
- "«$entrada» → «$resto» ($porque)", con `quitarRutaDelMensaje`;
- "«$entrada» en una acción da el resto o el genérico, y en una consulta el respaldo", con `mensajeDeErrorDeApi` y `mensajeDeErrorDeConsulta`.

Lo que comprueba:
- **Tres prefijos o más:**
  - `a: b: c: d` → `c: d`, y sin espacios, `a:b:c:d` → `c:d`;
  - un solo carácter: `a: b: c` → `c`;
  - el campo repetido tres veces: `archivoId: archivoId: archivoId: x` → `archivoId: x`. Es la decisión de "máximo dos prefijos".
- **Un mensaje ya recortado no pierde nada más:** `debe ser un identificador válido` queda intacto, y `archivoId: debe ser…` → `debe ser…`, porque «debe» no va pegado a dos puntos.
- **Rutas con índice y el campo detrás** dan `x`: `temaIds.0: temaId: x`, `temaIds.0:temaId:x`, con tabuladores, con saltos de línea, y `categorias.12.id: categoriaId: x`.
- **Lo que se conserva tras la ruta:**
  - mayúscula inicial (`Nota: algo`);
  - dígitos (`14:30 y`, `9abc: c`);
  - guion bajo (`campo_raro: y`), guion (`a-b: c`) y puntos (`a.b: c`);
  - minúscula fuera de ASCII (`ñame: c`);
  - espacio antes de los dos puntos (`archivoId : y`);
  - un invisible antes del segundo prefijo (decisión del plan).
- **Lo que se quita:**
  - dos espacios, o tabulador y espacio, antes del segundo prefijo;
  - `aB9:`;
  - uno solo de dos nombres pegados (`archivoId:archivoId: y` → `archivoId: y`);
  - el respaldo `parámetro:` de `validarParametros`.
- **Restos vacíos o invisibles tras el nombre** (`x: archivoId:`, `x: archivoId:\u{200B}`, `x:`) dan el genérico en la acción. `""`, `":"` y un mensaje que empieza con espacio quedan intactos.
- **`x: ejemplo: algo` → `algo`:** es la decisión de la Enmienda 2 ("perdería esa palabra; hoy no se alcanza"), no un hallazgo. Lo confirmo abajo contra las fuentes reales.

#### T-01 — el camino real, los códigos y las consultas
- **Un solo recorte en el camino real:** "la regla no se aplica dos veces en el camino de una acción…".
  - El resto de `archivoId: archivoId: …`, pasado otra vez por `mensajeDeErrorTareas`, no cambia, y `mensajeDelAvisoDeCalificar` da lo mismo.
  - Por grep, `quitarRutaDelMensaje` solo se llama en `lib/errores-de-api.ts:103`, y ningún archivo de producción crea un `ApiError` con un mensaje ya traducido.
- **Los códigos con mensaje del servidor no se recortan (CAL-T-123):** "$codigo con un mensaje que parece una ruta doble no se recorta…".
  - Hay un caso por cada uno de los 14 `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` de `tareas`.
  - Cada uno prueba `archivoId: archivoId: x`, `a: b: c: d`, `temaIds.0: temaId: x` y `x: ejemplo: algo`, en la acción y en la consulta.
- **Las consultas dan el respaldo:** "en features/tareas, toda ruta doble del inventario de §D-1 da el genérico en una consulta y, salvo los ids con texto fijo, un aviso sin ruta en una acción".
  - Recorre las 14 formas del inventario.
  - Incluye las de 03b y la `id: id:` de 03c: `tareas` no las alcanza, pero el contrato sí las resuelve.

#### T-01 — el supuesto de la regla, contra las fuentes reales
El manager lo afirmó por grep; ahora lo amarra una prueba con `import.meta.glob` sobre el texto crudo, sin contar los comentarios.
- **"en shared/src, todo mensaje que empieza con «palabra:» es un nombre del inventario, y lo que lo sigue no es otro nombre".**
  - `shared/src` tiene 20 literales con prefijo. Son `archivoId`, `maestroId`, `claseId`, `alumnoId`, `temaId`, `publicacionId`, `comentarioId`, `categoriaId`, `tareaId`, `confirmar` y `tema`, más la plantilla `${campo}` de `idDeRuta` (`entregas.ts:136`, que se llama con `tareaId`, `alumnoId` y `archivoId`).
  - Ninguno sigue con otro nombre.
- **"en el backend (core, handlers, middleware, adapters), ningún mensaje con prefijo sigue con un nombre en camelCase pegado a dos puntos…".** Los mensajes con prefijo son:
  - `cuerpo: debe ser…`;
  - `claseId: debe ser…` (`middleware/pertenencia.ts:32`);
  - los cinco `cursor: no es válido` de `adapters/db`;
  - `${campo}: no es válido` (`adapters/db/calificaciones.ts:82`);
  - `calificacion: Escribe…` y `puntajes.N.puntos: Escribe…` (`core/calificaciones/calificar.ts`);
  - los cinco `categorias: <Mayúscula>…` (`core/tareas/categorias.ts`);
  - `id: debe ser…` (`handlers/admin.ts:60`).

  El único `VALIDACION` sin prefijo es "Los datos enviados…" (`adapters/db/errores.ts:54`). Los mensajes por defecto de zod empiezan con mayúscula ("Invalid input…", "Too big…", "Unrecognized key…").
- **Conclusión:** hoy ningún `VALIDACION` real lleva un tercer prefijo, ni, tras su ruta, una palabra en minúscula pegada a dos puntos que no sea un nombre de campo. La regla no se come texto legítimo. Si un esquema futuro rompe la convención (R-08), estas dos pruebas lo detectan.

#### T-01 — cada camino de `tareas`
Archivo: `features/tareas/errores-ch3-r2.ataque.test.ts` (punto de ataque de la Enmienda 2). Es un `it.each` sobre 11 caminos:

| Función | Caminos |
|---|---|
| `erroresDeLaTareaDeApi` | el título y una fila de la rúbrica |
| `errorDeEnlacesDeApi` | `enlaces.0` y `enlaces` |
| `errorDeTextoDeApi` | `texto` |
| `erroresDeCalificacionDeApi` | `comentario`, `puntajes.1.puntos` y `calificacion` |
| `mensajeDelCampoDeCalificacion` | `puntajes.7.puntos` |
| `mensajeDelAvisoDeCalificar` | `version` y `archivoIds.0.id` |

Casos:
- "…con el separador $separador da el mensaje, sin ruta ni nombre".
  - Seis separadores a los dos lados del nombre: `": "`, `":"`, `":\t"`, `":\n"`, `":  "` y `": \t"`.
  - Cada camino da `Revisa este valor.` en su campo o en su aviso, y el campo del panel sigue siendo el del primer prefijo.
- "…con un resto sin texto visible da el genérico, nunca un texto vacío", con cinco restos: vacío, U+200B, NBSP + U+200B + salto, U+0085 y U+3000.
- "…un tercer prefijo no se quita…": queda `b: Revisa este valor.`
- "…lo que sigue a la ruta y empieza con mayúscula, dígito o comillas no se toca".

#### T-02 — la guarda de `VistaDeFicha`, por la interfaz, en los cinco sitios que usan la ficha (O-10 del manager)
**`features/tareas/descarga-ch3-r2.ataque.test.tsx`.** Es un `it.each` sobre los tres sitios de `tareas`: el adjunto de la tarea en el detalle, "Tu trabajo" y la entrega de un alumno. Recorre el camino real hasta `alFallarLaDescarga`.
- "…dos fallos seguidos dan un aviso cada uno, el botón queda disponible entre ambos y un tercer intento bueno descarga sin aviso de más".
  - Salen 3 peticiones y 2 avisos, y `location.assign` se llama una vez, con la URL.
  - El foco queda en el botón tras cada fallo, y no hay nada en la consola.
- "…tres clics (dos en el mismo instante y uno después de que React vuelve a pintar) mandan una sola petición y navegan una vez; después del éxito, un clic nuevo vuelve a pedir".
  - El tercer clic llega con `aria-busy="true"` y no pide nada.
  - Tras el éxito, la guarda se libera.
- Con la vista desmontada:
  - "…con la vista desmontada y la petición en vuelo, el fallo da a lo sumo el aviso de siempre (el del gancho, como en la base) y nada en la consola";
  - "…si sale bien navega una sola vez, sin aviso, sin otra petición y sin nada en la consola".

  No hay advertencias de `act` ni de estado tras desmontar: `console.error` está espiado y no recibe llamadas.
- "…desmontar y volver a montar con la petición en vuelo: la ficha nueva pide una sola vez por clic doble, y cada fallo da un solo aviso legible" (ver O-r2-1).

**`features/clases/descarga-ch3-r2.ataque.test.tsx`.** Es un `it.each` sobre dos sitios: el muro (`MuroView` real) y un material de "Trabajo de clase" (`ElementoDeTrabajo`, que monta la ficha al pulsar "Ver material").
- Casos:
  - dos clics seguidos que fallan dan una petición y un aviso;
  - dos fallos seguidos, con un tercer intento bueno;
  - tres clics, uno de ellos después de que React vuelve a pintar, y un clic nuevo tras el éxito;
  - la vista desmontada con la petición en vuelo;
  - además, "un material de «Trabajo de clase»: ocultarlo y volver a abrirlo con la petición en vuelo…" (ver O-r2-1).
- `features/clases` no cambió: los dos sitios heredan la guarda de `components/adjuntos`.
- El aviso del muro usa F1 (`campoFueraDeContrato: Revisa este valor.`), que `mensajeDeErrorClases` ya traduce. Con F4 o con `archivoId: archivoId: …`, el muro todavía enseñaría la ruta (O-r2-4, de 03b).

#### Mutación de confirmación (la pidió el orquestador; O-10 del manager)
No toqué el disco. Usé una configuración temporal de Vitest en el scratchpad de la sesión (`vitest.mutante.config.mts`) con un plugin de Vite. El plugin aplica una de dos mutaciones, y solo al transformar `src/components/adjuntos/adjuntos-de-publicacion.tsx`; con `SIN_MUTANTE=1` no cambia nada y sirve de control.

Lo corrí sobre tres grupos, filtrados con `-t "dos clics|CH3-A26|guarda de «Descargar»"`:
- CH3-A26 (8 casos);
- mis 24 casos de T-02 de esta ronda;
- los 6 casos de "dos clics" de `formularios-ch3-r1.ataque.test.tsx`: las 3 rojas de T-02 de la ronda 1 y 3 de los "Ver más", que no dependen de la ficha.

| Configuración | Resultado | Lectura |
|---|---|---|
| Control (`SIN_MUTANTE=1`) | `Tests  38 passed \| 61 skipped (99)`, `[mutante] archivos transformados: 0` | La configuración temporal no cambia ningún resultado |
| Guarda anulada (`if (descargandoRef.current) return` → comentario) | `Tests  27 failed \| 11 passed \| 61 skipped (99)`, `archivos transformados: 1` | Fallan las **8 de CH3-A26**, las 3 de T-02 de la ronda 1 y mis 16 casos con doble clic. Solo pasan los de un clic por vez (5 de dos fallos seguidos y 3 de la vista desmontada con fallo en `tareas`) y los 3 "Ver más", que no la miden |
| Guarda que nunca se libera (asignación del `finally` anulada) | `Tests  14 failed \| 24 passed \| 61 skipped (99)`, `archivos transformados: 1` | Fallan las 4 de CH3-A26 (b, "repetir el control"), mis 5 de "dos fallos seguidos" y mis 5 de "un clic nuevo tras el éxito" |

- **El archivo no cambió:** el SHA-256 de `adjuntos-de-publicacion.tsx` fue `06699e3640dd2faea7e5f17064715ad51f6900b8905b839058f375a58c30f1fa` antes y después, el mismo que cita el programador.
- **Sobre la duda de O-10:** con la guarda anulada, CH3-A26 cae en su `waitFor(() => expect(enVuelo).toHaveLength(1))`. Los dos `fireEvent.click` ya dejaron dos peticiones en vuelo antes del primer chequeo. Las aserciones posteriores sobre `pedidas` lo detectarían igual.

#### Otros puntos atacados
- **Controles hermanos con ref en 03a:** repetí el grep del resumen (`Ref.current) return` y `enEspera=` en `features/tareas` y `components/adjuntos`).
  - Salen los mismos 9 controles con su ref, más «Descargar», y ninguno perdió su ref.
  - `grep -c "enEspera="` en `adjuntos-de-publicacion.tsx` da 1.
- **Decisiones que no son hallazgo:** las comprobé y las respeté:
  - S-01 y S-04;
  - S-05 con N-07: `14:30 …` sin ruta pierde `14:`, pero no se alcanza;
  - CAL-T-123 y DH-2;
  - de la Enmienda 2, "máximo dos prefijos" y "una palabra en minúscula pegada a dos puntos se pierde";
  - la ruta precedida de un espacio o de un invisible.
- **"Lista para CHORE-04" (Enmienda 3):** no ataqué sus 23 controles con pruebas rojas. En lo que recorrí no vi ningún otro control sin ref fuera de la lista.

### No atacado y por qué
- **Backend y PA-07:** 03a no toca el backend y no corrí su suite. El supuesto de la regla lo comprobé leyendo el texto de `shared/src` y de `backend/src` desde una prueba del frontend, sin ejecutar nada del backend.
- **Navegador, 360 px y la descarga real** (`window.location.assign` y la disposición `attachment`): no abro navegadores, así que no está verificado. En jsdom, `assign` es un doble.
- **Teclado** (Enter o Espacio sobre «Descargar»): jsdom no convierte la tecla en `click`, así que no lo verifiqué con una prueba. El manejador es el mismo `onClick` y la guarda le aplica igual.
- **03b y 03c:** `mensajeDeErrorClases` sigue con `quitarPrefijoDeCampo` (O-r2-4), y la Enmienda 3 deja fuera los controles de la "Lista para CHORE-04".

### Observaciones (sin prueba roja)
- **O-r2-1 — La guarda es por ficha montada.** `descargandoRef` vive en cada `VistaDeFicha` (§D-4, forma exacta). Por eso, una ficha que se desmonta y se vuelve a montar con la descarga en vuelo nace sin guarda y con `isPending` en falso.
  - Cómo se llega por la interfaz:
    - en un material de "Trabajo de clase", pulsando "Ocultar material" y luego "Ver material" con la petición en vuelo;
    - en `tareas`, saliendo de la vista y volviendo antes de que responda.
  - Un clic doble en la ficha nueva pide una sola vez más, no dos, y cada fallo da un solo aviso legible.
  - Son dos acciones separadas de la persona, no un doble clic, así que no lo cuento como hallazgo. Que el manager decida si va a CHORE-04.
- **O-r2-2 — Con la vista desmontada, todo pasa como en la base.**
  - Si la petición falla después de desmontar, sale el aviso de siempre:
    - en `tareas` lo da el callback de `useAvisoDeRecargaFallida`, que no tiene guarda de montaje;
    - en el muro y en el material lo da el `toast` de `descargar`.
  - Si sale bien, `location.assign` navega una vez.
  - `descargar` no cambió en el diff, así que es el comportamiento de `ad10844` y sigue la regla de los ganchos: "los avisos corren aunque la vista ya no esté montada".
  - El plan lo acepta ("como hoy"). El encargo del orquestador pedía "sin aviso", pero manda el plan. Lo anoto para que el manager lo vea.
- **O-r2-3 — Un quinto sitio usa la ficha:** el material de "Trabajo de clase" (`features/clases/components/elemento-de-trabajo.tsx:55`). No está en la lista de §D-4 ni en la matriz §D-6 del resumen. Hereda la guarda y lo cubren mis pruebas; solo falta en el inventario.
- **O-r2-4 (para 03b) — En el muro todavía sale la ruta.** `quitarPrefijoDeCampo` no reconoce rutas con puntos y quita un solo prefijo, así que `mensajeDeErrorClases` muestra:
  - con F4 (`archivoIds.0.id: …`): `archivoIds.0.id: Revisa este valor.`;
  - con `archivoId: archivoId: …` (un id de la ruta manipulado): `archivoId: debe ser un identificador válido`.

  Es la migración de 03b (CH3-B01 y CH3-B08), no un hallazgo de 03a.
- **O-11 del manager:** lo confirmo en el código. `alPulsar` no tiene `catch`: si `toast.error` o `alFallarLaDescarga` lanzaran, quedaría una promesa rechazada sin manejar. Pasaba lo mismo con el `void descargar(...)` de la base, así que no es regresión.

### Comandos de la verificación propia
- Antes de cada corrida comprobé con `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` que no hubiera ningún `vitest` en marcha.
- Corrí una suite a la vez, desde `frontend/`, y no arranqué ningún proceso de larga vida.
- Las salidas están en el scratchpad de la sesión: `r2-lint.txt`, `r2-test.txt`, `r2-regresiones-r1.txt`, `r2-mutante-guarda.txt`, `r2-mutante-liberacion.txt` y `r2-mutante-control.txt`.

| Comando | Salida | Última línea |
|---|---|---|
| V-01 al inicio (comando de la ronda 0, base: tabla de la ronda 1) | 0 | base 208, actual 208, `IGUALES` |
| `npx vitest run` de mis 4 `*.ataque` de la ronda 1 | 0 | `Test Files  4 passed (4)` · `Tests  92 passed (92)` |
| `npx prettier --write <mis 4 archivos nuevos>` (solo mis archivos) | 0 | — |
| `npm run lint` | 0 | `> tsc -b` (antes: `All matched files use Prettier code style!`) |
| `npm run test` (05:18:26Z a 05:21:00Z) | 0 | `Test Files  213 passed (213)` · `Tests  3757 passed (3757)` · `Duration  150.92s`; `grep -c "Test timed out"` = 0 |
| `npx vitest list <archivo> \| grep -c " > "` de las 4 nuevas | 0 | 84 · 99 · 15 · 9 = 207 |
| `npx vitest run --config <scratchpad>/vitest.mutante.config.mts <4 archivos> -t "dos clics\|CH3-A26\|guarda de «Descargar»"`, con `SIN_MUTANTE=1`, sin variables y con `MUTANTE=liberacion` | 0 · 1 · 1 | `38 passed` · `27 failed \| 11 passed` · `14 failed \| 24 passed` (61 omitidos por el filtro en las tres) |
| `sha256sum src/components/adjuntos/adjuntos-de-publicacion.tsx`, antes y después | 0 | `06699e36…30f1fa` las dos veces |
| V-01 al cierre | 0 | 212 archivos: las 208 de la ronda 1 idénticas (`diff` sin otra diferencia que las 4 nuevas) |

Cifras frente al programador y al manager: de 209 a 213 archivos (+4) y de 3550 a 3757 casos (+207 = 84 + 99 + 15 + 9).

### Tabla de SHA-256 de las 212 `*.ataque` al cierre de la ronda 2 de CHORE-03 03a
Se reproduce con el comando de V-01. Los hash van en mayúsculas, así que compárense sin distinguir mayúsculas. Las 208 previas son idénticas a las de la tabla de la ronda 1; las 4 nuevas van marcadas "Nueva (CHORE-03 03a, r2)".

| SHA-256 | Archivo | Nota |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `5E02A27716D63E8CE0FE6B6171BFF089EB3EE2548260349B16950D7E65A1BCF9` | `backend/test/calificaciones-01a-r1.ataque.test.ts` |  |
| `AFB531E7CCAB1CB53F0322D7D099A7F435DBD42325DE8C225525E3784B93F6CC` | `backend/test/calificaciones-01a-r2.ataque.test.ts` |  |
| `DD919EBD74A2C6AC60C244A1563B46895821B0D25E5051CDA25FFFB72B653416` | `backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` |  |
| `B09BAAEC53455CEA1A0674890EBD9353007E6F2628001446E873B09279FFBA07` | `backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` |  |
| `29EED2E93AF2775A4605160EA533BD462FD03CB1CFE4C47154898358A7255869` | `backend/test/calificaciones-estatico-01b-r1.ataque.test.ts` |  |
| `6E4C0EB47FF8020B0A539E5B70B24C8C1D05F7773EA092CD513E39C68CF4534E` | `backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts` |  |
| `6E3C92C13F146A01C8DCFDC7DD04BEA59F0E2562051F6AC65F95F924EF73E4DB` | `backend/test/categorias-01a-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `47B02C6D3916713BF9236A619FDB59A641D2E805F1F0B7E9B2C161FE719DDC3A` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `E4E9365EA010F3F670B6C1194D1A592E95DB43BFF0496D4EA1646FC5225CA8B4` | `backend/test/gradebook-01b-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `2684916C88B9405706F82DA3F9B2FFD0B3626A11AF79E20EA146FDFD1D52C319` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `3790777831A1FACB053D0719D85AB404593954416B1443A1A59530E09E2C81DC` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `BC6D49F9FC1F5EB20E305945FEF57CAEEBEB108BFF5D5CF4BA10B8040687D69C` | `backend/test/mis-calificaciones-01b-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `CCEA34C962FC8F14A49C64EAFA8119DAE5030E1302ED94FE369299EC49182BB8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `C67FA558FA7AE23821175478C8CB7D4874EE5F4D6CB84D0851F9A551B8AB455B` | `frontend/src/app/rutas-01d-r1.ataque.test.tsx` |  |
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `11C6D9C55BE91AA41E8525345E3795E34B8E1E661FF7CDD901F729760A033CFD` | `frontend/src/components/adjuntos/errores-ch3-r1.ataque.test.ts` | Nueva (CHORE-03 03a, r1) |
| `48F5FF8FEF35FAA6D8500FAE4A53CA953D7F661100A5C4879BA58E68972AB2DE` | `frontend/src/components/foco/foco-01d-r1.ataque.test.ts` |  |
| `36A104515F2EA87F143B2CFC00AEF9A33E6DDDB666844C1A9C977557EECA20EF` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `F0CBA6F9B6C4CF1D74ED52AD89943088661370F5A784502F851CD6230912F606` | `frontend/src/features/calificaciones/estatico-01d-r1.ataque.test.ts` |  |
| `5991D8E3D4E694973309F178E5341A2285584CF9ED6006FBB658D7F5A61DE5DD` | `frontend/src/features/calificaciones/gradebook-01d-r1.ataque.test.tsx` |  |
| `C744FB831FA9992C2A9ED0729F9EC3CC089F3167CA19133C6EEE0133382607A1` | `frontend/src/features/calificaciones/gradebook-01d-r2.ataque.test.tsx` |  |
| `8DEA1C2ADC5D228E166CE6037A1A1A827D26E2BDC6D7C8534F146517EBC1AC44` | `frontend/src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx` |  |
| `6F7496CA7652E7B4441A7EB9822E74270D50127AC40BA27B86C83EDFCD5CC3FA` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r1.ataque.test.tsx` |  |
| `24751F358FC5ECD485C475E7025DD881B87FE892F025459A6FF29F615FC5CC66` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r2.ataque.test.tsx` |  |
| `C504D0AD3690781275A6FFB78638A6148550B2FD4EE1ED25A4B154054FC4F80D` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r3.ataque.test.tsx` |  |
| `A8790F734402A957534D0F0E660EEF342F9029CDFC1991BE421D9B3E3C3E9CB7` | `frontend/src/features/calificaciones/secciones-01d-r3.ataque.test.tsx` |  |
| `FB33F2A27BFCCA906549A12610977478BA72E6E7ED8AFD5C5A0A962DEB3EB802` | `frontend/src/features/calificaciones/secciones-01d-r4.ataque.test.tsx` |  |
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `A3880B67FFAA0D15763D1C761CEF1FF8472029C77BFB2211AB079EADB1685325` | `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` |  |
| `66C0B873BC8B9D8E9E01AC871BD6AAAB4328508BEB5EC9371D69463D7C12430D` | `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` |  |
| `5272DE876597EAD9EF838E4D022185C80AA411AAD9E67325573C87F954C5F7A6` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `DCE7FD019A6E32B8E4DF37DD0728E265F5E9449E9EE2723F372EA174FE312464` | `frontend/src/features/clases/descarga-ch3-r2.ataque.test.tsx` | Nueva (CHORE-03 03a, r2) |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `827B8ABCA664145D51A1BBD1C0B558B0EDDFED8707A21A774222B4972BE14FF2` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `1AC0F4A0474E7F334BC57D4F2BA23954E8C280FA0C3573A26350D0ADE431FF75` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` |  |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `85A7926A0F6831A8375F544CF38FE5585A8E2DCBF73D9726E9A3CFAAB7F76511` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` | Reescrita (CHORE-03 03a, C-1) |
| `4303EAC77B98E8978495D9E68FD7725AC436F9DB757DBC0C02C59051436908FA` | `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` |  |
| `A4AA15CEF1A377EED688DAB1B92E5CA4A3943490144CEC861CF7B482845B0362` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` |  |
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `2EF258E946084F17E33936E8FA257551A90323B589859DD2E1F70AABEAF711BF` | `frontend/src/features/tareas/aviso-calificar-01c-r3.ataque.test.tsx` |  |
| `E2FEFD7D744F77C7BDD2BA73A08CC51076D0F6130BF4D0A225E0E972A1DCE111` | `frontend/src/features/tareas/avisos-01c-r2.ataque.test.tsx` |  |
| `11BB5433FB30F268B6D93E1E7814D826BBAB8FB1F173E574FAF52F5A96B5A41E` | `frontend/src/features/tareas/calificar-01c-r1.ataque.test.tsx` |  |
| `D8DACCB56C8DE8D9F1B0F8D1B0907C110E327F4F55B016FC0FE7FC0F25CCC79C` | `frontend/src/features/tareas/calificar-vacio-01c-r4.ataque.test.tsx` |  |
| `EF86C46708F0682BCA5A023E85794639C396EC94D207CAC23CEB13585AB39E75` | `frontend/src/features/tareas/campos-01c-r2.ataque.test.tsx` |  |
| `5FF367EDBA10C9BA9C7E50F8ED874032654FA2ABDC0DD8F4A122A000355472AB` | `frontend/src/features/tareas/cruces-01c-r3.ataque.test.tsx` |  |
| `2938AE2F1C00F63A0372997C7BA68BDC0AB097895769BF9060072A4AC2674C5A` | `frontend/src/features/tareas/descarga-ch3-r2.ataque.test.tsx` | Nueva (CHORE-03 03a, r2) |
| `0963F14F4842D6D57288876C932496AC09D44B872FC049492EE6E8BA539F3235` | `frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx` |  |
| `4F486CA37D2A2BB6CC26754281D2ADCE086A9D8D4485A069DE7AE5D54E360ACF` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `93A5A0A648669E9C96494A62B2B16082B07296F279E2892BF2C8D47834EE2FC1` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` |  |
| `432DCDDF119DD0E32E49ADC42D5F51D197698C8896E1058C505AB31F4A8EE838` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` |  |
| `172BE3EFD919C0D3948ECA17C7E808968E2370AFE1F9C2A28CEF7D2DED584B81` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` |  |
| `496652BC59817166F53E00CB828F2119C857C2834063A31764D7876DC150C930` | `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` |  |
| `4E6950F0FE571D6AE41A78380C59C20459FDF19F34C57E9777E4E34A6BC61C58` | `frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts` | Nueva (CHORE-03 03a, r1) |
| `94D6E6253B266C7F21099AA593AAC7B2600EDCA22AB403AA365DCD789B1C6A97` | `frontend/src/features/tareas/errores-ch3-r2.ataque.test.ts` | Nueva (CHORE-03 03a, r2) |
| `F614E7369F8C47C40A87AD1F8867FB8EDF7EBC76E94D0BA6C5C59C92CB6347F0` | `frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts` |  |
| `FB387ECBB7E5272D2FFB53D626B51FFD9C57B409D10C560E6A5ECBFA6A2A8C19` | `frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx` |  |
| `E662437641E2634539E09C674A84D353477E3BD05E31A1C11DC96ADC8B863B18` | `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx` | Nueva (CHORE-03 03a, r1) |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `72B19B6A00B4ADE43B06829BB5BEF1A5CDECF5A7D2AF57369F1E857A1D4A17F5` | `frontend/src/lib/errores-ch3-r1.ataque.test.ts` | Nueva (CHORE-03 03a, r1) |
| `1D89FA156238E49D4F9FBF986951050597E514031C4F5701275DC4EAF98CDB37` | `frontend/src/lib/errores-ch3-r2.ataque.test.ts` | Nueva (CHORE-03 03a, r2) |
| `60BC1FC7011E9A0FE5A4C4AA45420F2C7D38ADB9EE2F8D235D09847DBE13AC3A` | `frontend/src/lib/format-01c-r1.ataque.test.ts` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `FC4963D3FD93297C427EAD0B85B23615C287E4F2C48079BCA8031D1C2AEE0396` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## Ronda 0 — 03b
Veredicto: **RONDA 0 CERRADA**
Verificación propia: lint frontend `2` (solo el `tsc` esperado de C-3) · test frontend `2 failed | 211 passed (213)` · `1 failed | 3741 passed (3742)` · `Test timed out` = 0 (solo los rojos esperados de C-2 y C-3)

Rama `chore/chore-03-errores-api`, `git log -1` = `1f11d38ef5928f33c2ca275da69d675bb40b3f1a` (commit de 03a). Plan `plan.md` SHA-256 `ee08bf2a186e41abdd764f04c340576d954f8eb5e4dedfa769eb23ea127aad14` (Enmiendas 1, 2 y 3), igual al que registra `aprobacion.md`. En esta ronda no se ataca nada: V-01, las reescrituras C-2 y C-3 (A-5), el grep del inventario de §D-R0 para 03b y la verificación propia.

Archivos tocados por el tester en esta ronda: `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` (C-2), `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` (C-3) y este reporte. Nada más.

### V-01 — las 212 `*.ataque` de la base, sin cambios (antes de las reescrituras)
Comando (Git Bash, desde la raíz), el mismo de las rondas de 03a:

```bash
git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$' | sort | xargs sha256sum \
  | sed 's/ \*/  /' | awk '{print tolower($1)"  "$2}' | sort -k2 > actual.txt
# base: filas `| <hash> | <archivo> |` de "Tabla de SHA-256 de las 212 `*.ataque` al cierre de la
# ronda 2 de CHORE-03 03a" de este reporte, hash en minúsculas
diff base-03a-r2.txt actual.txt && echo IGUALES
```

Resultado: base 212 filas, actual 212 archivos, `diff` vacío, `IGUALES`. **212 de 212 iguales, ninguna de más ni de menos.**

Estado del árbol al arrancar:
- `git diff --stat 1f11d38e -- frontend shared backend`: vacío (código de los paquetes idéntico al commit de 03a).
- `git status --porcelain --untracked-files=all`: solo `M docs/ESTADO.md` y `M docs/trabajo/CHORE-03-errores-api/aprobacion.md`. Son del orquestador: el registro del commit de 03a y el arranque de 03b en `aprobacion.md`, y §2 de `ESTADO.md`. Los dos quedan fuera de la verificación de "No se toca" (`AGENTS.md`), así que no es PARADA. Fuera de ellos, el árbol está limpio.

### Reescritura C-2 (A-5)
Archivo y caso: `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` › "CODIGOS_QUE_REDIRIGE_EL_CLIENTE son exactamente los que apiClient redirige; sin disabled, ?? [], fetch( ni importaciones de otros módulos en lo que cambió".

```diff
@@ -673,15 +673,20 @@ const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
 describe("ataque ENTREGAS-01d r3: revisión estática del remedio", () => {
   it("CODIGOS_QUE_REDIRIGE_EL_CLIENTE son exactamente los que apiClient redirige; sin disabled, ?? [], fetch( ni importaciones de otros módulos en lo que cambió", () => {
-    const datos = fuentes["/src/features/tareas/data.ts"] ?? ""
-    const bloque = /CODIGOS_QUE_REDIRIGE_EL_CLIENTE[^=]*=\s*\[([^\]]*)\]/.exec(datos)?.[1] ?? ""
+    // CHORE-03 03b, ronda 0 (C-2, A-5): N-46 mueve la constante a services/apiClient.ts; el bloque se
+    // lee de ahí con la misma expresión, y los data.ts de tareas y calificaciones ya no la declaran.
+    const cliente = fuentes["/src/services/apiClient.ts"] ?? ""
+    const bloque = /CODIGOS_QUE_REDIRIGE_EL_CLIENTE[^=]*=\s*\[([^\]]*)\]/.exec(cliente)?.[1] ?? ""
     const codigos = [...bloque.matchAll(/"([A-Z_]+)"/g)].map((m) => m[1]).sort()
     expect(codigos).toEqual([
       "ACCESO_RESTRINGIDO",
       "CAMBIO_DE_CONTRASENA_REQUERIDO",
       "NO_AUTENTICADO",
     ])
-    const cliente = fuentes["/src/services/apiClient.ts"] ?? ""
+    for (const datos of ["/src/features/tareas/data.ts", "/src/features/calificaciones/data.ts"]) {
+      expect(fuentes[datos], `${datos} no existe`).toBeDefined()
+      expect(fuentes[datos]).not.toMatch(/\b(const|let|var)\s+CODIGOS_QUE_REDIRIGE_EL_CLIENTE\b/)
+    }
     expect(cliente).toContain('error.codigo === "ACCESO_RESTRINGIDO"')
     expect(cliente).toContain('error.codigo === "CAMBIO_DE_CONTRASENA_REQUERIDO"')
     expect(cliente).toContain('new ApiError("NO_AUTENTICADO"')
```

Qué cambia:
- La declaración de `cliente` sube para leer el bloque de `apiClient.ts`. La expresión y los tres códigos son los mismos.
- Se suma la comprobación de que `tareas/data.ts` y `calificaciones/data.ts` existen y no declaran la constante (`const|let|var`). Un comentario que la nombre no cuenta como declaración.

Qué no cambia: las tres `toContain` sobre `apiClient.ts`, la lista `cambiados` con sus cuatro reglas y el título.

Comprobé la expresión con `node` contra el bloque literal de §D-5 (con su comentario y `readonly string[]`): da los tres códigos. Hoy `apiClient.ts` no menciona la constante (`grep -c` = 0), así que la primera coincidencia será la declaración.

### Reescritura C-3 (A-5)
Archivo y casos: `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` › "400 VALIDACION de limite" y "400 VALIDACION de otro campo que menciona el cursor", que alimentan «Ver más publicaciones con %s» y «Ver más comentarios con %s» (cuatro ejecuciones).

```diff
@@ -6,14 +6,14 @@
-import { mensajeDeErrorClases } from "./lib"
+import { mensajeDeConsultaClases, mensajeDeErrorClases } from "./lib"
 import { MuroView } from "./muro-view"
@@
 // cursor en el mensaje), un 400 que no es VALIDACION, un 500, un 403 o la falta de conexión siguen
-// mostrando lo de siempre (mensajeDeErrorClases).
+// mostrando lo de siempre (mensajeDeConsultaClases).
@@ -61,7 +61,7 @@ const CASOS: CasoDeError[] = [
     nombre: "400 VALIDACION de limite",
@@
-    deSiempre: mensajeDeErrorClases(
+    deSiempre: mensajeDeConsultaClases(
       new ApiError("VALIDACION", "limite: Too big: expected number", 400),
@@ -70,7 +70,7 @@ const CASOS: CasoDeError[] = [
     nombre: "400 VALIDACION de otro campo que menciona el cursor",
@@
-    deSiempre: mensajeDeErrorClases(
+    deSiempre: mensajeDeConsultaClases(
       new ApiError("VALIDACION", "parámetro: el cursor no es válido", 400),
```

Los otros cinco casos ("cursor", "400 que no es VALIDACION…", "500", "403…" y "sin conexión") siguen con `mensajeDeErrorClases`, así que la importación conserva los dos nombres. La precondición y los dos `it.each` no cambian. El comentario de la interfaz `CasoDeError` (línea 48, "Lo que mensajeDeErrorClases da para el mismo error") se queda como está porque el plan solo nombra el de cabecera; es una observación de forma, sin efecto en lo que se prueba. `npx prettier --check` sobre los dos archivos: `All matched files use Prettier code style!`.

### Grep de confirmación del inventario de §D-R0 para 03b
Comandos (desde `frontend/`):

```bash
grep -rnE 'quitarPrefijo|PREFIJO_DE|MENSAJES_ERROR_CLASES\b|CODIGOS_QUE_REDIRIGE_EL_CLIENTE|errorQueRedirigeElCliente' src --include='*.test.ts' --include='*.test.tsx'
grep -rnE '"/src/features/(tareas|calificaciones|clases)/(data|lib)\.ts"' src --include='*.test.ts' --include='*.test.tsx'
grep -rlE 'VALIDACION' src --include='*.test.ts' --include='*.test.tsx'     # 71 archivos; revisé uno por uno los de clases, app y calificaciones
grep -rnE 'mensajeDeErrorClases|mensajeDeErrorDeLista|erroresDeCategoriasDeApi|erroresDelTemaDeApi|errorDelCampoCodigo|esErrorDeCursorDeCalificaciones|mensajeDeErrorCalificaciones' src --include='*.test.ts' --include='*.test.tsx'
grep -rnE 'Too big|Too small|expected (number|string)|Invalid (uuid|UUID|input)|"limite:|limite: |\\u200[BCD]|\\u\{200B\}|\\u2060|\\u0085|\\u00A0|\\uFEFF' src/features/clases src/features/calificaciones src/app src/components src/services --include='*.test.ts' --include='*.test.tsx'
```

Resultado: **coincide con el inventario de §D-R0; no hay hallazgo de ronda 0.**

Símbolos que 03b borra o mueve:
- `entregas-01d-r3.ataque` es C-2, ya reescrita.
- `PREFIJO_DE_EBFE126` de `refactor-01c-r1.ataque` es una copia local y no depende del código.
- `lib/errores-ch3-r1.ataque.test.ts:261` (mía, 03a r1) **prohíbe** `quitarPrefijoDeCampo` en `features/tareas` y `components/adjuntos`. Borrarlo en 03b la sigue cumpliendo.
- Ninguna otra prueba nombra `MENSAJES_ERROR_CLASES`, `PREFIJO_DE_RUTA` ni `errorQueRedirigeElCliente`.

Pruebas que leen `data.ts` o `lib.ts` de los tres módulos:
- `estatico-01d.test.ts` es N-L2, del programador.
- Las demás aplican reglas generales (`?? []`, `disabled`, `fetch(`, tipos fuera de `types.ts`, textos fijos, `console.`) que el plan ya revisó como "no rompen": `entregas-01d-r1`, `entregas-01e-r1`, `estatico-01c`, `tareas-01a-r1`, `ver-mas-01e-r3`, `estatico-02c-r1`, `como-se-entrega-01a` y `aviso-calificar-01c-r3`.

Salida de `mensajeDeErrorClases` y `mensajeDeErrorDeLista`:
- Fuera de C-3, solo `clases/lib.test.ts:133` fija la salida de un `VALIDACION` que no es de cursor en una consulta (`"limite: debe ser un número"`). Es N-L1, del programador.
- Las demás llamadas cubren otros casos, y la salida es la misma con el contrato:
  - Códigos con mensaje del servidor con texto visible: `clases/lib.test.ts:378` y `refactor-01c-r1:248`.
  - Códigos de archivos con texto fijo: `reexportaciones-01c:147`.
  - Envoltorios que se comparan con la versión compartida: `reexportaciones-01c:179` y `:197`.
  - `SIN_ACCESO_A_LA_CLASE`: `refactor-01c-r1:277` y `:330`.
- Ninguno de esos códigos está a la vez en `MENSAJES_ERROR_CLASES` y en `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` de `clases`, así que el orden nuevo del contrato (texto fijo del código antes que el mensaje del servidor) no cambia su salida.

`VALIDACION` en vistas de `clases` y `app`:
- Formularios con ruta simple, que salen igual: `codigo:`, `texto:`, `descripcion:`, `maestroIds:`, `nombre:`, `categorias.N.nombre:`, `categorias.N.peso:` y `categorias:`.
- `claseId:`: da "No tienes acceso…" por `textosPorCampo` en las dos variantes. Lo usan `clases-r1:422`, `clases-r4:123` y `reexportaciones-01c:173`.
- Cursor: no cambia con `esErrorDeCursor`. Lo usan `muro-recuperar-c-r3`, `muro-recuperar-c-r4`, `muro-c-r2`, `muro-view`, `publicacion-del-muro`, `inicio-*-view`, `clases-admin-*` y `refactor-01c-r1`.
- `clases-r4:119` ("maestroId: no permitido") y `:127` (sin campo) son acciones: siguen dando un toast sin ruta (`not.toMatch(/^[a-zA-Z_]+:/)`).
- `descarga-ch3-r2.ataque` (mía, 03a r2) usa F1, que da el mismo resto por los dos caminos.
- Ninguna prueba de `clases` fija un texto del servidor sin caracteres visibles ni una ruta compuesta fuera de las de `categorias`. Los invisibles de `formulario-clase`, `formulario-publicacion`, `publicacion-del-muro`, `maestros-02c-r1` y `muro-c-r1` son lo que escribe la persona: la validación del cliente los frena antes de pedir nada.

`features/calificaciones`:
- `mensajeDeErrorCalificaciones` no se migra (Enmienda 1, M-01), así que sus pruebas con "Too big" y "Invalid UUID" no cambian de salida: `lib.test`, `gradebook-01d*`, `mis-calificaciones-01d*` y `secciones-01d-r3/r4`.
- `esErrorDeCursorDeCalificaciones(error, campos)` en `lib.test.ts:41-81` usa la misma firma que `esErrorDeCursor(error, campos)`, que ya existe desde 03a.
- La regla de `lib/errores-ch3-r1.ataque.test.ts:299` ya descuenta la forma exacta del alias, `export const esErrorDeCursorDeCalificaciones = esErrorDeCursor\n`. **Nota para el programador:** si el alias se escribe de otra forma (con anotación de tipo, partido en dos líneas o con otro nombre a la derecha), esa regla estática lo marca como referencia pasada.

### Comandos de la verificación propia
Antes de la corrida comprobé con `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` que no hubiera ningún `vitest` en marcha. Solo había un proceso ajeno (el runtime de otra herramienta en `.cache\codex-runtimes`), que no toqué. Corrí una suite a la vez desde `frontend/`. No corrí el backend ni `shared/` (03b no los toca), ni abrí navegadores. Las salidas están en el scratchpad de la sesión: `03b-r0-lint.txt` y `03b-r0-test.txt`.

| Comando | Salida | Última línea |
|---|---|---|
| V-01 al inicio (base: tabla de la ronda 2 de 03a) | 0 | base 212, actual 212, `IGUALES` |
| `git diff --stat 1f11d38e -- frontend shared backend` (antes de reescribir) | 0 | vacío |
| `npx prettier --check <C-2> <C-3>` | 0 | `All matched files use Prettier code style!` |
| `npm run lint` | 2 | `npm error command … tsc -b`. ESLint 0 problemas; Prettier `All matched files use Prettier code style!`; `tsc -b`: **un solo error**, `src/features/clases/muro-c-r3.ataque.test.tsx(9,10): error TS2305: Module '"./lib"' has no exported member 'mensajeDeConsultaClases'.` (`grep -c 'error TS'` = 1) |
| `npm run test` (14:27:57Z a 14:31:35Z) | 1 | `Test Files  2 failed \| 211 passed (213)` · `Tests  1 failed \| 3741 passed (3742)` · `Duration  212.07s`; `grep -c "Test timed out"` = 0 |
| V-01 al cierre | 0 | 212 archivos; `diff` contra la base: solo las dos líneas de C-2 y C-3 |

**Rojos esperados, con su conteo exacto (nada más falla):**
1. **`lint` (tsc), 1 error:**
   - Dónde: `muro-c-r3.ataque.test.tsx(9,10)`.
   - Error: `TS2305`, `mensajeDeConsultaClases` no existe todavía en `features/clases/lib.ts`.
   - Se va cuando el programador la cree (03b, paso 4).
2. **`test`, suite caída, 1 archivo, 0 casos ejecutados:**
   - Archivo: `src/features/clases/muro-c-r3.ataque.test.tsx`, en "Failed Suites 1".
   - Error: `TypeError: mensajeDeConsultaClases is not a function` en `:64:16`, al construir `CASOS` cuando el módulo se carga.
   - Por eso no se recogen sus **15 casos**: la precondición, más 7 por «Ver más publicaciones con %s» y 7 por «Ver más comentarios con %s».
   - Eso explica el total: 3757 al cierre de 03a − 15 = **3742**.
   - Se va con `mensajeDeConsultaClases` (03b, paso 4).
3. **`test`, 1 caso rojo:**
   - Caso: `src/features/tareas/entregas-01d-r3.ataque.test.tsx` › "ataque ENTREGAS-01d r3: revisión estática del remedio › CODIGOS_QUE_REDIRIGE_EL_CLIENTE son exactamente los que apiClient redirige; sin disabled, ?? [], fetch( ni importaciones de otros módulos en lo que cambió". Es la C-2; los otros 16 casos del archivo pasan.
   - Error: `AssertionError: expected [] to deeply equal [ 'ACCESO_RESTRINGIDO', …(2) ]` en `:681:21`, porque `apiClient.ts` todavía no declara la constante.
   - Se va con N-46 (03b, pasos 1 a 3). Para pasar, además, `tareas/data.ts` y `calificaciones/data.ts` deben dejar de declararla.

Totales: `lint` con 1 error de `tsc`; `test` con 2 archivos en rojo (1 suite que no carga y 1 archivo con 1 caso rojo) y 1 caso rojo; 211 archivos y 3741 casos en verde; 0 `Test timed out`. Cuando el programador cierre 03b, la base de casos vuelve a 3757 más sus pruebas nuevas.

### Tabla de SHA-256 de las 212 `*.ataque` al cierre de la ronda 0 de CHORE-03 03b (base de V-01 del programador y del manager en 03b)
Cambian dos respecto a la tabla de la ronda 2 de 03a, marcadas "Reescrita (CHORE-03 03b, C-2/C-3)". Las 210 restantes son iguales. Se reproduce con el comando de V-01. Los hash van en mayúsculas, así que compárense sin distinguir mayúsculas.

| SHA-256 | Archivo | Nota |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `5E02A27716D63E8CE0FE6B6171BFF089EB3EE2548260349B16950D7E65A1BCF9` | `backend/test/calificaciones-01a-r1.ataque.test.ts` |  |
| `AFB531E7CCAB1CB53F0322D7D099A7F435DBD42325DE8C225525E3784B93F6CC` | `backend/test/calificaciones-01a-r2.ataque.test.ts` |  |
| `DD919EBD74A2C6AC60C244A1563B46895821B0D25E5051CDA25FFFB72B653416` | `backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` |  |
| `B09BAAEC53455CEA1A0674890EBD9353007E6F2628001446E873B09279FFBA07` | `backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` |  |
| `29EED2E93AF2775A4605160EA533BD462FD03CB1CFE4C47154898358A7255869` | `backend/test/calificaciones-estatico-01b-r1.ataque.test.ts` |  |
| `6E4C0EB47FF8020B0A539E5B70B24C8C1D05F7773EA092CD513E39C68CF4534E` | `backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts` |  |
| `6E3C92C13F146A01C8DCFDC7DD04BEA59F0E2562051F6AC65F95F924EF73E4DB` | `backend/test/categorias-01a-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `47B02C6D3916713BF9236A619FDB59A641D2E805F1F0B7E9B2C161FE719DDC3A` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `E4E9365EA010F3F670B6C1194D1A592E95DB43BFF0496D4EA1646FC5225CA8B4` | `backend/test/gradebook-01b-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `2684916C88B9405706F82DA3F9B2FFD0B3626A11AF79E20EA146FDFD1D52C319` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `3790777831A1FACB053D0719D85AB404593954416B1443A1A59530E09E2C81DC` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `BC6D49F9FC1F5EB20E305945FEF57CAEEBEB108BFF5D5CF4BA10B8040687D69C` | `backend/test/mis-calificaciones-01b-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `CCEA34C962FC8F14A49C64EAFA8119DAE5030E1302ED94FE369299EC49182BB8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `C67FA558FA7AE23821175478C8CB7D4874EE5F4D6CB84D0851F9A551B8AB455B` | `frontend/src/app/rutas-01d-r1.ataque.test.tsx` |  |
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `11C6D9C55BE91AA41E8525345E3795E34B8E1E661FF7CDD901F729760A033CFD` | `frontend/src/components/adjuntos/errores-ch3-r1.ataque.test.ts` |  |
| `48F5FF8FEF35FAA6D8500FAE4A53CA953D7F661100A5C4879BA58E68972AB2DE` | `frontend/src/components/foco/foco-01d-r1.ataque.test.ts` |  |
| `36A104515F2EA87F143B2CFC00AEF9A33E6DDDB666844C1A9C977557EECA20EF` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `F0CBA6F9B6C4CF1D74ED52AD89943088661370F5A784502F851CD6230912F606` | `frontend/src/features/calificaciones/estatico-01d-r1.ataque.test.ts` |  |
| `5991D8E3D4E694973309F178E5341A2285584CF9ED6006FBB658D7F5A61DE5DD` | `frontend/src/features/calificaciones/gradebook-01d-r1.ataque.test.tsx` |  |
| `C744FB831FA9992C2A9ED0729F9EC3CC089F3167CA19133C6EEE0133382607A1` | `frontend/src/features/calificaciones/gradebook-01d-r2.ataque.test.tsx` |  |
| `8DEA1C2ADC5D228E166CE6037A1A1A827D26E2BDC6D7C8534F146517EBC1AC44` | `frontend/src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx` |  |
| `6F7496CA7652E7B4441A7EB9822E74270D50127AC40BA27B86C83EDFCD5CC3FA` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r1.ataque.test.tsx` |  |
| `24751F358FC5ECD485C475E7025DD881B87FE892F025459A6FF29F615FC5CC66` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r2.ataque.test.tsx` |  |
| `C504D0AD3690781275A6FFB78638A6148550B2FD4EE1ED25A4B154054FC4F80D` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r3.ataque.test.tsx` |  |
| `A8790F734402A957534D0F0E660EEF342F9029CDFC1991BE421D9B3E3C3E9CB7` | `frontend/src/features/calificaciones/secciones-01d-r3.ataque.test.tsx` |  |
| `FB33F2A27BFCCA906549A12610977478BA72E6E7ED8AFD5C5A0A962DEB3EB802` | `frontend/src/features/calificaciones/secciones-01d-r4.ataque.test.tsx` |  |
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `A3880B67FFAA0D15763D1C761CEF1FF8472029C77BFB2211AB079EADB1685325` | `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` |  |
| `66C0B873BC8B9D8E9E01AC871BD6AAAB4328508BEB5EC9371D69463D7C12430D` | `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` |  |
| `5272DE876597EAD9EF838E4D022185C80AA411AAD9E67325573C87F954C5F7A6` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `DCE7FD019A6E32B8E4DF37DD0728E265F5E9449E9EE2723F372EA174FE312464` | `frontend/src/features/clases/descarga-ch3-r2.ataque.test.tsx` |  |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `827B8ABCA664145D51A1BBD1C0B558B0EDDFED8707A21A774222B4972BE14FF2` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `A79B6AFC48B2F71D09BE0670D515C53ED33C5C922250C242F917998192A00D28` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` | Reescrita (CHORE-03 03b, C-2/C-3): C-3 |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `85A7926A0F6831A8375F544CF38FE5585A8E2DCBF73D9726E9A3CFAAB7F76511` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `4303EAC77B98E8978495D9E68FD7725AC436F9DB757DBC0C02C59051436908FA` | `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` |  |
| `A4AA15CEF1A377EED688DAB1B92E5CA4A3943490144CEC861CF7B482845B0362` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` |  |
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `2EF258E946084F17E33936E8FA257551A90323B589859DD2E1F70AABEAF711BF` | `frontend/src/features/tareas/aviso-calificar-01c-r3.ataque.test.tsx` |  |
| `E2FEFD7D744F77C7BDD2BA73A08CC51076D0F6130BF4D0A225E0E972A1DCE111` | `frontend/src/features/tareas/avisos-01c-r2.ataque.test.tsx` |  |
| `11BB5433FB30F268B6D93E1E7814D826BBAB8FB1F173E574FAF52F5A96B5A41E` | `frontend/src/features/tareas/calificar-01c-r1.ataque.test.tsx` |  |
| `D8DACCB56C8DE8D9F1B0F8D1B0907C110E327F4F55B016FC0FE7FC0F25CCC79C` | `frontend/src/features/tareas/calificar-vacio-01c-r4.ataque.test.tsx` |  |
| `EF86C46708F0682BCA5A023E85794639C396EC94D207CAC23CEB13585AB39E75` | `frontend/src/features/tareas/campos-01c-r2.ataque.test.tsx` |  |
| `5FF367EDBA10C9BA9C7E50F8ED874032654FA2ABDC0DD8F4A122A000355472AB` | `frontend/src/features/tareas/cruces-01c-r3.ataque.test.tsx` |  |
| `2938AE2F1C00F63A0372997C7BA68BDC0AB097895769BF9060072A4AC2674C5A` | `frontend/src/features/tareas/descarga-ch3-r2.ataque.test.tsx` |  |
| `0963F14F4842D6D57288876C932496AC09D44B872FC049492EE6E8BA539F3235` | `frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx` |  |
| `4F486CA37D2A2BB6CC26754281D2ADCE086A9D8D4485A069DE7AE5D54E360ACF` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `93A5A0A648669E9C96494A62B2B16082B07296F279E2892BF2C8D47834EE2FC1` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` |  |
| `08A5E1A5642E7FC7553632DD5CF4E07F0EA35C3EF1E7293D010BBC49B09465AA` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` | Reescrita (CHORE-03 03b, C-2/C-3): C-2 |
| `172BE3EFD919C0D3948ECA17C7E808968E2370AFE1F9C2A28CEF7D2DED584B81` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` |  |
| `496652BC59817166F53E00CB828F2119C857C2834063A31764D7876DC150C930` | `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` |  |
| `4E6950F0FE571D6AE41A78380C59C20459FDF19F34C57E9777E4E34A6BC61C58` | `frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts` |  |
| `94D6E6253B266C7F21099AA593AAC7B2600EDCA22AB403AA365DCD789B1C6A97` | `frontend/src/features/tareas/errores-ch3-r2.ataque.test.ts` |  |
| `F614E7369F8C47C40A87AD1F8867FB8EDF7EBC76E94D0BA6C5C59C92CB6347F0` | `frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts` |  |
| `FB387ECBB7E5272D2FFB53D626B51FFD9C57B409D10C560E6A5ECBFA6A2A8C19` | `frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx` |  |
| `E662437641E2634539E09C674A84D353477E3BD05E31A1C11DC96ADC8B863B18` | `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx` |  |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `72B19B6A00B4ADE43B06829BB5BEF1A5CDECF5A7D2AF57369F1E857A1D4A17F5` | `frontend/src/lib/errores-ch3-r1.ataque.test.ts` |  |
| `1D89FA156238E49D4F9FBF986951050597E514031C4F5701275DC4EAF98CDB37` | `frontend/src/lib/errores-ch3-r2.ataque.test.ts` |  |
| `60BC1FC7011E9A0FE5A4C4AA45420F2C7D38ADB9EE2F8D235D09847DBE13AC3A` | `frontend/src/lib/format-01c-r1.ataque.test.ts` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `FC4963D3FD93297C427EAD0B85B23615C287E4F2C48079BCA8031D1C2AEE0396` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## Ronda 1 — 03b
Veredicto: **ROTO**
Verificación propia: lint frontend `0` (`> tsc -b`; antes: `All matched files use Prettier code style!`) · test frontend `Test Files  1 failed | 223 passed (224)` · `Tests  4 failed | 4104 passed (4108)` · `Test timed out` = 0. Los 4 rojos son míos: T-03 y T-04, abajo.

- **Rama y base:** rama `chore/chore-03-errores-api`, `git log -1` = `1f11d38ef5928f33c2ca275da69d675bb40b3f1a` y base de 03b `1f11d38e`.
- **Plan:** `plan.md` SHA-256 `ee08bf2a…` (Enmiendas 1 a 3).
- **Qué leí:** el diff de producción de 03b (23 archivos, `git diff --stat 1f11d38e -- frontend/src`: 123 inserciones y 105 borrados, pruebas incluidas); `lib/errores-de-api.ts`; `features/clases/{data,lib,hooks}.ts`; los formularios y controles de `clases` (`formulario-clase`, `selector-de-maestros`, `formulario-publicacion`, `formulario-comentario`, `formulario-tema`, `formulario-unirse-clase`, `editor-de-categorias`); las once vistas de consulta; `calificaciones/lib.ts` y `data.ts`; `services/apiClient.ts`; las pruebas nuevas del programador (CH3-B01 a B14); su resumen y la verificación del manager (O-12 a O-15 y O-05).

Archivos que toqué: las cinco `*.ataque` nuevas de abajo y este reporte (añadido al final). Ningún archivo de producción, ninguna prueba del programador y ninguna `*.ataque` previa (V-01 abajo).

Pruebas de ataque nuevas (`npx vitest list <archivo> | grep -c " > "`, 207 casos):

| Archivo | Casos |
|---|---|
| `frontend/src/features/clases/errores-ch3-r1.ataque.test.ts` | 91 |
| `frontend/src/features/clases/formularios-ch3-r1.ataque.test.tsx` | 88 |
| `frontend/src/features/clases/recuperar-ch3-r1.ataque.test.tsx` | 3 |
| `frontend/src/features/calificaciones/cursor-ch3-r1.ataque.test.ts` | 7 |
| `frontend/src/services/apiClient-ch3-r1.ataque.test.ts` | 18 |

### Regresiones
- **V-01 al inicio:** usé el comando de la ronda 0 de 03b contra la "Tabla de SHA-256 de las 212 `*.ataque` al cierre de la ronda 0 de CHORE-03 03b". Base 212, actual 212, `diff` vacío: `IGUALES`.
- **Suite completa:** pasó de 219 a 224 archivos (+5, los míos) y de 3901 a 4108 casos (+207, los míos). Coincide con la corrida del programador y la del manager (219 y 3901).
  - Las 212 `*.ataque` previas pasan, entre ellas las de `clases` que fijan textos y recortes: `clases-r1`, `-r2`, `-r4`, `muro-c-r2`, `muro-c-r3` (C-3), `categorias-01e-r1`, `maestros-02c-r1`, `clases-admin-02c-r1`, `refactor-01c-r1`, `descarga-ch3-r2`, las de `calificaciones` y mis cuatro de 03a.
  - También pasan las pruebas del programador.
  - Los únicos rojos son los 4 casos de T-03 y T-04.

### Hallazgos

#### T-03 — "Editar clase": un `400 VALIDACION` de `maestroIds` no muestra nada
Severidad: media
Prueba: `frontend/src/features/clases/formularios-ch3-r1.ataque.test.tsx` › "ataque CHORE-03 03b r1 · un solo mensaje legible en los formularios (O-15 y campos no pintados)". Fallan dos casos:
- "editar clase con «maestroIds: Revisa este valor.» da exactamente un mensaje legible (cualquiera), sin ruta; lo escrito se conserva y el botón sale de la espera";
- "editar clase con «maestroIds:·» da exactamente un mensaje legible (cualquiera), …" (el resto es `\u{200B}`).

Esperado / Obtenido:
- **Esperado:** exactamente un mensaje legible. En "editar" el formulario no pinta los maestros, así que debe ser un aviso con "Revisa este valor." (o con el genérico si el resto no tiene texto visible).
- **Obtenido:** `avisos: []; textos en pantalla: 0: expected +0 to be 1`. La persona no recibe ningún mensaje. El botón sale de la espera y no hay aviso de éxito, así que parece que no pasó nada.
- **Causa** (`components/formulario-clase.tsx:68-75`): `alFallar` llama a `erroresDeFormularioClases(error, ["nombre", "descripcion", "maestroIds"])` en los dos modos.
  - Con `maestroIds:`, la función devuelve `{ maestroIds: … }`, el formulario lo guarda en `errores` y no avisa.
  - El único lugar que pinta `errores.maestroIds` es `SelectorDeMaestros`, y solo se monta con `modo === "crear"` (`:158`).
- **Lo que sí funciona (O-15 en crear):** en "crear", `maestroIds:` (con mensaje, con el nombre repetido y con cuatro restos sin texto visible) da un solo `ErrorDeCampo`, localizado por el grupo «Maestros de la clase» y su descripción accesible, sin aviso. `maestroIds.0: maestroId: …` da un solo aviso, «debe ser un identificador válido» o el genérico, en crear y en editar.

Alcance:
- Hoy el servidor no lo responde: `editarClaseSchema` no tiene `maestroIds`. Es un `VALIDACION` fuera de contrato, de la clase "un campo que el formulario no pinta".
- No es regresión de 03b: `formulario-clase.tsx` no cambia desde `1f11d38e`.
- CH3-B07 no lo ve porque su F1 usa `campoFueraDeContrato`, que no está en la lista de campos del formulario.
- El remedio toca `formulario-clase.tsx`, que no está en "Cambios por capa" de 03b (PA-3).

Requisito o regla violada:
- `AGENTS.md`, "Todo plan con un formulario nuevo inventaría los `VALIDACION` fuera de contrato…": "un campo que el formulario no pinta … nunca ambos ni ninguno".
- `plan.md` §D-2, fila "`VALIDACION` "`<ruta no pintada>`: Mensaje" → un aviso "Mensaje"", y S-03 ("si nombra un campo que no pinta … un solo aviso … Nunca ambos ni ninguno").

#### T-04 — "Publicar un anuncio": un `400 VALIDACION` de `titulo` no muestra nada
Severidad: media
Prueba: mismo archivo y bloque. Fallan dos casos:
- "publicar un anuncio con «titulo: Revisa este valor.» da exactamente un mensaje legible (cualquiera), …";
- "publicar un anuncio con «titulo:·» da exactamente un mensaje legible (cualquiera), …" (el resto es `\u{00A0}`).

Esperado / Obtenido:
- **Esperado:** exactamente un mensaje legible. Con "Anuncio" elegido, el campo del título no se pinta, así que debe ser un aviso.
- **Obtenido:** `avisos: []; textos en pantalla: 0: expected +0 to be 1`. Ningún mensaje. El texto escrito se conserva y el botón sale de la espera.
- **Causa:** el gancho y el formulario coinciden entre sí, pero no con lo que se pinta.
  - El gancho (`hooks.ts:617`, `useCrearPublicacion`) calla porque `erroresDeFormularioClases(error, ["titulo", "texto"])` no es `null`.
  - El formulario (`components/formulario-publicacion.tsx:148-149`) guarda `errores.titulo`.
  - Pero el campo del título y su `ErrorDeCampo` solo se pintan con `esMaterial` (`:229`).
- **Lo que sí funciona:** con "Material" elegido, `titulo:` da un solo `ErrorDeCampo` bajo el título, con el mensaje o con el genérico. `temaId: temaId: …` da un solo aviso en los dos tipos.

Alcance:
- Hoy el servidor no lo responde: la rama `anuncio` de `crearPublicacionSchema` no tiene `titulo`, y el tipo no puede cambiar con la petición en vuelo (`publicandoRef`).
- No es regresión de 03b: ni `hooks.ts` ni `formulario-publicacion.tsx` cambian desde `1f11d38e`.
- El remedio toca un `hooks.ts` o el formulario: PA-2 o PA-3.

Requisito o regla violada: la misma que T-03 (`AGENTS.md`, `VALIDACION` fuera de contrato; `plan.md` §D-2 y S-03).

**Hermanos que revisé** (otro formulario de `clases` cuya lista de campos válidos tenga uno que no pinta en algún modo):
- Comentario (`["texto"]`), tema (`["nombre"]`, más `TEMA_REPETIDO`) y unirse (`["codigo"]`, más `CODIGO_INVALIDO`): pintan siempre su campo.
- Editor de categorías: la fila o, si el índice no está entre las llaves, la lista.
  - Gancho (llaves vacías) y editor (llaves de sus filas) dicen lo mismo en 25 entradas, con filas fuera de rango, `00`, `.peso.x`, `Categorias:` y restos sin texto visible ("el editor de categorías y su gancho deciden lo mismo").
  - Y la lista siempre se pinta.
- Solo T-03 y T-04 tienen el patrón.

### Atacado sin hallazgos

#### O-15 — crear y editar clase con `maestroIds:` y `maestroIds.0: maestroId:`
`formularios-ch3-r1.ataque.test.tsx`, 19 casos (con los de anuncio y material). El conteo une los avisos (`toast.error`) y los textos en pantalla (`queryAllByText`), sin depender del sufijo `-error`. El error del selector se localiza por el rol `group` y su nombre («Maestros de la clase»), con `toHaveAccessibleDescription`.
- **Crear:**
  - `maestroIds: M`, `maestroIds: maestroId: M` y `maestroIds:` con `""`, `\u{00A0}\u{200B}\n`, `\u0085` y `\u{3000}\u{2060}` dan un solo `ErrorDeCampo` y ningún aviso.
  - `maestroIds.0: maestroId: …`, `maestroIds.1:maestroId:\t…` y `maestroIds.0: maestroId:\u{200B}` dan un solo aviso, con el resto o el genérico.
- **Editar:** `maestroIds.0: maestroId: …` da un solo aviso, y `descripcion: M` un solo `ErrorDeCampo`. Solo `maestroIds:` falla (T-03).
- **En todos los casos:** el texto visible no contiene `maestroIds`, `maestroId:`, `titulo:`, `temaId:` ni `descripcion:`; lo escrito se conserva y el botón queda sin `aria-busy` ni `aria-disabled`.

#### O-13 — «Ver más alumnos» en "Personas" y en el roster (cambio visible declarado, O-12)
`formularios-ch3-r1.ataque.test.tsx`, 14 casos: 2 vistas × 7 mensajes. Los mensajes son `cursor: no es válido`, `cursor:`, `cursor:\u{200B}`, `cursor.0: no es válido`, `Cursor: no es válido`, `limite: Too big: expected number to be <=50` y `limite:\u{00A0}`.
- El roster usa una respuesta con `siguienteCursor`, así que el botón existe; CH3-B09 no lo cubría.
- En los 14, después de pulsar el botón:
  - hay exactamente un "Algo salió mal. Inténtalo de nuevo.";
  - no hay aviso;
  - el texto visible no contiene "no es válido", "cursor", "Cursor", "limite" ni "Too big".
- Queda fijado el cambio visible declarado.

#### O-14 — los caminos de CH3-B10 que faltaban (con `rutas` y `Providers` reales)
`recuperar-ch3-r1.ataque.test.tsx`, 3 casos. El genérico queda bajo el nombre del tema por `nombre:\u{200B}`.
1. **Pulsar «Trabajo de clase» en la barra estando en ella:** misma ruta, otra `location.key` (comprobado).
   - El formulario no se desmonta: conserva "Unidad 1" y su error, sin aviso.
   - Es lo que dice S-06 ("pulsar la sección activa no aplica a un error de envío; lo escrito y su error viven en el formulario").
   - Repetir «Crear tema» manda un segundo POST, sale bien y el error desaparece.
2. **Ir al muro con la barra y volver con la barra** (10 s después, antes del `staleTime`): sin el error, el formulario cerrado, y «Nuevo tema» → «Crear tema» manda un POST nuevo que sale bien.
3. **Atrás y adelante:** trabajo → muro → atrás → adelante → atrás, con el reloj avanzando 3 s por paso. En ningún paso aparece el genérico; al final, el POST nuevo sale bien.

#### §D-4 de `clases`, función por función (Puntos de ataque)
`errores-ch3-r1.ataque.test.ts`. Un `it.each` de 31 entradas pasa por `mensajeDeErrorClases`, `mensajeDeConsultaClases`, `mensajeDeErrorDeLista` y `avisoDeFalloAlSubir`. Cada salida tiene texto visible, no empieza con ruta y mide menos de 200 caracteres.
- **Entradas raras:** mezclas de restos con y sin ruta; `pa\u{0301}rametro:` (marca combinante) y `párametro:`; solo dígitos; una ruta de 4000 caracteres; 300 niveles, con y sin texto visible.
- **Las rutas dobles del inventario,** con espacios, sin espacios y con tabuladores: `publicacionId`, `comentarioId`, `temaId`, `temaIds.12`, `maestroId`, `maestroIds.1`, `categorias.3.id: categoriaId:`, `alumnoId` y `archivoId` sin texto visible.
- **Lo que da cada una:**
  - `tema: tema:` da "elige un tema válido" en la acción (crear tema) y el genérico en la consulta y en "Ver más".
  - `claseId` doble (con y sin espacios, y sin texto visible) da "No tienes acceso a esta clase." en la acción, en la consulta y en "Ver más".
  - `claseId.0:` no es el parámetro: da el resto.
  - `limite:` en inglés, `cursor.0:`, `Cursor:`, `cuerpo: Unrecognized key`, `constructor:` y `__proto__:` dan el resto en la acción y el genérico en la consulta.
- **Ver más:** `cursor:` con cuatro restos da el texto del cursor.
- **Códigos que no están en las tablas** (`constructor`, `toString`, `__proto__`, `hasOwnProperty`, `valueOf`, `""`, `" VALIDACION"`, `validacion`): dan el genérico en las tres funciones (`Object.hasOwn`).
- **Los 12 códigos con mensaje del servidor:** con texto lo muestran tal cual, aunque parezca una ruta (decisión CAL-T-123). Sin texto visible (tres mezclas) dan el genérico en la acción, en la consulta y en "Ver más".
- **Lo que no es un `ApiError`** (Error con ruta, objeto con `codigo`, `null`, `undefined`, una cadena): da el genérico, y `erroresDeFormularioClases` y `erroresDeCategoriasDeApi` dan `null`.
- **Campo pintado:** `nombre:` y `codigo:` con y sin texto visible dan un solo campo legible en tema, unirse y clase. `TEMA_REPETIDO` y `CODIGO_INVALIDO` sin texto visible dan el genérico o el texto fijo.

#### Consultas de §D-4 por la interfaz, con las rutas dobles
`formularios-ch3-r1.ataque.test.tsx`, 55 casos: 11 consultas × 5 mensajes.
- **Consultas:** categorías, la clase y el código en el marco, "Editar clase", "Maestros", los temas y la sección de un tema de "Trabajo de clase", "Personas", el roster y los dos buscadores.
- **Mensajes:**
  - `claseId: claseId: …` y `claseId:` sin texto visible dan "No tienes acceso a esta clase.";
  - `tema: tema: elige un tema válido`, `temaIds.0: temaId: …` y `pa\u{0301}rametro: M` dan el genérico.
- **En los 55:** el texto visible no contiene "claseId", "temaId", "tema:", "elige un tema", "identificador", "rametro" ni el mensaje.

#### `calificaciones` (alias del cursor)
`cursor-ch3-r1.ataque.test.ts`, 7 casos.
- `esErrorDeCursorDeCalificaciones` es `esErrorDeCursor` (`toBe`).
- **Diferencial contra la función de `1f11d38e`,** copiada en la prueba: 5 listas de campos (gradebook, "Mis calificaciones", vacía, `["cursorTareas"]` y `["constructor"]`) × la tabla común completa más 19 errores propios: `cursor:` y `cursorTareas:` con restos, `cursor.0:`, `Cursor:`, un espacio o un invisible antes, `cursor :`, códigos que no son `VALIDACION` y lo que no es un `ApiError`. Salida idéntica.
- **Las vistas:** el gradebook reconoce `cursor` y `cursorTareas`; "Mis calificaciones" solo `cursor`; `limite:` y `claseId:` no son cursor; `esErrorDeSinAcceso` no cambia.
- **Sin cambio de salida:** el gradebook y "Mis calificaciones" no cambiaron, y sus `*.ataque` de cursor (`gradebook-01d-r1` a `-r3` y `mis-calificaciones-01d-r1` a `-r3`) pasan en la corrida completa.

#### N-46
`apiClient-ch3-r1.ataque.test.ts`, 18 casos.
- Los `data.ts` de `tareas` y `calificaciones` no exportan la lista en tiempo de ejecución.
- `errorQueRedirigeElCliente` de los dos módulos da lo mismo en 14 casos: los tres códigos; minúsculas; espacios antes o después; `ACCESO`; `constructor`; `length`; un `VALIDACION` cuyo mensaje empieza con el código; `SIN_ACCESO_A_LA_CLASE`; un objeto con `codigo`; un `Error`; y `null`.
- Ningún archivo de producción fuera de `apiClient.ts` tiene los tres códigos como literales, así que no hay una copia con otro nombre.
- Solo `tareas/lib.ts` y `calificaciones/lib.ts` usan la constante, importada de `@/services/apiClient`, y ninguno la declara.
- `apiClient.ts` importa exactamente `@campus/shared`, `./navegacion` y `./tokenAcceso`, sin `import(` ni `require(`. `navegacion.ts` y `tokenAcceso.ts` no importan de `features/` ni de `lib/`, así que no hay ciclo.

#### O-05 — regla estática ampliada a `clases` y `calificaciones`
`errores-ch3-r1.ataque.test.ts`. Se lee el texto crudo, con los comentarios.
- **Precondición:** hay más de 10 archivos de producción por módulo.
- **Ninguna copia de la expresión de ruta escrita de otra forma:**
  - `/^[…]+:` con cualquier clase, `\w`, `\S`, `[^:]` o `.+?`;
  - `\p{L}` fuera del contrato y `new RegExp(`;
  - `.split(":")` y `.indexOf(":")`.
- **Nombres retirados:** ninguna mención de `quitarPrefijoDeCampo` ni de `PREFIJO_DE_RUTA`, y ninguna declaración de `MENSAJES_ERROR_CLASES` ni de `CODIGOS_QUE_REDIRIGE_EL_CLIENTE`. El comentario de `data.ts` que nombra el antiguo `MENSAJES_ERROR_CLASES` es legítimo.
- **`.message` en producción:** solo `incidencia.message` y `PREFIJO_DE_FILA_DE_CATEGORIA.exec(error.message)`. Ninguno crudo en `toast.*(`, `mensaje={` ni `errorMensaje={`.
- **Contrato:** `Object.keys` del contrato ya no tiene `quitarPrefijoDeCampo`.

#### Lo demás
- **`esErrorDeCursor` pasado como referencia:** `lib/errores-ch3-r1.ataque` (03a) recorre todo el código de producción y sigue en verde. El grep de `clases` solo da llamadas `esErrorDeCursor(error)`, la reexportación y el alias de `calificaciones`.
- **Estática del diff:** revisé los 18 archivos de producción cambiados.
  - Sin `?? []`, `disabled`, `console.` ni `fetch(` (salvo los dos de `apiClient`, legítimos).
  - Sin texto de interfaz nuevo fuera de `data.ts`.
  - Sin tipos nuevos: `TraduccionDeErrores` es `import type` con `satisfies`.
  - Las once vistas solo cambian la llamada y su importación.
- **Controles con ref:** ninguno perdió su ref. `editor-de-categorias.tsx` tiene 4, `formulario-publicacion.tsx` 2, `formulario-tema.tsx` 2, `mover-elemento.tsx` 1, `seccion-de-tema.tsx` 2 y `trabajo-view.tsx` 1. La descarga del muro y del material la cubren `descarga-ch3-r2` y CH3-B08, en verde.
- **Decisiones que no son hallazgo, comprobadas y respetadas:**
  - S-01: los códigos con mensaje del servidor se muestran en las consultas;
  - CAL-T-123: esos códigos no se recortan;
  - "máximo dos prefijos";
  - S-04;
  - S-06 en "pulsar la sección activa";
  - DH-2: los caminos de navegación de las consultas, diferidos.

### No atacado y por qué
- **Backend y PA-07:** 03b no toca el backend, así que no corrí su suite.
- **Navegador y 360 px:** no abro navegadores, así que no está verificado.
- **Teclado:** jsdom no convierte Enter en `click`, así que no lo verifiqué. Los manejadores son los mismos.
- **Doble clic en los controles de la "Lista para CHORE-04":** por la Enmienda 3 (DH-7 = b) no escribí pruebas rojas; ver O-r1-1.
- **`admin` y `auth`:** son de 03c.

### Observaciones (sin prueba roja)
- **O-r1-1 — "Lista para CHORE-04" en `clases`:** el grep de `.mutate(` y `.mutateAsync(` da exactamente las 10 filas de 03b sin ref.
  - Las filas: 1 a 6 (`formulario-comentario.tsx:40`, `formulario-clase.tsx:97` y `:112`, `codigo-de-clase.tsx:58`, `formulario-unirse-clase.tsx:36`, `buscador-alumnos.tsx:44` y `buscador-de-maestros.tsx:100`) y 19 a 22 (`maestros-de-clase-view.tsx:67`, `comentarios-de-publicacion.tsx:74`, `publicacion-del-muro.tsx:118` y `tabla-alumnos.tsx:59`).
  - Siguen solo con `isPending` o sin guarda. No hay ninguno nuevo fuera de la lista.
- **O-r1-2 — "Pulsar «Trabajo de clase» estando en ella" conserva el formulario con su error.** Es lo que dice S-06 y lo fija mi caso 1 de O-14. La frase sigue a la vista y repetir el envío cumple la promesa, así que no es hallazgo.
- **O-r1-3 — `import.meta.glob` no incluye el archivo que lo llama:**
  - Una regla estática que recorre "todo `src/`" nunca se revisa a sí misma.
  - Me pasó con mi revisión de invisibles: un U+0301 literal en `errores-ch3-r1.ataque` no se detectaba. Lo corregí con el escape, y ese archivo se revisa ahora desde `apiClient-ch3-r1.ataque`.
  - Para 03c (CH3-C07, "todo `src/`"), conviene que el archivo de la regla se revise desde otro.
- **O-r1-4 — Remedio de T-03 y T-04:** `formulario-clase.tsx`, `formulario-publicacion.tsx` y `hooks.ts` no están en "Cambios por capa" de 03b. Aplicar cualquier remedio es PA-2 o PA-3 para el programador, así que lo decide el arquitecto o el manager.

### Comandos de la verificación propia
- Antes de cada corrida comprobé con `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` que no hubiera ningún `vitest` en marcha. Solo estaba el proceso ajeno de `.cache\codex-runtimes`, que no toqué.
- Corrí una suite a la vez desde `frontend/`, sin procesos de larga vida.
- Las salidas están en el scratchpad de la sesión: `03b-r1-lint.txt`, `03b-r1-test.txt`, `actual-03b-r1-ini.txt` y `actual-03b-r1-fin.txt`.

| Comando | Salida | Última línea |
|---|---|---|
| V-01 al inicio (base: tabla de la ronda 0 de 03b) | 0 | base 212, actual 212, `IGUALES` |
| `npx prettier --write <mis 5 archivos>` (solo los míos) y `npx eslint --config ../eslint.config.mjs <mis 5>` | 0 | sin problemas |
| `npm run lint` | 0 | `> tsc -b` (antes: `All matched files use Prettier code style!`) |
| `npm run test` (15:46:43Z a 15:51:56Z) | 1 | `Test Files  1 failed \| 223 passed (224)` · `Tests  4 failed \| 4104 passed (4108)` · `Duration  304.77s`; `grep -c "Test timed out"` = 0; los 4 rojos son T-03 y T-04 |
| `npx vitest list <archivo> \| grep -c " > "` de las 5 nuevas | 0 | 91 · 88 · 3 · 7 · 18 = 207 |
| V-01 al cierre | 0 | 217 archivos: las 212 de la ronda 0 idénticas; el `diff` solo trae las 5 nuevas |
| `git diff --stat 1f11d38e -- frontend/src` al cierre | 0 | `23 files changed, 123 insertions(+), 105 deletions(-)`, lo mismo que verificó el manager. Mis archivos son nuevos y no cuentan |

Cifras frente al programador y al manager: de 219 a 224 archivos (+5) y de 3901 a 4108 casos (+207 = 91 + 88 + 3 + 7 + 18).

### Tabla de SHA-256 de las 217 `*.ataque` al cierre de la ronda 1 de CHORE-03 03b
Hay cinco nuevas, marcadas "Nueva (CHORE-03 03b, r1)". Las 212 restantes son iguales a la tabla de la ronda 0 de 03b, incluidas las dos reescrituras C-2 y C-3. Se reproduce con el comando de V-01. Los hash van en mayúsculas, así que compárense sin distinguir mayúsculas.

| SHA-256 | Archivo | Nota |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `5E02A27716D63E8CE0FE6B6171BFF089EB3EE2548260349B16950D7E65A1BCF9` | `backend/test/calificaciones-01a-r1.ataque.test.ts` |  |
| `AFB531E7CCAB1CB53F0322D7D099A7F435DBD42325DE8C225525E3784B93F6CC` | `backend/test/calificaciones-01a-r2.ataque.test.ts` |  |
| `DD919EBD74A2C6AC60C244A1563B46895821B0D25E5051CDA25FFFB72B653416` | `backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` |  |
| `B09BAAEC53455CEA1A0674890EBD9353007E6F2628001446E873B09279FFBA07` | `backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` |  |
| `29EED2E93AF2775A4605160EA533BD462FD03CB1CFE4C47154898358A7255869` | `backend/test/calificaciones-estatico-01b-r1.ataque.test.ts` |  |
| `6E4C0EB47FF8020B0A539E5B70B24C8C1D05F7773EA092CD513E39C68CF4534E` | `backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts` |  |
| `6E3C92C13F146A01C8DCFDC7DD04BEA59F0E2562051F6AC65F95F924EF73E4DB` | `backend/test/categorias-01a-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `47B02C6D3916713BF9236A619FDB59A641D2E805F1F0B7E9B2C161FE719DDC3A` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `E4E9365EA010F3F670B6C1194D1A592E95DB43BFF0496D4EA1646FC5225CA8B4` | `backend/test/gradebook-01b-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `2684916C88B9405706F82DA3F9B2FFD0B3626A11AF79E20EA146FDFD1D52C319` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `3790777831A1FACB053D0719D85AB404593954416B1443A1A59530E09E2C81DC` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `BC6D49F9FC1F5EB20E305945FEF57CAEEBEB108BFF5D5CF4BA10B8040687D69C` | `backend/test/mis-calificaciones-01b-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `CCEA34C962FC8F14A49C64EAFA8119DAE5030E1302ED94FE369299EC49182BB8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `C67FA558FA7AE23821175478C8CB7D4874EE5F4D6CB84D0851F9A551B8AB455B` | `frontend/src/app/rutas-01d-r1.ataque.test.tsx` |  |
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `11C6D9C55BE91AA41E8525345E3795E34B8E1E661FF7CDD901F729760A033CFD` | `frontend/src/components/adjuntos/errores-ch3-r1.ataque.test.ts` |  |
| `48F5FF8FEF35FAA6D8500FAE4A53CA953D7F661100A5C4879BA58E68972AB2DE` | `frontend/src/components/foco/foco-01d-r1.ataque.test.ts` |  |
| `36A104515F2EA87F143B2CFC00AEF9A33E6DDDB666844C1A9C977557EECA20EF` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `4BCD3E34B62726FEA718EFB9C482D8C1F504BBE85EF32427BDF4D65A6832D8F1` | `frontend/src/features/calificaciones/cursor-ch3-r1.ataque.test.ts` | Nueva (CHORE-03 03b, r1) |
| `F0CBA6F9B6C4CF1D74ED52AD89943088661370F5A784502F851CD6230912F606` | `frontend/src/features/calificaciones/estatico-01d-r1.ataque.test.ts` |  |
| `5991D8E3D4E694973309F178E5341A2285584CF9ED6006FBB658D7F5A61DE5DD` | `frontend/src/features/calificaciones/gradebook-01d-r1.ataque.test.tsx` |  |
| `C744FB831FA9992C2A9ED0729F9EC3CC089F3167CA19133C6EEE0133382607A1` | `frontend/src/features/calificaciones/gradebook-01d-r2.ataque.test.tsx` |  |
| `8DEA1C2ADC5D228E166CE6037A1A1A827D26E2BDC6D7C8534F146517EBC1AC44` | `frontend/src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx` |  |
| `6F7496CA7652E7B4441A7EB9822E74270D50127AC40BA27B86C83EDFCD5CC3FA` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r1.ataque.test.tsx` |  |
| `24751F358FC5ECD485C475E7025DD881B87FE892F025459A6FF29F615FC5CC66` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r2.ataque.test.tsx` |  |
| `C504D0AD3690781275A6FFB78638A6148550B2FD4EE1ED25A4B154054FC4F80D` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r3.ataque.test.tsx` |  |
| `A8790F734402A957534D0F0E660EEF342F9029CDFC1991BE421D9B3E3C3E9CB7` | `frontend/src/features/calificaciones/secciones-01d-r3.ataque.test.tsx` |  |
| `FB33F2A27BFCCA906549A12610977478BA72E6E7ED8AFD5C5A0A962DEB3EB802` | `frontend/src/features/calificaciones/secciones-01d-r4.ataque.test.tsx` |  |
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `A3880B67FFAA0D15763D1C761CEF1FF8472029C77BFB2211AB079EADB1685325` | `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` |  |
| `66C0B873BC8B9D8E9E01AC871BD6AAAB4328508BEB5EC9371D69463D7C12430D` | `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` |  |
| `5272DE876597EAD9EF838E4D022185C80AA411AAD9E67325573C87F954C5F7A6` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `DCE7FD019A6E32B8E4DF37DD0728E265F5E9449E9EE2723F372EA174FE312464` | `frontend/src/features/clases/descarga-ch3-r2.ataque.test.tsx` |  |
| `DDC9DFACCC8230EC612126FDF29939A8E4311188566E5CFCAA724BD119E959E8` | `frontend/src/features/clases/errores-ch3-r1.ataque.test.ts` | Nueva (CHORE-03 03b, r1) |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `9ADE89B7B54F15CA9B64639469DAE1D9B79C24D5AC5E6FC17857384642FAF0FC` | `frontend/src/features/clases/formularios-ch3-r1.ataque.test.tsx` | Nueva (CHORE-03 03b, r1) |
| `827B8ABCA664145D51A1BBD1C0B558B0EDDFED8707A21A774222B4972BE14FF2` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `A79B6AFC48B2F71D09BE0670D515C53ED33C5C922250C242F917998192A00D28` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` | Reescrita (CHORE-03 03b, C-2/C-3): C-3 |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `6144958ED59E1F14D4DDE52AB82892DE377FCE10504B3B5AF171ADC95292D2F1` | `frontend/src/features/clases/recuperar-ch3-r1.ataque.test.tsx` | Nueva (CHORE-03 03b, r1) |
| `85A7926A0F6831A8375F544CF38FE5585A8E2DCBF73D9726E9A3CFAAB7F76511` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `4303EAC77B98E8978495D9E68FD7725AC436F9DB757DBC0C02C59051436908FA` | `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` |  |
| `A4AA15CEF1A377EED688DAB1B92E5CA4A3943490144CEC861CF7B482845B0362` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` |  |
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `2EF258E946084F17E33936E8FA257551A90323B589859DD2E1F70AABEAF711BF` | `frontend/src/features/tareas/aviso-calificar-01c-r3.ataque.test.tsx` |  |
| `E2FEFD7D744F77C7BDD2BA73A08CC51076D0F6130BF4D0A225E0E972A1DCE111` | `frontend/src/features/tareas/avisos-01c-r2.ataque.test.tsx` |  |
| `11BB5433FB30F268B6D93E1E7814D826BBAB8FB1F173E574FAF52F5A96B5A41E` | `frontend/src/features/tareas/calificar-01c-r1.ataque.test.tsx` |  |
| `D8DACCB56C8DE8D9F1B0F8D1B0907C110E327F4F55B016FC0FE7FC0F25CCC79C` | `frontend/src/features/tareas/calificar-vacio-01c-r4.ataque.test.tsx` |  |
| `EF86C46708F0682BCA5A023E85794639C396EC94D207CAC23CEB13585AB39E75` | `frontend/src/features/tareas/campos-01c-r2.ataque.test.tsx` |  |
| `5FF367EDBA10C9BA9C7E50F8ED874032654FA2ABDC0DD8F4A122A000355472AB` | `frontend/src/features/tareas/cruces-01c-r3.ataque.test.tsx` |  |
| `2938AE2F1C00F63A0372997C7BA68BDC0AB097895769BF9060072A4AC2674C5A` | `frontend/src/features/tareas/descarga-ch3-r2.ataque.test.tsx` |  |
| `0963F14F4842D6D57288876C932496AC09D44B872FC049492EE6E8BA539F3235` | `frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx` |  |
| `4F486CA37D2A2BB6CC26754281D2ADCE086A9D8D4485A069DE7AE5D54E360ACF` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `93A5A0A648669E9C96494A62B2B16082B07296F279E2892BF2C8D47834EE2FC1` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` |  |
| `08A5E1A5642E7FC7553632DD5CF4E07F0EA35C3EF1E7293D010BBC49B09465AA` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` | Reescrita (CHORE-03 03b, C-2/C-3): C-2 |
| `172BE3EFD919C0D3948ECA17C7E808968E2370AFE1F9C2A28CEF7D2DED584B81` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` |  |
| `496652BC59817166F53E00CB828F2119C857C2834063A31764D7876DC150C930` | `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` |  |
| `4E6950F0FE571D6AE41A78380C59C20459FDF19F34C57E9777E4E34A6BC61C58` | `frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts` |  |
| `94D6E6253B266C7F21099AA593AAC7B2600EDCA22AB403AA365DCD789B1C6A97` | `frontend/src/features/tareas/errores-ch3-r2.ataque.test.ts` |  |
| `F614E7369F8C47C40A87AD1F8867FB8EDF7EBC76E94D0BA6C5C59C92CB6347F0` | `frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts` |  |
| `FB387ECBB7E5272D2FFB53D626B51FFD9C57B409D10C560E6A5ECBFA6A2A8C19` | `frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx` |  |
| `E662437641E2634539E09C674A84D353477E3BD05E31A1C11DC96ADC8B863B18` | `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx` |  |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `72B19B6A00B4ADE43B06829BB5BEF1A5CDECF5A7D2AF57369F1E857A1D4A17F5` | `frontend/src/lib/errores-ch3-r1.ataque.test.ts` |  |
| `1D89FA156238E49D4F9FBF986951050597E514031C4F5701275DC4EAF98CDB37` | `frontend/src/lib/errores-ch3-r2.ataque.test.ts` |  |
| `60BC1FC7011E9A0FE5A4C4AA45420F2C7D38ADB9EE2F8D235D09847DBE13AC3A` | `frontend/src/lib/format-01c-r1.ataque.test.ts` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `8BD0E034D4372D34BF145235372EFA27A150A38FD9A04EADB69FD48AC4E06D6C` | `frontend/src/services/apiClient-ch3-r1.ataque.test.ts` | Nueva (CHORE-03 03b, r1) |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `FC4963D3FD93297C427EAD0B85B23615C287E4F2C48079BCA8031D1C2AEE0396` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## Ronda 2 — 03b
Veredicto: **RESISTE**
Verificación propia: lint frontend `0` (`All matched files use Prettier code style!` y `> tsc -b`) · test frontend `Test Files  225 passed (225)` · `Tests  4182 passed (4182)` · `Test timed out` = 0.

- **Rama y base:** rama `chore/chore-03-errores-api`; base de 03b `1f11d38e`.
- **Plan:** `plan.md` SHA-256 `eab43ac5…` (Enmiendas 1 a 4, DH-8 = (a)).
- **Qué leí:**
  - de `aprobacion.md`, desde "## 03b · Ronda 1 del tester" hasta el final (DH-8 = (a) y O-16 arbitrada);
  - `resumen-programador-03b-r2.md`;
  - de `revision.md`, "## Verificación del resumen — 03b — ronda 2" (O-18 y O-19);
  - el código corregido: `clases/data.ts:261-271`, `clases/lib.ts:159-175`, `clases/hooks.ts` (`useCrearPublicacion`, `:597-622`), `formulario-clase.tsx` y `formulario-publicacion.tsx` completos, y `lib/errores-de-api.ts`;
  - las pruebas CH3-B15 (`errores-ch3.test.ts`), CH3-B16 (`formularios-ch3.test.tsx`) y CH3-B17 (`recuperar-ch3.test.tsx`).

Archivos que toqué: una `*.ataque` nueva y este reporte (añadido al final). No toqué producción, las pruebas del programador ni mis `*.ataque` previas (V-01 abajo). La mutación de confirmación no tocó el disco.

| Archivo nuevo | Casos (`npx vitest list <archivo> \| grep -c " > "`) |
|---|---|
| `frontend/src/features/clases/formularios-ch3-r2.ataque.test.tsx` | 41 |

Tiene un `it.each` por bloque, todos del módulo `features/clases`:
- 32 secuencias de envíos;
- 4 cambios de tipo;
- 5 caminos con `rutas` y `Providers`.

En todos el reloj está fijo (`vi.useFakeTimers({ toFake: ["Date"] })`), no hay selectores de estilo, los invisibles van como escapes y cada caso tiene aserciones sin `return` temprano.

### Regresiones
- **V-01 al inicio:** usé el comando de V-01 contra la "Tabla de SHA-256 de las 217 `*.ataque` al cierre de la ronda 1 de CHORE-03 03b": base 217, actual 217, `diff` vacío, `IGUALES`.
- **Mis 5 `*.ataque` de la ronda 1:** `Test Files  5 passed (5)` · `Tests  207 passed (207)`, sin `Test timed out`. Las 4 de T-03 y T-04 (`formularios-ch3-r1.ataque.test.tsx`, "editar clase con «maestroIds: …»" × 2 y "publicar un anuncio con «titulo: …»" × 2) están en verde.
- **Suite completa:** pasó de 224 a 225 archivos (+1, el mío) y de 4141 a 4182 casos (+41, los míos). Los 4141 coinciden con la corrida del programador y con la del manager.
- **T-03 y T-04: cerrados.**

### Hallazgos
Ninguno.

### Atacado sin hallazgos
- **O-18, dos fallos seguidos, con exactamente un mensaje por envío.** Lo mido paso a paso:
  - los avisos nuevos de ese envío;
  - el texto en pantalla;
  - los portadores de error (`aria-invalid="true"` y el `fieldset` de maestros con descripción);
  - la descripción accesible del control;
  - que ningún texto de un envío anterior siga en pantalla;
  - que lo escrito se conserve y que el botón salga de la espera;
  - que no aparezcan rutas ni invisibles en la pantalla ni en los avisos.

  Secuencias del manager (las dos en verde):
  - anuncio: `titulo:` → `texto:` → `titulo:` da un aviso, un `ErrorDeCampo` y un aviso, en ese orden;
  - editar clase: `maestroIds:` → `nombre:` → `maestroIds:` da un aviso, un `ErrorDeCampo` y un aviso, en ese orden.

  Variantes, con rutas dobles y restos entre los pasos:
  - anuncio: `texto:` → `titulo:\u{200B}` → `texto: titulo:`;
  - editar clase: `nombre:` → `maestroIds.0: maestroId:\u{200B}` → `descripcion:`;
  - editar clase: `maestroIds:` vacío → `maestroIds: maestroIds:` → `nombre: maestroIds:`;
  - material: `titulo:` → `temaId: temaId:` → `titulo:titulo:\u0085`;
  - crear clase: `maestroIds:` → `maestroIds.0: maestroId:` → `nombre:`.

  En ningún caso se acumuló el mensaje anterior ni quedó ninguno.
- **El error de un envío anterior cuando el siguiente responde bien o con otro campo:**
  - anuncio `texto:` → éxito;
  - material `titulo:` → éxito;
  - editar clase `nombre:` → `maestroIds:` → éxito.

  En los tres, el `ErrorDeCampo` anterior desaparece, el éxito avisa una vez y no queda ningún portador de error. "Con otro campo" lo cubren las secuencias de O-18.
- **Cambiar de tipo entre envíos:**
  - anuncio `titulo:` (aviso) → «Material» con `titulo:` (`ErrorDeCampo` bajo el título) → «Anuncio» con `titulo:` (aviso, sin `ErrorDeCampo`) → «Material» sin enviar: ningún error bajo el título y ni el segundo ni el tercer mensaje en pantalla;
  - material `texto:` → «Anuncio» con `titulo:\u{3000}\u{2060}`: un solo aviso genérico, y el `texto:` anterior desaparece.

  El formulario y el gancho deciden siempre con el `tipo` de lo enviado.
- **Cambiar de tipo con la publicación en vuelo o justo al asentarse** (respuesta retenida y soltada a mano):
  - **en vuelo:** pulsar el otro tipo no cambia `aria-pressed`;
  - **al asentarse:** pulso el otro tipo en cada una de 40 microtareas mientras la respuesta se procesa, y el tipo enviado sigue presionado.

  En el anuncio con `titulo:` sale exactamente un aviso y, al pasar después a «Material», ningún error bajo el título. En el material con `titulo:` sale exactamente un `ErrorDeCampo` bajo el título y ningún aviso. Una sola petición en los cuatro casos: `publicandoRef` y `crear.isPending` hacen lo que dice el resumen.
- **Rutas dobles y restos de los campos que dependen del modo (un envío, por interfaz):**

  | Formulario | Entradas | Resultado |
  |---|---|---|
  | Anuncio | `titulo: titulo:`, `titulo:titulo:\u{200B}`, `titulo: texto:`, `titulo:` vacío, `titulo:\u0085`, `Titulo:` (mayúscula, no es un campo) y `titulo.0:` | Un aviso legible |
  | Material | `titulo: titulo:`, `titulo: texto:` | `ErrorDeCampo` bajo el título |
  | Material | `texto: titulo:` | `ErrorDeCampo` bajo la descripción |
  | Material | `titulo:` vacío | `ErrorDeCampo` con el genérico |
  | Editar clase | `maestroIds: maestroIds:`, `maestroIds: maestroId:`, `maestroIds: nombre:`, `maestroIds:\u0085` y `maestroIds:\u{00A0}\u{200B}\n` | Un aviso |
  | Crear clase | `maestroIds: maestroIds:`, `maestroIds: nombre:`, `maestroIds:` vacío | `ErrorDeCampo` en el grupo «Maestros de la clase» |
  | Crear clase | `maestroIds.0: maestroId:` | Un aviso con el genérico |

  Crear clase y material dan lo mismo que en la ronda 1 (mis casos de la ronda 1 siguen en verde).
- **O-19, con `rutas` y `Providers` reales y sesión de admin.** Retroceso y avance del historial (`router.navigate(-1)` y `(1)`), con el reloj adelantado 5, 10 o 15 s, siempre antes del `staleTime` de 30 s:
  - **(1)** «Cancelar» y «atrás»;
  - **(2)** «Cancelar», «atrás», «adelante» (la clase se pinta sin error) y «atrás» otra vez;
  - **(3)** «Editar clase» abierta desde la clase: «atrás» a la clase y «adelante» al formulario.

  En los tres, el formulario monta con «Álgebra I», sin portadores de error ni el genérico. «Guardar cambios» manda un `PUT` nuevo, con lo escrito en el cuerpo, que da el éxito y navega a `/admin/clases/:claseId`. `avisos()` sigue siendo exactamente `[GENERICO]`.
- **"Repetir el control" con el router real** (el complemento que pedía O-19):
  - en editar clase (`maestroIds:\u{200B}`), «Guardar cambios» otra vez manda un `PUT` nuevo con «Álgebra II», da el éxito y navega;
  - en el anuncio del muro como maestro (`titulo:\u{200B}`), «Publicar anuncio» otra vez manda un `POST` nuevo con el texto, da el éxito y vacía el campo.

  En los dos no hay un segundo aviso de error. Confirma lo que el manager razonó: sin `mutations` en `providers.tsx`, el router mínimo de CH3-B17 no cambia el resultado.
- **Mutación de confirmación** (sin tocar el disco):
  - **Cómo la corrí:** con una configuración temporal de Vitest en el scratchpad (`vitest.mutante-03b-r2.config.mts`). Su plugin de Vite cambia el código solo al transformar `clases/data.ts` o `clases/hooks.ts`. Las lecturas `?raw` de CH3-B15 (4) no pasan por él.
  - **Grupo de pruebas:** los 5 archivos `errores-ch3.test.ts`, `formularios-ch3.test.tsx`, `recuperar-ch3.test.tsx`, `formularios-ch3-r1.ataque.test.tsx` y `formularios-ch3-r2.ataque.test.tsx` (281 casos).
  - **Los archivos no cambiaron:** SHA-256 iguales antes y después en `data.ts` (`eb105c52…`), `lib.ts` (`d8c9314d…`), `hooks.ts` (`3b2445f1…`), `formulario-clase.tsx` (`bfe7ffb3…`) y `formulario-publicacion.tsx` (`05ff78f3…`).

  | Mutante | Resultado | Rojos por archivo |
  |---|---|---|
  | Control (`SIN_MUTANTE=1`) | `Tests  281 passed (281)` | — |
  | (i) la lista de `editar` recupera `maestroIds` | `Tests  20 failed \| 261 passed (281)` | CH3-B15 2 (fila editar × maestroIds y (3)) · CH3-B16 2 · CH3-B17 2 · mi r1 2 (T-03) · mi r2 12 |
  | (ii) la lista de `anuncio` recupera `titulo` | `Tests  21 failed \| 260 passed (281)` | CH3-B15 2 · CH3-B16 4 (anuncio × 2, (e) y (f)) · CH3-B17 1 · mi r1 2 (T-04) · mi r2 12 |
  | (iii) el gancho decide con la lista fija de `"material"` en vez de `datos.tipo` | `Tests  19 failed \| 262 passed (281)` | CH3-B15 0 (prueba las funciones, no el gancho: es lo esperado) · CH3-B16 4 · CH3-B17 1 · mi r1 2 · mi r2 12 |
  | (iii-b, extra) el gancho decide con la lista fija de `"anuncio"` | `Tests  12 failed \| 269 passed (281)` | CH3-B16 2 (material × título) · mi r1 2 (material con `titulo:`) · mi r2 8 |

  Las tres mutaciones que pidió el orquestador las detectan CH3-B16 y mis pruebas; (i) y (ii) también CH3-B15. La (iii) solo la ven las pruebas de interfaz, y la cubren CH3-B16, CH3-B17 y las mías.
- **Reglas estáticas del remedio (grep propio sobre la producción de `frontend/src`):**
  - `"maestroIds"` como lista y `["titulo", "texto"]` solo están escritos en `clases/data.ts:264` y `:270`. El único otro `"maestroIds"` es el filtro de `alElegir` (`formulario-clase.tsx:47`), que ya estaba.
  - `erroresDeLaClaseDeApi` y `erroresDeLaPublicacionDeApi` solo se llaman en los dos formularios y en `useCrearPublicacion`. Nadie más usa `useCrearPublicacion`.
  - `git diff --stat 1f11d38e -- frontend/src`: `26 files changed, 159 insertions(+), 112 deletions(-)`, lo mismo que verificó el manager. Mi archivo es nuevo y no cuenta.
- **El modo sale de lo enviado:**
  - el formulario usa el `datos` del parámetro de `handlePublicar` (`:121`, `:148`);
  - el gancho usa las `variables` de `mutateAsync({ ...datos, archivoIds })`, que conservan `tipo`;
  - `formulario-clase.tsx` usa la prop `modo`, fija mientras el formulario vive.

  No encontré ningún camino en que decidan distinto.
- **Hermanos (los doce del resumen):** los repasé contra el código y no encontré ninguno nuevo.
  - comentario (`["texto"]`), tema (`erroresDelTemaDeApi` en el formulario y en los dos ganchos), unirse y categorías no dependen del modo;
  - `useCrearClase` y `useEditarClase` no tienen `onError`.
- **Decisiones que no son hallazgo:** las respeté.
  - O-16 (vista desmontada en crear y editar clase, comentario, tema y material);
  - las del plan (S-01, S-04, S-05 con N-07, CAL-T-123, "máximo dos prefijos", la ruta precedida de un invisible o de un espacio);
  - la "Lista para CHORE-04": `formulario-clase.tsx` sigue sin ref (fila 2) y no escribí pruebas de doble clic.

### No atacado y por qué
- **Backend y PA-07:** 03b no toca el backend, así que no corrí su suite.
- **Navegador y 360 px:** no abro navegadores, así que no está verificado.
- **Teclado:** jsdom no convierte Enter en `click`, así que no lo verifiqué. El manejador es el mismo `onSubmit`.
- **Doble clic en los controles de la "Lista para CHORE-04":** por la Enmienda 3 (DH-7 = b) no escribí pruebas rojas.
- **`admin` y `auth`:** son de 03c. Ahí queda el punto de ataque de la Enmienda 4: formularios con modos que asignen un `VALIDACION` a un campo.

### Observaciones (sin prueba roja)
- **O-r2-1 — El anuncio con `texto:` y la vista desmontada:**
  - no da ningún mensaje: el gancho calla porque `texto` sí se pinta en el anuncio, y el formulario ya no está;
  - es el mismo mecanismo que O-16 (un campo que sí se pinta, con la vista desmontada) y ya pasaba en `1f11d38e`;
  - O-16 nombra "material" pero no "anuncio": lo anoto para que el arbitraje lo cubra por su nombre.

  Lo saqué de leer el código, no de una prueba.
- **O-r2-2 — Un `ErrorDeCampo` del título sobrevive a un cambio de tipo sin envío:**
  - pasa en el material con `titulo:` → «Anuncio» → «Material»: el error sigue en el estado, oculto mientras el título no se pinta, y vuelve a verse;
  - es el error del último envío sobre el mismo valor, que la persona ya vio, y el siguiente envío lo limpia (`setErrores({})`, que mis secuencias comprueban);
  - es el comportamiento de `1f11d38e`, no una regresión, y no da ni dos mensajes ni ninguno para un envío.

  Lo saqué de leer el código.
- **O-r2-3 — Títulos de `it.each`:** con `$objeto.campo`, vitest recorta a unos 40 caracteres, y dos casos del programador quedan con el mismo título visible. En mi archivo usé `%s` con tuplas para que cada título salga completo y distinto en `npx vitest list`.

### Comandos de la verificación propia
- Antes de cada corrida comprobé con `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` que no hubiera ningún `vitest` en marcha (0). Solo estaba el proceso ajeno de `.cache\codex-runtimes`, que no toqué.
- Corrí una suite a la vez desde `frontend/`, sin procesos de larga vida.
- Las salidas están en el scratchpad de la sesión: `03b-r2-regresiones-r1.txt`, `03b-r2-lint.txt`, `03b-r2-test.txt`, `03b-r2-mutante-{control,editar,anuncio,gancho,gancho-anuncio}.txt`, `sha-03b-r2-{antes,despues}.txt`, `actual-03b-r2-{ini,fin}.txt` y `03b-r2-lista.txt`.

| Comando | Salida | Última línea |
|---|---|---|
| V-01 al inicio (base: la tabla de las 217 de la ronda 1 de 03b) | 0 | base 217, actual 217, `IGUALES` |
| `npx vitest run` de mis 5 `*.ataque` de la ronda 1 | 0 | `Tests  207 passed (207)`; `Test timed out` = 0 |
| `npx prettier --write` y `npx eslint --config ../eslint.config.mjs` (solo mi archivo) | 0 | sin problemas; ningún invisible literal (revisado con un script) |
| `npx vitest list src/features/clases/formularios-ch3-r2.ataque.test.tsx \| grep -c " > "` | 0 | `41` |
| Mutación: `npx vitest run --config <scratchpad>/vitest.mutante-03b-r2.config.mts <5 archivos>` | 0 / 1 | ver la tabla de arriba |
| `npm run lint` (corrida final) | 0 | `> tsc -b` (antes: `All matched files use Prettier code style!`) |
| `npm run test` (corrida final, 11:07:42) | 0 | `Test Files  225 passed (225)` · `Tests  4182 passed (4182)` · `Duration  299.34s`; `grep -c "Test timed out"` = 0 |
| V-01 al cierre | 0 | 218 archivos: las 217 de la ronda 1 idénticas; el `diff` solo trae la nueva |

Antes de la corrida final había hecho otra completa, idéntica, con la primera versión de mi archivo (`Tests  4182 passed (4182)`, `Duration  194.87s`). Después solo cambié los títulos de los `it.each` (`$nombre` a `%s`), y volví a correr la mutación con los mismos conteos.

### Tabla de SHA-256 de las 218 `*.ataque` al cierre de la ronda 2 de CHORE-03 03b
Hay una nueva, marcada "Nueva (CHORE-03 03b, r2)". Las 217 restantes son iguales a la tabla de la ronda 1 de 03b. Las cinco de la ronda 1 van marcadas "Ronda 1 (CHORE-03 03b)", y C-2 y C-3 conservan su nota. Se reproduce con el comando de V-01. Los hash van en mayúsculas, así que compárense sin distinguir mayúsculas.

| SHA-256 | Archivo | Nota |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `5E02A27716D63E8CE0FE6B6171BFF089EB3EE2548260349B16950D7E65A1BCF9` | `backend/test/calificaciones-01a-r1.ataque.test.ts` |  |
| `AFB531E7CCAB1CB53F0322D7D099A7F435DBD42325DE8C225525E3784B93F6CC` | `backend/test/calificaciones-01a-r2.ataque.test.ts` |  |
| `DD919EBD74A2C6AC60C244A1563B46895821B0D25E5051CDA25FFFB72B653416` | `backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` |  |
| `B09BAAEC53455CEA1A0674890EBD9353007E6F2628001446E873B09279FFBA07` | `backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` |  |
| `29EED2E93AF2775A4605160EA533BD462FD03CB1CFE4C47154898358A7255869` | `backend/test/calificaciones-estatico-01b-r1.ataque.test.ts` |  |
| `6E4C0EB47FF8020B0A539E5B70B24C8C1D05F7773EA092CD513E39C68CF4534E` | `backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts` |  |
| `6E3C92C13F146A01C8DCFDC7DD04BEA59F0E2562051F6AC65F95F924EF73E4DB` | `backend/test/categorias-01a-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `47B02C6D3916713BF9236A619FDB59A641D2E805F1F0B7E9B2C161FE719DDC3A` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `E4E9365EA010F3F670B6C1194D1A592E95DB43BFF0496D4EA1646FC5225CA8B4` | `backend/test/gradebook-01b-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `2684916C88B9405706F82DA3F9B2FFD0B3626A11AF79E20EA146FDFD1D52C319` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `3790777831A1FACB053D0719D85AB404593954416B1443A1A59530E09E2C81DC` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `BC6D49F9FC1F5EB20E305945FEF57CAEEBEB108BFF5D5CF4BA10B8040687D69C` | `backend/test/mis-calificaciones-01b-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `CCEA34C962FC8F14A49C64EAFA8119DAE5030E1302ED94FE369299EC49182BB8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `C67FA558FA7AE23821175478C8CB7D4874EE5F4D6CB84D0851F9A551B8AB455B` | `frontend/src/app/rutas-01d-r1.ataque.test.tsx` |  |
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `11C6D9C55BE91AA41E8525345E3795E34B8E1E661FF7CDD901F729760A033CFD` | `frontend/src/components/adjuntos/errores-ch3-r1.ataque.test.ts` |  |
| `48F5FF8FEF35FAA6D8500FAE4A53CA953D7F661100A5C4879BA58E68972AB2DE` | `frontend/src/components/foco/foco-01d-r1.ataque.test.ts` |  |
| `36A104515F2EA87F143B2CFC00AEF9A33E6DDDB666844C1A9C977557EECA20EF` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `86ADAA9A093A987DAFD97E279E600211CBDF6CEF97879D16FA2D8A9D2846F8B5` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` |  |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `4BCD3E34B62726FEA718EFB9C482D8C1F504BBE85EF32427BDF4D65A6832D8F1` | `frontend/src/features/calificaciones/cursor-ch3-r1.ataque.test.ts` | Ronda 1 (CHORE-03 03b) |
| `F0CBA6F9B6C4CF1D74ED52AD89943088661370F5A784502F851CD6230912F606` | `frontend/src/features/calificaciones/estatico-01d-r1.ataque.test.ts` |  |
| `5991D8E3D4E694973309F178E5341A2285584CF9ED6006FBB658D7F5A61DE5DD` | `frontend/src/features/calificaciones/gradebook-01d-r1.ataque.test.tsx` |  |
| `C744FB831FA9992C2A9ED0729F9EC3CC089F3167CA19133C6EEE0133382607A1` | `frontend/src/features/calificaciones/gradebook-01d-r2.ataque.test.tsx` |  |
| `8DEA1C2ADC5D228E166CE6037A1A1A827D26E2BDC6D7C8534F146517EBC1AC44` | `frontend/src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx` |  |
| `6F7496CA7652E7B4441A7EB9822E74270D50127AC40BA27B86C83EDFCD5CC3FA` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r1.ataque.test.tsx` |  |
| `24751F358FC5ECD485C475E7025DD881B87FE892F025459A6FF29F615FC5CC66` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r2.ataque.test.tsx` |  |
| `C504D0AD3690781275A6FFB78638A6148550B2FD4EE1ED25A4B154054FC4F80D` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r3.ataque.test.tsx` |  |
| `A8790F734402A957534D0F0E660EEF342F9029CDFC1991BE421D9B3E3C3E9CB7` | `frontend/src/features/calificaciones/secciones-01d-r3.ataque.test.tsx` |  |
| `FB33F2A27BFCCA906549A12610977478BA72E6E7ED8AFD5C5A0A962DEB3EB802` | `frontend/src/features/calificaciones/secciones-01d-r4.ataque.test.tsx` |  |
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `A3880B67FFAA0D15763D1C761CEF1FF8472029C77BFB2211AB079EADB1685325` | `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` |  |
| `66C0B873BC8B9D8E9E01AC871BD6AAAB4328508BEB5EC9371D69463D7C12430D` | `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` |  |
| `5272DE876597EAD9EF838E4D022185C80AA411AAD9E67325573C87F954C5F7A6` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `DCE7FD019A6E32B8E4DF37DD0728E265F5E9449E9EE2723F372EA174FE312464` | `frontend/src/features/clases/descarga-ch3-r2.ataque.test.tsx` |  |
| `DDC9DFACCC8230EC612126FDF29939A8E4311188566E5CFCAA724BD119E959E8` | `frontend/src/features/clases/errores-ch3-r1.ataque.test.ts` | Ronda 1 (CHORE-03 03b) |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `9ADE89B7B54F15CA9B64639469DAE1D9B79C24D5AC5E6FC17857384642FAF0FC` | `frontend/src/features/clases/formularios-ch3-r1.ataque.test.tsx` | Ronda 1 (CHORE-03 03b) |
| `6E03C504C9B6A6058E0C0AA8D7A297086DD8F6F935F4F681E361699A6887CE62` | `frontend/src/features/clases/formularios-ch3-r2.ataque.test.tsx` | Nueva (CHORE-03 03b, r2) |
| `827B8ABCA664145D51A1BBD1C0B558B0EDDFED8707A21A774222B4972BE14FF2` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `A79B6AFC48B2F71D09BE0670D515C53ED33C5C922250C242F917998192A00D28` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` | Reescrita (CHORE-03 03b, C-2/C-3): C-3 |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `6144958ED59E1F14D4DDE52AB82892DE377FCE10504B3B5AF171ADC95292D2F1` | `frontend/src/features/clases/recuperar-ch3-r1.ataque.test.tsx` | Ronda 1 (CHORE-03 03b) |
| `85A7926A0F6831A8375F544CF38FE5585A8E2DCBF73D9726E9A3CFAAB7F76511` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `4303EAC77B98E8978495D9E68FD7725AC436F9DB757DBC0C02C59051436908FA` | `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` |  |
| `A4AA15CEF1A377EED688DAB1B92E5CA4A3943490144CEC861CF7B482845B0362` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` |  |
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `2EF258E946084F17E33936E8FA257551A90323B589859DD2E1F70AABEAF711BF` | `frontend/src/features/tareas/aviso-calificar-01c-r3.ataque.test.tsx` |  |
| `E2FEFD7D744F77C7BDD2BA73A08CC51076D0F6130BF4D0A225E0E972A1DCE111` | `frontend/src/features/tareas/avisos-01c-r2.ataque.test.tsx` |  |
| `11BB5433FB30F268B6D93E1E7814D826BBAB8FB1F173E574FAF52F5A96B5A41E` | `frontend/src/features/tareas/calificar-01c-r1.ataque.test.tsx` |  |
| `D8DACCB56C8DE8D9F1B0F8D1B0907C110E327F4F55B016FC0FE7FC0F25CCC79C` | `frontend/src/features/tareas/calificar-vacio-01c-r4.ataque.test.tsx` |  |
| `EF86C46708F0682BCA5A023E85794639C396EC94D207CAC23CEB13585AB39E75` | `frontend/src/features/tareas/campos-01c-r2.ataque.test.tsx` |  |
| `5FF367EDBA10C9BA9C7E50F8ED874032654FA2ABDC0DD8F4A122A000355472AB` | `frontend/src/features/tareas/cruces-01c-r3.ataque.test.tsx` |  |
| `2938AE2F1C00F63A0372997C7BA68BDC0AB097895769BF9060072A4AC2674C5A` | `frontend/src/features/tareas/descarga-ch3-r2.ataque.test.tsx` |  |
| `0963F14F4842D6D57288876C932496AC09D44B872FC049492EE6E8BA539F3235` | `frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx` |  |
| `4F486CA37D2A2BB6CC26754281D2ADCE086A9D8D4485A069DE7AE5D54E360ACF` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `93A5A0A648669E9C96494A62B2B16082B07296F279E2892BF2C8D47834EE2FC1` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` |  |
| `08A5E1A5642E7FC7553632DD5CF4E07F0EA35C3EF1E7293D010BBC49B09465AA` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` | Reescrita (CHORE-03 03b, C-2/C-3): C-2 |
| `172BE3EFD919C0D3948ECA17C7E808968E2370AFE1F9C2A28CEF7D2DED584B81` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` |  |
| `496652BC59817166F53E00CB828F2119C857C2834063A31764D7876DC150C930` | `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` |  |
| `4E6950F0FE571D6AE41A78380C59C20459FDF19F34C57E9777E4E34A6BC61C58` | `frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts` |  |
| `94D6E6253B266C7F21099AA593AAC7B2600EDCA22AB403AA365DCD789B1C6A97` | `frontend/src/features/tareas/errores-ch3-r2.ataque.test.ts` |  |
| `F614E7369F8C47C40A87AD1F8867FB8EDF7EBC76E94D0BA6C5C59C92CB6347F0` | `frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts` |  |
| `FB387ECBB7E5272D2FFB53D626B51FFD9C57B409D10C560E6A5ECBFA6A2A8C19` | `frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx` |  |
| `E662437641E2634539E09C674A84D353477E3BD05E31A1C11DC96ADC8B863B18` | `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx` |  |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `72B19B6A00B4ADE43B06829BB5BEF1A5CDECF5A7D2AF57369F1E857A1D4A17F5` | `frontend/src/lib/errores-ch3-r1.ataque.test.ts` |  |
| `1D89FA156238E49D4F9FBF986951050597E514031C4F5701275DC4EAF98CDB37` | `frontend/src/lib/errores-ch3-r2.ataque.test.ts` |  |
| `60BC1FC7011E9A0FE5A4C4AA45420F2C7D38ADB9EE2F8D235D09847DBE13AC3A` | `frontend/src/lib/format-01c-r1.ataque.test.ts` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `8BD0E034D4372D34BF145235372EFA27A150A38FD9A04EADB69FD48AC4E06D6C` | `frontend/src/services/apiClient-ch3-r1.ataque.test.ts` | Ronda 1 (CHORE-03 03b) |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `FC4963D3FD93297C427EAD0B85B23615C287E4F2C48079BCA8031D1C2AEE0396` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## Ronda 0 — 03c
Veredicto: **RONDA 0 CERRADA (con PA-12 por carga registrada)**
Verificación propia: lint frontend `0` (`> tsc -b`, 0 `error TS`) · test frontend `Test Files  2 failed | 223 passed (225)` · `Tests  1 failed | 4178 passed | 3 skipped (4182)` · `Test timed out` = 0, `Hook timed out` = 1

Motivo de la PARADA (ya resuelta; ver «PA-12 (carga) resuelta por el orquestador», al final de esta sección): además del rojo esperado de C-4 (1 caso), la corrida completa trajo **un segundo rojo que no está en §D-R0**: la suite `src/features/clases/recuperar-ch3-r1.ataque.test.tsx` (mía, ronda 1 de 03b) cayó en su `beforeAll` por `Hook timed out in 10000ms` al importar `@/app/router`, y sus 3 casos quedaron `skipped`. El encargo dice que cualquier otro rojo es PARADA, así que me detengo aquí: **no repetí la corrida** para limpiarla ni corrí el archivo aislado. Lo demás de la ronda 0 (V-01, C-4, el grep del inventario y la tabla de SHA-256) quedó hecho y se reporta abajo. La decisión de cómo seguir es del orquestador o del humano.

Rama `chore/chore-03-errores-api`, `git log -1` = `9272501e715b3bb2b189b723d9c956ee036abc81` (commit de 03b). Plan `plan.md` SHA-256 `eab43ac5e37597a5b26e39e802a4c5331a230d629cd1fa8067c3058aa2a2dc13` (Enmiendas 1 a 4), igual al que registra `aprobacion.md`. En esta ronda no se ataca nada.

Archivos tocados por el tester en esta ronda: `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` (C-4) y este reporte. Nada más.

### V-01 — las 218 `*.ataque` de la base, sin cambios (antes de la reescritura)
Comando (Git Bash, desde la raíz), el mismo de las rondas anteriores:

```bash
git ls-files -co --exclude-standard | grep -E '\.ataque\.test\.tsx?$' | sort | xargs sha256sum \
  | sed 's/ \*/  /' | awk '{print tolower($1)"  "$2}' | sort -k2 > actual.txt
# base: filas `| <hash> | <archivo> |` de "Tabla de SHA-256 de las 218 `*.ataque` al cierre de la
# ronda 2 de CHORE-03 03b" de este reporte, hash en minúsculas
diff base-03b-r2.txt actual.txt && echo IGUALES
```

Resultado: base 218 filas, actual 218 archivos, `diff` vacío, `IGUALES`. **218 de 218 iguales, ninguna de más ni de menos.**

Estado del árbol al arrancar:
- `git diff --stat 9272501e -- frontend shared backend`: vacío.
- `git status --porcelain --untracked-files=all`: solo `M docs/ESTADO.md` y `M docs/trabajo/CHORE-03-errores-api/aprobacion.md`. Son del orquestador: el registro del commit de 03b y el arranque de 03c. Quedan fuera de "No se toca", así que no es PARADA.

### Reescritura C-4 (A-5)
Archivo y caso: `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` › "ataque (AUTH-02b r1): ficha, invitación y corrección de correo › invitar: 400 VALIDACION del servidor muestra su mensaje". El caso empieza en la línea 474 y la aserción estaba en la 481.

Diff mínimo (`git diff -- frontend/src/features/admin/cuentas-r1.ataque.test.tsx`):

```diff
@@ -478,7 +478,9 @@ describe("ataque (AUTH-02b r1): ficha, invitación y corrección de correo", ()
     fireEvent.change(screen.getByLabelText("Correo"), { target: { value: carla.email } })
     fireEvent.click(screen.getByRole("button", { name: "Enviar invitación" }))
 
-    expect(await screen.findByRole("alert")).toHaveTextContent("nombre: caracteres no permitidos")
+    const alerta = await screen.findByRole("alert")
+    expect(alerta).toHaveTextContent("caracteres no permitidos")
+    expect(alerta).not.toHaveTextContent("nombre:")
   })
```

- Es la reescritura exacta del plan (§D-R0, C-4): `toHaveTextContent("caracteres no permitidos")` y `not.toHaveTextContent("nombre:")`, las dos sobre la misma alerta. Además de esas dos, la única línea nueva es `const alerta`, que evita buscar la alerta dos veces.
- No cambian el título, el doble (`errorJson(400, "VALIDACION", "nombre: caracteres no permitidos")`), el llenado ni el clic. Nada más del archivo cambia (`git diff --stat`: 3 inserciones, 1 borrado).
- Lo que protege sigue igual: un `400 VALIDACION` del servidor al invitar llega a la persona como una alerta con el mensaje del servidor. Ahora, además, sin la ruta.
- `npx prettier --check` del archivo: `All matched files use Prettier code style!`. Finales de línea LF, como el resto del archivo.
- Las reglas estáticas del mismo archivo ("reglas de módulos") solo miran los archivos de producción de `features/admin` (filtran `.test.`), así que la reescritura no las toca.

### Grep de confirmación del inventario de §D-R0 para 03c
Sobre `frontend/src/**/*.test.{ts,tsx}` en `9272501e`, con C-4 ya reescrita. Resultado: **el inventario del plan está completo para 03c. No hay ninguna prueba sin inventariar.**

| # | Búsqueda | Resultado |
|---|---|---|
| 1 | Quién llama a `mensajeDeErrorAuth`, `mensajeDeErrorAdmin` o `mensajeDeConsultaAdmin`, o lee `CODIGOS_CON_MENSAJE_DEL_SERVIDOR`, `MENSAJES_ERROR_ADMIN` o `MENSAJES_ERROR_AUTH` | `features/auth/lib.test.ts` (líneas 64-83) y `features/admin/lib.test.ts` (13-27). En `admin/lib.test.ts` solo hay `CORREO_EN_USO`, `ERROR_INTERNO` y un `Error` que no es `ApiError`: con el contrato dan la misma salida. En `auth/lib.test.ts` solo cambian las líneas 72-74 (`"email: Escribe un correo válido"`), que son **N-L3**, del programador; "toString" ya da el genérico. Los demás aciertos (`clases/errores-ch3*`, `tareas/errores-ch3*` y `lib/errores-ch3-r2.ataque`) importan la `CODIGOS_CON_MENSAJE_DEL_SERVIDOR` de su propio módulo, no la de `admin` |
| 2 | `"VALIDACION"` en las pruebas de `features/admin`, `features/auth`, `app`, `components/layout`, `services` y `lib` | `admin/cuentas-r1.ataque:475` (C-4). `auth/lib.test.ts:73` (N-L3). `auth/enlace-r1.ataque:327`: `errorJson(400, "VALIDACION")` con el mensaje por defecto, "mensaje del servidor"; no lleva ruta y da la misma salida. `app/cuentas-r1.ataque:336`: con `"contrasenaNueva: muy larga"` espera la subcadena `"muy larga"`; con el contrato sale "muy larga" y sigue en verde, como ya decía §D-R0. `app/muro-recuperar-c-r3` y `-r4`: cursor de `clases`. `services/apiClient-ch3*`: solo si redirige. `lib/errores-de-api.test.ts`: el contrato, con su propia traducción |
| 3 | Aserciones con una ruta delante del texto: `(toHaveTextContent\|toBe\|findByText\|getByText)\("<ruta>: ` y líneas que empiezan con `"<ruta>: ` (las de varias líneas), en `admin`, `auth`, `app`, `components` y `services` | Solo `auth/lib.test.ts:74` (N-L3) |
| 4 | Consultas de `admin` (`tabla-enlaces.tsx:190`, `registrados-del-enlace.tsx:33`) con texto de zod: `Too big`, `limite:` y cualquier `4xx` en las pruebas de `admin` | Ninguna prueba manda un `VALIDACION` a la lista de enlaces ni a los registrados. Los `4xx` de `admin` son `USUARIO_NO_ENCONTRADO`, `CORREO_EN_USO` y `OPERACION_NO_PERMITIDA`, con texto propio, y `CUPO_DIARIO_INSUFICIENTE` (`maestros-03c-r1.ataque:247` y `maestros-view.test.tsx:590`), con texto visible: paso 5, misma salida |
| 5 | Pruebas que dependen de que "VALIDACION" esté en la lista de `admin` | Ninguna prueba lee esa lista ni el texto de `admin/data.ts`. Las estáticas que leen `features/auth/data.ts` (`components/layout/estatico-r1.ataque`, `TEXTOS_CAMPO_CONTRASENA`) no miran los errores |
| 6 | Los cinco archivos que el encargo pide revisar | `admin/cuentas-r1.ataque`: solo C-4. `admin/maestros-03b-r1.ataque`: sin `VALIDACION` ni texto con ruta; su `errorJson` por defecto es "mensaje del servidor". `app/cuentas-r1.ataque`: la fila 336, en verde con el contrato. `auth/enlace-r1.ataque`: sin ruta. `clases/maestros-02c-r1.ataque`: es de `features/clases` (03b) y no llama a funciones de `admin` ni de `auth` |
| 7 | Reglas estáticas que leen todo `src/` (`import.meta.glob("/src/**/…")`, 26 archivos) y qué miran de `admin` o `auth` | `components/layout/estatico-r1.ataque` mira los campos de contraseña y `TEXTOS_CAMPO_CONTRASENA` en `auth`. `styles/clases-r1.ataque` cuenta los `enEspera=` de cada archivo de `admin` y `auth`. §D-4 no toca esas líneas. Las de `clases/errores-ch3-r1.ataque` y `lib/errores-ch3-r1.ataque` tienen su alcance fijo (`clases` y `calificaciones`; `tareas` y `adjuntos`). Nota para mi ronda 1: `clases/errores-ch3-r1.ataque:487-493` cuenta exactamente 4 archivos `-ch3-r1.ataque` en `features/clases`, `features/calificaciones` y `services`. Los de 03c van en `features/admin` y `features/auth`, fuera de ese conteo |

### Comandos de la verificación propia
- Antes de la corrida comprobé con `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` que no hubiera ningún `vitest` en marcha. Solo estaba el proceso ajeno de `.cache\codex-runtimes` (PID 27148), que no toqué.
- Corrí una suite a la vez desde `frontend/`.
- No corrí el backend ni `shared/` aparte, porque 03c no los toca (`pretest` compila `shared/`). No abrí navegadores.
- Las salidas están en `C:\Users\Carlos\AppData\Local\Temp\claude\c--Users-Carlos-Documents-Proyecto-PlataformaEducativa\b40785c4-c4bd-4ce8-8c32-35c5e203ee4c\scratchpad\03c-r0-lint.txt` y `C:\Users\Carlos\AppData\Local\Temp\claude\c--Users-Carlos-Documents-Proyecto-PlataformaEducativa\b40785c4-c4bd-4ce8-8c32-35c5e203ee4c\scratchpad\03c-r0-test.txt`.

| Comando | Salida | Última línea |
|---|---|---|
| V-01 al inicio (base: tabla de la ronda 2 de 03b) | 0 | base 218, actual 218, `IGUALES` |
| `git diff --stat 9272501e -- frontend shared backend` (antes de reescribir) | 0 | vacío |
| `npx prettier --check src/features/admin/cuentas-r1.ataque.test.tsx` | 0 | `All matched files use Prettier code style!` |
| `npm run lint` | 0 | `> tsc -b` (antes: `All matched files use Prettier code style!`); `grep -c 'error TS'` = 0 |
| `npm run test` (17:34:13Z a 17:38:07Z) | 1 | `Test Files  2 failed \| 223 passed (225)` · `Tests  1 failed \| 4178 passed \| 3 skipped (4182)` · `Duration  230.75s`; `grep -c "Test timed out"` = 0; `grep -ci "timed out"` = 1 (el del hook) |
| V-01 al cierre | 0 | 218 archivos; `diff` contra la base: solo la línea de C-4 |
| `git diff --stat 9272501e -- frontend shared backend` (al cierre) | 0 | `1 file changed, 3 insertions(+), 1 deletion(-)` (solo C-4) |

**Rojo esperado (C-4), con su conteo exacto:**
- `test`, **1 caso rojo**: `src/features/admin/cuentas-r1.ataque.test.tsx` › "ataque (AUTH-02b r1): ficha, invitación y corrección de correo › invitar: 400 VALIDACION del servidor muestra su mensaje" (79 ms). Los otros 28 casos del archivo pasan (`29 tests | 1 failed`).
- Aserción que falla: la nueva `expect(alerta).not.toHaveTextContent("nombre:")`, en `:483:24`. Recibido: `Errornombre: caracteres no permitidos` (el "Error" del inicio es el texto `sr-only` de `MensajeError`). La primera aserción, `toHaveTextContent("caracteres no permitidos")`, pasa.
- Se va cuando el programador migre `mensajeDeErrorAdmin` al contrato (03c, paso 1): "VALIDACION" sale de la lista y el paso 3 del contrato va antes que los mapas.
- `lint` no tiene rojo esperado: la reescritura no usa nada que no exista.

**Rojo NO esperado (motivo de la PARADA):**
- Archivo: `src/features/clases/recuperar-ch3-r1.ataque.test.tsx`. Es mío, de la ronda 1 de 03b, y está sin cambios en la tabla de las 218. Aparece en "Failed Suites 1".
- Error: `Hook timed out in 10000ms.` en el `beforeAll` de `:101:1`, que solo hace `await import("@/app/router")`.
- Por qué 10 s: el `beforeAll` no pasa un tiempo límite propio y `frontend/vitest.config.ts` no fija `hookTimeout` (solo `testTimeout: 15_000`), así que rige el de Vitest.
- Efecto: sus **3 casos** quedan `skipped` (`3 tests | 3 skipped`, 10069 ms). Por eso el total sigue en 4182 (4178 + 1 + 3), igual que al cierre de 03b, cuando pasaron los 4182.
- Lectura, sin verificar con otra corrida a propósito: parece la carga de la corrida completa sobre la importación del router (`import 543.45s` acumulado en esta corrida), no un cambio de código. El árbol de los paquetes es `9272501e` más C-4, y C-4 no toca nada que ese archivo importe.
- Antecedentes: el archivo pasó en las dos corridas completas de la ronda 2 de 03b y en la del manager al cierre de 03b. Es un rojo intermitente: no repetí la corrida para limpiarlo.

Totales:
- `lint`: en verde.
- `test`: 2 archivos en rojo. Uno es la suite que no cargó por el tiempo límite de su hook; el otro tiene el caso rojo esperado.
- Casos: 1 rojo, 3 saltados por la suite caída y 4178 en verde.
- Tiempos límite: 0 `Test timed out` y 1 `Hook timed out`.

### Tabla de SHA-256 de las 218 `*.ataque` al cierre de la ronda 0 de CHORE-03 03c (base de V-01 del programador y del manager en 03c)
- Cambian cuatro respecto a la tabla de la ronda 2 de 03b: una marcada "Reescrita (CHORE-03 03c, C-4)" y tres marcadas "Endurecida (PA-12, CHORE-03 03c r0)" (actualizadas después de la decisión del orquestador; ver la nota del final). Las 214 restantes son iguales, con sus notas.
- Se reproduce con el comando de V-01. Lo comprobé: esta tabla, en minúsculas y ordenada, coincide con la salida del comando después del endurecimiento.
- Los hash van en mayúsculas, así que compárense sin distinguir mayúsculas.

| SHA-256 | Archivo | Nota |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `5E02A27716D63E8CE0FE6B6171BFF089EB3EE2548260349B16950D7E65A1BCF9` | `backend/test/calificaciones-01a-r1.ataque.test.ts` |  |
| `AFB531E7CCAB1CB53F0322D7D099A7F435DBD42325DE8C225525E3784B93F6CC` | `backend/test/calificaciones-01a-r2.ataque.test.ts` |  |
| `DD919EBD74A2C6AC60C244A1563B46895821B0D25E5051CDA25FFFB72B653416` | `backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` |  |
| `B09BAAEC53455CEA1A0674890EBD9353007E6F2628001446E873B09279FFBA07` | `backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` |  |
| `29EED2E93AF2775A4605160EA533BD462FD03CB1CFE4C47154898358A7255869` | `backend/test/calificaciones-estatico-01b-r1.ataque.test.ts` |  |
| `6E4C0EB47FF8020B0A539E5B70B24C8C1D05F7773EA092CD513E39C68CF4534E` | `backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts` |  |
| `6E3C92C13F146A01C8DCFDC7DD04BEA59F0E2562051F6AC65F95F924EF73E4DB` | `backend/test/categorias-01a-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `47B02C6D3916713BF9236A619FDB59A641D2E805F1F0B7E9B2C161FE719DDC3A` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `E4E9365EA010F3F670B6C1194D1A592E95DB43BFF0496D4EA1646FC5225CA8B4` | `backend/test/gradebook-01b-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `2684916C88B9405706F82DA3F9B2FFD0B3626A11AF79E20EA146FDFD1D52C319` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `3790777831A1FACB053D0719D85AB404593954416B1443A1A59530E09E2C81DC` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `BC6D49F9FC1F5EB20E305945FEF57CAEEBEB108BFF5D5CF4BA10B8040687D69C` | `backend/test/mis-calificaciones-01b-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `CCEA34C962FC8F14A49C64EAFA8119DAE5030E1302ED94FE369299EC49182BB8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `C67FA558FA7AE23821175478C8CB7D4874EE5F4D6CB84D0851F9A551B8AB455B` | `frontend/src/app/rutas-01d-r1.ataque.test.tsx` |  |
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `11C6D9C55BE91AA41E8525345E3795E34B8E1E661FF7CDD901F729760A033CFD` | `frontend/src/components/adjuntos/errores-ch3-r1.ataque.test.ts` |  |
| `48F5FF8FEF35FAA6D8500FAE4A53CA953D7F661100A5C4879BA58E68972AB2DE` | `frontend/src/components/foco/foco-01d-r1.ataque.test.ts` |  |
| `36A104515F2EA87F143B2CFC00AEF9A33E6DDDB666844C1A9C977557EECA20EF` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `7D080037D9A64EEBCEBB789D1DFD94B787652103E6F9C84F968F9C9F64C3B30C` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` | Reescrita (CHORE-03 03c, C-4) |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `4BCD3E34B62726FEA718EFB9C482D8C1F504BBE85EF32427BDF4D65A6832D8F1` | `frontend/src/features/calificaciones/cursor-ch3-r1.ataque.test.ts` | Ronda 1 (CHORE-03 03b) |
| `F0CBA6F9B6C4CF1D74ED52AD89943088661370F5A784502F851CD6230912F606` | `frontend/src/features/calificaciones/estatico-01d-r1.ataque.test.ts` |  |
| `5991D8E3D4E694973309F178E5341A2285584CF9ED6006FBB658D7F5A61DE5DD` | `frontend/src/features/calificaciones/gradebook-01d-r1.ataque.test.tsx` |  |
| `C744FB831FA9992C2A9ED0729F9EC3CC089F3167CA19133C6EEE0133382607A1` | `frontend/src/features/calificaciones/gradebook-01d-r2.ataque.test.tsx` |  |
| `8DEA1C2ADC5D228E166CE6037A1A1A827D26E2BDC6D7C8534F146517EBC1AC44` | `frontend/src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx` |  |
| `6F7496CA7652E7B4441A7EB9822E74270D50127AC40BA27B86C83EDFCD5CC3FA` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r1.ataque.test.tsx` |  |
| `24751F358FC5ECD485C475E7025DD881B87FE892F025459A6FF29F615FC5CC66` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r2.ataque.test.tsx` |  |
| `C504D0AD3690781275A6FFB78638A6148550B2FD4EE1ED25A4B154054FC4F80D` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r3.ataque.test.tsx` |  |
| `A8790F734402A957534D0F0E660EEF342F9029CDFC1991BE421D9B3E3C3E9CB7` | `frontend/src/features/calificaciones/secciones-01d-r3.ataque.test.tsx` |  |
| `FB33F2A27BFCCA906549A12610977478BA72E6E7ED8AFD5C5A0A962DEB3EB802` | `frontend/src/features/calificaciones/secciones-01d-r4.ataque.test.tsx` |  |
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `A3880B67FFAA0D15763D1C761CEF1FF8472029C77BFB2211AB079EADB1685325` | `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` |  |
| `66C0B873BC8B9D8E9E01AC871BD6AAAB4328508BEB5EC9371D69463D7C12430D` | `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` |  |
| `5272DE876597EAD9EF838E4D022185C80AA411AAD9E67325573C87F954C5F7A6` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `DCE7FD019A6E32B8E4DF37DD0728E265F5E9449E9EE2723F372EA174FE312464` | `frontend/src/features/clases/descarga-ch3-r2.ataque.test.tsx` |  |
| `DDC9DFACCC8230EC612126FDF29939A8E4311188566E5CFCAA724BD119E959E8` | `frontend/src/features/clases/errores-ch3-r1.ataque.test.ts` | Ronda 1 (CHORE-03 03b) |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `9ADE89B7B54F15CA9B64639469DAE1D9B79C24D5AC5E6FC17857384642FAF0FC` | `frontend/src/features/clases/formularios-ch3-r1.ataque.test.tsx` | Ronda 1 (CHORE-03 03b) |
| `07287364693F0D3F6301E8CFD4DEBC448FCB706DFB0D70231AB0B0B9A8416B65` | `frontend/src/features/clases/formularios-ch3-r2.ataque.test.tsx` | Nueva (CHORE-03 03b, r2); Endurecida (PA-12, CHORE-03 03c r0) |
| `827B8ABCA664145D51A1BBD1C0B558B0EDDFED8707A21A774222B4972BE14FF2` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `A79B6AFC48B2F71D09BE0670D515C53ED33C5C922250C242F917998192A00D28` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` | Reescrita (CHORE-03 03b, C-2/C-3): C-3 |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `826A564C2796CAD3689FC5EE8A8B68B0B3B35E8E17C7481DC92AFCF8374E166A` | `frontend/src/features/clases/recuperar-ch3-r1.ataque.test.tsx` | Ronda 1 (CHORE-03 03b); Endurecida (PA-12, CHORE-03 03c r0) |
| `85A7926A0F6831A8375F544CF38FE5585A8E2DCBF73D9726E9A3CFAAB7F76511` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `4303EAC77B98E8978495D9E68FD7725AC436F9DB757DBC0C02C59051436908FA` | `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` |  |
| `A4AA15CEF1A377EED688DAB1B92E5CA4A3943490144CEC861CF7B482845B0362` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` |  |
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `2EF258E946084F17E33936E8FA257551A90323B589859DD2E1F70AABEAF711BF` | `frontend/src/features/tareas/aviso-calificar-01c-r3.ataque.test.tsx` |  |
| `E2FEFD7D744F77C7BDD2BA73A08CC51076D0F6130BF4D0A225E0E972A1DCE111` | `frontend/src/features/tareas/avisos-01c-r2.ataque.test.tsx` |  |
| `11BB5433FB30F268B6D93E1E7814D826BBAB8FB1F173E574FAF52F5A96B5A41E` | `frontend/src/features/tareas/calificar-01c-r1.ataque.test.tsx` |  |
| `D8DACCB56C8DE8D9F1B0F8D1B0907C110E327F4F55B016FC0FE7FC0F25CCC79C` | `frontend/src/features/tareas/calificar-vacio-01c-r4.ataque.test.tsx` |  |
| `EF86C46708F0682BCA5A023E85794639C396EC94D207CAC23CEB13585AB39E75` | `frontend/src/features/tareas/campos-01c-r2.ataque.test.tsx` |  |
| `5FF367EDBA10C9BA9C7E50F8ED874032654FA2ABDC0DD8F4A122A000355472AB` | `frontend/src/features/tareas/cruces-01c-r3.ataque.test.tsx` |  |
| `2938AE2F1C00F63A0372997C7BA68BDC0AB097895769BF9060072A4AC2674C5A` | `frontend/src/features/tareas/descarga-ch3-r2.ataque.test.tsx` |  |
| `0963F14F4842D6D57288876C932496AC09D44B872FC049492EE6E8BA539F3235` | `frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx` |  |
| `4F486CA37D2A2BB6CC26754281D2ADCE086A9D8D4485A069DE7AE5D54E360ACF` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `93A5A0A648669E9C96494A62B2B16082B07296F279E2892BF2C8D47834EE2FC1` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` |  |
| `08A5E1A5642E7FC7553632DD5CF4E07F0EA35C3EF1E7293D010BBC49B09465AA` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` | Reescrita (CHORE-03 03b, C-2/C-3): C-2 |
| `172BE3EFD919C0D3948ECA17C7E808968E2370AFE1F9C2A28CEF7D2DED584B81` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` |  |
| `496652BC59817166F53E00CB828F2119C857C2834063A31764D7876DC150C930` | `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` |  |
| `4E6950F0FE571D6AE41A78380C59C20459FDF19F34C57E9777E4E34A6BC61C58` | `frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts` |  |
| `94D6E6253B266C7F21099AA593AAC7B2600EDCA22AB403AA365DCD789B1C6A97` | `frontend/src/features/tareas/errores-ch3-r2.ataque.test.ts` |  |
| `F614E7369F8C47C40A87AD1F8867FB8EDF7EBC76E94D0BA6C5C59C92CB6347F0` | `frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts` |  |
| `FB387ECBB7E5272D2FFB53D626B51FFD9C57B409D10C560E6A5ECBFA6A2A8C19` | `frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx` |  |
| `E7733A1022A055D49CABA8D02859D11BC41475BCD283B6D166CE9C99D21A3EE6` | `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx` | Endurecida (PA-12, CHORE-03 03c r0) |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `72B19B6A00B4ADE43B06829BB5BEF1A5CDECF5A7D2AF57369F1E857A1D4A17F5` | `frontend/src/lib/errores-ch3-r1.ataque.test.ts` |  |
| `1D89FA156238E49D4F9FBF986951050597E514031C4F5701275DC4EAF98CDB37` | `frontend/src/lib/errores-ch3-r2.ataque.test.ts` |  |
| `60BC1FC7011E9A0FE5A4C4AA45420F2C7D38ADB9EE2F8D235D09847DBE13AC3A` | `frontend/src/lib/format-01c-r1.ataque.test.ts` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `8BD0E034D4372D34BF145235372EFA27A150A38FD9A04EADB69FD48AC4E06D6C` | `frontend/src/services/apiClient-ch3-r1.ataque.test.ts` | Ronda 1 (CHORE-03 03b) |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `FC4963D3FD93297C427EAD0B85B23615C287E4F2C48079BCA8031D1C2AEE0396` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

### PA-12 (carga) resuelta por el orquestador
- **Decisión del orquestador:** el rojo de `recuperar-ch3-r1.ataque` es PA-12 por carga (R-01 del plan), no un defecto del código. La ronda 0 se cierra con el endurecimiento de abajo.
- **Corrida aislada del orquestador:** `npx vitest run src/features/clases/recuperar-ch3-r1.ataque.test.tsx` desde `frontend/`, sin otra suite en marcha → `Test Files 1 passed (1)` · `Tests 3 passed (3)` · `Duration 8.67s`.
- **Causa:** el `beforeAll` (`:101`) importa `@/app/router` sin un tiempo límite propio. Bajo la carga de la suite completa pasó del `hookTimeout` por defecto, 10 s, que `frontend/vitest.config.ts` no cambia (solo fija `testTimeout: 15_000`).

**Mi cambio.** Le di a ese `beforeAll` un tiempo límite explícito de 30 s, mayor que el `testTimeout` del proyecto. Lo mismo hice con sus hermanos: los otros `*.ataque` míos de CHORE-03 (03a y 03b) con un `beforeAll` que importa el router sin tiempo límite.
- Busqué `beforeAll` y `beforeEach` en los 15 archivos `-ch3-r1` y `-ch3-r2.ataque` del repositorio. Solo tres importan el router: los tres de abajo.
- Los `beforeEach` de `clases/descarga-ch3-r2`, `clases/formularios-ch3-r1` y `tareas/descarga-ch3-r2` no importan el router ni `Providers`: son síncronos (token, reloj y dobles), así que no les aplica.
- No toqué ningún archivo que no sea mío.

| Archivo | Rol | SHA-256 nuevo |
|---|---|---|
| `frontend/src/features/clases/recuperar-ch3-r1.ataque.test.tsx` (`:101`) | el que cayó | `826A564C2796CAD3689FC5EE8A8B68B0B3B35E8E17C7481DC92AFCF8374E166A` |
| `frontend/src/features/clases/formularios-ch3-r2.ataque.test.tsx` (`:132`) | hermano (03b r2) | `07287364693F0D3F6301E8CFD4DEBC448FCB706DFB0D70231AB0B0B9A8416B65` |
| `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx` (`:320`) | hermano (03a r1) | `E7733A1022A055D49CABA8D02859D11BC41475BCD283B6D166CE9C99D21A3EE6` |

Diff mínimo, igual en los tres archivos: una línea cada uno, sin cambiar nada más ni lo que protegen.

```diff
 beforeAll(async () => {
   await import("@/app/router")
-})
+}, 30_000)
```

**Verificación** (salidas en el scratchpad de la sesión: `03c-r0-pa12-aislado.txt`, `03c-r0-pa12-estaticas.txt`, `03c-r0-pa12-lint.txt` y `actual-03c-r0-pa12.txt`). Antes comprobé que no hubiera ningún `vitest` en marcha. No repetí la suite completa: la corre el programador al terminar 03c.

| Comando (desde `frontend/`) | Salida | Última línea |
|---|---|---|
| `npx prettier --check` y `npx eslint --config ../eslint.config.mjs` de los tres | 0 | `All matched files use Prettier code style!`; ESLint sin problemas |
| `npx vitest run` de los tres archivos endurecidos | 0 | `Test Files  3 passed (3)` · `Tests  111 passed (111)` · `Duration  78.72s`; 0 `timed out` |
| `npx vitest run` de las estáticas que leen estos archivos o todas las pruebas (`tareas/errores-ch3-r1`, `lib/errores-ch3-r1`, `clases/errores-ch3-r1`, `services/apiClient-ch3-r1`, `clases/reloj-01e-r4`, `lib/errores-de-api-estatico.test.ts`) y `admin/cuentas-r1.ataque` | 1 | `Test Files  1 failed \| 6 passed (7)` · `Tests  1 failed \| 164 passed (165)` · `Duration  10.20s`. El único rojo es C-4 (`invitar: 400 VALIDACION del servidor muestra su mensaje`), el esperado |
| `npm run lint` | 0 | `> tsc -b` |
| V-01 después del endurecimiento | 0 | 218 archivos. Frente a la salida del cierre de la ronda 0 solo cambian las tres líneas de arriba; frente a la base de 03b, esas tres y C-4. La tabla de esta sección ya está al día |

**Conclusión:** C-4 sigue siendo el único rojo esperado, con 1 caso. El veredicto de esta sección pasa a `RONDA 0 CERRADA (con PA-12 por carga registrada)`.

## Ronda 1 — 03c
Veredicto: **ROTO**
Verificación propia: lint frontend `0` (`All matched files use Prettier code style!` y `> tsc -b`, 0 `error TS`) · test frontend `Test Files  2 failed | 232 passed (234)` · `Tests  11 failed | 5055 passed (5066)` · `Test timed out` = 0, `Hook timed out` = 0. Los 11 rojos son todos de T-05 (abajo); ninguna prueba existente cayó.

- **Rama y base:** rama `chore/chore-03-errores-api`; base de 03c en `frontend/` `9272501e`.
- **Plan:** `plan.md` SHA-256 `eab43ac5e37597a5b26e39e802a4c5331a230d629cd1fa8067c3058aa2a2dc13` (Enmiendas 1 a 4), igual al de `aprobacion.md`.
- **Qué leí:** `AGENTS.md` y `CLAUDE.md`; del plan §D-1 a §D-6, §D-R0, "Pruebas requeridas › 03c", "Puntos de ataque" (con sus decisiones tomadas) y la "Lista para CHORE-04"; de `aprobacion.md`, desde "## 03c · arranque" hasta el final; `resumen-programador-03c.md`; de `revision.md`, "## Verificación del resumen — 03c" (O-20 a O-24); el código de producción de `features/admin` y `features/auth` (data, lib, hooks, todos los componentes y vistas con errores), `lib/errores-de-api.ts`, `services/apiClient.ts`, `app/router.tsx` y las guardas; y las pruebas nuevas del programador (`auth/errores-ch3`, `admin/errores-ch3`, `auth/formularios-ch3`, `admin/formularios-ch3`, CH3-C07).

Archivos que toqué: cinco `*.ataque` nuevas y este reporte (añadido al final). No toqué producción, las pruebas del programador ni ninguna `*.ataque` existente (V-01 abajo). Formateé solo mis cinco archivos (`npx prettier --write` acotado a ellos).

| Archivo nuevo | Casos (`npx vitest list <archivo>`) |
|---|---|
| `frontend/src/features/admin/errores-ch3-r1.ataque.test.tsx` | 344 |
| `frontend/src/features/admin/rutas-ch3-r1.ataque.test.tsx` | 20 |
| `frontend/src/features/auth/errores-ch3-r1.ataque.test.tsx` | 377 |
| `frontend/src/features/auth/rutas-ch3-r1.ataque.test.tsx` | 10 |
| `frontend/src/lib/estatico-ch3-r1.ataque.test.ts` | 12 |

Total: 763 casos (5066 − 4303 de la corrida del programador y del manager: cuadra). Ningún título se repite en `vitest list`. En todos: reloj fijo (`vi.useFakeTimers({ toFake: ["Date"] })`), `it.each` por módulo, sin selectores de estilo, invisibles solo como escapes (revisado con un script: 0 en los cinco), aserciones en cada caso y sin `return` temprano; las precondiciones lanzan con un mensaje. Las dos de rutas importan el router en un `beforeAll` con `30_000`.

### Regresiones
- **V-01 al inicio y al cierre:** comando de V-01 contra la "Tabla de SHA-256 de las 218 `*.ataque` al cierre de la ronda 0 de CHORE-03 03c": base 218, actual 223; las 218 de la base, idénticas (0 distintas); el `diff` solo trae mis cinco nuevas. Entre el inicio de la corrida final y el cierre no cambió ningún hash.
- **"No se toca":** `git diff --stat 9272501e -- frontend shared backend infra` da los mismos 12 archivos que verificó el manager (`85 insertions(+), 43 deletions(-)`); lo demás son archivos nuevos sin seguimiento (las 4 del programador y mis 5).
- **Suite completa:** las 218 `*.ataque` previas y todas las normales en verde, incluidas las que leen `admin` y `auth` (`admin/cuentas-r1` a `-r4`, `admin/maestros-03b-r1`, `admin/maestros-03c-r1`, `admin/en-espera-r1`, `admin/foco-r1`, `app/cuentas-r1`, `app/cuentas-r2`, `auth/enlace-r1`, `auth/enlace-r2`, `auth/invitacion-r1`, `clases/maestros-02c-r1`). 0 `timed out` de cualquier clase.

### Hallazgos

#### T-05 — El MensajeError de un envío rechazado por el servidor sigue en pantalla junto al error local del envío siguiente
Severidad: media

Prueba:
- `frontend/src/features/admin/errores-ch3-r1.ataque.test.tsx` › "ataque CHORE-03 03c r1 · el MensajeError de un envío anterior y el error local del siguiente" › "%s: tras un VALIDACION del servidor, un envío que la validación local rechaza deja un solo mensaje (el ErrorDeCampo nuevo), no también el MensajeError viejo", con `invitar maestro`, `generar enlace`, `corregir el correo` e `invitación masiva` (4 rojos); `buscar una cuenta` es el control y está en verde.
- `frontend/src/features/auth/errores-ch3-r1.ataque.test.tsx` › "ataque CHORE-03 03c r1 · el MensajeError de un envío anterior y el error local del siguiente" › "%s: tras un VALIDACION del servidor, un envío que la validación local rechaza deja un solo mensaje (el error local), no también el MensajeError viejo", con los siete formularios de `auth` (7 rojos).

Reproducción (la misma en los 11): el servidor responde `400 VALIDACION` "campoFueraDeContrato: Revisa este valor." y el formulario muestra un `MensajeError` "Revisa este valor." (correcto, un solo mensaje). La persona corrige mal un campo (un correo sin arroba, una vigencia de 0, una lista vacía, una confirmación que no coincide) y vuelve a pulsar el botón: la validación local lo rechaza sin petición y pinta su `ErrorDeCampo` (`aria-invalid="true"`), pero el `MensajeError` del envío anterior sigue arriba, porque vive en el estado de la mutación (`invitar.isError`, `inicioSesion.isError`…), que nadie limpia cuando el envío no llega al servidor.

Esperado / Obtenido:
- Esperado: un solo mensaje para el envío que la persona acaba de hacer, el error local (un `aria-invalid`, ningún `role="alert"` y "Revisa este valor." fuera de la pantalla).
- Obtenido: el `ErrorDeCampo` nuevo **y** el `MensajeError` viejo ("expected [ <div role="alert" …> ] to have a length of +0 but got 1"). Las otras dos aserciones (una sola petición y un `aria-invalid`) pasan.

Requisito o regla violada: `AGENTS.md` › "Reglas del equipo", la regla de los `VALIDACION` fuera de contrato ("un solo aviso o un `ErrorDeCampo` con texto, nunca ambos ni ninguno"), y lo que prometen CH3-C03 y CH3-C04 ("un solo `MensajeError`… sin `ErrorDeCampo`"), llevados al envío siguiente. El propio módulo ya resolvió este caso en un sitio: `BuscadorDeCuenta` llama a `buscar.reset()` cuando la validación local rechaza la búsqueda (T-05 de la ronda 2 de AUTH-02), y por eso su caso está en verde; los otros once controles con validación local no lo hacen.

Notas para el arbitraje:
- **Es previo al chore.** Los componentes no cambian en 03c (`git diff 9272501e` solo toca la línea de la consulta en `tabla-enlaces.tsx` y `registrados-del-enlace.tsx`), y lo mismo pasaba en `ad10844`. No es una regresión de 03c, pero es un caso del mismo mecanismo que el chore unifica (el mensaje del servidor que llega a la persona) en los dos módulos de 03c, como T-03 y T-04 en 03b.
- **Hermanos** (todos los controles de `admin` y `auth` cuyo error del servidor vive en el estado de la mutación y que validan en el cliente antes del `mutate`): invitar maestro, invitación masiva, generar enlace, corregir el correo, iniciar sesión, registro de estudiante, registro de maestro por enlace, recuperar contraseña, restablecer contraseña, establecer contraseña (invitación) y cambio obligatorio. Sin validación local, y por tanto fuera: restablecer desde la ficha y revocar un enlace. Ya resuelto: buscar una cuenta.
- El remedio toca componentes que "Cambios por capa › 03c" no nombra (sería PA-3 del programador), así que necesita una decisión: una Enmienda del plan o un destino fuera del chore (CHORE-04 o ADMIN-01). No propongo la forma.

### Atacado sin hallazgos
- **Tabla común completa por la interfaz.** Las 110 `ENTRADAS_FUERA_DE_CONTRATO`, repartidas por rotación entre los siete controles de `admin` (invitar, masiva, generar, buscar, corregir, restablecer desde la ficha y revocar) y entre los siete formularios de `auth`. En los 220 casos: exactamente un `MensajeError` con `resto ?? genérico`, ningún `aria-invalid`, ningún aviso, lo escrito se conserva (también las contraseñas) y el botón sale de la espera con una sola petición.
- **"Puntos de ataque" en todos los controles** (112 casos en `admin`, 98 en `auth`): mezcla de restos tras la ruta (`"\u{00A0}\u{200B}\n"`), ruta de 600 caracteres, ruta solo de dígitos, letra con marca combinante (`pa\u{0301}rametro:`), catorce niveles, `email: email:`; y en `admin`, la ruta doble `id: id:` con espacio, sin espacios (`id:id:`), con tabuladores, con varios espacios, sin resto, con ancho cero, con `\u{3000}\u{2060}` y con `\u{0085}`. Siempre el resto o el genérico, y ni "id:", ni "123456:", ni la ruta en todo el texto de la pantalla. **Tres prefijos** (`id: id: id: …`, 7 casos): sale "id: Revisa este valor.", lo que dice la decisión del plan ("se quitan como máximo dos prefijos"); la prueba fija esa salida y no es hallazgo.
- **El patrón de T-03 y T-04 en `admin` y `auth`:** `nombre:` en restablecer (solo se pinta al establecer), `token:` en todos (solo lo mandan el registro de maestro y los enlaces), `contrasena:` en el cambio obligatorio (que pinta `contrasenaNueva`), `contrasenaNueva:` en restablecer y establecer (que mandan `contrasena`), `confirmacion:` (solo existe en el cliente), `lista:` y `vigenciaDias:` en los formularios de `admin` que no los tienen, y `email:` en buscar y corregir. Siempre un solo `MensajeError` y ningún `aria-invalid` suelto. Ningún formulario asocia un error del servidor a un campo, así que la lista de campos no depende del modo (coincide con el punto 6 del manager).
- **O-21:** en las cuatro rutas de `:id` (restablecer, corregir, revocar y los registrados), `document.body.textContent` no contiene "id:" con `id: id: debe ser…`, `id:id:debe ser…`, `id:\tid:\u{00A0}debe ser…` e `id: id:\u{200B}` (9 casos). Las acciones dan "debe ser un identificador válido" o el genérico, y la consulta, el genérico.
- **O-20:** `lib/estatico-ch3-r1.ataque.test.ts` recorre todo el código de producción de `src/` salvo el contrato y `features/diagnostico` (más de 150 archivos) con once formas de mostrar crudo un mensaje: `mensaje={….message}`, `titulo=`, `children=`, plantillas `${….message}`, `toast(….message)`, `{….message}` en JSX, `String(error)`, `error.toString()`, `JSON.stringify(error)`, `.message ??`/`||` (salvo el respaldo de una incidencia de zod) y `e.message`/`err.message`. Resultado: 0. Un caso de control comprueba que las reglas sí ven ocho muestras de esas formas y no confunden `incidencia.message`. Además, solo `components/adjuntos/lib.ts`, `features/tareas/lib.ts` y `features/clases/lib.ts` (aprobados en 03a y 03b) leen el `.message` de un error; `admin` y `auth`, ninguno.
- **O-05 extendida a `admin` y `auth`:** sin `new RegExp(`, `.split(":")`, `.indexOf(":")`, copias de la expresión de ruta, `PREFIJO_DE_CAMPO`/`RUTA_DEL_MENSAJE`/`CAMPO_QUE_REPITE`, ni piezas internas del contrato (`campoDeErrorDeApi`, `quitarRutaDelMensaje`, `textoVisibleOGenerico`, `erroresDeFormularioDeApi`). `mensajeDeErrorAdmin`, `mensajeDeConsultaAdmin` y `mensajeDeErrorAuth` se definen una sola vez, como envoltorios de una línea. Los 21 `MensajeError` de los dos módulos usan `mensajeDeErrorAdmin` solo con las seis mutaciones, `mensajeDeConsultaAdmin` solo con `enlaces` y `registrados`, `mensajeDeErrorAuth`, o un texto fijo de `data.ts`.
- **Estática final del chore:** `quitarPrefijoDeCampo` y `PREFIJO_DE_RUTA` no existen en producción; `MENSAJES_ERROR_CLASES` no se declara ni se usa (solo queda en un comentario, ver O-r1-7); `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` se declara solo en `services/apiClient.ts` y ningún otro archivo tiene los tres códigos como literales; `esErrorDeCursor` se define una vez (en el contrato) y nadie la pasa como referencia a un método de arreglo (tampoco el alias de `calificaciones`); en `admin` y `auth`, sin `?? []`, sin `disabled` y sin textos de la interfaz en `lib.ts` ni `hooks.ts`.
- **Códigos fijos con un mensaje del servidor que parece ruta.** En `admin`, los cuatro de `MENSAJES_ERROR_ADMIN` con "email: Revisa este valor." (14 casos) dan su texto fijo, y cuatro códigos desconocidos (`ERROR_INTERNO`, `CONFLICTO_DE_VERSION`, `constructor`, `VALIDACION_`) en los siete controles dan el genérico. En `auth`, cada código de `MENSAJES_ERROR_AUTH` en cada formulario (66 casos) da su texto fijo y nunca el del servidor, y `ENLACE_USADO`, `CONTRASENA_INCORRECTA`, `CUENTA_BLOQUEADA`, `ROL_NO_PERMITIDO`, `NO_IMPLEMENTADO`, `toString` y `__proto__` en los siete (49 casos) dan el genérico.
- **`ENLACE_INVALIDO` que reemplaza el formulario** (registro de maestro, restablecer y establecer; 15 casos con "token: …", "token: token: x", un espacio, ancho cero y texto libre): un solo `MensajeError` con el texto fijo de cada uno, sin el formulario ni "token:".
- **Las consultas de S-08.** La invitación con `VALIDACION` "token: El enlace no es válido", "token: token: …", "token:" con y sin invisibles, "   " y `token.0.valor:` da el resto o el genérico, sin "token"; con `ENLACE_INVALIDO`, el texto fijo de la invitación; con códigos desconocidos, el genérico; sin conexión, el texto de `SIN_CONEXION`. `/me` en "Acceso restringido" con `VALIDACION` (con y sin texto visible), `SESION_INVALIDA` y `ROL_NO_PERMITIDO` da un solo `MensajeError` con su título.
- **`CUPO_DIARIO_INSUFICIENTE` en la masiva:** con texto, su mensaje; vacío, espacios, ancho cero, mezcla, `\u{3000}` y `\u{FEFF}`, el genérico (7 casos).
- **Sin conexión:** `fetch` que rechaza en los siete controles de `admin` da el genérico; en `auth`, `fetch` que rechaza y un `502` sin JSON en los siete formularios dan el texto fijo de `SIN_CONEXION`. Nunca "Failed to fetch" ni "Bad Gateway".
- **`VALIDACION` de parámetro de consulta en `admin`** (`cursor:`, `limite: Too big…`, `limite:\u{200B}`, `limite: limite:` y uno sin ruta), en la primera carga de la tabla de enlaces, «Cargar más enlaces» (con el cursor en la URL), la primera carga de los registrados, su «Cargar más» y la recarga de la tabla tras generar y tras revocar (30 casos): siempre un solo `MensajeError` con el genérico, nunca el texto de zod.
- **`apiClient` sigue redirigiendo igual.** Un `403 ACCESO_RESTRINGIDO` y un `403 CAMBIO_DE_CONTRASENA_REQUERIDO` desde cada control de `admin` llaman a `irA("/acceso-restringido")` y a `irA("/cambiar-contrasena")` sin mostrar el texto del servidor (14 casos). Un `401` con el refresco rechazado manda a `/login` (invitar, y el cambio obligatorio, que sí refresca). El login con `/me` en `403 CAMBIO_DE_CONTRASENA_REQUERIDO` redirige a `/cambiar-contrasena`, y el cambio obligatorio con `403 ACCESO_RESTRINGIDO`, a `/acceso-restringido`.
- **"Inténtalo de nuevo" con `rutas` y `Providers` reales.** En `admin` (20 casos: invitar, buscar, masiva, generar y revocar): repetir el control; pulsar en la barra la sección en la que ya se está (otra `location.key`: el control conserva su error, como dice S-06, y repetirlo lo quita); ir a la otra sección (`/admin` ↔ `/admin/maestros`) y volver con la barra a los 10 s; y atrás, adelante y atrás del historial a los 3, 6 y 9 s. En los caminos de ida y vuelta el control vuelve sin el error, y una petición nueva sale bien. En `auth` (10 casos): iniciar sesión, registro de estudiante y recuperar contraseña por repetir, por ir a otra pantalla pública con su enlace y volver, y por el historial; y restablecer con el enlace en el fragmento, donde repetir lleva a `/login` con su aviso.
- **Decisiones que no son hallazgo:** las respeté (S-01, S-04, S-05 con N-07, CAL-T-123, "máximo dos prefijos", DH-2, S-08, S-09, O-16 y O-22). No escribí pruebas rojas de doble clic sobre las filas 7 a 18 de la "Lista para CHORE-04".

### No atacado y por qué
- **Backend y PA-07:** 03c no toca el backend; no corrí su suite.
- **Navegador, 360 px y lectores de pantalla:** no abro navegadores; no verificado.
- **Teclado:** jsdom no convierte Enter en `click`; el manejador es el mismo `onSubmit`.
- **Doble clic en las filas 7 a 18 de la "Lista para CHORE-04":** sin pruebas rojas, por la Enmienda 3 (DH-7 = b).
- **Caminos de navegación del registro de maestro, establecer contraseña y el cambio obligatorio con el router real:** no tienen un enlace a otra pantalla mientras el formulario está montado (solo el de `EnlaceInvalido`, que ya reemplazó al formulario); "repetir el control" lo cubren CH3-C03 y mi caso de restablecer. Las consultas que reemplazan la vista (tabla de enlaces, registrados, invitación y `/me`) son de DH-2.

### Observaciones (sin prueba roja)
- **O-r1-4 — `ENLACE_INVALIDO` con mensaje vacío.** Si el servidor mandara `ENLACE_INVALIDO` con `mensaje: ""`, `errorApiSchema` (`mensaje: z.string().min(1)`) lo rechaza y `apiClient` lo convierte en `RESPUESTA_INVALIDA`: el formulario no se reemplaza por `EnlaceInvalido` y muestra el genérico. Hoy no se alcanza (el backend responde con el mismo esquema). Lo vi en mi primera corrida y cambié el caso a un espacio.
- **O-r1-5 — El error de «Sí, revocar» reaparece al volver a abrir la confirmación.** Tras un error, «Cancelar» lo oculta (vive dentro del bloque de confirmación) y «Revocar» lo vuelve a mostrar antes de cualquier intento nuevo; `AccionRestablecer`, en cambio, lo deja visible fuera de la confirmación. Es previo al chore y no da dos mensajes para un envío. Destino sugerido: ADMIN-01. Lo saqué de leer el código.
- **O-r1-6 — El login muestra el texto fijo de `CAMBIO_DE_CONTRASENA_REQUERIDO` mientras `apiClient` redirige.** El comentario de `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` dice "quien los recibe no avisa"; los formularios de `auth` sí pintan su `MensajeError` en ese momento (y los de `admin`, el genérico). `irA` recarga la página, así que dura un instante. Previo al chore.
- **O-r1-7 — `features/clases/data.ts:239` nombra `MENSAJES_ERROR_CLASES` en un comentario** (el que explica el cambio de nombre de 03b). Mi regla quita los comentarios antes de buscar; no es un hallazgo de 03c (módulo cerrado y solo es un comentario).
- **O-22 (del manager), confirmado:** los dos «Cargar más» de `admin` siguen con `enEspera={isFetchingNextPage}`, y un fallo de «Cargar más» reemplaza toda la tabla (o la subtabla) por el `MensajeError`, sin control para reintentar (DH-2). Sin prueba roja.

### Comandos de la verificación propia
- Antes de cada corrida comprobé con `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` que no hubiera ningún `vitest` en marcha: solo estaba el proceso ajeno de `.cache\codex-runtimes`, que no toqué. Una suite a la vez, desde `frontend/`, sin procesos de larga vida.
- Salidas en el scratchpad de la sesión: `03c-r1-admin-1.txt`, `03c-r1-auth-{1,2,3}.txt`, `03c-r1-rutas-admin-1.txt`, `03c-r1-rutas-auth-1.txt`, `03c-r1-estatico-{1,2}.txt`, `03c-r1-lint.txt`, `03c-r1-test.txt`, `v01-base-03c-r1.txt`, `v01-actual-03c-r1.txt`, `v01-actual-03c-r1-fin.txt` y `tabla-03c-r1.md`.

| Comando | Salida | Última línea |
|---|---|---|
| V-01 al inicio (base: la tabla de las 218 de la ronda 0 de 03c) | 0 | base 218, actual 223; 218 idénticas; el `diff` solo trae las 5 nuevas |
| `npx vitest run src/features/admin/errores-ch3-r1.ataque.test.tsx` | 1 | `Tests  4 failed \| 340 passed (344)` (los 4 de T-05) |
| `npx vitest run src/features/auth/errores-ch3-r1.ataque.test.tsx` (tercera corrida) | 1 | `Tests  7 failed \| 370 passed (377)` (los 7 de T-05) |
| `npx vitest run src/features/admin/rutas-ch3-r1.ataque.test.tsx` | 0 | `Tests  20 passed (20)` |
| `npx vitest run src/features/auth/rutas-ch3-r1.ataque.test.tsx` | 0 | `Tests  10 passed (10)` |
| `npx vitest run src/lib/estatico-ch3-r1.ataque.test.ts` (segunda corrida) | 0 | `Tests  12 passed (12)` |
| `npx prettier --write` y `npx eslint --config ../eslint.config.mjs` (solo mis 5 archivos) | 0 | sin problemas |
| `npm run lint` | 0 | `> tsc -b` (antes: `All matched files use Prettier code style!`); 0 `error TS` |
| `npm run test` (corrida final, arranque 12:37:49) | 1 | `Test Files  2 failed \| 232 passed (234)` · `Tests  11 failed \| 5055 passed (5066)` · `Duration  223.49s`; `Test timed out` 0, `Hook timed out` 0 |
| V-01 al cierre | 0 | igual al del inicio (`diff` vacío entre las dos corridas) |

Correcciones a mis propias pruebas antes de la corrida final (ninguna cambia lo que protegen): en `auth/errores-ch3-r1`, el caso de `ENLACE_INVALIDO` con mensaje `""` pasó a `" "` (O-r1-4); en `lib/estatico-ch3-r1`, la regla de `.message ??` dejó de contar el respaldo de una incidencia de zod (`issues[0]?.message ?? …`) y la de textos en `lib.ts`/`hooks.ts` dejó de cruzar saltos de línea.

### Tabla de SHA-256 de las 223 `*.ataque` al cierre de la ronda 1 de CHORE-03 03c
Cinco nuevas, marcadas "Nueva (CHORE-03 03c, r1)". Las 218 restantes son iguales a la tabla de la ronda 0 de 03c, con sus notas. Se reproduce con el comando de V-01. Los hash van en mayúsculas, así que compárense sin distinguir mayúsculas.

| SHA-256 | Archivo | Nota |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` |  |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` |  |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` |  |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` |  |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` |  |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` |  |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` |  |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` |  |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` |  |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` |  |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` |  |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` |  |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` |  |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` |  |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` |  |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` |  |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` |  |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` |  |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` |  |
| `5E02A27716D63E8CE0FE6B6171BFF089EB3EE2548260349B16950D7E65A1BCF9` | `backend/test/calificaciones-01a-r1.ataque.test.ts` |  |
| `AFB531E7CCAB1CB53F0322D7D099A7F435DBD42325DE8C225525E3784B93F6CC` | `backend/test/calificaciones-01a-r2.ataque.test.ts` |  |
| `DD919EBD74A2C6AC60C244A1563B46895821B0D25E5051CDA25FFFB72B653416` | `backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` |  |
| `B09BAAEC53455CEA1A0674890EBD9353007E6F2628001446E873B09279FFBA07` | `backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` |  |
| `29EED2E93AF2775A4605160EA533BD462FD03CB1CFE4C47154898358A7255869` | `backend/test/calificaciones-estatico-01b-r1.ataque.test.ts` |  |
| `6E4C0EB47FF8020B0A539E5B70B24C8C1D05F7773EA092CD513E39C68CF4534E` | `backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts` |  |
| `6E3C92C13F146A01C8DCFDC7DD04BEA59F0E2562051F6AC65F95F924EF73E4DB` | `backend/test/categorias-01a-r1.ataque.test.ts` |  |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` |  |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` |  |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` |  |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` |  |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` |  |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` |  |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` |  |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` |  |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` |  |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` |  |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` |  |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` |  |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` |  |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` |  |
| `47B02C6D3916713BF9236A619FDB59A641D2E805F1F0B7E9B2C161FE719DDC3A` | `backend/test/entregas-01b-r1.ataque.test.ts` |  |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` |  |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` |  |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` |  |
| `E4E9365EA010F3F670B6C1194D1A592E95DB43BFF0496D4EA1646FC5225CA8B4` | `backend/test/gradebook-01b-r1.ataque.test.ts` |  |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` |  |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` |  |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` |  |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` |  |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` |  |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` |  |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` |  |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` |  |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` |  |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` |  |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` |  |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` |  |
| `2684916C88B9405706F82DA3F9B2FFD0B3626A11AF79E20EA146FDFD1D52C319` | `backend/test/lecturas-fx-r1.ataque.test.ts` |  |
| `3790777831A1FACB053D0719D85AB404593954416B1443A1A59530E09E2C81DC` | `backend/test/lecturas-fx-r2.ataque.test.ts` |  |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` |  |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` |  |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` |  |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` |  |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` |  |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` |  |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` |  |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` |  |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` |  |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` |  |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` |  |
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` |  |
| `BC6D49F9FC1F5EB20E305945FEF57CAEEBEB108BFF5D5CF4BA10B8040687D69C` | `backend/test/mis-calificaciones-01b-r1.ataque.test.ts` |  |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` |  |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` |  |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` |  |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` |  |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` |  |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` |  |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` |  |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` |  |
| `CCEA34C962FC8F14A49C64EAFA8119DAE5030E1302ED94FE369299EC49182BB8` | `backend/test/sesiones-y-cadena.ataque.test.ts` |  |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` |  |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` |  |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` |  |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` |  |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` |  |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` |  |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` |  |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` |  |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` |  |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` |  |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` |  |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` |  |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` |  |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` |  |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` |  |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` |  |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` |  |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` |  |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` |  |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` |  |
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` |  |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` |  |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` |  |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` |  |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` |  |
| `C67FA558FA7AE23821175478C8CB7D4874EE5F4D6CB84D0851F9A551B8AB455B` | `frontend/src/app/rutas-01d-r1.ataque.test.tsx` |  |
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` |  |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` |  |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` |  |
| `11C6D9C55BE91AA41E8525345E3795E34B8E1E661FF7CDD901F729760A033CFD` | `frontend/src/components/adjuntos/errores-ch3-r1.ataque.test.ts` |  |
| `48F5FF8FEF35FAA6D8500FAE4A53CA953D7F661100A5C4879BA58E68972AB2DE` | `frontend/src/components/foco/foco-01d-r1.ataque.test.ts` |  |
| `36A104515F2EA87F143B2CFC00AEF9A33E6DDDB666844C1A9C977557EECA20EF` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` |  |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` |  |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` |  |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` |  |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` |  |
| `7D080037D9A64EEBCEBB789D1DFD94B787652103E6F9C84F968F9C9F64C3B30C` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` | Reescrita (CHORE-03 03c, C-4) |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` |  |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` |  |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` |  |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` |  |
| `C21EDB5A06B43808CE2BE23058409B7FF887E66D60E842C500A3714A90EBCB25` | `frontend/src/features/admin/errores-ch3-r1.ataque.test.tsx` | Nueva (CHORE-03 03c, r1) |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` |  |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` |  |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` |  |
| `76D9A6F2AA6E67D7A4812B203EC7C4AEA779A8427F62097E87B557326B84340E` | `frontend/src/features/admin/rutas-ch3-r1.ataque.test.tsx` | Nueva (CHORE-03 03c, r1) |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` |  |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` |  |
| `AF3F0D474F8052B402C8959A64ACF9E730F9AE60F09D90996A6306E9C2440F08` | `frontend/src/features/auth/errores-ch3-r1.ataque.test.tsx` | Nueva (CHORE-03 03c, r1) |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` |  |
| `BA6A5A452593A8741CC6EE83150298B28BEEC2BBB22008BBAA76B761CA944AB3` | `frontend/src/features/auth/rutas-ch3-r1.ataque.test.tsx` | Nueva (CHORE-03 03c, r1) |
| `4BCD3E34B62726FEA718EFB9C482D8C1F504BBE85EF32427BDF4D65A6832D8F1` | `frontend/src/features/calificaciones/cursor-ch3-r1.ataque.test.ts` | Ronda 1 (CHORE-03 03b) |
| `F0CBA6F9B6C4CF1D74ED52AD89943088661370F5A784502F851CD6230912F606` | `frontend/src/features/calificaciones/estatico-01d-r1.ataque.test.ts` |  |
| `5991D8E3D4E694973309F178E5341A2285584CF9ED6006FBB658D7F5A61DE5DD` | `frontend/src/features/calificaciones/gradebook-01d-r1.ataque.test.tsx` |  |
| `C744FB831FA9992C2A9ED0729F9EC3CC089F3167CA19133C6EEE0133382607A1` | `frontend/src/features/calificaciones/gradebook-01d-r2.ataque.test.tsx` |  |
| `8DEA1C2ADC5D228E166CE6037A1A1A827D26E2BDC6D7C8534F146517EBC1AC44` | `frontend/src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx` |  |
| `6F7496CA7652E7B4441A7EB9822E74270D50127AC40BA27B86C83EDFCD5CC3FA` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r1.ataque.test.tsx` |  |
| `24751F358FC5ECD485C475E7025DD881B87FE892F025459A6FF29F615FC5CC66` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r2.ataque.test.tsx` |  |
| `C504D0AD3690781275A6FFB78638A6148550B2FD4EE1ED25A4B154054FC4F80D` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r3.ataque.test.tsx` |  |
| `A8790F734402A957534D0F0E660EEF342F9029CDFC1991BE421D9B3E3C3E9CB7` | `frontend/src/features/calificaciones/secciones-01d-r3.ataque.test.tsx` |  |
| `FB33F2A27BFCCA906549A12610977478BA72E6E7ED8AFD5C5A0A962DEB3EB802` | `frontend/src/features/calificaciones/secciones-01d-r4.ataque.test.tsx` |  |
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` |  |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` |  |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` |  |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` |  |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` |  |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` |  |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` |  |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` |  |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` |  |
| `A3880B67FFAA0D15763D1C761CEF1FF8472029C77BFB2211AB079EADB1685325` | `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` |  |
| `66C0B873BC8B9D8E9E01AC871BD6AAAB4328508BEB5EC9371D69463D7C12430D` | `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` |  |
| `5272DE876597EAD9EF838E4D022185C80AA411AAD9E67325573C87F954C5F7A6` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` |  |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` |  |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` |  |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` |  |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` |  |
| `DCE7FD019A6E32B8E4DF37DD0728E265F5E9449E9EE2723F372EA174FE312464` | `frontend/src/features/clases/descarga-ch3-r2.ataque.test.tsx` |  |
| `DDC9DFACCC8230EC612126FDF29939A8E4311188566E5CFCAA724BD119E959E8` | `frontend/src/features/clases/errores-ch3-r1.ataque.test.ts` | Ronda 1 (CHORE-03 03b) |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` |  |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` |  |
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` |  |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` |  |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` |  |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` |  |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` |  |
| `9ADE89B7B54F15CA9B64639469DAE1D9B79C24D5AC5E6FC17857384642FAF0FC` | `frontend/src/features/clases/formularios-ch3-r1.ataque.test.tsx` | Ronda 1 (CHORE-03 03b) |
| `07287364693F0D3F6301E8CFD4DEBC448FCB706DFB0D70231AB0B0B9A8416B65` | `frontend/src/features/clases/formularios-ch3-r2.ataque.test.tsx` | Nueva (CHORE-03 03b, r2); Endurecida (PA-12, CHORE-03 03c r0) |
| `827B8ABCA664145D51A1BBD1C0B558B0EDDFED8707A21A774222B4972BE14FF2` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` |  |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` |  |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` |  |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` |  |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` |  |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` |  |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` |  |
| `A79B6AFC48B2F71D09BE0670D515C53ED33C5C922250C242F917998192A00D28` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` | Reescrita (CHORE-03 03b, C-2/C-3): C-3 |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` |  |
| `826A564C2796CAD3689FC5EE8A8B68B0B3B35E8E17C7481DC92AFCF8374E166A` | `frontend/src/features/clases/recuperar-ch3-r1.ataque.test.tsx` | Ronda 1 (CHORE-03 03b); Endurecida (PA-12, CHORE-03 03c r0) |
| `85A7926A0F6831A8375F544CF38FE5585A8E2DCBF73D9726E9A3CFAAB7F76511` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` |  |
| `4303EAC77B98E8978495D9E68FD7725AC436F9DB757DBC0C02C59051436908FA` | `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` |  |
| `A4AA15CEF1A377EED688DAB1B92E5CA4A3943490144CEC861CF7B482845B0362` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` |  |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` |  |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` |  |
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` |  |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` |  |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` |  |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` |  |
| `2EF258E946084F17E33936E8FA257551A90323B589859DD2E1F70AABEAF711BF` | `frontend/src/features/tareas/aviso-calificar-01c-r3.ataque.test.tsx` |  |
| `E2FEFD7D744F77C7BDD2BA73A08CC51076D0F6130BF4D0A225E0E972A1DCE111` | `frontend/src/features/tareas/avisos-01c-r2.ataque.test.tsx` |  |
| `11BB5433FB30F268B6D93E1E7814D826BBAB8FB1F173E574FAF52F5A96B5A41E` | `frontend/src/features/tareas/calificar-01c-r1.ataque.test.tsx` |  |
| `D8DACCB56C8DE8D9F1B0F8D1B0907C110E327F4F55B016FC0FE7FC0F25CCC79C` | `frontend/src/features/tareas/calificar-vacio-01c-r4.ataque.test.tsx` |  |
| `EF86C46708F0682BCA5A023E85794639C396EC94D207CAC23CEB13585AB39E75` | `frontend/src/features/tareas/campos-01c-r2.ataque.test.tsx` |  |
| `5FF367EDBA10C9BA9C7E50F8ED874032654FA2ABDC0DD8F4A122A000355472AB` | `frontend/src/features/tareas/cruces-01c-r3.ataque.test.tsx` |  |
| `2938AE2F1C00F63A0372997C7BA68BDC0AB097895769BF9060072A4AC2674C5A` | `frontend/src/features/tareas/descarga-ch3-r2.ataque.test.tsx` |  |
| `0963F14F4842D6D57288876C932496AC09D44B872FC049492EE6E8BA539F3235` | `frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx` |  |
| `4F486CA37D2A2BB6CC26754281D2ADCE086A9D8D4485A069DE7AE5D54E360ACF` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` |  |
| `93A5A0A648669E9C96494A62B2B16082B07296F279E2892BF2C8D47834EE2FC1` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` |  |
| `08A5E1A5642E7FC7553632DD5CF4E07F0EA35C3EF1E7293D010BBC49B09465AA` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` | Reescrita (CHORE-03 03b, C-2/C-3): C-2 |
| `172BE3EFD919C0D3948ECA17C7E808968E2370AFE1F9C2A28CEF7D2DED584B81` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` |  |
| `496652BC59817166F53E00CB828F2119C857C2834063A31764D7876DC150C930` | `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` |  |
| `4E6950F0FE571D6AE41A78380C59C20459FDF19F34C57E9777E4E34A6BC61C58` | `frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts` |  |
| `94D6E6253B266C7F21099AA593AAC7B2600EDCA22AB403AA365DCD789B1C6A97` | `frontend/src/features/tareas/errores-ch3-r2.ataque.test.ts` |  |
| `F614E7369F8C47C40A87AD1F8867FB8EDF7EBC76E94D0BA6C5C59C92CB6347F0` | `frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts` |  |
| `FB387ECBB7E5272D2FFB53D626B51FFD9C57B409D10C560E6A5ECBFA6A2A8C19` | `frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx` |  |
| `E7733A1022A055D49CABA8D02859D11BC41475BCD283B6D166CE9C99D21A3EE6` | `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx` | Endurecida (PA-12, CHORE-03 03c r0) |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` |  |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` |  |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` |  |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` |  |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` |  |
| `72B19B6A00B4ADE43B06829BB5BEF1A5CDECF5A7D2AF57369F1E857A1D4A17F5` | `frontend/src/lib/errores-ch3-r1.ataque.test.ts` |  |
| `1D89FA156238E49D4F9FBF986951050597E514031C4F5701275DC4EAF98CDB37` | `frontend/src/lib/errores-ch3-r2.ataque.test.ts` |  |
| `66513D957E524AF5E336A2C7E656DF37F51106507A3984B691DF47CD825D4D10` | `frontend/src/lib/estatico-ch3-r1.ataque.test.ts` | Nueva (CHORE-03 03c, r1) |
| `60BC1FC7011E9A0FE5A4C4AA45420F2C7D38ADB9EE2F8D235D09847DBE13AC3A` | `frontend/src/lib/format-01c-r1.ataque.test.ts` |  |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` |  |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` |  |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` |  |
| `8BD0E034D4372D34BF145235372EFA27A150A38FD9A04EADB69FD48AC4E06D6C` | `frontend/src/services/apiClient-ch3-r1.ataque.test.ts` | Ronda 1 (CHORE-03 03b) |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` |  |
| `FC4963D3FD93297C427EAD0B85B23615C287E4F2C48079BCA8031D1C2AEE0396` | `frontend/src/styles/clases-r1.ataque.test.ts` |  |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` |  |

## Ronda 2 — 03c
Veredicto: **RESISTE**
Verificación propia: lint frontend `0` (`All matched files use Prettier code style!` y `> tsc -b`, 0 `error TS`) · test frontend `Test Files  237 passed (237)` · `Tests  5310 passed (5310)` · `Duration  229.89s` · `Test timed out` = 0, `Hook timed out` = 0. Sin PA-12: la suite completa pasó en la primera corrida.

- **Rama y base:** rama `chore/chore-03-errores-api`; base de 03c en `frontend/` `9272501e`.
- **Plan:** `plan.md` SHA-256 `31d58aec72c64758cb113b4f584fac4f53504dcf2607f0d4abd5c348766d05ea` (Enmienda 5, LISTO), igual al de `aprobacion.md`.
- **Qué leí:** `AGENTS.md` y `CLAUDE.md`; del plan §D-2 (tabla de secuencias), §D-4 (remedio de la Enmienda 5), §D-6, "Pruebas requeridas › 03c" (CH3-C09 a CH3-C13), "Puntos de ataque" con sus decisiones tomadas y la "Lista para CHORE-04", y la "Enmienda 5"; `aprobacion.md` desde "## 03c · Ronda 1 del tester"; `resumen-programador-03c-r2.md` completo (con la adenda M-06 y sus 15 estados vecinos); de `revision.md`, la revisión de la Enmienda 5 y la verificación de la ronda 2 (O-25, O-26, M-06). Código: los diez formularios, `buscador-de-cuenta.tsx`, `ficha-de-cuenta.tsx`, `auth/hooks.ts` y las pruebas del programador C09 a C13.
- **Continuación:** un tester anterior dejó tres `*.ataque` sin correr. Las revisé contra lo que pide esta ronda, las conservé y las completé. Agregué los casos de StrictMode en `admin` y `auth`, el envío válido tras un error en invitar maestro y en corregir el correo, y en `admin` la aserción de que el resultado del éxito sigue tras un rechazo local (sin ella, la mutación (iii) no caía en mis archivos). También corregí la firma de un `it.each` que `tsc` rechazaba.

Archivos que toqué: tres `*.ataque` nuevas (las heredadas, terminadas) y este reporte (añadido al final). No toqué producción, las pruebas del programador ni ninguna `*.ataque` de rondas anteriores (V-01 abajo). Formateé solo mis archivos.

| Archivo nuevo | Casos (`npx vitest list <archivo>`) |
|---|---|
| `frontend/src/features/admin/secuencias-ch3-r2.ataque.test.tsx` | 54 |
| `frontend/src/features/auth/secuencias-ch3-r2.ataque.test.tsx` | 79 |
| `frontend/src/lib/estatico-ch3-r2.ataque.test.ts` | 16 |

Total: 149 casos (5310 − 5161 de la corrida del programador y del manager: cuadra). Ningún título se repite en `vitest list` (`sort | uniq -d` vacío). En todos:
- reloj fijo (`vi.useFakeTimers({ toFake: ["Date"] })`);
- `it.each` con `%s` sobre tuplas;
- sin selectores de estilo: rol, etiqueta y `aria-invalid`; `CampoContrasena` por su etiqueta;
- invisibles solo por punto de código (un script da 0 en los tres);
- aserciones en cada caso y sin `return` temprano: las precondiciones lanzan con un mensaje.

Ninguno importa el router.

### Regresiones
- **V-01 al inicio y al cierre:** comando de V-01 contra la "Tabla de SHA-256 de las 223 `*.ataque` al cierre de la ronda 1 de CHORE-03 03c" (hash en minúsculas). Base 223, actual 226: las 223 de la base son idénticas y el `diff` solo trae mis tres nuevas. Entre la corrida final y el cierre no cambió ningún hash.
- **"No se toca":** `git diff --numstat 9272501e -- frontend shared backend infra` da lo mismo que verificó el manager:
  - los diez formularios en `3 0`;
  - los doce de la ronda 1 de 03c sin cambio;
  - nada en `hooks.ts`, `buscador-de-cuenta.tsx` ni `ficha-de-cuenta.tsx`.
  `git status --short frontend` da 34 líneas: 22 `M` y 12 `??` (las 9 de antes más mis 3).
- **Las 5 `*.ataque` de la ronda 1, aisladas:** `Tests  763 passed (763)`. Las 11 de T-05 y el control `buscar una cuenta`, con `-t "el MensajeError de un envío anterior y el error local del siguiente"`: `Tests  12 passed | 709 skipped (721)`.
- **Suite completa:** las 223 `*.ataque` previas y todas las normales en verde, 0 `timed out` de cualquier clase. O-25 no se repitió.

### Hallazgos
Ninguno.

### Mutación de confirmación
Ningún archivo del repositorio cambió: `vitest.r2-03c.config.mts` (en el scratchpad) transforma los diez formularios al cargarlos. También transforma su texto crudo (`?raw`), para que las reglas estáticas lo vean mutado. SHA-256 de los diez antes y después: iguales (`sha256sum -c`: 10 `OK`). Se corrieron 8 archivos, 1042 casos: mis tres, las dos `errores-ch3-r1.ataque`, `admin/formularios-ch3.test.tsx`, `auth/formularios-ch3.test.tsx` y `lib/errores-de-api-estatico.test.ts`. El control, sin mutar, da `1042 passed`.

| Archivo | (i) línea quitada | (ii) antes de la guarda `isPending` | (iii) `reset()` sin `isError` |
|---|---|---|---|
| `features/admin/secuencias-ch3-r2.ataque` (mío) | 47 de 54 | 0 de 54 | 6 de 54 |
| `features/auth/secuencias-ch3-r2.ataque` (mío) | 78 de 79 | 0 de 79 | 0 de 79 |
| `lib/estatico-ch3-r2.ataque` (mío) | 10 de 16 | 10 de 16 | 10 de 16 |
| `features/admin/errores-ch3-r1.ataque` | 4 de 344 (T-05) | 0 | 0 |
| `features/auth/errores-ch3-r1.ataque` | 7 de 377 (T-05) | 0 | 0 |
| `features/admin/formularios-ch3.test.tsx` | 23 de 77 | 0 | 2 de 77 (CH3-C12 (1)) |
| `features/auth/formularios-ch3.test.tsx` | 33 de 90 | 0 | 0 |
| `lib/errores-de-api-estatico.test.ts` | 1 de 5 (CH3-C13) | 1 de 5 (CH3-C13) | 1 de 5 (CH3-C13) |
| **Total** | **203 de 1042** | **11 de 1042** | **19 de 1042** |

- **(i)** Cae todo lo que recorre la secuencia servidor → local. En mis archivos siguen en verde:
  - en `admin`, la precondición, los cinco de `BuscadorDeCuenta` (su `buscar.reset()` no se toca) y los dos de envío válido tras un error;
  - en `auth`, solo la precondición.
- **(ii)** Es un mutante equivalente en comportamiento: `isPending` e `isError` son estados excluyentes del mismo observador, así que la línea delante de la guarda nunca corre con una petición en vuelo. Lo detectan solo las reglas estáticas: CH3-C13 y mis diez casos «la línea de T-05 es la sentencia que sigue a la guarda isPending». No es un hueco de las pruebas.
- **(iii)** Cae CH3-C12 (1) del programador (invitar maestro y corregir el correo, por el texto de éxito) y mis seis «éxito → local (el resultado del éxito sigue…) → servidor» de esos dos formularios. En `auth` no cae nada, porque ningún éxito deja el formulario a la vista con un texto (ver "No atacado y por qué").

### Atacado sin hallazgos
- **Secuencias largas en los once formularios.** Servidor (F1) → local → servidor (código con texto) → otro local → servidor (F3) → tercer local; en `admin`, 4 casos, y en `auth`, 7. En cada paso:
  - hay un solo mensaje, el del envío recién hecho (un `role="alert"` con título y texto exactos y ningún `aria-invalid`, o un `aria-invalid` con su `ErrorDeCampo` y ningún `role="alert"`, también tras dejar correr la cola);
  - el texto del paso anterior ya no está en la pantalla;
  - solo los envíos válidos llegan al servidor (conteo exacto de peticiones);
  - lo escrito se conserva, también las contraseñas;
  - el botón sale sin `aria-busy` ni `aria-disabled`.
  Los códigos con texto: `CORREO_EN_USO` (409) en invitar, generar y corregir; `CUPO_DIARIO_INSUFICIENTE` (409, O-26) en la masiva; `DEMASIADOS_INTENTOS` (429) en `auth`.
- **Dos rechazos locales seguidos tras un error del servidor:** local → F1 → local → otro local, por caminos distintos (4 + 7). El segundo rechazo tampoco trae de vuelta el `MensajeError`. En `admin`, el éxito que sigue llega sin alerta.
- **Éxito → local → servidor** (`admin`, 4 formularios × F1, F3 y su código: 12 casos):
  - el resultado del éxito sigue junto al `ErrorDeCampo` (decisión de §D-2);
  - el error del servidor siguiente reemplaza al éxito y al `ErrorDeCampo`, sin `role="status"` ni campo inválido;
  - el rechazo local que sigue deja solo su `ErrorDeCampo`.
- **Envío válido tras un error, con los callbacks de la llamada:** en invitar maestro, el `onSuccess` de `mutate` vacía el formulario aunque `reset()` corrió en el mismo manejador; en corregir el correo, `onCorregido` recibe la cuenta corregida. En los dos, una sola petición y sin alerta.
- **Rechazo local con la petición siguiente en vuelo.** Tras F1, F3 o el código fijo, un `submit` del formulario con el botón ya en `aria-busy="true"` (N-25) no pide ni pinta nada (12 casos en `admin`, 21 en `auth`). Al soltar la petición con F1 queda un solo `MensajeError`, y el rechazo local siguiente lo quita.
- **Los caminos de rechazo local de restablecer, establecer y el cambio obligatorio** (esquema, confirmación distinta y el nombre de establecer), cada uno tras F1, F3 y `DEMASIADOS_INTENTOS`, repetidos dos veces (21 casos). También todos los caminos alternados con errores del servidor (3 casos). Nunca hay dos mensajes, y las contraseñas se conservan.
- **Estado 10, `CAMBIO_NO_REQUERIDO` con la recarga de `/me` fallida** (4 casos, sin caso propio del programador):
  - con `/me` en 500, sin conexión o en `403 CAMBIO_DE_CONTRASENA_REQUERIDO`, queda solo el texto fijo, sin el del servidor; los dos rechazos locales siguientes (confirmación y esquema) dejan solo su `ErrorDeCampo`, y el reenvío válido manda otra petición con un solo `MensajeError`;
  - con `/me` retenido, el botón sigue en `aria-busy` mientras recarga (el `onError` asíncrono), y un `submit` en esa ventana no pide ni pinta nada. Al fallar `/me` queda solo el texto fijo, y el rechazo local siguiente lo quita.
- **Estado 9, `ENLACE_INVALIDO` tras otros mensajes:** local → F1 → local → `ENLACE_INVALIDO`, en el registro de maestro, restablecer y establecer. Queda solo el texto fijo del enlace, sin formulario, sin campo inválido, sin el texto del servidor ni el anterior, y con dos peticiones.
- **Estado 11, un código que `apiClient` redirige y un reenvío antes de que `irA` recargue:**
  - en `admin`, `403 ACCESO_RESTRINGIDO` y `403 CAMBIO_DE_CONTRASENA_REQUERIDO` en los cuatro formularios (8 casos);
  - en `auth`, el cambio obligatorio y el registro con `ACCESO_RESTRINGIDO`, recuperar con `CAMBIO_DE_CONTRASENA_REQUERIDO`, el login con `/me` en `403 CAMBIO_DE_CONTRASENA_REQUERIDO`, y el cambio obligatorio con `401` y el refresco rechazado (5 casos).
  En todos, `irA` va a su destino y nunca aparece el texto del servidor. El rechazo local siguiente deja solo el `ErrorDeCampo`, y el reenvío válido manda otra petición con un solo `MensajeError`. Lo que se ve el instante de la redirección es O-r1-6 (decisión tomada).
- **StrictMode, como `main.tsx`:** servidor → local → servidor → local en los once (4 + 7). Igual que sin StrictMode: un mensaje por paso y una petición por envío válido.
- **`BuscadorDeCuenta` con `buscar.reset()` sin condición** (5 casos, en verde con y sin las mutaciones):
  - la ficha encontrada desaparece con un rechazo local (correo sin arroba o vacío), sin el nombre ni el correo de la cuenta anterior ni «Restablecer contraseña», y buscarla otra vez la trae;
  - servidor → local → servidor → local alternados, con un mensaje por paso;
  - el `MensajeError` de corregir el correo dentro de la ficha desaparece con la ficha cuando la búsqueda siguiente la rechaza la validación local.
- **O-26:** `CUPO_DIARIO_INSUFICIENTE` con 409 (lo que responde el servidor), como primer rechazo y después cada uno de los tres caminos de rechazo local de la masiva (lista solo de espacios, más de 100 líneas y vacía): queda solo el `ErrorDeCampo`, sin el texto del cupo, y repetir el control vuelve a pedir.
- **Hermanos fuera de la tabla de §D-4:** `grep` de `safeParse(` en los componentes de `features/`, `app/` y `components/`, y de `.isError` en producción. Los únicos que validan en local y pintan un `MensajeError` desde `isError` son los diez archivos de la tabla y `buscador-de-cuenta.tsx`. «Sí, restablecer» y «Sí, revocar» no validan en local. En `clases` y `tareas`, el error del servidor vive en el mismo estado que la validación reemplaza, o ya se limpia. Coincide con el inventario de la Enmienda 5.
- **Estática final del encargo** (`lib/estatico-ch3-r2.ataque`, 16 casos, sobre el texto crudo de `src/` sin comentarios):
  - ningún archivo de producción de `src/` tiene un carácter invisible literal (25 puntos de código, entre ellos `U+00A0`, `U+200B` a `U+200F`, `U+202A` a `U+202E`, `U+2060`, `U+2800`, `U+3164`, `U+FEFF` y `U+1D159`). Tampoco ninguna prueba del chore (`-ch3`, normales y `*.ataque` de todas las rondas, incluidas las mías);
  - la tabla común (`lib/errores-de-api-fuera-de-contrato.ts`) solo la importan pruebas;
  - `quitarPrefijoDeCampo` y `PREFIJO_DE_RUTA` no existen en producción; `CODIGOS_QUE_REDIRIGE_EL_CLIENTE` se declara solo en `services/apiClient.ts`; `esErrorDeCursor` se define una sola vez, en `lib/errores-de-api.ts`;
  - en cada uno de los diez, la línea de T-05 es la sentencia inmediatamente siguiente a `evento.preventDefault()` y a la guarda `isPending`, dentro de `handleSubmit` y antes de `new FormData(` o del `safeParse(`, y es el único `<m>.reset(` del archivo;
  - fuera de los diez, ningún archivo de producción reinicia una mutación condicionado a `isError`, y nadie la reinicia en el render.

  Lo que la ronda 1 ya fijaba sigue en verde en `lib/estatico-ch3-r1.ataque` y CH3-C07: nada de producción de `src/`, salvo el contrato y `features/diagnostico`, manipula o muestra crudo `error.message`. Solo `components/adjuntos/lib.ts`, `features/tareas/lib.ts` y `features/clases/lib.ts` lo leen para clasificar, como se aprobó en 03a y 03b; lo revisé otra vez con `grep` y no hay lecturas nuevas.
- **Decisiones que no son hallazgo, comprobadas sin prueba roja:**
  - las del plan ("Puntos de ataque", Enmiendas 1 a 5);
  - O-16: con la vista desmontada no hay aviso;
  - la "Lista para CHORE-04" (doble clic, ver O-r2-1);
  - O-22: los «Cargar más» con `isFetchingNextPage`;
  - O-r1-5 (ADMIN-01), O-r1-6 (el `chore` de foco y navegación) y O-25 (carga).

### No atacado y por qué
- **Éxito → local → servidor en `auth`:** no se alcanza. El éxito saca a la persona del formulario o lo reemplaza:
  - el login, el registro y el registro de maestro navegan a la ruta del rol;
  - recuperar pinta la confirmación en lugar del `<form>`;
  - restablecer y establecer van a `/login`;
  - el cambio obligatorio va al dashboard.
  CH3-C10 del programador comprueba esos destinos con `MemoryRouter` y rutas reales.
- **Backend y PA-07:** 03c no toca el backend; no corrí su suite.
- **Navegador, 360 px y lectores de pantalla:** no abro navegadores. Sin verificar.
- **Teclado:** jsdom no convierte Enter en `click`. El manejador es el mismo `onSubmit`, y los casos «en vuelo» usan `fireEvent.submit`.
- **Doble clic en el mismo render en los once:** sin pruebas rojas, por la Enmienda 3 (DH-7 = b). Lo confirmé como observación (O-r2-1).

### Observaciones (sin prueba roja)
- **O-r2-1, doble clic en el mismo render (filas 7 a 10 y 12 a 17 de la "Lista para CHORE-04").** Lo medí con una prueba de observación que no entra al repositorio: dos `click()` dentro del mismo `act`, con la petición retenida y 30 ms de espera.
  - Invitar maestro, invitación masiva, generar enlace, corregir el correo y recuperar contraseña mandan **2 peticiones**.
  - Iniciar sesión, registro de estudiante, registro de maestro, restablecer, establecer y el cambio obligatorio mandaron **1** en esa ventana. Esos ganchos tienen `mutationKey`; no verifiqué si la segunda llamada sale después, cuando se asienta la primera. También son de CHORE-04.
  - Previo al chore y fuera de su alcance (Enmienda 3). El remedio de T-05 no lo cambia, porque la guarda `isPending` sigue igual.
- **O-r2-2, en la ficha de la cuenta conviven el error de «Sí, restablecer» y el `ErrorDeCampo` de corregir el correo.** Comprobado con la misma prueba de observación: tras un 500 al restablecer, un correo sin arroba en «Guardar correo» deja un `role="alert"` (el de restablecer, «No pudimos completar la operación. Inténtalo de nuevo.») y un `aria-invalid` (el de corregir).
  - Son dos controles y dos envíos distintos, y cada mensaje queda junto a su control. La regla de §D-2 (Enmienda 5) es por formulario, así que no lo cuento como hallazgo.
  - Es el mismo componente de O-r1-5 (`AccionRestablecer` en `ficha-de-cuenta.tsx`, previo al chore y en "No se toca"). Destino sugerido: ADMIN-01, junto con O-r1-5.
- **O-r2-3, la masiva y generar enlace también conservan su resultado tras un rechazo local.** El `ResultadoInvitacionMasiva` y el `EnlaceNuevo` siguen, ambos con `role="status"`. Viven en estado local del formulario, no en la mutación, así que `reset()` no los toca; es la misma decisión de §D-2 que el plan nombra para invitar maestro y corregir el correo. Al siguiente envío válido se limpian (`setResultado(null)` y `setEnlace(null)` antes de `mutate`). Sin acción.
- **O-r2-4, mutante (ii) equivalente** (ver "Mutación de confirmación"): la posición de la línea respecto de la guarda solo la fijan las reglas estáticas, y basta, porque los dos órdenes se comportan igual.

### Comandos de la verificación propia
- Antes de cada corrida comprobé con `Get-CimInstance Win32_Process -Filter "name='node.exe'"` que no hubiera ningún `vitest` en marcha. Solo estaban los procesos ajenos de los runtimes de otra herramienta, que no toqué. Corrí una suite a la vez, desde `frontend/`, sin procesos de larga vida. Todo lo que arranqué terminó solo.
- Salidas en el scratchpad de la sesión (`C:\Users\Carlos\AppData\Local\Temp\claude\c--Users-Carlos-Documents-Proyecto-PlataformaEducativa\b40785c4-c4bd-4ce8-8c32-35c5e203ee4c\scratchpad\`): `r2t-r1-aislados.txt`, `r2t-propias.txt`, `r2t-t05.txt`, `r2t-list.txt`, `r2t-mutF-{control,quitar,antes,siempre}.{txt,json}`, `r2t-sha-diez-antes.txt`, `observaciones.txt`, `r2t-lint.txt`, `r2t-test.txt`, `r2t-v01-base.txt` y `r2t-v01-actual.txt`. La configuración de la mutación es `vitest.r2-03c.config.mts`, y la prueba de observación, `observaciones.scratch.tsx`.

| Comando | Salida | Última línea |
|---|---|---|
| `npx vitest run` de mis 3 archivos (primera corrida, tal como los dejó el tester anterior) | 0 | `Tests  136 passed (136)` |
| `npx eslint --config ../eslint.config.mjs`, `npx prettier --check` y `npx tsc -b` (mis 3 archivos, tras completarlos) | 0 | sin problemas (antes de corregir la firma del `it.each`, `tsc` daba 1 `error TS2345`) |
| `npx vitest run` de las 5 `*.ataque` de la ronda 1 | 0 | `Tests  763 passed (763)` |
| `npx vitest run` de mis 3 archivos (final) | 0 | `Tests  149 passed (149)` |
| `npx vitest run` de las dos `errores-ch3-r1.ataque` con `-t "el MensajeError de un envío anterior y el error local del siguiente"` | 0 | `Tests  12 passed \| 709 skipped (721)` |
| `MODO=control npx vitest run --config <scratchpad>/vitest.r2-03c.config.mts` (8 archivos) | 0 | `1042 passed` |
| Igual con `MODO=quitar`, `MODO=antes` y `MODO=siempre` | 1, 1 y 1 | 203, 11 y 19 de 1042 fallan (tabla arriba); los diez SHA-256 iguales antes y después |
| `npm run lint` | 0 | `> tsc -b` (antes: `All matched files use Prettier code style!`); 0 `error TS` |
| `npm run test` (corrida única, arranque 17:01:34) | 0 | `Test Files  237 passed (237)` · `Tests  5310 passed (5310)` · `Duration  229.89s`; `Test timed out` 0, `Hook timed out` 0 |
| V-01 al inicio y al cierre | 1 (`diff` con 3 líneas añadidas) | base 223, actual 226; 223 idénticas; solo las 3 nuevas |

### Tabla de SHA-256 de las 226 `*.ataque` al cierre de la ronda 2 de CHORE-03 03c
Tres nuevas, marcadas "Nueva (CHORE-03 03c, r2)". Las 223 restantes son iguales a la tabla de la ronda 1 de 03c, con sus notas; las cinco de la ronda 1 van marcadas "Nueva (CHORE-03 03c, r1)". Se reproduce con el comando de V-01. Los hash van en mayúsculas, así que compárense sin distinguir mayúsculas.

| SHA-256 | Archivo | Nota |
|---|---|---|
| `BCCE2CAE771F97957D8691BEF7FFF4EC42412DAAEABF726AEB0AFC59F6F25671` | `backend/src/config/correo.ataque.test.ts` | |
| `DCB78D222544E8DC4FBECE59468F555B04ABE971B70016E9BB17FCAE3E958580` | `backend/src/config/env.ataque.test.ts` | |
| `71E7F049447D2D1ECEDD897C55EA0B6D31221753F0A7E7473C7AC6E8667F0A95` | `backend/src/config/logger.ataque.test.ts` | |
| `91F620C1A27778EEBC2BED5EEC1BC9B0E3FE1199B32ED00F9DD910011D6A1805` | `backend/src/core/clases/codigo-r1.ataque.test.ts` | |
| `262691F5786AD63B2393D0BA5FF97538F6DACF43343BED019AD23C12A07D8686` | `backend/src/core/clases/codigo-r2.ataque.test.ts` | |
| `E769CBFCC3A83A64B51C6437F80684640A7C928AD6B8C5C1671FDFF005D7B734` | `backend/src/workers/ritmo-03c-r1.ataque.test.ts` | |
| `294BE1AF0BF69D6C05F54E2F0D8E587C78A5527D0B64D1A224C058E31CE013D0` | `backend/test/admin-muro-02b-r1.ataque.test.ts` | |
| `388AD0E585639B8C3E0E0A6657FB42C1B9CB83DB721C4863C4FA19E0BE42EC85` | `backend/test/admin-unico.ataque.test.ts` | |
| `D2CC28B62BF988AE14BA975A9BC8D534AEC0EEBCE30DA93D7DED9A26026B0857` | `backend/test/alumnos-b-r1.ataque.test.ts` | |
| `00346D471355ABC7971B921649E7192B8987FE27912C00CB7E41AEF2065369E9` | `backend/test/alumnos-b-r2.ataque.test.ts` | |
| `FC11AB4B914D4A88612953F82DB354E2B9CEA9BEF86E24321EF7E031F3AC3837` | `backend/test/alumnos-b-r3.ataque.test.ts` | |
| `441A766A94E7D9B26807790402E06ED94D4CC378D8F6ECF0BCCC3259C7FF55FB` | `backend/test/api-real.ataque.test.ts` | |
| `D9E1DE5B1BD43F54CF3A4DCF153D1EEABDC36B4DEC02FBEB9D8A0239F298DFE9` | `backend/test/archivos-d-r1.ataque.test.ts` | |
| `1637EB447CD12AC5BDDDC7634980DBC10A25CBAD5DE01BF6C09F40ED930FF1A9` | `backend/test/archivos-d-r2.ataque.test.ts` | |
| `42BB7BF3086230C6EDC65AB73976AC8A801956336561AADBEE65CC3B40EB8612` | `backend/test/arquitectura-cuentas-r1.ataque.test.ts` | |
| `38ADB0984744A0810287711F57BA0498287D0BC96344B8948BA1C490CA807716` | `backend/test/arranque-r1.ataque.test.ts` | |
| `2C83D82D10BDD9B7A969768774D75B18B7A71A594BBAAC5FAE36A0E134D2336C` | `backend/test/auth-login.ataque.test.ts` | |
| `73D3A2AE708A0EF676547A8094115B1419423057378387269BC3EADB34C7724E` | `backend/test/auth-registro.ataque.test.ts` | |
| `6F557E8E860BCE6374671E90086E9C14B1861A308B6FBB434564612647892713` | `backend/test/autoria-02b-r1.ataque.test.ts` | |
| `5E02A27716D63E8CE0FE6B6171BFF089EB3EE2548260349B16950D7E65A1BCF9` | `backend/test/calificaciones-01a-r1.ataque.test.ts` | |
| `AFB531E7CCAB1CB53F0322D7D099A7F435DBD42325DE8C225525E3784B93F6CC` | `backend/test/calificaciones-01a-r2.ataque.test.ts` | |
| `DD919EBD74A2C6AC60C244A1563B46895821B0D25E5051CDA25FFFB72B653416` | `backend/test/calificaciones-carreras-01a-r1.ataque.test.ts` | |
| `B09BAAEC53455CEA1A0674890EBD9353007E6F2628001446E873B09279FFBA07` | `backend/test/calificaciones-estatico-01a-r1.ataque.test.ts` | |
| `29EED2E93AF2775A4605160EA533BD462FD03CB1CFE4C47154898358A7255869` | `backend/test/calificaciones-estatico-01b-r1.ataque.test.ts` | |
| `6E4C0EB47FF8020B0A539E5B70B24C8C1D05F7773EA092CD513E39C68CF4534E` | `backend/test/calificaciones-instantanea-01b-r1.ataque.test.ts` | |
| `6E3C92C13F146A01C8DCFDC7DD04BEA59F0E2562051F6AC65F95F924EF73E4DB` | `backend/test/categorias-01a-r1.ataque.test.ts` | |
| `95BBA9BAC44366AD5A361E93DD2F278CB0A1CC889FA479049ACC7B45A9A5E71B` | `backend/test/clases-r1.ataque.test.ts` | |
| `A87817D56C236C0BA3597214CAC23B10483BBC28AE44800C592ED5CE2EF97F38` | `backend/test/clases-r2.ataque.test.ts` | |
| `72DE7D8AF3D3F772ABC19DB065F6E418F6EB76CE78D87FE6EBB51335FC99825A` | `backend/test/clases-r3.ataque.test.ts` | |
| `BE97C4E48AC9551BED1D01552E90AB8CDF085CF928AE6C8C3D81809E35F7CE62` | `backend/test/clases-r4.ataque.test.ts` | |
| `000EC9008C73D25121C82A46F5EA0F67E6C8C387CB04E361EF82812B57956098` | `backend/test/concurrencia-02a-r1.ataque.test.ts` | |
| `530546B4D70A2B9AD36F98F37E2AF45480E81A1101EE3516D15426F78350BF82` | `backend/test/cuentas-03a-r1.ataque.test.ts` | |
| `6303DDC170545F616C66773C3F5475CB3BE1FEA9347D8059354D6ADE8D676C16` | `backend/test/cuentas-r1.ataque.test.ts` | |
| `3A4E81C111B8EEB7DF065804AA85062FA3FC607F0147149B71AC21C14E7818D9` | `backend/test/cuentas-r2.ataque.test.ts` | |
| `F54F79F7B2A83E95FE440053CCAF15CB3EBB01CE5DFD4C6655E22159A5FD7E6B` | `backend/test/cuentas-r3.ataque.test.ts` | |
| `A2F9BFF596330A7D55D1CA9D47197FC831EB132F52C759610E2D667895C3332F` | `backend/test/cuerpos-02a-r2.ataque.test.ts` | |
| `D7A9DA854CE8AB8AD8D2437DB2E8C2A642A777EA3261A6B038DA28BE022DF848` | `backend/test/enlaces-03b-r1.ataque.test.ts` | |
| `DC1B7EE7EA58966F5DB33CCB4581885A9669DEA2263954AE46D17A83E1EF6EAF` | `backend/test/enlaces-03b-r2.ataque.test.ts` | |
| `B051B1986496E35E3E306C4C6BC306A763542BCA4B350574D0C02E2C484DEB35` | `backend/test/enlaces-ch-r2.ataque.test.ts` | |
| `D28CC4DE621A680E6B54B2BFF889700300D558EC7849717584518D2F03EC8CAE` | `backend/test/entorno-ch-r1.ataque.test.ts` | |
| `47B02C6D3916713BF9236A619FDB59A641D2E805F1F0B7E9B2C161FE719DDC3A` | `backend/test/entregas-01b-r1.ataque.test.ts` | |
| `5BAAF6F8FB76320620ED4A84EFACA2B2D473460F62360E0D48738B97A0AC584A` | `backend/test/entregas-01b-r2.ataque.test.ts` | |
| `BA1AC9B17CC9BF747522BD4EC8B87DF436008482E643B18EEA8E9A8C041C59B3` | `backend/test/formada-ch-r1.ataque.test.ts` | |
| `EC9602D5F109B45A6D428E708D9B6CDD37A7509A6FF9031FA6FD8A2DA0E25E9B` | `backend/test/gestion-02a-r1.ataque.test.ts` | |
| `E4E9365EA010F3F670B6C1194D1A592E95DB43BFF0496D4EA1646FC5225CA8B4` | `backend/test/gradebook-01b-r1.ataque.test.ts` | |
| `5F4133F949D2F337A8F63B75CF82CB77114DB7812D67C1960105F5000C31A326` | `backend/test/guarda-ch-r1.ataque.test.ts` | |
| `7A7DAC6D87EDF81059FCFF9C07471AAF49D690EC159BE4B9FD4AA32B0909A215` | `backend/test/guarda-ch-r2.ataque.test.ts` | |
| `610EE44E5D0BCEA46EB4E3645F9ADF1998A76947A25AF7E3F8248EA3A633DF79` | `backend/test/guarda-ch-r3.ataque.test.ts` | |
| `E5D149F3AC52B726E1FE08908249706341330F88EAA6674B9A9AC67B98B1E864` | `backend/test/guarda-clase-r1.ataque.test.ts` | |
| `C979D2C9C420A2177FA6EBDDB78EB2CE84D5F043B94270F690916A6FC75D6F8F` | `backend/test/guarda-clase-r2.ataque.test.ts` | |
| `20982E2B98F1B162146A211923F3D5EC19D4E170C4AA3A5BFC6F82C3B6173AAD` | `backend/test/guarda-r2.ataque.test.ts` | |
| `2649F3D357DCB806361AC101C57FCB504B9C798B631048F0B3E200F63DA7DC30` | `backend/test/hilo-01c-r1.ataque.test.ts` | |
| `2D2216EE9DB290B318825A6F73C346D4767CACC12D95F5CA76457A78B63FEDC3` | `backend/test/instantanea-01b-r1.ataque.test.ts` | |
| `A8B79D5AD98270BE3747F493865708A78BB73ADD08D832584DB4464C3582777A` | `backend/test/intentos-r2.ataque.test.ts` | |
| `2619B44EEA3370494C95AC128FCFD9E3FFC20D1581A19F549BF371F603A11D7D` | `backend/test/invitacion-flujo-03a-r2.ataque.test.ts` | |
| `704155928183AEC193AE7E157B86B3E9361D2B63C7A47BE1ED859605FAB4FFA6` | `backend/test/invitacion-masiva-03c-r1.ataque.test.ts` | |
| `DD9B7454E8786BF0B833D265900CCAECF595808CEBC8E9A77C9AEF15298A1038` | `backend/test/invitacion-masiva-03c-r2.ataque.test.ts` | |
| `2684916C88B9405706F82DA3F9B2FFD0B3626A11AF79E20EA146FDFD1D52C319` | `backend/test/lecturas-fx-r1.ataque.test.ts` | |
| `3790777831A1FACB053D0719D85AB404593954416B1443A1A59530E09E2C81DC` | `backend/test/lecturas-fx-r2.ataque.test.ts` | |
| `F9F9EC59EC8D1A5CCB180522798140C45604440F48EDCD68A3E02863D90AE347` | `backend/test/logs-02a-r1.ataque.test.ts` | |
| `A2006C163D9E6CD3E4A2A773D1501826DAF3C8E7BB184D205BFC6442318FB59C` | `backend/test/logs-02b-r1.ataque.test.ts` | |
| `BD8B303C434EFEC0785E0691D31D6F6E87DBF3305F50FA27CCE0F78CBB251E3A` | `backend/test/logs-03a-r1.ataque.test.ts` | |
| `B58D5D013658433FE5839634E2DB5A31B8D2B8F69587BC36958752D3CD33BBF7` | `backend/test/logs-03b-r1.ataque.test.ts` | |
| `0E4ABF3BC5D92FA0C380805453190703862567930DD74B9E7FCC1809564D181F` | `backend/test/logs-03c-r1.ataque.test.ts` | |
| `1E775A19682F3A5995D7C035BCC810A36BF50C22045B6FFBFC5A98B821255DB0` | `backend/test/logs-archivos-d-r1.ataque.test.ts` | |
| `E9CE866D511E3EE6029015B74E20B4D342A60BE99B3AAC97E86F00283A3C77F1` | `backend/test/logs-archivos-d-r3.ataque.test.ts` | |
| `E008935B107752D203F6423B2F1C9E0F5A4339F0A77154746BF262CECB90351A` | `backend/test/logs-cuentas-r1.ataque.test.ts` | |
| `690E30ED39111C0A074FC159015967CD9F0FDC24D9A340E6A0D7BE4B980A9D45` | `backend/test/logs-muro-c-r1.ataque.test.ts` | |
| `0809C60700E26183E7771B4B1A40B05CBF554C2ED7929190CF4D89A52722E551` | `backend/test/logs-muro-c-r2.ataque.test.ts` | |
| `5AF3909E4B7CA485E78979567872EA78BF41E6D679B9EC2C761EAA0B250DF689` | `backend/test/logs-r2.ataque.test.ts` | |
| `D6B9ADAF1C14A61FE369F510774EF702CFA20F28F3CB19B0EB7357440DCB0783` | `backend/test/migracion-01a-r1.ataque.test.ts` | |
| `BC6D49F9FC1F5EB20E305945FEF57CAEEBEB108BFF5D5CF4BA10B8040687D69C` | `backend/test/mis-calificaciones-01b-r1.ataque.test.ts` | |
| `D95AB72A3FD3D70CE3A9027A50DB660426976C3DF1A46E92DF75066BEAC78A0C` | `backend/test/muro-c-r1.ataque.test.ts` | |
| `7825CFC9B484DF740FA0E9562A195D1BBCAF4CAF72EA55FA847B5394AB96C125` | `backend/test/muro-c-r2.ataque.test.ts` | |
| `8B733B86FC6D54ECE008389A59793FAE4EC4A65146EB37215E900E50A5337D46` | `backend/test/nombres-guarda-r3.ataque.test.ts` | |
| `3FD2583A4DE7CD432B2E09A5130C23D6A59FA475E5E0AA69F23739351ACBF9CF` | `backend/test/nombres-ids-01a-r2.ataque.test.ts` | |
| `00A6EB6F7CCD7D8790C356BEFCC96DDFDA6EACCE0BE53DE255CFE3626D8F2ADB` | `backend/test/nombres-tokens-r2.ataque.test.ts` | |
| `80B5A848F69B429E7DADEC86C07BEC1D3E3EED8A042EFBA41CE912DED39E7BAB` | `backend/test/nowait-ch-r1.ataque.test.ts` | |
| `AD0DAB1952E509237ACAC12BB1F6774FA9C5DE8B44D1E6928EDC65CC67A78C21` | `backend/test/referencias-01b-r1.ataque.test.ts` | |
| `6F2ABC2CEFD77D74CD1E3ABBDCE9C41BB53D00BD4D8E5BA7E496C4441C2697E5` | `backend/test/servicio-ocupado-ch-r1.ataque.test.ts` | |
| `CCEA34C962FC8F14A49C64EAFA8119DAE5030E1302ED94FE369299EC49182BB8` | `backend/test/sesiones-y-cadena.ataque.test.ts` | |
| `70AC720F2E7FCADEE5BBCB6414887AB08129DEA7CD91DF012046953B1584E8B6` | `backend/test/sexto-paso-02a-r1.ataque.test.ts` | |
| `C89C30851E6B409CD045017181147BF674DF947762A8DEA3F3FB981BD9B36E09` | `backend/test/tareas-01a-r1.ataque.test.ts` | |
| `79BC7AAFC11676D36129610A4B5CD5FE5D8234D0D748487FD2F3E48C5F772C79` | `backend/test/tareas-01b-r1.ataque.test.ts` | |
| `AE60C11CFF5C82DF4954DB48582DF4BD5A64957FF9AFAF9712AA43A038F8E189` | `backend/test/temas-01a-r1.ataque.test.ts` | |
| `DC7B86A621062ED671C1E7174A745019133FBD410C7A2E78114B2A2C50AFFE95` | `backend/test/temas-01a-r3.ataque.test.ts` | |
| `F09E9A0038C47D1A2223376A0AF260BAF573F0C45BF770201C48C9E30296F04B` | `backend/test/worker-03c-r1.ataque.test.ts` | |
| `9F60F9D65D52D2021A1EB04E9F01D3CC68F22744C845BF93D6621AA4FE9713A8` | `backend/test/worker-r1.ataque.test.ts` | |
| `77D11BD85F202A9EEC92A363DF82E63FB9A784CA9D368D49F62E61C1A2AA967B` | `backend/test/worker-r2.ataque.test.ts` | |
| `0DE083DF355129E800D130F33D228835479C25F49ED82B6C2BCF9CF5F6E944CB` | `frontend/src/app/barra-02d-r1.ataque.test.tsx` | |
| `B89EDE0F6AED45DFCB5E64C8909A822156CE43FD80948E72419CDCE9D4541A87` | `frontend/src/app/cache-03a-r1.ataque.test.tsx` | |
| `E85743C0FBB8E476874A2C67334342D8D69D14153579FC1E4CCE0AE6E2B29616` | `frontend/src/app/contexto-r1.ataque.test.tsx` | |
| `BC2BE5541006887E2A5A4A89B33046180F607D54474B0F96A73D615AFBCAC385` | `frontend/src/app/contrasena-r1.ataque.test.tsx` | |
| `F38BCACB716D8A39ACDB3535A95603CD0D8AB02572CA57A7DF5268B01CEB6EAC` | `frontend/src/app/contrasena-r2.ataque.test.tsx` | |
| `68FB5D092C0C8ECFCF282477EF023AAAE26F6B869656E05109DC3EFA276D842A` | `frontend/src/app/cuentas-r1.ataque.test.tsx` | |
| `41930017715D3D6869DC7ACEFD75DE8EC3684F1F035B845ABDF8EC0F6B734DEE` | `frontend/src/app/cuentas-r2.ataque.test.tsx` | |
| `1506C27E5F7418B5E087FD30F8809645A2FC3E2761C7249DE78F02E24AA6C7A5` | `frontend/src/app/en-espera-r1.ataque.test.tsx` | |
| `DB48DAD405C27062621A44D3744C84CC5903892A51E5A8DF18F41383CB9C88A3` | `frontend/src/app/errores-r1.ataque.test.tsx` | |
| `0E1D93E4DD3CBC7B5E9475A17B5CA66F0DF056BA25CB117249F4C2E2F5887A51` | `frontend/src/app/foco-barra-02d-r2.ataque.test.tsx` | |
| `2154B5C15F696A0C7F884BFF774CF4E2A4208A5281DB9076653F8253E2385AB9` | `frontend/src/app/foco-pestana-02d-r3.ataque.test.tsx` | |
| `F95321E604E20B533EBF2DB3C1C6C66BA2F2D87A48F075415B766551F6EE30F4` | `frontend/src/app/fondo-r1.ataque.test.tsx` | |
| `57CB54AFD3B79464F0DF01B88FC388CEBBEAC5657D936C4C204CBAE6034B0834` | `frontend/src/app/marco-r1.ataque.test.tsx` | |
| `446CE2CC8A4F254F94FF6313EB13837421F98749C2473AA0B8979388E7CE674A` | `frontend/src/app/muro-recuperar-c-r3.ataque.test.tsx` | |
| `DC0365EDB436B3F2EE256882EF13F2295CDFCB83A63F9BA3939381983E43FDFC` | `frontend/src/app/muro-recuperar-c-r4.ataque.test.tsx` | |
| `2F8056A770397C1601647277944555A48AFC4B9A2BABEB75E5898F0CC92562BB` | `frontend/src/app/muro-rutas-c-r1.ataque.test.tsx` | |
| `0EEFED2C05D76B0790A437E9465A898A9076083B1F046F8785145CFAAD0DA379` | `frontend/src/app/registro-maestro-03b-r1.ataque.test.tsx` | |
| `053E867A904AFA3C09EEF92CA2E03E929D9F9C93F714040856F40C7418721BBE` | `frontend/src/app/router.ataque.test.tsx` | |
| `C67FA558FA7AE23821175478C8CB7D4874EE5F4D6CB84D0851F9A551B8AB455B` | `frontend/src/app/rutas-01d-r1.ataque.test.tsx` | |
| `F0657FB91F7B3ACCF64726292F9324C6742C1AC537C6C4A1985EC4E32AE09C83` | `frontend/src/app/rutas-02c-r1.ataque.test.tsx` | |
| `C7946F5F5D5D16D36B395ADC2AD9928ACC7FD9839875FB64532B51489756730B` | `frontend/src/app/rutas-clases-r1.ataque.test.tsx` | |
| `F090CBD8E8C9B0AF52D4FC19547B07E9B6413F5414CC4B10862F01E29818DDDC` | `frontend/src/app/sesion-r2.ataque.test.tsx` | |
| `11C6D9C55BE91AA41E8525345E3795E34B8E1E661FF7CDD901F729760A033CFD` | `frontend/src/components/adjuntos/errores-ch3-r1.ataque.test.ts` | |
| `48F5FF8FEF35FAA6D8500FAE4A53CA953D7F661100A5C4879BA58E68972AB2DE` | `frontend/src/components/foco/foco-01d-r1.ataque.test.ts` | |
| `36A104515F2EA87F143B2CFC00AEF9A33E6DDDB666844C1A9C977557EECA20EF` | `frontend/src/components/layout/estatico-r1.ataque.test.ts` | |
| `0AAA18CD70465293B6FCA6CC051B8E4AC360A838D02FEDE848C35376C3D0066C` | `frontend/src/components/layout/pie-r1.ataque.test.tsx` | |
| `00A707429AF6B5326F9A96DEF6382823CF4A6A092AAC7E7BD7CBCB8DC9AA1D21` | `frontend/src/components/layout/pie-r2.ataque.test.tsx` | |
| `472E1F46D0C899496AA334909B02988962AAB07B9BD29A8D7B8AF3987FAC6C76` | `frontend/src/components/layout/pie-r3.ataque.test.tsx` | |
| `A1814D281DAFD8243989C9F9A462A4F33A86B1FB70EEEBF29E99BCB0F340D82A` | `frontend/src/components/ui/badge-03b-r1.ataque.test.ts` | |
| `7D080037D9A64EEBCEBB789D1DFD94B787652103E6F9C84F968F9C9F64C3B30C` | `frontend/src/features/admin/cuentas-r1.ataque.test.tsx` | Reescrita (CHORE-03 03c, C-4) |
| `B948E9359FD3981E08B850540027F536F345A3F48D7C0749BA0C16C2C1DF1184` | `frontend/src/features/admin/cuentas-r2.ataque.test.tsx` | |
| `72BF9AF4CE8F52A114897E038CEFB0947841A37F74074F4C5F8DEC68A71B654A` | `frontend/src/features/admin/cuentas-r3.ataque.test.tsx` | |
| `942DF3015424AED56E83661993BA015E871CD6BE8E797920D47E8CBF0C56EAC4` | `frontend/src/features/admin/cuentas-r4.ataque.test.tsx` | |
| `3BD26E7E3BF019D462DB4837861ED22017BBB9E9A6276720BF0DEA6C2B5B0998` | `frontend/src/features/admin/en-espera-r1.ataque.test.tsx` | |
| `C21EDB5A06B43808CE2BE23058409B7FF887E66D60E842C500A3714A90EBCB25` | `frontend/src/features/admin/errores-ch3-r1.ataque.test.tsx` | Nueva (CHORE-03 03c, r1) |
| `8219C864E7BDC1315E6A0F0FF1CD6F54E4710CEBDCEB8E316F4E53AACC0CFF35` | `frontend/src/features/admin/foco-r1.ataque.test.tsx` | |
| `30F45BBA30D9348EC1587B42E84CA370274E1BF0AF0F310B8A6BBD79FA982669` | `frontend/src/features/admin/maestros-03b-r1.ataque.test.tsx` | |
| `D477A809E55E603D3EF6C02CA43B21372B75D0947FA303F1539D48BDF32841F8` | `frontend/src/features/admin/maestros-03c-r1.ataque.test.tsx` | |
| `76D9A6F2AA6E67D7A4812B203EC7C4AEA779A8427F62097E87B557326B84340E` | `frontend/src/features/admin/rutas-ch3-r1.ataque.test.tsx` | Nueva (CHORE-03 03c, r1) |
| `14EAD3DCE027B433D51A9D635B0FA35718EE3875BFFC3E1949F96ECB8D2F7135` | `frontend/src/features/admin/secuencias-ch3-r2.ataque.test.tsx` | Nueva (CHORE-03 03c, r2) |
| `3CEDA51DB8F67F40C26615FBC4CD7D082035B00F38713C6CA4C7DB58E47926C8` | `frontend/src/features/auth/enlace-r1.ataque.test.tsx` | |
| `1F5D1147637C09DAA6FDF1384E4395EDD69DFDAB84AAE5D602A362DABD3295BD` | `frontend/src/features/auth/enlace-r2.ataque.test.tsx` | |
| `AF3F0D474F8052B402C8959A64ACF9E730F9AE60F09D90996A6306E9C2440F08` | `frontend/src/features/auth/errores-ch3-r1.ataque.test.tsx` | Nueva (CHORE-03 03c, r1) |
| `991B115524D8DADE8D6EA2C51FB753DC8832EE410DB2161A0CE761D011CFCA4A` | `frontend/src/features/auth/invitacion-r1.ataque.test.tsx` | |
| `BA6A5A452593A8741CC6EE83150298B28BEEC2BBB22008BBAA76B761CA944AB3` | `frontend/src/features/auth/rutas-ch3-r1.ataque.test.tsx` | Nueva (CHORE-03 03c, r1) |
| `0CE580976EA894EE4BD9C4ADBE3D7D1D524354A8FF22FC7E7CC6ACF89057AA53` | `frontend/src/features/auth/secuencias-ch3-r2.ataque.test.tsx` | Nueva (CHORE-03 03c, r2) |
| `4BCD3E34B62726FEA718EFB9C482D8C1F504BBE85EF32427BDF4D65A6832D8F1` | `frontend/src/features/calificaciones/cursor-ch3-r1.ataque.test.ts` | Ronda 1 (CHORE-03 03b) |
| `F0CBA6F9B6C4CF1D74ED52AD89943088661370F5A784502F851CD6230912F606` | `frontend/src/features/calificaciones/estatico-01d-r1.ataque.test.ts` | |
| `5991D8E3D4E694973309F178E5341A2285584CF9ED6006FBB658D7F5A61DE5DD` | `frontend/src/features/calificaciones/gradebook-01d-r1.ataque.test.tsx` | |
| `C744FB831FA9992C2A9ED0729F9EC3CC089F3167CA19133C6EEE0133382607A1` | `frontend/src/features/calificaciones/gradebook-01d-r2.ataque.test.tsx` | |
| `8DEA1C2ADC5D228E166CE6037A1A1A827D26E2BDC6D7C8534F146517EBC1AC44` | `frontend/src/features/calificaciones/gradebook-01d-r3.ataque.test.tsx` | |
| `6F7496CA7652E7B4441A7EB9822E74270D50127AC40BA27B86C83EDFCD5CC3FA` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r1.ataque.test.tsx` | |
| `24751F358FC5ECD485C475E7025DD881B87FE892F025459A6FF29F615FC5CC66` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r2.ataque.test.tsx` | |
| `C504D0AD3690781275A6FFB78638A6148550B2FD4EE1ED25A4B154054FC4F80D` | `frontend/src/features/calificaciones/mis-calificaciones-01d-r3.ataque.test.tsx` | |
| `A8790F734402A957534D0F0E660EEF342F9029CDFC1991BE421D9B3E3C3E9CB7` | `frontend/src/features/calificaciones/secciones-01d-r3.ataque.test.tsx` | |
| `FB33F2A27BFCCA906549A12610977478BA72E6E7ED8AFD5C5A0A962DEB3EB802` | `frontend/src/features/calificaciones/secciones-01d-r4.ataque.test.tsx` | |
| `932E76314E0447DA1790C3C86CA48545EEA834FEAF6F706C4D405B7EA62BE872` | `frontend/src/features/clases/alumnos-b-r1.ataque.test.tsx` | |
| `55DC274ECA96DA4360848B88F9F2A839AC815031490AB57FF38DE074512D632C` | `frontend/src/features/clases/alumnos-b-r2.ataque.test.tsx` | |
| `371518E4309F14201A92D29F9436A97A19801B506D45114964FBCFE3F5CD4183` | `frontend/src/features/clases/alumnos-b-r3.ataque.test.tsx` | |
| `266D088DD727F18AF8C8A106B8D9C4DBED75753E4B1B4ABB12F3A4DF870ECB7F` | `frontend/src/features/clases/alumnos-b-r4.ataque.test.tsx` | |
| `856CFFBD9C743F9815DAF731487E29DC5F5272545DC15820A70BAF86ECFA6527` | `frontend/src/features/clases/alumnos-b-r5.ataque.test.tsx` | |
| `CC2FDD28CEB3DE642EE01D07773271D7154811B1F3756333F1DFB285A386E6CC` | `frontend/src/features/clases/archivos-d-r1.ataque.test.tsx` | |
| `36C32BAD5F632CAD5D76BCA14C74779DDD7CF9B9465A69522886DB770A508B22` | `frontend/src/features/clases/archivos-d-r2.ataque.test.tsx` | |
| `14CB04B6B56BF2F83DE04DAB863E7843FACA3A585E70FEBC93EE3588F06AB144` | `frontend/src/features/clases/archivos-d-r3.ataque.test.tsx` | |
| `71148A960F7EF6995904B3DB6DFD0B0E3BA6AF697C45399669EC1DD81CC7D1AA` | `frontend/src/features/clases/cargar-mas-02c-r2.ataque.test.tsx` | |
| `A3880B67FFAA0D15763D1C761CEF1FF8472029C77BFB2211AB079EADB1685325` | `frontend/src/features/clases/categorias-01e-r1.ataque.test.tsx` | |
| `66C0B873BC8B9D8E9E01AC871BD6AAAB4328508BEB5EC9371D69463D7C12430D` | `frontend/src/features/clases/categorias-01e-r2.ataque.test.tsx` | |
| `5272DE876597EAD9EF838E4D022185C80AA411AAD9E67325573C87F954C5F7A6` | `frontend/src/features/clases/clases-admin-02c-r1.ataque.test.tsx` | |
| `5F0679D8CFACC8BCE01989C04A415DC5B546625EB7DEC92F03959DE5A0F89815` | `frontend/src/features/clases/clases-r1.ataque.test.tsx` | |
| `C7AD5EDC733E374117A9277F1C2987E84CC2930C77EB4C720CCF15CC9F5FAB45` | `frontend/src/features/clases/clases-r2.ataque.test.tsx` | |
| `A835A11D29AEDB8F77F91E826A22C2B7CF5322FCED3F6BED0C1ACBF7C75A4E61` | `frontend/src/features/clases/clases-r3.ataque.test.tsx` | |
| `86B04D234527ECEEFCA35B07CE89E6B7CE0B6AFE5CCDEE2F005E6A4219F0495A` | `frontend/src/features/clases/clases-r4.ataque.test.tsx` | |
| `DCE7FD019A6E32B8E4DF37DD0728E265F5E9449E9EE2723F372EA174FE312464` | `frontend/src/features/clases/descarga-ch3-r2.ataque.test.tsx` | |
| `DDC9DFACCC8230EC612126FDF29939A8E4311188566E5CFCAA724BD119E959E8` | `frontend/src/features/clases/errores-ch3-r1.ataque.test.ts` | Ronda 1 (CHORE-03 03b) |
| `AF15BD75457BB2560E1D60BA3EB369786FE869BC3DCAE5FCE144C52049D7E4E8` | `frontend/src/features/clases/estatico-02c-r1.ataque.test.ts` | |
| `CDD1ED8890859AE3E884822FC7074852A2173105114745D83FE9A15C1C47C626` | `frontend/src/features/clases/estatico-r1.ataque.test.ts` | |
| `DE23D395DFE7A6F3D6D15EB48CB574599DC9D8204E5A90B255C0C10D25A186FA` | `frontend/src/features/clases/fila-01d-r1.ataque.test.tsx` | |
| `54A5DAA368528F1B64BD809C79964E30C42C3A71F76E2013643695FAAFA6C73E` | `frontend/src/features/clases/foco-02c-r3.ataque.test.tsx` | |
| `80EFD85B74264C125683DFB6D631A10DB40887C5E7315D5EF6FF7B49357EAAD7` | `frontend/src/features/clases/foco-02c-r4.ataque.test.tsx` | |
| `32C1F6A48BA3241963CF6864BD2236A0675425241D4389B524CBE805C358A5CC` | `frontend/src/features/clases/foco-02c-r5.ataque.test.tsx` | |
| `FDC9F0D1D5BDF7D8C6E9E7F15CCFA2D909F717E9465A8279F5540FB704958BB9` | `frontend/src/features/clases/foco-pestana-02d-r3.ataque.test.tsx` | |
| `9ADE89B7B54F15CA9B64639469DAE1D9B79C24D5AC5E6FC17857384642FAF0FC` | `frontend/src/features/clases/formularios-ch3-r1.ataque.test.tsx` | Ronda 1 (CHORE-03 03b) |
| `07287364693F0D3F6301E8CFD4DEBC448FCB706DFB0D70231AB0B0B9A8416B65` | `frontend/src/features/clases/formularios-ch3-r2.ataque.test.tsx` | Nueva (CHORE-03 03b, r2); Endurecida (PA-12, CHORE-03 03c r0) |
| `827B8ABCA664145D51A1BBD1C0B558B0EDDFED8707A21A774222B4972BE14FF2` | `frontend/src/features/clases/heredados-02d-r1.ataque.test.tsx` | |
| `0F60F1582FCE6E5EFAF9BF6856133DC30F1DC4EB9C3B7FEA19F90A330F8335B3` | `frontend/src/features/clases/inicio-sin-datos-02c-r1.ataque.test.tsx` | |
| `7C434A0E54E70B12D4B2A3DE22FFB4DBF5F28A1CFBD2290C22E8A2B59EDF0E16` | `frontend/src/features/clases/inicio-sin-datos-r2.ataque.test.tsx` | |
| `A4DE3A7DC35DAEDFF86FD41349EA09140213E918613603D0985C698FF41D29F7` | `frontend/src/features/clases/maestros-02c-r1.ataque.test.tsx` | |
| `B487B8C8C95BADC6BC78F3BE72B7B5F809381E8C69127D6600254B872DE62EBC` | `frontend/src/features/clases/muro-02c-r1.ataque.test.tsx` | |
| `9D35E0DA961248750C2948E3F69305856BCDD25E78E01C64AA50DCDFEEE93F8D` | `frontend/src/features/clases/muro-c-r1.ataque.test.tsx` | |
| `C50A5D53AD16EAFF69ABEC6F531B6C0EDD74CE4ECDA02380EDFBF66F7E5BA89B` | `frontend/src/features/clases/muro-c-r2.ataque.test.tsx` | |
| `A79B6AFC48B2F71D09BE0670D515C53ED33C5C922250C242F917998192A00D28` | `frontend/src/features/clases/muro-c-r3.ataque.test.tsx` | Reescrita (CHORE-03 03b, C-2/C-3): C-3 |
| `67B60A9A5363F88E6CEBA210C27452B8D639F6DF798AA4E506DC54BB2312249A` | `frontend/src/features/clases/personas-02d-r1.ataque.test.tsx` | |
| `826A564C2796CAD3689FC5EE8A8B68B0B3B35E8E17C7481DC92AFCF8374E166A` | `frontend/src/features/clases/recuperar-ch3-r1.ataque.test.tsx` | Ronda 1 (CHORE-03 03b); Endurecida (PA-12, CHORE-03 03c r0) |
| `85A7926A0F6831A8375F544CF38FE5585A8E2DCBF73D9726E9A3CFAAB7F76511` | `frontend/src/features/clases/refactor-01c-r1.ataque.test.tsx` | |
| `4303EAC77B98E8978495D9E68FD7725AC436F9DB757DBC0C02C59051436908FA` | `frontend/src/features/clases/reloj-01e-r4.ataque.test.tsx` | |
| `A4AA15CEF1A377EED688DAB1B92E5CA4A3943490144CEC861CF7B482845B0362` | `frontend/src/features/clases/segmentado-02d-r1.ataque.test.tsx` | |
| `D899C19BA982FBDE2208BBC7FA009869556C84BD4650586DBD9EE90B22234E47` | `frontend/src/features/clases/tarjeta-01d-r1.ataque.test.tsx` | |
| `97AF503E763F7DFF9FCFBDC72862CD21DE6AF8E51D3EC41134F8475D98AE2DF6` | `frontend/src/features/clases/tarjeta-01d-r2.ataque.test.tsx` | |
| `7F9D22E5904192DCC00465FADCABF36AA5DE3CD16D6A319A41A66340BB9BD6A8` | `frontend/src/features/clases/trabajo-01e-r1.ataque.test.tsx` | |
| `F6924BC272A5240CF97D35729C797CC10960ED7CF94FE1BE1B69CA2DF6C1CF8F` | `frontend/src/features/clases/trabajo-01e-r2.ataque.test.tsx` | |
| `9866EF34167061E2715B65A352C55D08C7E9268033E879AE633C7FD568E4D49F` | `frontend/src/features/clases/ventana-02c-r2.ataque.test.tsx` | |
| `008E5C606F249D15E3816E27E3E97FD7D7FBA0F8697751A156665A76694B3A18` | `frontend/src/features/clases/ver-mas-01e-r3.ataque.test.tsx` | |
| `2EF258E946084F17E33936E8FA257551A90323B589859DD2E1F70AABEAF711BF` | `frontend/src/features/tareas/aviso-calificar-01c-r3.ataque.test.tsx` | |
| `E2FEFD7D744F77C7BDD2BA73A08CC51076D0F6130BF4D0A225E0E972A1DCE111` | `frontend/src/features/tareas/avisos-01c-r2.ataque.test.tsx` | |
| `11BB5433FB30F268B6D93E1E7814D826BBAB8FB1F173E574FAF52F5A96B5A41E` | `frontend/src/features/tareas/calificar-01c-r1.ataque.test.tsx` | |
| `D8DACCB56C8DE8D9F1B0F8D1B0907C110E327F4F55B016FC0FE7FC0F25CCC79C` | `frontend/src/features/tareas/calificar-vacio-01c-r4.ataque.test.tsx` | |
| `EF86C46708F0682BCA5A023E85794639C396EC94D207CAC23CEB13585AB39E75` | `frontend/src/features/tareas/campos-01c-r2.ataque.test.tsx` | |
| `5FF367EDBA10C9BA9C7E50F8ED874032654FA2ABDC0DD8F4A122A000355472AB` | `frontend/src/features/tareas/cruces-01c-r3.ataque.test.tsx` | |
| `2938AE2F1C00F63A0372997C7BA68BDC0AB097895769BF9060072A4AC2674C5A` | `frontend/src/features/tareas/descarga-ch3-r2.ataque.test.tsx` | |
| `0963F14F4842D6D57288876C932496AC09D44B872FC049492EE6E8BA539F3235` | `frontend/src/features/tareas/editar-calificada-01c-r1.ataque.test.tsx` | |
| `4F486CA37D2A2BB6CC26754281D2ADCE086A9D8D4485A069DE7AE5D54E360ACF` | `frontend/src/features/tareas/entregas-01d-r1.ataque.test.tsx` | |
| `93A5A0A648669E9C96494A62B2B16082B07296F279E2892BF2C8D47834EE2FC1` | `frontend/src/features/tareas/entregas-01d-r2.ataque.test.tsx` | |
| `08A5E1A5642E7FC7553632DD5CF4E07F0EA35C3EF1E7293D010BBC49B09465AA` | `frontend/src/features/tareas/entregas-01d-r3.ataque.test.tsx` | Reescrita (CHORE-03 03b, C-2/C-3): C-2 |
| `172BE3EFD919C0D3948ECA17C7E808968E2370AFE1F9C2A28CEF7D2DED584B81` | `frontend/src/features/tareas/entregas-01e-r1.ataque.test.tsx` | |
| `496652BC59817166F53E00CB828F2119C857C2834063A31764D7876DC150C930` | `frontend/src/features/tareas/entregas-01e-r2.ataque.test.tsx` | |
| `4E6950F0FE571D6AE41A78380C59C20459FDF19F34C57E9777E4E34A6BC61C58` | `frontend/src/features/tareas/errores-ch3-r1.ataque.test.ts` | |
| `94D6E6253B266C7F21099AA593AAC7B2600EDCA22AB403AA365DCD789B1C6A97` | `frontend/src/features/tareas/errores-ch3-r2.ataque.test.ts` | |
| `F614E7369F8C47C40A87AD1F8867FB8EDF7EBC76E94D0BA6C5C59C92CB6347F0` | `frontend/src/features/tareas/estatico-01c-r1.ataque.test.ts` | |
| `FB387ECBB7E5272D2FFB53D626B51FFD9C57B409D10C560E6A5ECBFA6A2A8C19` | `frontend/src/features/tareas/forma-01c-r2.ataque.test.tsx` | |
| `E7733A1022A055D49CABA8D02859D11BC41475BCD283B6D166CE9C99D21A3EE6` | `frontend/src/features/tareas/formularios-ch3-r1.ataque.test.tsx` | Endurecida (PA-12, CHORE-03 03c r0) |
| `BFDED7507BC684EA9858CD76517EF0E4C23CBC69E5A19F381E6EC522FD6156E6` | `frontend/src/features/tareas/tareas-01a-r1.ataque.test.tsx` | |
| `B778FC2E6BB0A8F8715A56877B3B781439CA214C8A9C8AE126F610C95229882A` | `frontend/src/features/tareas/tareas-01d-r1.ataque.test.tsx` | |
| `BF3C999033195CAC778A82A579E44729FB07A405F5CDB41D8E7DC932CB71F942` | `frontend/src/features/tareas/tareas-01d-r2.ataque.test.tsx` | |
| `3567D7C23D2CF6A2FD538CD6822EF60AC3CFFEAC036394ED1E3559DEBE492C57` | `frontend/src/features/tareas/tareas-01d-r3.ataque.test.tsx` | |
| `6BBE2BD85E2B5500FBAB4D0F51630C0C8E9D65B1A63045AD1FA906298A92A435` | `frontend/src/features/tareas/tareas-01d-r4.ataque.test.tsx` | |
| `72B19B6A00B4ADE43B06829BB5BEF1A5CDECF5A7D2AF57369F1E857A1D4A17F5` | `frontend/src/lib/errores-ch3-r1.ataque.test.ts` | |
| `1D89FA156238E49D4F9FBF986951050597E514031C4F5701275DC4EAF98CDB37` | `frontend/src/lib/errores-ch3-r2.ataque.test.ts` | |
| `66513D957E524AF5E336A2C7E656DF37F51106507A3984B691DF47CD825D4D10` | `frontend/src/lib/estatico-ch3-r1.ataque.test.ts` | Nueva (CHORE-03 03c, r1) |
| `A9529CEFBD27CBB94376A6548EF1B8B247FB1F4155938298AE5D10EAEE81008A` | `frontend/src/lib/estatico-ch3-r2.ataque.test.ts` | Nueva (CHORE-03 03c, r2) |
| `60BC1FC7011E9A0FE5A4C4AA45420F2C7D38ADB9EE2F8D235D09847DBE13AC3A` | `frontend/src/lib/format-01c-r1.ataque.test.ts` | |
| `C71CBA65DD284D7AF11CBC812B6BCF75BAA373939EDB8318E731858D9C50173F` | `frontend/src/lib/format-d-r1.ataque.test.ts` | |
| `89DBBB70D5DC404C3D74DB5391D10855C8CB1D6B4C643B6147B3CE6FFB2637AF` | `frontend/src/lib/format-d-r2.ataque.test.ts` | |
| `BFA7DED62F7A1402590D438A1CC51060A63FA019AD47D3EB5740E43383064A2A` | `frontend/src/lib/format-d-r3.ataque.test.ts` | |
| `8BD0E034D4372D34BF145235372EFA27A150A38FD9A04EADB69FD48AC4E06D6C` | `frontend/src/services/apiClient-ch3-r1.ataque.test.ts` | Ronda 1 (CHORE-03 03b) |
| `10C730348D18FF8DAE7B3623751D31122AA58560B564AD191717FA1938A6F8CE` | `frontend/src/services/apiClient.ataque.test.ts` | |
| `FC4963D3FD93297C427EAD0B85B23615C287E4F2C48079BCA8031D1C2AEE0396` | `frontend/src/styles/clases-r1.ataque.test.ts` | |
| `B8085BCBBC7F4B6276BF3A87FB7BA0BC887953A8C6CE372354A7F3F1B5037582` | `frontend/src/styles/tokens-r1.ataque.test.ts` | |
