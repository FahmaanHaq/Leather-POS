import React, { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import KeyboardOutlinedIcon from '@mui/icons-material/KeyboardOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined';
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';

import PageHeader from '../../../common/PageHeader';
import PaymentPanel from './PaymentPanel';
import DebtSettlement from './DebtSettlement';
import { searchItemsForBilling, saveInvoice, getInvoiceById, getCustomerItemLastPrice } from '../Services';
import { getAllCustomers } from '../../Customers/Services';
import { getGroupIDFromToken, getUserIDFromToken } from '../../../common/tokenDecoder';

const SHORTCUTS = [
    { key: 'Enter', label: 'Add scanned/typed item to the bill' },
    { key: 'F8', label: 'Hold Bill' },
    { key: 'F9', label: 'Pay & Complete' },
    { key: 'Esc', label: 'Clear the item search box' },
];

export default function BillingScreen({ resumeInvoiceId, onDone }) {
    const groupId = getGroupIDFromToken();
    const userId = getUserIDFromToken();

    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // Sequence: the cashier must pick a customer (or explicitly choose
    // Walk-in) before item scanning even appears. This also guarantees the
    // customer-price-history lookup always has a customer to check against.
    const [customerConfirmed, setCustomerConfirmed] = useState(false);

    const [itemSearchTerm, setItemSearchTerm] = useState('');
    const [itemOptions, setItemOptions] = useState([]);
    const searchInputRef = useRef(null);

    const [lines, setLines] = useState([]);
    const [invoiceID, setInvoiceID] = useState(null);
    const [invoiceDate] = useState(new Date());

    const [showPaymentPanel, setShowPaymentPanel] = useState(false);
    const [showDebtSettlement, setShowDebtSettlement] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [message, setMessage] = useState(null);
    const [isBusy, setIsBusy] = useState(false);

    useEffect(() => {
        getAllCustomers(groupId).then((res) => {
            if (res?.status) setCustomers(res.data ?? []);
        });
    }, [groupId]);

    // Resuming a held bill: the customer decision was already made when it
    // was held, so skip straight past the customer-selection step.
    useEffect(() => {
        if (!resumeInvoiceId) return;
        setCustomerConfirmed(true);
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

    // Debounced item search (FR-POS-01). Guarded against out-of-order network
    // responses: if you type quickly, an earlier request can occasionally
    // resolve AFTER a later one - without this check, its stale results
    // would silently overwrite the correct, more current ones.
    const searchRequestIdRef = useRef(0);

    useEffect(() => {
        if (!itemSearchTerm || itemSearchTerm.length < 1) {
            setItemOptions([]);
            return;
        }
        const handle = setTimeout(async () => {
            const requestId = ++searchRequestIdRef.current;
            const res = await searchItemsForBilling(groupId, itemSearchTerm);
            if (requestId !== searchRequestIdRef.current) return; // a newer search has since started - discard this one
            if (res?.status) setItemOptions(res.data ?? []);
        }, 250);
        return () => clearTimeout(handle);
    }, [itemSearchTerm, groupId]);

    const focusSearch = () => {
        setTimeout(() => searchInputRef.current?.focus(), 50);
    };

    useEffect(() => {
        if (customerConfirmed) focusSearch();
    }, [customerConfirmed]);

    const addLine = async (item) => {
        if (!item) return;

        setItemSearchTerm('');
        setItemOptions([]);

        let unitPrice = item.sellingPrice;
        let discount = 0;
        let priceSource = null;

        if (selectedCustomer) {
            const priceRes = await getCustomerItemLastPrice(selectedCustomer.customerID, item.itemID);
            if (priceRes?.status && priceRes.data) {
                unitPrice = priceRes.data.unitPrice;
                discount = priceRes.data.discount ?? 0;
                priceSource = priceRes.data.lastInvoiceNo;
            }
        }

        setLines((prev) => [
            ...prev,
            {
                itemID: item.itemID,
                itemName: item.itemName,
                uomID: item.baseUOMID,
                uomCode: item.uomCode,
                quantity: 1,
                unitPrice,
                discount,
                onHandQuantity: item.onHandQuantity,
                priceSource,
            },
        ]);
        focusSearch();
    };

    // Single source of truth for "Enter adds the item" - no competing
    // library-internal keyboard handling involved, since this is a plain
    // TextField with a manually-rendered results list, not an Autocomplete.
    const handleSearchKeyDown = (e) => {
        if (e.key === 'Escape') {
            setItemSearchTerm('');
            setItemOptions([]);
            return;
        }
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (itemOptions.length === 0) return;

        const term = itemSearchTerm.trim();
        const best =
            itemOptions.find((o) => o.barcode === term) ??
            itemOptions.find((o) => o.itemCode.toLowerCase() === term.toLowerCase()) ??
            itemOptions[0];

        addLine(best);
    };

    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (e.key === 'F8') {
                e.preventDefault();
                if (lines.length > 0 && !isBusy) handleHold();
            } else if (e.key === 'F9') {
                e.preventDefault();
                if (lines.length > 0 && !isBusy) setShowPaymentPanel(true);
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lines, isBusy]);

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
            setCustomerConfirmed(false);
            onDone?.();
        } else {
            setMessage({ severity: 'error', text: response?.message ?? 'Unable to complete the sale.' });
        }
        return response;
    };

    const handleChangeCustomer = () => {
        setCustomerConfirmed(false);
        if (lines.length > 0) {
            setMessage({
                severity: 'info',
                text: 'Changing the customer will not re-price items already on the bill - remove and re-add them if you need the new customer\'s pricing applied.',
            });
        }
    };

    // ===================== Step 1: who is this sale for? =====================
    if (!customerConfirmed) {
        return (
            <Box sx={{ maxWidth: 520, mx: 'auto', mt: 6 }}>
                <PageHeader title="Billing" subtitle="Who is this sale for?" />
                <Paper variant="outlined" sx={{ p: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Customer</Typography>
                    <Autocomplete
                        options={customers}
                        getOptionLabel={(c) => `${c.name}${c.phone ? ' - ' + c.phone : ''}`}
                        value={selectedCustomer}
                        onChange={(_, value) => setSelectedCustomer(value)}
                        renderInput={(params) => <TextField {...params} label="Search by name or phone" autoFocus />}
                        isOptionEqualToValue={(o, v) => o.customerID === v.customerID}
                    />

                    {selectedCustomer?.customerType === 1 && (
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Outstanding Balance</Typography>
                            <Typography
                                variant="body2"
                                sx={{ color: selectedCustomer.outstandingBalance > 0 ? '#B3261E' : 'inherit', fontWeight: 600 }}
                            >
                                {Number(selectedCustomer.outstandingBalance ?? 0).toFixed(2)}
                            </Typography>
                        </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => { setSelectedCustomer(null); setCustomerConfirmed(true); }}
                        >
                            Walk-in Sale (no customer)
                        </Button>
                        <Button
                            variant="contained"
                            fullWidth
                            startIcon={<PersonOutlineOutlinedIcon />}
                            disabled={!selectedCustomer}
                            onClick={() => setCustomerConfirmed(true)}
                        >
                            Continue
                        </Button>
                    </Box>
                </Paper>
            </Box>
        );
    }

    // ===================== Step 2: build and complete the bill =====================
    return (
        <Box>
            <PageHeader
                title={invoiceID ? `Billing - Resuming Bill #${invoiceID}` : 'Billing'}
                subtitle="Scan or type an item code, press Enter to add it - no mouse needed"
                actions={
                    <Tooltip title="Keyboard shortcuts">
                        <IconButton onClick={() => setShowShortcuts((s) => !s)}>
                            <KeyboardOutlinedIcon />
                        </IconButton>
                    </Tooltip>
                }
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Tooltip title="Click the x to change customer">
                    <Chip
                        icon={<PersonOutlineOutlinedIcon />}
                        label={selectedCustomer ? selectedCustomer.name : 'Walk-in Sale'}
                        onDelete={handleChangeCustomer}
                        variant="outlined"
                    />
                </Tooltip>
            </Box>

            {showShortcuts && (
                <Alert severity="info" icon={<KeyboardOutlinedIcon fontSize="inherit" />} sx={{ mb: 2 }} onClose={() => setShowShortcuts(false)}>
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {SHORTCUTS.map((s) => (
                            <Box key={s.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <Chip label={s.key} size="small" sx={{ fontWeight: 600, fontFamily: 'monospace' }} />
                                <Typography variant="body2">{s.label}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Alert>
            )}

            {message && (
                <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
                    {message.text}
                </Alert>
            )}

            <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2, position: 'relative' }}>
                        <TextField
                            fullWidth
                            inputRef={searchInputRef}
                            label="Scan barcode or type item code / name, then press Enter"
                            value={itemSearchTerm}
                            onChange={(e) => setItemSearchTerm(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            autoComplete="off"
                            autoFocus
                        />

                        {itemOptions.length > 0 && (
                            <Paper
                                variant="outlined"
                                sx={{
                                    position: 'absolute',
                                    zIndex: 10,
                                    left: 16,
                                    right: 16,
                                    mt: 0.5,
                                    maxHeight: 320,
                                    overflow: 'auto',
                                }}
                            >
                                <List dense disablePadding>
                                    {itemOptions.map((option, idx) => (
                                        <ListItemButton key={option.itemID} onClick={() => addLine(option)} selected={idx === 0}>
                                            <ListItemText
                                                primary={`${option.itemCode} - ${option.itemName}`}
                                                secondary={
                                                    <span style={{ color: option.onHandQuantity <= 0 ? '#B3261E' : 'inherit' }}>
                                                        {option.onHandQuantity} {option.uomCode} on hand
                                                    </span>
                                                }
                                            />
                                        </ListItemButton>
                                    ))}
                                </List>
                            </Paper>
                        )}
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
                                            No items added yet. Scan or type a code above, then press Enter.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {lines.map((line, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            {line.itemName}
                                            {line.priceSource && (
                                                <Tooltip title={`Priced at what this customer paid on ${line.priceSource}, not the catalogue price`}>
                                                    <Chip
                                                        label="customer price"
                                                        size="small"
                                                        color="info"
                                                        variant="outlined"
                                                        sx={{ ml: 1, height: 20, fontSize: 11 }}
                                                    />
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <TextField
                                                type="number"
                                                size="small"
                                                value={line.quantity}
                                                inputProps={{ step: 0.001, style: { textAlign: 'right' } }}
                                                onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); focusSearch(); } }}
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
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); focusSearch(); } }}
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
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); focusSearch(); } }}
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
                    {selectedCustomer && (
                        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
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
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                        <Typography variant="body2" color="text.secondary">Credit Limit</Typography>
                                        <Typography variant="body2">{Number(selectedCustomer.creditLimit ?? 0).toFixed(2)}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
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
                                        sx={{ mt: 1 }}
                                    >
                                        Settle Debt
                                    </Button>
                                </>
                            )}
                        </Paper>
                    )}

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
                                Pay &amp; Complete (F9)
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<PauseCircleOutlinedIcon />}
                                disabled={lines.length === 0 || isBusy}
                                onClick={handleHold}
                            >
                                Hold Bill (F8)
                            </Button>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {showPaymentPanel && (
                <PaymentPanel
                    totalAmount={totalAmount}
                    customer={selectedCustomer}
                    onClose={() => { setShowPaymentPanel(false); focusSearch(); }}
                    onSubmit={handleCompleteSale}
                />
            )}

            {showDebtSettlement && selectedCustomer && (
                <DebtSettlement
                    customer={selectedCustomer}
                    onClose={() => { setShowDebtSettlement(false); focusSearch(); }}
                    onSaved={() => {
                        setShowDebtSettlement(false);
                        setMessage({ severity: 'success', text: 'Debt settlement recorded.' });
                        focusSearch();
                    }}
                />
            )}
        </Box>
    );
}
