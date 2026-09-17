import { useMemo, useState } from "react";
import { Flag, MessageCircle, Send, Trash2, X } from "lucide-react";
import { motion } from "framer-motion";
import type { Comment } from "../comment.schema";
import { CURRENT_USER, useCommentsStore } from "../comments.store";
import { ModerationSheet } from "../../moderation/ModerationSheet";
import "./comments.css";

function formatCommentDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return date.toLocaleDateString();
}

export function CommentsSheet({ postId, onClose }: { postId: string; onClose: () => void }) {
  const comments = useCommentsStore((state) => state.comments);
  const addComment = useCommentsStore((state) => state.addComment);
  const deleteComment = useCommentsStore((state) => state.deleteComment);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [moderatingComment, setModeratingComment] = useState<Comment | null>(null);

  const postComments = useMemo(
    () => comments.filter((comment) => comment.postId === postId),
    [comments, postId],
  );
  const roots = postComments.filter((comment) => comment.parentId === null);
  const repliesByParent = new Map<string, Comment[]>();
  for (const comment of postComments.filter((item) => item.parentId !== null)) {
    const current = repliesByParent.get(comment.parentId!) ?? [];
    current.push(comment);
    repliesByParent.set(comment.parentId!, current);
  }

  function submitComment() {
    const value = draft.trim();
    if (!value) return;
    addComment(postId, value, replyTo?.id ?? null);
    setDraft("");
    setReplyTo(null);
  }

  return (
    <>
      <div className="comments-sheet-backdrop" role="presentation" onMouseDown={onClose}>
        <motion.section
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          className="comments-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Comments"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="comments-sheet-header">
            <div>
              <strong>Commentaires</strong>
              <span>{postComments.length}</span>
            </div>
            <button type="button" aria-label="Close comments" onClick={onClose}>
              <X size={20} />
            </button>
          </header>

          <div className="comments-sheet-list">
            {roots.length === 0 ? (
              <div className="comments-empty">
                <MessageCircle size={28} />
                <strong>Aucun commentaire</strong>
                <span>Sois le premier à commenter ce post.</span>
              </div>
            ) : (
              roots.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  replies={repliesByParent.get(comment.id) ?? []}
                  onReply={() => setReplyTo(comment)}
                  onDelete={() => deleteComment(comment.id)}
                  onDeleteReply={deleteComment}
                  onReport={setModeratingComment}
                />
              ))
            )}
          </div>

          <div className="comments-composer">
            {replyTo && (
              <div className="comments-replying">
                <span>Réponse à @{replyTo.author.username}</span>
                <button type="button" aria-label="Cancel reply" onClick={() => setReplyTo(null)}>
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="comments-input-row">
              <img src={CURRENT_USER.avatarUrl} alt={CURRENT_USER.displayName} />
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value.slice(0, 1000))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submitComment();
                  }
                }}
                placeholder={replyTo ? "Écrire une réponse..." : "Ajouter un commentaire..."}
                maxLength={1000}
              />
              <button type="button" aria-label="Send comment" disabled={!draft.trim()} onClick={submitComment}>
                <Send size={18} />
              </button>
            </div>
          </div>
        </motion.section>
      </div>

      {moderatingComment && (
        <ModerationSheet
          targetType="comment"
          targetId={moderatingComment.id}
          targetName={`@${moderatingComment.author.username}`}
          onClose={() => setModeratingComment(null)}
        />
      )}
    </>
  );
}

function CommentItem({
  comment,
  replies,
  onReply,
  onDelete,
  onDeleteReply,
  onReport,
}: {
  comment: Comment;
  replies: Comment[];
  onReply: () => void;
  onDelete: () => void;
  onDeleteReply: (id: string) => void;
  onReport: (comment: Comment) => void;
}) {
  return (
    <div className="comment-thread">
      <CommentRow comment={comment} onReply={onReply} onDelete={onDelete} onReport={onReport} />
      {replies.length > 0 && (
        <div className="comment-replies">
          {replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onDelete={() => onDeleteReply(reply.id)}
              onReport={onReport}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentRow({
  comment,
  onReply,
  onDelete,
  onReport,
}: {
  comment: Comment;
  onReply: () => void;
  onDelete: () => void;
  onReport: (comment: Comment) => void;
}) {
  const own = comment.author.id === CURRENT_USER.id;

  return (
    <div className="comment-row">
      <img src={comment.author.avatarUrl} alt={comment.author.displayName} />
      <div className="comment-body">
        <div className="comment-line">
          <strong>{comment.author.displayName}</strong>
          <span>@{comment.author.username}</span>
          <time>{formatCommentDate(comment.createdAt)}</time>
        </div>
        <p>{comment.body}</p>
        <div className="comment-actions">
          <button type="button" onClick={onReply}>Répondre</button>
          {!own && (
            <button type="button" onClick={() => onReport(comment)} aria-label="Report comment">
              <Flag size={13} /> Signaler
            </button>
          )}
          {own && (
            <button type="button" onClick={onDelete} aria-label="Delete comment">
              <Trash2 size={13} /> Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
