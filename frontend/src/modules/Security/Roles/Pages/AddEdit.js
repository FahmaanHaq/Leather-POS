import React from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
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
        <div className="modal">
            <h3>{isEdit ? 'Edit Role' : 'New Role'}</h3>
            <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting, status }) => (
                    <Form>
                        {status && <div className="form-error">{status}</div>}

                        <label>
                            Role Name
                            <input name="roleName" value={values.roleName} onChange={handleChange} onBlur={handleBlur} />
                            {touched.roleName && errors.roleName && <span className="field-error">{errors.roleName}</span>}
                        </label>

                        <label>
                            Description
                            <input name="description" value={values.description} onChange={handleChange} onBlur={handleBlur} />
                        </label>

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
