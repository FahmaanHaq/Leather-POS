import React from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { saveItem, updateItem } from '../Services';
import { getUserIDFromToken } from '../../../common/tokenDecoder';

// FR-ITM-01/03/04: prices are DECIMAL(18,2), quantities/reorder levels DECIMAL(18,3)
// to correctly support fractional UOM sales (e.g. 2.5 m of hide).
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
        .test('decimal-places', 'Cost price supports up to 2 decimal places', decimalPlaces(2)),
    sellingPrice: Yup.number()
        .required('Selling price is required')
        .min(0, 'Selling price cannot be negative')
        .test('decimal-places', 'Selling price supports up to 2 decimal places', decimalPlaces(2)),
    reorderLevel: Yup.number()
        .min(0, 'Reorder level cannot be negative')
        .test('decimal-places', 'Reorder level supports up to 3 decimal places', decimalPlaces(3)),
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
        <div className="modal">
            <h3>{isEdit ? 'Edit Item' : 'New Item'}</h3>
            <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting, status }) => (
                    <Form>
                        {status && <div className="form-error">{status}</div>}

                        <label>
                            Item Code
                            <input name="itemCode" value={values.itemCode} onChange={handleChange} onBlur={handleBlur} disabled={isEdit} />
                            {touched.itemCode && errors.itemCode && <span className="field-error">{errors.itemCode}</span>}
                        </label>

                        <label>
                            Item Name
                            <input name="itemName" value={values.itemName} onChange={handleChange} onBlur={handleBlur} />
                            {touched.itemName && errors.itemName && <span className="field-error">{errors.itemName}</span>}
                        </label>

                        <label>
                            Unit of Measurement
                            <select name="baseUOMID" value={values.baseUOMID} onChange={handleChange} disabled={isEdit}>
                                {(uomList ?? []).map((u) => (
                                    <option key={u.uomid} value={u.uomid}>{u.uomname} ({u.uomcode})</option>
                                ))}
                            </select>
                            {touched.baseUOMID && errors.baseUOMID && <span className="field-error">{errors.baseUOMID}</span>}
                        </label>

                        <label>
                            Cost Price
                            <input type="number" step="0.01" name="costPrice" value={values.costPrice} onChange={handleChange} onBlur={handleBlur} />
                            {touched.costPrice && errors.costPrice && <span className="field-error">{errors.costPrice}</span>}
                        </label>

                        <label>
                            Selling Price
                            <input type="number" step="0.01" name="sellingPrice" value={values.sellingPrice} onChange={handleChange} onBlur={handleBlur} />
                            {touched.sellingPrice && errors.sellingPrice && <span className="field-error">{errors.sellingPrice}</span>}
                        </label>

                        <label>
                            Reorder Level
                            <input type="number" step="0.001" name="reorderLevel" value={values.reorderLevel} onChange={handleChange} onBlur={handleBlur} />
                            {touched.reorderLevel && errors.reorderLevel && <span className="field-error">{errors.reorderLevel}</span>}
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
