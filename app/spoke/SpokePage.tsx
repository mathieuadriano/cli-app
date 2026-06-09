"use client";

import { useState } from "react";
import Link from "next/link";
import { ConnectButton } from "../providers";

const SPOKE_NAME = process.env.NEXT_PUBLIC_SPOKE_NAME || "SPOKE_NAME";
const CHAIN      = process.env.NEXT_PUBLIC_CHAIN      || "CHAIN";

const STATS = [
  { label: "Total Collateral",     value: "$5.2M",  change: "+1.1%" },
  { label: "Total Borrowed",       value: "$3.1M",  change: "+0.8%" },
  { label: "Available to Borrow",  value: "$2.1M",  change: null    },
  { label: "Utilization Rate",     value: "59.6%",  change: null    },
];

const COLLATERAL_ASSETS = [
  { symbol: "ETH",   name: "Ethereum",        ltv: 80, apy: 2.1,  color: "bg-blue-400",   supplied: "$2.4M" },
  { symbol: "WBTC",  name: "Wrapped Bitcoin",  ltv: 75, apy: 1.8,  color: "bg-orange-400", supplied: "$1.8M" },
  { symbol: "USDC",  name: "USD Coin",         ltv: 90, apy: 0.5,  color: "bg-teal-400",   supplied: "$600K" },
  { symbol: "wstETH",name: "Wrapped stETH",    ltv: 78, apy: 3.4,  color: "bg-violet-400", supplied: "$400K" },
];

const LOAN_PARAMS = [
  { label: "Loan Token",              value: "USDC"  },
  { label: "Max LTV",                 value: "80%"   },
  { label: "Liquidation Threshold",   value: "85%"   },
  { label: "Liquidation Penalty",     value: "5%"    },
  { label: "Borrow APY",              value: "4.2%"  },
  { label: "Min Collateral Ratio",    value: "125%"  },
];

