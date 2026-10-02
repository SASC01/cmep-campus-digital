# Comprobación humana — CLASES-01 · clases, personas y muro

Una sola, al final de CLASES-d, para todo el encargo (plan, paso 47; `AGENTS.md`, "Trabajo visual": máximo 10 minutos y 6 puntos, solo lo que las pruebas automáticas no ven). La lista la dejó el manager en `revision.md`, "Revisión final — CLASES-d", apartado "Comprobación humana en navegador"; el orquestador la transcribe aquí y anota el resultado. **Ningún agente abre navegadores: la hace el humano.**

Estado del código al hacerla: CLASES-d APROBADO por el manager (2026-10-02), tester en RESISTE (ronda 3), 107 `*.ataque` en verde; backend 120 archivos / 1300 pruebas, frontend 104 / 1395.

## Preparación (no cuenta en el tiempo)
1. **Servicios.** Desde `infra/`: `docker compose up -d`. PostgreSQL ya corre; esto levanta `minio`, `minio-init` y `livekit`. `minio-init` debe quedar en `Exited (0)`: es el que crea el bucket `campus-privado`.
2. **`backend/.env`.** Copia las cinco variables `STORAGE_*` de `backend/.env.example` (`STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_REGION`, `STORAGE_BUCKET_PRIVADO`). Deben coincidir con `infra/.env`; si cambiaste `MINIO_API_PORT`, ajusta `STORAGE_ENDPOINT`. No hace falta migrar: `campus_dev` ya tiene las 9 migraciones.
3. **Procesos.** API: `npm run dev` en `backend/`. SPA: `npm run dev` en `frontend/`. El worker no hace falta (los avisos del muro no tienen consumidor hasta NOTIFICACIONES); solo si das de alta al maestro por invitación de correo (el correo queda en `backend/tmp/correos/`). Con un enlace de registro de `/admin/maestros`, no.
4. **Cuentas `@pruebas.local`.** Un maestro **con nombre largo** y un estudiante, este en una ventana privada.
   - Nombre del maestro: `María Fernanda de los Ángeles Rodríguez Villanueva`
5. **Archivos para H-5.** Un PNG pequeño (cualquiera) y un PDF de menos de 25 MB **con acentos en el nombre**, por ejemplo `guía de práctica.pdf`.
6. **Cadenas para H-6** (nombres de dos clases más, que crea el maestro antes de H-6):
   - 120 caracteres sin espacios:
     `LaboratorioDeQuimicaOrganicaAvanzadaParaTerceroDeSecundariaGrupoBTurnoVespertinoCicloEscolar2026ConPracticasSemanalesFin`
   - 60 emojis:
     `📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚📚`

## Los seis puntos (unos 10 minutos: H-1 2, H-2 1, H-3 2, H-4 1.5, H-5 2, H-6 1.5)

### H-1. Clase y código (2 min)
1. Como maestro, crea una clase y copia su código.
2. Como estudiante, pégalo **en minúsculas y con un espacio en medio** en "Unirme a la clase". Los dos inicios deben mostrar la tarjeta de la clase, y el titular, el número correcto.
3. Como maestro, regenera el código.
4. Como el mismo estudiante, escribe el código viejo: debe decir que no existe.

### H-2. Foco con el teclado y el bloque destacado (1 min)
Con Tab, en el inicio:
- en una tarjeta verde o azul, el foco se ve como un contorno blanco por dentro; en una blanca, azul por fuera;
- en el bloque destacado, el foco también se ve;
- a 640 px o más, la tarjeta interna del bloque destacado queda a la derecha, y las tarjetas guardan su separación.

### H-3. Alumnos y personas (2 min)
Como maestro, en "Alumnos":
1. quita al estudiante (confirmación en línea). Con el teclado, el foco queda en el "Quitar" de la fila vecina o en el título "Alumnos"; nunca se pierde;
2. búscalo escribiendo su nombre **sin acentos**: su correo se ve **enmascarado** (a lo más dos letras, `***` y el dominio), nunca completo;
3. agrégalo de nuevo: en la tabla aparece con su correo **completo** y "Al corriente".

Como estudiante, en "Personas": el maestro va aparte y no ves ningún correo ni estado de pago.

### H-4. Muro sin archivos (1.5 min)
1. Como maestro, publica un anuncio. Mientras se publica aparece un instante la nota "Mientras se publica no puedes cambiar los archivos.", aunque no haya archivos (O-13): **di si te estorba.**
2. Publica un material.
3. Como estudiante, comenta.
4. Como maestro, borra ese comentario.

### H-5. Material con archivos (2 min)
Es la única comprobación real de la subida a MinIO y de su CORS (S-21).
1. Como maestro, elige el PNG y el PDF, y publica un material. **Mientras se publica, pulsa "Quitar" en uno:** no debe quitarlo, y la nota lo explica. Los controles se ven activos: es el residual aceptado de T-38. **Di si te basta la nota.**
2. Al terminar, la imagen se ve en vista previa.
3. "Descargar" del PDF lo baja **con su nombre original, con acentos**.
4. Como estudiante, también ves la imagen y descargas el PDF.
5. Como maestro, al pedir borrar esa publicación, la frase dice "Se borrará con sus comentarios y adjuntos.". Cancela.

