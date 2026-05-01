"use client";

import { useState } from "react";

const VAULT_NAME    = process.env.NEXT_PUBLIC_VAULT_NAME    || "mMEV";
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS || "";
const CHAIN         = process.env.NEXT_PUBLIC_CHAIN         || "EVM";
const ETHERSCAN_URL = VAULT_ADDRESS ? `https://etherscan.io/address/${VAULT_ADDRESS}` : null;

const STATS = [
  { label: "Total Value Locked", value: "$82.4M", change: "+2.3%" },
  { label: "Net APY", value: "12.7%", change: "+0.4%" },
  { label: "Token Price", value: "$1.0412", change: "+0.08%" },
  { label: "7d Yield", value: "$184K", change: null },
];

const ALLOCATIONS = [
  { protocol: "Morpho", share: 42, color: "bg-violet-500" },
  { protocol: "Pendle", share: 31, color: "bg-blue-500" },
  { protocol: "Aave", share: 18, color: "bg-teal-500" },
  { protocol: "Idle", share: 9, color: "bg-zinc-500" },
];

export default function Home() {
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">
      {/* Nav */}
      <nav className="border-b border-rim px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-gfrom to-brand-gto" />
          <span className="font-semibold tracking-tight text-ink">Vault Page Generator</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-ink-soft">
          <a href="#" className="hover:text-ink transition-colors">Vaults</a>
          <a href="#" className="hover:text-ink transition-colors">Portfolio</a>
          <a href="#" className="hover:text-ink transition-colors">Docs</a>
        </div>
        <button className="text-sm bg-ink text-canvas font-medium px-4 py-2 rounded-full hover:opacity-80 transition-opacity">
          Connect Wallet
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-gfrom/20 to-brand-gto/20 border border-brand-ring flex items-center justify-center text-xl">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">{VAULT_NAME}</h1>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-tint text-brand-dim border border-brand-ring">
                  Active
                </span>
              </div>
              <p className="text-ink-soft text-sm mt-0.5">
                MEV Capital · Liquid Yield Token · USDC · {CHAIN}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {ETHERSCAN_URL ? (
              <a href={ETHERSCAN_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-ink-soft border border-rim px-3 py-1.5 rounded-lg hover:border-rim-strong hover:text-ink transition-colors">
                Smart Contract ↗
              </a>
            ) : (
              <button disabled className="text-sm text-ink-faint border border-rim px-3 py-1.5 rounded-lg opacity-40 cursor-not-allowed">
                Smart Contract ↗
              </button>
            )}
            <button className="text-sm text-ink-soft border border-rim px-3 py-1.5 rounded-lg hover:border-rim-strong hover:text-ink transition-colors">
              Audit ↗
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {STATS.map((s) => (
            <div key={s.label} className="bg-panel border border-rim rounded-2xl p-5">
              <p className="text-xs text-ink-soft mb-2">{s.label}</p>
              <p className="text-xl font-semibold">{s.value}</p>
              {s.change && (
                <p className="text-xs text-brand-dim mt-1">{s.change} 24h</p>
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Left — vault info */}
          <div className="flex flex-col gap-6">
            {/* About */}
            <div className="bg-panel border border-rim rounded-2xl p-6">
              <h2 className="font-medium mb-3">About</h2>
              <p className="text-sm text-ink-soft leading-relaxed">
                mMEV is a liquid yield token (LYT) managed by MEV Capital, one
                of the leading DeFi strategy managers. The vault dynamically
                allocates USDC across MEV-optimized lending and yield strategies,
                targeting superior risk-adjusted returns while maintaining instant
                redemptions.
              </p>
            </div>

            {/* Allocation */}
            <div className="bg-panel border border-rim rounded-2xl p-6">
              <h2 className="font-medium mb-5">Strategy Allocation</h2>
              <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-5">
                {ALLOCATIONS.map((a) => (
                  <div
                    key={a.protocol}
                    className={`${a.color} h-full`}
                    style={{ width: `${a.share}%` }}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {ALLOCATIONS.map((a) => (
                  <div key={a.protocol} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${a.color}`} />
                      <span className="text-sm text-ink-soft">{a.protocol}</span>
                    </div>
                    <span className="text-sm font-medium">{a.share}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk */}
            <div className="bg-panel border border-rim rounded-2xl p-6">
              <h2 className="font-medium mb-4">Risk Parameters</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Risk Score", value: "Low", accent: true },
                  { label: "Max Drawdown", value: "0.12%", accent: false },
                  { label: "Redemptions", value: "Instant", accent: false },
                ].map((r) => (
                  <div key={r.label} className="bg-panel border border-rim rounded-xl p-4">
                    <p className="text-xs text-ink-soft mb-1.5">{r.label}</p>
                    <p className={`text-sm font-medium ${r.accent ? "text-brand-dim" : "text-ink"}`}>
                      {r.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — deposit/withdraw card */}
          <div className="h-fit sticky top-6">
            <div className="bg-panel border border-rim rounded-2xl p-6">
              {/* Tabs */}
              <div className="flex bg-panel border border-rim rounded-xl p-1 mb-6">
                {(["deposit", "withdraw"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
                      tab === t
                        ? "bg-ink text-canvas"
                        : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* You pay */}
              <div className="bg-panel border border-rim rounded-xl p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-ink-soft">
                    {tab === "deposit" ? "You deposit" : "You withdraw"}
                  </span>
                  <span className="text-xs text-ink-soft">
                    Balance: <span className="text-ink-soft">4,200.00</span>{" "}
                    {tab === "deposit" ? "USDC" : VAULT_NAME}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 bg-transparent text-2xl font-semibold outline-none placeholder-ink-faint min-w-0 text-ink"
                  />
                  <div className="flex items-center gap-2 bg-panel border border-rim rounded-lg px-3 py-1.5 shrink-0">
                    <div className="w-4 h-4 rounded-full bg-blue-400" />
                    <span className="text-sm font-medium">
                      {tab === "deposit" ? "USDC" : VAULT_NAME}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {["25%", "50%", "75%", "MAX"].map((p) => (
                    <button
                      key={p}
                      className="text-xs text-ink-faint hover:text-brand-dim transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center my-1 text-ink-faint text-lg">↓</div>

              {/* You receive */}
              <div className="bg-panel border border-rim rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-ink-soft">You receive</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex-1 text-2xl font-semibold text-ink-faint">
                    {amount
                      ? tab === "deposit"
                        ? (parseFloat(amount) / 1.0412).toFixed(4)
                        : (parseFloat(amount) * 1.0412).toFixed(2)
                      : "0.00"}
                  </span>
                  <div className="flex items-center gap-2 bg-panel border border-rim rounded-lg px-3 py-1.5 shrink-0">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-brand-gfrom to-brand-gto" />
                    <span className="text-sm font-medium">
                      {tab === "deposit" ? VAULT_NAME : "USDC"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fee summary */}
              <div className="space-y-2 mb-5 text-sm">
                {[
                  { label: "Exchange Rate", value: "1 mMEV = 1.0412 USDC" },
                  { label: "Protocol Fee", value: "0.10%" },
                  { label: "Est. Time", value: "Instant" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-ink-soft">
                    <span>{row.label}</span>
                    <span className="text-ink">{row.value}</span>
                  </div>
                ))}
              </div>

              <button className="w-full py-3.5 rounded-xl font-medium text-sm bg-brand text-brand-on hover:bg-brand-dim transition-colors">
                {tab === "deposit" ? "Deposit" : "Withdraw"}
              </button>

              <p className="text-center text-xs text-ink-faint mt-4">
                Connect wallet to continue
              </p>
            </div>

            {/* My position */}
            <div className="mt-4 bg-panel border border-rim rounded-2xl p-5">
              <h3 className="text-sm font-medium mb-4">My Position</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Balance", value: "—" },
                  { label: "Value", value: "—" },
                  { label: "Earned", value: "—" },
                  { label: "Share", value: "—" },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-ink-soft">{item.label}</p>
                    <p className="text-sm font-medium mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
