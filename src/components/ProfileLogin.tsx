import React, { useState } from 'react';
import { signInWithEmail, UserProfile } from '../domains/d01_auth';
import { AlertTriangle, Key, User, X } from 'lucide-react';

interface LoginModalProps {
  onSuccess?: (profile: UserProfile) => void;
  onCancel?: () => void;
  onSwitchToRegister?: () => void;
}

export const ProfileLogin: React.FC<LoginModalProps> = ({ onSuccess, onCancel, onSwitchToRegister }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim()) {
      setError("Enter your email address or @username.");
      return;
    }
    if (!password) {
      setError("Decryption password is required.");
      return;
    }

    setLoading(true);
    try {
      const profile = await signInWithEmail(identifier, password);
      setLoading(false);
      onSuccess?.(profile);
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "Invalid handle or decryption seed.");
    }
  };

  return (
    <div className="bg-zinc-950 border border-white/20 rounded-3xl p-6 w-full max-w-sm mx-auto text-left space-y-6 text-white relative select-none">
      
      {/* Top Header */}
      <div className="flex justify-between items-center pb-2.5 border-b border-white/10">
        <div>
          <h3 className="font-extrabold text-md uppercase tracking-tight italic flex items-center gap-1.5">
            <span className="text-vibe-primary">🔑</span> Identify Citizen
          </h3>
          <p className="text-[9px] font-mono tracking-wider text-zinc-500 mt-0.5">
            SECURE ACCOUNT SIGN IN
          </p>
        </div>
        
        {onCancel && (
          <button 
            onClick={onCancel}
            className="text-zinc-500 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Connection Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl flex items-start gap-2 text-xs text-red-400 animate-pulse font-mono">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* Handle Input */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1">
            <User className="w-3 h-3 text-vibe-primary" /> Email or @username
          </label>
          <input
            type="text"
            placeholder="Email or @username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            className="w-full h-11 px-3.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-200 outline-none focus:border-vibe-primary font-mono transition-colors"
          />
        </div>

        {/* Password Input */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1">
            <Key className="w-3 h-3 text-vibe-primary" /> Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full h-11 px-3.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-200 outline-none focus:border-vibe-primary font-mono transition-colors"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-855 disabled:text-zinc-500 rounded-xl flex items-center justify-center font-bold tracking-[0.1em] text-xs uppercase italic transition-colors cursor-pointer"
        >
          {loading ? "Warming up your stove..." : "Sign Into VibeQuest"}
        </button>
      </form>

      {/* Switch options */}
      {onSwitchToRegister && (
        <div className="text-center pt-2 text-[10px] text-zinc-500 font-mono">
          <span>NEW TO THE CIRCLE? </span>
          <button 
            onClick={onSwitchToRegister}
            className="text-vibe-primary hover:underline uppercase font-bold"
          >
            Create Profile
          </button>
        </div>
      )}

    </div>
  );
};
