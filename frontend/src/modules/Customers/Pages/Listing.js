import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CustomTable from '../../../common/CustomTable';
import PageHeader from '../../../common/PageHeader';
import AddEdit from './AddEdit';
import { getAllCustomers, updateCustomer } from '../Services';
import { getGroupIDFromToken, getUserIDFromToken } from '../../../common/tokenDecoder';

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
            Cell: ({ cell }) => (
                <Chip
                    label={cell.getValue() === 1 ? 'Regular' : 'Walk-in'}
                    size="small"
                    color={cell.getValue() === 1 ? 'primary' : 'default'}
                    variant="outlined"
                />
            ),
        },
        {
            accessorKey: 'creditLimit',
            header: 'Credit Limit',
            Cell: ({ cell }) => (cell.getValue() != null ? Number(cell.getValue()).toFixed(2) : '—'),
        },
        {
            accessorKey: 'outstandingBalance',
            header: 'Outstanding Balance',
            Cell: ({ cell }) => (
                <span style={{ color: cell.getValue() > 0 ? '#B3261E' : 'inherit', fontWeight: 600 }}>
                    {Number(cell.getValue() ?? 0).toFixed(2)}
                </span>
            ),
        },
    ];

    const handleToggleActive = async (customer) => {
        await updateCustomer({ ...customer, isActive: !customer.isActive, modifiedBy: getUserIDFromToken() });
        loadCustomers();
    };

    return (
        <div>
            <PageHeader
                title="Customers"
                subtitle="Manage customer accounts, credit terms, and balances"
                actions={
                    <Button
                        variant="contained"
                        startIcon={<AddOutlinedIcon />}
                        onClick={() => { setEditingCustomer(null); setShowAddEdit(true); }}
                    >
                        New Customer
                    </Button>
                }
            />

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
