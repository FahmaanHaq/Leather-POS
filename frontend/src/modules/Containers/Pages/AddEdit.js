import React from 'react';
import { Formik, Form, FieldArray } from 'formik';
import * as Yup from 'yup';
import { saveContainer } from '../Services';
import { getUserIDFromToken } from '../../../common/tokenDecoder';

// FR-ITM-05: container must have at least one line, each with positive quantity
// and non-negative unit cost - mirrors the Inventory.SaveContainer SP guards.
const validationSchema = Yup.object({
    supplierID: Yup.number().required('Supplier is required'),
    referenceNo: Yup.string().trim().required('Reference number is required').max(50),
    receivedDate: Yup.date().required('Received date is required'),
    lines: Yup.array()
        .of(
            Yup.object({
                itemID: Yup.number().required('Item is required'),
                quantity: Yup.number().moreThan(0, 'Quantity must be greater than 0').required('Quantity is required'),
                unitCost: Yup.number().min(0, 'Unit cost cannot be negative').required('Unit cost is required'),
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
        <div className="modal">
            <h3>Receive Container (GRN)</h3>
            <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting, status }) => (
                    <Form>
                        {status && <div className="form-error">{status}</div>}

                        <label>
                            Supplier
                            <select name="supplierID" value={values.supplierID} onChange={handleChange}>
                                {(suppliers ?? []).map((s) => (
                                    <option key={s.supplierID} value={s.supplierID}>{s.name}</option>
                                ))}
                            </select>
                            {touched.supplierID && errors.supplierID && <span className="field-error">{errors.supplierID}</span>}
                        </label>

                        <label>
                            Reference No
                            <input name="referenceNo" value={values.referenceNo} onChange={handleChange} onBlur={handleBlur} />
                            {touched.referenceNo && errors.referenceNo && <span className="field-error">{errors.referenceNo}</span>}
                        </label>

                        <label>
                            Received Date
                            <input type="date" name="receivedDate" value={values.receivedDate} onChange={handleChange} />
                        </label>

                        <FieldArray name="lines">
                            {({ push, remove }) => (
                                <div>
                                    <h4>Stock Lines</h4>
                                    {typeof errors.lines === 'string' && <span className="field-error">{errors.lines}</span>}

                                    {values.lines.map((line, index) => (
                                        <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                                            <select
                                                name={`lines[${index}].itemID`}
                                                value={line.itemID}
                                                onChange={handleChange}
                                            >
                                                {(items ?? []).map((it) => (
                                                    <option key={it.itemID} value={it.itemID}>{it.itemName}</option>
                                                ))}
                                            </select>

                                            <input
                                                type="number"
                                                step="0.001"
                                                placeholder="Quantity"
                                                name={`lines[${index}].quantity`}
                                                value={line.quantity}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                            />
                                            {errors.lines?.[index]?.quantity && touched.lines?.[index]?.quantity && (
                                                <span className="field-error">{errors.lines[index].quantity}</span>
                                            )}

                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="Unit Cost"
                                                name={`lines[${index}].unitCost`}
                                                value={line.unitCost}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                            />
                                            {errors.lines?.[index]?.unitCost && touched.lines?.[index]?.unitCost && (
                                                <span className="field-error">{errors.lines[index].unitCost}</span>
                                            )}

                                            <button type="button" onClick={() => remove(index)} disabled={values.lines.length === 1}>
                                                Remove
                                            </button>
                                        </div>
                                    ))}

                                    <button type="button" onClick={() => push({ itemID: items?.[0]?.itemID ?? '', quantity: '', unitCost: '' })}>
                                        + Add Line
                                    </button>
                                </div>
                            )}
                        </FieldArray>

                        <div className="modal-actions">
                            <button type="button" onClick={onClose}>Cancel</button>
                            <button type="submit" disabled={isSubmitting}>Save Container</button>
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    );
}
