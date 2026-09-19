import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { createStory, getActiveStories, markStoryViewed, subscribeToStories } from "./stories.service";
import type { Story } from "./story.schema";

type StoriesPageProps = { initialStoryId?: string | null; onBack: () => void };

export function StoriesPage({ initialStoryId, onBack }: StoriesPageProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [index, setIndex] = useState(0);
  const [creating, setCreating] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const refresh = () => { void getActiveStories().then((next) => { setStories(next); setIndex((current) => Math.min(current, Math.max(next.length - 1, 0))); }).catch(() => setStories([])); };

  useEffect(() => {
    refresh();
    return subscribeToStories(refresh);
  }, []);
  useEffect(() => {
    if (!initialStoryId || !stories.length) return;
    const found = stories.findIndex((story) => story.id === initialStoryId);
    if (found >= 0) setIndex(found);
  }, [initialStoryId, stories.length]);
  useEffect(() => {
    const story = stories[index];
    if (story && !story.viewed) void markStoryViewed(story.id).catch(() => undefined);
  }, [index, stories]);

  const current = stories[index];
  const move = (delta: number) => setIndex((value) => Math.min(Math.max(value + delta, 0), Math.max(stories.length - 1, 0)));

  const publish = async () => {
    try {
      if (!file) return;
      await createStory(file, caption);
      setFile(null);
      setCaption("");
      setCreating(false);
      refresh();
      setIndex(0);
    } catch {
      // Keep the form open so the user can retry.
    }
  };

  return (
    <main className="stories-page">
      <header className="stories-topbar">
        <button type="button" className="stories-back" aria-label="Back" onClick={onBack}><ArrowLeft size={21} /></button>
        <strong>Stories</strong>
        <button type="button" className="story-create-button" aria-label="Create story" onClick={() => setCreating(true)}><Plus size={20} /></button>
      </header>
      {creating ? (
        <section className="story-create-panel">
          <h2>Create a story</h2>
          <p>Ajoute une image ou une vidéo. Elle sera stockée dans Yuniko.</p>
          <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <textarea value={caption} maxLength={180} placeholder="Caption (optional)" onChange={(event) => setCaption(event.target.value)} />
          <div className="story-create-actions"><button type="button" onClick={() => setCreating(false)}>Cancel</button><button type="button" disabled={!file} onClick={() => void publish()}><Send size={16} />Publish</button></div>
        </section>
      ) : current ? (
        <section className="story-viewer" aria-label={`Story by ${current.authorName}`}>
          <div className="story-progress">{stories.map((story, storyIndex) => <span key={story.id} className={storyIndex <= index ? "filled" : ""} />)}</div>
          <div className="story-author"><img src={current.authorAvatarUrl} alt="" loading="lazy" decoding="async" /><div><strong>{current.authorName}</strong><small>@{current.authorUsername}</small></div></div>
          {current.mediaUrl.match(/\.(mp4|webm)(?:$|[?#])/i) ? (
            <video className="story-media" src={current.mediaUrl} aria-label={current.caption || `Story by ${current.authorName}`} autoPlay playsInline controls preload="metadata" />
          ) : (
            <img className="story-media" src={current.mediaUrl} alt={current.caption || `Story by ${current.authorName}`} loading="eager" decoding="async" fetchPriority="high" />
          )}
          {current.caption && <p className="story-caption">{current.caption}</p>}
          {index > 0 && <button type="button" className="story-nav story-prev" aria-label="Previous story" onClick={() => move(-1)}><ChevronLeft /></button>}
          {index < stories.length - 1 && <button type="button" className="story-nav story-next" aria-label="Next story" onClick={() => move(1)}><ChevronRight /></button>}
        </section>
      ) : <div className="stories-empty"><h2>No active stories</h2><p>Create the first one.</p><button type="button" onClick={() => setCreating(true)}><Plus size={17} />Create story</button></div>}
    </main>
  );
}
