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
