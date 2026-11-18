import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, Sparkles, Send, Users } from 'lucide-react';
import { fetchVibePosts, VibePostItem, addReactionToPost, fetchCommentsForPost, addCommentToPost, VibeComment } from '../domains/d05_vibe';
import { fetchOrbitProfiles } from '../domains/d03_social_graph';
import { fetchConfirmedVibes } from '../domains/d17_matching';
import { UserProfile } from '../domains/d01_auth';
import { fetchAllMeetups, subscribeToMeetupUpdates } from '../domains/d12_meetups';
import { PlaceMeetup } from '../domains/d12_meetups/types';
import { MeetupCard } from './MeetupCard';
import { VibeFlashBoard } from './VibeFlashBoard';

interface HomeSocialFeedProps {
  user: UserProfile | null;
  onOpenComments: (postId: string) => void;
  onToast: (msg: string) => void;
  onInspectUser?: (profile: UserProfile) => void;
}

export const HomeSocialFeed: React.FC<HomeSocialFeedProps> = ({ user, onToast, onInspectUser }) => {
  const [activeTab, setActiveTab] = useState<'network' | 'local' | 'for_you'>('network');
  const [posts, setPosts] = useState<VibePostItem[]>([]);
  const [meetups, setMeetups] = useState<PlaceMeetup[]>([]);
  const [networkUserIds, setNetworkUserIds] = useState<Set<string>>(new Set());
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [showAllSocial, setShowAllSocial] = useState(false);

  useEffect(() => {
    setShowAllSocial(false);
  }, [activeTab]);

  // Inline comments state
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<Record<string, VibeComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchVibePosts().then(setPosts);
    fetchAllMeetups().then(setMeetups);

    const unsub = subscribeToMeetupUpdates(() => {
      fetchAllMeetups().then(setMeetups);
    });

    if (user?.id) {
      Promise.all([
        fetchOrbitProfiles(user.id),
        fetchConfirmedVibes(user.id)
      ]).then(([orbit, vibes]) => {
        const ids = new Set<string>();
        orbit.forEach(p => ids.add(p.id));
        vibes.forEach(v => {
          ids.add(v.user_1_id);
          ids.add(v.user_2_id);
        });
        ids.add(user.id);
        setNetworkUserIds(ids);
      });
    }

    return () => unsub();
  }, [user]);

  const handleToggleLike = async (postId: string) => {
    const isLiked = likedPosts.has(postId);
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (isLiked) next.delete(postId);
      else next.add(postId);
      return next;
    });
    const success = await addReactionToPost(postId);
    if (!success) {
      setLikedPosts(prev => {
        const next = new Set(prev);
        if (isLiked) next.add(postId);
        else next.delete(postId);
        return next;
      });
      onToast('Failed to record reaction.');
    }
  };

  const handleToggleComments = async (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }
    setExpandedPostId(postId);
    if (!postComments[postId]) {
      const comms = await fetchCommentsForPost(postId);
      setPostComments(prev => ({ ...prev, [postId]: comms }));
    }
  };

  const handleSendComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    if (!user) {
      onToast('Please sign in to comment.');
      return;
    }

    setCommentLoading(prev => ({ ...prev, [postId]: true }));
    const result = await addCommentToPost(postId, content, {
      username: user.username,
      avatar_url: user.avatar_url || ''
    });

    if (result) {
      setPostComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), result]
      }));
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
      onToast('Comment posted successfully!');
    } else {
      onToast('Failed to post comment. Please try again.');
    }
    setCommentLoading(prev => ({ ...prev, [postId]: false }));
  };

  const handleShare = async (post: VibePostItem) => {
    const text = `VibeQuest Social Feed: @${post.username} — "${post.caption}"`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'VibeQuest', text, url: window.location.href });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(`${text} - ${window.location.href}`);
      onToast('Post link copied to clipboard!');
    } catch {
      onToast('Share link ready!');
    }
  };

  const handleInspectAuthor = (userId: string, username: string, avatarUrl?: string, createdAt?: string) => {
    if (!onInspectUser) return;
    onInspectUser({
      id: userId,
      username: username,
      full_name: username,
      avatar_url: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      vq_balance: 500,
      reputation: 90,
      role: 'explorer',
      created_at: createdAt || new Date().toISOString()
    });
  };

  const filteredPosts = posts.filter(p => {
    if (activeTab === 'network') {
      if (networkUserIds.size === 0) return true;
      return networkUserIds.has(p.user_id);
    }
    if (activeTab === 'for_you') {
      return p.reactions_count > 0 || p.comments_count > 0;
    }
    return true; // local
  });

  return (
    <div className="space-y-4 pt-2">
      {/* Vibe Flash Board (Top of Home Feed) */}
      <VibeFlashBoard onToast={onToast} />

      {/* Social Feed Tabs matching reference image */}
      <div className="border-b border-[#DBDBDB] dark:border-neutral-800 pb-1 flex items-center space-x-6 text-sm">
        <button
          onClick={() => setActiveTab('network')}
          className={`pb-2.5 font-black uppercase tracking-wider transition relative cursor-pointer ${
            activeTab === 'network' ? 'text-[#0866FF] dark:text-amber-400 font-extrabold' : 'text-[#65676B] hover:text-[#050505] dark:text-neutral-400 dark:hover:text-white'
          }`}
        >
          <span>MY NETWORK</span>
          {activeTab === 'network' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0866FF] dark:bg-amber-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('local')}
          className={`pb-2.5 font-black uppercase tracking-wider transition relative cursor-pointer ${
            activeTab === 'local' ? 'text-[#0866FF] dark:text-amber-400 font-extrabold' : 'text-[#65676B] hover:text-[#050505] dark:text-neutral-400 dark:hover:text-white'
          }`}
        >
          <span>LOCAL VIBES</span>
          {activeTab === 'local' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0866FF] dark:bg-amber-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('for_you')}
          className={`pb-2.5 font-black uppercase tracking-wider transition relative cursor-pointer ${
            activeTab === 'for_you' ? 'text-[#0866FF] dark:text-amber-400 font-extrabold' : 'text-[#65676B] hover:text-[#050505] dark:text-neutral-400 dark:hover:text-white'
          }`}
        >
          <span>FOR YOU</span>
          {activeTab === 'for_you' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0866FF] dark:bg-amber-400 rounded-full" />
          )}
        </button>
      </div>

      {/* Feed Posts & Spot Meetups */}
      <div className="space-y-3.5">
        {/* Active Spot Meetups Cross-Feed Propagation */}
        {activeTab !== 'for_you' && meetups.length > 0 && (
          <div className="space-y-2.5 pb-1">
            <div className="flex items-center justify-between text-xs font-bold text-[#65676B] dark:text-neutral-400 uppercase tracking-wider px-1">
              <span className="flex items-center gap-1.5 text-[#0866FF] dark:text-blue-400 font-black">
                <Users className="w-3.5 h-3.5" />
                <span>Active Spot Meetups ({meetups.length})</span>
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {meetups
                .filter(m => {
                  if (activeTab === 'network') {
                    if (networkUserIds.size === 0) return true;
                    return (
                      m.host_user_id === user?.id ||
                      (user?.id && m.attendee_ids.includes(user.id)) ||
                      networkUserIds.has(m.host_user_id)
                    );
                  }
                  return true;
                })
                .slice(0, 2)
                .map(m => (
                  <MeetupCard key={m.id} meetup={m} currentUser={user} />
                ))}
            </div>
          </div>
        )}

        {filteredPosts.length > 0 ? (
          (showAllSocial ? filteredPosts : filteredPosts.slice(0, 3)).map((post) => {
            const isLiked = likedPosts.has(post.id);
            const likesCount = post.reactions_count + (isLiked ? 1 : 0);
            const isExpanded = expandedPostId === post.id;
            const commentsList = postComments[post.id] || [];
            const formattedDate = new Date(post.created_at || Date.now()).toLocaleDateString('en-US', {
              month: 'numeric',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div key={post.id} className="rounded-3xl bg-white dark:bg-[#131116] border border-[#DBDBDB] dark:border-neutral-800 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-xl p-4 space-y-3.5">
                {/* 1. Media Section */}
                {post.image_url && post.image_url.trim() !== '' ? (
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#F0F2F5] dark:bg-neutral-950">
                    <img src={post.image_url} alt="Scene" className="w-full h-full object-cover" />
                    <div className="absolute bottom-3 left-3 bg-neutral-950/90 text-white font-bold text-xs px-3 py-1.5 rounded-full flex items-center space-x-1.5 border border-neutral-800 shadow">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>COZY</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#F0F2F5] dark:bg-neutral-950/85 p-6 flex flex-col justify-center items-center text-center border border-[#E4E6EB] dark:border-transparent">
                    <div className="absolute top-3 left-3 bg-white dark:bg-neutral-950/90 text-[#050505] dark:text-white font-bold text-xs px-3 py-1.5 rounded-full flex items-center space-x-1.5 border border-[#DBDBDB] dark:border-neutral-800 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
                      <span>COZY</span>
                    </div>
                    <Sparkles className="w-10 h-10 text-[#0866FF]/70 dark:text-amber-400/60 mb-2" />
                    <p className="text-sm font-bold text-[#050505] dark:text-white">VibeQuest Wavelength Broadcast</p>
                  </div>
                )}

                {/* 2. Author Row (Clickable to open UserProfileCard) */}
                <div
                  onClick={() => handleInspectAuthor(post.user_id, post.username, post.avatar_url, post.created_at)}
                  className="flex items-center justify-between pt-1 cursor-pointer group"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={post.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                      alt={post.username}
                      className="w-10 h-10 rounded-full object-cover border border-[#DBDBDB] dark:border-amber-500/40 shadow-sm group-hover:scale-105 transition"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-[#050505] dark:text-amber-300 group-hover:underline">@{post.username}</h4>
                      <p className="text-[11px] text-[#65676B] dark:text-neutral-400">{formattedDate}</p>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-[#E7F3FF] border border-[#0866FF]/20 text-[#0866FF] dark:bg-amber-950/40 dark:border-amber-500/40 dark:text-amber-400 font-black text-[10px] tracking-wider shadow-sm">
                    VERIFIED SYNC
                  </div>
                </div>

                {/* 3. Caption */}
                {post.caption && (
                  <p className="text-xs sm:text-sm text-[#262626] dark:text-neutral-200 leading-relaxed font-medium">
                    {post.caption}
                  </p>
                )}

                {/* 4. Action Row */}
                <div className="pt-3 border-t border-[#E4E6EB] dark:border-neutral-800 flex items-center justify-between text-[#65676B] dark:text-neutral-400 text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(post.id)}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl transition cursor-pointer ${
                      isLiked ? 'text-rose-500 bg-rose-500/10' : 'hover:text-[#050505] hover:bg-[#F0F2F5] dark:hover:text-white dark:hover:bg-neutral-800'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                    <span className="font-bold">{likesCount}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleComments(post.id)}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl hover:text-[#050505] hover:bg-[#F0F2F5] dark:hover:text-white dark:hover:bg-neutral-800 transition cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="font-bold">{post.comments_count}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShare(post)}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl hover:text-[#050505] hover:bg-[#F0F2F5] dark:hover:text-white dark:hover:bg-neutral-800 transition cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                </div>

                {/* 5. Expanded Inline Comments Section */}
                {isExpanded && (
                  <div className="pt-3 border-t border-[#E4E6EB] dark:border-neutral-800/80 space-y-3 animate-fadeIn">
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {commentsList.length > 0 ? (
                        commentsList.map(comm => (
                          <div key={comm.id} className="flex space-x-2.5 items-start bg-[#F0F2F5] dark:bg-neutral-950 p-2.5 rounded-2xl border border-[#E4E6EB] dark:border-neutral-800/80">
                            <img
                              src={comm.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                              alt={comm.username}
                              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span
                                  onClick={() => handleInspectAuthor('u-comm-' + comm.id, comm.username, comm.avatar_url, comm.created_at)}
                                  className="font-bold text-xs text-[#050505] dark:text-amber-300 cursor-pointer hover:underline"
                                >
                                  @{comm.username}
                                </span>
                                <span className="text-[9px] text-[#65676B] dark:text-neutral-500">
                                  {new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-xs text-[#262626] dark:text-neutral-300 mt-0.5">{comm.content}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-3 text-xs text-[#65676B] dark:text-neutral-500 italic">
                          No comments yet. Join the conversation!
                        </div>
                      )}
                    </div>

                    <form onSubmit={(e) => handleSendComment(e, post.id)} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                        placeholder="Write a comment..."
                        className="flex-1 bg-[#F0F2F5] dark:bg-neutral-950 border border-[#DBDBDB] dark:border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-[#050505] dark:text-white placeholder-[#65676B] dark:placeholder-neutral-500 focus:outline-none focus:border-[#0866FF] dark:focus:border-teal-500"
                      />
                      <button
                        type="submit"
                        disabled={commentLoading[post.id]}
                        className="p-2 rounded-xl bg-[#0866FF] dark:bg-gradient-to-r dark:from-orange-500 dark:to-teal-500 text-white hover:opacity-90 transition cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl bg-white dark:bg-neutral-900/60 border border-[#DBDBDB] dark:border-neutral-800 p-6 text-center space-y-2 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-none">
            <Sparkles className="w-7 h-7 text-[#0866FF] dark:text-amber-400 mx-auto" />
            <h4 className="font-bold text-xs text-[#050505] dark:text-white">No posts in {activeTab.replace('_', ' ')} feed</h4>
            <p className="text-[11px] text-[#65676B] dark:text-neutral-400">Share your district moment or follow explorers in Orbit.</p>
          </div>
        )}

        {filteredPosts.length > 3 && (
          <div className="text-center pt-1 pb-2">
            <button
              type="button"
              onClick={() => setShowAllSocial(v => !v)}
              className="px-5 py-2.5 rounded-2xl bg-white border border-[#DBDBDB] text-xs font-bold text-[#0866FF] hover:bg-[#F0F2F5] dark:bg-neutral-900 dark:border-neutral-700 dark:text-amber-400 dark:hover:bg-neutral-800 transition cursor-pointer shadow-sm dark:shadow-lg"
            >
              {showAllSocial ? 'Show Less' : `View All (${filteredPosts.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
