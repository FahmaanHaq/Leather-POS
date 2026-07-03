import React, { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import PageHeader from '../../../../common/PageHeader';
import CustomTable from '../../../../common/CustomTable';
import { getCashRegisterReport } from '../../Services';
import { getGroupIDFromToken } from '../../../../common/tokenDecoder';

const today = () => new Date().toISOString().slice(0, 10);

export default function Listing() {
    const [date, setDate] = useState(today());
    const [report, setReport] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const groupId = getGroupIDFromToken();

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            const response = await getCashRegisterReport(groupId, date);
            if (response?.status) setReport(response.data);
            setIsLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date]);

    const columns = [
        { accessorKey: 'invoiceID', header: 'Invoice', Cell: ({ cell }) => cell.getValue() ?? 'Debt Settlement' },
        { accessorKey: 'amount', header: 'Amount', Cell: ({ cell }) => Number(cell.getValue()).toFixed(2) },
        { accessorKey: 'tenderedAmount', header: 'Tendered', Cell: ({ cell }) => cell.getValue() != null ? Number(cell.getValue()).toFixed(2) : '—' },
        { accessorKey: 'changeGiven', header: 'Change Given', Cell: ({ cell }) => cell.getValue() != null ? Number(cell.getValue()).toFixed(2) : '—' },
        { accessorKey: 'createdDate', header: 'Time', Cell: ({ cell }) => new Date(cell.getValue()).toLocaleTimeString() },
    ];

    return (
        <div>
            <PageHeader
                title="Cash Register"
                subtitle="Daily cash reconciliation"
                actions={<TextField type="date" size="small" value={date} onChange={(e) => setDate(e.target.value)} />}
            />

            {report && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6} sm={3}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="body2" color="text.secondary">Transactions</Typography>
                            <Typography variant="h6">{report.summary.transactionCount}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="body2" color="text.secondary">Total Cash</Typography>
                            <Typography variant="h6">{Number(report.summary.totalCash ?? 0).toFixed(2)}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="body2" color="text.secondary">Total Tendered</Typography>
                            <Typography variant="h6">{Number(report.summary.totalTendered ?? 0).toFixed(2)}</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="body2" color="text.secondary">Change Given</Typography>
                            <Typography variant="h6">{Number(report.summary.totalChangeGiven ?? 0).toFixed(2)}</Typography>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            <CustomTable data={report?.transactions ?? []} columns={columns} isLoading={isLoading} hideActions />
        </div>
    );
}
