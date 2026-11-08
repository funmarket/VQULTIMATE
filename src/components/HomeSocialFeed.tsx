import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, Sparkles, Users } from 'lucide-react';
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
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
    await addReactionToPost(postId);
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
      <div className="space-y-3">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => {
            const isLiked = likedPosts.has(post.id);
            const likesCount = post.reactions_count + (isLiked ? 1 : 0);
            return (
              <div key={post.id} className="rounded-3xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-xl">
                {/* Header */}
                <div className="p-3.5 flex items-center justify-between border-b border-neutral-800/80">
                  <div className="flex items-center space-x-3">
                    <img
                      src={post.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                      alt={post.username}
                      className="w-9 h-9 rounded-full object-cover border border-orange-500/40"
                    />
                    <div>
                      <h4 className="font-bold text-xs text-white">@{post.username}</h4>
                      <p className="text-[10px] text-neutral-400">District Vibe Feed • Just now</p>
                    </div>
                  </div>
                  <button onClick={() => handleShare(post)} className="text-neutral-400 hover:text-white transition cursor-pointer">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Optional Image */}
                {post.image_url && post.image_url.trim() !== '' && !post.image_url.startsWith('blob:') && (
                  <div className="relative aspect-[4/5] bg-neutral-950">
                    <img src={post.image_url} alt="Scene" className="w-full h-full object-cover" />
                    {post.selfie_url && !post.selfie_url.startsWith('blob:') && (
                      <div className="absolute top-3 left-3 w-20 h-28 rounded-2xl overflow-hidden border-2 border-orange-500 shadow-xl">
                        <img src={post.selfie_url} alt="Selfie" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                )}

                {/* Caption & Actions */}
                <div className="p-4 space-y-3">
                  <p className="text-xs text-neutral-200 leading-relaxed">{post.caption}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs text-neutral-400">
                    <span className="flex items-center space-x-1">
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-rose-500 fill-rose-500/30'}`} />
                      <span className="font-bold text-white">{likesCount}</span>
                      <span>likes</span>
                    </span>
                    <span>{post.comments_count} comments</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 pt-1 border-t border-neutral-800 text-xs font-semibold text-neutral-300">
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      className={`flex items-center justify-center space-x-1.5 py-2 hover:bg-neutral-800/50 rounded-xl transition cursor-pointer ${isLiked ? 'text-rose-400 font-bold' : ''}`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-orange-400'}`} />
                      <span>{isLiked ? 'Liked' : 'Like'}</span>
                    </button>
                    <button
                      onClick={() => onOpenComments(post.id)}
                      className="flex items-center justify-center space-x-1.5 py-2 hover:bg-neutral-800/50 rounded-xl transition text-teal-400 font-bold cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Comment</span>
                    </button>
                    <button
                      onClick={() => handleShare(post)}
                      className="flex items-center justify-center space-x-1.5 py-2 hover:bg-neutral-800/50 rounded-xl transition cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                  </div>
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