function HealthBar({ ltv }: { ltv: number }) {
  const pct = Math.min(ltv, 100);
  const color = pct < 50 ? "bg-teal-500" : pct < 75 ? "bg-yellow-500" : "bg-red-500";
  const label = pct < 50 ? "Safe" : pct < 75 ? "Moderate" : "At Risk";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-ink-soft">Health Factor</span>
        <span className={pct < 50 ? "text-teal-400" : pct < 75 ? "text-yellow-400" : "text-red-400"}>
          {label} · {pct}% LTV
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-panel border border-rim overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SpokePage() {
  const [tab, setTab]               = useState<"supply" | "borrow">("supply");
  const [collateralAmount, setCollateralAmount] = useState("");
  const [borrowAmount, setBorrowAmount]         = useState("");
  const [selectedAsset, setSelectedAsset]       = useState(COLLATERAL_ASSETS[0]);

  const collateralValue  = parseFloat(collateralAmount) || 0;
  const maxBorrow        = collateralValue * (selectedAsset.ltv / 100);
  const currentBorrow    = parseFloat(borrowAmount) || 0;
  const currentLtv       = collateralValue > 0 ? Math.round((currentBorrow / collateralValue) * 100) : 0;

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">
      {/* Nav */}
      <nav className="border-b border-rim px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-gfrom to-brand-gto" />
          <span className="font-semibold tracking-tight text-ink">Folks Atlas</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-ink-soft">
          <Link href="/" className="hover:text-ink transition-colors">Spoke</Link>
          <Link href="/spoke" className="text-ink transition-colors">Borrow</Link>
        </div>
        <ConnectButton />
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-gfrom/20 to-brand-gto/20 border border-brand-ring flex items-center justify-center text-xl">
              🏦
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">{SPOKE_NAME} · Borrow Market</h1>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-tint text-brand-dim border border-brand-ring">
                  Active
                </span>
              </div>
              <p className="text-ink-soft text-sm mt-0.5">
                Supply collateral · Borrow USDC · {CHAIN}
              </p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {STATS.map((s) => (
            <div key={s.label} className="bg-panel border border-rim rounded-2xl p-5">
              <p className="text-xs text-ink-soft mb-2">{s.label}</p>
              <p className="text-xl font-semibold">{s.value}</p>
              {s.change && <p className="text-xs text-brand-dim mt-1">{s.change} 24h</p>}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Left */}
          <div className="flex flex-col gap-6">

            {/* About */}
            <div className="bg-panel border border-rim rounded-2xl p-6">
              <h2 className="font-medium mb-3">About</h2>
              <p className="text-sm text-ink-soft leading-relaxed">
                The {SPOKE_NAME} borrow market lets you supply crypto assets as collateral and borrow USDC
                against them. Your collateral earns yield while it secures your loan. Maintain a healthy
                collateral ratio to avoid liquidation.
              </p>
            </div>

            {/* Collateral assets */}
            <div className="bg-panel border border-rim rounded-2xl p-6">
              <h2 className="font-medium mb-5">Accepted Collateral</h2>
              <div className="space-y-3">
                {/* Header */}
                <div className="grid grid-cols-4 text-xs text-ink-faint pb-2 border-b border-rim">
                  <span>Asset</span>
                  <span className="text-right">Max LTV</span>
                  <span className="text-right">Supply APY</span>
                  <span className="text-right">Total Supplied</span>
                </div>
                {COLLATERAL_ASSETS.map((a) => (
                  <button
                    key={a.symbol}
                    onClick={() => setSelectedAsset(a)}
                    className={`w-full grid grid-cols-4 items-center py-2 px-3 rounded-xl transition-colors text-left ${
                      selectedAsset.symbol === a.symbol
                        ? "bg-brand-tint border border-brand-ring"
                        : "hover:bg-rim/20 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full ${a.color}`} />
                      <div>
                        <p className="text-sm font-medium">{a.symbol}</p>
                        <p className="text-xs text-ink-faint">{a.name}</p>
                      </div>
                    </div>
                    <span className="text-sm text-right font-medium">{a.ltv}%</span>
                    <span className="text-sm text-right text-brand-dim">{a.apy}%</span>
                    <span className="text-sm text-right text-ink-soft">{a.supplied}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Loan parameters */}
            <div className="bg-panel border border-rim rounded-2xl p-6">
              <h2 className="font-medium mb-4">Loan Parameters</h2>
              <div className="grid grid-cols-2 gap-3">
                {LOAN_PARAMS.map((r) => (
                  <div key={r.label} className="bg-panel border border-rim rounded-xl p-4">
                    <p className="text-xs text-ink-soft mb-1.5">{r.label}</p>
                    <p className="text-sm font-medium text-ink">{r.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — action card */}
          <div className="h-fit sticky top-6 flex flex-col gap-4">
            <div className="bg-panel border border-rim rounded-2xl p-6">
              {/* Tabs */}
              <div className="flex bg-panel border border-rim rounded-xl p-1 mb-6">
                {(["supply", "borrow"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
                      tab === t ? "bg-ink text-canvas" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {t === "supply" ? "Supply Collateral" : "Borrow USDC"}
                  </button>
                ))}
              </div>

              {tab === "supply" ? (
                <>
                  {/* Collateral input */}
                  <div className="bg-panel border border-rim rounded-xl p-4 mb-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-ink-soft">You supply</span>
                      <span className="text-xs text-ink-soft">
                        Balance: <span>0.00</span> {selectedAsset.symbol}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={collateralAmount}
                        onChange={(e) => setCollateralAmount(e.target.value)}
                        className="flex-1 bg-transparent text-2xl font-semibold outline-none placeholder-ink-faint min-w-0 text-ink"
                      />
                      <div className={`flex items-center gap-2 bg-panel border border-rim rounded-lg px-3 py-1.5 shrink-0`}>
                        <div className={`w-4 h-4 rounded-full ${selectedAsset.color}`} />
                        <span className="text-sm font-medium">{selectedAsset.symbol}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {["25%", "50%", "75%", "MAX"].map((p) => (
                        <button key={p} className="text-xs text-ink-faint hover:text-brand-dim transition-colors">{p}</button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-center my-1 text-ink-faint text-sm">↓</div>

                  {/* Borrow power unlocked */}
                  <div className="bg-panel border border-rim rounded-xl p-4 mb-5">
                    <span className="text-xs text-ink-soft block mb-3">Borrow power unlocked</span>
                    <div className="flex items-center gap-3">
                      <span className="flex-1 text-2xl font-semibold text-ink-faint">
                        {collateralAmount ? maxBorrow.toFixed(2) : "0.00"}
                      </span>
                      <div className="flex items-center gap-2 bg-panel border border-rim rounded-lg px-3 py-1.5 shrink-0">
                        <div className="w-4 h-4 rounded-full bg-teal-400" />
                        <span className="text-sm font-medium">USDC</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-5 text-sm">
                    {[
                      { label: "Collateral Asset",  value: selectedAsset.name },
                      { label: "Max LTV",           value: `${selectedAsset.ltv}%` },
                      { label: "Supply APY",        value: `${selectedAsset.apy}%` },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-ink-soft">
                        <span>{row.label}</span>
                        <span className="text-ink">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  <button className="w-full py-3.5 rounded-xl font-medium text-sm bg-brand text-brand-on hover:bg-brand-dim transition-colors">
                    Supply {selectedAsset.symbol}
                  </button>
                </>
              ) : (
                <>
                  {/* Borrow input */}
                  <div className="bg-panel border border-rim rounded-xl p-4 mb-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-ink-soft">You borrow</span>
                      <span className="text-xs text-ink-soft">
                        Max: <span className="text-ink">{maxBorrow > 0 ? maxBorrow.toFixed(2) : "0.00"}</span> USDC
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={borrowAmount}
                        onChange={(e) => setBorrowAmount(e.target.value)}
                        className="flex-1 bg-transparent text-2xl font-semibold outline-none placeholder-ink-faint min-w-0 text-ink"
                      />
                      <div className="flex items-center gap-2 bg-panel border border-rim rounded-lg px-3 py-1.5 shrink-0">
                        <div className="w-4 h-4 rounded-full bg-teal-400" />
                        <span className="text-sm font-medium">USDC</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {["25%", "50%", "75%", "MAX"].map((p) => (
                        <button key={p} className="text-xs text-ink-faint hover:text-brand-dim transition-colors">{p}</button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-5">
                    <HealthBar ltv={currentLtv} />
                  </div>

                  <div className="space-y-2 mb-5 text-sm">
                    {[
                      { label: "Borrow APY",              value: "4.2%" },
                      { label: "Collateral Required",     value: `${(currentBorrow / (selectedAsset.ltv / 100)).toFixed(2)} ${selectedAsset.symbol}` },
                      { label: "Liquidation at LTV",      value: "85%" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-ink-soft">
                        <span>{row.label}</span>
                        <span className="text-ink">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  <button className="w-full py-3.5 rounded-xl font-medium text-sm bg-brand text-brand-on hover:bg-brand-dim transition-colors">
                    Borrow USDC
                  </button>
                </>
              )}

              <p className="text-center text-xs text-ink-faint mt-4">Connect wallet to continue</p>
            </div>

            {/* My position */}
            <div className="bg-panel border border-rim rounded-2xl p-5">
              <h3 className="text-sm font-medium mb-4">My Position</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Collateral",   value: "—" },
                  { label: "Borrowed",     value: "—" },
                  { label: "Net APY",      value: "—" },
                  { label: "Health",       value: "—" },
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
