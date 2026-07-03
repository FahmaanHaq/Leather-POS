import React, { useMemo } from 'react';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';

export default function CustomTable({ data, columns, isLoading, onEdit, onToggleActive }) {
    const tableColumns = useMemo(() => columns, [columns]);

    const table = useMaterialReactTable({
        columns: tableColumns,
        data: data ?? [],
        state: { isLoading: !!isLoading },
        enableRowActions: true,
        renderRowActions: ({ row }) => (
            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onEdit?.(row.original)}>Edit</button>
                <button onClick={() => onToggleActive?.(row.original)}>
                    {row.original.isActive === false ? 'Activate' : 'Deactivate'}
                </button>
            </div>
        ),
        enableColumnFilters: true,
        enablePagination: true,
        enableSorting: true,
    });

    return <MaterialReactTable table={table} />;
}
