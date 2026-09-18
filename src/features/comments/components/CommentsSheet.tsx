import { useState } from "react";
import { Flag, MessageCircle, Send, Trash2, X } from "lucide-react";
import { motion } from "framer-motion";
import type { Comment } from "../comment.schema";
import { usePostComments, useCreateComment, useDeleteComment } from "../useComments";
import { useSessionStore } from "../../../stores/sessionStore";
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
  const { data: comments = [], isLoading } = usePostComments(postId);
  const createMutation = useCreateComment(postId);
  const deleteMutation = useDeleteComment(postId);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [moderatingComment, setModeratingComment] = useState<Comment | null>(null);
  const currentUser = useSessionStore((state) => state.user);

  const roots = comments.filter((comment) => comment.parentId === null);
  const repliesByParent = new Map<string, Comment[]>();
  for (const comment of comments.filter((item) => item.parentId !== null)) {
    const current = repliesByParent.get(comment.parentId!) ?? [];
    current.push(comment);
    repliesByParent.set(comment.parentId!, current);
  }

  async function submitComment() {
    const value = draft.trim();
    if (!value || createMutation.isPending) return;
    try {
      await createMutation.mutateAsync({ body: value, parentId: replyTo?.id ?? null });
      setDraft("");
      setReplyTo(null);
    } catch {
      // Keep the draft visible so a transient request failure does not lose user input.
    }
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
            <div><strong>Commentaires</strong><span>{comments.length}</span></div>
            <button type="button" aria-label="Close comments" onClick={onClose}><X size={20} /></button>
          </header>

          <div className="comments-sheet-list">
            {isLoading ? (
              <div className="comments-empty"><MessageCircle size={28} /><strong>Chargement…</strong></div>
            ) : roots.length === 0 ? (
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
                  onDelete={() => deleteMutation.mutate(comment.id)}
                  onDeleteReply={(id) => deleteMutation.mutate(id)}
                  onReport={setModeratingComment}
                  currentUserId={currentUser?.id ?? null}
                />
              ))
            )}
          </div>

          <div className="comments-composer">
            {replyTo && (
              <div className="comments-replying">
                <span>Réponse à @{replyTo.author.username}</span>
                <button type="button" aria-label="Cancel reply" onClick={() => setReplyTo(null)}><X size={14} /></button>
              </div>
            )}
            <div className="comments-input-row">
              <div className="comments-current-avatar" aria-hidden="true">
                {(currentUser?.email?.slice(0, 1) ?? "?").toUpperCase()}
              </div>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value.slice(0, 1000))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submitComment();
                  }
                }}
                placeholder={replyTo ? "Écrire une réponse..." : "Ajouter un commentaire..."}
                maxLength={1000}
                disabled={createMutation.isPending}
              />
              <button type="button" aria-label="Send comment" disabled={!draft.trim() || createMutation.isPending} onClick={() => void submitComment()}>
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
  currentUserId,
}: {
  comment: Comment;
  replies: Comment[];
  onReply: () => void;
  onDelete: () => void;
  onDeleteReply: (id: string) => void;
  onReport: (comment: Comment) => void;
  currentUserId: string | null;
}) {
  return (
    <div className="comment-thread">
      <CommentRow comment={comment} onReply={onReply} onDelete={onDelete} onReport={onReport} currentUserId={currentUserId} />
      {replies.length > 0 && (
        <div className="comment-replies">
          {replies.map((reply) => (
            <CommentRow key={reply.id} comment={reply} onReply={onReply} onDelete={() => onDeleteReply(reply.id)} onReport={onReport} currentUserId={currentUserId} />
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
  currentUserId,
}: {
  comment: Comment;
  onReply: () => void;
  onDelete: () => void;
  onReport: (comment: Comment) => void;
  currentUserId: string | null;
}) {
  const own = comment.author.id === currentUserId;

  return (
    <div className="comment-row">
      <img src={comment.author.avatarUrl ?? ""} alt={comment.author.displayName} />
      <div className="comment-body">
        <div className="comment-line">
          <strong>{comment.author.displayName}</strong>
          <span>@{comment.author.username}</span>
          <time>{formatCommentDate(comment.createdAt)}</time>
        </div>
        <p>{comment.body}</p>
        <div className="comment-actions">
          <button type="button" onClick={onReply}>Répondre</button>
          {!own && <button type="button" onClick={() => onReport(comment)} aria-label="Report comment"><Flag size={13} /> Signaler</button>}
          {own && <button type="button" onClick={onDelete} aria-label="Delete comment"><Trash2 size={13} /> Supprimer</button>}
        </div>
      </div>
    </div>
  );
}
