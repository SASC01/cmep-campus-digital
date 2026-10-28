// CHORE-03 (§D-3): la tabla común de entradas fuera de contrato. Solo datos; la importan las pruebas
// de cada función de traducción de los módulos, nunca el código de producción. Todo carácter
// invisible va escrito como escape, nunca literal (Enmienda 1, N-02).

export const MENSAJE_DE_PRUEBA = "Revisa este valor."

// Ningún formulario lo pinta.
export const CAMPO_FUERA_DE_CONTRATO = "campoFueraDeContrato"

// Rutas que ningún formulario pinta (ni ids con texto fijo, ni "cursor").
export const RUTAS_FUERA_DE_CONTRATO: readonly string[] = [
  CAMPO_FUERA_DE_CONTRATO,
  "archivoIds.0",
  "archivoIds.12",
  "rubrica.2",
  "orden.3",
  "enlaces.0.url",
  "puntajes.0.criterioId",
  "cursor.0",
  "limite",
  "parámetro",
  "PUNTAJES.0.PUNTOS",
  "a.b.c.d.e.f.g.h",
  "x.0.y",
  "campo_raro-1",
  "0",
  "-",
  "_",
  ".",
  "archivoIds.0.id",
]

// Restos que no tienen ningún carácter visible.
export const RESTOS_SIN_TEXTO_VISIBLE: readonly string[] = [
  "",
  " ",
  "   ",
  "\t",
  "\n",
  "\t\n ",
  "\u{00A0}",
  "\u{3000}",
  "\u{200B}",
  "\u{200C}",
  "\u{200D}",
  "\u{2060}",
  "\u{FEFF}",
  "\u{0085}",
  "\u{200B}\u{00A0}\u{0085}",
]

export type ClaseFueraDeContrato =
  "campo-no-pintable" | "sin-texto-visible" | "ruta" | "dos-puntos-dentro" | "sin-ruta"

export interface EntradaFueraDeContrato {
  clase: ClaseFueraDeContrato
  // Crudo, como llega en error.message.
  mensaje: string
  // Lo que debe quedar tras quitar la ruta; null: sin texto visible (el genérico).
  resto: string | null
}

const CAMPO_NO_PINTABLE: EntradaFueraDeContrato = {
  clase: "campo-no-pintable",
  mensaje: `${CAMPO_FUERA_DE_CONTRATO}: ${MENSAJE_DE_PRUEBA}`,
  resto: MENSAJE_DE_PRUEBA,
}

const CON_RUTA: readonly EntradaFueraDeContrato[] = RUTAS_FUERA_DE_CONTRATO.flatMap((ruta) =>
  [`${ruta}: `, `${ruta}:`, `${ruta}:\t`].map((separador): EntradaFueraDeContrato => ({
    clase: "ruta",
    mensaje: `${separador}${MENSAJE_DE_PRUEBA}`,
    resto: MENSAJE_DE_PRUEBA,
  })),
)

const SIN_TEXTO_VISIBLE: readonly EntradaFueraDeContrato[] = RESTOS_SIN_TEXTO_VISIBLE.flatMap(
  (resto) =>
    [`${CAMPO_FUERA_DE_CONTRATO}:${resto}`, `archivoIds.0:${resto}`, resto].map(
      (mensaje): EntradaFueraDeContrato => ({ clase: "sin-texto-visible", mensaje, resto: null }),
    ),
)

const DOS_PUNTOS_DENTRO: readonly EntradaFueraDeContrato[] = [
  { clase: "dos-puntos-dentro", mensaje: "archivoIds.0: Debe ser 0: 10", resto: "Debe ser 0: 10" },
  { clase: "dos-puntos-dentro", mensaje: "x: Nota: algo", resto: "Nota: algo" },
]

// Enmienda 2 (T-01): la ruta del servidor seguida del nombre de campo que el esquema repite al inicio
// de su mensaje ("archivoId: archivoId: …"). Solo con rutas que nadie pinta; los mensajes reales del
// servidor van en CH3-A25.
const CON_CAMPO_REPETIDO: readonly EntradaFueraDeContrato[] = [
  {
    clase: "ruta",
    mensaje: `${CAMPO_FUERA_DE_CONTRATO}: ${CAMPO_FUERA_DE_CONTRATO}: ${MENSAJE_DE_PRUEBA}`,
    resto: MENSAJE_DE_PRUEBA,
  },
  {
    clase: "ruta",
    mensaje: `archivoIds.0.id: ${CAMPO_FUERA_DE_CONTRATO}: ${MENSAJE_DE_PRUEBA}`,
    resto: MENSAJE_DE_PRUEBA,
  },
  {
    clase: "sin-texto-visible",
    mensaje: `${CAMPO_FUERA_DE_CONTRATO}: ${CAMPO_FUERA_DE_CONTRATO}:\u{200B}`,
    resto: null,
  },
]

const SIN_RUTA: readonly EntradaFueraDeContrato[] = [
  { clase: "sin-ruta", mensaje: MENSAJE_DE_PRUEBA, resto: MENSAJE_DE_PRUEBA },
  {
    clase: "sin-ruta",
    mensaje: "Calificación de 0 a 10: revisa los puntos",
    resto: "Calificación de 0 a 10: revisa los puntos",
  },
]

export const ENTRADAS_FUERA_DE_CONTRATO: readonly EntradaFueraDeContrato[] = [
  CAMPO_NO_PINTABLE,
  ...CON_RUTA,
  ...SIN_TEXTO_VISIBLE,
  ...DOS_PUNTOS_DENTRO,
  ...CON_CAMPO_REPETIDO,
  ...SIN_RUTA,
]

// Una entrada de cada clase requerida, para las pruebas de interfaz de cada formulario. La ruta es de
// tres niveles, la forma `campo.<i>.subcampo:` (Enmienda 1, N-01); ningún formulario pinta
// `archivoIds` ni sus hijos.
export const ENTRADAS_DE_FORMULARIO: Readonly<
  Record<"campo-no-pintable" | "sin-texto-visible" | "ruta", EntradaFueraDeContrato>
> = {
  "campo-no-pintable": CAMPO_NO_PINTABLE,
  "sin-texto-visible": { clase: "sin-texto-visible", mensaje: "   ", resto: null },
  ruta: {
    clase: "ruta",
    mensaje: `archivoIds.0.id: ${MENSAJE_DE_PRUEBA}`,
    resto: MENSAJE_DE_PRUEBA,
  },
}
