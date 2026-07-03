import React from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';

const CARDS = [
  { label: 'Billing', icon: PointOfSaleOutlinedIcon, tab: 'billing', hint: 'Point of sale, hold/resume, returns' },
  { label: 'Customers', icon: PeopleAltOutlinedIcon, tab: 'customers', hint: 'Manage accounts & credit terms' },
  { label: 'Items', icon: Inventory2OutlinedIcon, tab: 'items', hint: 'Stock, pricing & UOM' },
  { label: 'Containers', icon: LocalShippingOutlinedIcon, tab: 'containers', hint: 'Stock intake (GRN)' },
  { label: 'Cheque Register', icon: RequestQuoteOutlinedIcon, tab: 'chequeregister', hint: 'Due-date cheque tracking' },
  { label: 'Users & Roles', icon: BadgeOutlinedIcon, tab: 'users', hint: 'Access & permissions' },
];

export default function Dashboard({ onNavigate }) {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Welcome back</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Pick a module below or from the tabs above.
      </Typography>

      <Grid container spacing={2}>
        {CARDS.map(({ label, icon: Icon, tab, hint }) => (
          <Grid item xs={12} sm={6} md={4} key={tab}>
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
