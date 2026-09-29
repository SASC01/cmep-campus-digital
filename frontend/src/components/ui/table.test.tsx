import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table"

describe("Table", () => {
  it("renderiza encabezado y filas", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Ana</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )
    expect(screen.getByRole("columnheader", { name: "Nombre" })).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "Ana" })).toBeInTheDocument()
  })
})
