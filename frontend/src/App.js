import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';

import Dashboard from './modules/Dashboard';
import CustomersListing from './modules/Customers/Pages/Listing';
import RolesListing from './modules/Security/Roles/Pages/Listing';
import UsersListing from './modules/Security/Users/Pages/Listing';
import ItemsListing from './modules/Items/Pages/Listing';
import ContainersListing from './modules/Containers/Pages/Listing';

const DRAWER_WIDTH = 240;

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: DashboardOutlinedIcon, Component: Dashboard },
  { key: 'customers', label: 'Customers', icon: PeopleAltOutlinedIcon, Component: CustomersListing },
  { key: 'items', label: 'Items', icon: Inventory2OutlinedIcon, Component: ItemsListing },
  { key: 'containers', label: 'Containers', icon: LocalShippingOutlinedIcon, Component: ContainersListing },
  { key: 'users', label: 'Users', icon: BadgeOutlinedIcon, Component: UsersListing },
  { key: 'roles', label: 'Roles', icon: AdminPanelSettingsOutlinedIcon, Component: RolesListing },
];

export default function App() {
  const [activeKey, setActiveKey] = useState('dashboard');
  const active = NAV.find((n) => n.key === activeKey) ?? NAV[0];
  const ActiveComponent = active.Component;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar sx={{ px: 3 }}>
          <Typography variant="h6" sx={{ fontFamily: '"Fraunces", serif', letterSpacing: 0.3 }}>
            Leather POS
          </Typography>
        </Toolbar>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
        <List sx={{ px: 1.5, py: 2 }}>
          {NAV.map(({ key, label, icon: Icon }) => {
            const isActive = key === activeKey;
            return (
              <ListItemButton
                key={key}
                selected={isActive}
                onClick={() => setActiveKey(key)}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.5,
                  color: isActive ? '#FFF8F0' : 'rgba(240,230,216,0.75)',
                  '&.Mui-selected': { backgroundColor: 'rgba(176,141,87,0.25)' },
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={label} primaryTypographyProps={{ fontSize: 14, fontWeight: isActive ? 600 : 500 }} />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{ borderBottom: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}
        >
          <Toolbar>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>{active.label}</Typography>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: 'background.default' }}>
          <ActiveComponent onNavigate={setActiveKey} />
        </Box>
      </Box>
    </Box>
  );
}
