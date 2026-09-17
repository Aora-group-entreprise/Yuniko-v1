import imageCompression from "browser-image-compression";
import { ArrowLeft, ImagePlus, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPost, createPostId } from "./post.service";
import { clearPostDraft, loadPostDraft, savePostDraft } from "./post-draft.storage";
import { postDraftSchema, type PostMedia, type PostVisibility } from "./post.schema";
import { usePostStore } from "./post.store";

const MAX_MEDIA = 10;
const MAX_FILE_MB = 20;

export function CreatePostPage({ onBack }: { onBack: () => void }) {
  const draft = usePostStore((state) => state.draft);
  const setDraft = usePostStore((state) => state.setDraft);
  const setCaption = usePostStore((state) => state.setCaption);
  const setVisibility = usePostStore((state) => state.setVisibility);
  const removeMedia = usePostStore((state) => state.removeMedia);
  const clearDraft = usePostStore((state) => state.clearDraft);
  const [files, setFiles] = useState<File[]>([]);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void loadPostDraft().then((saved) => {
      if (!active) return;
      if (saved) {
        const restored = postDraftSchema.safeParse(saved.draft);
        if (restored.success) {
          setDraft(restored.data);
          setFiles(saved.files);
        }
      }
      setLoadingDraft(false);
    }).catch(() => setLoadingDraft(false));
    return () => { active = false; };
  }, [setDraft]);

  useEffect(() => {
    if (!draft || loadingDraft) return;
    void savePostDraft(draft, files);
  }, [draft, files, loadingDraft]);

  async function handleFiles(selected: FileList | null) {
    if (!selected) return;
    setError(null);
    setPublishMessage(null);
    const incoming = Array.from(selected).slice(0, MAX_MEDIA - (draft?.media.length ?? 0));
    if (!incoming.length) return;
    const invalid = incoming.find((file) => !file.type.startsWith("image/") || file.size > MAX_FILE_MB * 1024 * 1024);
    if (invalid) {
      setError(`Use image files up to ${MAX_FILE_MB} MB each.`);
      return;
    }

    setProcessing(true);
    try {
      const processed: { file: File; media: PostMedia }[] = [];
      for (const [offset, file] of incoming.entries()) {
        const compressed = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 2400,
          useWebWorker: true,
        });
        const previewUrl = URL.createObjectURL(compressed);
        const dimensions = await getImageDimensions(previewUrl);
        processed.push({
          file: new File([compressed], file.name, { type: compressed.type || file.type }),
          media: {
            id: `${createPostId()}-${offset}`,
            fileName: file.name,
            url: previewUrl,
            width: dimensions.width,
            height: dimensions.height,
            position: (draft?.media.length ?? 0) + offset,
            status: "ready",
          },
        });
      }
      if (!draft) {
        const next = { id: createPostId(), caption: "", visibility: "public" as PostVisibility, media: processed.map((item) => item.media), createdAt: new Date().toISOString() };
        setDraft(next);
      } else {
        processed.forEach((item) => usePostStore.getState().addMedia(item.media));
      }
      setFiles((current) => [...current, ...processed.map((item) => item.file)]);
    } catch {
      setError("The image could not be prepared. Try another image.");
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handlePublish() {
    if (!draft || draft.media.length === 0) return;
    setError(null);
    setPublishMessage(null);
    try {
      await createPost(draft);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Publishing is unavailable right now.");
    }
  }

  async function handleDiscard() {
    draft?.media.forEach((media) => URL.revokeObjectURL(media.url));
    await clearPostDraft();
    clearDraft();
    setFiles([]);
    onBack();
  }

  return (
    <main className="create-post-shell">
      <header className="create-post-header">
        <button type="button" className="profile-header-button" aria-label="Back" onClick={onBack}><ArrowLeft size={21} /></button>
        <strong>Create Post</strong>
        <button type="button" className="create-post-publish" disabled={!draft?.media.length || processing} onClick={() => void handlePublish}>Publish</button>
      </header>

      <section className="create-post-content">
        {loadingDraft ? <div className="create-post-loading"><LoaderCircle size={20} className="spin" />Loading draft…</div> : (
          <>
            <div className="post-media-picker">
              {draft?.media.map((media) => <div className="post-media-preview" key={media.id}>
                <img src={media.url} alt="Selected media preview" />
                <button type="button" aria-label={`Remove ${media.fileName}`} onClick={() => {
                  URL.revokeObjectURL(media.url);
                  removeMedia(media.id);
                  setFiles((current) => current.filter((file) => file.name !== media.fileName));
                }}><X size={16} /></button>
              </div>)}
              {(!draft || draft.media.length < MAX_MEDIA) && <button type="button" className="add-media-tile" onClick={() => inputRef.current?.click()} disabled={processing}>
                {processing ? <LoaderCircle size={26} className="spin" /> : <ImagePlus size={26} />}
                <span>{processing ? "Preparing…" : "Add photos"}</span>
              </button>}
            </div>
            <input ref={inputRef} className="visually-hidden" type="file" accept="image/*" multiple onChange={(event) => void handleFiles(event.target.files)} />

            <div className="create-post-field">
              <label htmlFor="post-caption">Caption</label>
              <textarea id="post-caption" value={draft?.caption ?? ""} maxLength={2200} placeholder="Write a caption…" onChange={(event) => setCaption(event.target.value)} disabled={!draft} />
              <span>{draft?.caption.length ?? 0}/2200</span>
            </div>
            <div className="create-post-field">
              <label htmlFor="post-visibility">Visibility</label>
              <select id="post-visibility" value={draft?.visibility ?? "public"} onChange={(event) => setVisibility(event.target.value as PostVisibility)} disabled={!draft}>
                <option value="public">Public</option>
                <option value="followers">Followers</option>
                <option value="private">Only me</option>
              </select>
            </div>
            {error && <p className="create-post-error" role="alert">{error}</p>}
            {publishMessage && <p className="create-post-success">{publishMessage}</p>}
            <button type="button" className="create-post-discard" onClick={() => void handleDiscard}>Discard draft</button>
          </>
        )}
      </section>
    </main>
  );
}

function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Unable to read image dimensions"));
    image.src = url;
  });
}
