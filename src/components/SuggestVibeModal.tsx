import React, { useState } from 'react';
import { X } from 'lucide-react';
import { SuggestionCategory } from '../domains/d11_events';

interface SuggestVibeModalProps {
  onClose: () => void;
  onSubmit: (value: { title: string; description: string; category: SuggestionCategory }) => Promise<{ success: boolean; error?: string }>;
  onSubmitted: () => void;
}

export const SuggestVibeModal: React.FC<SuggestVibeModalProps> = ({ onClose, onSubmit, onSubmitted }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SuggestionCategory>('place');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError('');
    try {
      const result = await onSubmit({ title, description, category });
      if (result.success) onSubmitted();
      else setError(result.error || 'Could not submit your suggestion.');
    } catch {
      setError('Could not submit your suggestion.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/85 p-4 backdrop-blur-sm" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="suggest-vibe-title"
        className="w-full max-w-sm space-y-4 rounded-3xl border border-[#DBDBDB] dark:border-fuchsia-500/60 bg-white dark:bg-[#1c1923] p-5 text-[#050505] dark:text-white shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <h2 id="suggest-vibe-title" className="text-xl font-black text-[#050505] dark:text-white">Suggest a Vibe</h2>
          <button type="button" onClick={onClose} aria-label="Close Suggest Vibe" className="rounded-xl p-2 text-[#65676B] dark:text-neutral-300 hover:bg-[#EFEFEF] dark:hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-[#65676B] dark:text-neutral-300">Suggest a genuine place, upcoming event or vibe. Submissions require review; they are not published automatically.</p>
        <form onSubmit={event => { void submit(event); }} className="space-y-3">
          <label className="block text-xs font-bold text-[#262626] dark:text-neutral-200">
            Category
            <select value={category} onChange={event => setCategory(event.target.value as SuggestionCategory)}
              className="mt-1 w-full rounded-xl border border-[#DBDBDB] dark:border-neutral-700 bg-[#F0F2F5] dark:bg-neutral-950 p-3 text-sm text-[#050505] dark:text-white focus:outline-none focus:border-[#0866FF]">
              <option value="place">Place</option>
              <option value="event">Event</option>
              <option value="vibe">Vibe</option>
            </select>
          </label>
          <label className="block text-xs font-bold text-[#262626] dark:text-neutral-200">
            Title
            <input type="text" value={title} minLength={3} maxLength={120} required
              onChange={event => setTitle(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#DBDBDB] dark:border-neutral-700 bg-[#F0F2F5] dark:bg-neutral-950 p-3 text-sm text-[#050505] dark:text-white placeholder-[#65676B] dark:placeholder-neutral-500 focus:outline-none focus:border-[#0866FF]"
              placeholder="Name of the place, event or vibe" />
          </label>
          <label className="block text-xs font-bold text-[#262626] dark:text-neutral-200">
            Details
            <textarea value={description} minLength={10} maxLength={1000} required rows={4}
              onChange={event => setDescription(event.target.value)}
              className="mt-1 w-full resize-y rounded-xl border border-[#DBDBDB] dark:border-neutral-700 bg-[#F0F2F5] dark:bg-neutral-950 p-3 text-sm text-[#050505] dark:text-white placeholder-[#65676B] dark:placeholder-neutral-500 focus:outline-none focus:border-[#0866FF]"
              placeholder="What makes it worth exploring?" />
          </label>
          {error && <p role="alert" className="text-xs text-red-600 dark:text-red-300">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-[#DBDBDB] dark:border-neutral-700 bg-[#EFEFEF] dark:bg-transparent text-[#050505] dark:text-white hover:bg-[#E4E6EB] dark:hover:bg-white/5 p-3 text-xs font-bold transition">Cancel</button>
            <button type="submit" disabled={sending} className="flex-1 rounded-xl bg-[#0866FF] hover:bg-[#075CE5] dark:bg-white dark:hover:bg-neutral-200 p-3 text-xs font-black text-white dark:text-neutral-950 disabled:opacity-50 transition">
              {sending ? 'Submitting...' : 'Submit for review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
