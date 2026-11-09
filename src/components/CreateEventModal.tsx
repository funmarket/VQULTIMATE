import React, { useState } from 'react';
import { Calendar, X, Upload, MapPin, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { UserProfile } from '../domains/d01_auth';

interface CreateEventModalProps {
  user: UserProfile | null;
  onClose: () => void;
  onCreated: (newEvent: any) => void;
  onToast: (msg: string) => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ user, onClose, onCreated, onToast }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('MUSIC');
  const [venue, setVenue] = useState('');
  const [location, setLocation] = useState(user?.city || 'Downtown Tunis');
  const [isLive, setIsLive] = useState(true);
  const [timeStatus, setTimeStatus] = useState('LIVE NOW');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos: string[] = [...photos];
    Array.from(files).forEach(file => {
      if (newPhotos.length >= 4) {
        onToast('Maximum 4 photos allowed per event.');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        onToast('Only JPEG, PNG, and WebP images are supported.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        onToast('Image size must be under 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setPhotos(prev => [...prev, uploadEvent.target!.result as string].slice(0, 4));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !venue.trim()) {
      onToast('Please enter event title and venue.');
      return;
    }
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 800));

    const eventItem = {
      id: `ev-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || 'Community district gathering and cultural showcase.',
      category: category.toUpperCase(),
      badge: isLive ? 'LIVE' : 'UPCOMING',
      venue: venue.trim(),
      host: user?.full_name || user?.username || 'District Host',
      location: location.trim(),
      timeStatus: isLive ? 'LIVE NOW' : timeStatus,
      isLive,
      image: photos[0] || 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=600&q=80',
      gallery: photos
    };

    onCreated(eventItem);
    setIsSubmitting(false);
    onToast('Event successfully published to district feed!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-lg bg-neutral-900 border border-fuchsia-500/50 rounded-3xl p-6 space-y-5 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/40">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-black text-lg tracking-wide">Create Event</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1">Event Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Rooftop Synthwave Session"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="MUSIC">Music</option>
                <option value="ART & CULTURE">Art & Culture</option>
                <option value="ELECTRONIC">Electronic</option>
                <option value="ACOUSTIC">Acoustic</option>
                <option value="NIGHTLIFE">Nightlife</option>
                <option value="COMMUNITY">Community</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">Status</label>
              <select
                value={isLive ? 'live' : 'upcoming'}
                onChange={(e) => {
                  const live = e.target.value === 'live';
                  setIsLive(live);
                  if (live) setTimeStatus('LIVE NOW');
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="live">Live Now</option>
                <option value="upcoming">Upcoming</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">Venue Name *</label>
              <input
                type="text"
                required
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. The Atlas Rooftop"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">Location / District</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Downtown Tunis"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {!isLive && (
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">Schedule / Time Status</label>
              <input
                type="text"
                value={timeStatus}
                onChange={(e) => setTimeStatus(e.target.value)}
                placeholder="e.g. Tomorrow, 8:00 PM"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the event ambiance, highlights, and entry details..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500 resize-none"
            />
          </div>

          {/* Add Photos Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-300 flex items-center space-x-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
                <span>Add Event Photos ({photos.length}/4)</span>
              </label>
              <span className="text-[10px] text-neutral-400">JPEG, PNG, WebP &lt; 5MB</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {photos.map((p, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-neutral-700 bg-neutral-950 group">
                  <img src={p} alt="Upload preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-neutral-900/80 text-white flex items-center justify-center text-xs hover:bg-rose-600 transition"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < 4 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-neutral-700 hover:border-teal-500 bg-neutral-950 flex flex-col items-center justify-center cursor-pointer transition text-neutral-400 hover:text-teal-400">
                  <Upload className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold">Upload</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotoSelect} className="hidden" />
                </label>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 text-xs font-bold text-neutral-300 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 text-neutral-950 font-black text-xs hover:opacity-95 transition cursor-pointer shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? 'Publishing...' : 'Publish Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
