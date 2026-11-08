import React, { useState } from 'react';
import { X, Zap, Clock, Shield, AlertCircle } from 'lucide-react';
import { createFlashEvent } from '../domains/d11_events';
import { UserProfile } from '../domains/d01_auth';

interface CreateFlashModalProps {
  user: UserProfile | null;
  canCreate: boolean;
  onClose: () => void;
  onCreated: () => void;
  onToast: (msg: string) => void;
}

export const CreateFlashModal: React.FC<CreateFlashModalProps> = ({
  user,
  canCreate,
  onClose,
  onCreated,
  onToast
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState('secret_party');
  const [durationMins, setDurationMins] = useState('120');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAdmin = canCreate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isAdmin) {
      setErrorMsg('Unauthorized: Only server-verified platform administrators can create Flash Events.');
      return;
    }
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Please enter a title and description for the Flash Event.');
      return;
    }

    setLoading(true);
    const startsAt = new Date().toISOString();
    const endsAt = new Date(Date.now() + Number(durationMins) * 60 * 1000).toISOString();

    const res = await createFlashEvent({
      title: title.trim(),
      description: description.trim(),
      kind,
      starts_at: startsAt,
      ends_at: endsAt,
      created_by: user?.id
    });

    setLoading(false);
    if (res.success) {
      onToast('⚡ Flash Event successfully spawned on Home network!');
      onCreated();
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to spawn flash event. Check Supabase RLS / table schema.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-white space-y-5 relative">
        <button
          onClick={onClose}
          aria-label="Close Create Flash Modal"
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-2 rounded-full bg-neutral-950 border border-neutral-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/40">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-lg text-white">Create Flash Event</h3>
            <p className="text-xs text-neutral-400">D11 Events & Business Authority Protocol</p>
          </div>
        </div>

        {!isAdmin && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span>Only authorized platform administrators can create Flash Events.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">Event Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Secret Pop-up Gallery"
              className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:outline-none focus:border-orange-500 transition"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">Description & Rules</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="An exclusive underground installation..."
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:outline-none focus:border-orange-500 transition resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">Category / Kind</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="w-full px-3 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:outline-none focus:border-orange-500 transition"
              >
                <option value="secret_party">Secret Party</option>
                <option value="after_hours">After Hours</option>
                <option value="happy_hour">Happy Hour</option>
                <option value="limited_promo">Limited Promo</option>
                <option value="private_game">Private Game</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-300">Duration (Minutes)</label>
              <select
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
                className="w-full px-3 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:outline-none focus:border-orange-500 transition"
              >
                <option value="30">30 mins</option>
                <option value="60">60 mins</option>
                <option value="120">120 mins (2 hours)</option>
                <option value="360">360 mins (6 hours)</option>
              </select>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isAdmin}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-orange-500/30 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Spawning...' : 'Spawn Flash Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
