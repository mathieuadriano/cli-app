"use client";

import {
  NetworkId,
  WalletId,
  WalletManager,
  WalletProvider as BaseWalletProvider,
  useWallet,
} from "@txnlab/use-wallet-react";

const manager = new WalletManager({
  wallets: [WalletId.PERA, WalletId.DEFLY],
  network: NetworkId.MAINNET,
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return <BaseWalletProvider manager={manager}>{children}</BaseWalletProvider>;
}

export function ConnectButton() {
  const { wallets, activeAccount } = useWallet();

  if (activeAccount) {
    const addr = activeAccount.address;
    return (
      <button
        onClick={() => wallets[0]?.disconnect()}
        className="text-sm bg-ink text-canvas font-medium px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
      >
        {addr.slice(0, 6)}…{addr.slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={() => wallets[0]?.connect()}
      className="text-sm bg-ink text-canvas font-medium px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
    >
      Connect Wallet
    </button>
  );
}
