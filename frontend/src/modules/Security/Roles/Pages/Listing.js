import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CustomTable from '../../../../common/CustomTable';
import PageHeader from '../../../../common/PageHeader';
import AddEdit from './AddEdit';
import { getAllRoles, updateRole } from '../Services';
import { getGroupIDFromToken, getUserIDFromToken } from '../../../../common/tokenDecoder';

export default function Listing() {
    const [roles, setRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [showAddEdit, setShowAddEdit] = useState(false);

    const groupId = getGroupIDFromToken();

    const loadRoles = async () => {
        setIsLoading(true);
        const response = await getAllRoles(groupId);
        if (response?.status) setRoles(response.data ?? []);
        setIsLoading(false);
    };

    useEffect(() => { loadRoles(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const columns = [
        { accessorKey: 'roleName', header: 'Role Name' },
        { accessorKey: 'description', header: 'Description' },
    ];

    const handleToggleActive = async (role) => {
        const response = await updateRole({ ...role, isActive: !role.isActive, modifiedBy: getUserIDFromToken() });
        if (!response?.status) alert(response?.message ?? 'Unable to update role.');
        loadRoles();
    };

    return (
        <div>
            <PageHeader
                title="Roles"
                subtitle="Define role-based permission templates"
                actions={
                    <Button
                        variant="contained"
                        startIcon={<AddOutlinedIcon />}
                        onClick={() => { setEditingRole(null); setShowAddEdit(true); }}
                    >
                        New Role
                    </Button>
                }
            />

            <CustomTable
                data={roles}
                columns={columns}
                isLoading={isLoading}
                onEdit={(row) => { setEditingRole(row); setShowAddEdit(true); }}
                onToggleActive={handleToggleActive}
            />

            {showAddEdit && (
                <AddEdit
                    role={editingRole}
                    groupId={groupId}
                    onClose={() => setShowAddEdit(false)}
                    onSaved={() => { setShowAddEdit(false); loadRoles(); }}
                />
            )}
        </div>
    );
}
