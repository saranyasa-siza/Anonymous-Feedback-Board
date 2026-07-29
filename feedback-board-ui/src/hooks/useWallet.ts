import { useState, useEffect } from 'react';
import '@midnight-ntwrk/dapp-connector-api';
import type { InitialAPI } from '@midnight-ntwrk/dapp-connector-api';

const COMPATIBLE_API_VERSION = '4.x';

const isCompatible = (w: unknown): w is InitialAPI => {
  if (!w || typeof w !== 'object') return false;
  const api = w as Record<string, unknown>;
  if (typeof api['connect'] !== 'function') return false;
  if (typeof api['apiVersion'] !== 'string') return false;
  // Accept any 4.x version
  return (api['apiVersion'] as string).startsWith('4.');
};

const discoverWallets = (): InitialAPI[] =>
  Object.values(window.midnight ?? {}).filter(isCompatible);

type WalletStatus = 'idle' | 'no-wallet' | 'ready' | 'connecting' | 'connected';

type WalletState = {
  status: WalletStatus;
  availableWallets: InitialAPI[];
  address: string | null;
  connectedWalletName: string | null;
  error: string | null;
};

export const useWallet = () => {
  const [state, setState] = useState<WalletState>({
    status: 'idle',
    availableWallets: [],
    address: null,
    connectedWalletName: null,
    error: null,
  });

  // Poll for wallet injection on mount — extensions load asynchronously
  useEffect(() => {
    let elapsed = 0;
    const t = setInterval(() => {
      const wallets = discoverWallets();
      if (wallets.length > 0) {
        setState((s) => ({ ...s, status: 'ready', availableWallets: wallets }));
        clearInterval(t);
      } else {
        elapsed += 100;
        if (elapsed >= 5000) {
          setState((s) => ({ ...s, status: 'no-wallet' }));
          clearInterval(t);
        }
      }
    }, 100);
    return () => clearInterval(t);
  }, []);

  const connect = async (wallet: InitialAPI) => {
    setState((s) => ({ ...s, status: 'connecting', error: null }));
    try {
      const api = await wallet.connect('preprod');
      const status = await api.getConnectionStatus();
      if (status.status !== 'connected') throw new Error('Wallet connection failed.');
      let address: string | null = null;
      try {
        const { unshieldedAddress } = await api.getUnshieldedAddress();
        address = unshieldedAddress ?? null;
      } catch {
        try {
          const { shieldedAddress } = await api.getShieldedAddresses();
          address = shieldedAddress ?? null;
        } catch { /* address stays null */ }
      }
      setState((s) => ({
        ...s,
        status: 'connected',
        address,
        connectedWalletName: wallet.name ?? null,
        error: null,
      }));
    } catch (err) {
      setState((s) => ({ ...s, status: 'ready', address: null, connectedWalletName: null, error: (err as Error).message }));
    }
  };

  const disconnect = () => {
    setState((s) => ({ ...s, status: 'ready', address: null, connectedWalletName: null, error: null }));
  };

  return {
    isConnected: state.status === 'connected',
    isConnecting: state.status === 'connecting',
    hasWallets: state.availableWallets.length > 0,
    availableWallets: state.availableWallets,
    address: state.address,
    connectedWalletName: state.connectedWalletName,
    error: state.error,
    connect,
    disconnect,
  };
};
