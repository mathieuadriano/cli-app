"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider as BaseWalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <BaseWalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </BaseWalletProvider>
    </ConnectionProvider>
  );
}

export function ConnectButton() {
  return (
    <WalletMultiButton className="!text-sm !font-medium !rounded-full !px-4 !py-2 !bg-ink !text-canvas hover:!opacity-80 !transition-opacity !h-auto" />
  );
}
