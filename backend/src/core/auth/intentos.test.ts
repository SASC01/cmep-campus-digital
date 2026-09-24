import { describe, expect, it } from "vitest"

import {
  estaBloqueado,
  llaveDeIntento,
  podarLlaves,
  POLITICA_INTENTOS,
  registrarFallo,
  reservarIntento,
} from "./intentos.js"

const ahora = new Date("2026-09-23T12:00:00.000Z")
const minutos = (n: number) => n * 60_000

describe("llaveDeIntento", () => {
  it("combina IP y correo normalizado; el mismo correo desde otra IP es otra llave", () => {
    expect(llaveDeIntento("127.0.0.1", "ana@ejemplo.mx")).toBe("127.0.0.1|ana@ejemplo.mx")
    expect(llaveDeIntento("10.0.0.2", "ana@ejemplo.mx")).not.toBe(
      llaveDeIntento("127.0.0.1", "ana@ejemplo.mx"),
    )
  })
})

describe("estaBloqueado", () => {
  it("no bloquea con menos fallos que el máximo", () => {
    const fallos = [1, 2, 3, 4].map((i) => ahora.getTime() - minutos(i))
    expect(estaBloqueado(fallos, ahora)).toBe(false)
  })

  it("bloquea al alcanzar el máximo dentro de la ventana", () => {
    const fallos = [1, 2, 3, 4, 5].map((i) => ahora.getTime() - minutos(i))
    expect(estaBloqueado(fallos, ahora)).toBe(true)
    expect(POLITICA_INTENTOS.maximo).toBe(5)
  })

  it("ignora los fallos que ya salieron de la ventana de 15 minutos", () => {
    const viejos = [16, 17, 18].map((i) => ahora.getTime() - minutos(i))
    const recientes = [1, 2].map((i) => ahora.getTime() - minutos(i))
    expect(estaBloqueado([...viejos, ...recientes], ahora)).toBe(false)
  })
})

describe("registrarFallo", () => {
  it("poda los fallos fuera de ventana, añade el actual y no muta el arreglo original", () => {
    const original = [ahora.getTime() - minutos(20), ahora.getTime() - minutos(1)]
    const copia = [...original]

    const resultado = registrarFallo(original, ahora)

    expect(resultado).toEqual([ahora.getTime() - minutos(1), ahora.getTime()])
    expect(original).toEqual(copia)
  })
})

describe("reservarIntento", () => {
  it("permite y reserva mientras haya cupo; el sexto consecutivo queda bloqueado sin anotarse", () => {
    let fallos: number[] = []
    for (let i = 0; i < 5; i += 1) {
      const reserva = reservarIntento(fallos, ahora)
      expect(reserva.permitido).toBe(true)
      fallos = reserva.fallos
    }
    expect(fallos).toHaveLength(5)

    const sexto = reservarIntento(fallos, ahora)

    expect(sexto.permitido).toBe(false)
    expect(sexto.fallos).toHaveLength(5)
  })

  it("poda los fallos fuera de la ventana y vuelve a permitir pasados 15 minutos", () => {
    const viejos = [1, 2, 3, 4, 5].map((i) => ahora.getTime() - minutos(15) - i)

    const reserva = reservarIntento(viejos, ahora)

    expect(reserva).toEqual({ permitido: true, fallos: [ahora.getTime()] })
  })

  it("no muta el arreglo recibido", () => {
    const original = [ahora.getTime() - minutos(1)]
    const copia = [...original]

    reservarIntento(original, ahora)

    expect(original).toEqual(copia)
  })
})

describe("podarLlaves", () => {
  it("elimina las llaves sin fallos vigentes y conserva solo los vigentes de las demás", () => {
    const mapa = new Map<string, number[]>([
      ["vieja", [ahora.getTime() - minutos(30)]],
      ["mixta", [ahora.getTime() - minutos(30), ahora.getTime() - minutos(2)]],
      ["vacia", []],
    ])

    const podado = podarLlaves(mapa, ahora)

    expect([...podado.keys()]).toEqual(["mixta"])
    expect(podado.get("mixta")).toEqual([ahora.getTime() - minutos(2)])
    expect(mapa.size).toBe(3)
  })
})
