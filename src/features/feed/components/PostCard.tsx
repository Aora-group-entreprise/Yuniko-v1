import { useState } from "react";
import { Bookmark, Eye, FolderPlus, Heart, MessageCircle, MoreHorizontal, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import type { FeedPost } from "../feed.schema";
import { useFeedInteractionStore } from "../feed.store";
import { CommentsSheet } from "../../comments/components/CommentsSheet";
import { useCommentsStore } from "../../comments/comments.store";
import "../../comments/components/comments.css";
import { CollectionsSheet } from "../../saves/CollectionsSheet";
import { useSavesStore } from "../../saves/saves.store";
import "../../saves/saves.css";
import { ShareSheet } from "../../share/ShareSheet";
import "../../share/share.css";

const GRADIENT = "linear-gradient(135deg,#ff006e 0%,#8b00ff 100%)";

export function PostCard({ post }: { post: FeedPost }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const liked = useFeedInteractionStore((state) => state.liked.includes(post.id));
  const saved = useSavesStore((state) => state.savedPostIds.includes(post.id));
  const localCommentCount = useCommentsStore((state) => state.comments.filter((comment) => comment.postId === post.id).length);
  const toggleLike = useFeedInteractionStore((state) => state.toggleLike);
  const toggleSave = useSavesStore((state) => state.toggleSave);

  return (
    <>
      <article className="post-card">
        <img src={post.mediaUrl} alt={post.caption} className="post-media" />
        <div className="post-gradient" />
        <div className="post-views"><Eye size={12} /><span>{post.viewCount.toLocaleString()}</span></div>
        <button className="post-more" aria-label="Post options" type="button"><MoreHorizontal size={18} /></button>

        <div className="post-actions">
          <ActionButton label={String(post.likeCount + (liked ? 1 : 0))} onClick={() => toggleLike(post.id)}>
            <Heart size={25} className={liked ? "filled-heart" : ""} strokeWidth={1.8} />
          </ActionButton>
          <ActionButton label={String(post.commentCount + localCommentCount)} onClick={() => setCommentsOpen(true)}>
            <MessageCircle size={25} strokeWidth={1.8} />
          </ActionButton>
          <ActionButton label={String(post.shareCount)} onClick={() => setShareOpen(true)}>
            <Share2 size={25} strokeWidth={1.8} />
          </ActionButton>
          <div className="post-save-group">
            <ActionButton label={saved ? "Saved" : "Save"} onClick={() => toggleSave(post.id)}>
              <Bookmark size={25} className={saved ? "filled-save" : ""} strokeWidth={1.8} />
            </ActionButton>
            {saved && (
              <motion.button whileTap={{ scale: 0.88 }} type="button" className="post-collection-button" aria-label="Organiser dans une collection" onClick={() => setCollectionsOpen(true)}>
                <FolderPlus size={15} />
              </motion.button>
            )}
          </div>
        </div>

        <div className="post-copy">
          <div className="post-author-row">
            <div className="avatar-ring" style={{ background: GRADIENT }}>
              <img src={post.author.avatarUrl} alt={post.author.displayName} />
            </div>
            <div className="post-author-meta">
              <button type="button" className="post-author">{post.author.displayName}</button>
              <p>{post.location ?? "World Feed"}</p>
            </div>
          </div>
          <p className="post-caption">{post.caption}</p>
          <div className="post-hashtags">{post.hashtags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        </div>
      </article>
      {commentsOpen && <CommentsSheet postId={post.id} onClose={() => setCommentsOpen(false)} />}
      {collectionsOpen && <CollectionsSheet postId={post.id} onClose={() => setCollectionsOpen(false)} />}
      {shareOpen && <ShareSheet postId={post.id} onClose={() => setShareOpen(false)} />}
    </>
  );
}

function ActionButton({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <motion.button whileTap={{ scale: 0.88 }} type="button" className="post-action" onClick={onClick}>
      <span>{children}</span>
      <small>{label}</small>
    </motion.button>
  );
}
