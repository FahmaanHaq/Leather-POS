import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import PageHeader from '../../../common/PageHeader';
import CustomTable from '../../../common/CustomTable';
import BillingScreen from './BillingScreen';
import ReturnDialog from './ReturnDialog';
import { getAllInvoices, getHeldInvoices } from '../Services';
import { getGroupIDFromToken } from '../../../common/tokenDecoder';

const STATUS_LABELS = { 2: 'Completed', 3: 'Reversed', 4: 'Partially Reversed' };
const STATUS_COLORS = { 2: 'success', 3: 'error', 4: 'warning' };

export default function Listing() {
    const [tab, setTab] = useState('new');
    const [invoices, setInvoices] = useState([]);
    const [heldInvoices, setHeldInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [resumeInvoiceId, setResumeInvoiceId] = useState(null);
    const [returnInvoiceId, setReturnInvoiceId] = useState(null);

    const groupId = getGroupIDFromToken();

    const loadInvoices = async () => {
        setIsLoading(true);
        const [invoicesRes, heldRes] = await Promise.all([getAllInvoices(groupId), getHeldInvoices(groupId)]);
        if (invoicesRes?.status) setInvoices(invoicesRes.data ?? []);
        if (heldRes?.status) setHeldInvoices(heldRes.data ?? []);
        setIsLoading(false);
    };

    useEffect(() => {
        if (tab !== 'new') loadInvoices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    const invoiceColumns = [
        { accessorKey: 'invoiceNo', header: 'Invoice No' },
        { accessorKey: 'customerName', header: 'Customer', Cell: ({ cell }) => cell.getValue() ?? 'Walk-in' },
        { accessorKey: 'invoiceDate', header: 'Date', Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString() },
        {
            accessorKey: 'status',
            header: 'Status',
            Cell: ({ cell }) => <Chip label={STATUS_LABELS[cell.getValue()] ?? cell.getValue()} size="small" color={STATUS_COLORS[cell.getValue()] ?? 'default'} variant="outlined" />,
        },
        { accessorKey: 'totalAmount', header: 'Total', Cell: ({ cell }) => Number(cell.getValue()).toFixed(2) },
        {
            id: 'actions',
            header: 'Return',
            Cell: ({ row }) =>
                row.original.status === 2 || row.original.status === 4 ? (
                    <Button size="small" color="error" onClick={() => setReturnInvoiceId(row.original.invoiceID)}>
                        Return
                    </Button>
                ) : null,
        },
    ];

    const heldColumns = [
        { accessorKey: 'customerName', header: 'Customer', Cell: ({ cell }) => cell.getValue() ?? 'Walk-in' },
        { accessorKey: 'invoiceDate', header: 'Held Since', Cell: ({ cell }) => new Date(cell.getValue()).toLocaleString() },
        { accessorKey: 'lineCount', header: 'Items' },
        { accessorKey: 'totalAmount', header: 'Total', Cell: ({ cell }) => Number(cell.getValue()).toFixed(2) },
        {
            id: 'resume',
            header: '',
            Cell: ({ row }) => (
                <Button size="small" variant="contained" onClick={() => { setResumeInvoiceId(row.original.invoiceID); setTab('new'); }}>
                    Resume
                </Button>
            ),
        },
    ];

    return (
        <Box>
            {tab !== 'new' && <PageHeader title="Billing" subtitle="Point of sale, held bills, and invoice history" />}

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                <Tab label="Bill" value="new" />
                <Tab label={`Held Bills (${heldInvoices.length})`} value="held" />
                <Tab label="Invoices" value="invoices" />
            </Tabs>

            {tab === 'new' && (
                <BillingScreen
                    resumeInvoiceId={resumeInvoiceId}
                    onDone={() => { setResumeInvoiceId(null); loadInvoices(); }}
                />
            )}

            {tab === 'held' && <CustomTable data={heldInvoices} columns={heldColumns} isLoading={isLoading} hideActions />}

            {tab === 'invoices' && <CustomTable data={invoices} columns={invoiceColumns} isLoading={isLoading} hideActions />}

            {returnInvoiceId && (
                <ReturnDialog
                    invoiceId={returnInvoiceId}
                    onClose={() => setReturnInvoiceId(null)}
                    onReturned={() => { setReturnInvoiceId(null); loadInvoices(); }}
                />
            )}
        </Box>
    );
}
