import { describe, expect, it } from "vitest"

import { filaDeUsuarioAdmin, type CuentaParaGestion } from "./fila.js"

const COMUNES = ["activo", "creadoEn", "email", "id", "nombre", "rol"]

const cuenta = (cambios: Partial<CuentaParaGestion> = {}): CuentaParaGestion => ({
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  nombre: "Ana Ruiz",
  email: "ana@pruebas.local",
  rol: "estudiante",
  activo: true,
  creadoEn: new Date("2026-11-01T10:00:00.000Z"),
  estadoPago: "deudor",
  fechaEstadoPago: new Date("2026-11-02T11:30:00.000Z"),
  accesoRestringido: true,
  motivoRestriccion: "Adeudo",
  fechaRestriccion: new Date("2026-11-03T12:45:00.000Z"),
  ...cambios,
})

describe("filaDeUsuarioAdmin (ADM-1E01, M-14)", () => {
  it("ADM-1E01: un estudiante trae las seis claves comunes y los cinco datos de pago y acceso, con las fechas en ISO", () => {
    expect(filaDeUsuarioAdmin(cuenta())).toEqual({
      id: "0f8fad5b-d9cb-469f-a165-70867728950e",
      nombre: "Ana Ruiz",
      email: "ana@pruebas.local",
      rol: "estudiante",
      activo: true,
      creadoEn: "2026-11-01T10:00:00.000Z",
      estadoPago: "deudor",
      fechaEstadoPago: "2026-11-02T11:30:00.000Z",
      accesoRestringido: true,
      motivoRestriccion: "Adeudo",
      fechaRestriccion: "2026-11-03T12:45:00.000Z",
    })
  })

  it("ADM-1E01: un estudiante sin fechas ni motivo los trae en null, nunca sin la clave", () => {
    const fila = filaDeUsuarioAdmin(
      cuenta({
        estadoPago: "al_corriente",
        fechaEstadoPago: null,
        accesoRestringido: false,
        motivoRestriccion: null,
        fechaRestriccion: null,
        activo: false,
      }),
    )
    expect(fila).toMatchObject({
      activo: false,
      estadoPago: "al_corriente",
      fechaEstadoPago: null,
      accesoRestringido: false,
      motivoRestriccion: null,
      fechaRestriccion: null,
    })
    expect(Object.keys(fila).sort()).toEqual(
      [
        ...COMUNES,
        "accesoRestringido",
        "estadoPago",
        "fechaEstadoPago",
        "fechaRestriccion",
        "motivoRestriccion",
      ].sort(),
    )
  })

  it("ADM-1E01: un maestro y el admin traen exactamente las seis claves comunes, aunque la cuenta tenga datos de pago o de acceso", () => {
    for (const rol of ["maestro", "admin"] as const) {
      const fila = filaDeUsuarioAdmin(cuenta({ rol }))
      expect(Object.keys(fila).sort(), rol).toEqual(COMUNES)
      expect(fila, rol).toEqual({
        id: "0f8fad5b-d9cb-469f-a165-70867728950e",
        nombre: "Ana Ruiz",
        email: "ana@pruebas.local",
        rol,
        activo: true,
        creadoEn: "2026-11-01T10:00:00.000Z",
      })
    }
  })
})
