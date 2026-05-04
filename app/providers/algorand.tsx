"use client";

import { useState, useEffect } from "react";
import { PeraWalletConnect } from "@perawallet/connect";

const peraWallet = new PeraWalletConnect({ chainId: 416001 }); // MainNet

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function ConnectButton() {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    peraWallet.reconnectSession().then((accounts) => {
      peraWallet.connector?.on("disconnect", handleDisconnect);
      if (accounts.length) setAddress(accounts[0]);
    });
  }, []);

  function handleConnect() {
    peraWallet
      .connect()
      .then((accounts) => {
        peraWallet.connector?.on("disconnect", handleDisconnect);
        setAddress(accounts[0]);
      })
      .catch((err) => {
        if (err?.data?.type !== "CONNECT_MODAL_CLOSED") console.log(err);
      });
  }

  function handleDisconnect() {
    peraWallet.disconnect();
    setAddress(null);
  }

  if (address) {
    return (
      <button
        onClick={handleDisconnect}
        className="text-sm bg-ink text-canvas font-medium px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
      >
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="text-sm bg-ink text-canvas font-medium px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
    >
      Connect Wallet
    </button>
  );
}
