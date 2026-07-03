import React, { useEffect, useState } from 'react';
import CustomTable from '../../common/CustomTable';
import AddEdit from './Pages/AddEdit';
import { getAllContainers, getSuppliers } from '../Services';
import { getGroupIDFromToken } from '../../common/tokenDecoder';
import { getAllItems } from '../Items/Services';

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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2>Containers / Stock Intake (GRN)</h2>
                <button onClick={() => setShowAddEdit(true)}>+ Receive New Container</button>
            </div>

            {/* GRN records are immutable once posted - no edit action, only view/new (FR-ITM-05) */}
            <CustomTable data={containers} columns={columns} isLoading={isLoading} onEdit={() => {}} onToggleActive={() => {}} />

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