**Si la subida falla por CORS** (aviso "No pudimos subir «…»…" y un error de CORS en la consola): detente. El remedio toca `infra/` y lo decides tú (S-21).

### H-6. A 360 px (1.5 min)
Antes, el maestro crea dos clases más con las dos cadenas de arriba.
- **En el inicio del maestro:** el titular no se desborda; las tarjetas van en una columna; la tarjeta interna queda debajo del texto; el saludo con el nombre largo no se sale.
- **En las tarjetas de las dos clases largas, y en su página** (el `h1` y "Maestro: …"): el texto parte la línea sin desplazamiento horizontal. En el inicio del estudiante, el nombre largo del maestro cabe en la tarjeta.
- **En "Alumnos":** la tabla se desplaza dentro de su contenedor, no la página.
- **En el muro:** la ficha del PDF y la imagen de H-5 no desbordan.
- **Con el lector de pantalla, una sola vez:** en el buscador de "Alumnos", pega una de las cadenas largas y escucha el campo. Se leen seguidas la ayuda permanente y el aviso de longitud. Si te molesta, el ajuste es del carril trivial. Si no cabe en el tiempo, queda "no verificado por decisión del humano".

## No verificado por decisión del humano, cubierto por pruebas automáticas
| Qué | Pruebas que lo cubren |
|---|---|
| El contraste | `tokens.test.ts` y `tokens-r1` |
| El estado "Deudor", que no se puede provocar desde la interfaz | PR-B03a y PR-B11a |
| El registro de `movimientos_inscripcion`, sin pantalla en CLASES | PR-B16a a PR-B16h |
| Los destinos de foco de §7.14 con lector de pantalla, salvo lo que se oye en H-3 y H-6 | Las pruebas de foco de b y c |
| Una vista previa vencida tras 4 o 5 minutos | PR-D18a, PR-D18b y las `*.ataque` de T-40 |
| Una URL `javascript:` o `data:` | PR-D17a, PR-D17b y T-39 |
| El alumno restringido sin URL | PR-D09c y PR-D09i |
| Los límites de tipo, tamaño y cantidad | PR-D11a a PR-D11d y PR-D04b |
| El firmado sin red | PR-D03a |
| Que ni el estado de pago ni el correo lleguen a un estudiante | PR-A16, PR-B02e y PR-D06c, entre otras |
| El CORS y la firma de R2 | Es `prod`: los verifica DEPLOY |

## Resultado
Lo anota el orquestador con lo que diga el humano. Un "no pasa" se escala: los ajustes visuales van por el carril trivial; lo que cambie la lógica, al carril que corresponda. Con el "bien", las marcas "propuesta" de `docs/DESIGN.md` de este encargo pasan a "propuesta aprobada (fecha)".

Hecha por el humano el 2026-10-02. Texto literal: "Comprobación: H-1 a H-6 bien. H-4: la nota sin archivos no estorba. H-5: la nota durante la subida basta."

| Punto | Resultado | Notas |
|---|---|---|
| H-1 | bien | |
| H-2 | bien | |
| H-3 | bien | |
| H-4 | bien | O-13: la nota sin archivos no estorba (queda como está; N-F5 cerrada) |
| H-5 | bien | Residual de T-38: la nota durante la subida basta. La subida a MinIO y su CORS funcionan en local (S-21 verificado) |
| H-6 | bien | |

Con el "bien", las marcas "propuesta" de `docs/DESIGN.md` de este encargo (CLASES-a, b, c y d) pasaron a "propuesta aprobada (2026-10-02)".

**Ajustes visuales que pidió el humano después de ver la pantalla** (carril trivial, `AGENTS.md` "Trabajo visual"; antes del commit `<Cd>`):
1. La descripción de la clase se desborda del recuadro con texto largo sin espacios: debe partirse dentro del panel (`overflow-wrap`), igual que ya hace el `h1`.
2. Quitar el monograma "cm" de la barra lateral; la barra empieza en "Inicio". Actualizar `DESIGN.md`.
3. El estado vacío del muro ("Publica el primer anuncio…" y "Tu maestro aún no ha publicado…") va dentro de un panel de vidrio, no suelto sobre el fondo. Aplica a todo `EstadoVacio` sobre el fondo con orbes.
4. Las pestañas Muro/Alumnos/Personas: el grupo va en vidrio y el indicador de la pestaña activa se desliza con transición (`transform`, unos 200 ms, respetando `prefers-reduced-motion`), no cambia de golpe. Registrado en `DESIGN.md` como regla para todo control segmentado o de pestañas futuro.
