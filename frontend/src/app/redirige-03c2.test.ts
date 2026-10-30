import { describe, expect, it } from "vitest"

import { errorQueRedirigeElCliente } from "@/features/clases/lib"
import { errorQueRedirigeElCliente as delDeTareas } from "@/features/tareas/lib"
import { ApiError } from "@/services/apiClient"

// CLASES-03c2 (§D-11, Enmienda 7; CL3-C19): el ayudante de features/clases que dice si apiClient ya
// redirigió con un error (crear y editar clase no lo avisan con el formulario desmontado). Mismo nombre,
// firma y resultado que el de features/tareas. Vive en app/ porque compara los dos módulos, y un módulo
// de features/ no importa de otro (regla 9, también en sus pruebas).

const CASOS: [string, boolean, unknown][] = [
  ["ApiError ACCESO_RESTRINGIDO", true, new ApiError("ACCESO_RESTRINGIDO", "Restringido.", 403)],
  [
    "ApiError CAMBIO_DE_CONTRASENA_REQUERIDO",
    true,
    new ApiError("CAMBIO_DE_CONTRASENA_REQUERIDO", "Cambia tu contraseña.", 403),
  ],
  ["ApiError NO_AUTENTICADO", true, new ApiError("NO_AUTENTICADO", "Inicia sesión.", 401)],
  ["ApiError VALIDACION", false, new ApiError("VALIDACION", "nombre: muy corto", 400)],
  [
    "ApiError SIN_ACCESO_A_LA_CLASE",
    false,
    new ApiError("SIN_ACCESO_A_LA_CLASE", "Sin acceso.", 403),
  ],
  ["ApiError SERVICIO_OCUPADO", false, new ApiError("SERVICIO_OCUPADO", "Ocupado.", 503)],
  ["un Error", false, new Error("ACCESO_RESTRINGIDO")],
  ["null", false, null],
  ["un objeto con codigo que no es ApiError", false, { codigo: "ACCESO_RESTRINGIDO" }],
]

describe("errorQueRedirigeElCliente de features/clases (CL3-C19)", () => {
  it.each(CASOS)(
    "CL3-C19: %s da %s, lo mismo que el de features/tareas",
    (_nombre, esperado, error) => {
      expect(errorQueRedirigeElCliente(error)).toBe(esperado)
      expect(errorQueRedirigeElCliente(error)).toBe(delDeTareas(error))
    },
  )
})
