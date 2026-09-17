import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { createStory, getActiveStories, markStoryViewed, subscribeToStories } from "./stories.service";
import type { Story } from "./story.schema";

type StoriesPageProps = { initialStoryId?: string | null; onBack: () => void };

export function StoriesPage({ initialStoryId, onBack }: StoriesPageProps) {
  const [stories, setStories] = useState<Story[]>(() => getActiveStories());
  const [index, setIndex] = useState(() => Math.max(0, getActiveStories().findIndex((story) => story.id === initialStoryId)));
  const [creating, setCreating] = useState(false);
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const refresh = () => setStories(getActiveStories());

  useEffect(() => subscribeToStories(refresh), []);
  useEffect(() => {
    const story = stories[index];
    if (story && !story.viewed) markStoryViewed(story.id);
  }, [index, stories]);

  const current = stories[index];
  const move = (delta: number) => setIndex((value) => Math.min(Math.max(value + delta, 0), Math.max(stories.length - 1, 0)));

  const publish = () => {
    if (!createStory(url, caption)) return;
    setUrl(""); setCaption(""); setCreating(false); refresh(); setIndex(0);
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
          <p>Use an image URL for this frontend prototype.</p>
          <input value={url} placeholder="Image URL" onChange={(event) => setUrl(event.target.value)} />
          <textarea value={caption} maxLength={180} placeholder="Caption (optional)" onChange={(event) => setCaption(event.target.value)} />
          <div className="story-create-actions"><button type="button" onClick={() => setCreating(false)}>Cancel</button><button type="button" disabled={!url.trim()} onClick={publish}><Send size={16} />Publish</button></div>
        </section>
      ) : current ? (
        <section className="story-viewer" aria-label={`Story by ${current.authorName}`}>
          <div className="story-progress">{stories.map((story, storyIndex) => <span key={story.id} className={storyIndex <= index ? "filled" : ""} />)}</div>
          <div className="story-author"><img src={current.authorAvatarUrl} alt="" /><div><strong>{current.authorName}</strong><small>@{current.authorUsername}</small></div></div>
          <img className="story-media" src={current.mediaUrl} alt={current.caption || `Story by ${current.authorName}`} />
          {current.caption && <p className="story-caption">{current.caption}</p>}
          {index > 0 && <button type="button" className="story-nav story-prev" aria-label="Previous story" onClick={() => move(-1)}><ChevronLeft /></button>}
          {index < stories.length - 1 && <button type="button" className="story-nav story-next" aria-label="Next story" onClick={() => move(1)}><ChevronRight /></button>}
        </section>
      ) : <div className="stories-empty"><h2>No active stories</h2><p>Create the first one.</p><button type="button" onClick={() => setCreating(true)}><Plus size={17} />Create story</button></div>}
    </main>
  );
}
