import React from 'react';
import { CalendarClock, Clock, MapPin, X } from 'lucide-react';
import { FlashEvent } from '../domains/d11_events';
import { VibePlace } from '../domains/d03_vibe_orbit';

interface FlashEventDetailModalProps {
  event: FlashEvent;
  place?: VibePlace;
  onClose: () => void;
  onViewPlace: (place: VibePlace) => void;
  onRsvp: () => void;
  rsvpEnabled: boolean;
  rsvpJoined: boolean;
  rsvpLoading: boolean;
}

export const FlashEventDetailModal: React.FC<FlashEventDetailModalProps> = ({
  event, place, onClose, onViewPlace, onRsvp, rsvpEnabled, rsvpJoined, rsvpLoading
}) => {
  const start = Date.parse(event.starts_at);
  const end = Date.parse(event.ends_at);
  const startsIn = Math.max(0, Math.ceil((start - Date.now()) / 60000));
  const valid = Number.isFinite(start) && Number.isFinite(end) && end > Date.now();
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="flash-event-detail-title"
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 rounded-3xl border border-fuchsia-500/65 bg-[#1c1923] p-5 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-black tracking-wider text-pink-400">FLASH EVENT DETAILS</span>
            <h2 id="flash-event-detail-title" className="mt-1 text-xl font-black">{event.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close event details"
            className="rounded-xl border border-neutral-700 p-2 hover:bg-neutral-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="relative h-44 overflow-hidden rounded-2xl border border-fuchsia-500/50 bg-gradient-to-br from-fuchsia-950 to-indigo-950">
          {place?.image_url ? <img alt={place.title} src={place.image_url} className="h-full w-full object-cover" /> :
            <div className="flex h-full items-center justify-center text-xs font-semibold text-neutral-400">Event photo unavailable</div>}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">{event.description || 'Event details have not been provided.'}</p>
        <div className="space-y-2 rounded-2xl border border-neutral-700 bg-black/20 p-3 text-xs text-neutral-200">
          <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-cyan-300" />
            Starts: {Number.isFinite(start) ? new Date(start).toLocaleString() : 'Unavailable'}
          </div>
          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-300" />
            Ends: {Number.isFinite(end) ? new Date(end).toLocaleString() : 'Unavailable'}
          </div>
          {startsIn > 0 && valid && <div className="font-bold text-cyan-300">Starts in {startsIn} minutes</div>}
          {place && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-pink-300" />
            {place.title}{place.address ? ` · ${place.address}` : ''}
          </div>}
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={!valid || !rsvpEnabled || rsvpLoading} onClick={onRsvp}
            className="flex-1 rounded-xl bg-white px-3 py-3 text-xs font-black text-black disabled:cursor-not-allowed disabled:opacity-50">
            {!rsvpEnabled ? 'RSVP unavailable' : rsvpLoading ? 'Please wait' : rsvpJoined ? 'Cancel RSVP' : 'Save your spot'}
          </button>
          {place && <button type="button" onClick={() => { onClose(); onViewPlace(place); }}
            className="flex-1 rounded-xl border border-cyan-400/50 px-3 py-3 text-xs font-black text-cyan-200">View place</button>}
        </div>
        <p className="text-[11px] text-neutral-400">RSVP records your intention to attend. It does not guarantee a seat or provide a reward.</p>
      </div>
    </div>
  );
};
