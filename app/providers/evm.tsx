"use client";

import { createConfig, http, WagmiProvider, useAccount, useConnect, useDisconnect } from "wagmi";
import { mainnet, base, arbitrum } from "wagmi/chains";
import { injected, metaMask, coinbaseWallet } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const config = createConfig({
  chains: [mainnet, base, arbitrum],
  connectors: [
    injected(),
    metaMask(),
    coinbaseWallet({ appName: "Spoke App" }),
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
  },
});

const queryClient = new QueryClient();

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="text-sm bg-ink text-canvas font-medium px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
      >
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      className="text-sm bg-ink text-canvas font-medium px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
    >
      Connect Wallet
    </button>
  );
}
