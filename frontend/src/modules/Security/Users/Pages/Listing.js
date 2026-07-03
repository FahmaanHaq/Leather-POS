import React, { useEffect, useState } from 'react';
import CustomTable from '../../../../common/CustomTable';
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
        { accessorKey: 'roleName', header: 'Role' },
        { accessorKey: 'email', header: 'Email' },
    ];

    const handleToggleActive = async (user) => {
        await updateUser({ ...user, isActive: !user.isActive, modifiedBy: getUserIDFromToken() });
        loadUsers();
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2>Users</h2>
                <button onClick={() => { setEditingUser(null); setShowAddEdit(true); }}>+ New User</button>
            </div>

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
