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
import { saveItem, updateItem } from '../Services';
import { getUserIDFromToken } from '../../../common/tokenDecoder';

const decimalPlaces = (max) => (value) => {
    if (value === undefined || value === null || value === '') return true;
    const str = value.toString();
    const dot = str.indexOf('.');
    return dot === -1 || str.length - dot - 1 <= max;
};

const validationSchema = Yup.object({
    itemCode: Yup.string().trim().required('Item code is required').max(50),
    itemName: Yup.string().trim().required('Item name is required').max(150),
    baseUOMID: Yup.number().required('Unit of measurement is required'),
    costPrice: Yup.number()
        .required('Cost price is required')
        .min(0, 'Cost price cannot be negative')
        .test('decimal-places', 'Up to 2 decimal places', decimalPlaces(2)),
    sellingPrice: Yup.number()
        .required('Selling price is required')
        .min(0, 'Selling price cannot be negative')
        .test('decimal-places', 'Up to 2 decimal places', decimalPlaces(2)),
    reorderLevel: Yup.number()
        .min(0, 'Reorder level cannot be negative')
        .test('decimal-places', 'Up to 3 decimal places', decimalPlaces(3)),
});

export default function AddEdit({ item, groupId, uomList, onClose, onSaved }) {
    const isEdit = !!item;

    const initialValues = {
        itemCode: item?.itemCode ?? '',
        itemName: item?.itemName ?? '',
        baseUOMID: item?.baseUOMID ?? (uomList?.[0]?.uomid ?? ''),
        barcode: item?.barcode ?? '',
        description: item?.description ?? '',
        costPrice: item?.costPrice ?? '',
        sellingPrice: item?.sellingPrice ?? '',
        reorderLevel: item?.reorderLevel ?? 0,
        isActive: item?.isActive ?? true,
    };

    const handleSubmit = async (values, { setSubmitting, setStatus }) => {
        const userId = getUserIDFromToken();
        const response = isEdit
            ? await updateItem({
                  itemID: item.itemID,
                  itemName: values.itemName,
                  barcode: values.barcode || null,
                  description: values.description || null,
                  costPrice: values.costPrice,
                  sellingPrice: values.sellingPrice,
                  reorderLevel: values.reorderLevel,
                  isActive: values.isActive,
                  modifiedBy: userId,
              })
            : await saveItem({
                  groupID: groupId,
                  itemCode: values.itemCode,
                  itemName: values.itemName,
                  baseUOMID: values.baseUOMID,
                  barcode: values.barcode || null,
                  description: values.description || null,
                  costPrice: values.costPrice,
                  sellingPrice: values.sellingPrice,
                  reorderLevel: values.reorderLevel,
                  createdBy: userId,
              });

        setSubmitting(false);
        if (response?.status) onSaved?.();
        else setStatus(response?.message ?? 'Something went wrong while saving the item.');
    };

    return (
        <Modal title={isEdit ? 'Edit Item' : 'New Item'} onClose={onClose}>
            <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting, status }) => (
                    <Form>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {status && <Alert severity="error">{status}</Alert>}

                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Item Code"
                                        name="itemCode"
                                        value={values.itemCode}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        disabled={isEdit}
                                        error={touched.itemCode && !!errors.itemCode}
                                        helperText={touched.itemCode && errors.itemCode}
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        label="Unit of Measurement"
                                        name="baseUOMID"
                                        value={values.baseUOMID}
                                        onChange={handleChange}
                                        disabled={isEdit}
                                        error={touched.baseUOMID && !!errors.baseUOMID}
                                        helperText={touched.baseUOMID && errors.baseUOMID}
                                        fullWidth
                                    >
                                        {(uomList ?? []).map((u) => (
                                        <MenuItem key={u.uomid} value={u.uomid}>{u.uomName} ({u.uomCode})</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                            </Grid>

                            <TextField
                                label="Item Name"
                                name="itemName"
                                value={values.itemName}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={touched.itemName && !!errors.itemName}
                                helperText={touched.itemName && errors.itemName}
                                fullWidth
                            />

                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        type="number"
                                        label="Cost Price"
                                        name="costPrice"
                                        inputProps={{ step: 0.01 }}
                                        value={values.costPrice}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={touched.costPrice && !!errors.costPrice}
                                        helperText={touched.costPrice && errors.costPrice}
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        type="number"
                                        label="Selling Price"
                                        name="sellingPrice"
                                        inputProps={{ step: 0.01 }}
                                        value={values.sellingPrice}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={touched.sellingPrice && !!errors.sellingPrice}
                                        helperText={touched.sellingPrice && errors.sellingPrice}
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        type="number"
                                        label="Reorder Level"
                                        name="reorderLevel"
                                        inputProps={{ step: 0.001 }}
                                        value={values.reorderLevel}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={touched.reorderLevel && !!errors.reorderLevel}
                                        helperText={touched.reorderLevel && errors.reorderLevel}
                                        fullWidth
                                    />
                                </Grid>
                            </Grid>
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
