import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "./DataTable";

interface Row {
  id: number;
  level: number;
}

const columns = [
  { key: "id", header: "Plots" },
  { key: "level", header: "Level" }
];
const rows: Row[] = [
  { id: 1, level: 0 },
  { id: 2, level: 3 }
];

describe("DataTable", () => {
  it("renders headers and rows", () => {
    render(<DataTable columns={columns} rows={rows} getRowId={(row) => row.id} />);
    expect(screen.getByRole("columnheader", { name: "Plots" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Level" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByRole("cell", { name: "3" })).toBeInTheDocument();
  });

  it("shows the row action on the clicked row and calls back", () => {
    const onRowAction = vi.fn();
    render(<DataTable columns={columns} rows={rows} getRowId={(row) => row.id} onRowAction={onRowAction} />);
    expect(screen.queryByRole("button", { name: "details" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("cell", { name: "3" }));
    fireEvent.click(screen.getByRole("button", { name: "details" }));
    expect(onRowAction).toHaveBeenCalledWith(rows[1]);
  });

  it("renders the footer action", () => {
    const onFooterAction = vi.fn();
    render(
      <DataTable columns={columns} rows={rows} getRowId={(row) => row.id} footerLabel="View All" onFooterAction={onFooterAction} />
    );
    fireEvent.click(screen.getByRole("button", { name: "View All" }));
    expect(onFooterAction).toHaveBeenCalledTimes(1);
  });
});
