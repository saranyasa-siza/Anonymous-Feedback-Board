import React, { createContext, useContext, useState, useEffect, type PropsWithChildren } from 'react';
import '@midnight-ntwrk/dapp-connector-api';
import type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

const COMPATIBLE_API_VERSIONS = ['4.x', '5.x', '3.x'];

const isCompatible = (w: unknown): w is InitialAPI => {
  if (!w || typeof w !== 'object') return false;
  const api = w as Record<string, unknown>;
  return typeof api['connect'] === 'function' &&
    typeof api['apiVersion'] === 'string' &&
    COMPATIBLE_API_VERSIONS.some(v => (api['apiVersion'] as string).startsWith(v.split('.')[0]));
};

const discoverWallets = (): InitialAPI[] => Object.values(window.midnight ?? {}).filter(isCompatible);

type WalletStatus = 'idle' | 'no-wallet' | 'ready' | 'connecting' | 'connected';

export interface WalletContextValue {
  status: WalletStatus;
  availableWallets: InitialAPI[];
  selectedWallet: InitialAPI | null;
  connectedAPI: ConnectedAPI | null;
  address: string | null;
  connectedWalletName: string | null;
  error: string | null;
  connect: (wallet: InitialAPI) => Promise<void>;
  disconnect: () => void;
}

export const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export const WalletProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [status, setStatus] = useState<WalletStatus>('idle');
  const [availableWallets, setAvailableWallets] = useState<InitialAPI[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<InitialAPI | null>(null);
  const [connectedAPI, setConnectedAPI] = useState<ConnectedAPI | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [connectedWalletName, setConnectedWalletName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let elapsed = 0;
    const t = setInterval(() => {
      const wallets = discoverWallets();
      if (wallets.length > 0) {
        setAvailableWallets(wallets);
        setStatus('ready');
        clearInterval(t);
      } else {
        elapsed += 100;
        if (elapsed >= 5000) {
          setStatus('no-wallet');
          clearInterval(t);
        }
      }
    }, 100);
    return () => clearInterval(t);
  }, []);

  const connect = async (wallet: InitialAPI) => {
    setStatus('connecting');
    setError(null);
    try {
      const api = await wallet.connect('preview');
      const connectionStatus = await api.getConnectionStatus();
      if (connectionStatus.status !== 'connected') throw new Error('Wallet connection failed.');
      let addr: string | null = null;
      try {
        const { unshieldedAddress } = await api.getUnshieldedAddress();
        addr = unshieldedAddress ?? null;
      } catch {
        try {
          const { shieldedAddress } = await api.getShieldedAddresses();
          addr = shieldedAddress ?? null;
        } catch { /* addr stays null */ }
      }
      setSelectedWallet(wallet);
      setConnectedAPI(api);
      setAddress(addr);
      setConnectedWalletName(wallet.name ?? null);
      setStatus('connected');
    } catch (err) {
      setStatus('ready');
      setSelectedWallet(null);
      setConnectedAPI(null);
      setAddress(null);
      setConnectedWalletName(null);
      setError((err as Error).message);
    }
  };

  const disconnect = () => {
    setStatus('ready');
    setSelectedWallet(null);
    setConnectedAPI(null);
    setAddress(null);
    setConnectedWalletName(null);
    setError(null);
  };

  return (
    <WalletContext.Provider value={{
      status, availableWallets, selectedWallet, connectedAPI,
      address, connectedWalletName, error, connect, disconnect,
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWalletContext = (): WalletContextValue => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWalletContext must be used within WalletProvider');
  return ctx;
};
