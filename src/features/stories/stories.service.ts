import { storyLogSchema, type Story } from "./story.schema";

const KEY = "yuniko.stories.v1";
const ACTOR_KEY = "yuniko.local-actor.v1";
const REFERENCE_MEDIA = "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public";

const demoStories: Story[] = [
  { id: "s1", authorId: "2", authorName: "Sofia Park", authorUsername: "sofia.park", authorAvatarUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`, mediaUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`, caption: "A new day.", createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), expiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(), viewed: false },
  { id: "s2", authorId: "3", authorName: "Noah Reyes", authorUsername: "noah.reyes", authorAvatarUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`, mediaUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`, caption: "Tonight.", createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), expiresAt: new Date(Date.now() + 21 * 60 * 60 * 1000).toISOString(), viewed: false },
  { id: "s3", authorId: "4", authorName: "Lina Rose", authorUsername: "lina.rose", authorAvatarUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`, mediaUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`, caption: "Small moments.", createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), expiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(), viewed: true },
];

function actorId(): string {
  if (typeof window === "undefined") return "1";
  return window.localStorage.getItem(ACTOR_KEY) || "1";
}

function read(): Story[] {
  if (typeof window === "undefined") return demoStories;
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    const parsed = storyLogSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
  } catch {
    // Best effort only.
  }
  window.localStorage.setItem(KEY, JSON.stringify(demoStories));
  return demoStories;
}

function write(stories: Story[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(stories));
  window.dispatchEvent(new CustomEvent("yuniko:stories-changed"));
}

export function getActiveStories(): Story[] {
  const now = Date.now();
  return read().filter((story) => new Date(story.expiresAt).getTime() > now).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function markStoryViewed(storyId: string): void {
  const updated = read().map((story) => story.id === storyId ? { ...story, viewed: true } : story);
  write(updated);
}

export function createStory(mediaUrl: string, caption = ""): Story | null {
  const normalizedUrl = mediaUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) return null;
  const now = new Date();
  const story: Story = {
    id: `story-${Date.now()}`,
    authorId: actorId(),
    authorName: "You",
    authorUsername: "you",
    authorAvatarUrl: `${REFERENCE_MEDIA}/scene-rooftop.jpg`,
    mediaUrl: normalizedUrl,
    caption: caption.trim().slice(0, 180),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    viewed: true,
  };
  write([...read(), story]);
  return story;
}

export function subscribeToStories(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => listener();
  window.addEventListener("yuniko:stories-changed", handler);
  window.addEventListener("storage", handler);
  return () => { window.removeEventListener("yuniko:stories-changed", handler); window.removeEventListener("storage", handler); };
}
