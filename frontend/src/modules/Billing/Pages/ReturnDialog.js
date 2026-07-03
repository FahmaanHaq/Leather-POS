import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import DialogActions from '@mui/material/DialogActions';
import Modal from '../../../common/Modal';
import { getInvoiceById, returnInvoice } from '../Services';
import { getUserIDFromToken } from '../../../common/tokenDecoder';

export default function ReturnDialog({ invoiceId, onClose, onReturned }) {
    const [detail, setDetail] = useState(null);
    const [returnQuantities, setReturnQuantities] = useState({});
    const [status, setStatus] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        (async () => {
            const res = await getInvoiceById(invoiceId);
            if (res?.status) setDetail(res.data);
        })();
    }, [invoiceId]);

    const remainingFor = (line) => Number(line.quantity) - Number(line.quantityReturned);

    const handleSubmit = async () => {
        const returnLines = Object.entries(returnQuantities)
            .filter(([, qty]) => Number(qty) > 0)
            .map(([invoiceLineID, qty]) => ({ invoiceLineID: Number(invoiceLineID), quantityToReturn: Number(qty) }));

        if (returnLines.length === 0) {
            setStatus('Enter a quantity to return for at least one line.');
            return;
        }

        setIsSubmitting(true);
        const response = await returnInvoice({
            invoiceID: invoiceId,
            returnLines,
            createdBy: getUserIDFromToken(),
        });
        setIsSubmitting(false);

        if (response?.status) {
            onReturned?.();
        } else {
            setStatus(response?.message ?? 'Unable to process the return.');
        }
    };

    return (
        <Modal title={`Return - Invoice ${detail?.header?.invoiceNo ?? ''}`} onClose={onClose} maxWidth="md">
            {!detail ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress size={28} />
                </Box>
            ) : (
                <>
                    {status && <Alert severity="error" sx={{ mb: 2 }}>{status}</Alert>}

                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Item</TableCell>
                                <TableCell align="right">Sold Qty</TableCell>
                                <TableCell align="right">Already Returned</TableCell>
                                <TableCell align="right">Remaining</TableCell>
                                <TableCell align="right">Return Qty</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {detail.lines.map((line) => (
                                <TableRow key={line.invoiceLineID}>
                                    <TableCell>{line.itemName}</TableCell>
                                    <TableCell align="right">{line.quantity}</TableCell>
                                    <TableCell align="right">{line.quantityReturned}</TableCell>
                                    <TableCell align="right">{remainingFor(line)}</TableCell>
                                    <TableCell align="right">
                                        <TextField
                                            type="number"
                                            size="small"
                                            inputProps={{ step: 0.001, min: 0, max: remainingFor(line), style: { textAlign: 'right' } }}
                                            value={returnQuantities[line.invoiceLineID] ?? ''}
                                            disabled={remainingFor(line) <= 0}
                                            onChange={(e) =>
                                                setReturnQuantities((prev) => ({ ...prev, [line.invoiceLineID]: e.target.value }))
                                            }
                                            sx={{ width: 100 }}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                        If this sale included a Credit-mode payment, the refund reduces the customer's debt first.
                    </Typography>

                    <DialogActions sx={{ px: 0, pt: 2 }}>
                        <Button onClick={onClose} color="inherit">Cancel</Button>
                        <Button variant="contained" color="error" onClick={handleSubmit} disabled={isSubmitting}>
                            Process Return
                        </Button>
                    </DialogActions>
                </>
            )}
        </Modal>
    );
}
