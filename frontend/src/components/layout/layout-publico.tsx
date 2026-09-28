import { Outlet } from "react-router"

import { MarcoPublico } from "./marco-publico"

export function LayoutPublico() {
  return (
    <MarcoPublico>
      <Outlet />
    </MarcoPublico>
  )
}
