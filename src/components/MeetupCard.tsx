import React, { useState } from 'react';
import { Users, MapPin, Calendar, Radio, Check, UserPlus } from 'lucide-react';
import { PlaceMeetup } from '../domains/d12_meetups/types';
import { toggleMeetupRsvp } from '../domains/d12_meetups/api';
import { UserProfile } from '../domains/d01_auth';

interface MeetupCardProps {
  meetup: PlaceMeetup;
  currentUser: UserProfile | null;
  onRsvpChanged?: () => void;
  compact?: boolean;
}

export const MeetupCard: React.FC<MeetupCardProps> = ({
  meetup,
  currentUser,
  onRsvpChanged,
  compact = false
}) => {
  const [attending, setAttending] = useState(() => {
    if (!currentUser?.id) return false;
    const cleanId = currentUser.id.replace(/^usr_/, '');
    return meetup.attendee_ids.some(
      id => id === currentUser.id || id === cleanId || id === 'usr_' + cleanId
    );
  });
  const [attendeeCount, setAttendeeCount] = useState(meetup.attendee_ids.length);
  const [submitting, setSubmitting] = useState(false);

  const isHost = currentUser?.id && (
    meetup.host_user_id === currentUser.id ||
    meetup.host_user_id === currentUser.id.replace(/^usr_/, '') ||
    'usr_' + meetup.host_user_id === currentUser.id
  );

  const handleToggleRsvp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.id || isHost || submitting) return;

    setSubmitting(true);
    const res = await toggleMeetupRsvp(meetup.id, currentUser.id);
    if (res.success) {
      setAttending(res.isAttending);
      setAttendeeCount(res.attendeesCount);
      if (onRsvpChanged) onRsvpChanged();
    }
    setSubmitting(false);
  };

  const formattedDate = meetup.is_live_checkin
    ? 'Happening Right Now'
    : new Date(meetup.scheduled_at).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

  return (
    <div className="rounded-2xl bg-[#0e1422] border border-neutral-800 hover:border-blue-500/40 transition p-4 space-y-3 shadow-lg relative overflow-hidden">
      {/* Top Banner / Badges */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <Users className="w-3 h-3" />
            SPOT MEETUP
          </span>
          {meetup.is_live_checkin ? (
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
              <Radio className="w-2.5 h-2.5" /> LIVE NOW
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 text-[10px] font-semibold flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5 text-blue-400" /> {formattedDate}
            </span>
          )}
        </div>

        <span className="text-xs font-bold text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded-lg border border-neutral-800 shrink-0">
          👥 {attendeeCount} going
        </span>
      </div>

      {/* Meetup Title & Description */}
      <div>
        <h4 className="text-base font-bold text-white tracking-tight leading-snug">
          {meetup.title}
        </h4>
        {meetup.description && (
          <p className="text-xs text-neutral-300 mt-1 line-clamp-2 italic">
            "{meetup.description}"
          </p>
        )}
      </div>

      {/* Spot Location */}
      <div className="flex items-start gap-1.5 text-xs text-neutral-400 pt-0.5">
        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <span className="font-semibold text-neutral-200">{meetup.place_title}</span>
          {meetup.place_address && (
            <span className="text-neutral-500 truncate block text-[11px]">
              {meetup.place_address}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Host & RSVP Row */}
      <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 text-xs">
        <div className="flex items-center gap-2">
          <img
            src={meetup.host_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
            alt={meetup.host_name}
            className="w-5 h-5 rounded-full object-cover border border-blue-400/30"
          />
          <span className="text-neutral-400 text-[11px]">
            Organized by <strong className="text-neutral-200">@{meetup.host_name}</strong>
          </span>
        </div>

        {isHost ? (
          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-neutral-800 text-blue-300 border border-blue-500/20">
            Host
          </span>
        ) : (
          <button
            type="button"
            onClick={handleToggleRsvp}
            disabled={submitting}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
              attending
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-rose-950/50 hover:text-rose-300 hover:border-rose-500/40'
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/30'
            }`}
          >
            {attending ? (
              <>
                <Check className="w-3 h-3" />
                <span>Going</span>
              </>
            ) : (
              <>
                <UserPlus className="w-3 h-3" />
                <span>RSVP / Join</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
