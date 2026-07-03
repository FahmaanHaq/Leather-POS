import React, { useEffect, useState } from 'react';
import CustomTable from '../../../common/CustomTable';
import AddEdit from './AddEdit';
import { getAllCustomers, updateCustomer } from '../Services';
import { getGroupIDFromToken } from '../../../common/tokenDecoder';

export default function Listing() {
    const [customers, setCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [showAddEdit, setShowAddEdit] = useState(false);

    const groupId = getGroupIDFromToken();

    const loadCustomers = async () => {
        setIsLoading(true);
        const response = await getAllCustomers(groupId);
        if (response?.status) setCustomers(response.data ?? []);
        setIsLoading(false);
    };

    useEffect(() => {
        loadCustomers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const columns = [
        { accessorKey: 'name', header: 'Name' },
        { accessorKey: 'phone', header: 'Phone' },
        {
            accessorKey: 'customerType',
            header: 'Type',
            Cell: ({ cell }) => (cell.getValue() === 1 ? 'Regular' : 'Walk-in'),
        },
        { accessorKey: 'creditLimit', header: 'Credit Limit' },
        {
            accessorKey: 'outstandingBalance',
            header: 'Outstanding Balance',
            // FR-CUS-03: surfaced prominently, same field the Billing screen will read
            Cell: ({ cell }) => (
                <span style={{ color: cell.getValue() > 0 ? '#b00020' : 'inherit', fontWeight: 600 }}>
                    {Number(cell.getValue() ?? 0).toFixed(2)}
                </span>
            ),
        },
    ];

    const handleToggleActive = async (customer) => {
        await updateCustomer({ ...customer, isActive: !customer.isActive, modifiedBy: getGroupIDFromToken() });
        loadCustomers();
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2>Customers</h2>
                <button onClick={() => { setEditingCustomer(null); setShowAddEdit(true); }}>
                    + New Customer
                </button>
            </div>

            <CustomTable
                data={customers}
                columns={columns}
                isLoading={isLoading}
                onEdit={(row) => { setEditingCustomer(row); setShowAddEdit(true); }}
                onToggleActive={handleToggleActive}
            />

            {showAddEdit && (
                <AddEdit
                    customer={editingCustomer}
                    groupId={groupId}
                    onClose={() => setShowAddEdit(false)}
                    onSaved={() => { setShowAddEdit(false); loadCustomers(); }}
                />
            )}
        </div>
    );
}
