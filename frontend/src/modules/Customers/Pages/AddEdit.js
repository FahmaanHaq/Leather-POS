import React from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import DialogActions from '@mui/material/DialogActions';
import Modal from '../../../common/Modal';
import { saveCustomer, updateCustomer } from '../Services';
import { getUserIDFromToken } from '../../../common/tokenDecoder';

const validationSchema = Yup.object({
    customerType: Yup.number().oneOf([1, 2]).required('Customer type is required'),
    name: Yup.string().trim().required('Name is required').max(150),
    phone: Yup.string().nullable().matches(/^[0-9+\-\s]*$/, 'Phone number is invalid'),
    address: Yup.string().nullable().max(255),
    creditLimit: Yup.number()
        .nullable()
        .transform((value, originalValue) => (originalValue === '' ? null : value))
        .min(0, 'Credit limit cannot be negative')
        .when('customerType', {
            is: 2,
            then: (schema) => schema.max(0, 'Walk-in customers cannot have a credit limit').nullable(),
        }),
    creditDays: Yup.number()
        .nullable()
        .transform((value, originalValue) => (originalValue === '' ? null : value))
        .integer('Credit days must be a whole number')
        .min(0, 'Credit days cannot be negative')
        .when('customerType', {
            is: 2,
            then: (schema) => schema.max(0, 'Walk-in customers cannot have credit days').nullable(),
        }),
});

export default function AddEdit({ customer, groupId, onClose, onSaved }) {
    const isEdit = !!customer;

    const initialValues = {
        customerType: customer?.customerType ?? 1,
        name: customer?.name ?? '',
        phone: customer?.phone ?? '',
        address: customer?.address ?? '',
        creditLimit: customer?.creditLimit ?? '',
        creditDays: customer?.creditDays ?? '',
        isActive: customer?.isActive ?? true,
    };

    const handleSubmit = async (values, { setSubmitting, setStatus }) => {
        const userId = getUserIDFromToken();
        const creditLimit = values.customerType === 2 ? null : (values.creditLimit === '' ? null : values.creditLimit);
        const creditDays = values.customerType === 2 ? null : (values.creditDays === '' ? null : values.creditDays);

        const response = isEdit
            ? await updateCustomer({
                  customerID: customer.customerID,
                  name: values.name,
                  phone: values.phone || null,
                  address: values.address || null,
                  creditLimit, creditDays,
                  isActive: values.isActive,
                  modifiedBy: userId,
              })
            : await saveCustomer({
                  groupID: groupId,
                  customerType: values.customerType,
                  name: values.name,
                  phone: values.phone || null,
                  address: values.address || null,
                  creditLimit, creditDays,
                  createdBy: userId,
              });

        setSubmitting(false);
        if (response?.status) onSaved?.();
        else setStatus(response?.message ?? 'Something went wrong while saving the customer.');
    };

    return (
        <Modal title={isEdit ? 'Edit Customer' : 'New Customer'} onClose={onClose}>
            <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting, status }) => (
                    <Form>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {status && <Alert severity="error">{status}</Alert>}

                            <TextField
                                select
                                label="Customer Type"
                                name="customerType"
                                value={values.customerType}
                                onChange={handleChange}
                                disabled={isEdit}
                                fullWidth
                            >
                                <MenuItem value={1}>Regular (Credit-allowed)</MenuItem>
                                <MenuItem value={2}>Walk-in</MenuItem>
                            </TextField>

                            <TextField
                                label="Name"
                                name="name"
                                value={values.name}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={touched.name && !!errors.name}
                                helperText={touched.name && errors.name}
                                fullWidth
                            />

                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Phone"
                                        name="phone"
                                        value={values.phone}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={touched.phone && !!errors.phone}
                                        helperText={touched.phone && errors.phone}
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Address"
                                        name="address"
                                        value={values.address}
                                        onChange={handleChange}
                                        fullWidth
                                    />
                                </Grid>
                            </Grid>

                            {values.customerType === 1 && (
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            type="number"
                                            label="Credit Limit"
                                            name="creditLimit"
                                            value={values.creditLimit}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={touched.creditLimit && !!errors.creditLimit}
                                            helperText={touched.creditLimit && errors.creditLimit}
                                            fullWidth
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            type="number"
                                            label="Credit Days"
                                            name="creditDays"
                                            value={values.creditDays}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={touched.creditDays && !!errors.creditDays}
                                            helperText={touched.creditDays && errors.creditDays}
                                            fullWidth
                                        />
                                    </Grid>
                                </Grid>
                            )}
                        </Box>

                        <DialogActions sx={{ px: 0, pt: 3 }}>
                            <Button onClick={onClose} color="inherit">Cancel</Button>
                            <Button type="submit" variant="contained" disabled={isSubmitting}>
                                {isEdit ? 'Update' : 'Save'}
                            </Button>
                        </DialogActions>
                    </Form>
                )}
            </Formik>
        </Modal>
    );
}
