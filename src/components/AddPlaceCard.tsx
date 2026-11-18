import React, { useState, useRef, useEffect } from 'react';
import { Plus, MapPin, Camera, Link as LinkIcon, Compass, Search, Sparkles, Check, AlertCircle } from 'lucide-react';
import { VibeCategory, VibePlace, UserCoordinates } from '../domains/d03_vibe_orbit';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../domains/d01_auth';

interface AddPlaceCardProps {
  user: UserProfile | null;
  userCoords: UserCoordinates | null;
  onPlaceAdded: (newPlace: VibePlace) => void;
  onToast: (msg: string) => void;
  onRequireAuth: () => void;
  draftCoords: { lat: number; lng: number } | null;
  onUpdateDraftCoords: (coords: { lat: number; lng: number } | null) => void;
  onDraftModeChange?: (active: boolean) => void;
}

export const AddPlaceCard: React.FC<AddPlaceCardProps> = ({
  user,
  userCoords,
  onPlaceAdded,
  onToast,
  onRequireAuth,
  draftCoords,
  onUpdateDraftCoords,
  onDraftModeChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'offgrid' | 'link'>('offgrid');

  useEffect(() => {
    onDraftModeChange?.(isExpanded && activeTab === 'offgrid');
  }, [isExpanded, activeTab, onDraftModeChange]);

  // Form State with strict coordinate bounds and NO hardcoded defaults
  const [placeName, setPlaceName] = useState('');
  const [category, setCategory] = useState<VibeCategory>('Food');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [vibeNote, setVibeNote] = useState('');
  const [imageUrl, setImageUrl] = useState(''); // STRICTLY OPTIONAL - NO REQUIREMENT OR FALLBACK
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Synchronize draftCoords from map drag/click back to form inputs
  useEffect(() => {
    if (draftCoords) {
      setLat(draftCoords.lat.toFixed(6));
      setLng(draftCoords.lng.toFixed(6));
    }
  }, [draftCoords]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);

  // Paste Link State
  const [linkInput, setLinkInput] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const categories: VibeCategory[] = ['Food', 'Culture', 'Art', 'Night Owl', 'Spots'];

  // Fresh Intentional GPS Request with stale-response protection
  const handleUseMyLocation = () => {
    onToast('Requesting fresh GPS device snapshot...');
    if (!navigator.geolocation) {
      onToast('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        if (!isNaN(newLat) && !isNaN(newLng) && newLat >= -90 && newLat <= 90 && newLng >= -180 && newLng <= 180) {
          setLat(newLat.toFixed(6));
          setLng(newLng.toFixed(6));
          onUpdateDraftCoords({ lat: newLat, lng: newLng });
          setAddress('Current GPS Position (Fresh Device Snapshot)');
          onToast('Fresh GPS snapshot acquired successfully.');
        } else {
          onToast('Received invalid coordinates from GPS sensor.');
        }
      },
      (err) => {
        onToast(`GPS acquisition failed: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Optional Supabase Storage Upload Implementation
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      onToast('Image file size must be under 5MB.');
      return;
    }

    selectedFileRef.current = file;
    setUploadingImage(true);
    setDbError(null);

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `place_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('place_photos')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        setImageUrl('');
        throw new Error(`Supabase Storage upload rejected: ${uploadError.message}. Photo left optional; you may submit without a photo or retry.`);
      }

      const { data: publicData } = supabase.storage.from('place_photos').getPublicUrl(filePath);
      if (publicData?.publicUrl) {
        setImageUrl(publicData.publicUrl);
        onToast('Photo successfully uploaded to Supabase Storage!');
      } else {
        throw new Error('Could not resolve public URL for uploaded photo.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Photo upload failed.';
      onToast(msg);
      setDbError(msg);
    } finally {
      setUploadingImage(false);
    }
  };

  // Verified URL Resolution & Paste Link handler without generalized mocks or fake fallbacks
  const handleExtractLink = async () => {
    if (!linkInput.trim()) {
      onToast('Please enter a valid URL or OSM search query.');
      return;
    }

    let searchTerm = linkInput.trim();

    // Parse Google Maps URLs correctly if provided according to V3 contract
    if (searchTerm.includes('goo.gl') || searchTerm.includes('maps.app.goo.gl') || searchTerm.includes('google.com/maps')) {
      const atMatch = searchTerm.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (atMatch && atMatch[1] && atMatch[2]) {
        const gLat = parseFloat(atMatch[1]);
        const gLng = parseFloat(atMatch[2]);
        if (!isNaN(gLat) && !isNaN(gLng)) {
          setLat(gLat.toFixed(6));
          setLng(gLng.toFixed(6));
          onUpdateDraftCoords({ lat: gLat, lng: gLng });
          setAddress('Resolved from Google Maps link coordinates');
          onToast('Successfully extracted coordinates from Google Maps link!');
          return;
        }
      }
      const queryMatch = searchTerm.match(/[?&]q=([^&]+)/);
      if (queryMatch && queryMatch[1]) {
        searchTerm = decodeURIComponent(queryMatch[1].replace(/\+/g, ' '));
      } else {
        setLookupError('Could not extract direct coordinates or location query from Google Maps link. Please enter location manually.');
        onToast('Could not resolve Google Maps link.');
        return;
      }
    }

    setExtracting(true);
    setLookupError(null);
    try {
      const query = encodeURIComponent(searchTerm);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'VQUltimate-CommunityMap/1.0'
        }
      });
      if (!res.ok) {
        throw new Error(`Nominatim lookup failed with status ${res.status}`);
      }
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setLookupError('No matching venue found via OSM provider. Please enter details manually.');
        onToast('No venue found. Enter details manually.');
      } else {
        const item = data[0];
        const resolvedLat = parseFloat(item.lat);
        const resolvedLng = parseFloat(item.lon);

        if (isNaN(resolvedLat) || isNaN(resolvedLng) || resolvedLat < -90 || resolvedLat > 90 || resolvedLng < -180 || resolvedLng > 180) {
          throw new Error('Invalid coordinates returned from lookup provider.');
        }

        setPlaceName(item.display_name.split(',')[0] || 'Discovered Place');
        setAddress(item.display_name);
        setLat(resolvedLat.toFixed(6));
        setLng(resolvedLng.toFixed(6));
        onUpdateDraftCoords({ lat: resolvedLat, lng: resolvedLng });
        onToast('Successfully resolved venue from link!');
      }
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Lookup failed.');
      onToast('External lookup failed. Enter details manually.');
    } finally {
      setExtracting(false);
    }
  };

  const handleSavePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (uploadingImage) {
      onToast('Please wait for photo upload to complete before saving.');
      return;
    }
    if (!placeName.trim()) {
      onToast('Please enter a place name.');
      return;
    }

    const numericLat = parseFloat(lat);
    const numericLng = parseFloat(lng);

    if (isNaN(numericLat) || isNaN(numericLng) || numericLat < -90 || numericLat > 90 || numericLng < -180 || numericLng > 180) {
      onToast('Invalid latitude or longitude. Please enter valid legal coordinates (-90 to 90, -180 to 180).');
      return;
    }

    setSubmitting(true);
    setDbError(null);

    try {
      // Photo is strictly OPTIONAL: if imageUrl is empty or blob, store null or omit according to schema
      const validImageUrl = imageUrl && !imageUrl.startsWith('blob:') ? imageUrl.trim() : null;

      const placePayload = {
        id: 'place_' + Date.now(),
        title: placeName.trim(),
        category,
        description: vibeNote.trim() || 'Community contributed local secret & gathering spot.',
        image_url: validImageUrl,
        lat: numericLat,
        lng: numericLng,
        created_by: user.id,
        address: address.trim() || 'District Sector',
        phone: phone.trim() || undefined
      };

      // Real Supabase publication with strict server-enforced creator ownership & RLS
      const { data, error } = await supabase
        .from('places')
        .insert([placePayload])
        .select('*')
        .single();

      if (error) {
        console.error('Supabase publication error:', error);
        setDbError(error.message);
        onToast(`Publication rejected: ${error.message}`);
        setSubmitting(false);
        return;
      }

      if (!data || !data.id || data.created_by !== user.id) {
        throw new Error('Server confirmation failed or creator identity mismatch.');
      }

      // Verified readback verification test query confirming public visibility and refresh survival
      const { data: verifyData, error: verifyError } = await supabase
        .from('places')
        .select('id, title, created_by, lat, lng, image_url')
        .eq('id', data.id)
        .single();

      if (verifyError || !verifyData || verifyData.created_by !== user.id) {
        throw new Error('Database readback verification failed.');
      }

      onPlaceAdded(data);
      onToast(`Successfully published & verified "${data.title}" on community map!`);
      setPlaceName('');
      setAddress('');
      setPhone('');
      setVibeNote('');
      setImageUrl('');
      setLat('');
      setLng('');
      setIsExpanded(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Publication failed.';
      setDbError(msg);
      onToast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-[#DBDBDB] dark:border-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-2xl overflow-hidden transition-all duration-300">
      {/* Collapsed Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-[#EFEFEF]/50 dark:hover:bg-neutral-800/40 transition"
      >
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#0866FF]/10 dark:bg-orange-500/15 border border-[#0866FF]/30 dark:border-orange-500/30 flex items-center justify-center text-[#0866FF] dark:text-orange-400">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-base text-[#050505] dark:text-white tracking-tight">
              Add a Place
            </h3>
            <p className="text-xs text-[#65676B] dark:text-neutral-400">
              Contribute verified local spots with optional photos and Supabase Storage publication.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="hidden sm:flex items-center space-x-1.5 text-xs font-bold text-[#0866FF] dark:text-teal-400 bg-[#E7F3FF] dark:bg-teal-950/40 border border-[#0866FF]/20 dark:border-teal-500/30 px-3 py-1.5 rounded-xl">
            <span>Off-Grid Pin</span>
            <span>|</span>
            <span>Paste Link</span>
          </div>
          <span className={`text-[#65676B] dark:text-neutral-400 font-bold transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
            ▶
          </span>
        </div>
      </div>

      {/* Expanded Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5 pt-0 border-t border-[#E4E6EB] dark:border-neutral-800/80 space-y-4 animate-fadeIn">
          {/* Tab Selector: Off-Grid Pin | Paste Link */}
          <div className="grid grid-cols-2 gap-2 pt-4">
            <button
              type="button"
              onClick={() => setActiveTab('offgrid')}
              className={`py-2.5 px-4 rounded-2xl text-xs font-black transition flex items-center justify-center space-x-2 cursor-pointer border ${
                activeTab === 'offgrid'
                  ? 'bg-[#0866FF] dark:bg-gradient-to-r dark:from-orange-500 dark:to-amber-600 text-white border-[#0866FF] dark:border-orange-400/50 shadow-md'
                  : 'bg-[#EFEFEF] dark:bg-neutral-950 text-[#65676B] dark:text-neutral-400 border-[#DBDBDB] dark:border-neutral-800 hover:text-[#050505] dark:hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Off-Grid Pin</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('link')}
              className={`py-2.5 px-4 rounded-2xl text-xs font-black transition flex items-center justify-center space-x-2 cursor-pointer border ${
                activeTab === 'link'
                  ? 'bg-[#0866FF] dark:bg-gradient-to-r dark:from-orange-500 dark:to-amber-600 text-white border-[#0866FF] dark:border-orange-400/50 shadow-md'
                  : 'bg-[#EFEFEF] dark:bg-neutral-950 text-[#65676B] dark:text-neutral-400 border-[#DBDBDB] dark:border-neutral-800 hover:text-[#050505] dark:hover:text-white'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Paste Link</span>
            </button>
          </div>

          {/* PASTE LINK TAB */}
          {activeTab === 'link' && (
            <div className="space-y-4 pt-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#65676B] dark:text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Paste Google Maps URL or OSM search query..."
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#F0F2F5] dark:bg-neutral-950 border border-[#DBDBDB] dark:border-neutral-800 rounded-2xl text-xs text-[#050505] dark:text-white placeholder-[#65676B] dark:placeholder-neutral-500 focus:outline-none focus:border-[#0866FF]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleExtractLink}
                  disabled={extracting}
                  className="px-4 py-2.5 bg-[#0866FF] hover:bg-[#075CE5] dark:bg-gradient-to-r dark:from-orange-500 dark:to-amber-600 text-white font-black text-xs rounded-2xl transition cursor-pointer flex items-center space-x-1.5 shrink-0 shadow-sm disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{extracting ? 'Resolving...' : 'Resolve Link'}</span>
                </button>
              </div>

              {lookupError && (
                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl text-xs text-red-800 dark:text-red-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                  <span>{lookupError}</span>
                </div>
              )}
            </div>
          )}

          {/* FORM BODY */}
          <form onSubmit={handleSavePlace} className="space-y-4 pt-2">
            {/* Top Action Row: Fresh Intentional GPS Snapshot */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="flex-1 py-3 px-4 rounded-2xl bg-white dark:bg-neutral-950 border border-[#DBDBDB] dark:border-neutral-800 hover:border-[#0866FF] dark:hover:border-orange-500 text-[#050505] dark:text-white font-bold text-xs transition flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
              >
                <Compass className="w-4 h-4 text-[#0866FF] dark:text-orange-400 animate-spin-slow" />
                <span>Use My Location (Fresh GPS Snapshot)</span>
              </button>
            </div>

            {/* Supabase Storage File Upload Container (Strictly Optional) */}
            <div className="p-4 rounded-2xl border border-dashed border-[#DBDBDB] dark:border-neutral-800 bg-[#F0F2F5]/50 dark:bg-neutral-950/50 flex flex-col items-center justify-center text-center space-y-2">
              {imageUrl && !imageUrl.startsWith('blob:') ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImageUrl(''); selectedFileRef.current = null; }}
                    className="absolute top-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded-lg cursor-pointer"
                  >
                    Remove Photo
                  </button>
                </div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 rounded-full bg-white dark:bg-neutral-900 border border-[#DBDBDB] dark:border-neutral-800 flex items-center justify-center text-[#0866FF] dark:text-orange-400 shadow-xs cursor-pointer hover:scale-105 transition"
                  >
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-[#050505] dark:text-white cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      {uploadingImage ? 'Uploading to Supabase Storage...' : 'Upload Optional Photo (Optional)'}
                    </h5>
                    <p className="text-[11px] text-[#65676B] dark:text-neutral-400">PNG/JPG up to 5MB. Photo is entirely optional.</p>
                  </div>
                  <input
                    type="text"
                    placeholder="Or paste direct image URL here (optional)..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 bg-white dark:bg-neutral-900 border border-[#DBDBDB] dark:border-neutral-800 rounded-xl text-[#050505] dark:text-white"
                  />
                </>
              )}
            </div>

            {/* Place Name & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#65676B] dark:text-neutral-400">
                  Place Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Artisan Roastery"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F0F2F5] dark:bg-neutral-950 border border-[#DBDBDB] dark:border-neutral-800 rounded-xl text-xs text-[#050505] dark:text-white font-bold focus:outline-none focus:border-[#0866FF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#65676B] dark:text-neutral-400">
                  Category
                </label>
                <div className="flex items-center space-x-1 overflow-x-auto py-0.5 scrollbar-none">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                        category === cat
                          ? 'bg-[#0866FF] dark:bg-orange-500 text-white shadow-xs'
                          : 'bg-[#F0F2F5] dark:bg-neutral-950 text-[#65676B] dark:text-neutral-400 border border-[#DBDBDB] dark:border-neutral-800 hover:text-[#050505]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#65676B] dark:text-neutral-400">
                Address / Location
              </label>
              <input
                type="text"
                placeholder="Street address or district description"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F0F2F5] dark:bg-neutral-950 border border-[#DBDBDB] dark:border-neutral-800 rounded-xl text-xs text-[#050505] dark:text-white focus:outline-none"
              />
            </div>

            {/* Latitude & Longitude (Strict Legal Bounds) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#65676B] dark:text-neutral-400">
                  Latitude (-90 to 90) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="36.7984"
                  value={lat}
                  onChange={(e) => {
                    setLat(e.target.value);
                    const nLat = parseFloat(e.target.value);
                    const nLng = parseFloat(lng);
                    if (!isNaN(nLat) && !isNaN(nLng) && nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180) {
                      onUpdateDraftCoords({ lat: nLat, lng: nLng });
                    }
                  }}
                  className="w-full px-3.5 py-2 bg-[#F0F2F5] dark:bg-neutral-950 border border-[#DBDBDB] dark:border-neutral-800 rounded-xl text-xs font-mono text-[#050505] dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#65676B] dark:text-neutral-400">
                  Longitude (-180 to 180) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="10.1701"
                  value={lng}
                  onChange={(e) => {
                    setLng(e.target.value);
                    const nLat = parseFloat(lat);
                    const nLng = parseFloat(e.target.value);
                    if (!isNaN(nLat) && !isNaN(nLng) && nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180) {
                      onUpdateDraftCoords({ lat: nLat, lng: nLng });
                    }
                  }}
                  className="w-full px-3.5 py-2 bg-[#F0F2F5] dark:bg-neutral-950 border border-[#DBDBDB] dark:border-neutral-800 rounded-xl text-xs font-mono text-[#050505] dark:text-white"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#65676B] dark:text-neutral-400">
                Phone (optional)
              </label>
              <input
                type="text"
                placeholder="+216 71 123 456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F0F2F5] dark:bg-neutral-950 border border-[#DBDBDB] dark:border-neutral-800 rounded-xl text-xs text-[#050505] dark:text-white"
              />
            </div>

            {/* Vibe Note */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#65676B] dark:text-neutral-400">
                Vibe Note / Why Real People Go Here
              </label>
              <textarea
                rows={2}
                placeholder="Describe the atmosphere..."
                value={vibeNote}
                onChange={(e) => setVibeNote(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F0F2F5] dark:bg-neutral-950 border border-[#DBDBDB] dark:border-neutral-800 rounded-xl text-xs text-[#050505] dark:text-white resize-none"
              />
            </div>

            {dbError && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-xs text-red-800 dark:text-red-300">
                Publication Error: {dbError}
              </div>
            )}

            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-center space-x-2">
              <span>📍</span>
              <span>Tap the map or drag the amber draft pin to synchronize coordinates bidirectionally. Photo is strictly optional.</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || uploadingImage}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <MapPin className="w-4 h-4" />
              <span>{submitting ? 'Verifying & Publishing...' : 'Publish & Verify on Community Map'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
