import { useState, useEffect, useRef } from 'react';
import '@midnight-ntwrk/dapp-connector-api';
import type { InitialAPI } from '@midnight-ntwrk/dapp-connector-api';

type WalletStatus = 'idle' | 'no-wallet' | 'ready' | 'connecting' | 'connected';

type WalletState = {
  status: WalletStatus;
  address: string | null;
  error: string | null;
};

const findWallet = (): InitialAPI | null => {
  const midnight = window.midnight;
  if (!midnight) return null;
  // Try friendly key first (Lace), then scan all entries
  if (midnight.mnLace) return midnight.mnLace as InitialAPI;
  const found = Object.values(midnight).find((w): w is InitialAPI => !!(w as InitialAPI)?.connect);
  return found ?? null;
};

export const useWallet = () => {
  const [state, setState] = useState<WalletState>({ status: 'idle', address: null, error: null });
  const walletRef = useRef<InitialAPI | null>(null);

  // Poll for wallet injection on mount (extension loads asynchronously)
  useEffect(() => {
    const found = findWallet();
    if (found) {
      walletRef.current = found;
      setState((s) => ({ ...s, status: 'ready' }));
      return;
    }
    let elapsed = 0;
    const t = setInterval(() => {
      elapsed += 100;
      const w = findWallet();
      if (w) {
        walletRef.current = w;
        setState((s) => ({ ...s, status: 'ready' }));
        clearInterval(t);
      } else if (elapsed >= 5000) {
        setState((s) => ({ ...s, status: 'no-wallet' }));
        clearInterval(t);
      }
    }, 100);
    return () => clearInterval(t);
  }, []);

  const connect = async () => {
    if (!walletRef.current) {
      setState((s) => ({ ...s, error: 'No Midnight wallet found. Please install Lace.' }));
      return;
    }
    setState((s) => ({ ...s, status: 'connecting', error: null }));
    try {
      const api = await walletRef.current.connect('preprod');
      const status = await api.getConnectionStatus();
      if (status.status !== 'connected') throw new Error('Wallet connection failed.');
      const { unshieldedAddress } = await api.getUnshieldedAddress();
      setState({ status: 'connected', address: unshieldedAddress, error: null });
    } catch (err) {
      setState({ status: 'ready', address: null, error: (err as Error).message });
    }
  };

  const disconnect = () => {
    setState({ status: walletRef.current ? 'ready' : 'no-wallet', address: null, error: null });
  };

  return {
    isConnected: state.status === 'connected',
    isConnecting: state.status === 'connecting',
    walletFound: state.status !== 'idle' && state.status !== 'no-wallet',
    address: state.address,
    error: state.error,
    connect,
    disconnect,
  };
};
