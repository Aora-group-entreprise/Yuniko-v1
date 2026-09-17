import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronDown, Globe, MessageCircle, Plus, Search, UserPlus, UserRound, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { getChronologicalFeed } from "./feed.service";
import { PostCard } from "./components/PostCard";
import { StoryStrip } from "./components/StoryStrip";
import { ProfilePage } from "../profile/ProfilePage";
import { CreatePostPage } from "../posts/CreatePostPage";
import { PostDetailPage } from "../posts/PostDetailPage";

type AppView = "feed" | "profile" | "create" | "post";

export function FeedPage() {
  const [view, setView] = useState<AppView>("feed");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  if (view === "profile") return <ProfilePage onBack={() => setView("feed")} onOpenPost={(postId) => { setSelectedPostId(postId); setView("post"); }} />;
  if (view === "create") return <CreatePostPage onBack={() => setView("feed")} />;
  if (view === "post" && selectedPostId) return <PostDetailPage postId={selectedPostId} onBack={() => setView("profile")} />;
  return <FollowingFeed onOpenProfile={() => setView("profile")} onOpenCreate={() => setView("create")} />;
}

function FollowingFeed({ onOpenProfile, onOpenCreate }: { onOpenProfile: () => void; onOpenCreate: () => void }) {
  const [worldMenu, setWorldMenu] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const { data, isLoading, isError } = useQuery({ queryKey: ["feed", "following", "chronological"], queryFn: getChronologicalFeed, staleTime: 30_000 });

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  return (
    <main className="feed-shell">
      <header className="feed-header">
        <button type="button" className="yuniko-wordmark" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Yuniko</button>
        <button type="button" className="world-selector" onClick={() => setWorldMenu((value) => !value)} aria-expanded={worldMenu}><Globe size={12} />World Feed<ChevronDown size={11} /></button>
        <div className="feed-header-actions"><button type="button" aria-label="Search"><Search size={20} /></button><button type="button" aria-label="Add friends"><UserPlus size={20} /></button></div>
      </header>
      {worldMenu && <div className="world-menu" role="menu"><button type="button" role="menuitem" onClick={() => setWorldMenu(false)}><Globe size={13} />World Feed</button><button type="button" role="menuitem" onClick={() => setWorldMenu(false)}><span>#</span>Trending tags</button></div>}
      <StoryStrip stories={data?.stories ?? []} />
      {!online && <div className="offline-bar"><WifiOff size={12} /><span>Offline mode</span></div>}
      <section className="feed-viewport" data-testid="posts-feed" aria-label="Following feed">
        {isLoading && <FeedSkeleton />}
        {isError && <div className="feed-state">Unable to load the feed.</div>}
        {!isLoading && !isError && data?.posts.map((post) => <div key={post.id} className="feed-slide"><PostCard post={post} /></div>)}
      </section>
      <nav className="bottom-nav" aria-label="Primary navigation">
        <NavItem label="Home" active><span>⌂</span></NavItem>
        <NavItem label="Alerts"><Bell size={21} /></NavItem>
        <button className="create-button" type="button" aria-label="Create" onClick={onOpenCreate}><Plus size={28} /></button>
        <NavItem label="Messages"><MessageCircle size={21} /></NavItem>
        <button type="button" className="nav-item" aria-label="Profile" onClick={onOpenProfile}><span><UserRound size={21} /></span><small>Profile</small></button>
      </nav>
    </main>
  );
}

function NavItem({ label, active, children }: { label: string; active?: boolean; children: React.ReactNode }) {
  return <button type="button" className={`nav-item ${active ? "active" : ""}`} aria-label={label}><span>{children}</span><small>{label}</small></button>;
}

function FeedSkeleton() {
  return <div className="feed-slide"><div className="post-card skeleton-card"><div className="skeleton" /><div className="skeleton skeleton-copy" /></div></div>;
}
