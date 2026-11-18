import React from 'react';
import { Shield, Sparkles, Plus, Trash2, CheckCircle2 } from 'lucide-react';
type GuardianType = 'pro' | 'local';
type GuardianTrailItem = { id: string; title: string; link?: string; flatPrice?: number };

interface GuardianProfileFormStepProps {
  capturedPhotoUrl: string;
  guardianType: GuardianType;
  setGuardianType: (t: GuardianType) => void;
  name: string;
  setName: (n: string) => void;
  city: string;
  setCity: (c: string) => void;
  pricingType: 'hourly' | 'flat';
  setPricingType: (p: 'hourly' | 'flat') => void;
  hourlyRate: number;
  setHourlyRate: (r: number) => void;
  flatRate: number;
  setFlatRate: (r: number) => void;
  bio: string;
  setBio: (b: string) => void;
  trails: GuardianTrailItem[];
  onRemoveTrail: (index: number) => void;
  availableTrails?: GuardianTrailItem[];
  onAddTrail?: (id: string) => void;
  onRetakePhoto: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting?: boolean;
  error?: string | null;
  proEligible?: boolean;
}

export const GuardianProfileFormStep: React.FC<GuardianProfileFormStepProps> = ({
  capturedPhotoUrl,
  guardianType,
  setGuardianType,
  name,
  setName,
  city,
  setCity,
  pricingType,
  setPricingType,
  hourlyRate,
  setHourlyRate,
  flatRate,
  setFlatRate,
  bio,
  setBio,
  trails,
  onRemoveTrail,
  availableTrails = [],
  onAddTrail,
  onRetakePhoto,
  onSubmit,
  submitting = false,
  error,
  proEligible = false,
}) => {
  return (
    <form onSubmit={onSubmit} className="p-5 space-y-4">
      {/* Selfie Verified Header */}
      <div className="flex items-center gap-3 bg-[#F0F2F5] dark:bg-zinc-950 p-3 rounded-2xl border border-[#E4E6EB] dark:border-white/5">
        <img
          src={capturedPhotoUrl && capturedPhotoUrl.trim() !== '' ? capturedPhotoUrl : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
          alt="Captured In-App Selfie"
          className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500 dark:border-emerald-400"
        />
        <div className="flex-1 text-left">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Live Snapshot Captured
          </div>
          <span className="text-[10px] text-[#65676B] dark:text-zinc-500 font-mono">Save to record verification timestamp</span>
        </div>
        <button
          type="button"
          onClick={onRetakePhoto}
          className="text-[11px] text-[#0866FF] dark:text-purple-400 font-mono font-semibold hover:underline cursor-pointer"
        >
          Retake
        </button>
      </div>

      {/* Role Selection */}
      <div className="space-y-1.5 text-left">
        <label className="text-xs font-mono font-bold text-[#65676B] dark:text-zinc-400 uppercase">Guardian Role</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setGuardianType('local')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              guardianType === 'local'
                ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                : 'bg-[#F0F2F5] dark:bg-zinc-900 border-[#DBDBDB] dark:border-white/5 text-[#262626] dark:text-zinc-400'
            }`}
          >
            <span className="text-xs font-black block">Local Legend</span>
            <span className="text-[10px] text-[#65676B] dark:text-zinc-500 block">Free community guide</span>
          </button>

          <button
            type="button"
            onClick={() => setGuardianType('pro')}
            disabled={!proEligible}
            title={proEligible ? 'Pro Guardian' : 'An existing Pro account is required'}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              guardianType === 'pro'
                ? 'bg-[#E7F3FF] dark:bg-purple-600/20 border-[#0866FF] dark:border-purple-500/40 text-[#0866FF] dark:text-purple-200'
                : 'bg-[#F0F2F5] dark:bg-zinc-900 border-[#DBDBDB] dark:border-white/5 text-[#262626] dark:text-zinc-400'
            }`}
          >
            <span className="text-xs font-black block flex items-center gap-1">
              <Shield className="w-3 h-3 text-amber-500 dark:text-amber-400" /> Pro Guardian
            </span>
            <span className="text-[10px] text-[#65676B] dark:text-zinc-500 block">Paid commercial host</span>
          </button>
        </div>
      </div>

      {/* Basic Profile Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        <div className="space-y-1">
          <label className="text-[11px] font-mono text-[#65676B] dark:text-zinc-400">Full / Display Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#F0F2F5] dark:bg-zinc-900 border border-[#DBDBDB] dark:border-white/10 rounded-xl px-3 py-2 text-xs text-[#050505] dark:text-white focus:outline-none focus:border-[#0866FF]"
            placeholder="e.g. Yassine B."
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-mono text-[#65676B] dark:text-zinc-400">Operating City</label>
          <input
            type="text"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-[#F0F2F5] dark:bg-zinc-900 border border-[#DBDBDB] dark:border-white/10 rounded-xl px-3 py-2 text-xs text-[#050505] dark:text-white focus:outline-none focus:border-[#0866FF]"
            placeholder="e.g. Tunis"
          />
        </div>
      </div>

      {/* Pricing Settings (Pro only) */}
      {guardianType === 'pro' && (
        <div className="p-3.5 rounded-2xl bg-[#FAFAFA] dark:bg-purple-950/20 border border-[#DBDBDB] dark:border-purple-500/30 text-left space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 font-mono">Pricing Mode</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPricingType('hourly')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                  pricingType === 'hourly' ? 'bg-amber-400 text-black' : 'bg-[#EFEFEF] dark:bg-zinc-800 text-[#65676B] dark:text-zinc-400'
                }`}
              >
                Hourly
              </button>
              <button
                type="button"
                onClick={() => setPricingType('flat')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                  pricingType === 'flat' ? 'bg-amber-400 text-black' : 'bg-[#EFEFEF] dark:bg-zinc-800 text-[#65676B] dark:text-zinc-400'
                }`}
              >
                Flat Tour
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#050505] dark:text-white font-mono">$</span>
            <input
              type="number"
              min={10}
              max={500}
              value={pricingType === 'hourly' ? hourlyRate : flatRate}
              onChange={(e) =>
                pricingType === 'hourly'
                  ? setHourlyRate(Number(e.target.value))
                  : setFlatRate(Number(e.target.value))
              }
              className="w-24 bg-[#F0F2F5] dark:bg-zinc-900 border border-[#DBDBDB] dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-[#050505] dark:text-white font-mono font-bold focus:outline-none focus:border-[#0866FF]"
            />
            <span className="text-xs text-[#65676B] dark:text-zinc-400 font-mono">
              {pricingType === 'hourly' ? '/ hour' : 'flat rate per tour'}
            </span>
          </div>
        </div>
      )}

      {/* Bio / Story */}
      <div className="space-y-1 text-left">
        <label className="text-[11px] font-mono text-[#65676B] dark:text-zinc-400">Bio & Experience</label>
        <textarea
          rows={3}
          required
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell travelers what makes your tours special and which neighborhoods you specialize in..."
          className="w-full bg-[#F0F2F5] dark:bg-zinc-900 border border-[#DBDBDB] dark:border-white/10 rounded-xl p-3 text-xs text-[#050505] dark:text-white placeholder-[#65676B] dark:placeholder-zinc-500 resize-none focus:outline-none focus:border-[#0866FF]"
        />
      </div>

      <div className="space-y-2 text-left">
        <label className="text-[11px] font-mono text-[#65676B] dark:text-zinc-400">Associated Vibe Trails (up to 5)</label>
        <select aria-label="Add associated Vibe Trail" value="" disabled={trails.length >= 5}
          onChange={event => { if (event.target.value) onAddTrail?.(event.target.value); }}
          className="w-full min-w-0 bg-[#F0F2F5] dark:bg-zinc-900 border border-[#DBDBDB] dark:border-white/10 rounded-xl px-3 py-2 text-xs text-[#050505] dark:text-white focus:outline-none focus:border-[#0866FF]">
          <option value="">Select an existing real Trail</option>
          {availableTrails.filter(item => !trails.some(trail => trail.id === item.id)).map(item => (
            <option key={item.id} value={item.id}>{item.title}</option>
          ))}
        </select>
        {trails.map((trail, index) => (
          <div key={trail.id} className="flex items-center justify-between min-w-0 gap-2 text-xs text-[#262626] dark:text-zinc-300">
            <span className="truncate">{trail.title}</span>
            <button type="button" onClick={() => onRemoveTrail(index)} className="text-[#0866FF] dark:text-purple-300 font-semibold shrink-0">Remove</button>
          </div>
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all"
      >
        {submitting ? 'Saving Guardian…' : 'Complete Registration'}
      </button>
    </form>
  );
};
