import React, { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined';
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

import PageHeader from '../../../common/PageHeader';
import PaymentPanel from './PaymentPanel';
import DebtSettlement from './DebtSettlement';
import { searchItemsForBilling, saveInvoice, getInvoiceById } from '../Services';
import { getAllCustomers } from '../../Customers/Services';
import { getGroupIDFromToken, getUserIDFromToken } from '../../../common/tokenDecoder';

export default function BillingScreen({ resumeInvoiceId, onDone }) {
    const groupId = getGroupIDFromToken();
    const userId = getUserIDFromToken();

    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const [itemSearchTerm, setItemSearchTerm] = useState('');
    const [itemOptions, setItemOptions] = useState([]);

    const [lines, setLines] = useState([]);
    const [invoiceID, setInvoiceID] = useState(null);
    const [invoiceDate] = useState(new Date());

    const [showPaymentPanel, setShowPaymentPanel] = useState(false);
    const [showDebtSettlement, setShowDebtSettlement] = useState(false);
    const [message, setMessage] = useState(null);
    const [isBusy, setIsBusy] = useState(false);

    // Load customer list once (FR-POS-02: lookup by name/phone with inline debt display)
    useEffect(() => {
        getAllCustomers(groupId).then((res) => {
            if (res?.status) setCustomers(res.data ?? []);
        });
    }, [groupId]);

    // Resuming a held bill: reload its lines and customer
    useEffect(() => {
        if (!resumeInvoiceId) return;
        (async () => {
            const res = await getInvoiceById(resumeInvoiceId);
            if (!res?.status) return;
            const detail = res.data;
            setInvoiceID(detail.header.invoiceID);
            setSelectedCustomer(customers.find((c) => c.customerID === detail.header.customerID) ?? null);
            setLines(
                detail.lines.map((l) => ({
                    itemID: l.itemID,
                    itemName: l.itemName,
                    uomID: l.uomID,
                    uomCode: l.uomCode,
                    quantity: l.quantity,
                    unitPrice: l.unitPrice,
                    discount: l.discount,
                }))
            );
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resumeInvoiceId, customers.length]);

    // Debounced item search (FR-POS-01)
    useEffect(() => {
        if (!itemSearchTerm || itemSearchTerm.length < 1) {
            setItemOptions([]);
            return;
        }
        const handle = setTimeout(async () => {
            const res = await searchItemsForBilling(groupId, itemSearchTerm);
            if (res?.status) setItemOptions(res.data ?? []);
        }, 250);
        return () => clearTimeout(handle);
    }, [itemSearchTerm, groupId]);

    const addLine = (item) => {
        if (!item) return;
        setLines((prev) => [
            ...prev,
            {
                itemID: item.itemID,
                itemName: item.itemName,
                uomID: item.baseUOMID,
                uomCode: item.uomCode,
                quantity: 1,
                unitPrice: item.sellingPrice,
                discount: 0,
                onHandQuantity: item.onHandQuantity,
            },
        ]);
        setItemSearchTerm('');
        setItemOptions([]);
    };

    const updateLine = (index, field, value) => {
        setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
    };

    const removeLine = (index) => setLines((prev) => prev.filter((_, i) => i !== index));

    const lineTotal = (line) => Number(line.quantity || 0) * Number(line.unitPrice || 0) - Number(line.discount || 0);
    const subTotal = useMemo(() => lines.reduce((sum, l) => sum + Number(l.quantity || 0) * Number(l.unitPrice || 0), 0), [lines]);
    const discountTotal = useMemo(() => lines.reduce((sum, l) => sum + Number(l.discount || 0), 0), [lines]);
    const totalAmount = subTotal - discountTotal;

    const buildLinesPayload = () =>
        lines.map((l) => ({ itemID: l.itemID, uomID: l.uomID, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), discount: Number(l.discount) }));

    const handleHold = async () => {
        if (lines.length === 0) {
            setMessage({ severity: 'warning', text: 'Add at least one item before holding the bill.' });
            return;
        }
        setIsBusy(true);
        const response = await saveInvoice({
            groupID: groupId,
            invoiceID,
            customerID: selectedCustomer?.customerID ?? null,
            invoiceDate,
            isHeld: true,
            passToAccounting: true,
            lines: buildLinesPayload(),
            payments: [],
            createdBy: userId,
        });
        setIsBusy(false);
        if (response?.status) {
            setMessage({ severity: 'success', text: 'Bill held. You can resume it later from Held Bills.' });
            onDone?.();
        } else {
            setMessage({ severity: 'error', text: response?.message ?? 'Unable to hold the bill.' });
        }
    };

    const handleCompleteSale = async (payments) => {
        setIsBusy(true);
        const response = await saveInvoice({
            groupID: groupId,
            invoiceID,
            customerID: selectedCustomer?.customerID ?? null,
            invoiceDate,
            isHeld: false,
            passToAccounting: true,
            lines: buildLinesPayload(),
            payments,
            createdBy: userId,
        });
        setIsBusy(false);

        if (response?.status) {
            setShowPaymentPanel(false);
            setMessage({ severity: 'success', text: `Sale completed successfully.` });
            setLines([]);
            setSelectedCustomer(null);
            setInvoiceID(null);
            onDone?.();
        } else {
            setMessage({ severity: 'error', text: response?.message ?? 'Unable to complete the sale.' });
        }
        return response;
    };

    return (
        <Box>
            <PageHeader
                title={invoiceID ? `Billing - Resuming Bill #${invoiceID}` : 'Billing'}
                subtitle="Search items, build the bill, then hold or complete the sale"
            />

            {message && (
                <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
                    {message.text}
                </Alert>
            )}

            <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Autocomplete
                            options={itemOptions}
                            getOptionLabel={(o) => `${o.itemCode} - ${o.itemName}`}
                            inputValue={itemSearchTerm}
                            onInputChange={(_, value) => setItemSearchTerm(value)}
                            onChange={(_, value) => addLine(value)}
                            filterOptions={(x) => x} // server already filters
                            renderInput={(params) => (
                                <TextField {...params} label="Search item by code, name, or barcode" autoFocus />
                            )}
                            renderOption={(props, option) => (
                                <li {...props} key={option.itemID}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                        <span>{option.itemCode} - {option.itemName}</span>
                                        <span style={{ color: option.onHandQuantity <= 0 ? '#B3261E' : 'inherit' }}>
                                            {option.onHandQuantity} {option.uomCode} on hand
                                        </span>
                                    </Box>
                                </li>
                            )}
                        />
                    </Paper>

                    <Paper variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Item</TableCell>
                                    <TableCell align="right">Qty</TableCell>
                                    <TableCell>UOM</TableCell>
                                    <TableCell align="right">Unit Price</TableCell>
                                    <TableCell align="right">Discount</TableCell>
                                    <TableCell align="right">Line Total</TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {lines.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                            No items added yet. Search above to start the bill.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {lines.map((line, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{line.itemName}</TableCell>
                                        <TableCell align="right">
                                            <TextField
                                                type="number"
                                                size="small"
                                                value={line.quantity}
                                                inputProps={{ step: 0.001, style: { textAlign: 'right' } }}
                                                onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                                                sx={{ width: 90 }}
                                            />
                                        </TableCell>
                                        <TableCell>{line.uomCode}</TableCell>
                                        <TableCell align="right">
                                            <TextField
                                                type="number"
                                                size="small"
                                                value={line.unitPrice}
                                                inputProps={{ step: 0.01, style: { textAlign: 'right' } }}
                                                onChange={(e) => updateLine(index, 'unitPrice', e.target.value)}
                                                sx={{ width: 100 }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <TextField
                                                type="number"
                                                size="small"
                                                value={line.discount}
                                                inputProps={{ step: 0.01, style: { textAlign: 'right' } }}
                                                onChange={(e) => updateLine(index, 'discount', e.target.value)}
                                                sx={{ width: 90 }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">{lineTotal(line).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <IconButton size="small" onClick={() => removeLine(index)}>
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Customer</Typography>
                        <Autocomplete
                            options={customers}
                            getOptionLabel={(c) => `${c.name}${c.phone ? ' - ' + c.phone : ''}`}
                            value={selectedCustomer}
                            onChange={(_, value) => setSelectedCustomer(value)}
                            renderInput={(params) => <TextField {...params} label="Search by name or phone" size="small" />}
                            isOptionEqualToValue={(o, v) => o.customerID === v.customerID}
                        />

                        {selectedCustomer && (
                            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">Type</Typography>
                                    <Chip
                                        label={selectedCustomer.customerType === 1 ? 'Regular' : 'Walk-in'}
                                        size="small"
                                        variant="outlined"
                                    />
                                </Box>
                                {selectedCustomer.customerType === 1 && (
                                    <>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="body2" color="text.secondary">Credit Limit</Typography>
                                            <Typography variant="body2">{Number(selectedCustomer.creditLimit ?? 0).toFixed(2)}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="body2" color="text.secondary">Outstanding Balance</Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{ color: selectedCustomer.outstandingBalance > 0 ? '#B3261E' : 'inherit', fontWeight: 600 }}
                                            >
                                                {Number(selectedCustomer.outstandingBalance ?? 0).toFixed(2)}
                                            </Typography>
                                        </Box>
                                        <Button
                                            size="small"
                                            startIcon={<AccountBalanceWalletOutlinedIcon fontSize="small" />}
                                            onClick={() => setShowDebtSettlement(true)}
                                            sx={{ alignSelf: 'flex-start', mt: 1 }}
                                        >
                                            Settle Debt
                                        </Button>
                                    </>
                                )}
                            </Box>
                        )}
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                            <Typography variant="body2">{subTotal.toFixed(2)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">Discount</Typography>
                            <Typography variant="body2">-{discountTotal.toFixed(2)}</Typography>
                        </Box>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="subtitle1" fontWeight={600}>Total</Typography>
                            <Typography variant="subtitle1" fontWeight={600}>{totalAmount.toFixed(2)}</Typography>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Button
                                variant="contained"
                                startIcon={<PaymentOutlinedIcon />}
                                disabled={lines.length === 0 || isBusy}
                                onClick={() => setShowPaymentPanel(true)}
                            >
                                Pay &amp; Complete
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<PauseCircleOutlinedIcon />}
                                disabled={lines.length === 0 || isBusy}
                                onClick={handleHold}
                            >
                                Hold Bill
                            </Button>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {showPaymentPanel && (
                <PaymentPanel
                    totalAmount={totalAmount}
                    customer={selectedCustomer}
                    onClose={() => setShowPaymentPanel(false)}
                    onSubmit={handleCompleteSale}
                />
            )}

            {showDebtSettlement && selectedCustomer && (
                <DebtSettlement
                    customer={selectedCustomer}
                    onClose={() => setShowDebtSettlement(false)}
                    onSaved={() => {
                        setShowDebtSettlement(false);
                        setMessage({ severity: 'success', text: 'Debt settlement recorded.' });
                    }}
                />
            )}
        </Box>
    );
}
