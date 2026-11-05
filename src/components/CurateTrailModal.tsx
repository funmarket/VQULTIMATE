import React, { useState } from 'react';
import { X, Plus, Trash2, Route, Clock, Sparkles, MapPin, Compass } from 'lucide-react';
import { CommunityTrail, TrailStop, TimeOfDay, createCommunityTrail } from '../domains/d07_trails';
import { UserProfile } from '../domains/d01_auth';

interface CurateTrailModalProps {
  user: UserProfile | null;
  onClose: () => void;
  onCreated: (trail: CommunityTrail) => void;
  onToast: (msg: string) => void;
}

export const CurateTrailModal: React.FC<CurateTrailModalProps> = ({
  user,
  onClose,
  onCreated,
  onToast
}) => {
  const [isTour, setIsTour] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('FULL DAY CIRCUIT');
  const [city, setCity] = useState('Tunis, Tunisia');
  const [story, setStory] = useState('');
  const [vibeTagsInput, setVibeTagsInput] = useState('tunis, culture, sunset');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80');
  const [pricePerPerson, setPricePerPerson] = useState<number>(50);
  const [durationHours, setDurationHours] = useState<number>(4.5);
  const [flow, setFlow] = useState<string[]>(['🌅', '🌆', '🌙']);

  const [stops, setStops] = useState<TrailStop[]>([
    {
      id: 'stop-1',
      name: 'Avenue Habib Bourguiba, La Marsa, Tunis',
      address: 'Avenue Habib Bourguiba, La Marsa, Tunis',
      vibeNote: 'Morning mint tea with toasted pine nuts and fresh hot bambalouni pastries.',
      timeOfDay: 'Morning',
      durationMinutes: 60
    },
    {
      id: 'stop-2',
      name: 'Rue Hedi Zarrouk, Sidi Bou Said, Tunis',
      address: 'Rue Hedi Zarrouk, Sidi Bou Said, Tunis',
      vibeNote: 'Panoramic Mediterranean cliff views, cobalt blue doors, and jasmine blossoms.',
      timeOfDay: 'Sunset',
      durationMinutes: 90
    },
    {
      id: 'stop-3',
      name: 'Les Berges du Lac, Tunis',
      address: 'Les Berges du Lac, Tunis',
      vibeNote: 'Underground electronic music rhythm and evening lakeside lounge gathering.',
      timeOfDay: 'Night',
      durationMinutes: 90
    }
  ]);

  const [submitting, setSubmitting] = useState(false);

  const handleAddStop = () => {
    const newStop: TrailStop = {
      id: `stop-${Date.now()}`,
      name: '',
      address: '',
      vibeNote: '',
      timeOfDay: 'Afternoon',
      durationMinutes: 45
    };
    setStops([...stops, newStop]);
  };

  const handleRemoveStop = (idx: number) => {
    if (stops.length <= 1) return;
    setStops(stops.filter((_, i) => i !== idx));
  };

  const handleUpdateStop = (idx: number, field: keyof TrailStop, val: any) => {
    const updated = [...stops];
    updated[idx] = { ...updated[idx], [field]: val };
    setStops(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      onToast('Please provide a descriptive trail title.');
      return;
    }
    if (stops.some((s) => !s.name.trim())) {
      onToast('Please give a title/location to all itinerary stops.');
      return;
    }

    setSubmitting(true);
    const tags = vibeTagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const result = await createCommunityTrail({
      title: title.trim(),
      story: story.trim() || 'Community curated multi-stop cultural trail.',
      category,
      city: city.trim(),
      vibeTags: tags.length ? tags : ['culture', 'trail'],
      imageUrl,
      durationHours: Number(durationHours) || 3.5,
      isTour,
      pricePerPerson: isTour ? Number(pricePerPerson) : undefined,
      flowSequence: flow,
      authorName: user?.full_name || 'Community Pathfinder',
      authorHandle: user?.username ? `@${user.username}` : '@pathfinder',
      authorAvatarUrl: user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      stops
    });

    setSubmitting(false);
    if (result.success && result.trail) {
      onToast(isTour ? '✨ Commercial Vibe Tour published!' : '🗺️ Cultural Vibe Trail curated & published!');
      onCreated(result.trail);
      onClose();
    } else {
      onToast(result.error || 'Failed to publish trail.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full sm:max-w-lg bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl text-white max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Compass className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">
                {isTour ? 'Curate Pro Vibe Tour' : 'Curate Cultural Vibe Trail'}
              </h3>
              <p className="text-[10px] text-neutral-400">D07 Local Knowledge & Curation Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Curation Type Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-950 rounded-2xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setIsTour(false)}
              className={`py-2 px-3 rounded-xl font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                !isTour
                  ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>🧭 Free Vibe Trail</span>
            </button>
            <button
              type="button"
              onClick={() => setIsTour(true)}
              className={`py-2 px-3 rounded-xl font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                isTour
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>⬡ Pro Vibe Tour</span>
            </button>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-neutral-300">Trail Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Golden Day in Tunis: Coastal Coffee to Late Night Beats"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Category & City */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-300">Category Tag</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="FULL DAY CIRCUIT">FULL DAY CIRCUIT</option>
                <option value="ANTIQUITY & COAST">ANTIQUITY & COAST</option>
                <option value="HERITAGE & ARCHITECTURE">HERITAGE & ARCHITECTURE</option>
                <option value="VIBRANT AESTHETICS">VIBRANT AESTHETICS</option>
                <option value="FOOD & SEA BREEZE">FOOD & SEA BREEZE</option>
                <option value="VIP GUIDED TOUR">VIP GUIDED TOUR</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-300">City / Location</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Tunis, Tunisia"
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* If Tour: Price */}
          {isTour && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 text-xs">Commercial Tour Pricing</span>
                <span className="text-[10px] text-neutral-400">Guaranteed D22 Handshake</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-neutral-300">$</span>
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={pricePerPerson}
                  onChange={(e) => setPricePerPerson(Number(e.target.value))}
                  className="w-28 px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-amber-400"
                />
                <span className="text-xs text-neutral-400">per person (USD)</span>
              </div>
            </div>
          )}

          {/* Story Narrative */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-neutral-300">Atmospheric Narrative & Story</label>
            <textarea
              rows={2}
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="A complete sunup-to-late-night circuit through the soul of northern Tunis..."
              className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Tags & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-300">Vibe Tags (comma-separated)</label>
              <input
                type="text"
                value={vibeTagsInput}
                onChange={(e) => setVibeTagsInput(e.target.value)}
                placeholder="tunis, culture, sunset"
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-300">Estimated Duration (~hours)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Time Flow Sequence Picker */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-neutral-300">Time Flow Sequence</label>
            <div className="flex items-center space-x-2">
              {['🌅 Morning', '☀️ Afternoon', '🌆 Sunset', '🌙 Night'].map((item) => {
                const emoji = item.split(' ')[0];
                const active = flow.includes(emoji);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      if (active) {
                        if (flow.length > 1) setFlow(flow.filter((e) => e !== emoji));
                      } else {
                        setFlow([...flow, emoji]);
                      }
                    }}
                    className={`px-2.5 py-1.5 rounded-xl border font-bold text-[11px] transition cursor-pointer flex items-center space-x-1 ${
                      active
                        ? 'bg-neutral-800 text-emerald-300 border-emerald-500/50'
                        : 'bg-neutral-950 text-neutral-500 border-neutral-800'
                    }`}
                  >
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Itinerary Stops Builder */}
          <div className="space-y-2 pt-2 border-t border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs flex items-center space-x-1.5">
                <Route className="w-3.5 h-3.5 text-emerald-400" />
                <span>Itinerary Stops ({stops.length} Stops)</span>
              </span>
              <button
                type="button"
                onClick={handleAddStop}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Stop</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {stops.map((stop, idx) => (
                <div key={stop.id} className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center text-[10px] font-black">
                      {idx + 1}
                    </span>
                    <div className="flex items-center space-x-2">
                      <select
                        value={stop.timeOfDay}
                        onChange={(e) => handleUpdateStop(idx, 'timeOfDay', e.target.value as TimeOfDay)}
                        className="px-2 py-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 text-[10px]"
                      >
                        <option value="Morning">🌅 Morning</option>
                        <option value="Afternoon">☀️ Afternoon</option>
                        <option value="Sunset">🌆 Sunset</option>
                        <option value="Night">🌙 Night</option>
                        <option value="Flexible">✨ Flexible</option>
                      </select>
                      {stops.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStop(idx)}
                          className="p-1 rounded-lg text-neutral-500 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    type="text"
                    required
                    value={stop.name}
                    onChange={(e) => {
                      handleUpdateStop(idx, 'name', e.target.value);
                      handleUpdateStop(idx, 'address', e.target.value);
                    }}
                    placeholder="Stop location / landmark name"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-emerald-500"
                  />

                  <input
                    type="text"
                    value={stop.vibeNote}
                    onChange={(e) => handleUpdateStop(idx, 'vibeNote', e.target.value)}
                    placeholder="Pro-tip or vibe note (e.g. Try pine-nut tea, sunset view...)"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 placeholder-neutral-600 text-[11px] focus:outline-none focus:border-emerald-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center space-x-2 shadow-lg ${
                isTour
                  ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/20'
                  : 'bg-[#00e599] hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{submitting ? 'Publishing...' : isTour ? 'Publish Vibe Tour' : 'Publish Cultural Vibe Trail'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
