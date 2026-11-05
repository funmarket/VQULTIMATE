import React, { useEffect, useState, useRef } from 'react';
import { Flame, Heart, MessageCircle, Share2, Sparkles, Send, Camera, Shield, User, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { fetchVibePosts, VibePostItem, fetchCommentsForPost, addCommentToPost, VibeComment } from '../domains/d05_vibe';
import { fetchGuardians, Guardian } from '../domains/d02_users';
import { UserProfile, REAL_TEST_USERS } from '../domains/d01_auth';

interface VibeTabProps {
  user: UserProfile | null;
  onNavigateShare?: () => void;
}

export const VibeTab: React.FC<VibeTabProps> = ({ user, onNavigateShare }) => {
  const [activeSubTab, setActiveSubTab] = useState<'gossip' | 'drift' | 'vibes' | 'orbit' | 'echo' | 'pulls'>('gossip');
  const [posts, setPosts] = useState<VibePostItem[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [comments, setComments] = useState<VibeComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newPostCaption, setNewPostCaption] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProfileUser, setSelectedProfileUser] = useState<any | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([fetchVibePosts(), fetchGuardians()]).then(([postData, guardData]) => {
      setPosts(postData);
      setGuardians(guardData);
      setLoading(false);
    });
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 220;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleOpenComments = async (postId: string) => {
    setActivePostId(postId);
    const comms = await fetchCommentsForPost(postId);
    setComments(comms);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePostId || !newComment.trim() || !user) return;
    const added = await addCommentToPost(activePostId, newComment, {
      username: user.username,
      avatar_url: user.avatar_url
    });
    setComments([...comments, added]);
    setNewComment('');
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostCaption.trim() || !user) return;
    const newPost: VibePostItem = {
      id: 'post_' + Date.now(),
      user_id: user.id,
      username: user.username,
      avatar_url: user.avatar_url,
      caption: newPostCaption,
      image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
      selfie_url: user.avatar_url,
      lat: 25.2048,
      lng: 55.2708,
      created_at: new Date().toISOString(),
      reactions_count: 1,
      comments_count: 0
    };
    setPosts([newPost, ...posts]);
    setNewPostCaption('');
  };

  const wavelengths = [
    { id: 'chill', name: 'Chill Vibes', desc: 'zero plans, maximum good energy. just exist together', color: 'bg-teal-400' },
    { id: 'sweat', name: 'Sweat Vibes', desc: 'gym, run, flow, or sport — let’s sweat the same wavelength', color: 'bg-red-400' },
    { id: 'lounge', name: 'Lounge Vibes', desc: 'coffee shops, rooftops, vinyl & zero rush, pure cozy mode', color: 'bg-amber-400' },
    { id: 'brain', name: 'Brain Vibes', desc: 'deep talks, wild ideas, 3am theories, brainrot besties welcome', color: 'bg-purple-400' },
    { id: 'sunset', name: 'Sunset Vibes', desc: 'golden hour walks, rooftop sits, chasing that orange sky glow', color: 'bg-orange-400' },
    { id: 'mellow', name: 'Mellow Vibes', desc: 'slow mornings, soft playlists, doing nothing but feeling everything', color: 'bg-cyan-400' },
    { id: 'echo', name: 'Echo Vibes', desc: 'instant click, same frequency, we just get each other', color: 'bg-emerald-400' },
    { id: 'zen', name: 'Zen Vibes', desc: 'breathwork, nature reset, calm your chaos together', color: 'bg-green-400' },
    { id: 'groove', name: 'Groove Vibes', desc: 'music, dance, kitchen concerts — let’s move to the same beat', color: 'bg-pink-400' },
    { id: 'pixel', name: 'Pixel Vibes', desc: 'gaming sessions, late night streams, digital world twins', color: 'bg-indigo-400' },
    { id: 'quest', name: 'Quest Vibes', desc: 'spontaneous adventures, hidden spots, real life side quests', color: 'bg-amber-500' },
    { id: 'wander', name: 'Wander', desc: 'just wander away, get lost and lose yourself in an unplanned journey with no map', color: 'bg-teal-500' },
  ];

  return (
    <div className="space-y-4 pb-32 text-white max-w-md mx-auto box-border overflow-x-hidden">
      {/* Top Header Navigation Pill (Vibe Share toggle) */}
      <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3 flex items-center justify-between shadow-xl">
        <button
          onClick={onNavigateShare}
          className="p-2.5 rounded-full bg-neutral-950 border border-amber-500/40 text-amber-300 hover:bg-neutral-900 transition flex items-center justify-center shadow"
          title="Open Dual-Camera Share"
        >
          <Camera className="w-5 h-5 text-amber-400" />
        </button>
        <span className="font-black text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-300 via-white to-teal-300">
          Vibe Share
        </span>
        <button
          onClick={() => setActiveSubTab('gossip')}
          className="p-2.5 rounded-full bg-neutral-950 border border-amber-500/40 text-amber-300 hover:bg-neutral-900 transition flex items-center justify-center shadow"
        >
          <MessageCircle className="w-5 h-5 text-teal-400" />
        </button>
      </div>

      {/* Rumi Quote Banner */}
      <div className="rounded-2xl bg-neutral-900/80 border border-neutral-800 p-5 text-center space-y-2 shadow-lg backdrop-blur-md">
        <p className="text-sm italic font-serif text-amber-200/90 leading-relaxed">
          &ldquo;Out beyond ideas of wrongdoing and rightdoing, there is a field. I&apos;ll meet you there.&rdquo;
        </p>
        <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-bold">— RUMI</p>
      </div>

      {/* Horizontal User Cards Strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">
            Active Crew & Guardians ({guardians.length})
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleScroll('left')}
              className="p-1 rounded-lg bg-neutral-900 border border-neutral-800 text-teal-400 hover:bg-neutral-800"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="p-1 rounded-lg bg-neutral-900 border border-neutral-800 text-teal-400 hover:bg-neutral-800"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-none px-1"
        >
          {REAL_TEST_USERS.map((tu) => (
            <div
              key={tu.id}
              onClick={() => setSelectedProfileUser({
                name: tu.full_name,
                handle: '@' + tu.username,
                avatar: tu.avatar_url,
                tier: tu.role.toUpperCase(),
                district: 'Active Node',
                bio: 'Authenticated Supabase test user & active VibeQuest participant.',
                vq: tu.vq_balance || 1420
              })}
              className="flex-shrink-0 w-36 rounded-2xl bg-neutral-900 border border-neutral-800 p-3 flex flex-col items-center text-center space-y-2 shadow-lg hover:border-teal-500/50 transition cursor-pointer"
            >
              <div className="relative">
                <img src={tu.avatar_url} alt={tu.username} className="w-12 h-12 rounded-full object-cover border-2 border-orange-500 shadow" />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-neutral-900 animate-pulse" />
              </div>
              <div className="min-w-0 w-full">
                <h5 className="font-bold text-xs text-white truncate">{tu.full_name}</h5>
                <p className="text-[10px] text-teal-400 truncate">@{tu.username}</p>
              </div>
              <span className="text-[9px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full font-bold uppercase">
                {tu.role}
              </span>
            </div>
          ))}
          {guardians.map((g) => (
            <div
              key={g.id}
              onClick={() => setSelectedProfileUser({
                name: g.name,
                handle: '@' + g.name.toLowerCase().replace(' ', '_'),
                avatar: g.avatar,
                tier: g.badge.toUpperCase(),
                district: g.district,
                bio: g.bio || 'Certified district guardian and cultural curator.',
                vq: 2450
              })}
              className="flex-shrink-0 w-36 rounded-2xl bg-neutral-900 border border-neutral-800 p-3 flex flex-col items-center text-center space-y-2 shadow-lg hover:border-teal-500/50 transition cursor-pointer"
            >
              <div className="relative">
                <img src={g.avatar} alt={g.name} className="w-12 h-12 rounded-full object-cover border-2 border-teal-500 shadow" />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-neutral-900" />
              </div>
              <div className="min-w-0 w-full">
                <h5 className="font-bold text-xs text-white truncate">{g.name}</h5>
                <p className="text-[10px] text-neutral-400 truncate">{g.district}</p>
              </div>
              <span className="text-[9px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-bold uppercase">
                {g.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Subtitle Banner based on Tab */}
      <div className="text-center py-1">
        <p className="text-[11px] font-bold tracking-widest uppercase text-neutral-400">
          {activeSubTab === 'gossip' && 'SPILL THE TEA FROM YOUR CREW AND MATCHED BESTIES — NO FILTER ZONE'}
          {activeSubTab === 'drift' && 'WANDER AWAY, GET LOST ON PURPOSE, AND VIBE WITH RANDOM LEGENDS'}
          {activeSubTab === 'vibes' && 'YOUR OFFICIAL DOUBLE-MATCHED SQUAD — THE ONES WHO ALREADY CHOSE YOU BACK'}
          {activeSubTab === 'orbit' && 'YOUR GRAVITATIONAL AURA CREW — THE COOL ONES CIRCLING YOUR ENERGY'}
          {activeSubTab === 'echo' && 'TUNING IN — WHO IS LISTENING TO YOUR FREQUENCY'}
          {activeSubTab === 'pulls' && 'INCOMING VIBE MAGNETS — WHO\'S PULLING YOU IN RIGHT NOW?'}
        </p>
      </div>

      {/* 6 Tabs: GOSSIP, DRIFT, VIBES, ORBIT, ECHO, PULLS */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'gossip', label: 'GOSSIP' },
          { id: 'drift', label: 'DRIFT' },
          { id: 'vibes', label: 'VIBES', badge: '2' },
          { id: 'orbit', label: 'ORBIT', badge: '2' },
          { id: 'echo', label: 'ECHO', badge: '1' },
          { id: 'pulls', label: 'PULLS', badge: '2' },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider whitespace-nowrap transition-all duration-300 flex items-center space-x-1.5 ${
                isActive
                  ? 'bg-neutral-900 text-teal-400 border border-teal-500/60 shadow-lg shadow-teal-500/20'
                  : 'bg-neutral-900/60 text-neutral-400 border border-neutral-800 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-300 text-[9px] font-bold flex items-center justify-center border border-teal-500/40">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* GOSSIP TAB CONTENT */}
      {activeSubTab === 'gossip' && (
        <div className="space-y-4">
          {/* Composer */}
          <form onSubmit={handleCreatePost} className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 space-y-3 shadow-xl">
            <div className="flex space-x-3 items-start">
              <img src={user?.avatar_url || REAL_TEST_USERS[0].avatar_url} alt="User" className="w-9 h-9 rounded-full object-cover border border-orange-500/40" />
              <textarea
                value={newPostCaption}
                onChange={(e) => setNewPostCaption(e.target.value)}
                placeholder={`What's your vibe today, @${user?.username || 'explorer'}? Post to Gossip & My Network...`}
                className="flex-1 bg-transparent border-none text-xs text-white placeholder-neutral-500 focus:outline-none resize-none h-16"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs">
              <div className="flex items-center space-x-3 text-neutral-400">
                <button type="button" className="flex items-center space-x-1 hover:text-teal-400 transition">
                  <Camera className="w-4 h-4 text-teal-400" />
                </button>
                <button type="button" className="flex items-center space-x-1 text-orange-400 font-bold hover:underline">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Mission</span>
                </button>
                <button type="button" className="flex items-center space-x-1 text-purple-400 font-bold hover:underline">
                  <span>✨ Vibe</span>
                </button>
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-teal-500 text-white font-black text-xs shadow-lg hover:opacity-90 transition flex items-center space-x-1"
              >
                <span>POST</span>
                <Send className="w-3 h-3" />
              </button>
            </div>
          </form>

          {/* Vibe Signals & Gossip Feed (D12) */}
          <div className="flex items-center justify-between text-xs font-bold text-neutral-400 px-1">
            <span className="flex items-center space-x-1.5 text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>VIBE SIGNALS & GOSSIP FEED (D12)</span>
            </span>
            <span className="flex items-center space-x-1 text-emerald-400 text-[10px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE NETWORK</span>
            </span>
          </div>

          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="rounded-3xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-2xl">
                {/* Post Header */}
                <div className="p-4 flex items-center justify-between border-b border-neutral-800/80">
                  <div className="flex items-center space-x-3">
                    <img src={post.avatar_url} alt={post.username} className="w-10 h-10 rounded-full object-cover border border-orange-500/40" />
                    <div>
                      <h4 className="font-bold text-sm text-white">@{post.username}</h4>
                      <p className="text-[10px] text-neutral-400">Just now • 📍 Local Node</p>
                    </div>
                  </div>
                  <button className="text-neutral-400 hover:text-white">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Post Image with PIP Selfie */}
                <div className="relative aspect-[4/5] bg-neutral-950">
                  <img src={post.image_url} alt="Scene" className="w-full h-full object-cover" />
                  {post.selfie_url && (
                    <div className="absolute top-4 left-4 w-24 h-32 rounded-2xl overflow-hidden border-4 border-orange-500 shadow-2xl">
                      <img src={post.selfie_url} alt="Selfie" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Caption & Actions */}
                <div className="p-4 space-y-3">
                  <p className="text-sm text-neutral-200">{post.caption}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs text-neutral-400">
                    <span className="flex items-center space-x-1">
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/30" />
                      <span className="font-bold text-white">{post.reactions_count}</span>
                      <span>like</span>
                    </span>
                    <span>{post.comments_count} comments</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 pt-2 border-t border-neutral-800 text-xs font-semibold text-neutral-300">
                    <button className="flex items-center justify-center space-x-1.5 py-2 hover:bg-neutral-800/50 rounded-xl transition">
                      <Heart className="w-4 h-4 text-orange-400" />
                      <span>Like</span>
                    </button>
                    <button
                      onClick={() => handleOpenComments(post.id)}
                      className="flex items-center justify-center space-x-1.5 py-2 hover:bg-neutral-800/50 rounded-xl transition text-teal-400 font-bold"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Comment</span>
                    </button>
                    <button className="flex items-center justify-center space-x-1.5 py-2 hover:bg-neutral-800/50 rounded-xl transition">
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DRIFT TAB CONTENT */}
      {activeSubTab === 'drift' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 space-y-2">
            <h3 className="font-bold text-sm text-teal-300">Shared Wavelengths</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Tune into a neighborhood wavelength to chat and drift along with fellow travelers sharing similar interests!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {wavelengths.map((w) => (
              <div key={w.id} className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 space-y-2 hover:border-teal-500/50 transition cursor-pointer flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-white font-serif">{w.name}</h4>
                    <span className={`w-2.5 h-2.5 rounded-full ${w.color} animate-pulse`} />
                  </div>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{w.desc}</p>
                </div>
                <button
                  onClick={() => alert(`Tuned into ${w.name}! Matching explorers...`)}
                  className="w-full mt-2 py-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-teal-500/50 text-[11px] font-bold text-teal-300 transition"
                >
                  Tune In Wavelength
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIBES TAB CONTENT */}
      {activeSubTab === 'vibes' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-bold text-xs text-teal-400 uppercase tracking-wider">CONFIRMED VIBES SQUAD (D17)</h3>
              <p className="text-[11px] text-neutral-400">Only confirmed mutual Vibes unlock ordinary 1:1 personal messaging (SOC-002).</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold whitespace-nowrap">
              2 Confirmed
            </span>
          </div>

          <div className="space-y-3">
            {[
              { id: 'v-1', name: 'Sarah K.', handle: '@sarah_carthage', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', score: '92% Vibe' },
              { id: 'v-2', name: 'Yassine B.', handle: '@yassine_medina', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80', score: '95% Vibe' },
            ].map((v) => (
              <div key={v.id} className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img src={v.avatar} alt={v.name} className="w-12 h-12 rounded-full object-cover border border-teal-500/40" />
                  <div>
                    <h4 className="font-bold text-sm text-white">{v.name}</h4>
                    <p className="text-xs text-neutral-400">{v.handle}</p>
                    <span className="text-[10px] text-amber-300 font-medium">⚡ Cultural Explorer • Unlocked</span>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                    ✨ {v.score}
                  </span>
                  <button
                    onClick={() => alert(`Opening 1:1 secure DM with ${v.name} (SOC-002)`)}
                    className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-neutral-950 font-black text-xs shadow transition flex items-center space-x-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ORBIT TAB CONTENT */}
      {activeSubTab === 'orbit' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-bold text-xs text-orange-400 uppercase tracking-wider">YOUR ORBIT (D03 OUTBOUND)</h3>
              <p className="text-[11px] text-neutral-400">Accounts you actively follow. Following is directed and distinct from confirmed Vibes.</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 font-bold whitespace-nowrap">
              2 Orbiting
            </span>
          </div>

          <div className="space-y-3">
            {guardians.map((g) => (
              <div key={g.id} className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <img src={g.avatar} alt={g.name} className="w-12 h-12 rounded-full object-cover border border-orange-500/40" />
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-white truncate">{g.name}</h4>
                    <p className="text-xs text-neutral-400 truncate">@{g.name.toLowerCase().replace(' ', '_')}</p>
                    <p className="text-[11px] text-neutral-300 truncate mt-0.5">{g.district} guide & explorer</p>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                  <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    {g.badge}
                  </span>
                  <button
                    onClick={() => alert(`Unfollowed ${g.name}`)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition"
                  >
                    Unfollow
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ECHO TAB CONTENT */}
      {activeSubTab === 'echo' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-bold text-xs text-purple-400 uppercase tracking-wider">ECHO FOLLOWERS (D03 INBOUND)</h3>
              <p className="text-[11px] text-neutral-400">Explorers who are tuning into your profile and presence frequency.</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold whitespace-nowrap">
              1 Tuning In
            </span>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img src={REAL_TEST_USERS[1].avatar_url} alt="Layla" className="w-12 h-12 rounded-full object-cover border border-purple-500/40" />
                <div>
                  <h4 className="font-bold text-sm text-white">{REAL_TEST_USERS[1].full_name}</h4>
                  <p className="text-xs text-neutral-400">@{REAL_TEST_USERS[1].username}</p>
                  <p className="text-[11px] text-neutral-300 mt-0.5">Urban food anthropologist</p>
                </div>
              </div>
              <button
                onClick={() => alert('Followed back!')}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-xs shadow transition hover:opacity-90"
              >
                Follow Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PULLS TAB CONTENT */}
      {activeSubTab === 'pulls' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-bold text-xs text-amber-400 uppercase tracking-wider">CONNECTION PULLS (D17 INBOUND)</h3>
              <p className="text-[11px] text-neutral-400">Explorers inviting you into their Vibe squad. Accept establishes a confirmed Vibe and unlocks 1:1 personal DMs.</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold whitespace-nowrap">
              2 Pending
            </span>
          </div>

          <div className="space-y-3">
            {[
              { id: 'p-1', name: 'Hannibal Barca', handle: '@hannibal', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', match: '98% Match', reason: 'High music resonance & shared heritage interest.' },
              { id: 'p-2', name: 'Zainab Nuru', handle: '@zainab_nuru', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', match: '92% Match', reason: 'Neon dunes & midnight trail companion.' },
            ].map((p) => (
              <div key={p.id} className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src={p.avatar} alt={p.name} className="w-12 h-12 rounded-full object-cover border border-amber-500/40" />
                    <div>
                      <h4 className="font-bold text-sm text-white">{p.name}</h4>
                      <p className="text-xs text-neutral-400">{p.handle}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                    ✨ {p.match}
                  </span>
                </div>
                <p className="text-xs text-neutral-300 italic bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800">&ldquo;{p.reason}&rdquo;</p>
                <div className="flex space-x-2 pt-1">
                  <button
                    onClick={() => alert(`Passed connection pull from ${p.name}`)}
                    className="flex-1 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition"
                  >
                    Pass
                  </button>
                  <button
                    onClick={() => alert(`Accepted connection pull from ${p.name}! Confirmed Vibe established & DM unlocked.`)}
                    className="flex-2 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-black text-xs shadow-lg shadow-teal-500/20 transition hover:opacity-90 flex items-center justify-center space-x-1"
                  >
                    <Check className="w-4 h-4" />
                    <span>ACCEPT</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {activePostId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[80vh] flex flex-col shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-bold text-base">District Comments</h3>
              <button
                onClick={() => setActivePostId(null)}
                className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-800"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {comments.map((comm) => (
                <div key={comm.id} className="flex space-x-3 items-start bg-neutral-950/60 p-3 rounded-2xl border border-neutral-800">
                  <img src={comm.avatar_url} alt={comm.username} className="w-8 h-8 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">@{comm.username}</span>
                      <span className="text-[10px] text-neutral-500">
                        {new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 mt-1">{comm.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendComment} className="flex items-center space-x-2 pt-2 border-t border-neutral-800">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-teal-500 text-white hover:opacity-90 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
      {/* User Profile Card Modal */}
      {selectedProfileUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-2xl text-white relative">
            <button
              onClick={() => setSelectedProfileUser(null)}
              className="absolute top-4 right-4 text-xs text-neutral-400 hover:text-white px-2.5 py-1 rounded-xl bg-neutral-800"
            >
              ✕ Close
            </button>
            <div className="flex flex-col items-center text-center space-y-3 pt-2">
              <img src={selectedProfileUser.avatar} alt={selectedProfileUser.name} className="w-20 h-20 rounded-full object-cover ring-4 ring-orange-500/50 shadow-xl" />
              <div>
                <h3 className="font-black text-base text-white">{selectedProfileUser.name}</h3>
                <p className="text-xs text-teal-400">{selectedProfileUser.handle}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2.5 py-1 rounded-full font-bold uppercase">
                  {selectedProfileUser.tier}
                </span>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2.5 py-1 rounded-full font-bold">
                  ⚡ {selectedProfileUser.vq} VQ
                </span>
              </div>
              <p className="text-xs text-neutral-300 italic bg-neutral-950 p-3 rounded-2xl border border-neutral-800 w-full">
                &ldquo;{selectedProfileUser.bio}&rdquo;
              </p>
              <div className="text-[11px] text-neutral-400 flex items-center space-x-1">
                <span>District:</span>
                <span className="text-white font-semibold">{selectedProfileUser.district}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full pt-2">
                <button
                  onClick={() => {
                    alert(`Followed ${selectedProfileUser.name} in your Orbit!`);
                    setSelectedProfileUser(null);
                  }}
                  className="py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs transition"
                >
                  Follow Orbit
                </button>
                <button
                  onClick={() => {
                    alert(`Sent Vibe Pull to ${selectedProfileUser.name}!`);
                    setSelectedProfileUser(null);
                  }}
                  className="py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-teal-500 text-white font-black text-xs shadow-lg transition hover:opacity-90"
                >
                  Send Pull
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
