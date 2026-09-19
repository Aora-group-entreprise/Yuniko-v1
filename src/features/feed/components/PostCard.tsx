import { memo, useRef, useState } from "react";
import { Bookmark, Eye, FolderPlus, Heart, MessageCircle, MoreHorizontal, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { FeedPost } from "../feed.schema";
import { CommentsSheet } from "../../comments/components/CommentsSheet";
import "../../comments/components/comments.css";
import { CollectionsSheet } from "../../saves/CollectionsSheet";
import { useSaves } from "../../saves/useSaves";
import { usePostLike } from "../../interactions/usePostLike";
import "../../saves/saves.css";
import { ShareSheet } from "../../share/ShareSheet";
import "../../share/share.css";
import { ModerationSheet } from "../../moderation/ModerationSheet";

const GRADIENT = "linear-gradient(135deg,#FF006E 0%,#8B00FF 100%)";

type PostCardProps = { post: FeedPost };

export const PostCard = memo(function PostCard({ post }: PostCardProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [moderationOpen, setModerationOpen] = useState(false);
  const { liked, toggle: toggleLike, isPending: likePending } = usePostLike(post.id);
  const { savedPostIds, toggleSave, isPending: savesPending } = useSaves();
  const saved = savedPostIds.includes(post.id);
  const lastTap = useRef(0);
  const [burst, setBurst] = useState(false);

  const tapImage = () => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      if (!liked) toggleLike();
      setBurst(true);
      window.setTimeout(() => setBurst(false), 700);
    }
    lastTap.current = now;
  };

  return (
    <>
      <div className="relative w-full h-full">
        <img
          src={post.mediaUrl}
          alt={post.caption}
          className="absolute inset-0 w-full h-full object-cover cursor-pointer"
          onClick={tapImage}
          loading="eager"
          decoding="async"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to top,rgba(0,0,0,.9),rgba(0,0,0,.22) 50%,transparent 72%)" }}
        />

        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-black/40 backdrop-blur-md">
          <Eye size={12} className="text-white/75" />
          <span className="text-white/80 text-[11px] font-semibold">{post.viewCount.toLocaleString()}</span>
        </div>

        <motion.button
          whileTap={{ scale: .88 }}
          aria-label="Post options"
          type="button"
          onClick={() => setModerationOpen(true)}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/35 backdrop-blur-md"
        >
          <MoreHorizontal size={18} />
        </motion.button>

        <AnimatePresence>
          {burst && (
            <motion.div
              initial={{ scale: .4, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: .65 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart size={100} className="fill-red-500 text-red-500" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 z-10">
          <ActionButton label={String(post.likeCount + (liked ? 1 : 0))} onClick={toggleLike} disabled={likePending}>
            <Heart size={25} className={liked ? "fill-red-500 text-red-500" : "text-white"} strokeWidth={1.8} />
          </ActionButton>
          <ActionButton label={String(post.commentCount)} onClick={() => setCommentsOpen(true)}>
            <MessageCircle size={25} strokeWidth={1.8} />
          </ActionButton>
          <ActionButton label={String(post.shareCount)} onClick={() => setShareOpen(true)}>
            <Share2 size={25} strokeWidth={1.8} />
          </ActionButton>
          <div className="relative">
            <ActionButton label={saved ? "Saved" : "Save"} onClick={() => toggleSave(post.id)} disabled={savesPending}>
              <Bookmark size={25} className={saved ? "fill-yellow-400 text-yellow-400" : ""} strokeWidth={1.8} />
            </ActionButton>
            {saved && (
              <motion.button
                whileTap={{ scale: .88 }}
                type="button"
                className="absolute -right-1 -bottom-1 w-6 h-6 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center"
                aria-label="Organiser dans une collection"
                onClick={() => setCollectionsOpen(true)}
              >
                <FolderPlus size={14} />
              </motion.button>
            )}
          </div>
        </div>

        <div className="absolute bottom-4 left-3 right-20 z-10">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-full p-[2px] shrink-0" style={{ background: GRADIENT }}>
              <div className="w-full h-full rounded-full overflow-hidden bg-white/10">
                <img src={post.author.avatarUrl} alt={post.author.displayName} className="w-full h-full object-cover" loading="lazy" decoding="async" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <button type="button" className="font-semibold text-sm">{post.author.displayName}</button>
              <p className="text-white/55 text-xs">{post.location ?? "World Feed"}</p>
            </div>
            <button type="button" className="px-3.5 py-1 rounded-full text-xs font-semibold bg-white/15 border border-white/15">Follow</button>
          </div>
          <p className="text-white text-sm font-medium leading-snug line-clamp-2">{post.caption}</p>
          <p className="text-pink-300 text-sm mt-0.5">{post.hashtags.join(" ")}</p>
          <p className="text-white/40 text-xs mt-0.5">2h ago</p>
        </div>
      </div>
      {commentsOpen && <CommentsSheet postId={post.id} onClose={() => setCommentsOpen(false)} />}
      {collectionsOpen && <CollectionsSheet postId={post.id} onClose={() => setCollectionsOpen(false)} />}
      {shareOpen && <ShareSheet postId={post.id} onClose={() => setShareOpen(false)} />}
      {moderationOpen && <ModerationSheet targetType="post" targetId={post.id} targetName={post.author.displayName} onClose={() => setModerationOpen(false)} />}
    </>
  );
});

function ActionButton({ label, onClick, disabled = false, children }: { label: string; onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: .85 }}
      type="button"
      className="flex flex-col items-center gap-0.5"
      onClick={onClick}
      disabled={disabled}
    >
      <span className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center">{children}</span>
      <span className="text-white text-[11px] font-medium">{label}</span>
    </motion.button>
  );
}
