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

import { createTheme } from '@mui/material';

export const theme = createTheme({
  typography: {
    fontFamily: '"Inter", "Helvetica", sans-serif',
    allVariants: { color: '#e2e8f0' },
  },
  palette: {
    mode: 'dark',
    primary: { main: '#7c3aed' },
    secondary: { main: '#06b6d4' },
    background: { default: '#0f0f1a', paper: '#1a1a2e' },
    text: { primary: '#e2e8f0', secondary: '#94a3b8' },
    error: { main: '#ef4444' },
    success: { main: '#10b981' },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, textTransform: 'none', fontWeight: 600 },
        containedPrimary: {
          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          '&:hover': { background: 'linear-gradient(135deg, #6d28d9, #5b21b6)' },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': { borderColor: 'rgba(124,58,237,0.3)' },
            '&:hover fieldset': { borderColor: 'rgba(124,58,237,0.6)' },
            '&.Mui-focused fieldset': { borderColor: '#7c3aed' },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6 },
      },
    },
  },
});
