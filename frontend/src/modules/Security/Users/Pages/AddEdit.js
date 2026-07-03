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
import Modal from '../../../../common/Modal';
import { saveUser, updateUser } from '../Services';
import { getUserIDFromToken } from '../../../../common/tokenDecoder';

const createSchema = Yup.object({
    roleID: Yup.number().required('Role is required'),
    username: Yup.string().trim().required('Username is required').max(100),
    email: Yup.string().nullable().email('Enter a valid email address'),
    fullName: Yup.string().trim().required('Full name is required').max(150),
    password: Yup.string().required('Password is required').min(8, 'Password must be at least 8 characters'),
    confirmPassword: Yup.string()
        .required('Please confirm the password')
        .oneOf([Yup.ref('password')], 'Passwords do not match'),
});

const editSchema = Yup.object({
    roleID: Yup.number().required('Role is required'),
    email: Yup.string().nullable().email('Enter a valid email address'),
    fullName: Yup.string().trim().required('Full name is required').max(150),
});

export default function AddEdit({ user, groupId, roles, onClose, onSaved }) {
    const isEdit = !!user;

    const initialValues = {
        roleID: user?.roleID ?? (roles?.[0]?.roleID ?? ''),
        username: user?.username ?? '',
        email: user?.email ?? '',
        fullName: user?.fullName ?? '',
        password: '',
        confirmPassword: '',
        isActive: user?.isActive ?? true,
    };

    const handleSubmit = async (values, { setSubmitting, setStatus }) => {
        const modifierId = getUserIDFromToken();
        const response = isEdit
            ? await updateUser({
                  userID: user.userID,
                  roleID: values.roleID,
                  email: values.email || null,
                  fullName: values.fullName,
                  isActive: values.isActive,
                  modifiedBy: modifierId,
              })
            : await saveUser({
                  groupID: groupId,
                  roleID: values.roleID,
                  username: values.username,
                  email: values.email || null,
                  password: values.password,
                  fullName: values.fullName,
                  createdBy: modifierId,
              });

        setSubmitting(false);
        if (response?.status) onSaved?.();
        else setStatus(response?.message ?? 'Something went wrong while saving the user.');
    };

    return (
        <Modal title={isEdit ? 'Edit User' : 'New User'} onClose={onClose}>
            <Formik
                initialValues={initialValues}
                validationSchema={isEdit ? editSchema : createSchema}
                onSubmit={handleSubmit}
            >
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting, status }) => (
                    <Form>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {status && <Alert severity="error">{status}</Alert>}

                            {!isEdit && (
                                <TextField
                                    label="Username"
                                    name="username"
                                    value={values.username}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={touched.username && !!errors.username}
                                    helperText={touched.username && errors.username}
                                    fullWidth
                                />
                            )}

                            <TextField
                                label="Full Name"
                                name="fullName"
                                value={values.fullName}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                error={touched.fullName && !!errors.fullName}
                                helperText={touched.fullName && errors.fullName}
                                fullWidth
                            />

                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Email"
                                        name="email"
                                        value={values.email}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        error={touched.email && !!errors.email}
                                        helperText={touched.email && errors.email}
                                        fullWidth
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        select
                                        label="Role"
                                        name="roleID"
                                        value={values.roleID}
                                        onChange={handleChange}
                                        error={touched.roleID && !!errors.roleID}
                                        helperText={touched.roleID && errors.roleID}
                                        fullWidth
                                    >
                                        {(roles ?? []).map((r) => (
                                            <MenuItem key={r.roleID} value={r.roleID}>{r.roleName}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                            </Grid>

                            {!isEdit && (
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            type="password"
                                            label="Password"
                                            name="password"
                                            value={values.password}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={touched.password && !!errors.password}
                                            helperText={touched.password && errors.password}
                                            fullWidth
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            type="password"
                                            label="Confirm Password"
                                            name="confirmPassword"
                                            value={values.confirmPassword}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={touched.confirmPassword && !!errors.confirmPassword}
                                            helperText={touched.confirmPassword && errors.confirmPassword}
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
