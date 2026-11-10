import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, registerProfile as registerExistingProfile, updateExistingProfile } from '../domains/d01_auth';
import { supabase } from '../lib/supabase';
const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');
import { AlertTriangle, Check, User, Globe, Hash, ShieldCheck } from 'lucide-react';

interface ProfileFormProps {
  profile: UserProfile | null;
  onSaved: (profile: UserProfile) => void;
  onCancel: () => void;
  onVerificationRequired?: (email: string, note?: string) => void;
}

const PRESET_TAGS = [
  'cyberpunk', 'web3', 'solana', 'neon', 'tokyo', 'tunis', 
  'coffee-seeker', 'retro-gaming', 'cultural-pass', 'minimalist'
];

export const ProfileForm: React.FC<ProfileFormProps> = ({ profile: originalProfile, onSaved, onCancel, onVerificationRequired }) => {
  // Preserve the reference form and validation while mapping to the existing
  // VQUltimate D01 public interface. Never create a second Auth provider.
  const profile = originalProfile ? {
    handle: originalProfile.username,
    displayName: originalProfile.full_name,
    photoUrl: originalProfile.avatar_url,
    bio: originalProfile.bio || '',
    location: originalProfile.city || originalProfile.district || '',
    tags: originalProfile.interests || [],
    contactMethod: originalProfile.contactMethod || 'none',
    xHandle: originalProfile.xHandle || '',
    telegramHandle: originalProfile.telegramHandle || '',
    oracleMode: Boolean(originalProfile.cozyDiaryMode),
  } : null;
  const savedProfile = useRef<UserProfile | null>(null);
  const updateProfile = async (updates: {
    displayName?: string; photoUrl?: string; avatarFile?: File;
    bio?: string; location?: string; tags?: string[];
    contactMethod?: string; xHandle?: string; telegramHandle?: string;
    oracleMode?: boolean; languages?: string[];
  }) => {
    if (!originalProfile) throw new Error('Sign in to edit your profile.');
    savedProfile.current = await updateExistingProfile(originalProfile, {
      displayName: updates.displayName, photoUrl: updates.photoUrl,
      avatarFile: updates.avatarFile || null, bio: updates.bio, city: updates.location,
      interests: updates.tags, languages: updates.languages,
      contactMethod: updates.contactMethod, xHandle: updates.xHandle,
      telegramHandle: updates.telegramHandle, cozyDiaryMode: updates.oracleMode,
    });
  };
  const registerProfile = async (payload: {
    handle: string; displayName: string; email: string; password: string;
    avatarFile?: File; photoUrl?: string; bio?: string; location?: string;
    tags?: string[]; languages?: string[]; contactMethod?: string;
    xHandle?: string; telegramHandle?: string; oracleMode?: boolean;
  }) => {
    const created = await registerExistingProfile({
      handle: payload.handle, displayName: payload.displayName,
      email: payload.email, password: payload.password,
      avatarFile: payload.avatarFile || null, photoUrl: payload.photoUrl,
      bio: payload.bio, city: payload.location, interests: payload.tags,
      languages: payload.languages, contactMethod: payload.contactMethod,
      xHandle: payload.xHandle, telegramHandle: payload.telegramHandle,
      cozyDiaryMode: payload.oracleMode,
    });
    if (created.pendingVerification) return created;
    savedProfile.current = created.profile;
    return { displayName: created.profile.full_name, avatarUploadNote: created.avatarUploadNote };
  };
  const onSuccess = () => { if (savedProfile.current) onSaved(savedProfile.current); };
  
  // Is this creation mode or editing mode? 
  // If the profile is "hannibal" (the default guest fallback) or doesn't exist, we allow creation
  const isEditing = Boolean(profile);

  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!avatarFile) { setAvatarPreview(null); return; }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);
  const [handle, setHandle] = useState(profile?.handle || '');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [languages, setLanguages] = useState((originalProfile?.languages || []).join(', '));
  const [tags, setTags] = useState<string[]>(profile?.tags || []);
  const [contactMethod, setContactMethod] = useState(profile?.contactMethod || 'telegram');
  const [xHandle, setXHandle] = useState(profile?.xHandle || '');
  const [telegramHandle, setTelegramHandle] = useState(profile?.telegramHandle || '');
  
  // Oracle Mode forces ALL fields to be mandatory
  const [oracleMode, setOracleMode] = useState(profile?.oracleMode || false);

  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [customTagInput, setCustomTagInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Uniqueness handle review
  useEffect(() => {
    if (!handle) {
      setHandleAvailable(null);
      return;
    }
    
    // Skip checking if it's our own handle in editing mode
    if (isEditing && handle.toLowerCase().trim() === profile?.handle?.toLowerCase()) {
      setHandleAvailable(true);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingHandle(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .ilike('handle', handle.trim());
        setHandleAvailable(!error && (!data || data.length === 0));
      } catch (e) {
        setHandleAvailable(false); // Never claim username availability when verification fails.
      } finally {
        setIsCheckingHandle(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [handle, isEditing, profile?.handle]);

  // Pill list handlers
  const handleToggleTag = (tag: string) => {
    const formatted = tag.toLowerCase().trim();
    if (tags.includes(formatted)) {
      setTags(tags.filter(t => t !== formatted));
    } else {
      setTags([...tags, formatted]);
    }
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = customTagInput.toLowerCase().trim();
    if (formatted && !tags.includes(formatted)) {
      setTags([...tags, formatted]);
    }
    setCustomTagInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Dynamic constraint validator
    if (!handle) {
      setError("Handle is required.");
      return;
    }
    if (handleAvailable === false) {
      setError("Handle is already registered by another citizen!");
      return;
    }
    if (!isEditing && (!email.trim() || password.length < 8)) {
      setError("Email and a password of at least 8 characters are required.");
      return;
    }
    if (!displayName) {
      setError("Display Name is required.");
      return;
    }

    // Cozy Diary Mode constraints: mandate literally every field
    if (oracleMode) {
      if (!bio) {
        setError("Cozy Diary Mode Requirement: Short bio cannot be empty.");
        return;
      }
      if (!location) {
        setError("Cozy Diary Mode requires a broad city or area.");
        return;
      }
      if (!xHandle.trim() && !telegramHandle.trim()) {
        setError("Cozy Diary Mode requires at least one contact handle (X or Telegram).");
        return;
      }
    }

    setSubmitting(true);
    
    const payload = {
      avatarFile: avatarFile || undefined,
      photoUrl,
      handle: handle.toLowerCase().trim(),
      password,
      email,
      displayName,
      bio,
      location,
      tags,
      languages: languages.split(',').map(value => value.trim()).filter(Boolean),
      contactMethod,
      xHandle,
      telegramHandle,
      oracleMode
    };

    try {
      if (isEditing) {
        await updateProfile({
          displayName, photoUrl, avatarFile: avatarFile || undefined, bio, location, tags, contactMethod,
          xHandle, telegramHandle, oracleMode, languages: payload.languages,
        });
        setSuccessMsg("Your profile changes were saved.");
        if (onSuccess) setTimeout(() => onSuccess(), 900);
      } else {
        const created = await registerProfile(payload);
        if ('pendingVerification' in created) {
          const notice = `Account created. Check ${created.email} for a verification email, then sign in.`;
          setSuccessMsg(notice);
          onVerificationRequired?.(created.email, created.avatarUploadNote);
        } else {
          setSuccessMsg(`Welcome, ${created.displayName}! Your account is ready.${created.avatarUploadNote ? ` ${created.avatarUploadNote}` : ''}`);
          onSuccess?.();
        }
      }
    } catch (err: any) {
      const message = err?.message || "Failed to save profile details.";
      if (message.startsWith("Account created. Verify your email")) setSuccessMsg(message);
      else setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-zinc-950 border border-white/20 rounded-3xl p-6 w-full max-w-lg mx-auto text-left space-y-6 text-white select-none">
      
      {/* Dynamic Header */}
      <div className="flex justify-between items-center pb-4 border-b border-white/10">
        <div>
          <h2 className="text-xl font-extrabold uppercase tracking-tight italic flex items-center gap-2">
            <span className="text-vibe-primary">🎒</span> 
            {isEditing ? "Edit Traveler Profile" : "Create Your Account"}
          </h2>
          <p className="text-[10px] text-zinc-500 font-mono tracking-wider mt-0.5">
            {isEditing ? "MODIFY YOUR TRAVELER COMPASS" : "JOIN THE COZY VIBE CIRCLE"}
          </p>
        </div>
        
        {onCancel && (
          <button 
            type="button"
            onClick={onCancel}
            className="text-xs font-mono border border-white/10 hover:border-white/30 text-zinc-400 px-3 py-1 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Alerts */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl flex items-start gap-2.5 text-xs text-red-400 animate-pulse">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex items-start gap-2.5 text-xs text-emerald-400">
            <Check className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. Live Avatar Preview & Hex Entry */}
        <div className="flex flex-col sm:flex-row items-center gap-5 bg-zinc-900/30 p-4 rounded-2xl border border-white/5">
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-vibe-primary/5 blur-xl rounded-full" />
            <div className="relative w-20 h-20 rounded-full border border-white/20 p-1 bg-black flex items-center justify-center overflow-hidden">
              {((avatarPreview && avatarPreview.trim()) || (photoUrl && photoUrl.trim())) ? (
                <img 
                  src={((avatarPreview && avatarPreview.trim()) || (photoUrl && photoUrl.trim())) as string} 
                  alt="Live Preview" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full rounded-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <User className="w-8 h-8 text-zinc-600" />
              )}
            </div>
          </div>
          
          <div className="space-y-1.5 w-full flex-1">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1">
              <Globe className="w-3 h-3 text-vibe-primary" /> Avatar Photo URL (Optional)
            </label>
            <input 
              type="text" 
              placeholder="https://images.unsplash.com/..." 
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full h-10 px-3.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-vibe-primary transition-colors font-mono"
            />
            <label className="block text-[10px] font-semibold text-vibe-primary cursor-pointer">
              Upload a JPG, PNG or WebP photo (up to 5 MB)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="mt-1 block w-full text-xs text-zinc-400 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-white"
                onChange={event => {
                  const file = event.target.files?.[0] || null;
                  if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
                    setError('Choose a JPG, PNG or WebP image under 5 MB.');
                    event.target.value = '';
                    return;
                  }
                  setAvatarFile(file);
                }}
              />
            </label>
            <span className="text-[8px] text-zinc-600 block">
              Or paste an image URL above. Uploaded signup photos are saved after email verification on this device.
            </span>
          </div>
        </div>

        {/* 2. Credentials Form Group */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1">
              {isCheckingHandle ? "⏳" : "@"} Unique username (@)
            </label>
            <input 
              type="text" 
              placeholder="e.g. yassine_medina" 
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              required
              disabled={isEditing}
              className={cn(
                "w-full h-11 px-3.5 bg-zinc-950 border rounded-xl text-xs font-mono transition-colors focus:outline-none focus:ring-0",
                isEditing ? "text-zinc-500 border-white/5 bg-zinc-950/50 cursor-not-allowed" : "text-white border-white/10 focus:border-vibe-primary",
                handle && handleAvailable === true && "border-emerald-500/50 focus:border-emerald-500",
                handle && handleAvailable === false && "border-red-500/50 focus:border-red-500"
              )}
            />
            {!isEditing && handle && (
              <span className={cn(
                "text-[8px] font-mono tracking-tight",
                handleAvailable ? "text-emerald-400" : "text-red-400"
              )}>
                {handleAvailable ? "✓ Handle is unique" : "✗ Handle already taken by another node"}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Password
            </label>
            <input 
              type="password" 
              placeholder="Secret encryption key" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEditing}
              minLength={8}
              className="w-full h-11 px-3.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-vibe-primary transition-colors font-mono"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
            Citizen Display Name
          </label>
          <input 
            type="text" 
            placeholder="e.g. Dr. Walter" 
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="w-full h-11 px-3.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-vibe-primary transition-colors"
          />
        </div>

        {!isEditing && (
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Email address</label>
            <input type="email" autoComplete="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-11 px-3.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-vibe-primary" />
          </div>
        )}

        {/* 3. Vibe Tags (Pills) Selection */}
        <div className="space-y-2 bg-zinc-900/10 p-4 rounded-xl border border-white/5">
          <div className="flex justify-between items-center">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1">
              <Hash className="w-3 h-3 text-vibe-primary" /> Cultural Tags (Select Min 3)
            </label>
            <span className="text-[8px] font-mono text-zinc-500">
              {tags.length} SELECTED
            </span>
          </div>

          {/* Preset Pill Map */}
          <div className="flex flex-wrap gap-1.5 pb-2">
            {PRESET_TAGS.map((pTag) => {
              const isSelected = tags.includes(pTag);
              return (
                <button
                  type="button"
                  key={pTag}
                  onClick={() => handleToggleTag(pTag)}
                  className={cn(
                    "text-[10px] font-mono tracking-tight px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer",
                    isSelected 
                      ? "bg-vibe-primary/20 hover:bg-vibe-primary/30 border-vibe-primary text-vibe-secondary scale-102 font-bold" 
                      : "bg-zinc-950/60 border-white/5 hover:border-white/15 text-zinc-400"
                  )}
                >
                  #{pTag}
                </button>
              );
            })}
          </div>

          {/* Add custom tag */}
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Type custom tag..." 
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value.replace(/\s+/g, '-'))}
              className="flex-1 h-9 px-3 bg-zinc-950 border border-white/10 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-vibe-primary font-mono"
            />
            <button 
              type="button"
              onClick={handleAddCustomTag}
              className="h-9 px-3 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors cursor-pointer text-zinc-300"
            >
              Add
            </button>
          </div>
        </div>

        {/* 4. Oracle mode mandate checker */}
        <div className="flex items-center justify-between bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
          <div className="space-y-0.5 flex-1 pr-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#ef4444]" /> Cozy Diary Mode
            </span>
            <p className="text-[9px] text-zinc-500 leading-normal">
              Optional completion assistance for your bio, broad location and at least one contact handle.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={oracleMode} 
              onChange={() => setOracleMode(!oracleMode)}
              className="sr-only peer" 
            />
            <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#ef4444] peer-checked:after:bg-white" />
          </label>
        </div>

        {/* 5. Extended Information (Optional, required under Oracle mode) */}
        <div className="space-y-4 bg-zinc-900/20 p-4 rounded-xl border border-white/5">
          <div className="space-y-1.5 animate-in fade-in duration-200">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
              Biography {oracleMode && <span className="text-red-500">(Mandated)</span>}
            </label>
            <textarea 
              placeholder="Tell other voyagers about your cultural frequencies..." 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              required={oracleMode}
              className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-vibe-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
              City or broad location {oracleMode && <span className="text-red-500">(Mandated)</span>}
            </label>
            <input 
              type="text" 
              placeholder="e.g. Tunis, Tunisia / Shibuya, Tokyo" 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required={oracleMode}
              className="w-full h-10 px-3 bg-zinc-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                Contact Protocol
              </label>
              <select
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value)}
                className="w-full h-10 bg-zinc-950 border border-white/10 rounded-lg text-xs text-zinc-300 focus:outline-none px-2 cursor-pointer"
              >
                <option value="telegram">Telegram Direct</option>
                <option value="x">X Direct Message</option>
                <option value="email">Email Terminal</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                Telegram Handle
              </label>
              <input 
                type="text" 
                placeholder="e.g. paul_active" 
                value={telegramHandle}
                onChange={(e) => setTelegramHandle(e.target.value.replace('@', ''))}
                className="w-full h-10 px-3 bg-zinc-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                X (Twitter) Handle
              </label>
              <input 
                type="text" 
                placeholder="e.g. paul_cultural" 
                value={xHandle}
                onChange={(e) => setXHandle(e.target.value.replace('@', ''))}
                className="w-full h-10 px-3 bg-zinc-950 border border-white/10 rounded-lg text-xs text-white focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Languages</label>
          <input type="text" value={languages} onChange={event => setLanguages(event.target.value)}
            placeholder="English, Arabic" className="w-full h-10 px-3 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white" />
        </div>

        {/* Action button */}
        <button
          type="submit"
          disabled={submitting || (handleAvailable === false && !isEditing)}
          className="w-full h-12 bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl flex items-center justify-center font-bold tracking-[0.1em] text-xs uppercase italic transition-all cursor-pointer"
        >
          {submitting ? "Tying your boots..." : (isEditing ? "Save Diary Changes" : "Start Your Adventure")}
        </button>

      </form>
    </div>
  );
};
