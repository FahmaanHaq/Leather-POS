import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { validateImportBatch, saveItem } from '../Services';
import { getUserIDFromToken } from '../../../common/tokenDecoder';

export default function BulkImport({ groupId, onClose, onImported }) {
    const [rows, setRows] = useState([]);
    const [validated, setValidated] = useState(null);
    const [isBusy, setIsBusy] = useState(false);

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const parsed = XLSX.utils.sheet_to_json(sheet);

        const mapped = parsed.map((r, i) => ({
            rowNumber: i + 1,
            itemCode: r.ItemCode?.toString().trim(),
            itemName: r.ItemName?.toString().trim(),
            uomCode: r.UOM?.toString().trim(),
            costPrice: Number(r.CostPrice ?? 0),
            sellingPrice: Number(r.SellingPrice ?? 0),
        }));

        setRows(mapped);
        setValidated(null);
    };

    const handleValidate = async () => {
        setIsBusy(true);
        const response = await validateImportBatch(groupId, rows);
        setIsBusy(false);
        if (response?.status) setValidated(response.data);
    };

    const handleCommit = async () => {
        if (!validated || validated.errorCount > 0) return;
        setIsBusy(true);
        const userId = getUserIDFromToken();

        for (const row of validated.rows) {
            await saveItem({
                groupID: groupId,
                itemCode: row.itemCode,
                itemName: row.itemName,
                baseUOMID: row.baseUOMID, // resolved server-side from uomCode in a real mapping step
                costPrice: row.costPrice,
                sellingPrice: row.sellingPrice,
                createdBy: userId,
            });
        }

        setIsBusy(false);
        onImported?.();
    };

    return (
        <div className="modal">
            <h3>Bulk Import Items</h3>
            <p>Upload an Excel file with columns: ItemCode, ItemName, UOM, CostPrice, SellingPrice</p>

            <input type="file" accept=".xlsx,.xls" onChange={handleFile} />

            {rows.length > 0 && (
                <>
                    <button onClick={handleValidate} disabled={isBusy}>Validate {rows.length} rows</button>

                    {validated && (
                        <table>
                            <thead>
                                <tr><th>Row</th><th>Item Code</th><th>Item Name</th><th>UOM</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                {validated.rows.map((r) => (
                                    <tr key={r.rowNumber} style={{ background: r.isValid ? 'transparent' : '#fdecea' }}>
                                        <td>{r.rowNumber}</td>
                                        <td>{r.itemCode}</td>
                                        <td>{r.itemName}</td>
                                        <td>{r.uomCode}</td>
                                        <td>{r.isValid ? 'OK' : r.errorMessage}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </>
            )}

            <div className="modal-actions">
                <button type="button" onClick={onClose}>Cancel</button>
                <button
                    type="button"
                    disabled={!validated || validated.errorCount > 0 || isBusy}
                    onClick={handleCommit}
                >
                    Commit {validated?.validCount ?? 0} Items
                </button>
            </div>
        </div>
    );
}
