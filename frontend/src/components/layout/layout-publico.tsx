import { Outlet } from "react-router"

export function LayoutPublico() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <Outlet />
    </div>
  )
}
