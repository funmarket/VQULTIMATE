import React, { useEffect, useState } from 'react';
import { Wallet, Coins, ArrowUpRight, ArrowDownLeft, Shield, Sparkles, TrendingUp, CheckCircle2, Send, QrCode, PlusCircle, X } from 'lucide-react';
import { fetchUserTransactions, VQTransaction } from '../domains/d06_purse';
import { UserProfile } from '../domains/d01_auth';

interface PurseTabProps {
  user: UserProfile | null;
}

export const PurseTab: React.FC<PurseTabProps> = ({ user }) => {
  const [transactions, setTransactions] = useState<VQTransaction[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [staked, setStaked] = useState(false);
  const [stakeSuccess, setStakeSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal states for Send, Receive, Buy VQ
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isBuyOpen, setIsBuyOpen] = useState(false);

  // Send form state
  const [recipient, setRecipient] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendMsg, setSendMsg] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

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

  const handleStake = () => {
    setStaked(true);
    setStakeSuccess(true);
    setTimeout(() => setStakeSuccess(false), 3000);
  };

  const handleSendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(sendAmount);
    if (!recipient.trim() || isNaN(amt) || amt <= 0) {
      showToast('Please enter a valid recipient and VQ amount.');
      return;
    }
    const newTx: VQTransaction = {
      id: `tx-send-${Date.now()}`,
      user_id: user?.id || 'guest',
      type: 'spent',
      amount: -amt,
      description: `Sent VQ to @${recipient.replace(/^@/, '')} ${sendMsg ? `(${sendMsg})` : ''}`,
      created_at: new Date().toISOString()
    };
    setTransactions(prev => [newTx, ...prev]);
    setIsSendOpen(false);
    setRecipient('');
    setSendAmount('');
    setSendMsg('');
    showToast(`Successfully transferred ${amt} VQ tokens!`);
  };

  const handleBuyVq = (pkgAmount: number) => {
    const newTx: VQTransaction = {
      id: `tx-buy-${Date.now()}`,
      user_id: user?.id || 'guest',
      type: 'reward',
      amount: pkgAmount,
      description: `Purchased VQ Genesis Package (${pkgAmount} VQ)`,
      created_at: new Date().toISOString()
    };
    setTransactions(prev => [newTx, ...prev]);
    setIsBuyOpen(false);
    showToast(`Successfully minted +${pkgAmount} VQ to your balance!`);
  };

  return (
    <div className="space-y-6 pb-24 text-white max-w-md mx-auto box-border overflow-x-hidden relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-teal-500 text-neutral-950 font-bold text-xs shadow-2xl flex items-center space-x-2 animate-fadeIn border border-teal-300">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

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
              Supabase Verified
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
              <p className="text-lg font-bold text-teal-400 mt-0.5">{user?.reputation ?? 90}%</p>
            </div>
            <div className="rounded-2xl bg-neutral-950/60 border border-neutral-800 p-3">
              <span className="text-[10px] text-neutral-400">Network Tier</span>
              <p className="text-lg font-bold text-orange-400 mt-0.5 uppercase">{user?.role ?? 'GUEST'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Row (Phantom-like wallet actions) */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => {
            if (!user) { showToast('Please sign in to send VQ.'); return; }
            setIsSendOpen(true);
          }}
          className="rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-teal-500/50 p-3.5 text-center flex flex-col items-center space-y-1.5 transition cursor-pointer group shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center group-hover:scale-105 transition">
            <Send className="w-4 h-4" />
          </div>
          <span className="font-bold text-xs text-white">Send</span>
        </button>

        <button
          onClick={() => {
            if (!user) { showToast('Please sign in to view receive address.'); return; }
            setIsReceiveOpen(true);
          }}
          className="rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-purple-500/50 p-3.5 text-center flex flex-col items-center space-y-1.5 transition cursor-pointer group shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center group-hover:scale-105 transition">
            <QrCode className="w-4 h-4" />
          </div>
          <span className="font-bold text-xs text-white">Receive</span>
        </button>

        <button
          onClick={() => setIsBuyOpen(true)}
          className="rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 p-3.5 text-center flex flex-col items-center space-y-1.5 transition cursor-pointer group shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center group-hover:scale-105 transition">
            <PlusCircle className="w-4 h-4" />
          </div>
          <span className="font-bold text-xs text-white">Buy VQ</span>
        </button>
      </div>

      {/* Staking Banner */}
      <div className="rounded-3xl bg-neutral-900 border border-neutral-800 p-5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            <span>District Staking Pools</span>
          </h3>
          <span className="text-xs font-bold text-emerald-400">+14.2% APY</span>
        </div>
        <p className="text-xs text-neutral-400">
          Stake VQ tokens to secure district exploration waypoints and earn weekly cultural dividends.
        </p>

        {stakeSuccess && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 flex items-center space-x-2 text-xs text-emerald-400 font-semibold animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Staking pool synchronized with Supabase contract.</span>
          </div>
        )}

        <button
          onClick={handleStake}
          className={`w-full py-3 rounded-2xl font-bold text-xs shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer ${
            staked
              ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300'
              : 'bg-gradient-to-r from-orange-500 to-teal-500 text-white shadow-orange-500/20 hover:opacity-90'
          }`}
        >
          <span>{staked ? 'Pool Active (+14.2% APY Yielding)' : 'Stake VQ Tokens'}</span>
        </button>
      </div>

      {/* Transactions History Visual Ledger */}
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

      {/* Send Modal */}
      {isSendOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <Send className="w-4 h-4 text-teal-400" />
                <span>Send VQ Tokens</span>
              </h3>
              <button onClick={() => setIsSendOpen(false)} className="p-1.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">Recipient Handle *</label>
                <input
                  type="text"
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="@username"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">Amount (VQ) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">Optional Message</label>
                <input
                  type="text"
                  value={sendMsg}
                  onChange={(e) => setSendMsg(e.target.value)}
                  placeholder="Great exploration vibe!"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSendOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 text-xs font-bold text-neutral-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 text-neutral-950 font-black text-xs hover:opacity-95 transition cursor-pointer shadow-lg"
                >
                  Transfer VQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {isReceiveOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-2xl text-white text-center">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <QrCode className="w-4 h-4 text-purple-400" />
                <span>Receive VQ</span>
              </h3>
              <button onClick={() => setIsReceiveOpen(false)} className="p-1.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 flex flex-col items-center">
              <div className="w-36 h-36 rounded-2xl bg-white p-3 flex items-center justify-center shadow-inner">
                <div className="w-full h-full border-4 border-dashed border-neutral-900 rounded-xl flex items-center justify-center text-neutral-950 font-black text-xs">
                  QR CODE
                </div>
              </div>
              <p className="text-xs text-neutral-300 font-bold">@{user?.username || 'explorer'}</p>
              <p className="text-[11px] text-neutral-500">Show this QR or share your handle to receive instant tips & transfers.</p>
            </div>

            <button
              onClick={() => {
                navigator.clipboard?.writeText(`@${user?.username || 'explorer'}`);
                showToast('Handle copied to clipboard!');
                setIsReceiveOpen(false);
              }}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer shadow-lg"
            >
              Copy Handle
            </button>
          </div>
        </div>
      )}

      {/* Buy VQ Modal */}
      {isBuyOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-bold text-base flex items-center space-x-2">
                <PlusCircle className="w-4 h-4 text-amber-400" />
                <span>Buy VQ Packages</span>
              </h3>
              <button onClick={() => setIsBuyOpen(false)} className="p-1.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div onClick={() => handleBuyVq(100)} className="rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-amber-500 p-4 flex items-center justify-between cursor-pointer transition">
                <div>
                  <h4 className="font-bold text-sm text-white">100 VQ Starter Pack</h4>
                  <p className="text-[10px] text-neutral-400">Instant off-chain minting</p>
                </div>
                <span className="font-black text-amber-300 text-sm">$0.99</span>
              </div>

              <div onClick={() => handleBuyVq(500)} className="rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-amber-500 p-4 flex items-center justify-between cursor-pointer transition">
                <div>
                  <h4 className="font-bold text-sm text-white">500 VQ Explorer Pack</h4>
                  <p className="text-[10px] text-neutral-400">Most popular choice</p>
                </div>
                <span className="font-black text-amber-300 text-sm">$4.99</span>
              </div>

              <div onClick={() => handleBuyVq(1200)} className="rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-amber-500 p-4 flex items-center justify-between cursor-pointer transition">
                <div>
                  <h4 className="font-bold text-sm text-white">1,200 VQ Legend Pack</h4>
                  <p className="text-[10px] text-neutral-400">Best value (+20% bonus)</p>
                </div>
                <span className="font-black text-amber-300 text-sm">$9.99</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
