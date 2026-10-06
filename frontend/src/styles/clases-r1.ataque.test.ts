import { describe, expect, it } from "vitest"

// Ataques del Tester (DESIGN-01a, ronda 1): revisión estática del código de src/ (sin pruebas) con
// las búsquedas V-02 a V-07 y V-13 del plan, para que una clase por defecto de Tailwind, un color
// suelto, un vidrio fabricado a mano, un `disabled` en vuelo o un rojo sobre vidrio se pongan en
// rojo aquí (Tailwind ignora sin avisar una clase que no genera CSS: R-02).

const fuentes = import.meta.glob<string>("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
})

const codigo = Object.entries(fuentes).filter(([ruta]) => !/\.test\.tsx?$/.test(ruta))

const coincidencias = (patron: RegExp, archivos = codigo) =>
  archivos.flatMap(([ruta, texto]) =>
    texto
      .split("\n")
      .map((linea, indice) => ({ ruta, linea: indice + 1, texto: linea }))
      .filter(({ texto: linea }) =>
        new RegExp(patron.source, patron.flags.replace("g", "")).test(linea),
      )
      .map(({ ruta: r, linea, texto: t }) => `${r}:${linea}: ${t.trim()}`),
  )

const soloTsx = codigo.filter(([ruta]) => ruta.endsWith(".tsx"))
const rutasDe = (lista: string[]) => [...new Set(lista.map((l) => l.split(":")[0]))].sort()

