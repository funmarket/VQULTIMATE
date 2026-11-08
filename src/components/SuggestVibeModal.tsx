import React, { useState } from 'react';
import { X, Sparkles, Send } from 'lucide-react';

interface SuggestVibeModalProps {
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const SuggestVibeModal: React.FC<SuggestVibeModalProps> = ({ onClose, onToast }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'place' | 'event' | 'vibe'>('place');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      onToast('Please enter both title and description.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onToast('Vibe suggestion successfully submitted to review queue.');
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-5 shadow-2xl text-white">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Suggest a Vibe</h3>
              <p className="text-[11px] text-neutral-400">Submit a local recommendation for community review</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1">Suggestion Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['place', 'event', 'vibe'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-2 rounded-xl text-xs font-bold uppercase transition cursor-pointer ${category === cat ? 'bg-teal-500 text-neutral-950 shadow-lg' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midnight Rooftop Lounge"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1">Description & Location Notes</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Why is this spot special? Include location details..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500 resize-none"
            />
          </div>

          <div className="pt-2 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-orange-500 text-neutral-950 font-black text-xs transition cursor-pointer shadow-lg flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting...' : 'Submit Suggestion'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
