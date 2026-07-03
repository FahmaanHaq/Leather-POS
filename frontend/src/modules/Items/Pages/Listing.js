import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import CustomTable from '../../../common/CustomTable';
import PageHeader from '../../../common/PageHeader';
import AddEdit from './AddEdit';
import BulkImport from './BulkImport';
import { getAllItems, getAllUOM, updateItem } from '../Services';
import { getGroupIDFromToken, getUserIDFromToken } from '../../../common/tokenDecoder';

export default function Listing() {
    const [items, setItems] = useState([]);
    const [uomList, setUomList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [showAddEdit, setShowAddEdit] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);

    const groupId = getGroupIDFromToken();

    const loadItems = async () => {
        setIsLoading(true);
        const [itemsResponse, uomResponse] = await Promise.all([getAllItems(groupId), getAllUOM()]);
        if (itemsResponse?.status) setItems(itemsResponse.data ?? []);
        if (uomResponse?.status) setUomList(uomResponse.data ?? []);
        setIsLoading(false);
    };

    useEffect(() => { loadItems(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const columns = [
        { accessorKey: 'itemCode', header: 'Item Code' },
        { accessorKey: 'itemName', header: 'Item Name' },
        { accessorKey: 'uomCode', header: 'UOM' },
        {
            accessorKey: 'sellingPrice',
            header: 'Selling Price',
            Cell: ({ cell }) => Number(cell.getValue() ?? 0).toFixed(2),
        },
        {
            accessorKey: 'onHandQuantity',
            header: 'On Hand',
            Cell: ({ row }) => {
                const low = row.original.onHandQuantity <= row.original.reorderLevel;
                return (
                    <span style={{ color: low ? '#B3261E' : 'inherit', fontWeight: low ? 600 : 400 }}>
                        {Number(row.original.onHandQuantity).toFixed(3)}
                    </span>
                );
            },
        },
    ];

    const handleToggleActive = async (item) => {
        await updateItem({ ...item, isActive: !item.isActive, modifiedBy: getUserIDFromToken() });
        loadItems();
    };

    return (
        <div>
            <PageHeader
                title="Items"
                subtitle="Product catalogue, pricing, and stock levels"
                actions={
                    <>
                        <Button
                            variant="outlined"
                            startIcon={<UploadFileOutlinedIcon />}
                            onClick={() => setShowBulkImport(true)}
                        >
                            Bulk Import
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<AddOutlinedIcon />}
                            onClick={() => { setEditingItem(null); setShowAddEdit(true); }}
                        >
                            New Item
                        </Button>
                    </>
                }
            />

            <CustomTable
                data={items}
                columns={columns}
                isLoading={isLoading}
                onEdit={(row) => { setEditingItem(row); setShowAddEdit(true); }}
                onToggleActive={handleToggleActive}
            />

            {showAddEdit && (
                <AddEdit
                    item={editingItem}
                    groupId={groupId}
                    uomList={uomList}
                    onClose={() => setShowAddEdit(false)}
                    onSaved={() => { setShowAddEdit(false); loadItems(); }}
                />
            )}

            {showBulkImport && (
                <BulkImport
                    groupId={groupId}
                    onClose={() => setShowBulkImport(false)}
                    onImported={() => { setShowBulkImport(false); loadItems(); }}
                />
            )}
        </div>
    );
}
