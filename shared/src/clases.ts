import { z } from "zod"

import { paginacionSchema } from "./enlaces-registro.js"

// Código de invitación (S-03): 7 caracteres de un alfabeto sin I, O, 0 ni 1 (32 símbolos, unos
// 3.4 × 10¹⁰ códigos posibles). codigoDesdeBytes (core/clases/codigo.ts) usa este mismo alfabeto.
export const ALFABETO_CODIGO_CLASE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
export const LONGITUD_CODIGO_CLASE = 7

// Al escribirlo, se aceptan minúsculas y una lista cerrada y explícita de separadores (S-03): nada
// de \s, que de JavaScript incluye separadores Unicode y, por herencia histórica, U+FEFF (el BOM),
// que quedaría fuera del código en lugar de rechazarse (ronda 1 del tester, T-04).
//
// Arbitraje del manager sobre S-03 (ronda 2 del tester, T-15: la corrección de T-04 dejaba fuera
// espacios y guiones visibles que un correo, un procesador de texto o un teclado móvil insertan al
// copiar o escribir el código). Espacios: el espacio y el tabulador ASCII, el espacio no separable
// (U+00A0, el que insertan correos y procesadores de texto), el espacio de cifra (U+2007), el
// espacio fino no separable (U+202F) y el espacio ideográfico (U+3000). Guiones: el guion ASCII,
// U+2010 (guion) y U+2011 (guion no separable). No se incluyen las rayas U+2012 a U+2015 (en
// español, "guion" y "raya" son cosas distintas) ni ningún otro separador o carácter de formato:
// U+FEFF y U+200B (los invisibles de T-04) siguen sin ser separadores y, por lo tanto, se rechazan
// en el regex final del esquema si sobreviven a este reemplazo.
const SEPARADORES_CODIGO_CLASE = /[ \t\-\u00a0\u2007\u202f\u3000\u2010\u2011]/g

// Solo pasa a mayúscula las letras ASCII a-z: String.prototype.toUpperCase() es consciente de
// Unicode y pliega o expande caracteres (ß → SS, ſ → S, la ligadura ﬀ → FF), lo que cambia la
// longitud del código o lo confunde con letras del alfabeto que nadie escribió (T-04). Cualquier
// carácter fuera de a-z pasa intacto, así que el regex final del esquema lo rechaza.
const aMayusculasSoloAscii = (texto: string): string =>
  Array.from(texto, (caracter) => {
    const punto = caracter.codePointAt(0) ?? 0
    return punto >= 0x61 && punto <= 0x7a ? String.fromCharCode(punto - 32) : caracter
  }).join("")

export const normalizarCodigoDeClase = (texto: string): string =>
  aMayusculasSoloAscii(texto.replace(SEPARADORES_CODIGO_CLASE, ""))

export const codigoInvitacionSchema = z
  .string({ error: "Escribe el código de la clase" })
  .max(40, "Escribe el código de la clase")
  .transform(normalizarCodigoDeClase)
  .pipe(z.string().regex(/^[A-HJ-NP-Z2-9]{7}$/, "Escribe los 7 caracteres del código"))

// Caracteres de control (\p{Cc}) y los inversores de dirección (U+202A a U+202E, U+2066 a
// U+2069): un nombre o un texto largo con ellos podría alterar cómo se lee en la interfaz.
const CARACTERES_DE_CONTROL = /[\p{Cc}]/u
const INVERSORES_DE_DIRECCION = /[‪-‮⁦-⁩]/u

// T-16 (ronda 2 del tester): U+2028 (separador de línea, Zl) y U+2029 (separador de párrafo, Zp)
// son saltos obligatorios según UAX #14, igual que \r y \n; "una sola línea" (S-02) los cubre a
// los cuatro.
const SEPARADORES_DE_LINEA_UNICODE = /[\r\n\u2028\u2029]/

export const nombreClaseSchema = z
  .string({ error: "Escribe el nombre de la clase" })
  .trim()
  .min(2, "El nombre debe tener al menos 2 caracteres")
  .max(120, "El nombre no puede tener más de 120 caracteres")
  .refine(
    (texto) => !SEPARADORES_DE_LINEA_UNICODE.test(texto),
    "El nombre debe ser de una sola línea",
  )
  .refine((texto) => !CARACTERES_DE_CONTROL.test(texto), "El nombre tiene caracteres no permitidos")
  .refine(
    (texto) => !INVERSORES_DE_DIRECCION.test(texto),
    "El nombre tiene caracteres no permitidos",
  )

