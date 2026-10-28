import "@testing-library/jest-dom/vitest"
import { cleanup, configure } from "@testing-library/react"
import { afterEach } from "vitest"

// Sin globals, Testing Library no registra su limpieza automática: se hace aquí.
afterEach(() => cleanup())

// La espera por omisión de findBy y waitFor (1 s) venció por carga en una corrida completa (O-25 de CHORE-03 03c).
configure({ asyncUtilTimeout: 3000 })
