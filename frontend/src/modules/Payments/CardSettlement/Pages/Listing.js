import React, { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import PageHeader from '../../../../common/PageHeader';
import CustomTable from '../../../../common/CustomTable';
import { getCardSettlementReport } from '../../Services';
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
            const response = await getCardSettlementReport(groupId, date);
            if (response?.status) setReport(response.data);
            setIsLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date]);

    const columns = [
        { accessorKey: 'invoiceID', header: 'Invoice', Cell: ({ cell }) => cell.getValue() ?? '—' },
        { accessorKey: 'cardType', header: 'Card Type' },
        { accessorKey: 'last4Digits', header: 'Last 4' },
        { accessorKey: 'approvalCode', header: 'Approval Code' },
        { accessorKey: 'terminalID', header: 'Terminal' },
        { accessorKey: 'amount', header: 'Amount', Cell: ({ cell }) => Number(cell.getValue()).toFixed(2) },
        { accessorKey: 'createdDate', header: 'Time', Cell: ({ cell }) => new Date(cell.getValue()).toLocaleTimeString() },
    ];

    return (
        <div>
            <PageHeader
                title="Card Settlement"
                subtitle="Daily card reconciliation, by card type"
                actions={<TextField type="date" size="small" value={date} onChange={(e) => setDate(e.target.value)} />}
            />

            {report && report.summaryByCardType.length > 0 && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    {report.summaryByCardType.map((s) => (
                        <Grid item xs={6} sm={3} key={s.cardType}>
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="body2" color="text.secondary">{s.cardType}</Typography>
                                <Typography variant="h6">{Number(s.totalAmount).toFixed(2)}</Typography>
                                <Typography variant="caption" color="text.secondary">{s.transactionCount} transactions</Typography>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            )}

            <CustomTable data={report?.transactions ?? []} columns={columns} isLoading={isLoading} hideActions />
        </div>
    );
}