// Un carácter de control (\p{Cc}) que no sea salto de línea ni tabulador: recorre el texto en
// puntos de código completos, sin una clase de caracteres con rangos de control literales
// (ESLint no-control-regex la marcaría, aunque estén escapados).
const tieneControlNoPermitido = (texto: string): boolean =>
  Array.from(texto).some(
    (caracter) => /\p{Cc}/u.test(caracter) && caracter !== "\n" && caracter !== "\t",
  )

// Permite \n y \t (varias líneas); prohíbe los demás caracteres de control C0/C1 y los inversores
// de dirección; admite el unificador de emoji (U+200D). Usado por descripcionClaseSchema (a) y,
// en CLASES-c, por el texto de publicaciones y comentarios.
export const textoLargoSchema = (max: number) =>
  z
    .string()
    .max(max, `No puede tener más de ${max} caracteres`)
    .refine((texto) => !tieneControlNoPermitido(texto), "El texto tiene caracteres no permitidos")
    .refine(
      (texto) => !INVERSORES_DE_DIRECCION.test(texto),
      "El texto tiene caracteres no permitidos",
    )

// Una descripción vacía después de trim se guarda como null (S-02).
export const descripcionClaseSchema = z
  .string()
  .trim()
  .transform((texto) => (texto.length === 0 ? undefined : texto))
  .pipe(textoLargoSchema(2000).optional())
  .optional()

export const crearClaseSchema = z.object({
  nombre: nombreClaseSchema,
  descripcion: descripcionClaseSchema,
})

export const editarClaseSchema = crearClaseSchema

export const unirseSchema = z.object({ codigo: codigoInvitacionSchema })

export const claseIdParamSchema = z.object({
  claseId: z.uuid("claseId: debe ser un identificador válido"),
})

export const maestroDeClaseSchema = z.object({ id: z.uuid(), nombre: z.string() })

// Sin codigoInvitacion (solo lo ve el dueño por GET/POST …/codigo, con no-store).
export const claseDetalleSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  maestro: maestroDeClaseSchema,
})

export const claseInscritaSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  maestro: z.object({ nombre: z.string() }),
})

export const claseImpartidaSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  alumnos: z.number().int().min(0),
})

export const listaClasesInscritasRespuestaSchema = z.object({
  clases: z.array(claseInscritaSchema),
  total: z.number().int().min(0),
  siguienteCursor: z.uuid().nullable(),
})

export const listaClasesImpartidasRespuestaSchema = z.object({
  clases: z.array(claseImpartidaSchema),
  total: z.number().int().min(0),
  siguienteCursor: z.uuid().nullable(),
})

export const unirseRespuestaSchema = z.object({
  clase: z.object({ id: z.uuid(), nombre: z.string() }),
  yaEstabas: z.boolean(),
})

export const codigoClaseRespuestaSchema = z.object({ codigo: z.string() })

export const claseRespuestaSchema = z.object({ clase: claseDetalleSchema })

// paginacionSchema se reutiliza desde enlaces-registro.ts, sin moverlo (§D-A3).
export { paginacionSchema }

export const CODIGOS_CLASES = {
  SIN_ACCESO_A_LA_CLASE: "SIN_ACCESO_A_LA_CLASE",
  CODIGO_INVALIDO: "CODIGO_INVALIDO",
  ALUMNO_NO_ENCONTRADO: "ALUMNO_NO_ENCONTRADO",
  PUBLICACION_NO_ENCONTRADA: "PUBLICACION_NO_ENCONTRADA",
  COMENTARIO_NO_ENCONTRADO: "COMENTARIO_NO_ENCONTRADO",
  BUSQUEDA_MUY_CORTA: "BUSQUEDA_MUY_CORTA",
} as const

export type CodigoClases = (typeof CODIGOS_CLASES)[keyof typeof CODIGOS_CLASES]
export type CrearClase = z.infer<typeof crearClaseSchema>
export type EditarClase = z.infer<typeof editarClaseSchema>
export type Unirse = z.infer<typeof unirseSchema>
export type ClaseIdParam = z.infer<typeof claseIdParamSchema>
export type ClaseDetalle = z.infer<typeof claseDetalleSchema>
export type ClaseInscrita = z.infer<typeof claseInscritaSchema>
export type ClaseImpartida = z.infer<typeof claseImpartidaSchema>
export type ListaClasesInscritasRespuesta = z.infer<typeof listaClasesInscritasRespuestaSchema>
export type ListaClasesImpartidasRespuesta = z.infer<typeof listaClasesImpartidasRespuestaSchema>
export type UnirseRespuesta = z.infer<typeof unirseRespuestaSchema>
export type CodigoClaseRespuesta = z.infer<typeof codigoClaseRespuestaSchema>
export type ClaseRespuesta = z.infer<typeof claseRespuestaSchema>
