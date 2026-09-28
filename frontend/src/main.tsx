import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router"

import { FondoDeLaApp } from "./app/fondo-de-la-app"
import { Providers } from "./app/providers"
import { router } from "./app/router"
import "@fontsource/bricolage-grotesque/latin-500.css"
import "@fontsource/bricolage-grotesque/latin-700.css"
import "@fontsource/atkinson-hyperlegible-next/latin-400.css"
import "@fontsource/atkinson-hyperlegible-next/latin-500.css"
import "@fontsource/atkinson-hyperlegible-next/latin-700.css"
import "@fontsource/atkinson-hyperlegible-mono/latin-500.css"
import "./styles/index.css"

const raiz = document.getElementById("root")
// Único throw fuera de un hook de TanStack Query: es el arranque, no la interfaz.
if (!raiz) throw new Error("No existe #root en index.html")

createRoot(raiz).render(
  <StrictMode>
    <Providers>
      <FondoDeLaApp router={router} />
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
)
