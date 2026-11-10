import { duplicarClaseSchema } from "@campus/shared"
import { useRef, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"

import { ErrorDeCampo } from "@/components/error-de-campo"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { TEXTOS_DUPLICAR_CLASE } from "../data"
import { useDuplicarClase } from "../hooks"
import {
  erroresDeLaClaseDeApi,
  erroresPorCampo,
  errorQueRedirigeElCliente,
  noSeEncontroElMaestro,
  mensajeDeErrorClases,
} from "../lib"
import type { CandidatoMaestro, ErroresFormulario, MaestroDeLista } from "../types"
import { SelectorDeMaestros } from "./selector-de-maestros"

interface FormularioDuplicarClaseProps {
  claseId: string
  nombreInicial: string
}

// ADMIN-01c (§D-10, S-08): el nombre de la copia (prellenado con el de la original) y de uno a dos
// maestros; la descripción, los temas, las categorías y los recursos de aprendizaje los copia el
// servidor. El error del servidor vive en el estado del formulario y la validación local lo reemplaza
// (CLAUDE.md, "Formularios"): la persona lee un solo mensaje, el del último envío. Un VALIDACION de un
// campo que este modo no pinta (`descripcion`, que sí pinta crear) se avisa. Al terminar, aviso y
// navegación a la clase nueva, como al crear una clase (Enmienda 10). autoComplete="off": el
// administrador captura datos de una clase, no suyos.
export function FormularioDuplicarClase({ claseId, nombreInicial }: FormularioDuplicarClaseProps) {
  const duplicar = useDuplicarClase()
  const navigate = useNavigate()
  const [errores, setErrores] = useState<ErroresFormulario>({})
  const [elegidos, setElegidos] = useState<MaestroDeLista[]>([])
  // CHORE-04: guarda síncrona; `isPending` llega un render después.
  const enviandoRef = useRef(false)
  const liberarEnvio = () => {
    enviandoRef.current = false
  }

  const alElegir = (maestro: CandidatoMaestro) => {
    setElegidos((actuales) => [...actuales, maestro])
    setErrores((actuales) =>
      Object.fromEntries(Object.entries(actuales).filter(([campo]) => campo !== "maestroIds")),
    )
  }

  const alQuitar = (maestro: MaestroDeLista) => {
    setElegidos((actuales) => actuales.filter((elegido) => elegido.id !== maestro.id))
  }

  const alTerminar = async (id: string) => {
    toast.success(TEXTOS_DUPLICAR_CLASE.avisoDuplicada)
    await navigate(`/admin/clases/${id}`)
  }

  // MAESTRO_NO_ENCONTRADO va en el selector (matriz de 01c); un error de un campo pintado, bajo su
  // campo; cualquier otro, un aviso, sin errores de campo viejos a la vista. Con un error con que
  // apiClient ya redirige, nada.
  const alFallar = (error: unknown) => {
    if (errorQueRedirigeElCliente(error)) return
    if (noSeEncontroElMaestro(error)) {
      setErrores({ maestroIds: mensajeDeErrorClases(error) })
      return
    }
    const erroresDeCampo = erroresDeLaClaseDeApi(error, "duplicar")
    if (erroresDeCampo) {
      setErrores(erroresDeCampo)
      return
    }
    setErrores({})
    toast.error(mensajeDeErrorClases(error))
  }

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviandoRef.current) return

    const formulario = new FormData(evento.currentTarget)
    const resultado = duplicarClaseSchema.safeParse({
      nombre: formulario.get("nombre"),
      maestroIds: elegidos.map((maestro) => maestro.id),
    })
    if (!resultado.success) {
      setErrores(erroresPorCampo(resultado.error.issues))
      return
    }
    setErrores({})
    enviandoRef.current = true
    duplicar.mutate(
      { claseId, datos: resultado.data },
      {
        onSuccess: (respuesta) => alTerminar(respuesta.clase.id),
        onError: alFallar,
        onSettled: liberarEnvio,
      },
    )
  }

  return (
    <Card>
      <CardHeader>
        <h1 className="text-h1">{TEXTOS_DUPLICAR_CLASE.titulo}</h1>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nombre-de-la-copia">{TEXTOS_DUPLICAR_CLASE.campoNombre}</Label>
            <Input
              id="nombre-de-la-copia"
              name="nombre"
              autoComplete="off"
              defaultValue={nombreInicial}
              aria-invalid={errores.nombre !== undefined}
              aria-describedby={errores.nombre ? "nombre-de-la-copia-error" : undefined}
            />
            {errores.nombre && (
              <ErrorDeCampo id="nombre-de-la-copia-error">{errores.nombre}</ErrorDeCampo>
            )}
          </div>
          <SelectorDeMaestros
            elegidos={elegidos}
            onElegir={alElegir}
            onQuitar={alQuitar}
            error={errores.maestroIds}
          />
          <div className="flex gap-3">
            <Button type="submit" variant="primary" enEspera={duplicar.isPending}>
              {TEXTOS_DUPLICAR_CLASE.boton}
            </Button>
            <Link to="/admin/clases" className={buttonVariants({ variant: "outline" })}>
              {TEXTOS_DUPLICAR_CLASE.cancelar}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
