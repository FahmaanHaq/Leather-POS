import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';

/**
 * Every AddEdit / BulkImport screen renders through this instead of a raw
 * <div>. One open dialog at a time, backdrop click closes it, consistent
 * spacing everywhere.
 */
export default function Modal({ title, onClose, maxWidth = 'sm', children }) {
  return (
    <Dialog open onClose={onClose} maxWidth={maxWidth} fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        {title}
        <IconButton onClick={onClose} size="small" aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {children}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
