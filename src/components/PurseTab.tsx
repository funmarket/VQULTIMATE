import React, { useEffect, useState } from 'react';
import { Wallet, Coins, ArrowUpRight, ArrowDownLeft, Shield, Sparkles, TrendingUp } from 'lucide-react';
import { fetchUserTransactions, VQTransaction } from '../domains/d06_purse';
import { UserProfile } from '../domains/d01_auth';

interface PurseTabProps {
  user: UserProfile | null;
}

export const PurseTab: React.FC<PurseTabProps> = ({ user }) => {
  const [transactions, setTransactions] = useState<VQTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserTransactions(user.id).then((data) => {
        setTransactions(data);
        setLoading(false);
      });
    }
  }, [user]);

  return (
    <div className="space-y-6 pb-24 text-white max-w-md mx-auto">
      {/* Wallet Balance Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-amber-400 font-bold flex items-center space-x-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>VQ Genesis Wallet</span>
            </span>
            <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/30">
              Supabase Secure
            </span>
          </div>

          <div>
            <p className="text-xs text-neutral-400">Total VQ Token Balance</p>
            <h1 className="text-4xl font-black tracking-tight text-amber-300 mt-1">
              {user?.vq_balance ?? 1420} <span className="text-lg font-normal text-neutral-400">VQ</span>
            </h1>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-2xl bg-neutral-950/60 border border-neutral-800 p-3">
              <span className="text-[10px] text-neutral-400">District Reputation</span>
              <p className="text-lg font-bold text-teal-400 mt-0.5">{user?.reputation ?? 98}%</p>
            </div>
            <div className="rounded-2xl bg-neutral-950/60 border border-neutral-800 p-3">
              <span className="text-[10px] text-neutral-400">Network Tier</span>
              <p className="text-lg font-bold text-orange-400 mt-0.5 uppercase">{user?.role ?? 'Guardian'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Staking Banner */}
      <div className="rounded-3xl bg-neutral-900 border border-neutral-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            <span>District Staking Pools</span>
          </h3>
          <span className="text-xs font-bold text-emerald-400">+14.2% APY</span>
        </div>
        <p className="text-xs text-neutral-400">Stake VQ tokens to secure district exploration waypoints and earn weekly cultural dividends.</p>
        <button
          onClick={() => alert('Staking pool synchronized with Supabase contract.')}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-teal-500 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition hover:opacity-90"
        >
          Stake VQ Tokens
        </button>
      </div>

      {/* Transactions History */}
      <div className="space-y-3">
        <h3 className="text-base font-bold flex items-center space-x-2">
          <Wallet className="w-4 h-4 text-orange-400" />
          <span>Transaction Ledger</span>
        </h3>

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
      </div>
    </div>
  );
};
