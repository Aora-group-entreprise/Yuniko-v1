import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Check, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { PostCard } from "../feed/components/PostCard";
import { deletePost, getPostById, updatePostCaption } from "./post-read.service";
import "./post-edit.css";
import "./post-delete.css";

export function PostDetailPage({ postId, onBack }: { postId: string; onBack: () => void }) {
  const queryClient = useQueryClient();
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
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openEditor() {
    if (!data) return;
    setMenuOpen(false);
    setCaption(data.caption);
    setEditError(null);
    setEditing(true);
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
        queryClient.invalidateQueries({ queryKey: ["profile", "sofia.park"] }),
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
      onBack();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Unable to delete this post.");
      setDeleting(false);
    }
  }

  return (
    <main className="profile-shell">
      <header className="profile-header">
        <button type="button" className="profile-header-button" aria-label="Back" onClick={onBack}><ArrowLeft size={21} /></button>
        <span className="profile-header-name">Post</span>
        {data?.author.id === "1" ? (
          <div className="post-detail-menu-wrap">
            <button type="button" className="profile-header-button" aria-label="Post options" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}><MoreHorizontal size={22} /></button>
            {menuOpen && (
              <div className="post-detail-menu" role="menu">
                <button type="button" role="menuitem" onClick={openEditor}><Pencil size={15} /> Edit post</button>
                <button type="button" role="menuitem" className="danger" onClick={() => { setMenuOpen(false); setDeleteError(null); setDeleting(false); }}><Trash2 size={15} /> Delete post</button>
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
      {deleteError && !deleting && (
        <div className="post-delete-backdrop" role="presentation" onClick={() => setDeleteError(null)}>
          <section className="post-delete-sheet" role="alertdialog" aria-modal="true" aria-label="Delete post" onClick={(event) => event.stopPropagation()}>
            <div className="post-delete-icon"><AlertTriangle size={24} /></div>
            <h2>Delete post?</h2>
            <p>{deleteError}</p>
            <button type="button" className="post-delete-cancel" onClick={() => setDeleteError(null)}>Close</button>
          </section>
        </div>
      )}
      {menuOpen && <div className="post-detail-menu-dismiss" aria-hidden="true" onClick={() => setMenuOpen(false)} />}
      {data?.author.id === "1" && !editing && !deleteError && !menuOpen && deleting === false && false}
      {deleteConfirmVisible(data, deleting) && (
        <div className="post-delete-backdrop" role="presentation" onClick={() => !deleting && setDeleteError(null)}>
          <section className="post-delete-sheet" role="alertdialog" aria-modal="true" aria-label="Delete post" onClick={(event) => event.stopPropagation()}>
            <div className="post-delete-icon"><Trash2 size={24} /></div>
            <h2>Delete post?</h2>
            <p>This will remove the post from your profile and feed. The post will be soft-deleted and can be physically purged after 30 days.</p>
            <div className="post-delete-actions">
              <button type="button" className="post-delete-cancel" disabled={deleting} onClick={() => setDeleteError(null)}>Cancel</button>
              <button type="button" className="post-delete-confirm" disabled={deleting} onClick={() => void confirmDelete()}>{deleting ? "Deleting…" : "Delete"}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function deleteConfirmVisible(data: { author: { id: string } } | undefined, deleting: boolean) {
  return Boolean(data?.author.id === "1" && deleting);
}
