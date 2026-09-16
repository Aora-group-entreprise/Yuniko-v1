import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Globe, Search, UserPlus, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { getChronologicalFeed } from "./feed.service";
import { PostCard } from "./components/PostCard";
import { StoryStrip } from "./components/StoryStrip";

export function FeedPage() {
  const [worldMenu, setWorldMenu] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["feed", "following", "chronological"],
    queryFn: getChronologicalFeed,
    staleTime: 30_000,
  });

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <main className="feed-shell">
      <header className="feed-header">
        <button type="button" className="yuniko-wordmark" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Yuniko</button>
        <button type="button" className="world-selector" onClick={() => setWorldMenu((value) => !value)}>
          <Globe size={12} />World Feed<ChevronDown size={11} />
        </button>
        <div className="feed-header-actions">
          <button type="button" aria-label="Search"><Search size={20} /></button>
          <button type="button" aria-label="Add friends"><UserPlus size={20} /></button>
        </div>
      </header>

      {worldMenu && <div className="world-menu"><button type="button"><Globe size={13} />World Feed</button><button type="button"><span>#</span>Trending tags</button></div>}
      <StoryStrip stories={data?.stories ?? []} />
      {!online && <div className="offline-bar"><WifiOff size={12} /><span>Offline mode</span></div>}

      <section className="feed-viewport" data-testid="posts-feed">
        {isLoading && <FeedSkeleton />}
        {isError && <div className="feed-state">Unable to load the feed.</div>}
        {!isLoading && !isError && data?.posts.map((post) => (
          <div key={post.id} className="feed-slide">
            <PostCard post={post} />
          </div>
        ))}
      </section>

      <nav className="bottom-nav" aria-label="Primary navigation">
        <NavItem label="Home" active="true">⌂</NavItem>
        <NavItem label="Alerts">◌</NavItem>
        <button className="create-button" type="button" aria-label="Create">+</button>
        <NavItem label="Messages">◍</NavItem>
        <NavItem label="Profile">○</NavItem>
      </nav>
    </main>
  );
}

function NavItem({ label, active, children }: { label: string; active?: string; children: React.ReactNode }) {
  return <button type="button" className={`nav-item ${active ? "active" : ""}`}><span>{children}</span><small>{label}</small></button>;
}

function FeedSkeleton() {
  return <div className="feed-slide"><div className="post-card skeleton-card"><div className="skeleton" /><div className="skeleton skeleton-copy" /></div></div>;
}
