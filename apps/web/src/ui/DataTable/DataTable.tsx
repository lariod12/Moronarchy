import { useState } from "react";
import type { ReactNode } from "react";
import { cx } from "../cx";
import "./DataTable.css";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  // Column width, e.g. "30%". Without any width the columns share the table equally.
  width?: string;
}

export interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  getRowId: (row: T) => string | number;
  onRowAction?: (row: T) => void;
  rowActionLabel?: string;
  // "overlay" floats the action over the end of the selected row (wireframe); "below" gives it its own line under
  // the row, so a narrow screen never hides a cell behind it.
  actionPlacement?: "overlay" | "below";
  getRowClassName?: (row: T) => string | undefined;
  initialSelectedId?: string | number;
  maxHeight?: string | number;
  footerLabel?: string;
  onFooterAction?: () => void;
  className?: string;
}

export const DataTable = <T,>({
  columns,
  rows,
  getRowId,
  onRowAction,
  rowActionLabel = "details",
  actionPlacement = "overlay",
  getRowClassName,
  initialSelectedId,
  maxHeight,
  footerLabel,
  onFooterAction,
  className
}: DataTableProps<T>) => {
  const [selectedId, setSelectedId] = useState<string | number | undefined>(initialSelectedId);

  return (
    <div className={cx("ui-data-table", className)}>
      <div className="ui-data-table__scroll" style={maxHeight !== undefined ? { maxHeight } : undefined}>
        <table className="ui-data-table__table">
          {columns.some((column) => column.width !== undefined) ? (
            <colgroup>
              {columns.map((column) => (
                <col key={column.key} style={column.width !== undefined ? { width: column.width } : undefined} />
              ))}
            </colgroup>
          ) : null}
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.flatMap((row, rowIndex) => {
              const id = getRowId(row);
              const selected = onRowAction !== undefined && id === selectedId;
              const overlay = selected && actionPlacement === "overlay";
              const items = [
                <tr key={id} className={cx(rowIndex % 2 === 1 && "ui-data-table__row--alt", getRowClassName?.(row))} aria-selected={selected || undefined} onClick={() => setSelectedId(id)}>
                  {columns.map((column, index) => (
                    <td key={column.key}>
                      {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? "")}
                      {overlay && index === columns.length - 1 ? (
                        <button type="button" className="ui-data-table__action" onClick={() => onRowAction(row)}>
                          {rowActionLabel}
                        </button>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ];
              if (selected && actionPlacement === "below") {
                items.push(
                  <tr key={`${id}-action`} className="ui-data-table__action-row">
                    <td colSpan={columns.length}>
                      <button type="button" className="ui-data-table__action ui-data-table__action--below" onClick={() => onRowAction(row)}>
                        {rowActionLabel}
                      </button>
                    </td>
                  </tr>
                );
              }
              return items;
            })}
          </tbody>
        </table>
      </div>
      {footerLabel ? (
        <div className="ui-data-table__footer">
          <button type="button" className="ui-data-table__footer-button" onClick={onFooterAction}>
            {footerLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
};
