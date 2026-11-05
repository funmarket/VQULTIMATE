import React, { useEffect, useState } from 'react';
import { Flame, Heart, MessageCircle, Share2, Sparkles, Send } from 'lucide-react';
import { fetchVibePosts, VibePostItem, fetchCommentsForPost, addCommentToPost, VibeComment } from '../domains/d05_vibe';
import { UserProfile } from '../domains/d01_auth';

interface VibeTabProps {
  user: UserProfile | null;
}

export const VibeTab: React.FC<VibeTabProps> = ({ user }) => {
  const [posts, setPosts] = useState<VibePostItem[]>([]);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [comments, setComments] = useState<VibeComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVibePosts().then((data) => {
      setPosts(data);
      setLoading(false);
    });
  }, []);

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

  return (
    <div className="space-y-6 pb-24 text-white max-w-md mx-auto">
      <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
        <div>
          <h1 className="text-lg font-black flex items-center space-x-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <span>Vibe Network Stream</span>
          </h1>
          <p className="text-xs text-neutral-400">Live dual-capture proofs from district explorers</p>
        </div>
      </div>

      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="rounded-3xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-2xl">
            {/* Post Header */}
            <div className="p-4 flex items-center justify-between border-b border-neutral-800/80">
              <div className="flex items-center space-x-3">
                <img src={post.avatar_url} alt={post.username} className="w-10 h-10 rounded-full object-cover border border-orange-500/30" />
                <div>
                  <h3 className="font-bold text-sm text-white">{post.username}</h3>
                  <p className="text-[10px] text-neutral-400">{new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • District Pulse</p>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
                Verified
              </span>
            </div>

            {/* Post Image with PIP Selfie */}
            <div className="relative aspect-[4/5] bg-neutral-950">
              <img src={post.image_url} alt="Vibe scene" className="w-full h-full object-cover" />
              {post.selfie_url && (
                <div className="absolute top-4 left-4 w-24 h-32 rounded-2xl overflow-hidden border-4 border-orange-500 shadow-2xl">
                  <img src={post.selfie_url} alt="Selfie" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Caption & Actions */}
            <div className="p-4 space-y-3">
              <p className="text-sm text-neutral-200">{post.caption}</p>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-neutral-400 text-xs">
                <button className="flex items-center space-x-1.5 hover:text-orange-400 transition">
                  <Heart className="w-4 h-4 text-orange-500 fill-orange-500/20" />
                  <span className="font-bold text-white">{post.reactions_count}</span>
                  <span>Reacts</span>
                </button>
                <button
                  onClick={() => handleOpenComments(post.id)}
                  className="flex items-center space-x-1.5 hover:text-teal-400 transition"
                >
                  <MessageCircle className="w-4 h-4 text-teal-400" />
                  <span className="font-bold text-white">{post.comments_count}</span>
                  <span>Comments</span>
                </button>
                <button className="flex items-center space-x-1 hover:text-amber-400 transition">
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comments Modal */}
      {activePostId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[80vh] flex flex-col shadow-2xl">
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
                      <span className="font-bold text-xs text-white">{comm.username}</span>
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
    </div>
  );
};
