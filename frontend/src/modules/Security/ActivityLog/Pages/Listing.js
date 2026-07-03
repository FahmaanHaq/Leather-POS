import React, { useEffect, useState } from 'react';
import Chip from '@mui/material/Chip';
import CustomTable from '../../../../common/CustomTable';
import PageHeader from '../../../../common/PageHeader';
import { getActivityLog } from '../Services';
import { getGroupIDFromToken } from '../../../../common/tokenDecoder';

const ACTION_COLORS = {
    Login: 'default',
    PermissionChange: 'warning',
};

export default function Listing() {
    const [entries, setEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const groupId = getGroupIDFromToken();

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            const response = await getActivityLog(groupId);
            if (response?.status) setEntries(response.data ?? []);
            setIsLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const columns = [
        {
            accessorKey: 'createdDate',
            header: 'When',
            Cell: ({ cell }) => new Date(cell.getValue()).toLocaleString(),
        },
        { accessorKey: 'username', header: 'User' },
        {
            accessorKey: 'action',
            header: 'Action',
            Cell: ({ cell }) => (
                <Chip label={cell.getValue()} size="small" color={ACTION_COLORS[cell.getValue()] ?? 'default'} variant="outlined" />
            ),
        },
        { accessorKey: 'entityName', header: 'Entity' },
        { accessorKey: 'afterValue', header: 'Details' },
    ];

    return (
        <div>
            <PageHeader title="Activity Log" subtitle="Audit trail of logins and permission changes" />
            <CustomTable data={entries} columns={columns} isLoading={isLoading} hideActions />
        </div>
    );
}
