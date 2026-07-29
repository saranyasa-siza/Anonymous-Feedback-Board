// This file is part of midnightntwrk/example-bboard.
// Copyright (C) Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useState } from 'react';
import {
  AppBar, Box, Button, Chip, Tooltip, CircularProgress,
  Menu, MenuItem, ListItemIcon, ListItemText, Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useWallet } from '../../hooks/useWallet';

export const Header: React.FC = () => {
  const { isConnected, isConnecting, hasWallets, availableWallets, address, connectedWalletName, error, connect, disconnect } = useWallet();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const shortAddress = address ? `${address.slice(0, 10)}...${address.slice(-8)}` : null;

  const handleConnectClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (availableWallets.length === 1) {
      connect(availableWallets[0]);
    } else {
      setAnchorEl(e.currentTarget);
    }
  };

  return (
    <AppBar
      position="static"
      data-testid="header"
      elevation={0}
      sx={{
        background: 'linear-gradient(90deg, #0f0f1a 0%, #1a1a2e 100%)',
        borderBottom: '1px solid rgba(124,58,237,0.25)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 2, md: 6 },
        py: 1.5,
      }}
    >
      {/* Brand */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 36, height: 36, borderRadius: '10px',
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <LockIcon sx={{ fontSize: 18, color: '#fff' }} />
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1, color: '#e2e8f0', letterSpacing: '-0.3px' }}>
            Anonymous Feedback
          </Typography>
          <Typography variant="caption" sx={{ color: '#7c3aed', fontWeight: 500 }}>
            Midnight Network · Preprod
          </Typography>
        </Box>
      </Box>

      {/* Wallet area */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {error && (
          <Tooltip title={error}>
            <Chip label="Error" color="error" size="small" sx={{ fontSize: 11 }} />
          </Tooltip>
        )}
        {isConnected && (
          <Tooltip title={address ?? 'Address unavailable'}>
            <Chip
              label={
                connectedWalletName && shortAddress ? `${connectedWalletName} · ${shortAddress}`
                : shortAddress ? shortAddress
                : connectedWalletName ? `${connectedWalletName} · Connected`
                : 'Connected'
              }
              size="small"
              sx={{
                fontFamily: 'monospace', fontSize: 11,
                background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.4)',
                color: '#c4b5fd',
              }}
            />
          </Tooltip>
        )}
        <Button
          variant={isConnected ? 'outlined' : 'contained'}
          size="small"
          disabled={isConnecting || (!hasWallets && !isConnected)}
          onClick={isConnected ? disconnect : handleConnectClick}
          startIcon={isConnecting ? <CircularProgress size={13} color="inherit" /> : null}
          title={!hasWallets ? 'No Midnight wallet detected. Install Lace or 1AM.' : undefined}
          sx={{
            textTransform: 'none', fontWeight: 600, fontSize: 13,
            ...(isConnected ? {
              borderColor: 'rgba(124,58,237,0.4)', color: '#94a3b8',
              '&:hover': { borderColor: '#7c3aed', color: '#c4b5fd', background: 'rgba(124,58,237,0.08)' },
            } : {}),
          }}
        >
          {isConnecting ? 'Connecting...' : isConnected ? 'Disconnect' : !hasWallets ? 'No Wallet' : 'Connect Wallet'}
        </Button>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          slotProps={{ paper: { sx: { background: '#1a1a2e', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 2, minWidth: 180 } } }}
        >
          <Typography variant="caption" sx={{ px: 2, py: 0.5, display: 'block', color: '#64748b' }}>Select wallet</Typography>
          {availableWallets.map((wallet, i) => (
            <MenuItem key={i} onClick={() => { setAnchorEl(null); connect(wallet); }}
              sx={{ '&:hover': { background: 'rgba(124,58,237,0.15)' } }}
            >
              {wallet.icon && (
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <img src={wallet.icon} alt="" width={20} height={20} style={{ borderRadius: 4 }} />
                </ListItemIcon>
              )}
              <ListItemText primary={wallet.name ?? `Wallet ${i + 1}`} slotProps={{ primary: { style: { fontSize: 14 } } }} />
            </MenuItem>
          ))}
        </Menu>
      </Box>
    </AppBar>
  );
};
