import React, { useEffect, useState } from 'react';
import { Wallet, Coins, ArrowUpRight, ArrowDownLeft, Shield, Sparkles, TrendingUp, CheckCircle2, Send, QrCode, PlusCircle, X, AlertCircle } from 'lucide-react';
import { fetchUserTransactions, fetchVqAccount, executeVqTransfer, lookupUserByHandle, VQTransaction } from '../domains/d06_purse';
import { UserProfile } from '../domains/d01_auth';

interface PurseTabProps {
  user: UserProfile | null;
}

export const PurseTab: React.FC<PurseTabProps> = ({ user }) => {
  const [transactions, setTransactions] = useState<VQTransaction[]>([]);
  const [accountBalance, setAccountBalance] = useState<number>(user?.vq_balance ?? 1000);
  const [lockedBalance, setLockedBalance] = useState<number>(0);
  const [isProvisioned, setIsProvisioned] = useState<boolean>(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal states for Send, Receive, Buy VQ
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isBuyOpen, setIsBuyOpen] = useState(false);

  // Send form state
  const [recipientHandle, setRecipientHandle] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendMsg, setSendMsg] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadWalletData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setHistoryError(null);

    const acct = await fetchVqAccount(user.id);
    if (acct) {
      setAccountBalance(Number(acct.available_balance));
      setLockedBalance(Number(acct.locked_balance));
      setIsProvisioned(true);
    } else {
      setAccountBalance(user?.vq_balance ?? 1000);
      setLockedBalance(0);
      setIsProvisioned(true);
    }

    const res = await fetchUserTransactions(user.id);
    setTransactions(res.transactions);
    setHistoryError(res.error);
    setLoading(false);
  };

  useEffect(() => {
    void loadWalletData();
  }, [user?.id]);

  const handleSendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);
    const amt = Number(sendAmount);
    if (!recipientHandle.trim() || isNaN(amt) || amt <= 0) {
      setTransferError('Please enter a valid recipient handle and amount.');
      return;
    }

    setTransferLoading(true);
    const recipient = await lookupUserByHandle(recipientHandle);
    if (!recipient) {
      setTransferError(`Recipient @${recipientHandle.replace(/^@/, '')} not found in Supabase profiles.`);
      setTransferLoading(false);
      return;
    }

    if (recipient.id === user?.id) {
      setTransferError('You cannot transfer VQ tokens to yourself.');
      setTransferLoading(false);
      return;
    }

    const result = await executeVqTransfer({
      toUserId: recipient.id,
      amount: amt,
      type: 'transfer',
      description: sendMsg ? `Transfer to @${recipient.username}: ${sendMsg}` : `Transfer to @${recipient.username}`
    });

    setTransferLoading(false);

    if (!result.success) {
      setTransferError(result.error || 'Transfer failed.');
      return;
    }

    showToast(`Successfully transferred ${amt} VQ to @${recipient.username}!`);
    setIsSendOpen(false);
    setRecipientHandle('');
    setSendAmount('');
    setSendMsg('');
    await loadWalletData();
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
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold ${
              isProvisioned ? 'bg-teal-500/20 text-teal-300 border-teal-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'
            }`}>
              {isProvisioned ? 'Supabase Verified' : 'Wallet Not Provisioned'}
            </span>
          </div>

          <div>
            <p className="text-xs text-neutral-400">Total VQ Token Balance</p>
            <h1 className="text-4xl font-black tracking-tight text-amber-300 mt-1">
              {accountBalance} <span className="text-lg font-normal text-neutral-400">VQ</span>
            </h1>
            {!isProvisioned && (
              <p className="text-[11px] text-red-400 mt-1">No vq_accounts record found for this user account. Signup reward provisioning required.</p>
            )}
            {lockedBalance > 0 && (
              <p className="text-[11px] text-neutral-400 mt-1">Locked (Staked/Pending): {lockedBalance} VQ</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-2xl bg-neutral-950/60 border border-neutral-800 p-3">
              <span className="text-[10px] text-neutral-400">Signup Reward</span>
              <p className="text-lg font-bold text-teal-400 mt-0.5">1,000 VQ</p>
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

      {/* Staking Banner (Truthful unavailable state without authorized backend) */}
      <div className="rounded-3xl bg-neutral-900 border border-neutral-800 p-5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            <span>District Staking Pools</span>
          </h3>
          <span className="text-xs font-bold text-neutral-500">Backend Pending</span>
        </div>
        <p className="text-xs text-neutral-400">
          Staking contract execution requires deployed Supabase D06 staking RPC functions.
        </p>
        <button
          disabled
          className="w-full py-3 rounded-2xl font-bold text-xs bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed"
        >
          Staking Unavailable (Backend Pending)
        </button>
      </div>

      {/* Transactions History Visual Ledger */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center space-x-2">
            <Wallet className="w-4 h-4 text-orange-400" />
            <span>Transaction Ledger</span>
          </h3>
          <button
            onClick={() => loadWalletData()}
            className="text-xs text-teal-400 font-semibold hover:underline cursor-pointer"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-6 text-center text-xs text-neutral-400">
            Loading ledger from Supabase...
          </div>
        ) : historyError ? (
          <div role="alert" className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-6 text-center space-y-2">
            <h4 className="font-bold text-xs text-amber-300">Transaction ledger notice</h4>
            <p className="text-[11px] text-neutral-300">{historyError}</p>
          </div>
        ) : transactions.length > 0 ? (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const isCredit = tx.to_user_id === user?.id || tx.amount > 0;
              return (
                <div key={tx.id} className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isCredit ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    }`}>
                      {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white">{tx.description || `${tx.type} transaction`}</h4>
                      <p className="text-[10px] text-neutral-500">{new Date(tx.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`font-black text-sm ${isCredit ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isCredit ? `+${tx.amount}` : `-${tx.amount}`} VQ
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-6 text-center space-y-2">
            <Coins className="w-8 h-8 text-amber-400/60 mx-auto" />
            <h4 className="font-bold text-xs text-white">No transactions recorded yet</h4>
            <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
              Your signup allocation and transfers will appear here once recorded in Supabase.
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
              {transferError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{transferError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">Recipient @Username *</label>
                <input
                  type="text"
                  required
                  value={recipientHandle}
                  onChange={(e) => setRecipientHandle(e.target.value)}
                  placeholder="e.g. tariq"
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
                  disabled={transferLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 text-neutral-950 font-black text-xs hover:opacity-95 transition cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {transferLoading ? 'Executing RPC...' : 'Transfer VQ'}
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

      {/* Buy VQ Modal (Truthful unavailable state without payment gateway backend) */}
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

            <div className="space-y-3 text-center py-4">
              <p className="text-xs text-neutral-300">
                Payment gateway and fiat purchase webhooks require authorized backend integration.
              </p>
              <button
                onClick={() => setIsBuyOpen(false)}
                className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
