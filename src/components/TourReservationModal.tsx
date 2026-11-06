import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Users, Send, Shield, CheckCircle2 } from 'lucide-react';
import type { CommunityTrail } from '../domains/d07_trails';
import { requestTourReservation } from '../domains/d08_tours';

interface TourReservationModalProps {
  tour: CommunityTrail;
  onClose: () => void;
  onRequireAuth: () => void;
  onToast: (message: string) => void;
}
export const TourReservationModal: React.FC<TourReservationModalProps> = ({tour,onClose,onRequireAuth,onToast}) => {
  const [date,setDate] = useState('');
  const [time,setTime] = useState('');
  const [partySize,setPartySize] = useState(2);
  const [note,setNote] = useState('');
  const [submitting,setSubmitting] = useState(false);
  const [requestId,setRequestId] = useState<string | null>(null);
  const [error,setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);setError(null);
    try {
      const result = await requestTourReservation({tourId:tour.id,date,time,partySize,note});
      setRequestId(result.id);
      onToast('Tour reservation request saved as pending.');
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Reservation request failed.';
      setError(message);
      if (message.includes('Sign in')) onRequireAuth();
    } finally {setSubmitting(false);}
  };
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div initial={{opacity:0,scale:0.95,y:15}} animate={{opacity:1,scale:1,y:0}}
          exit={{opacity:0,scale:0.95,y:15}} className="bg-[#110F15] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden text-left shadow-2xl">
          <header className="bg-[#17141E] border-b border-white/10 p-4 flex items-center justify-between">
            <div><h3 className="font-extrabold text-white text-sm">Request a Vibe Tour</h3>
              <p className="text-xs text-zinc-400 truncate max-w-[260px]">{tour.title}</p></div>
            <button aria-label="Close reservation" onClick={onClose} className="text-zinc-300 p-2 rounded-full bg-white/5"><X className="w-4 h-4"/></button>
          </header>
          {requestId ? <div className="p-6 text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto"/>
            <h4 className="font-bold text-white">Request saved — awaiting response</h4>
            <p className="text-xs text-zinc-400">This is pending, not an accepted booking or Handshake.</p>
            <p className="text-xs text-zinc-500 font-mono break-all">{requestId}</p>
          </div> : <form onSubmit={submit} className="p-5 space-y-4">
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-zinc-300 flex gap-2"><Shield className="w-4 h-4 shrink-0"/>Choose a real date and time to request this Tour. The guide must confirm separately.</div>
            <label className="text-xs text-zinc-300 block"><Calendar className="w-4 h-4 inline mr-2"/>Date
              <input aria-label="Tour date" required type="date" value={date} onChange={e=>setDate(e.target.value)}
              className="mt-1 block w-full bg-zinc-900 border border-white/10 rounded-xl p-2 text-white"/></label>
            <label className="text-xs text-zinc-300 block"><Clock className="w-4 h-4 inline mr-2"/>Time
              <input aria-label="Tour time" required type="time" value={time} onChange={e=>setTime(e.target.value)}
              className="mt-1 block w-full bg-zinc-900 border border-white/10 rounded-xl p-2 text-white"/></label>
            <label className="text-xs text-zinc-300 block"><Users className="w-4 h-4 inline mr-2"/>Party size
              <input aria-label="Party size" required type="number" min={1} max={30} value={partySize}
              onChange={e=>setPartySize(Number(e.target.value))}
              className="mt-1 block w-full bg-zinc-900 border border-white/10 rounded-xl p-2 text-white"/></label>
            <label className="text-xs text-zinc-300 block">Note to guide
              <textarea aria-label="Reservation note" maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}
              className="mt-1 block w-full bg-zinc-900 border border-white/10 rounded-xl p-2 text-white" rows={3}/></label>
            {error && <p role="alert" className="text-red-400 text-xs">{error}</p>}
            <button disabled={submitting} type="submit" className="w-full bg-purple-600 rounded-xl px-4 py-3 text-white font-bold text-xs flex gap-2 justify-center items-center">
              <Send className="w-4 h-4"/>{submitting ? 'Saving request...' : 'Send reservation request'}
            </button>
          </form>}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
