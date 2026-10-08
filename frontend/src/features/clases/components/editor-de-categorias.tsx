import { reemplazarCategoriasSchema } from "@campus/shared"
import { Plus } from "lucide-react"
import { useEffect, useId, useRef, useState, type FormEvent } from "react"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { esApiError } from "@/services/apiClient"

import { CODIGOS_QUE_RENUEVAN_LAS_CATEGORIAS, TEXTOS_CATEGORIAS } from "../data"
import { useCategoriasEnCache, useGuardarCategorias } from "../hooks"
import {
  CAMPO_DE_LA_LISTA,
  cuerpoDeCategorias,
  erroresDeCategorias,
  erroresDeCategoriasDeApi,
  filasDeCategorias,
  filasDelServidor,
  erroresSinLaFila,
  focoPerdido,
  textoDelTotal,
  totalDePesos,
} from "../lib"
import type { Categoria, ErroresFormulario, FilaDeCategoria, FocoPendiente } from "../types"

interface EditorDeCategoriasProps {
  claseId: string
  categorias: readonly Categoria[]
}

// §D-11, S-06: la tabla de categorías completa, que se guarda en bloque. Una fila por categoría
// ("Nombre", "Peso" con sufijo "%", su conteo de tareas y "Quitar"; con tareas, en lugar de "Quitar",
// la nota "Tiene <n> tareas.", P-01 a), "Agregar categoría", el total en vivo (role="status") y
// "Guardar categorías", que valida con el mismo esquema del servidor. Los errores viajan con su fila
// (llave estable). Tras un conflicto (una categoría que ganó tareas o que ya no existe), el editor parte
// de la lista que el servidor acaba de devolver.
export function EditorDeCategorias({ claseId, categorias }: EditorDeCategoriasProps) {
  const guardar = useGuardarCategorias(claseId)
  const categoriasEnCache = useCategoriasEnCache(claseId)
  const idBase = useId()
  const [filas, setFilas] = useState<FilaDeCategoria[]>(() => filasDeCategorias(categorias))
  const [errores, setErrores] = useState<ErroresFormulario>({})
  const siguienteLlave = useRef(0)
  const listaRef = useRef<HTMLDivElement>(null)
  const agregarRef = useRef<HTMLButtonElement>(null)
  const focoPendienteRef = useRef<FocoPendiente | null>(null)
  // M-01 (revisión de la ronda 1): se marca de forma síncrona antes de `mutate` y se libera al
  // asentarse. `guardar.isPending` llega un render después, y en esa ventana un "Quitar", una tecla o un
  // segundo Enter cambiarían la lista que se está guardando (precedente: guardandoRef de 01d).
  const guardandoRef = useRef(false)
  const total = totalDePesos(filas)
  const errorDeLaLista = errores[CAMPO_DE_LA_LISTA]

  useEffect(() => {
    const pendiente = focoPendienteRef.current
    if (pendiente === null) return
    focoPendienteRef.current = null
    // Tras reemplazar la lista con la respuesta, solo se recoloca si el foco se perdió.
    if (pendiente.soloSiSePerdio === true && !focoPerdido(document)) return
    const fila =
      pendiente.llave === null
        ? null
        : listaRef.current?.querySelector<HTMLElement>(`[data-llave="${pendiente.llave}"]`)
    const destino =
      (pendiente.campo === "nombre"
        ? null
        : fila?.querySelector<HTMLElement>(`[data-campo="${pendiente.campo}"]`)) ??
      fila?.querySelector<HTMLElement>('[data-campo="nombre"]') ??
      // La fila ya no está (un conflicto quitó las nuevas): el primer campo de la lista.
      (pendiente.soloSiSePerdio === true
        ? listaRef.current?.querySelector<HTMLElement>('[data-campo="nombre"]')
        : null)
    if (destino) {
      destino.focus()
      return
    }
    agregarRef.current?.focus()
  }, [filas])

  // Mientras se guarda, la lista no cambia: se guarda exactamente la que se ve y la respuesta la
  // reemplaza con los ids nuevos (como la lista de archivos al publicar, §7.19).
  const cambiar = (llave: string, campo: "nombre" | "peso", valor: string) => {
    if (guardandoRef.current) return
    setFilas((actuales) =>
      actuales.map((fila) => (fila.llave === llave ? { ...fila, [campo]: valor } : fila)),
    )
  }

  const agregar = () => {
    if (guardandoRef.current) return
    siguienteLlave.current += 1
    const llave = `nueva-${String(siguienteLlave.current)}`
    focoPendienteRef.current = { llave, campo: "nombre" }
    setFilas((actuales) => [...actuales, { llave, nombre: "", peso: "", tareas: 0 }])
  }

  const quitar = (llave: string) => {
    if (guardandoRef.current) return
    const indice = filas.findIndex((fila) => fila.llave === llave)
    const restantes = filas.filter((fila) => fila.llave !== llave)
    const vecina = restantes[Math.min(indice, restantes.length - 1)]
    focoPendienteRef.current = { llave: vecina?.llave ?? null, campo: "quitar" }
    setFilas(restantes)
    // T-17: el error de la fila quitada se va con ella; nunca pasa al total.
    setErrores((actuales) => erroresSinLaFila(actuales, llave))
  }

  // El campo de una fila que tiene el foco, para devolvérselo si la lista se reemplaza.
  const focoEnLaLista = (): FocoPendiente | null => {
    const activo = document.activeElement
    if (!(activo instanceof HTMLElement) || listaRef.current?.contains(activo) !== true) return null
    const llave = activo.closest("[data-llave]")?.getAttribute("data-llave") ?? null
    const campo = activo.dataset.campo
    if (campo !== "quitar" && campo !== "nombre" && campo !== "peso") return null
    return { llave, campo, soloSiSePerdio: true }
  }

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (guardandoRef.current) return
    const enviadas = filas
    const llavesEnviadas = enviadas.map(({ llave }) => llave)
    const resultado = reemplazarCategoriasSchema.safeParse(cuerpoDeCategorias(enviadas))
    if (!resultado.success) {
      setErrores(erroresDeCategorias(resultado.error.issues, llavesEnviadas))
      return
    }
    setErrores({})
    guardandoRef.current = true
    // T-18: la lista se reemplaza con la del servidor; si el foco estaba en un campo de una fila, vuelve
    // a ese campo (la fila conserva su llave) o, si la fila ya no está, al primer campo de la lista.
    const reemplazarFilas = (categoriasDelServidor: readonly Categoria[]) => {
      focoPendienteRef.current = focoEnLaLista()
      setFilas(filasDelServidor(enviadas, categoriasDelServidor))
    }
    guardar.mutate(resultado.data, {
      onSettled: () => {
        guardandoRef.current = false
      },
      onSuccess: (respuesta) => reemplazarFilas(respuesta.categorias),
      onError: (error) => {
        const deLasFilas = erroresDeCategoriasDeApi(error, llavesEnviadas)
        if (deLasFilas !== null) {
          setErrores(deLasFilas)
          return
        }
        if (!esApiError(error) || !CODIGOS_QUE_RENUEVAN_LAS_CATEGORIAS.includes(error.codigo))
          return
        const vigentes = categoriasEnCache()
        if (vigentes !== undefined) reemplazarFilas(vigentes.categorias)
      },
    })
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {filas.length === 0 && (
        <p className="text-small text-muted-foreground">{TEXTOS_CATEGORIAS.vacio}</p>
      )}
      {filas.length > 0 && (
        <div ref={listaRef} className="flex flex-col gap-3">
          {filas.map((fila, indice) => {
            const idNombre = `${idBase}-${fila.llave}-nombre`
            const idPeso = `${idBase}-${fila.llave}-peso`
            const errorNombre = errores[`${fila.llave}.nombre`]
            const errorPeso = errores[`${fila.llave}.peso`]
            const deLaFila = TEXTOS_CATEGORIAS.deLaFila(indice + 1)
            return (
              <div
                key={fila.llave}
                data-llave={fila.llave}
                className="flex flex-col gap-2 rounded-row bg-muted p-3 sm:flex-row sm:items-start"
              >
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor={idNombre}>
                    {TEXTOS_CATEGORIAS.nombre} <span className="sr-only">{deLaFila}</span>
                  </Label>
                  <Input
                    id={idNombre}
                    data-campo="nombre"
                    autoComplete="off"
                    value={fila.nombre}
                    onChange={(evento) => cambiar(fila.llave, "nombre", evento.target.value)}
                    aria-invalid={errorNombre !== undefined}
                    aria-describedby={errorNombre ? `${idNombre}-error` : undefined}
                  />
                  {errorNombre && (
                    <ErrorDeCampo id={`${idNombre}-error`}>{errorNombre}</ErrorDeCampo>
                  )}
                </div>
                <div className="flex flex-col gap-2 sm:w-32">
                  <Label htmlFor={idPeso}>
                    {TEXTOS_CATEGORIAS.peso} <span className="sr-only">{deLaFila}</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={idPeso}
                      data-campo="peso"
                      inputMode="numeric"
                      autoComplete="off"
                      value={fila.peso}
                      onChange={(evento) => cambiar(fila.llave, "peso", evento.target.value)}
                      aria-invalid={errorPeso !== undefined}
                      aria-describedby={errorPeso ? `${idPeso}-error` : undefined}
                    />
                    <span aria-hidden="true">{TEXTOS_CATEGORIAS.sufijoPeso}</span>
                  </div>
                  {errorPeso && <ErrorDeCampo id={`${idPeso}-error`}>{errorPeso}</ErrorDeCampo>}
                </div>
                <div className="flex flex-col gap-1 text-small text-muted-foreground sm:pt-8">
                  {fila.id !== undefined && <span>{TEXTOS_CATEGORIAS.tareas(fila.tareas)}</span>}
                  {fila.tareas > 0 && <span>{TEXTOS_CATEGORIAS.tieneTareas(fila.tareas)}</span>}
                </div>
                {fila.tareas === 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-quitar=""
                    data-campo="quitar"
                    onClick={() => quitar(fila.llave)}
                    className="self-start sm:mt-7"
                  >
                    {TEXTOS_CATEGORIAS.quitar}{" "}
                    <span className="sr-only">{fila.nombre === "" ? deLaFila : fila.nombre}</span>
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div>
        <Button ref={agregarRef} type="button" variant="outline" size="sm" onClick={agregar}>
          <Plus aria-hidden="true" />
          {TEXTOS_CATEGORIAS.agregar}
        </Button>
      </div>

      {filas.length > 0 && (
        <p role="status" className="font-bold">
          {textoDelTotal(total)}
        </p>
      )}
      {errorDeLaLista !== undefined && (
        <ErrorDeCampo id={`${idBase}-lista-error`}>{errorDeLaLista}</ErrorDeCampo>
      )}

      <div>
        <Button type="submit" variant="primary" enEspera={guardar.isPending}>
          {TEXTOS_CATEGORIAS.guardar}
        </Button>
      </div>
    </form>
  )
}
