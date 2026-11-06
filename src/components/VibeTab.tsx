import React, { useEffect, useState, useRef } from 'react';
import {
  Flame, Heart, MessageCircle, Share2, Sparkles, Send, Camera, Shield,
  User, ChevronLeft, ChevronRight, Check, X, Compass, Radio, Users, CheckCircle2,
  Lock, AlertCircle
} from 'lucide-react';
import { fetchVibePosts, VibePostItem, fetchCommentsForPost, addCommentToPost, VibeComment } from '../domains/d05_vibe';
import { fetchDemoProfiles, fetchPublicProfileByHandle, UserProfile } from '../domains/d02_users';
import { fetchOrbitProfiles, fetchEchoProfiles, unfollowUser, followUser } from '../domains/d03_social_graph';
import { fetchPendingPulls, fetchConfirmedVibes, acceptConnectionPull, passConnectionPull, ConnectionPull, ConfirmedVibe } from '../domains/d17_matching';
import { checkDmAuthorization, fetchDirectMessages, sendDirectMessage, DirectMessage } from '../domains/d14_messaging';
import { UserProfileCard } from './UserProfileCard';
import { ShareTab } from './ShareTab';

interface VibeTabProps {
  user: UserProfile | null;
  onNavigateShare?: () => void;
}

export const VibeTab: React.FC<VibeTabProps> = ({ user, onNavigateShare }) => {
  const [activeSubTab, setActiveSubTab] = useState<'gossip' | 'drift' | 'vibes' | 'orbit' | 'echo' | 'pulls'>('gossip');
  const [posts, setPosts] = useState<VibePostItem[]>([]);
  const [demoProfiles, setDemoProfiles] = useState<UserProfile[]>([]);
  const [orbitProfiles, setOrbitProfiles] = useState<UserProfile[]>([]);
  const [echoProfiles, setEchoProfiles] = useState<UserProfile[]>([]);
  const [pendingPulls, setPendingPulls] = useState<ConnectionPull[]>([]);
  const [confirmedVibes, setConfirmedVibes] = useState<ConfirmedVibe[]>([]);
  
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [comments, setComments] = useState<VibeComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newPostCaption, setNewPostCaption] = useState('');
  const [dualCameraOpen, setDualCameraOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  
  // 1:1 D14 Chat State
  const [activeChatUser, setActiveChatUser] = useState<{ id: string; name: string; handle: string; avatar: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<DirectMessage[]>([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [dmAuthError, setDmAuthError] = useState<string | null>(null);
  
  const [tunedWavelength, setTunedWavelength] = useState<string | null>('chill');
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVibePosts().then(setPosts);
    fetchDemoProfiles().then(setDemoProfiles);
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchOrbitProfiles(user.id).then(setOrbitProfiles);
      fetchEchoProfiles(user.id).then(setEchoProfiles);
      fetchPendingPulls(user.id).then(setPendingPulls);
      fetchConfirmedVibes(user.id).then(setConfirmedVibes);
    } else {
      setOrbitProfiles([]);
      setEchoProfiles([]);
      setPendingPulls([]);
      setConfirmedVibes([]);
    }
  }, [user]);

  const showToast = (msg: string) => {
    setNotificationToast(msg);
    setTimeout(() => setNotificationToast(null), 2500);
  };

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
    if (added) {
      setComments([...comments, added]);
      setNewComment('');
    }
  };

  const handleToggleLike = (postId: string) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === postId) {
          const isLiked = likedPosts.has(postId);
          return {
            ...p,
            reactions_count: Math.max(0, p.reactions_count + (isLiked ? -1 : 1))
          };
        }
        return p;
      })
    );
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostCaption.trim() || !user) {
      showToast('Please sign in to publish a vibe post.');
      return;
    }
    const newPost: VibePostItem = {
      id: 'post_' + Date.now(),
      user_id: user.id,
      username: user.username,
      avatar_url: user.avatar_url,
      caption: newPostCaption,
      image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
      selfie_url: user.avatar_url,
      created_at: new Date().toISOString(),
      reactions_count: 1,
      comments_count: 0
    };
    setPosts([newPost, ...posts]);
    setNewPostCaption('');
    showToast('Vibe broadcast published to district live feed!');
  };

  // D14 Direct Message Flow with strict invariant: ECHO never grants DMs
  const handleOpenChat = async (targetUser: { id: string; name: string; handle: string; avatar: string }) => {
    setDmAuthError(null);
    if (!user) {
      showToast('Authentication required before starting conversations.');
      return;
    }

    const authCheck = await checkDmAuthorization(user.id, targetUser.id);
    if (!authCheck.authorized) {
      setDmAuthError(authCheck.reason || 'D14 1:1 DMs require an accepted D17 confirmed Vibe.');
      setActiveChatUser(targetUser);
      setChatMessages([]);
      return;
    }

    setActiveChatUser(targetUser);
    const msgs = await fetchDirectMessages(user.id, targetUser.id);
    setChatMessages(msgs);
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatUser || !newChatMessage.trim() || !user) return;
    
    const res = await sendDirectMessage(user.id, activeChatUser.id, newChatMessage);
    if (res.success && res.message) {
      setChatMessages([...chatMessages, res.message]);
      setNewChatMessage('');
    } else {
      setDmAuthError(res.error || 'Failed to send message');
    }
  };

  const handleAcceptPull = async (pull: ConnectionPull) => {
    if (!user) return;
    const res = await acceptConnectionPull(pull.id, user.id, pull.sender_id);
    if (res.success) {
      setPendingPulls(prev => prev.filter(p => p.id !== pull.id));
      fetchConfirmedVibes(user.id).then(setConfirmedVibes);
      showToast(`Accepted Connection Pull! Confirmed Vibe established & D14 1:1 DMs unlocked.`);
    } else {
      showToast(res.error || 'Failed to accept pull');
    }
  };

  const handlePassPull = async (pullId: string) => {
    if (!user) return;
    const res = await passConnectionPull(pullId, user.id);
    if (res.success) {
      setPendingPulls(prev => prev.filter(p => p.id !== pullId));
      showToast('Passed connection pull.');
    }
  };

  const handleUnfollowOrbit = async (targetId: string, name: string) => {
    if (!user) return;
    const res = await unfollowUser(user.id, targetId);
    if (res.success) {
      setOrbitProfiles(prev => prev.filter(p => p.id !== targetId));
      showToast(`Removed @${name} from your Orbit.`);
    }
  };

  const handleFollowBackEcho = async (targetId: string, name: string) => {
    if (!user) return;
    const res = await followUser(user.id, targetId);
    if (res.success) {
      fetchOrbitProfiles(user.id).then(setOrbitProfiles);
      showToast(`ECHO back successful! Followed @${name} into your Orbit.`);
    }
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

  const subTabs = [
    { id: 'gossip', label: 'GOSSIP' },
    { id: 'drift', label: 'DRIFT' },
    { id: 'vibes', label: 'VIBES', badge: confirmedVibes.length ? confirmedVibes.length.toString() : undefined },
    { id: 'orbit', label: 'ORBIT', badge: orbitProfiles.length ? orbitProfiles.length.toString() : undefined },
    { id: 'echo', label: 'ECHO', badge: echoProfiles.length ? echoProfiles.length.toString() : undefined },
    { id: 'pulls', label: 'PULLS', badge: pendingPulls.length ? pendingPulls.length.toString() : undefined },
  ];

  return (
    <div className="space-y-4 pb-32 text-white max-w-md mx-auto box-border overflow-x-hidden">
      {/* Toast Notification */}
      {notificationToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-teal-500 text-neutral-950 font-bold text-xs shadow-2xl flex items-center space-x-2 animate-fadeIn border border-teal-300">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notificationToast}</span>
        </div>
      )}

      {/* Top Header Navigation Pill (Vibe Share) */}
      <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-3 flex items-center justify-between shadow-xl">
        <button
          onClick={() => setDualCameraOpen(true)}
          className="p-2.5 rounded-full bg-neutral-950 border border-amber-500/40 text-amber-300 hover:bg-neutral-900 transition flex items-center justify-center shadow cursor-pointer"
          title="Open Dual-Camera Share"
        >
          <Camera className="w-5 h-5 text-amber-400" />
        </button>
        <span className="font-black text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-300 via-white to-teal-300">
          Vibe Share
        </span>
        <button
          onClick={() => setActiveSubTab('gossip')}
          className="p-2.5 rounded-full bg-neutral-950 border border-amber-500/40 text-amber-300 hover:bg-neutral-900 transition flex items-center justify-center shadow cursor-pointer"
          title="Gossip Chat Feed"
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
            Active Crew & Guardians ({demoProfiles.length})
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleScroll('left')}
              className="p-1 rounded-lg bg-neutral-900 border border-neutral-800 text-teal-400 hover:bg-neutral-800 cursor-pointer"
              aria-label="Scroll Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="p-1 rounded-lg bg-neutral-900 border border-neutral-800 text-teal-400 hover:bg-neutral-800 cursor-pointer"
              aria-label="Scroll Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-none px-1"
        >
          {demoProfiles.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedProfile(p)}
              className="flex-shrink-0 w-36 rounded-2xl bg-neutral-900 border border-neutral-800 p-3 flex flex-col items-center text-center space-y-2 shadow-lg hover:border-teal-500/50 transition cursor-pointer"
            >
              <div className="relative">
                <img
                  src={p.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                  alt={p.username || 'user'}
                  className="w-12 h-12 rounded-full object-cover border-2 border-orange-500 shadow"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-neutral-900 animate-pulse" />
              </div>
              <div className="min-w-0 w-full">
                <h5 className="font-bold text-xs text-white truncate">{p.full_name || 'Explorer'}</h5>
                <p className="text-[10px] text-teal-400 truncate">@{p.username || 'explorer'}</p>
              </div>
              <span className="text-[9px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full font-bold uppercase truncate max-w-full">
                {p.tier || p.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Subtitle Banner per Tab */}
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
      <div className="space-y-1.5">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {subTabs.map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider whitespace-nowrap transition-all duration-300 flex items-center space-x-1.5 cursor-pointer ${
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

        {/* Track / Indicator bar under tabs */}
        <div className="flex items-center space-x-2 px-1">
          <span className="text-[10px] text-teal-500">◀</span>
          <div className="flex-1 h-1.5 rounded-full bg-neutral-900 border border-neutral-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 via-cyan-400 to-teal-400 transition-all duration-300 rounded-full"
              style={{
                width: `${
                  activeSubTab === 'gossip' ? '16%' :
                  activeSubTab === 'drift' ? '33%' :
                  activeSubTab === 'vibes' ? '50%' :
                  activeSubTab === 'orbit' ? '66%' :
                  activeSubTab === 'echo' ? '83%' : '100%'
                }`
              }}
            />
          </div>
          <span className="text-[10px] text-teal-500">▶</span>
        </div>
      </div>

      {/* GOSSIP TAB CONTENT */}
      {activeSubTab === 'gossip' && (
        <div className="space-y-4">
          {/* Composer */}
          <form onSubmit={handleCreatePost} className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 space-y-3 shadow-xl">
            <div className="flex space-x-3 items-start">
              <img
                src={user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                alt="User"
                className="w-9 h-9 rounded-full object-cover border border-orange-500/40"
              />
              <textarea
                value={newPostCaption}
                onChange={(e) => setNewPostCaption(e.target.value)}
                placeholder={`What's your vibe today, @${user?.username || 'explorer'}? Post to Gossip & My Network...`}
                className="flex-1 bg-transparent border-none text-xs text-white placeholder-neutral-500 focus:outline-none resize-none h-16"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs">
              <div className="flex items-center space-x-3 text-neutral-400">
                <button
                  type="button"
                  onClick={() => setDualCameraOpen(true)}
                  className="flex items-center space-x-1 hover:text-teal-400 transition cursor-pointer"
                  title="Capture dual photo"
                >
                  <Camera className="w-4 h-4 text-teal-400" />
                </button>
                <button
                  type="button"
                  onClick={() => setNewPostCaption(prev => prev ? `${prev} #MissionAccepted` : 'Completed District Heritage Mission! #MissionAccepted')}
                  className="flex items-center space-x-1 text-orange-400 font-bold hover:underline cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Mission</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewPostCaption(prev => prev ? `${prev} ✨ #VibeCheck` : 'Electric sunset vibe across the old souk. ✨ #VibeCheck')}
                  className="flex items-center space-x-1 text-purple-400 font-bold hover:underline cursor-pointer"
                >
                  <span>✨ Vibe</span>
                </button>
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-teal-500 text-white font-black text-xs shadow-lg hover:opacity-90 transition flex items-center space-x-1 cursor-pointer"
              >
                <span>POST</span>
                <Send className="w-3 h-3" />
              </button>
            </div>
          </form>

          {/* Vibe Signals & Gossip Feed (D12) Header */}
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

          {/* Posts List or Clean Empty State */}
          {posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post) => {
                const authorUsername = post.username || 'explorer';
                const isLiked = likedPosts.has(post.id);
                return (
                  <div key={post.id} className="rounded-3xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-2xl">
                    {/* Post Header */}
                    <div className="p-4 flex items-center justify-between border-b border-neutral-800/80">
                      <div
                        onClick={async () => {
                          const profile = await fetchPublicProfileByHandle(authorUsername);
                          if (profile) {
                            setSelectedProfile(profile);
                          } else {
                            setSelectedProfile({
                              id: post.user_id,
                              username: authorUsername,
                              full_name: authorUsername,
                              avatar_url: post.avatar_url,
                              vq_balance: 1000,
                              reputation: 92,
                              role: 'explorer',
                              created_at: post.created_at
                            });
                          }
                        }}
                        className="flex items-center space-x-3 cursor-pointer group"
                      >
                        <img
                          src={post.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                          alt={authorUsername}
                          className="w-10 h-10 rounded-full object-cover border border-orange-500/40 group-hover:border-teal-400 transition"
                        />
                        <div>
                          <h4 className="font-bold text-sm text-white group-hover:text-teal-400 transition">
                            @{authorUsername}
                          </h4>
                          <p className="text-[10px] text-neutral-400">Just now • 📍 Local Node</p>
                        </div>
                      </div>
                      <button
                        onClick={() => showToast('Vibe post link copied to clipboard!')}
                        className="text-neutral-400 hover:text-white transition cursor-pointer"
                        aria-label="Share post"
                      >
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
                          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-rose-500 fill-rose-500/30'}`} />
                          <span className="font-bold text-white">{post.reactions_count}</span>
                          <span>{post.reactions_count === 1 ? 'like' : 'likes'}</span>
                        </span>
                        <span>{post.comments_count} comments</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-neutral-800 text-xs font-semibold text-neutral-300">
                        <button
                          onClick={() => handleToggleLike(post.id)}
                          className={`flex items-center justify-center space-x-1.5 py-2 hover:bg-neutral-800/50 rounded-xl transition cursor-pointer ${
                            isLiked ? 'text-rose-400 font-bold' : ''
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-orange-400'}`} />
                          <span>{isLiked ? 'Liked' : 'Like'}</span>
                        </button>
                        <button
                          onClick={() => handleOpenComments(post.id)}
                          className="flex items-center justify-center space-x-1.5 py-2 hover:bg-neutral-800/50 rounded-xl transition text-teal-400 font-bold cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Comment</span>
                        </button>
                        <button
                          onClick={() => showToast('Post shared to your Orbit feed!')}
                          className="flex items-center justify-center space-x-1.5 py-2 hover:bg-neutral-800/50 rounded-xl transition cursor-pointer"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>Share</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl bg-neutral-900 border border-neutral-800 p-8 text-center space-y-3 shadow-xl">
              <Sparkles className="w-10 h-10 text-teal-400/70 mx-auto animate-pulse" />
              <h4 className="font-black text-base text-white">No Vibe Signals Yet</h4>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
                Be the first explorer to drop an authentic dual-camera moment or gossip signal into your district!
              </p>
              <button
                onClick={() => setDualCameraOpen(true)}
                className="mt-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-teal-500 text-white font-bold text-xs shadow-lg transition hover:opacity-90 cursor-pointer"
              >
                Launch BeReal Camera
              </button>
            </div>
          )}
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
            {wavelengths.map((w) => {
              const isTuned = tunedWavelength === w.id;
              return (
                <div
                  key={w.id}
                  className={`rounded-2xl bg-neutral-900 border p-4 space-y-2 transition flex flex-col justify-between ${
                    isTuned ? 'border-teal-400/80 shadow-lg shadow-teal-500/10' : 'border-neutral-800 hover:border-teal-500/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-white font-serif">{w.name}</h4>
                      <span className={`w-2.5 h-2.5 rounded-full ${w.color} animate-pulse`} />
                    </div>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{w.desc}</p>
                  </div>
                  <button
                    onClick={() => {
                      setTunedWavelength(w.id);
                      showToast(`Tuned into ${w.name} wavelength! Matching local explorers...`);
                    }}
                    className={`w-full mt-2 py-2 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                      isTuned
                        ? 'bg-teal-500/20 border border-teal-500/50 text-teal-300'
                        : 'bg-neutral-950 border border-neutral-800 hover:border-teal-500/50 text-neutral-300'
                    }`}
                  >
                    {isTuned ? (
                      <>
                        <Radio className="w-3.5 h-3.5 text-teal-400 animate-spin" />
                        <span>Tuned In Frequency</span>
                      </>
                    ) : (
                      <span>Tune In Wavelength</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIBES TAB CONTENT (D17 Confirmed Vibes Squad) */}
      {activeSubTab === 'vibes' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-bold text-xs text-teal-400 uppercase tracking-wider">CONFIRMED VIBES SQUAD (D17)</h3>
              <p className="text-[11px] text-neutral-400">
                Only confirmed mutual Vibes unlock ordinary 1:1 personal messaging (SOC-002).
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold whitespace-nowrap">
              {confirmedVibes.length} Confirmed
            </span>
          </div>

          {confirmedVibes.length > 0 ? (
            <div className="space-y-3">
              {confirmedVibes.map((v) => {
                const partnerId = v.user_1_id === user?.id ? v.user_2_id : v.user_1_id;
                const partnerProfile = {
                  id: partnerId,
                  name: v.partner_profile?.full_name || 'Matched Explorer',
                  handle: v.partner_profile?.username || 'explorer',
                  avatar: v.partner_profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
                };
                return (
                  <div key={v.id} className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center justify-between">
                    <div
                      onClick={async () => {
                        const profile = await fetchPublicProfileByHandle(partnerProfile.handle);
                        if (profile) setSelectedProfile(profile);
                      }}
                      className="flex items-center space-x-3 cursor-pointer group"
                    >
                      <img src={partnerProfile.avatar} alt={partnerProfile.name} className="w-12 h-12 rounded-full object-cover border border-teal-500/40 group-hover:border-teal-400 transition" />
                      <div>
                        <h4 className="font-bold text-sm text-white group-hover:text-teal-400 transition">{partnerProfile.name}</h4>
                        <p className="text-xs text-neutral-400">@{partnerProfile.handle}</p>
                        <span className="text-[10px] text-amber-300 font-medium">⚡ Cultural Explorer • Unlocked</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                        ✨ {v.vibe_score || 95}% Vibe
                      </span>
                      <button
                        onClick={() => handleOpenChat(partnerProfile)}
                        className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-neutral-950 font-black text-xs shadow transition flex items-center space-x-1 cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-8 text-center space-y-2">
              <Users className="w-8 h-8 text-teal-400/60 mx-auto" />
              <h4 className="font-bold text-xs text-white">No confirmed mutual vibes yet</h4>
              <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
                Send PULLs to explorers in your sector. Once they accept, your mutual vibe unlocks direct 1:1 DMs (SOC-002).
              </p>
            </div>
          )}
        </div>
      )}

      {/* ORBIT TAB CONTENT (D03 Outbound Follows) */}
      {activeSubTab === 'orbit' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-bold text-xs text-orange-400 uppercase tracking-wider">YOUR ORBIT (D03 OUTBOUND)</h3>
              <p className="text-[11px] text-neutral-400">
                Accounts you actively follow via ECHO. Following is directed and distinct from confirmed Vibes (ECHO never grants DMs).
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 font-bold whitespace-nowrap">
              {orbitProfiles.length} Orbiting
            </span>
          </div>

          {orbitProfiles.length > 0 ? (
            <div className="space-y-3">
              {orbitProfiles.map((g) => (
                <div key={g.id} className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center justify-between">
                  <div
                    onClick={() => setSelectedProfile(g)}
                    className="flex items-center space-x-3 min-w-0 cursor-pointer group"
                  >
                    <img src={g.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'} alt={g.full_name} className="w-12 h-12 rounded-full object-cover border border-orange-500/40 group-hover:border-teal-400 transition" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-white group-hover:text-teal-400 transition truncate">{g.full_name}</h4>
                      <p className="text-xs text-neutral-400 truncate">@{g.username}</p>
                      <p className="text-[11px] text-neutral-300 truncate mt-0.5">{g.district}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                    <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      {g.tier || g.role}
                    </span>
                    <button
                      onClick={() => handleUnfollowOrbit(g.id, g.username)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition cursor-pointer"
                    >
                      Unfollow
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-8 text-center space-y-2">
              <Radio className="w-8 h-8 text-orange-400/60 mx-auto" />
              <h4 className="font-bold text-xs text-white">Your Orbit is clear</h4>
              <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
                Tap ECHO on public profile cards to follow local legends and district explorers into your Orbit.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ECHO TAB CONTENT (D03 Inbound Followers) */}
      {activeSubTab === 'echo' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-bold text-xs text-purple-400 uppercase tracking-wider">ECHO FOLLOWERS (D03 INBOUND)</h3>
              <p className="text-[11px] text-neutral-400">
                Explorers who are tuning into your profile and presence frequency.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold whitespace-nowrap">
              {echoProfiles.length} Tuning In
            </span>
          </div>

          {echoProfiles.length > 0 ? (
            <div className="space-y-3">
              {echoProfiles.map((echo) => (
                <div key={echo.id} className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center justify-between">
                  <div
                    onClick={() => setSelectedProfile(echo)}
                    className="flex items-center space-x-3 cursor-pointer group"
                  >
                    <img src={echo.avatar_url || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80'} alt={echo.full_name} className="w-12 h-12 rounded-full object-cover border border-purple-500/40 group-hover:border-teal-400 transition" />
                    <div>
                      <h4 className="font-bold text-sm text-white group-hover:text-teal-400 transition">{echo.full_name}</h4>
                      <p className="text-xs text-neutral-400">@{echo.username}</p>
                      <p className="text-[11px] text-neutral-300 mt-0.5">{echo.bio || echo.district}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleFollowBackEcho(echo.id, echo.username)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-xs shadow transition cursor-pointer hover:opacity-90"
                  >
                    ECHO Back
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-8 text-center space-y-2">
              <Radio className="w-8 h-8 text-purple-400/60 mx-auto" />
              <h4 className="font-bold text-xs text-white">No active Echo frequencies</h4>
              <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
                Broadcast your vibe or check in at high-intensity pulses to attract inbound explorers.
              </p>
            </div>
          )}
        </div>
      )}

      {/* PULLS TAB CONTENT (D17 Inbound Connection Pulls) */}
      {activeSubTab === 'pulls' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-bold text-xs text-amber-400 uppercase tracking-wider">CONNECTION PULLS (D17 INBOUND)</h3>
              <p className="text-[11px] text-neutral-400">
                Explorers inviting you into their Vibe squad. Accept establishes a confirmed Vibe and unlocks 1:1 personal DMs.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold whitespace-nowrap">
              {pendingPulls.length} Pending
            </span>
          </div>

          {pendingPulls.length > 0 ? (
            <div className="space-y-3">
              {pendingPulls.map((p) => {
                const sender = p.sender_profile || {
                  username: 'explorer',
                  full_name: 'District Voyager',
                  avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
                };
                return (
                  <div key={p.id} className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        onClick={async () => {
                          const profile = await fetchPublicProfileByHandle(sender.username);
                          if (profile) setSelectedProfile(profile);
                        }}
                        className="flex items-center space-x-3 cursor-pointer group"
                      >
                        <img src={sender.avatar_url} alt={sender.full_name} className="w-12 h-12 rounded-full object-cover border border-amber-500/40 group-hover:border-teal-400 transition" />
                        <div>
                          <h4 className="font-bold text-sm text-white group-hover:text-teal-400 transition">{sender.full_name}</h4>
                          <p className="text-xs text-neutral-400">@{sender.username}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                        ✨ Pending Pull
                      </span>
                    </div>
                    {p.reason && (
                      <p className="text-xs text-neutral-300 italic bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800">
                        &ldquo;{p.reason}&rdquo;
                      </p>
                    )}
                    <div className="flex space-x-2 pt-1">
                      <button
                        onClick={() => handlePassPull(p.id)}
                        className="flex-1 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition cursor-pointer"
                      >
                        Pass
                      </button>
                      <button
                        onClick={() => handleAcceptPull(p)}
                        className="flex-2 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-black text-xs shadow-lg shadow-teal-500/20 transition hover:opacity-90 flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>ACCEPT</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-8 text-center space-y-2">
              <Users className="w-8 h-8 text-amber-400/60 mx-auto" />
              <h4 className="font-bold text-xs text-white">No pending connection pulls</h4>
              <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
                All connection invites reviewed. Browse district profiles to send outbound Vibe pulls.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 1:1 Secure Chat Modal (SOC-002) governed by D14 authorization */}
      {activeChatUser && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="w-full sm:max-w-md bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[85vh] flex flex-col shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center space-x-3">
                <img src={activeChatUser.avatar} alt={activeChatUser.name} className="w-9 h-9 rounded-full object-cover border border-teal-500/40" />
                <div>
                  <h4 className="font-bold text-sm text-white">{activeChatUser.name}</h4>
                  <p className="text-[10px] text-teal-400">@{activeChatUser.handle} • SOC-002 Encrypted</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveChatUser(null);
                  setDmAuthError(null);
                }}
                className="p-1.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {dmAuthError ? (
              <div className="py-8 px-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-white">D14 DM Access Denied</h4>
                <p className="text-xs text-neutral-300 leading-relaxed max-w-xs mx-auto">
                  {dmAuthError}
                </p>
                <p className="text-[11px] text-amber-300/80 bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                  Rule SOC-002: One-way ECHO follows do not unlock personal messages. Only mutual accepted Vibe requests (D17) unlock 1:1 DMs.
                </p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-3 min-h-[220px]">
                  {chatMessages.length > 0 ? (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] p-3 rounded-2xl text-xs space-y-1 ${
                            msg.sender_id === user?.id
                              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-br-sm'
                              : 'bg-neutral-950 border border-neutral-800 text-neutral-200 rounded-bl-sm'
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p className="text-[9px] text-white/60 text-right">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-xs text-neutral-500 italic">
                      Confirmed Vibe established. Start your 1:1 conversation!
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendChatMessage} className="flex items-center space-x-2 pt-2 border-t border-neutral-800">
                  <input
                    type="text"
                    value={newChatMessage}
                    onChange={(e) => setNewChatMessage(e.target.value)}
                    placeholder="Send a private vibe message..."
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="submit"
                    className="p-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-teal-500 text-white hover:opacity-90 transition cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* District Comments Modal */}
      {activePostId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="w-full sm:max-w-lg bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[80vh] flex flex-col shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="font-bold text-base">District Comments</h3>
              <button
                onClick={() => setActivePostId(null)}
                className="text-xs text-neutral-400 hover:text-white px-2.5 py-1 rounded-xl bg-neutral-800 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 min-h-[160px]">
              {comments.length > 0 ? (
                comments.map((comm) => (
                  <div key={comm.id} className="flex space-x-3 items-start bg-neutral-950/60 p-3 rounded-2xl border border-neutral-800">
                    <img src={comm.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'} alt={comm.username} className="w-8 h-8 rounded-full object-cover" />
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
                ))
              ) : (
                <div className="py-6 text-center text-xs text-neutral-500 italic">
                  No comments yet. Start the conversation!
                </div>
              )}
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
                className="p-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-teal-500 text-white hover:opacity-90 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {dualCameraOpen && (
        <ShareTab
          user={user}
          onPostSuccess={() => undefined}
          cameraOnly
          initialMode="dual"
          onClose={() => setDualCameraOpen(false)}
        />
      )}

      {/* User Profile Card Modal */}
      {selectedProfile && (
        <UserProfileCard
          profile={selectedProfile}
          currentUser={user}
          onClose={() => setSelectedProfile(null)}
          onToast={showToast}
        />
      )}
    </div>
  );
};
