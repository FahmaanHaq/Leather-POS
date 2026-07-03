import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>{actions}</Box>
    </Box>
  );
}
