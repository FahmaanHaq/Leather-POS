import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CustomTable from '../../../common/CustomTable';
import PageHeader from '../../../common/PageHeader';
import AddEdit from './AddEdit';
import { getAllContainers, getSuppliers } from '../Services';
import { getGroupIDFromToken } from '../../../common/tokenDecoder';
import { getAllItems } from '../../Items/Services';

export default function Listing() {
    const [containers, setContainers] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showAddEdit, setShowAddEdit] = useState(false);

    const groupId = getGroupIDFromToken();

    const loadContainers = async () => {
        setIsLoading(true);
        const [containersResponse, suppliersResponse, itemsResponse] = await Promise.all([
            getAllContainers(groupId),
            getSuppliers(groupId),
            getAllItems(groupId),
        ]);
        if (containersResponse?.status) setContainers(containersResponse.data ?? []);
        if (suppliersResponse?.status) setSuppliers(suppliersResponse.data ?? []);
        if (itemsResponse?.status) setItems(itemsResponse.data ?? []);
        setIsLoading(false);
    };

    useEffect(() => { loadContainers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const columns = [
        { accessorKey: 'referenceNo', header: 'Reference No' },
        { accessorKey: 'supplierName', header: 'Supplier' },
        { accessorKey: 'receivedDate', header: 'Received Date' },
        { accessorKey: 'lineCount', header: 'Line Items' },
    ];

    return (
        <div>
            <PageHeader
                title="Containers / Stock Intake"
                subtitle="Goods received notes (GRN) - records are immutable once posted"
                actions={
                    <Button
                        variant="contained"
                        startIcon={<AddOutlinedIcon />}
                        onClick={() => setShowAddEdit(true)}
                    >
                        Receive Container
                    </Button>
                }
            />

            <CustomTable data={containers} columns={columns} isLoading={isLoading} hideActions />

            {showAddEdit && (
                <AddEdit
                    groupId={groupId}
                    suppliers={suppliers}
                    items={items}
                    onClose={() => setShowAddEdit(false)}
                    onSaved={() => { setShowAddEdit(false); loadContainers(); }}
                />
            )}
        </div>
    );
}