describe("ataque (DESIGN-01a r1): clases anuladas y valores sueltos (V-02 a V-04)", () => {
  it("se leyó el código fuente", () => {
    expect(codigo.length).toBeGreaterThan(40)
  })

  it("V-02: ningún color de la paleta por defecto ni dark:", () => {
    const colores =
      /\b(bg|text|border|ring|outline|fill|stroke|from|via|to|shadow|decoration|accent|caret|divide|placeholder)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\b|\bdark:/
    expect(coincidencias(colores)).toEqual([])
  })

  it("V-03: ninguna clase de las escalas anuladas (tamaños, pesos, sombras, radios, interletraje, desenfoque)", () => {
    const escalas =
      /\btext-(xs|sm|base|lg|xl|[2-9]xl)\b|\bfont-(thin|extralight|light|semibold|extrabold|black)\b|\bshadow-(2xs|xs|sm|md|lg|xl|2xl)\b|\brounded-(xs|sm|md|lg|xl|2xl|3xl|4xl)\b|\brounded(["'\s]|$)|\btracking-(tighter|tight)\b|\bleading-none\b|\bbackdrop-(blur|saturate)|\bblur-(xs|sm|md|lg|xl)\b/
    expect(coincidencias(escalas)).toEqual([])
  })

  it("V-04: ningún color suelto ni valor arbitrario de tipografía, radio, sombra, fondo o borde", () => {
    expect(coincidencias(/#[0-9A-Fa-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/)).toEqual([])
    expect(
      coincidencias(/\b(text|rounded|shadow|leading|tracking|font|bg|border|outline)-\[/),
    ).toEqual([])
  })

  it("ningún fondo blanco o de superficie translúcido fabricado a mano", () => {
    expect(coincidencias(/\bbg-(surface|background|muted|card|popover)\/\d+/)).toEqual([])
  })
})

describe("ataque (DESIGN-01a r1): foco, espera y materiales (V-05 a V-07)", () => {
  it("V-05: outline-none solo en DialogContent; ningún ring- ni focus:", () => {
    expect(rutasDe(coincidencias(/outline-none|outline-hidden/))).toEqual([
      "/src/components/ui/dialog.tsx",
    ])
    expect(coincidencias(/outline-none|outline-hidden/)).toHaveLength(1)
    expect(coincidencias(/\bring-|\bfocus:/)).toEqual([])
  })

  // AUTH-03b ronda 0 (C-15, Enmienda 5): de 13 a 19 enEspera=. Los 13 de hoy se quedan en sus
  // archivos, y se suman los 6 botones de la lista cerrada de §D-B7, una aparición cada uno: "Crear
  // mi cuenta", "Generar enlace", "Copiar enlace", "Cargar más" de los registrados, y "Sí, revocar" y
  // "Cargar más enlaces" en tabla-enlaces.tsx o en el componente de su fila, si se extrae. Sigue
  // protegiendo: ningún `disabled` en JSX, aria-busy y aria-disabled solo en Button, y que el número
  // de botones con espera cambie solo con el plan (un botón de más o de menos, o un envoltorio que
  // reparta enEspera, vuelve a poner la prueba en rojo; R-16).
  // AUTH-03c ronda 0 (C-17, §D-C9): de 19 a 20 enEspera=. Se suma "Enviar invitaciones", una
  // aparición en features/admin/components/formulario-invitacion-masiva.tsx (mutación), a la lista
  // fija de archivos. Ningún otro botón nuevo de 03c lo lleva: ResultadoInvitacionMasiva no tiene
  // botones y "Generar enlace" solo pasa a outline. El resto de la lista, "Sí, revocar" y "Cargar más
  // enlaces" (2, en features/admin/components/ con al menos 1 en tabla-enlaces.tsx), no cambia. Sigue
  // protegiendo lo mismo que C-15: ningún `disabled` en JSX, aria-busy y aria-disabled solo en
  // Button, y que el número y el lugar de los botones con espera cambien solo con el plan.
  // CLASES-a ronda 0 (C-7, §D-R0; V-04 del plan de CLASES-01): de 20 a 25 enEspera=. Se suman, a la
  // lista fija de archivos, los cinco botones de §D-A5 en features/clases/components/: "Unirme a la
  // clase" (formulario-unirse-clase.tsx, 1), "Crear clase" o "Guardar cambios" (formulario-clase.tsx,
  // 1), "Ver más clases" (panel-mis-clases.tsx, 1) y "Copiar código" y "Sí, regenerar"
  // (codigo-de-clase.tsx, 2). Ningún otro archivo de CLASES-a lo lleva: el "Crear clase" del inicio
  // del maestro es un enlace y "Regenerar código" y "Cancelar" no esperan nada. Sigue protegiendo lo
  // mismo: ningún `disabled` en JSX, aria-busy y aria-disabled solo en Button, y que el número y el
  // lugar de los botones con espera cambien solo con el plan.
  // CLASES-b ronda 0 (C-11, §D-R0; §D-B4 y V-04 del plan de CLASES-01): de 25 a 29 enEspera=. Se
  // suman los cuatro botones de §D-B4: "Ver más alumnos" de los compañeros (personas-view.tsx, 1, en
  // la lista fija), "Agregar a la clase" (buscador-alumnos.tsx o el componente de su fila, 1) y "Sí,
  // quitar" y "Ver más alumnos" del roster (tabla-alumnos.tsx o el componente de su fila, 2; el
  // "Ver más alumnos" no es de una fila, así que tabla-alumnos.tsx lleva al menos 1). Como en C-15
  // de AUTH-03b, los que pueden vivir en un componente de fila quedan fuera de la lista fija: los 3
  // viven en features/clases/components/, nunca en los componentes de CLASES-a ni en
  // lista-personas.tsx (en la lista fija con 0), con a lo sumo 1 en buscador-alumnos.tsx y de 1 a 2
  // en tabla-alumnos.tsx. N-04 (§D-B4 bis) no cambia el botón de formulario-unirse-clase.tsx, y
  // "Quitar" y "Cancelar" no esperan nada. Sigue protegiendo lo mismo: ningún `disabled` en JSX,
  // aria-busy y aria-disabled solo en Button, y que el número y el lugar de los botones con espera
  // cambien solo con el plan.
  // CLASES-c ronda 0 (C-12, §D-R0; §D-C5 y V-04 del plan de CLASES-01): de 29 a 35 enEspera=. Se
  // suman, a la lista fija de archivos, los seis botones de §D-C5: "Publicar anuncio" o "Publicar
  // material" (components/formulario-publicacion.tsx, 1), "Ver más publicaciones" (muro-view.tsx,
  // 1), "Sí, borrar" de la publicación (components/publicacion-del-muro.tsx, 1), "Ver más
  // comentarios" y "Sí, borrar comentario" (components/comentarios-de-publicacion.tsx, 2) y
  // "Comentar" (components/formulario-comentario.tsx, 1). Como están en la lista fija, no cuentan
  // en el resto de features/clases/components/, que sigue siendo solo el buscador, el roster o sus
  // filas (3). §D-C5 bis no cambia ningún botón: buscador-alumnos.tsx y tabla-alumnos.tsx conservan
  // sus límites, y con-clase-de-la-ruta.tsx no lleva espera (cualquier enEspera= ahí sería uno de
  // más en el resto). "Ver comentarios", "Ocultar comentarios", "Borrar publicación", "Borrar",
  // "Cancelar" y los botones de tipo no esperan nada. Sigue protegiendo lo mismo: ningún `disabled`
  // en JSX, aria-busy y aria-disabled solo en Button, y que el número y el lugar de los botones con
  // espera cambien solo con el plan.
  // CLASES-d ronda 0 (C-13, §D-R0; §D-D5 y V-04 del plan de CLASES-01): de 35 a 36 enEspera=. Se
  // suma, a la lista fija de archivos, "Descargar" de la ficha de cada adjunto
  // (components/adjuntos-de-publicacion.tsx, 1). Ningún otro botón nuevo de d lo lleva: "Adjuntar
  // archivos" abre el selector y "Quitar" (components/lista-de-adjuntos-elegidos.tsx) solo cambia
  // estado local; el botón principal de formulario-publicacion.tsx sigue siendo el mismo (1), en
  // enEspera durante solicitar, subir y publicar. "Cambios por capa" no autoriza otro archivo de
  // componente para la ficha, así que "Descargar" no puede vivir en un componente de fila aparte; y
  // como lista-de-adjuntos-elegidos.tsx no está en la lista fija, un enEspera= ahí sería uno de más en
  // el resto de features/clases/components/ (que sigue siendo solo el buscador, el roster o sus
  // filas, 3). Sigue protegiendo lo mismo: ningún `disabled` en JSX, aria-busy y aria-disabled solo
  // en Button, y que el número y el lugar de los botones con espera cambien solo con el plan.
  // CLASES-02 ronda 0 de 02c (C-20, Enmienda 1, M-03; §D-2C2): de 36 a 39 enEspera=, con las cifras
  // que fija el plan. Se suman a la lista fija "Cargar más clases" (features/clases/
  // clases-admin-view.tsx, 1), "Sí, quitar" de los maestros de la clase (components/
  // lista-maestros-de-clase.tsx, 1) y "Asignar a la clase" (components/buscador-de-maestros.tsx,
  // 1, una sola expresión; "Elegir" no espera nada y no lo lleva); components/tabla-clases-admin.tsx
  // y components/firma-del-autor.tsx entran a la lista fija con 0. formulario-clase.tsx sigue con 1
  // ("Crear clase" o "Guardar cambios"), y el resto de features/clases/components/ sigue en 3 (el
  // buscador de alumnos, el roster o sus filas). El "Crear clase" de /admin/clases es un enlace.
  // Sigue protegiendo lo mismo: ningún `disabled` en JSX, aria-busy y aria-disabled solo en Button,
  // y que el número y el lugar de los botones con espera cambien solo con el plan.
  // CLASES-02 ronda 0 de 02d (C-20, Enmienda 1, M-03; §D-2D1): de 39 a 40 enEspera=, con la cifra
  // que fija el plan. Se suma "Reintentar" de la lista de clases de la barra lateral
  // (components/layout/lista-de-clases.tsx, 1, en la lista fija), en espera mientras la consulta
  // vuelve a pedir. Ningún otro botón de 02d lo lleva: el control segmentado del tipo de publicación
  // no espera nada, el botón principal de formulario-publicacion.tsx sigue siendo el mismo (1) y
  // "Personas" conserva su "Ver más alumnos" (personas-view.tsx, 1). Sigue protegiendo lo mismo:
  // ningún `disabled` en JSX, aria-busy y aria-disabled solo en Button, y que el número y el lugar de
  // los botones con espera cambien solo con el plan.
  it("V-06: ningún control con `disabled` en JSX; aria-busy y aria-disabled solo en Button; 40 enEspera", () => {
    expect(coincidencias(/\sdisabled(=|\s|\/?>|$)/, soloTsx)).toEqual([])
    // Atributos JSX, no la variante `aria-busy:` de las clases (button-variants.ts, §D-5).
    expect(rutasDe(coincidencias(/aria-(busy|disabled)=/, soloTsx))).toEqual([
      "/src/components/ui/button.tsx",
    ])
    const usos = coincidencias(/enEspera=/, soloTsx)
    expect(usos).toHaveLength(40)

    const porArchivo = new Map<string, number>()
    for (const uso of usos) {
      const ruta = uso.split(":")[0] ?? ""
      porArchivo.set(ruta, (porArchivo.get(ruta) ?? 0) + 1)
    }
    const fijos: Record<string, number> = {
      // Los 13 de antes de 03b.
      "/src/components/layout/barra-superior.tsx": 1,
      "/src/features/admin/components/buscador-de-cuenta.tsx": 1,
      "/src/features/admin/components/contrasena-temporal.tsx": 1,
      "/src/features/admin/components/ficha-de-cuenta.tsx": 1,
      "/src/features/admin/components/formulario-corregir-correo.tsx": 1,
      "/src/features/admin/components/formulario-invitar-maestro.tsx": 1,
      "/src/features/auth/acceso-restringido-view.tsx": 1,
      "/src/features/auth/components/formulario-cambiar-contrasena.tsx": 2,
      "/src/features/auth/components/formulario-login.tsx": 1,
      "/src/features/auth/components/formulario-nueva-contrasena.tsx": 1,
      "/src/features/auth/components/formulario-recuperar.tsx": 1,
      "/src/features/auth/components/formulario-registro.tsx": 1,
      // C-15 (1), (2), (3) y (6).
      "/src/features/auth/components/formulario-registro-maestro.tsx": 1,
      "/src/features/admin/components/formulario-generar-enlace.tsx": 1,
      "/src/features/admin/components/enlace-nuevo.tsx": 1,
      "/src/features/admin/components/registrados-del-enlace.tsx": 1,
      // C-17 (AUTH-03c): "Enviar invitaciones".
      "/src/features/admin/components/formulario-invitacion-masiva.tsx": 1,
      // C-7 (CLASES-a): los cinco botones de §D-A5.
      "/src/features/clases/components/formulario-unirse-clase.tsx": 1,
      "/src/features/clases/components/formulario-clase.tsx": 1,
      "/src/features/clases/components/panel-mis-clases.tsx": 1,
      "/src/features/clases/components/codigo-de-clase.tsx": 2,
      // C-11 (CLASES-b): "Ver más alumnos" de los compañeros.
      "/src/features/clases/personas-view.tsx": 1,
      // C-11: los componentes de CLASES-a sin espera, y la lista de compañeros de CLASES-b (su
      // "Ver más alumnos" va en personas-view.tsx), siguen sin enEspera=. Así el resto de
      // features/clases/components/ solo puede ser el buscador, el roster o sus filas.
      "/src/features/clases/components/bloque-destacado.tsx": 0,
      "/src/features/clases/components/encabezado-clase.tsx": 0,
      "/src/features/clases/components/secciones-de-clase.tsx": 0,
      "/src/features/clases/components/tarjeta-clase.tsx": 0,
      "/src/features/clases/components/lista-personas.tsx": 0,
      // C-12 (CLASES-c): los seis botones del muro de §D-C5.
      "/src/features/clases/components/formulario-publicacion.tsx": 1,
      "/src/features/clases/muro-view.tsx": 1,
      "/src/features/clases/components/publicacion-del-muro.tsx": 1,
      "/src/features/clases/components/comentarios-de-publicacion.tsx": 2,
      "/src/features/clases/components/formulario-comentario.tsx": 1,
      // C-13 (CLASES-d): "Descargar" de la ficha de cada adjunto (§D-D5).
      "/src/features/clases/components/adjuntos-de-publicacion.tsx": 1,
      // C-20 (CLASES-02c): "Cargar más clases", "Sí, quitar" y "Asignar a la clase"; la tabla de
      // clases del admin y la firma del autor sin espera.
      "/src/features/clases/clases-admin-view.tsx": 1,
      "/src/features/clases/components/lista-maestros-de-clase.tsx": 1,
      "/src/features/clases/components/buscador-de-maestros.tsx": 1,
      "/src/features/clases/components/tabla-clases-admin.tsx": 0,
      "/src/features/clases/components/firma-del-autor.tsx": 0,
      // C-20 (CLASES-02d): "Reintentar" de la lista de clases de la barra lateral.
      "/src/components/layout/lista-de-clases.tsx": 1,
    }
    for (const [ruta, cuantos] of Object.entries(fijos)) {
      expect(porArchivo.get(ruta) ?? 0, `enEspera= en ${ruta}`).toBe(cuantos)
    }
    // C-15 (4) y (5): "Sí, revocar" y "Cargar más enlaces", en tabla-enlaces.tsx o en el componente
    // de su fila; los dos viven en features/admin/components/ y tabla-enlaces.tsx lleva al menos uno.
    const resto = [...porArchivo].filter(([ruta]) => !(ruta in fijos))
    const suma = (lista: [string, number][]) =>
      lista.reduce((total, [, cuantos]) => total + cuantos, 0)
    const restoAdmin = resto.filter(([ruta]) => ruta.startsWith("/src/features/admin/components/"))
    const restoClases = resto.filter(([ruta]) =>
      ruta.startsWith("/src/features/clases/components/"),
    )
    expect(
      resto.length,
      `enEspera= fuera de la lista cerrada: ${resto.map(([r]) => r).join(", ")}`,
    ).toBe(restoAdmin.length + restoClases.length)
    expect(suma(restoAdmin)).toBe(2)
    expect(porArchivo.get("/src/features/admin/components/tabla-enlaces.tsx") ?? 0).toBeGreaterThan(
      0,
    )
    // C-11: "Agregar a la clase", "Sí, quitar" y "Ver más alumnos" del roster.
    expect(suma(restoClases)).toBe(3)
    const enBuscador = porArchivo.get("/src/features/clases/components/buscador-alumnos.tsx") ?? 0
    const enTabla = porArchivo.get("/src/features/clases/components/tabla-alumnos.tsx") ?? 0
    expect(enBuscador, "enEspera= en buscador-alumnos.tsx").toBeLessThanOrEqual(1)
    expect(enTabla, "enEspera= en tabla-alumnos.tsx").toBeGreaterThanOrEqual(1)
    expect(enTabla, "enEspera= en tabla-alumnos.tsx").toBeLessThanOrEqual(2)
  })

  // CLASES-a ronda 0 (C-8, §D-R0; §D-A5 y V-04 del plan de CLASES-01): el vidrio fuerte suma la
  // tarjeta interna del bloque destacado (bloque-destacado.tsx) y la tarjeta de clase
  // (tarjeta-clase.tsx); el vidrio azul, que hasta hoy no existía en el código, pasa a vivir en
  // exactamente bloque-destacado.tsx. El vidrio sin variante no cambia: PanelMisClases, el
  // encabezado de la clase y los formularios usan Card. Sigue protegiendo que ningún archivo gane
  // vidrio fuera de la lista cerrada del plan y que data-material y data-densidad no salgan del
  // contenedor del rol.
  // CLASES-02 ronda 0 de 02d (C-21, Enmienda 1, M-03; §D-2D1 y §D-2D3): el vidrio fuerte suma la
  // lista de clases de la barra lateral (components/layout/lista-de-clases.tsx: la insignia de la
  // variante blanca y el elemento activo, como los destinos) y el grupo "Tipo de publicación"
  // (features/clases/components/formulario-publicacion.tsx: "Elemento sobre vidrio", porque el
  // formulario ya es una Card). El vidrio sin variante, el vidrio azul y data-material no cambian.
  // Sigue protegiendo que ningún archivo gane vidrio fuera de la lista cerrada del plan.
  it("V-07: vidrio, vidrio fuerte y vidrio azul solo en la lista final del plan (igualdad exacta)", () => {
    // DESIGN-01b-1, ronda 1 (plan-01b.md, §D-9, texto de referencia de la ronda 1): igualdad
    // exacta con la lista final. toEqual acepta el (string | undefined)[] de rutasDe; una ruta
    // undefined haría fallar la igualdad.
    const vidrio = rutasDe(coincidencias(/"[^"\n]*(?<![\w-])vidrio(?![\w-])[^"\n]*"/))
    expect(vidrio).toContain("/src/components/ui/card.tsx")
    expect(vidrio).toEqual([
      "/src/components/layout/barra-navegacion.tsx",
      "/src/components/layout/barra-superior.tsx",
      "/src/components/layout/pie-de-pagina.tsx",
      "/src/components/ui/card.tsx",
    ])
    const vidrioFuerte = rutasDe(coincidencias(/\bvidrio-fuerte\b/))
    expect(vidrioFuerte).toContain("/src/components/ui/button-variants.ts")
    expect(vidrioFuerte).toEqual([
      "/src/components/cargando.tsx",
      "/src/components/layout/barra-navegacion.tsx",
      "/src/components/layout/lista-de-clases.tsx",
      "/src/components/ui/button-variants.ts",
      "/src/features/auth/components/panel-anuncios.tsx",
      "/src/features/clases/components/bloque-destacado.tsx",
      "/src/features/clases/components/formulario-publicacion.tsx",
      "/src/features/clases/components/tarjeta-clase.tsx",
    ])
    expect(rutasDe(coincidencias(/\bvidrio-azul\b/))).toEqual([
      "/src/features/clases/components/bloque-destacado.tsx",
    ])
    expect(rutasDe(coincidencias(/data-material|data-densidad/))).toEqual([
      "/src/components/layout/contenedor-rol.tsx",
    ])
  })
})

describe("ataque (DESIGN-01a r1): rojo sobre vidrio (V-13) y Toaster único", () => {
  // AUTH-03b ronda 0 (C-16, Enmienda 5): la insignia `danger` de components/ui/badge.tsx pinta
  // text-danger sobre su fondo --danger-soft sólido, en la misma cadena de clases, y el archivo no usa
  // text-destructive. Sigue protegiendo que el texto rojo solo aparezca donde el plan lo permite
  // (sólido, --danger-soft o iconos), nunca sobre vidrio al 62 %; ningún archivo de features/ gana
  // texto rojo (la insignia "Revocado" usa <Badge variant="danger">).
  it("V-13: texto rojo solo donde el plan lo permite (sólido, --danger-soft o iconos)", () => {
    const rojo = /\btext-(destructive|danger)([^-\w]|$)/
    expect(rutasDe(coincidencias(rojo, soloTsx))).toEqual([
      "/src/components/error-de-campo.tsx",
      "/src/components/mensaje-error.tsx",
      "/src/components/ui/badge.tsx",
      "/src/components/ui/sonner.tsx",
      "/src/features/auth/acceso-restringido-view.tsx",
    ])
    const enBadge = coincidencias(rojo, soloTsx).filter((l) =>
      l.startsWith("/src/components/ui/badge.tsx:"),
    )
    expect(enBadge.length, "badge.tsx no pinta la variante danger").toBeGreaterThan(0)
    for (const linea of enBadge) {
      expect(linea, "rojo en badge.tsx sin su fondo --danger-soft").toMatch(/\bbg-danger-soft\b/)
      expect(linea, "badge.tsx usa text-destructive").not.toMatch(/\btext-destructive\b/)
    }
  })

  it("en acceso restringido, el rojo solo va en los dos iconos (aria-hidden), nunca en texto", () => {
    const lineas = coincidencias(/\btext-danger\b/).filter((l) => l.includes("acceso-restringido"))
    expect(lineas).toHaveLength(2)
    for (const linea of lineas) expect(linea).toContain('aria-hidden="true"')
  })

  it("solo app/providers.tsx importa el Toaster de components/ui/sonner", () => {
    expect(rutasDe(coincidencias(/components\/ui\/sonner/))).toEqual(["/src/app/providers.tsx"])
    expect(rutasDe(coincidencias(/\bToaster\b/))).toEqual([
      "/src/app/providers.tsx",
      "/src/components/ui/sonner.tsx",
    ])
  })
})
