import { useState } from 'react';
import '@midnight-ntwrk/dapp-connector-api';
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';

type WalletState = {
  isConnected: boolean;
  address: string | null;
  isConnecting: boolean;
  error: string | null;
};

export const useWallet = () => {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    isConnecting: false,
    error: null,
  });

  const connect = async () => {
    setState((s) => ({ ...s, isConnecting: true, error: null }));
    try {
      const wallets = Object.values(window.midnight ?? {}).filter(
        (w): w is InitialAPI => !!w?.name && !!w?.apiVersion,
      );
      if (wallets.length === 0) throw new Error('No Midnight wallet found. Please install Lace.');

      const api: ConnectedAPI = await wallets[0].connect('preprod');
      const status = await api.getConnectionStatus();
      if (status.status !== 'connected') throw new Error('Wallet connection failed.');

      const { unshieldedAddress } = await api.getUnshieldedAddress();
      setState({ isConnected: true, address: unshieldedAddress, isConnecting: false, error: null });
    } catch (err) {
      setState({ isConnected: false, address: null, isConnecting: false, error: (err as Error).message });
    }
  };

  const disconnect = () => {
    setState({ isConnected: false, address: null, isConnecting: false, error: null });
  };

  return { ...state, connect, disconnect };
};
