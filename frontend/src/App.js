import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CorporateFareOutlinedIcon from '@mui/icons-material/CorporateFareOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';

import Dashboard from './modules/Dashboard';
import Login from './modules/Auth/Login';
import CustomersListing from './modules/Customers/Pages/Listing';
import RolesListing from './modules/Security/Roles/Pages/Listing';
import UsersListing from './modules/Security/Users/Pages/Listing';
import ItemsListing from './modules/Items/Pages/Listing';
import ContainersListing from './modules/Containers/Pages/Listing';
import GroupsListing from './modules/Security/Groups/Pages/Listing';
import PermissionsListing from './modules/Security/Permissions/Pages/Listing';
import ActivityLogListing from './modules/Security/ActivityLog/Pages/Listing';
import { isAuthenticated, logout, getUsernameFromToken, getUserIDFromToken } from './common/tokenDecoder';
import { getEffectivePermissions } from './modules/Security/Permissions/Services';

// RouteKey must match Security.Screens.RouteKey seeded in 07_gap_closure.sql
const NAV = [
  { key: 'dashboard', routeKey: 'dashboard', label: 'Dashboard', icon: DashboardOutlinedIcon, Component: Dashboard },
  { key: 'customers', routeKey: 'customers', label: 'Customers', icon: PeopleAltOutlinedIcon, Component: CustomersListing },
  { key: 'items', routeKey: 'items', label: 'Items', icon: Inventory2OutlinedIcon, Component: ItemsListing },
  { key: 'containers', routeKey: 'containers', label: 'Containers', icon: LocalShippingOutlinedIcon, Component: ContainersListing },
  { key: 'users', routeKey: 'users', label: 'Users', icon: BadgeOutlinedIcon, Component: UsersListing },
  { key: 'roles', routeKey: 'roles', label: 'Roles', icon: AdminPanelSettingsOutlinedIcon, Component: RolesListing },
  { key: 'permissions', routeKey: 'permissions', label: 'Permissions', icon: LockOutlinedIcon, Component: PermissionsListing },
  { key: 'groups', routeKey: 'groups', label: 'Groups', icon: CorporateFareOutlinedIcon, Component: GroupsListing },
  { key: 'activitylog', routeKey: 'activitylog', label: 'Activity Log', icon: HistoryOutlinedIcon, Component: ActivityLogListing },
];

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [activeKey, setActiveKey] = useState('dashboard');
  const [visibleKeys, setVisibleKeys] = useState(null); // null = still loading permissions

  useEffect(() => {
    if (!authed) return;
    const userId = getUserIDFromToken();
    getEffectivePermissions(userId).then((response) => {
      if (response?.status && Array.isArray(response.data) && response.data.length > 0) {
        const allowedRouteKeys = new Set(response.data.map((p) => p.routeKey));
        setVisibleKeys(allowedRouteKeys);
      } else {
        // Fail open rather than lock the user out on a transient error or
        // an empty permission set - an internal tool should never brick itself.
        setVisibleKeys(new Set(NAV.map((n) => n.routeKey)));
      }
    });
  }, [authed]);

  if (!authed) {
    return <Login onAuthenticated={() => setAuthed(true)} />;
  }

  if (visibleKeys === null) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const visibleNav = NAV.filter((n) => visibleKeys.has(n.routeKey));
  const active = visibleNav.find((n) => n.key === activeKey) ?? visibleNav[0] ?? NAV[0];
  const ActiveComponent = active.Component;

  const handleLogout = () => {
    logout();
    setAuthed(false);
    setVisibleKeys(null);
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Masthead */}
      <Box
        sx={{
          backgroundColor: '#4A2E1B',
          color: '#F0E6D8',
          px: 4,
          pt: 2.5,
          pb: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography
            variant="h5"
            sx={{ fontFamily: '"Fraunces", serif', letterSpacing: 0.3 }}
          >
            Leather POS &amp; Accounting
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="body2" sx={{ color: 'rgba(240,230,216,0.85)' }}>
              {getUsernameFromToken()}
            </Typography>
            <Button
              size="small"
              onClick={handleLogout}
              startIcon={<LogoutOutlinedIcon fontSize="small" />}
              sx={{ color: 'rgba(240,230,216,0.85)' }}
            >
              Sign out
            </Button>
          </Box>
        </Box>

        {/* Ledger tab strip - each tab is a trapezoid-ish index tab that sits
            flush with the content area below it when active, like a binder
            divider poking up out of the page. */}
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {visibleNav.map(({ key, label, icon: Icon }) => {
            const isActive = key === active.key;
            return (
              <Box
                key={key}
                onClick={() => setActiveKey(key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveKey(key)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  cursor: 'pointer',
                  px: 2.25,
                  py: 1.1,
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  borderTopLeftRadius: 10,
                  borderTopRightRadius: 10,
                  backgroundColor: isActive ? 'background.default' : 'rgba(240,230,216,0.08)',
                  color: isActive ? 'text.primary' : 'rgba(240,230,216,0.75)',
                  boxShadow: isActive ? '0 -2px 6px rgba(0,0,0,0.12)' : 'none',
                  transform: isActive ? 'translateY(1px)' : 'none',
                  transition: 'background-color 0.15s, color 0.15s',
                  '&:hover': {
                    backgroundColor: isActive ? 'background.default' : 'rgba(240,230,216,0.16)',
                  },
                }}
              >
                <Icon sx={{ fontSize: 18 }} />
                {label}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Content sits flush against the active tab, like the page a ledger
          tab points into. */}
      <Box
        component="main"
        sx={{
          backgroundColor: 'background.default',
          minHeight: 'calc(100vh - 96px)',
          p: 4,
        }}
      >
        <ActiveComponent onNavigate={setActiveKey} />
      </Box>
    </Box>
  );
}
