import { memo, useState } from "react";
import { Bookmark, Eye, FolderPlus, Heart, MessageCircle, MoreHorizontal, Share2 } from "lucide-react";
import { motion } from "framer-motion";
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

const GRADIENT = "linear-gradient(135deg,#ff006e 0%,#8b00ff 100%)";

type PostCardProps = { post: FeedPost };

export const PostCard = memo(function PostCard({ post }: PostCardProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [moderationOpen, setModerationOpen] = useState(false);
  const { liked, toggle: toggleLike, isPending: likePending } = usePostLike(post.id);
  const { savedPostIds, toggleSave, isPending: savesPending } = useSaves();\n  const { data: comments = [] } = usePostComments(post.id);
  const saved = savedPostIds.includes(post.id);


  return (
    <>
      <article className="post-card">
        <img src={post.mediaUrl} alt={post.caption} className="post-media" loading="eager" decoding="async" fetchPriority="high" />
        <div className="post-gradient" />
        <div className="post-views"><Eye size={12} /><span>{post.viewCount.toLocaleString()}</span></div>
        <button className="post-more" aria-label="Post options" type="button" onClick={() => setModerationOpen(true)}><MoreHorizontal size={18} /></button>

        <div className="post-actions">
          <ActionButton label={String(post.likeCount + (liked ? 1 : 0))} onClick={toggleLike} disabled={likePending}>
            <Heart size={25} className={liked ? "filled-heart" : ""} strokeWidth={1.8} />
          </ActionButton>
          <ActionButton label={String(post.commentCount)} onClick={() => setCommentsOpen(true)}>
            <MessageCircle size={25} strokeWidth={1.8} />
          </ActionButton>
          <ActionButton label={String(post.shareCount)} onClick={() => setShareOpen(true)}>
            <Share2 size={25} strokeWidth={1.8} />
          </ActionButton>
          <div className="post-save-group">
            <ActionButton label={saved ? "Saved" : "Save"} onClick={() => toggleSave(post.id)} disabled={savesPending}>
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
              <img src={post.author.avatarUrl} alt={post.author.displayName} loading="lazy" decoding="async" />
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
      {moderationOpen && <ModerationSheet targetType="post" targetId={post.id} targetName={post.author.displayName} onClose={() => setModerationOpen(false)} />}
    </>
  );
});

function ActionButton({ label, onClick, disabled = false, children }: { label: string; onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <motion.button whileTap={{ scale: 0.88 }} type="button" className="post-action" onClick={onClick} disabled={disabled}>
      <span>{children}</span>
      <small>{label}</small>
    </motion.button>
  );
}
