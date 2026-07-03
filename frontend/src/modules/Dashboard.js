import React from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';

const CARDS = [
  { label: 'Customers', icon: PeopleAltOutlinedIcon, tab: 'customers', hint: 'Manage accounts & credit terms' },
  { label: 'Items', icon: Inventory2OutlinedIcon, tab: 'items', hint: 'Stock, pricing & UOM' },
  { label: 'Containers', icon: LocalShippingOutlinedIcon, tab: 'containers', hint: 'Stock intake (GRN)' },
  { label: 'Users & Roles', icon: BadgeOutlinedIcon, tab: 'users', hint: 'Access & permissions' },
];

export default function Dashboard({ onNavigate }) {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Welcome back</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Phase 1 modules are ready. Pick a module below or from the sidebar.
      </Typography>

      <Grid container spacing={2}>
        {CARDS.map(({ label, icon: Icon, tab, hint }) => (
          <Grid item xs={12} sm={6} md={3} key={tab}>
            <Paper
              variant="outlined"
              onClick={() => onNavigate(tab)}
              sx={{
                p: 2.5,
                cursor: 'pointer',
                transition: 'box-shadow 0.15s, transform 0.15s',
                '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' },
              }}
            >
              <Icon sx={{ fontSize: 28, color: 'primary.main', mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600}>{label}</Typography>
              <Typography variant="body2" color="text.secondary">{hint}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
