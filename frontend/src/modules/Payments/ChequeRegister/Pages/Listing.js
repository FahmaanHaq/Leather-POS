import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import PageHeader from '../../../../common/PageHeader';
import CustomTable from '../../../../common/CustomTable';
import { getChequeRegister, updateChequeStatus } from '../../Services';
import { getGroupIDFromToken, getUserIDFromToken } from '../../../../common/tokenDecoder';

const STATUS_LABELS = { 1: 'Pending', 2: 'Deposited', 3: 'Cleared', 4: 'Bounced', 5: 'Cancelled' };
const STATUS_COLORS = { 1: 'default', 2: 'info', 3: 'success', 4: 'error', 5: 'default' };

export default function Listing() {
    const [entries, setEntries] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const groupId = getGroupIDFromToken();

    const load = async () => {
        setIsLoading(true);
        const response = await getChequeRegister(groupId, statusFilter || undefined);
        if (response?.status) setEntries(response.data ?? []);
        setIsLoading(false);
    };

    useEffect(() => { load(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleStatusChange = async (chequeDetailID, newStatus) => {
        const response = await updateChequeStatus({ chequeDetailID, newStatus, changedBy: getUserIDFromToken() });
        if (response?.status) {
            setMessage({ severity: newStatus === 4 ? 'warning' : 'success', text: response.message });
            load();
        } else {
            setMessage({ severity: 'error', text: response?.message ?? 'Unable to update cheque status.' });
        }
    };

    const columns = [
        { accessorKey: 'chequeNo', header: 'Cheque No' },
        { accessorKey: 'bank', header: 'Bank' },
        { accessorKey: 'customerName', header: 'Customer', Cell: ({ cell }) => cell.getValue() ?? '—' },
        { accessorKey: 'invoiceNo', header: 'Invoice', Cell: ({ cell }) => cell.getValue() ?? '—' },
        { accessorKey: 'amount', header: 'Amount', Cell: ({ cell }) => Number(cell.getValue()).toFixed(2) },
        { accessorKey: 'chequeDate', header: 'Due Date', Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString() },
        {
            accessorKey: 'daysUntilDue',
            header: 'Days Until Due',
            Cell: ({ cell }) => {
                const days = cell.getValue();
                return <span style={{ color: days < 0 ? '#B3261E' : days <= 3 ? '#B08D57' : 'inherit', fontWeight: days <= 3 ? 600 : 400 }}>{days}</span>;
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            Cell: ({ row }) => (
                <TextField
                    select
                    size="small"
                    value={row.original.status}
                    onChange={(e) => handleStatusChange(row.original.chequeDetailID, Number(e.target.value))}
                    sx={{ minWidth: 130 }}
                >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <MenuItem key={value} value={Number(value)}>
                            <Chip label={label} size="small" color={STATUS_COLORS[value]} variant="outlined" sx={{ pointerEvents: 'none' }} />
                        </MenuItem>
                    ))}
                </TextField>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="Cheque Register"
                subtitle="Due-date based tracking of all cheque payments"
                actions={
                    <TextField select size="small" label="Filter Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 160 }}>
                        <MenuItem value="">All</MenuItem>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <MenuItem key={value} value={value}>{label}</MenuItem>
                        ))}
                    </TextField>
                }
            />

            {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}

            <CustomTable data={entries} columns={columns} isLoading={isLoading} hideActions />
        </div>
    );
}
