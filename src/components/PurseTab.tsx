import React, { useEffect, useState } from 'react';
import { Wallet, Coins, ArrowUpRight, ArrowDownLeft, Shield, Sparkles, TrendingUp, CheckCircle2 } from 'lucide-react';
import { fetchUserTransactions, VQTransaction } from '../domains/d06_purse';
import { UserProfile } from '../domains/d01_auth';

interface PurseTabProps {
  user: UserProfile | null;
}

export const PurseTab: React.FC<PurseTabProps> = ({ user }) => {
  const [transactions, setTransactions] = useState<VQTransaction[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setTransactions([]);
    setHistoryError(null);

    if (!user) {
      setLoading(false);
      return () => { active = false; };
    }

    fetchUserTransactions(user.id)
      .then((result) => {
        if (!active) return;
        setTransactions(result.transactions);
        setHistoryError(result.error);
      })
      .catch((error) => {
        if (!active) return;
        setTransactions([]);
        setHistoryError(error instanceof Error ? error.message : 'Transaction history could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [user?.id]);

  return (
    <div className="space-y-6 pb-24 text-white max-w-md mx-auto box-border overflow-x-hidden">
      {/* Wallet Balance Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-amber-400 font-bold flex items-center space-x-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>VQ Genesis Wallet</span>
            </span>
            <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-500/30 font-semibold">
              Profile Snapshot
            </span>
          </div>

          <div>
            <p className="text-xs text-neutral-400">Total VQ Token Balance</p>
            <h1 className="text-4xl font-black tracking-tight text-amber-300 mt-1">
              {user ? user.vq_balance : 0} <span className="text-lg font-normal text-neutral-400">VQ</span>
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-2xl bg-neutral-950/60 border border-neutral-800 p-3">
              <span className="text-[10px] text-neutral-400">District Reputation</span>
              <p className="text-lg font-bold text-teal-400 mt-0.5">{user?.reputation != null ? `${user.reputation}%` : '—'}</p>
            </div>
            <div className="rounded-2xl bg-neutral-950/60 border border-neutral-800 p-3">
              <span className="text-[10px] text-neutral-400">Network Tier</span>
              <p className="text-lg font-bold text-orange-400 mt-0.5 uppercase">{user?.role ?? 'GUEST'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Staking Banner */}
      <div className="rounded-3xl bg-neutral-900 border border-neutral-800 p-5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            <span>District Staking Pools</span>
          </h3>
          <span className="text-xs font-bold text-neutral-400">Unavailable</span>
        </div>
        <p className="text-xs text-neutral-400">
          VQ staking requires an authorized on-chain or server-side contract and cannot be enabled from the browser alone.
        </p>

        <button
          type="button"
          disabled
          title="Staking requires a verified backend and approved reward policy"
          className="w-full py-3 rounded-2xl font-bold text-xs shadow-lg bg-neutral-800 text-neutral-400 border border-neutral-700 cursor-not-allowed"
        >
          Staking unavailable
        </button>
      </div>

      {/* Transactions History */}
      <div className="space-y-3">
        <h3 className="text-base font-bold flex items-center space-x-2">
          <Wallet className="w-4 h-4 text-orange-400" />
          <span>Transaction Ledger</span>
        </h3>

        {loading ? (
          <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-6 text-center text-xs text-neutral-400">
            Loading transaction history...
          </div>
        ) : historyError ? (
          <div role="alert" className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-6 text-center space-y-2">
            <h4 className="font-bold text-xs text-amber-300">Transaction history unavailable</h4>
            <p className="text-[11px] text-neutral-300">{historyError}</p>
          </div>
        ) : transactions.length > 0 ? (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    tx.amount > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  }`}>
                    {tx.amount > 0 ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">{tx.description}</h4>
                    <p className="text-[10px] text-neutral-500">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`font-black text-sm ${tx.amount > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {tx.amount > 0 ? `+${tx.amount}` : tx.amount} VQ
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-6 text-center space-y-2">
            <Coins className="w-8 h-8 text-amber-400/60 mx-auto" />
            <h4 className="font-bold text-xs text-white">No transactions recorded yet</h4>
            <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
              Check in at Vibe Orbit waypoints or complete cultural trails to earn your first VQ tokens.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
