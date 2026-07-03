import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import PageHeader from '../../../../common/PageHeader';
import { getAllScreens, getRolePermissions, saveRolePermission } from '../Services';
import { getAllRoles } from '../../Roles/Services';
import { getGroupIDFromToken, getUserIDFromToken } from '../../../../common/tokenDecoder';

const FLAGS = [
    { key: 'canView', label: 'View' },
    { key: 'canAdd', label: 'Add' },
    { key: 'canEdit', label: 'Edit' },
    { key: 'canDelete', label: 'Delete' },
    { key: 'canExport', label: 'Export' },
    { key: 'canApprove', label: 'Approve' },
];

export default function Listing() {
    const [roles, setRoles] = useState([]);
    const [screens, setScreens] = useState([]);
    const [selectedRoleId, setSelectedRoleId] = useState('');
    const [matrix, setMatrix] = useState({}); // { [screenId]: { canView, canAdd, ... } }
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const groupId = getGroupIDFromToken();

    useEffect(() => {
        (async () => {
            const [rolesRes, screensRes] = await Promise.all([getAllRoles(groupId), getAllScreens()]);
            if (rolesRes?.status) {
                setRoles(rolesRes.data ?? []);
                if (rolesRes.data?.length) setSelectedRoleId(rolesRes.data[0].roleID);
            }
            if (screensRes?.status) setScreens(screensRes.data ?? []);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!selectedRoleId || screens.length === 0) return;
        loadMatrix();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRoleId, screens]);

    const loadMatrix = async () => {
        setIsLoading(true);
        setMessage(null);
        const response = await getRolePermissions(selectedRoleId);
        const existing = response?.status ? response.data ?? [] : [];

        const next = {};
        for (const screen of screens) {
            const found = existing.find((e) => e.screenID === screen.screenID);
            next[screen.screenID] = found
                ? FLAGS.reduce((acc, f) => ({ ...acc, [f.key]: !!found[f.key] }), {})
                : FLAGS.reduce((acc, f) => ({ ...acc, [f.key]: false }), {});
        }
        setMatrix(next);
        setIsLoading(false);
    };

    const toggleFlag = (screenId, flagKey) => {
        setMatrix((prev) => ({
            ...prev,
            [screenId]: { ...prev[screenId], [flagKey]: !prev[screenId]?.[flagKey] },
        }));
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        setMessage(null);
        const userId = getUserIDFromToken();

        const results = await Promise.all(
            screens.map((screen) =>
                saveRolePermission({
                    groupID: groupId,
                    roleID: selectedRoleId,
                    screenID: screen.screenID,
                    ...matrix[screen.screenID],
                    createdBy: userId,
                })
            )
        );

        setIsSaving(false);
        const failed = results.filter((r) => !r?.status);
        setMessage(
            failed.length === 0
                ? { severity: 'success', text: 'Permissions saved successfully.' }
                : { severity: 'error', text: `${failed.length} screen(s) failed to save.` }
        );
    };

    return (
        <div>
            <PageHeader
                title="Permissions"
                subtitle="Control what each role can see and do, screen by screen"
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <TextField
                    select
                    label="Role"
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    sx={{ minWidth: 240 }}
                    size="small"
                >
                    {roles.map((r) => (
                        <MenuItem key={r.roleID} value={r.roleID}>{r.roleName}</MenuItem>
                    ))}
                </TextField>

                <Button variant="contained" onClick={handleSaveAll} disabled={isSaving || isLoading}>
                    {isSaving ? 'Saving...' : 'Save Permissions'}
                </Button>
            </Box>

            {message && <Alert severity={message.severity} sx={{ mb: 2 }}>{message.text}</Alert>}

            <Paper variant="outlined">
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress size={28} />
                    </Box>
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Screen</TableCell>
                                {FLAGS.map((f) => (
                                    <TableCell key={f.key} align="center">{f.label}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {screens.map((screen) => (
                                <TableRow key={screen.screenID} hover>
                                    <TableCell>{screen.screenName}</TableCell>
                                    {FLAGS.map((f) => (
                                        <TableCell key={f.key} align="center">
                                            <Checkbox
                                                size="small"
                                                checked={!!matrix[screen.screenID]?.[f.key]}
                                                onChange={() => toggleFlag(screen.screenID, f.key)}
                                            />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Paper>
        </div>
    );
}
