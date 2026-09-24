import { describe, expect, it } from "vitest"

import {
  evaluarAcceso,
  evaluarPasswordGate,
  evaluarRol,
  type PerfilAutenticado,
} from "./autorizacion.js"

const perfilBase: PerfilAutenticado = {
  id: "5a5d7a3e-1c1f-4b8e-9a1e-0f2a3b4c5d6e",
  nombre: "Ana López",
  email: "ana@ejemplo.mx",
  rol: "estudiante",
  activo: true,
  accesoRestringido: false,
  motivoRestriccion: null,
  debeCambiarContrasena: false,
}

describe("evaluarPasswordGate", () => {
  it("bloquea con 403 CAMBIO_DE_CONTRASENA_REQUERIDO cuando hay cambio pendiente", () => {
    const error = evaluarPasswordGate({ ...perfilBase, debeCambiarContrasena: true })
    expect(error?.codigo).toBe("CAMBIO_DE_CONTRASENA_REQUERIDO")
    expect(error?.estado).toBe(403)
  })

  it("deja pasar el cambio pendiente cuando la ruta lo permite", () => {
    expect(
      evaluarPasswordGate(
        { ...perfilBase, debeCambiarContrasena: true },
        { permitirCambioPendiente: true },
      ),
    ).toBeNull()
  })

  it("deja pasar cuando no hay cambio pendiente", () => {
    expect(evaluarPasswordGate(perfilBase)).toBeNull()
  })
})

describe("evaluarAcceso", () => {
  it("bloquea con 403 ACCESO_RESTRINGIDO a un perfil restringido", () => {
    const error = evaluarAcceso({ ...perfilBase, accesoRestringido: true })
    expect(error?.codigo).toBe("ACCESO_RESTRINGIDO")
    expect(error?.estado).toBe(403)
    expect(error?.message).toBe("Tu acceso está restringido. Acude a administración.")
  })

  it("deja pasar a un restringido cuando la ruta lo permite (GET /me)", () => {
    expect(
      evaluarAcceso({ ...perfilBase, accesoRestringido: true }, { permitirRestringido: true }),
    ).toBeNull()
  })

  it("deja pasar a un perfil sin restricción", () => {
    expect(evaluarAcceso(perfilBase)).toBeNull()
  })
})

describe("evaluarRol", () => {
  it("sin roles exigidos deja pasar a cualquiera", () => {
    expect(evaluarRol(perfilBase, [])).toBeNull()
  })

  it("deja pasar cuando el rol está entre los permitidos", () => {
    expect(evaluarRol({ ...perfilBase, rol: "maestro" }, ["maestro", "admin"])).toBeNull()
  })

  it("bloquea con 403 ROL_NO_PERMITIDO cuando el rol no está permitido", () => {
    const error = evaluarRol(perfilBase, ["admin"])
    expect(error?.codigo).toBe("ROL_NO_PERMITIDO")
    expect(error?.estado).toBe(403)
  })
})
