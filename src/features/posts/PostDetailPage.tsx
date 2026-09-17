import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, MoreHorizontal, Pencil, X } from "lucide-react";
import { useState } from "react";
import { PostCard } from "../feed/components/PostCard";
import { getPostById, updatePostCaption } from "./post-read.service";
import "./post-edit.css";

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

  function openEditor() {
    if (!data) return;
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
      queryClient.invalidateQueries({ queryKey: ["feed", "following", "chronological"] });
      queryClient.invalidateQueries({ queryKey: ["profile", "sofia.park"] });
      setEditing(false);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Unable to save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="profile-shell">
      <header className="profile-header">
        <button type="button" className="profile-header-button" aria-label="Back" onClick={onBack}><ArrowLeft size={21} /></button>
        <span className="profile-header-name">Post</span>
        {data?.author.id === "1" ? (
          <button type="button" className="profile-header-button" aria-label="Edit post" onClick={openEditor}><MoreHorizontal size={22} /></button>
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
    </main>
  );
}
