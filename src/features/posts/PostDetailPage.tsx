import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useSessionStore } from "../../stores/sessionStore";
import { PostCard } from "../feed/components/PostCard";
import { deletePost, getPostById, updatePostCaption } from "./post-read.service";
import "./post-edit.css";
import "./post-delete.css";

export function PostDetailPage({ postId, onBack }: { postId: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const currentUserId = useSessionStore((state) => state.user?.id ?? null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => getPostById(postId),
    staleTime: 30_000,
  });
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openEditor() {
    if (!data) return;
    setMenuOpen(false);
    setCaption(data.caption);
    setEditError(null);
    setEditing(true);
  }

  function openDeleteConfirm() {
    setMenuOpen(false);
    setDeleteError(null);
    setConfirmDeleteOpen(true);
  }

  async function saveCaption() {
    if (!data || saving) return;
    setSaving(true);
    setEditError(null);
    try {
      const updated = await updatePostCaption(data.id, caption);
      queryClient.setQueryData(["post", postId], updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["feed", "following", "chronological"] }),
        queryClient.invalidateQueries({ queryKey: ["profile", data?.author.username ?? ""] }),
      ]);
      setEditing(false);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Unable to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!data || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deletePost(data.id);
      queryClient.removeQueries({ queryKey: ["post", postId] });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["feed", "following", "chronological"] }),
        queryClient.invalidateQueries({ queryKey: ["profile", "sofia.park"] }),
      ]);
      setConfirmDeleteOpen(false);
      onBack();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Unable to delete this post.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="profile-shell">
      <header className="profile-header">
        <button type="button" className="profile-header-button" aria-label="Back" onClick={onBack}><ArrowLeft size={21} /></button>
        <span className="profile-header-name">Post</span>
        {data?.author.id === currentUserId ? (
          <div className="post-detail-menu-wrap">
            <button type="button" className="profile-header-button" aria-label="Post options" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}><MoreHorizontal size={22} /></button>
            {menuOpen && (
              <div className="post-detail-menu" role="menu">
                <button type="button" role="menuitem" onClick={openEditor}><Pencil size={15} /> Edit post</button>
                <button type="button" role="menuitem" className="danger" onClick={openDeleteConfirm}><Trash2 size={15} /> Delete post</button>
              </div>
            )}
          </div>
        ) : <span aria-hidden="true" style={{ width: 34, height: 34 }} />}
      </header>
      <section className="post-detail-scroll">
        {isLoading && <div className="profile-state">Loading post…</div>}
        {isError && <div className="profile-state">Unable to load this post.</div>}
        {data && <div className="post-detail-card"><PostCard post={data} /></div>}
      </section>
      {editing && (
        <div className="post-edit-backdrop" role="presentation" onClick={() => !saving && setEditing(false)}>
          <section className="post-edit-sheet" role="dialog" aria-modal="true" aria-label="Edit post" onClick={(event) => event.stopPropagation()}>
            <header className="post-edit-header">
              <strong>Edit post</strong>
              <button type="button" className="profile-header-button" aria-label="Close" disabled={saving} onClick={() => setEditing(false)}><X size={20} /></button>
            </header>
            <div className="post-edit-content">
              <label htmlFor="post-caption">Caption</label>
              <textarea id="post-caption" value={caption} maxLength={2200} onChange={(event) => setCaption(event.target.value)} disabled={saving} autoFocus />
              <div className="post-edit-footer"><span>{caption.length}/2200</span><button type="button" className="post-edit-save" onClick={() => void saveCaption()} disabled={saving || !caption.trim()}>{saving ? "Saving…" : <><Check size={17} />Save</>}</button></div>
              {editError && <p className="post-edit-error" role="alert">{editError}</p>}
              <p className="post-edit-note"><Pencil size={13} /> Media stays unchanged.</p>
            </div>
          </section>
        </div>
      )}
      {confirmDeleteOpen && (
        <div className="post-delete-backdrop" role="presentation" onClick={() => !deleting && setConfirmDeleteOpen(false)}>
          <section className="post-delete-sheet" role="alertdialog" aria-modal="true" aria-label="Delete post" onClick={(event) => event.stopPropagation()}>
            <div className="post-delete-icon"><Trash2 size={24} /></div>
            <h2>Delete post?</h2>
            <p>This will remove the post from your profile and feed. The post will be soft-deleted and can be physically purged after 30 days.</p>
            {deleteError && <p className="post-delete-error" role="alert">{deleteError}</p>}
            <div className="post-delete-actions">
              <button type="button" className="post-delete-cancel" disabled={deleting} onClick={() => setConfirmDeleteOpen(false)}>Cancel</button>
              <button type="button" className="post-delete-confirm" disabled={deleting} onClick={() => void confirmDelete()}>{deleting ? "Deleting…" : "Delete"}</button>
            </div>
          </section>
        </div>
      )}
      {menuOpen && <button type="button" className="post-detail-menu-dismiss" aria-label="Close post menu" onClick={() => setMenuOpen(false)} />}
    </main>
  );
}
