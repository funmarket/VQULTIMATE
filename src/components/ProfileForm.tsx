import React, { useEffect, useState } from 'react';
import { UserProfile, ProfileRegistration, ProfileEdits, registerProfile, updateExistingProfile } from '../domains/d01_auth';
import { User, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PRESET_TAGS = ['cyberpunk', 'web3', 'solana', 'neon', 'tokyo', 'tunis',
  'coffee-seeker', 'retro-gaming', 'cultural-pass', 'minimalist'];

type Props = {
  profile: UserProfile | null;
  onSaved: (profile: UserProfile) => void;
  onCancel: () => void;
};

export const ProfileForm: React.FC<Props> = ({ profile, onSaved, onCancel }) => {
  const isEditing = Boolean(profile);
  const [handle, setHandle] = useState(profile?.username || '');
  const [displayName, setDisplayName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState(profile?.bio || '');
  const [city, setCity] = useState(profile?.city || profile?.district || '');
  const [tags, setTags] = useState<string[]>(profile?.interests || []);
  const [customTag, setCustomTag] = useState('');
  const [languages, setLanguages] = useState((profile?.languages || []).join(', '));
  const [xHandle, setXHandle] = useState(profile?.xHandle || '');
  const [telegramHandle, setTelegramHandle] = useState(profile?.telegramHandle || '');
  const [contactMethod, setContactMethod] = useState(profile?.contactMethod || 'none');
  const [cozyDiaryMode, setCozyDiaryMode] = useState(Boolean(profile?.cozyDiaryMode));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [availability, setAvailability] = useState<'checking' | 'available' | 'taken' | 'error' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!avatarFile) { setPreview(null); return; }
    const url = URL.createObjectURL(avatarFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  useEffect(() => {
    if (isEditing) return;
    const clean = handle.replace(/^@/, '').toLowerCase().trim();
    if (!/^[a-z0-9_]{3,32}$/.test(clean)) { setAvailability(null); return; }
    let active = true;
    setAvailability('checking');
    const timer = setTimeout(async () => {
      try {
        const { data, error: lookupError } = await supabase.from('profiles')
          .select('id').ilike('handle', clean).maybeSingle();
        if (active) setAvailability(lookupError ? 'error' : data ? 'taken' : 'available');
      } catch { if (active) setAvailability('error'); }
    }, 450);
    return () => { active = false; clearTimeout(timer); };
  }, [handle, isEditing]);

  const toggleTag = (value: string) => {
    const tag = value.toLowerCase().trim();
    setTags(current => current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(null); setNotice(null);
    try {
      if (cozyDiaryMode && (!bio.trim() || !city.trim() || (!xHandle.trim() && !telegramHandle.trim()))) {
        throw new Error('Cozy Diary Mode requires a bio, broad city and at least one contact handle.');
      }
      const common: ProfileEdits = {
        displayName, bio, city, interests: tags,
        languages: languages.split(',').map(s => s.trim()).filter(Boolean),
        avatarFile, xHandle, telegramHandle, contactMethod, cozyDiaryMode,
      };
      if (profile) {
        const saved = await updateExistingProfile(profile, common);
        onSaved(saved);
      } else {
        if (availability !== 'available') throw new Error('Verify that your username is available.');
        const payload: ProfileRegistration = {
          ...common, handle, displayName, email, password,
        };
        const result = await registerProfile(payload);
        if (result.pendingVerification) {
          setNotice('Account created. Check ' + result.email + ' for the verification link, then return to sign in.' +
            (result.avatarUploadNote ? ' ' + result.avatarUploadNote : ''));
        } else {
          onSaved(result.profile);
          if (result.avatarUploadNote) setNotice(result.avatarUploadNote);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profile operation failed.');
    } finally { setBusy(false); }
  };

  const inputClass = 'w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500';
  const labelClass = 'block text-xs font-semibold text-neutral-300 mb-1.5';

  return (
    <form onSubmit={submit} className="space-y-4 text-white">
      <div className="flex items-center gap-3 bg-neutral-950/60 p-3 rounded-2xl">
        <div className="w-20 h-20 rounded-xl bg-neutral-800 overflow-hidden shrink-0 flex items-center justify-center">
          {(preview || profile?.avatar_url) ? <img src={preview || profile?.avatar_url} alt="Profile preview" className="w-full h-full object-cover" /> :
            <User className="w-8 h-8 text-neutral-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <label className={labelClass}>Profile photo (JPG, PNG or WebP, max 5 MB)</label>
          <input className="text-xs max-w-full" type="file" accept="image/jpeg,image/png,image/webp"
            onChange={e => {
              const file = e.target.files?.[0] || null;
              if (file && (file.size === 0 || file.size > 5 * 1024 * 1024 ||
                !['image/jpeg','image/png','image/webp'].includes(file.type))) {
                setError('Choose a JPG, PNG or WebP image up to 5 MB.'); e.target.value = ''; return;
              }
              setError(null); setAvatarFile(file);
            }} />
        </div>
      </div>

      <div><label className={labelClass}>Unique @username</label>
        <input className={inputClass} value={handle} disabled={isEditing}
          required pattern="[a-zA-Z0-9_]{3,32}" onChange={e => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
          placeholder="your_handle" />
        {!isEditing && availability && <p className={`text-xs mt-1 ${availability === 'available' ? 'text-emerald-400' : 'text-amber-400'}`}>
          {availability === 'checking' ? 'Checking availability…' : availability === 'available' ? 'Username available' :
            availability === 'taken' ? 'Username already taken' : 'Unable to verify username availability'}
        </p>}
      </div>
      {!isEditing && <>
        <div><label className={labelClass}>Email address</label>
          <input className={inputClass} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div><label className={labelClass}>Password (at least 8 characters)</label>
          <input className={inputClass} type="password" autoComplete="new-password" minLength={8} required value={password}
            onChange={e => setPassword(e.target.value)} /></div>
      </>}
      <div><label className={labelClass}>Display name</label>
        <input className={inputClass} required maxLength={80} value={displayName} onChange={e => setDisplayName(e.target.value)} /></div>
      <div><label className={labelClass}>Biography</label>
        <textarea className={inputClass} maxLength={280} rows={3} value={bio} onChange={e => setBio(e.target.value)} /></div>
      <div><label className={labelClass}>City or broad location</label>
        <input className={inputClass} maxLength={100} value={city} onChange={e => setCity(e.target.value)} /></div>
      <div><label className={labelClass}>Cultural tags & interests</label>
        <div className="flex gap-1.5 flex-wrap">
          {PRESET_TAGS.map(tag => <button type="button" key={tag} onClick={() => toggleTag(tag)}
            className={`px-2.5 py-1.5 text-xs rounded-xl border ${tags.includes(tag)
              ? 'border-orange-500 text-orange-300 bg-orange-500/15' : 'border-neutral-700 text-neutral-400'}`}>#{tag}</button>)}
        </div>
        <div className="flex gap-2 mt-2"><input className={inputClass} value={customTag} onChange={e => setCustomTag(e.target.value)}
          placeholder="Add your own interest" />
          <button type="button" className="px-3 bg-neutral-700 rounded-lg" onClick={() => {
            if (customTag.trim()) toggleTag(customTag); setCustomTag('');
          }}>Add</button></div>
      </div>
      <div><label className={labelClass}>Languages (comma-separated)</label>
        <input className={inputClass} value={languages} onChange={e => setLanguages(e.target.value)} placeholder="English, Arabic" /></div>
      <div><label className={labelClass}>Telegram handle (optional)</label>
        <input className={inputClass} maxLength={64} value={telegramHandle} onChange={e => setTelegramHandle(e.target.value)} /></div>
      <div><label className={labelClass}>X handle (optional)</label>
        <input className={inputClass} maxLength={64} value={xHandle} onChange={e => setXHandle(e.target.value)} /></div>
      <div><label className={labelClass}>Preferred contact</label>
        <select className={inputClass} value={contactMethod} onChange={e => setContactMethod(e.target.value)}>
          <option value="none">None</option><option value="telegram">Telegram</option><option value="x">X</option><option value="email">Email</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={cozyDiaryMode} onChange={e => setCozyDiaryMode(e.target.checked)} />
        Cozy Diary Mode (requires bio, city and contact handle)</label>
      {error && <p role="alert" className="text-red-400 bg-red-950/30 border border-red-800 rounded-lg p-2 text-xs flex gap-2">
        <AlertCircle className="w-4 h-4" />{error}</p>}
      {notice && <p role="status" className="text-emerald-300 text-xs bg-emerald-950/30 border border-emerald-800 rounded-lg p-3 flex gap-2">
        <Check className="w-4 h-4 shrink-0" />{notice}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 py-3 bg-neutral-800 rounded-xl font-bold">Back</button>
        <button type="submit" disabled={busy || (!isEditing && availability !== 'available')}
          className="flex-1 py-3 bg-orange-600 rounded-xl font-bold disabled:opacity-50">
          {busy ? 'Saving…' : isEditing ? 'Save Profile' : 'Create Account'}
        </button>
      </div>
    </form>
  );
};
