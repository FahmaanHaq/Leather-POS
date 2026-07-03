import React from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import DialogActions from '@mui/material/DialogActions';
import Modal from '../../../common/Modal';
import { saveSupplier } from '../Services';
import { getUserIDFromToken } from '../../../common/tokenDecoder';

const validationSchema = Yup.object({
    name: Yup.string().trim().required('Supplier name is required').max(150),
});

export default function SupplierQuickAdd({ groupId, onClose, onSaved }) {
    const initialValues = { name: '', contactInfo: '', paymentTerms: '' };

    const handleSubmit = async (values, { setSubmitting, setStatus }) => {
        const response = await saveSupplier({
            groupID: groupId,
            name: values.name,
            contactInfo: values.contactInfo || null,
            paymentTerms: values.paymentTerms || null,
            createdBy: getUserIDFromToken(),
        });

        setSubmitting(false);
        if (response?.status) {
            onSaved?.({ supplierID: response.data, name: values.name });
        } else {
            setStatus(response?.message ?? 'Something went wrong while adding the supplier.');
        }
    };

    return (
        <Modal title="New Supplier" onClose={onClose}>
            <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting, status }) => (
                    <Form>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {status && <Alert severity="error">{status}</Alert>}

                            <TextField
                                label="Supplier Name"
                                name="name"
                                value={values.name}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={touched.name && !!errors.name}
                                helperText={touched.name && errors.name}
                                fullWidth
                                autoFocus
                            />

                            <TextField
                                label="Contact Info"
                                name="contactInfo"
                                value={values.contactInfo}
                                onChange={handleChange}
                                fullWidth
                            />

                            <TextField
                                label="Payment Terms"
                                name="paymentTerms"
                                value={values.paymentTerms}
                                onChange={handleChange}
                                placeholder="e.g. Net 30"
                                fullWidth
                            />
                        </Box>

                        <DialogActions sx={{ px: 0, pt: 3 }}>
                            <Button onClick={onClose} color="inherit">Cancel</Button>
                            <Button type="submit" variant="contained" disabled={isSubmitting}>Add Supplier</Button>
                        </DialogActions>
                    </Form>
                )}
            </Formik>
        </Modal>
    );
}
