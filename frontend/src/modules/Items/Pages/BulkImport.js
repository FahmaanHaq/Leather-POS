import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Chip from '@mui/material/Chip';
import DialogActions from '@mui/material/DialogActions';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import Modal from '../../../common/Modal';
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
                baseUOMID: row.baseUOMID,
                costPrice: row.costPrice,
                sellingPrice: row.sellingPrice,
                createdBy: userId,
            });
        }

        setIsBusy(false);
        onImported?.();
    };

    return (
        <Modal title="Bulk Import Items" onClose={onClose} maxWidth="md">
            <Typography variant="body2" color="text.secondary">
                Upload an Excel file with columns: ItemCode, ItemName, UOM, CostPrice, SellingPrice
            </Typography>

            <Button
                variant="outlined"
                component="label"
                startIcon={<UploadFileOutlinedIcon />}
                sx={{ alignSelf: 'flex-start' }}
            >
                Choose File
                <input type="file" hidden accept=".xlsx,.xls" onChange={handleFile} />
            </Button>

            {rows.length > 0 && (
                <>
                    <Button variant="outlined" onClick={handleValidate} disabled={isBusy} sx={{ alignSelf: 'flex-start' }}>
                        Validate {rows.length} rows
                    </Button>

                    {validated && (
                        <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Row</TableCell>
                                        <TableCell>Item Code</TableCell>
                                        <TableCell>Item Name</TableCell>
                                        <TableCell>UOM</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {validated.rows.map((r) => (
                                        <TableRow key={r.rowNumber} sx={{ backgroundColor: r.isValid ? 'transparent' : 'rgba(179,38,30,0.06)' }}>
                                            <TableCell>{r.rowNumber}</TableCell>
                                            <TableCell>{r.itemCode}</TableCell>
                                            <TableCell>{r.itemName}</TableCell>
                                            <TableCell>{r.uomCode}</TableCell>
                                            <TableCell>
                                                {r.isValid
                                                    ? <Chip label="OK" size="small" color="success" variant="outlined" />
                                                    : <Chip label={r.errorMessage} size="small" color="error" variant="outlined" />}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    )}
                </>
            )}

            <DialogActions sx={{ px: 0, pt: 1 }}>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button
                    variant="contained"
                    disabled={!validated || validated.errorCount > 0 || isBusy}
                    onClick={handleCommit}
                >
                    Commit {validated?.validCount ?? 0} Items
                </Button>
            </DialogActions>
        </Modal>
    );
}
