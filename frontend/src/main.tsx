import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router"

import { Providers } from "./app/providers"
import { router } from "./app/router"
import "./styles/index.css"

const raiz = document.getElementById("root")
// Único throw fuera de un hook de TanStack Query: es el arranque, no la interfaz.
if (!raiz) throw new Error("No existe #root en index.html")

createRoot(raiz).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
)
