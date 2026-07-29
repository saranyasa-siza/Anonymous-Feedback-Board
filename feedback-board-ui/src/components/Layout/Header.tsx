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

import React from 'react';
import { AppBar, Box, Button, Chip, Tooltip, CircularProgress } from '@mui/material';
import { useWallet } from '../../hooks/useWallet';

/**
 * A simple application level header for the bulletin board application.
 */
export const Header: React.FC = () => {
  const { isConnected, isConnecting, walletFound, address, error, connect, disconnect } = useWallet();

  const shortAddress = address ? `${address.slice(0, 8)}...${address.slice(-6)}` : null;

  return (
    <AppBar
      position="static"
      data-testid="header"
      sx={{
        backgroundColor: '#000',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box
        sx={{ display: 'flex', px: 10, py: 2.2, alignItems: 'center' }}
        data-testid="header-logo"
      >
        <img src="/midnight-logo.png" alt="logo-image" height={66} />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 10 }}>
        {error && (
          <Tooltip title={error}>
            <Chip label="Wallet error" color="error" size="small" />
          </Tooltip>
        )}
        {isConnected && shortAddress && (
          <Chip
            label={shortAddress}
            size="small"
            sx={{ color: '#fff', borderColor: '#555', fontFamily: 'monospace' }}
            variant="outlined"
          />
        )}
        <Button
          variant={isConnected ? 'outlined' : 'contained'}
          size="small"
          disabled={isConnecting || !walletFound}
          onClick={isConnected ? disconnect : connect}
          startIcon={isConnecting ? <CircularProgress size={14} color="inherit" /> : null}
          title={!walletFound ? 'Lace wallet not detected. Please install it.' : undefined}
          sx={{
            textTransform: 'none',
            borderColor: isConnected ? '#555' : undefined,
            color: isConnected ? '#aaa' : undefined,
            whiteSpace: 'nowrap',
          }}
        >
          {isConnecting ? 'Connecting...' : isConnected ? 'Disconnect' : !walletFound ? 'No Wallet' : 'Connect Wallet'}
        </Button>
      </Box>
    </AppBar>
  );
};
