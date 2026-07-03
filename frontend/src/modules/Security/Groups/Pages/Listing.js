import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CustomTable from '../../../../common/CustomTable';
import PageHeader from '../../../../common/PageHeader';
import AddEdit from './AddEdit';
import { getAllGroups, updateGroup } from '../Services';

export default function Listing() {
    const [groups, setGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [showAddEdit, setShowAddEdit] = useState(false);

    const loadGroups = async () => {
        setIsLoading(true);
        const response = await getAllGroups();
        if (response?.status) setGroups(response.data ?? []);
        setIsLoading(false);
    };

    useEffect(() => { loadGroups(); }, []);

    const columns = [
        { accessorKey: 'groupName', header: 'Group Name' },
    ];

    const handleToggleActive = async (group) => {
        const response = await updateGroup({ ...group, isActive: !group.isActive });
        if (!response?.status) alert(response?.message ?? 'Unable to update group.');
        loadGroups();
    };

    return (
        <div>
            <PageHeader
                title="Groups"
                subtitle="Top-level organizational groups (e.g. branches or companies)"
                actions={
                    <Button
                        variant="contained"
                        startIcon={<AddOutlinedIcon />}
                        onClick={() => { setEditingGroup(null); setShowAddEdit(true); }}
                    >
                        New Group
                    </Button>
                }
            />

            <CustomTable
                data={groups}
                columns={columns}
                isLoading={isLoading}
                onEdit={(row) => { setEditingGroup(row); setShowAddEdit(true); }}
                onToggleActive={handleToggleActive}
            />

            {showAddEdit && (
                <AddEdit
                    group={editingGroup}
                    onClose={() => setShowAddEdit(false)}
                    onSaved={() => { setShowAddEdit(false); loadGroups(); }}
                />
            )}
        </div>
    );
}
