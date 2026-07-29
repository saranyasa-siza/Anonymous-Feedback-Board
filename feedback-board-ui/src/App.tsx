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

import React, { useEffect, useState } from 'react';
import { Box, Typography, Chip, Divider } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import { MainLayout, Board } from './components';
import { useDeployedBoardContext } from './hooks';
import { type BoardDeployment } from './contexts';
import { type Observable } from 'rxjs';

const App: React.FC = () => {
  const boardApiProvider = useDeployedBoardContext();
  const [boardDeployments, setBoardDeployments] = useState<Array<Observable<BoardDeployment>>>([]);

  useEffect(() => {
    const subscription = boardApiProvider.boardDeployments$.subscribe(setBoardDeployments);
    return () => subscription.unsubscribe();
  }, [boardApiProvider]);

  return (
    <Box sx={{ background: 'linear-gradient(160deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)', minHeight: '100vh' }}>
      <MainLayout>
        {/* Hero */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={<ShieldIcon sx={{ fontSize: 14 }} />}
              label="Zero-Knowledge Proofs"
              size="small"
              sx={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#c4b5fd', fontSize: 11 }}
            />
            <Chip
              label="Anonymous"
              size="small"
              sx={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', color: '#67e8f9', fontSize: 11 }}
            />
            <Chip
              label="On-Chain"
              size="small"
              sx={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7', fontSize: 11 }}
            />
          </Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, mb: 1.5, background: 'linear-gradient(135deg, #e2e8f0, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Anonymous Feedback Board
          </Typography>
          <Typography variant="body1" sx={{ color: '#94a3b8', maxWidth: 520, mx: 'auto', lineHeight: 1.7 }}>
            Submit feedback anonymously using zero-knowledge proofs on the Midnight Network.
            Only you can remove your own submission — without ever revealing your identity.
          </Typography>
        </Box>

        <Divider sx={{ borderColor: 'rgba(124,58,237,0.15)', mb: 5 }} />

        {/* Boards grid */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 3,
            justifyContent: 'center',
          }}
        >
          {boardDeployments.map((boardDeployment, idx) => (
            <Box key={`board-${idx}`} data-testid={`board-${idx}`}>
              <Board boardDeployment$={boardDeployment} />
            </Box>
          ))}
          <Box data-testid="board-start">
            <Board />
          </Box>
        </Box>

        {/* Privacy note */}
        <Box
          sx={{
            mt: 8, p: 3, borderRadius: 3,
            background: 'rgba(124,58,237,0.05)',
            border: '1px solid rgba(124,58,237,0.15)',
            display: 'flex', gap: 2, alignItems: 'flex-start',
          }}
        >
          <ShieldIcon sx={{ color: '#7c3aed', mt: 0.3, flexShrink: 0 }} />
          <Box>
            <Typography variant="subtitle2" sx={{ color: '#c4b5fd', fontWeight: 700, mb: 0.5 }}>Privacy Guarantee</Typography>
            <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.7 }}>
              Your identity is never stored on-chain. Authorship is proven via a zero-knowledge proof
              using your wallet's secret key — only a hashed public key is disclosed, which is
              unlinkable to your wallet address.
            </Typography>
          </Box>
        </Box>
      </MainLayout>
    </Box>
  );
};

export default App;
