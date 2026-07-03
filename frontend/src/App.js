import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';

import Dashboard from './modules/Dashboard';
import Login from './modules/Auth/Login';
import CustomersListing from './modules/Customers/Pages/Listing';
import RolesListing from './modules/Security/Roles/Pages/Listing';
import UsersListing from './modules/Security/Users/Pages/Listing';
import ItemsListing from './modules/Items/Pages/Listing';
import ContainersListing from './modules/Containers/Pages/Listing';
import { isAuthenticated, logout, getUsernameFromToken } from './common/tokenDecoder';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: DashboardOutlinedIcon, Component: Dashboard },
  { key: 'customers', label: 'Customers', icon: PeopleAltOutlinedIcon, Component: CustomersListing },
  { key: 'items', label: 'Items', icon: Inventory2OutlinedIcon, Component: ItemsListing },
  { key: 'containers', label: 'Containers', icon: LocalShippingOutlinedIcon, Component: ContainersListing },
  { key: 'users', label: 'Users', icon: BadgeOutlinedIcon, Component: UsersListing },
  { key: 'roles', label: 'Roles', icon: AdminPanelSettingsOutlinedIcon, Component: RolesListing },
];

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [activeKey, setActiveKey] = useState('dashboard');

  if (!authed) {
    return <Login onAuthenticated={() => setAuthed(true)} />;
  }

  const active = NAV.find((n) => n.key === activeKey) ?? NAV[0];
  const ActiveComponent = active.Component;

  const handleLogout = () => {
    logout();
    setAuthed(false);
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
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end' }}>
          {NAV.map(({ key, label, icon: Icon }) => {
            const isActive = key === activeKey;
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
