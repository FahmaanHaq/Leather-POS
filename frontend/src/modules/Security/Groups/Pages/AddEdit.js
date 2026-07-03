import React from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import DialogActions from '@mui/material/DialogActions';
import Modal from '../../../../common/Modal';
import { saveGroup, updateGroup } from '../Services';

const validationSchema = Yup.object({
    groupName: Yup.string().trim().required('Group name is required').max(150),
});

export default function AddEdit({ group, onClose, onSaved }) {
    const isEdit = !!group;
    const initialValues = { groupName: group?.groupName ?? '' };

    const handleSubmit = async (values, { setSubmitting, setStatus }) => {
        const response = isEdit
            ? await updateGroup({ groupID: group.groupID, groupName: values.groupName, isActive: group.isActive })
            : await saveGroup({ groupName: values.groupName });

        setSubmitting(false);
        if (response?.status) onSaved?.();
        else setStatus(response?.message ?? 'Something went wrong while saving the group.');
    };

    return (
        <Modal title={isEdit ? 'Edit Group' : 'New Group'} onClose={onClose}>
            <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting, status }) => (
                    <Form>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {status && <Alert severity="error">{status}</Alert>}
                            <TextField
                                label="Group Name"
                                name="groupName"
                                value={values.groupName}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={touched.groupName && !!errors.groupName}
                                helperText={touched.groupName && errors.groupName}
                                fullWidth
                                autoFocus
                            />
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
