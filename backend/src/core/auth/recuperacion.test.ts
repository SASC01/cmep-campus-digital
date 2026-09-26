import { describe, expect, it } from "vitest"

import { decidirEnvioDeRecuperacion } from "./recuperacion.js"

describe("decidirEnvioDeRecuperacion", () => {
  it("cuenta inexistente → no envía", () => {
    expect(decidirEnvioDeRecuperacion({ cuenta: null, enviadasEnLaVentana: 0 })).toEqual({
      enviar: false,
      motivo: "inexistente",
    })
  })

  it("cuenta inactiva → no envía", () => {
    expect(
      decidirEnvioDeRecuperacion({
        cuenta: { rol: "estudiante", activo: false },
        enviadasEnLaVentana: 0,
      }),
    ).toEqual({ enviar: false, motivo: "inactiva" })
  })

  it("cuenta admin → no envía", () => {
    expect(
      decidirEnvioDeRecuperacion({
        cuenta: { rol: "admin", activo: true },
        enviadasEnLaVentana: 0,
      }),
    ).toEqual({ enviar: false, motivo: "administrador" })
  })

  it("3 enviadas en la ventana → no envía (tope)", () => {
    expect(
      decidirEnvioDeRecuperacion({
        cuenta: { rol: "estudiante", activo: true },
        enviadasEnLaVentana: 3,
      }),
    ).toEqual({ enviar: false, motivo: "tope" })
  })

  it("2 enviadas en la ventana → sí envía", () => {
    expect(
      decidirEnvioDeRecuperacion({
        cuenta: { rol: "estudiante", activo: true },
        enviadasEnLaVentana: 2,
      }),
    ).toEqual({ enviar: true })
  })

  it("maestro activo → sí envía", () => {
    expect(
      decidirEnvioDeRecuperacion({
        cuenta: { rol: "maestro", activo: true },
        enviadasEnLaVentana: 0,
      }),
    ).toEqual({ enviar: true })
  })
})
