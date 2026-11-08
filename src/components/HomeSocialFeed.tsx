import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, Sparkles } from 'lucide-react';
import { fetchVibePosts, VibePostItem, addReactionToPost } from '../domains/d05_vibe';
import { fetchOrbitProfiles } from '../domains/d03_social_graph';
import { fetchConfirmedVibes } from '../domains/d17_matching';
import { UserProfile } from '../domains/d01_auth';

interface HomeSocialFeedProps {
  user: UserProfile | null;
  onOpenComments: (postId: string) => void;
  onToast: (msg: string) => void;
}

export const HomeSocialFeed: React.FC<HomeSocialFeedProps> = ({ user, onOpenComments, onToast }) => {
  const [activeTab, setActiveTab] = useState<'network' | 'local' | 'for_you'>('network');
  const [posts, setPosts] = useState<VibePostItem[]>([]);
  const [networkUserIds, setNetworkUserIds] = useState<Set<string>>(new Set());
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchVibePosts().then(setPosts);
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
      // Rollback on failure
      setLikedPosts(prev => {
        const next = new Set(prev);
        if (isLiked) next.add(postId);
        else next.delete(postId);
        return next;
      });
      onToast('Failed to record reaction.');
    }
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
      {/* Social Feed Tabs matching reference image */}
      <div className="border-b border-neutral-800 pb-1 flex items-center space-x-6 text-sm">
        <button
          onClick={() => setActiveTab('network')}
          className={`pb-2.5 font-black uppercase tracking-wider transition relative cursor-pointer ${
            activeTab === 'network' ? 'text-amber-400 font-extrabold' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span>MY NETWORK</span>
          {activeTab === 'network' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('local')}
          className={`pb-2.5 font-black uppercase tracking-wider transition relative cursor-pointer ${
            activeTab === 'local' ? 'text-amber-400 font-extrabold' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span>LOCAL VIBES</span>
          {activeTab === 'local' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('for_you')}
          className={`pb-2.5 font-black uppercase tracking-wider transition relative cursor-pointer ${
            activeTab === 'for_you' ? 'text-amber-400 font-extrabold' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span>FOR YOU</span>
          {activeTab === 'for_you' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
          )}
        </button>
      </div>

      {/* Feed Posts List */}
      <div className="space-y-3.5">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => {
            const isLiked = likedPosts.has(post.id);
            const likesCount = post.reactions_count + (isLiked ? 1 : 0);
            const formattedDate = new Date(post.created_at || Date.now()).toLocaleDateString('en-US', {
              month: 'numeric',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div key={post.id} className="rounded-3xl bg-[#131116] border border-neutral-800 overflow-hidden shadow-xl p-4 space-y-3.5">
                {/* 1. Media Section (aspect-[4/3] at top) */}
                {post.image_url && post.image_url.trim() !== '' ? (
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-950">
                    <img src={post.image_url} alt="Scene" className="w-full h-full object-cover" />
                    {/* Mood Badge overlay at bottom-left */}
                    <div className="absolute bottom-3 left-3 bg-neutral-950/90 text-white font-bold text-xs px-3 py-1.5 rounded-full flex items-center space-x-1.5 border border-neutral-800 shadow">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>COZY</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-950/85 p-6 flex flex-col justify-center items-center text-center">
                    <div className="absolute top-3 left-3 bg-neutral-950/90 text-white font-bold text-xs px-3 py-1.5 rounded-full flex items-center space-x-1.5 border border-neutral-800 shadow">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>COZY</span>
                    </div>
                    <Sparkles className="w-10 h-10 text-amber-400/60 mb-2" />
                    <p className="text-sm font-bold text-white">VibeQuest Wavelength Broadcast</p>
                  </div>
                )}

                {/* 2. Author Row (Below Image) */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-3">
                    <img
                      src={post.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                      alt={post.username}
                      className="w-10 h-10 rounded-full object-cover border border-amber-500/40 shadow"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-amber-300">@{post.username}</h4>
                      <p className="text-[11px] text-neutral-400">{formattedDate}</p>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-400 font-black text-[10px] tracking-wider shadow">
                    VERIFIED SYNC
                  </div>
                </div>

                {/* 3. Caption */}
                {post.caption && (
                  <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-medium">
                    {post.caption}
                  </p>
                )}

                {/* 4. Social Action Row (Compact Footer) */}
                <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80 text-xs text-neutral-400">
                  <button
                    onClick={() => handleToggleLike(post.id)}
                    className="flex items-center space-x-1.5 hover:text-rose-400 transition cursor-pointer"
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-neutral-400'}`} />
                    <span className="font-bold text-white">{likesCount}</span>
                  </button>

                  <button
                    onClick={() => onOpenComments(post.id)}
                    className="flex items-center space-x-1.5 hover:text-teal-400 transition cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-neutral-400" />
                    <span className="font-bold text-white">{post.comments_count} Comments</span>
                  </button>

                  <button
                    onClick={() => handleShare(post)}
                    className="flex items-center space-x-1.5 hover:text-white transition cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-neutral-400" />
                    <span className="font-bold text-white">Share</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-8 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-amber-400/60 mx-auto" />
            <h4 className="font-bold text-xs text-white">No posts in this feed yet</h4>
            <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
              Follow explorers into your Orbit or publish a Vibe post to populate your network feed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

