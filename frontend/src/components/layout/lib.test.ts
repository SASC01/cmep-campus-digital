import { describe, expect, it } from "vitest"

import { ENLACES_DEL_COLEGIO } from "./data"
import { enlacesVisibles, esUrlPublicable, orbesEnMovimiento, textoDeDerechos } from "./lib"

describe("orbesEnMovimiento", () => {
  it.each(["/login", "/estudiante", "/maestro", "/login/", "/LOGIN"])("%s da true", (pathname) => {
    expect(orbesEnMovimiento(pathname)).toBe(true)
  })

  it.each([
    "/",
    "/registro",
    "/recuperar",
    "/restablecer",
    "/establecer-contrasena",
    "/cambiar-contrasena",
    "/acceso-restringido",
    "/diagnostico",
    "/admin",
    "/estudiante/clases",
    "/loginx",
  ])("%s da false", (pathname) => {
    expect(orbesEnMovimiento(pathname)).toBe(false)
  })
})

describe("esUrlPublicable", () => {
  it.each([
    "https://colegio.mx",
    "mailto:contacto@colegio.mx",
    "tel:+525555555555",
    "tel:+52 55 1234 5678",
  ])("%s es publicable", (url) => {
    expect(esUrlPublicable(url)).toBe(true)
  })

  it.each([
    null,
    "",
    "#",
    "/aviso",
    "http://colegio.mx",
    "javascript:alert(1)",
    "java\nscript:alert(1)",
    "colegio.mx",
    " https://colegio.mx ",
    "https://colegio.mx ",
    " https://colegio.mx",
    "\thttps://colegio.mx",
    "\u0001https://colegio.mx",
    "https://colegio.mx\u0000",
    "https://cole\ngio.mx",
    "https://cole­gio.mx",
    "https://Colegio.mx",
  ])("%s no es publicable", (url) => {
    expect(esUrlPublicable(url)).toBe(false)
  })
})

describe("enlacesVisibles", () => {
  it("con la configuración real (4 sin URL), 4 marcadores en desarrollo y 0 en producción", () => {
    expect(enlacesVisibles(ENLACES_DEL_COLEGIO, false)).toHaveLength(4)
    expect(enlacesVisibles(ENLACES_DEL_COLEGIO, false).every((e) => e.url === null)).toBe(true)
    expect(enlacesVisibles(ENLACES_DEL_COLEGIO, true)).toHaveLength(0)
  })

  it("con una mezcla, orden conservado, solo los publicables en producción", () => {
    const mezcla = [
      { texto: "A", url: null },
      { texto: "B", url: "https://colegio.mx" },
      { texto: "C", url: "http://colegio.mx" },
    ]
    expect(enlacesVisibles(mezcla, false)).toEqual([
      { texto: "A", url: null },
      { texto: "B", url: "https://colegio.mx" },
      { texto: "C", url: null },
    ])
    expect(enlacesVisibles(mezcla, true)).toEqual([{ texto: "B", url: "https://colegio.mx" }])
  })

  it("una URL con espacios alrededor sale como marcador en desarrollo y se omite en producción", () => {
    const mezcla = [{ texto: "D", url: " https://colegio.mx " }]
    expect(enlacesVisibles(mezcla, false)).toEqual([{ texto: "D", url: null }])
    expect(enlacesVisibles(mezcla, true)).toEqual([])
  })
})

describe("textoDeDerechos", () => {
  it("usa el año en curso, en la víspera de Año Nuevo", () => {
    expect(textoDeDerechos(new Date(2026, 11, 31, 23, 30))).toBe(
      "© 2026 Colegio Mexicano de Estudios de Posgrado Jurídicos y Económicos",
    )
  })

  it("usa el año en curso, el 1 de enero", () => {
    expect(textoDeDerechos(new Date(2027, 0, 1, 0, 30))).toBe(
      "© 2027 Colegio Mexicano de Estudios de Posgrado Jurídicos y Económicos",
    )
  })
})
