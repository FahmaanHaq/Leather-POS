import React, { useMemo } from 'react';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined';
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined';
import Paper from '@mui/material/Paper';

export default function CustomTable({ data, columns, isLoading, onEdit, onToggleActive, hideActions = false }) {
  const tableColumns = useMemo(() => columns, [columns]);

  const table = useMaterialReactTable({
    columns: tableColumns,
    data: data ?? [],
    state: { isLoading: !!isLoading },
    enableRowActions: !hideActions,
    positionActionsColumn: 'last',
    renderRowActions: hideActions
      ? undefined
      : ({ row }) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => onEdit?.(row.original)}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={row.original.isActive === false ? 'Activate' : 'Deactivate'}>
              <IconButton size="small" onClick={() => onToggleActive?.(row.original)}>
                {row.original.isActive === false
                  ? <ToggleOffOutlinedIcon fontSize="small" />
                  : <ToggleOnOutlinedIcon fontSize="small" color="success" />}
              </IconButton>
            </Tooltip>
          </Box>
        ),
    enableColumnFilters: true,
    enablePagination: true,
    enableSorting: true,
    enableDensityToggle: false,
    muiTablePaperProps: { variant: 'outlined', elevation: 0 },
    muiTableBodyRowProps: { hover: true },
  });

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <MaterialReactTable table={table} />
    </Paper>
  );
}
