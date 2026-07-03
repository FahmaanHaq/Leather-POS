import React from 'react';
import { Formik, Form, FieldArray } from 'formik';
import * as Yup from 'yup';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import DialogActions from '@mui/material/DialogActions';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import Modal from '../../../common/Modal';
import { saveContainer } from '../Services';
import { getUserIDFromToken } from '../../../common/tokenDecoder';

const validationSchema = Yup.object({
    supplierID: Yup.number().required('Supplier is required'),
    referenceNo: Yup.string().trim().required('Reference number is required').max(50),
    receivedDate: Yup.date().required('Received date is required'),
    lines: Yup.array()
        .of(
            Yup.object({
                itemID: Yup.number().required('Item is required'),
                quantity: Yup.number().moreThan(0, 'Must be > 0').required('Required'),
                unitCost: Yup.number().min(0, 'Cannot be negative').required('Required'),
            })
        )
        .min(1, 'Add at least one stock line'),
});

export default function AddEdit({ groupId, suppliers, items, onClose, onSaved }) {
    const initialValues = {
        supplierID: suppliers?.[0]?.supplierID ?? '',
        referenceNo: '',
        receivedDate: new Date().toISOString().slice(0, 10),
        lines: [{ itemID: items?.[0]?.itemID ?? '', quantity: '', unitCost: '' }],
    };

    const handleSubmit = async (values, { setSubmitting, setStatus }) => {
        const response = await saveContainer({
            groupID: groupId,
            supplierID: values.supplierID,
            referenceNo: values.referenceNo,
            receivedDate: values.receivedDate,
            lines: values.lines.map((l) => ({ itemID: l.itemID, quantity: l.quantity, unitCost: l.unitCost })),
            createdBy: getUserIDFromToken(),
        });

        setSubmitting(false);
        if (response?.status) onSaved?.();
        else setStatus(response?.message ?? 'Something went wrong while receiving the container.');
    };

    return (
        <Modal title="Receive Container (GRN)" onClose={onClose} maxWidth="md">
            <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting, status }) => (
                    <Form>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {status && <Alert severity="error">{status}</Alert>}

                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        select
                                        label="Supplier"
                                        name="supplierID"
                                        value={values.supplierID}
                                        onChange={handleChange}
                                        error={touched.supplierID && !!errors.supplierID}
                                        helperText={touched.supplierID && errors.supplierID}
                                        fullWidth
                                    >
                                        {(suppliers ?? []).map((s) => (
                                            <MenuItem key={s.supplierID} value={s.supplierID}>{s.name}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        label="Reference No"
                                        name="referenceNo"
                                        value={values.referenceNo}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={touched.referenceNo && !!errors.referenceNo}
                                        helperText={touched.referenceNo && errors.referenceNo}
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        type="date"
                                        label="Received Date"
                                        name="receivedDate"
                                        value={values.receivedDate}
                                        onChange={handleChange}
                                        InputLabelProps={{ shrink: true }}
                                        fullWidth
                                    />
                                </Grid>
                            </Grid>

                            <Divider />

                            <FieldArray name="lines">
                                {({ push, remove }) => (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                        <Typography variant="subtitle2">Stock Lines</Typography>
                                        {typeof errors.lines === 'string' && <Alert severity="warning">{errors.lines}</Alert>}

                                        {values.lines.map((line, index) => (
                                            <Grid container spacing={1.5} key={index} alignItems="center">
                                                <Grid item xs={12} sm={5}>
                                                    <TextField
                                                        select
                                                        size="small"
                                                        label="Item"
                                                        name={`lines[${index}].itemID`}
                                                        value={line.itemID}
                                                        onChange={handleChange}
                                                        fullWidth
                                                    >
                                                        {(items ?? []).map((it) => (
                                                            <MenuItem key={it.itemID} value={it.itemID}>{it.itemName}</MenuItem>
                                                        ))}
                                                    </TextField>
                                                </Grid>
                                                <Grid item xs={5} sm={3}>
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        label="Quantity"
                                                        inputProps={{ step: 0.001 }}
                                                        name={`lines[${index}].quantity`}
                                                        value={line.quantity}
                                                        onChange={handleChange}
                                                        onBlur={handleBlur}
                                                        error={!!errors.lines?.[index]?.quantity && !!touched.lines?.[index]?.quantity}
                                                        helperText={touched.lines?.[index]?.quantity && errors.lines?.[index]?.quantity}
                                                        fullWidth
                                                    />
                                                </Grid>
                                                <Grid item xs={5} sm={3}>
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        label="Unit Cost"
                                                        inputProps={{ step: 0.01 }}
                                                        name={`lines[${index}].unitCost`}
                                                        value={line.unitCost}
                                                        onChange={handleChange}
                                                        onBlur={handleBlur}
                                                        error={!!errors.lines?.[index]?.unitCost && !!touched.lines?.[index]?.unitCost}
                                                        helperText={touched.lines?.[index]?.unitCost && errors.lines?.[index]?.unitCost}
                                                        fullWidth
                                                    />
                                                </Grid>
                                                <Grid item xs={2} sm={1}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => remove(index)}
                                                        disabled={values.lines.length === 1}
                                                    >
                                                        <DeleteOutlineIcon fontSize="small" />
                                                    </IconButton>
                                                </Grid>
                                            </Grid>
                                        ))}

                                        <Button
                                            size="small"
                                            startIcon={<AddOutlinedIcon />}
                                            onClick={() => push({ itemID: items?.[0]?.itemID ?? '', quantity: '', unitCost: '' })}
                                            sx={{ alignSelf: 'flex-start' }}
                                        >
                                            Add Line
                                        </Button>
                                    </Box>
                                )}
                            </FieldArray>
                        </Box>

                        <DialogActions sx={{ px: 0, pt: 3 }}>
                            <Button onClick={onClose} color="inherit">Cancel</Button>
                            <Button type="submit" variant="contained" disabled={isSubmitting}>
                                Save Container
                            </Button>
                        </DialogActions>
                    </Form>
                )}
            </Formik>
        </Modal>
    );
}
