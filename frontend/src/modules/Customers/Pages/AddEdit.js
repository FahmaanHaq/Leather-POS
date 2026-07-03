import React from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { saveCustomer, updateCustomer } from '../Services';
import { getUserIDFromToken } from '../../../common/tokenDecoder';

// FR-CUS-01/02/05: Regular customers may optionally carry credit terms;
// Walk-in customers must not.
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

        // Walk-in customers never carry credit terms, even if the field was
        // populated before switching CustomerType in the form.
        const creditLimit = values.customerType === 2 ? null : (values.creditLimit === '' ? null : values.creditLimit);
        const creditDays = values.customerType === 2 ? null : (values.creditDays === '' ? null : values.creditDays);

        const response = isEdit
            ? await updateCustomer({
                  customerID: customer.customerID,
                  name: values.name,
                  phone: values.phone || null,
                  address: values.address || null,
                  creditLimit,
                  creditDays,
                  isActive: values.isActive,
                  modifiedBy: userId,
              })
            : await saveCustomer({
                  groupID: groupId,
                  customerType: values.customerType,
                  name: values.name,
                  phone: values.phone || null,
                  address: values.address || null,
                  creditLimit,
                  creditDays,
                  createdBy: userId,
              });

        setSubmitting(false);

        if (response?.status) {
            onSaved?.();
        } else {
            setStatus(response?.message ?? 'Something went wrong while saving the customer.');
        }
    };

    return (
        <div className="modal">
            <h3>{isEdit ? 'Edit Customer' : 'New Customer'}</h3>
            <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting, status }) => (
                    <Form>
                        {status && <div className="form-error">{status}</div>}

                        <label>
                            Customer Type
                            <select name="customerType" value={values.customerType} onChange={handleChange} disabled={isEdit}>
                                <option value={1}>Regular (Credit-allowed)</option>
                                <option value={2}>Walk-in</option>
                            </select>
                        </label>

                        <label>
                            Name
                            <input name="name" value={values.name} onChange={handleChange} onBlur={handleBlur} />
                            {touched.name && errors.name && <span className="field-error">{errors.name}</span>}
                        </label>

                        <label>
                            Phone
                            <input name="phone" value={values.phone} onChange={handleChange} onBlur={handleBlur} />
                            {touched.phone && errors.phone && <span className="field-error">{errors.phone}</span>}
                        </label>

                        <label>
                            Address
                            <input name="address" value={values.address} onChange={handleChange} onBlur={handleBlur} />
                        </label>

                        {values.customerType === 1 && (
                            <>
                                <label>
                                    Credit Limit
                                    <input
                                        type="number"
                                        name="creditLimit"
                                        value={values.creditLimit}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    />
                                    {touched.creditLimit && errors.creditLimit && (
                                        <span className="field-error">{errors.creditLimit}</span>
                                    )}
                                </label>

                                <label>
                                    Credit Days
                                    <input
                                        type="number"
                                        name="creditDays"
                                        value={values.creditDays}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                    />
                                    {touched.creditDays && errors.creditDays && (
                                        <span className="field-error">{errors.creditDays}</span>
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
