import React, { useEffect, useState } from 'react';
import CustomTable from '../../../common/CustomTable';
import AddEdit from './AddEdit';
import { getAllRoles, updateRole } from '../Services';
import { getGroupIDFromToken, getUserIDFromToken } from '../../../common/tokenDecoder';

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
        // FR-GRP/SEC guard: UpdateRole rejects deactivation while active users
        // are assigned (@Result = -2) - surface that message if it comes back.
        const response = await updateRole({ ...role, isActive: !role.isActive, modifiedBy: getUserIDFromToken() });
        if (!response?.status) {
            alert(response?.message ?? 'Unable to update role.');
        }
        loadRoles();
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2>Roles</h2>
                <button onClick={() => { setEditingRole(null); setShowAddEdit(true); }}>+ New Role</button>
            </div>

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
