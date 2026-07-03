import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CustomTable from '../../../../common/CustomTable';
import PageHeader from '../../../../common/PageHeader';
import AddEdit from './AddEdit';
import { getAllUsers, updateUser } from '../Services';
import { getAllRoles } from '../../Roles/Services';
import { getGroupIDFromToken, getUserIDFromToken } from '../../../../common/tokenDecoder';

export default function Listing() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [showAddEdit, setShowAddEdit] = useState(false);

    const groupId = getGroupIDFromToken();

    const loadUsers = async () => {
        setIsLoading(true);
        const [usersResponse, rolesResponse] = await Promise.all([
            getAllUsers(groupId),
            getAllRoles(groupId),
        ]);
        if (usersResponse?.status) setUsers(usersResponse.data ?? []);
        if (rolesResponse?.status) setRoles(rolesResponse.data ?? []);
        setIsLoading(false);
    };

    useEffect(() => { loadUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const columns = [
        { accessorKey: 'username', header: 'Username' },
        { accessorKey: 'fullName', header: 'Full Name' },
        {
            accessorKey: 'roleName',
            header: 'Role',
            Cell: ({ cell }) => <Chip label={cell.getValue()} size="small" variant="outlined" />,
        },
        { accessorKey: 'email', header: 'Email' },
    ];

    const handleToggleActive = async (user) => {
        await updateUser({ ...user, isActive: !user.isActive, modifiedBy: getUserIDFromToken() });
        loadUsers();
    };

    return (
        <div>
            <PageHeader
                title="Users"
                subtitle="Manage user accounts and role assignments"
                actions={
                    <Button
                        variant="contained"
                        startIcon={<AddOutlinedIcon />}
                        onClick={() => { setEditingUser(null); setShowAddEdit(true); }}
                    >
                        New User
                    </Button>
                }
            />

            <CustomTable
                data={users}
                columns={columns}
                isLoading={isLoading}
                onEdit={(row) => { setEditingUser(row); setShowAddEdit(true); }}
                onToggleActive={handleToggleActive}
            />

            {showAddEdit && (
                <AddEdit
                    user={editingUser}
                    groupId={groupId}
                    roles={roles}
                    onClose={() => setShowAddEdit(false)}
                    onSaved={() => { setShowAddEdit(false); loadUsers(); }}
                />
            )}
        </div>
    );
}
