import React from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import DialogActions from '@mui/material/DialogActions';
import Modal from '../../../../common/Modal';
import { saveRole, updateRole } from '../Services';
import { getUserIDFromToken } from '../../../../common/tokenDecoder';

const validationSchema = Yup.object({
    roleName: Yup.string().trim().required('Role name is required').max(100),
    description: Yup.string().nullable().max(255),
});

export default function AddEdit({ role, groupId, onClose, onSaved }) {
    const isEdit = !!role;

    const initialValues = {
        roleName: role?.roleName ?? '',
        description: role?.description ?? '',
        isActive: role?.isActive ?? true,
    };

    const handleSubmit = async (values, { setSubmitting, setStatus }) => {
        const userId = getUserIDFromToken();
        const response = isEdit
            ? await updateRole({
                  roleID: role.roleID,
                  roleName: values.roleName,
                  description: values.description || null,
                  isActive: values.isActive,
                  modifiedBy: userId,
              })
            : await saveRole({
                  groupID: groupId,
                  roleName: values.roleName,
                  description: values.description || null,
                  createdBy: userId,
              });

        setSubmitting(false);
        if (response?.status) onSaved?.();
        else setStatus(response?.message ?? 'Something went wrong while saving the role.');
    };

    return (
        <Modal title={isEdit ? 'Edit Role' : 'New Role'} onClose={onClose}>
            <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting, status }) => (
                    <Form>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {status && <Alert severity="error">{status}</Alert>}

                            <TextField
                                label="Role Name"
                                name="roleName"
                                value={values.roleName}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={touched.roleName && !!errors.roleName}
                                helperText={touched.roleName && errors.roleName}
                                fullWidth
                            />

                            <TextField
                                label="Description"
                                name="description"
                                value={values.description}
                                onChange={handleChange}
                                fullWidth
                                multiline
                                minRows={2}
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
