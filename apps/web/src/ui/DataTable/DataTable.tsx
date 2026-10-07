import { useState } from "react";
import type { ReactNode } from "react";
import { cx } from "../cx";
import "./DataTable.css";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  getRowId: (row: T) => string | number;
  onRowAction?: (row: T) => void;
  rowActionLabel?: string;
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
            {rows.map((row) => {
              const id = getRowId(row);
              const selected = onRowAction !== undefined && id === selectedId;
              return (
                <tr key={id} aria-selected={selected || undefined} onClick={() => setSelectedId(id)}>
                  {columns.map((column, index) => (
                    <td key={column.key}>
                      {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? "")}
                      {selected && index === columns.length - 1 ? (
                        <button type="button" className="ui-data-table__action" onClick={() => onRowAction(row)}>
                          {rowActionLabel}
                        </button>
                      ) : null}
                    </td>
                  ))}
                </tr>
              );
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
