import React from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
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
        <div className="modal">
            <h3>{isEdit ? 'Edit User' : 'New User'}</h3>
            <Formik
                initialValues={initialValues}
                validationSchema={isEdit ? editSchema : createSchema}
                onSubmit={handleSubmit}
            >
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting, status }) => (
                    <Form>
                        {status && <div className="form-error">{status}</div>}

                        {!isEdit && (
                            <label>
                                Username
                                <input name="username" value={values.username} onChange={handleChange} onBlur={handleBlur} />
                                {touched.username && errors.username && <span className="field-error">{errors.username}</span>}
                            </label>
                        )}

                        <label>
                            Full Name
                            <input name="fullName" value={values.fullName} onChange={handleChange} onBlur={handleBlur} />
                            {touched.fullName && errors.fullName && <span className="field-error">{errors.fullName}</span>}
                        </label>

                        <label>
                            Email
                            <input name="email" value={values.email} onChange={handleChange} onBlur={handleBlur} />
                            {touched.email && errors.email && <span className="field-error">{errors.email}</span>}
                        </label>

                        <label>
                            Role
                            <select name="roleID" value={values.roleID} onChange={handleChange}>
                                {(roles ?? []).map((r) => (
                                    <option key={r.roleID} value={r.roleID}>{r.roleName}</option>
                                ))}
                            </select>
                            {touched.roleID && errors.roleID && <span className="field-error">{errors.roleID}</span>}
                        </label>

                        {!isEdit && (
                            <>
                                <label>
                                    Password
                                    <input type="password" name="password" value={values.password} onChange={handleChange} onBlur={handleBlur} />
                                    {touched.password && errors.password && <span className="field-error">{errors.password}</span>}
                                </label>

                                <label>
                                    Confirm Password
                                    <input type="password" name="confirmPassword" value={values.confirmPassword} onChange={handleChange} onBlur={handleBlur} />
                                    {touched.confirmPassword && errors.confirmPassword && (
                                        <span className="field-error">{errors.confirmPassword}</span>
                                    )}
                                </label>
                            </>
                        )}

                        <div className="modal-actions">
                            <button type="button" onClick={onClose}>Cancel</button>
                            <button type="submit" disabled={isSubmitting}>{isEdit ? 'Update' : 'Save'}</button>
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    );
}
