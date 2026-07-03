import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import DialogActions from '@mui/material/DialogActions';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Modal from '../../../common/Modal';

const MODES = [
    { value: 1, label: 'Cash' },
    { value: 2, label: 'Card' },
    { value: 3, label: 'Cheque' },
    { value: 4, label: 'Credit' },
];

const emptyRowFor = (mode, remaining) => ({
    mode,
    amount: remaining > 0 ? remaining.toFixed(2) : '0.00',
    tenderedAmount: '',
    chequeNo: '',
    bank: '',
    branch: '',
    chequeDate: '',
    cardType: '',
    last4Digits: '',
    approvalCode: '',
    terminalID: '',
});

export default function PaymentPanel({ totalAmount, customer, onClose, onSubmit }) {
    const [rows, setRows] = useState([emptyRowFor(1, totalAmount)]);
    const [status, setStatus] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canUseCredit = customer && customer.customerType === 1;

    const paidSoFar = useMemo(() => rows.reduce((sum, r) => sum + Number(r.amount || 0), 0), [rows]);
    const remaining = totalAmount - paidSoFar;

    const addRow = (mode) => {
        if (mode === 4 && !canUseCredit) return;
        setRows((prev) => [...prev, emptyRowFor(mode, remaining)]);
    };

    const updateRow = (index, field, value) => {
        setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
    };

    const removeRow = (index) => setRows((prev) => prev.filter((_, i) => i !== index));

    const handleSubmit = async () => {
        setStatus(null);

        if (Math.abs(remaining) > 0.01) {
            setStatus({ severity: 'error', text: `Payments must add up to the total. Remaining: ${remaining.toFixed(2)}` });
            return;
        }

        setIsSubmitting(true);
        const payload = rows.map((r) => ({
            paymentMode: r.mode,
            amount: Number(r.amount),
            tenderedAmount: r.mode === 1 && r.tenderedAmount !== '' ? Number(r.tenderedAmount) : null,
            changeGiven: r.mode === 1 && r.tenderedAmount !== '' ? Math.max(0, Number(r.tenderedAmount) - Number(r.amount)) : null,
            chequeNo: r.mode === 3 ? r.chequeNo : null,
            bank: r.mode === 3 ? r.bank : null,
            branch: r.mode === 3 ? r.branch : null,
            chequeDate: r.mode === 3 ? r.chequeDate : null,
            cardType: r.mode === 2 ? r.cardType : null,
            last4Digits: r.mode === 2 ? r.last4Digits : null,
            approvalCode: r.mode === 2 ? r.approvalCode : null,
            terminalID: r.mode === 2 ? r.terminalID : null,
        }));

        const response = await onSubmit(payload);
        setIsSubmitting(false);

        if (!response?.status) {
            setStatus({ severity: 'error', text: response?.message ?? 'Unable to complete the sale.' });
        }
    };

    const handleKeyDown = (e) => {
        // Enter submits from anywhere in the panel, matching the rest of the
        // keyboard-first Billing flow - except inside a multiline field,
        // which none of these are, so this is always safe here.
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <Modal title="Complete Sale - Payment" onClose={onClose} maxWidth="md">
            <Box onKeyDown={handleKeyDown}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Total Due</Typography>
                <Typography variant="subtitle1" fontWeight={600}>{totalAmount.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Remaining</Typography>
                <Typography variant="subtitle1" fontWeight={600} color={Math.abs(remaining) > 0.01 ? 'error' : 'success.main'}>
                    {remaining.toFixed(2)}
                </Typography>
            </Box>

            {status && <Alert severity={status.severity} sx={{ mb: 2 }}>{status.text}</Alert>}

            {rows.map((row, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField
                            select
                            size="small"
                            label="Mode"
                            value={row.mode}
                            onChange={(e) => updateRow(index, 'mode', Number(e.target.value))}
                            sx={{ width: 130 }}
                        >
                            {MODES.map((m) => (
                                <MenuItem key={m.value} value={m.value} disabled={m.value === 4 && !canUseCredit}>
                                    {m.label}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            size="small"
                            type="number"
                            label="Amount"
                            value={row.amount}
                            inputProps={{ step: 0.01 }}
                            onChange={(e) => updateRow(index, 'amount', e.target.value)}
                            sx={{ width: 130 }}
                        />

                        {row.mode === 1 && (
                            <TextField
                                size="small"
                                type="number"
                                label="Tendered"
                                value={row.tenderedAmount}
                                inputProps={{ step: 0.01 }}
                                onChange={(e) => updateRow(index, 'tenderedAmount', e.target.value)}
                                sx={{ width: 120 }}
                            />
                        )}

                        {row.mode === 2 && (
                            <>
                                <TextField size="small" label="Card Type" value={row.cardType} onChange={(e) => updateRow(index, 'cardType', e.target.value)} sx={{ width: 110 }} />
                                <TextField size="small" label="Last 4 Digits" value={row.last4Digits} onChange={(e) => updateRow(index, 'last4Digits', e.target.value)} sx={{ width: 110 }} />
                                <TextField size="small" label="Approval Code" value={row.approvalCode} onChange={(e) => updateRow(index, 'approvalCode', e.target.value)} sx={{ width: 130 }} />
                                <TextField size="small" label="Terminal ID" value={row.terminalID} onChange={(e) => updateRow(index, 'terminalID', e.target.value)} sx={{ width: 110 }} />
                            </>
                        )}

                        {row.mode === 3 && (
                            <>
                                <TextField size="small" label="Cheque No" value={row.chequeNo} onChange={(e) => updateRow(index, 'chequeNo', e.target.value)} sx={{ width: 120 }} />
                                <TextField size="small" label="Bank" value={row.bank} onChange={(e) => updateRow(index, 'bank', e.target.value)} sx={{ width: 130 }} />
                                <TextField size="small" label="Branch" value={row.branch} onChange={(e) => updateRow(index, 'branch', e.target.value)} sx={{ width: 120 }} />
                                <TextField
                                    size="small"
                                    type="date"
                                    label="Cheque Date"
                                    InputLabelProps={{ shrink: true }}
                                    value={row.chequeDate}
                                    onChange={(e) => updateRow(index, 'chequeDate', e.target.value)}
                                    sx={{ width: 150 }}
                                />
                            </>
                        )}

                        <IconButton size="small" onClick={() => removeRow(index)} disabled={rows.length === 1}>
                            <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>
            ))}

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                {MODES.map((m) => (
                    <Button key={m.value} size="small" variant="outlined" disabled={m.value === 4 && !canUseCredit} onClick={() => addRow(m.value)}>
                        + {m.label}
                    </Button>
                ))}
            </Box>

            {!canUseCredit && (
                <Typography variant="caption" color="text.secondary">
                    Credit is only available for Regular customers - select one to enable it.
                </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <DialogActions sx={{ px: 0 }}>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting}>
                    Complete Sale (Enter)
                </Button>
            </DialogActions>
            </Box>
        </Modal>
    );
}
