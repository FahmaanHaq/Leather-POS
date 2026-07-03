import React from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import DialogActions from '@mui/material/DialogActions';
import Modal from '../../../common/Modal';
import { saveDebtSettlement } from '../Services';
import { getGroupIDFromToken, getUserIDFromToken } from '../../../common/tokenDecoder';

const validationSchema = Yup.object({
    paymentMode: Yup.number().oneOf([1, 2, 3]).required('Payment mode is required'),
    amount: Yup.number().moreThan(0, 'Amount must be greater than 0').required('Amount is required'),
    chequeNo: Yup.string().when('paymentMode', { is: 3, then: (s) => s.required('Cheque number is required') }),
    bank: Yup.string().when('paymentMode', { is: 3, then: (s) => s.required('Bank is required') }),
    chequeDate: Yup.string().when('paymentMode', { is: 3, then: (s) => s.required('Cheque date is required') }),
});

export default function DebtSettlement({ customer, onClose, onSaved }) {
    const initialValues = {
        paymentMode: 1,
        amount: '',
        chequeNo: '',
        bank: '',
        branch: '',
        chequeDate: '',
        cardType: '',
        last4Digits: '',
        approvalCode: '',
        terminalID: '',
    };

    const handleSubmit = async (values, { setSubmitting, setStatus }) => {
        const response = await saveDebtSettlement({
            groupID: getGroupIDFromToken(),
            customerID: customer.customerID,
            paymentMode: values.paymentMode,
            amount: Number(values.amount),
            chequeNo: values.paymentMode === 3 ? values.chequeNo : null,
            bank: values.paymentMode === 3 ? values.bank : null,
            branch: values.paymentMode === 3 ? values.branch : null,
            chequeDate: values.paymentMode === 3 ? values.chequeDate : null,
            cardType: values.paymentMode === 2 ? values.cardType : null,
            last4Digits: values.paymentMode === 2 ? values.last4Digits : null,
            approvalCode: values.paymentMode === 2 ? values.approvalCode : null,
            terminalID: values.paymentMode === 2 ? values.terminalID : null,
            createdBy: getUserIDFromToken(),
        });

        setSubmitting(false);
        if (response?.status) onSaved?.();
        else setStatus(response?.message ?? 'Something went wrong while recording the settlement.');
    };

    return (
        <Modal title={`Settle Debt - ${customer.name}`} onClose={onClose}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Current outstanding balance: <strong>{Number(customer.outstandingBalance ?? 0).toFixed(2)}</strong>
            </Typography>

            <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting, status }) => (
                    <Form>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {status && <Alert severity="error">{status}</Alert>}

                            <TextField
                                select
                                label="Payment Mode"
                                name="paymentMode"
                                value={values.paymentMode}
                                onChange={handleChange}
                                fullWidth
                            >
                                <MenuItem value={1}>Cash</MenuItem>
                                <MenuItem value={2}>Card</MenuItem>
                                <MenuItem value={3}>Cheque</MenuItem>
                            </TextField>

                            <TextField
                                type="number"
                                label="Amount"
                                name="amount"
                                value={values.amount}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={touched.amount && !!errors.amount}
                                helperText={touched.amount && errors.amount}
                                fullWidth
                            />

                            {values.paymentMode === 3 && (
                                <>
                                    <TextField label="Cheque No" name="chequeNo" value={values.chequeNo} onChange={handleChange}
                                        error={touched.chequeNo && !!errors.chequeNo} helperText={touched.chequeNo && errors.chequeNo} fullWidth />
                                    <TextField label="Bank" name="bank" value={values.bank} onChange={handleChange}
                                        error={touched.bank && !!errors.bank} helperText={touched.bank && errors.bank} fullWidth />
                                    <TextField label="Branch" name="branch" value={values.branch} onChange={handleChange} fullWidth />
                                    <TextField type="date" label="Cheque Date" name="chequeDate" InputLabelProps={{ shrink: true }}
                                        value={values.chequeDate} onChange={handleChange}
                                        error={touched.chequeDate && !!errors.chequeDate} helperText={touched.chequeDate && errors.chequeDate} fullWidth />
                                </>
                            )}

                            {values.paymentMode === 2 && (
                                <>
                                    <TextField label="Card Type" name="cardType" value={values.cardType} onChange={handleChange} fullWidth />
                                    <TextField label="Last 4 Digits" name="last4Digits" value={values.last4Digits} onChange={handleChange} fullWidth />
                                    <TextField label="Approval Code" name="approvalCode" value={values.approvalCode} onChange={handleChange} fullWidth />
                                </>
                            )}
                        </Box>

                        <DialogActions sx={{ px: 0, pt: 3 }}>
                            <Button onClick={onClose} color="inherit">Cancel</Button>
                            <Button type="submit" variant="contained" disabled={isSubmitting}>Record Settlement</Button>
                        </DialogActions>
                    </Form>
                )}
            </Formik>
        </Modal>
    );
}
