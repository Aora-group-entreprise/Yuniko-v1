import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronDown, Globe, MessageCircle, Plus, Search, ShieldCheck, UserPlus, UserRound, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { getWorldFeed } from "./feed.service";
import { getAlgorithmicFeed, markPostSeen } from "./feed-ranking.service";
import { PostCard } from "./components/PostCard";
import { StoryStrip } from "./components/StoryStrip";
import { ProfilePage } from "../profile/ProfilePage";
import { CreatePostPage } from "../posts/CreatePostPage";
import { PostDetailPage } from "../posts/PostDetailPage";
import { NotificationsPage } from "../notifications/NotificationsPage";
import { SearchPage } from "../search/SearchPage";
import { MessagesPage } from "../messages/MessagesPage";
import { StoriesPage } from "../stories/StoriesPage";
import { SecurityPage } from "../security/SecurityPage";
import { getUnreadNotificationCount } from "../notifications/notifications.service";

type AppView = "feed" | "profile" | "create" | "post" | "notifications" | "search" | "messages" | "stories" | "security";

export function FeedPage() {
  const [view, setView] = useState<AppView>("feed");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);

  if (view === "profile") return <ProfilePage onBack={() => setView("feed")} onOpenPost={(postId) => { setSelectedPostId(postId); setView("post"); }} />;
  if (view === "create") return <CreatePostPage onBack={() => setView("feed")} />;
  if (view === "post" && selectedPostId) return <PostDetailPage postId={selectedPostId} onBack={() => setView("feed")} />;
  if (view === "notifications") return <NotificationsPage onBack={() => setView("feed")} />;
  if (view === "search") return <SearchPage onBack={() => setView("feed")} onOpenPost={(postId) => { setSelectedPostId(postId); setView("post"); }} />;
  if (view === "messages") return <MessagesPage onBack={() => setView("feed")} />;
  if (view === "stories") return <StoriesPage initialStoryId={selectedStoryId} onBack={() => setView("feed")} />;
  if (view === "security") return <SecurityPage onBack={() => setView("feed")} />;
  return <FollowingFeed onOpenProfile={() => setView("profile")} onOpenCreate={() => setView("create")} onOpenNotifications={() => setView("notifications")} onOpenSearch={() => setView("search")} onOpenMessages={() => setView("messages")} onOpenSecurity={() => setView("security")} onOpenStory={(storyId) => { setSelectedStoryId(storyId); setView("stories"); }} onCreateStory={() => { setSelectedStoryId(null); setView("stories"); }} />;
}

function FollowingFeed({ onOpenProfile, onOpenCreate, onOpenNotifications, onOpenSearch, onOpenMessages, onOpenSecurity, onOpenStory, onCreateStory }: { onOpenProfile: () => void; onOpenCreate: () => void; onOpenNotifications: () => void; onOpenSearch: () => void; onOpenMessages: () => void; onOpenSecurity: () => void; onOpenStory: (storyId: string) => void; onCreateStory: () => void }) {
  const [worldMenu, setWorldMenu] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [unreadNotifications, setUnreadNotifications] = useState(() => getUnreadNotificationCount());
  const { data, isLoading, isError } = useQuery({
    queryKey: ["feed", "world", "personalized"],
    queryFn: async () => getAlgorithmicFeed(await getWorldFeed()),
    staleTime: 30_000,
  });

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const refresh = () => setUnreadNotifications(getUnreadNotificationCount());
    window.addEventListener("storage", refresh);
    const timer = window.setInterval(refresh, 1000);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); window.clearInterval(timer); };
  }, []);

  return (
    <main className="feed-shell">
      <header className="feed-header">
        <button type="button" className="yuniko-wordmark" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Yuniko</button>
        <button type="button" className="world-selector" onClick={() => setWorldMenu((value) => !value)} aria-expanded={worldMenu}><Globe size={12} />World Feed<ChevronDown size={11} /></button>
        <div className="feed-header-actions"><button type="button" aria-label="Search" onClick={onOpenSearch}><Search size={20} /></button><button type="button" aria-label="Add friends"><UserPlus size={20} /></button><button type="button" aria-label="Security" onClick={onOpenSecurity}><ShieldCheck size={20} /></button></div>
      </header>
      {worldMenu && <div className="world-menu" role="menu"><button type="button" role="menuitem" onClick={() => setWorldMenu(false)}><Globe size={13} />World Feed</button><button type="button" role="menuitem" onClick={() => setWorldMenu(false)}><span>#</span>Trending tags</button></div>}
      <StoryStrip stories={data?.stories ?? []} onOpenStory={onOpenStory} onCreateStory={onCreateStory} />
      {!online && <div className="offline-bar"><WifiOff size={12} /><span>Offline mode</span></div>}
      <section className="feed-viewport" data-testid="posts-feed" aria-label="World Feed">
        {isLoading && <FeedSkeleton />}
        {isError && <div className="feed-state">Unable to load the feed.</div>}
        {!isLoading && !isError && data?.posts.map((post) => <div key={post.id} className="feed-slide" onPointerEnter={() => markPostSeen(post.id)} onFocus={() => markPostSeen(post.id)}><PostCard post={post} /></div>)}
      </section>
      <nav className="bottom-nav" aria-label="Primary navigation">
        <NavItem label="Home" active><span>⌂</span></NavItem>
        <button type="button" className="nav-item notification-nav" aria-label="Notifications" onClick={onOpenNotifications}><span><Bell size={21} />{unreadNotifications > 0 && <b>{unreadNotifications > 99 ? "99+" : unreadNotifications}</b>}</span><small>Alerts</small></button>
        <button className="create-button" type="button" aria-label="Create" onClick={onOpenCreate}><Plus size={28} /></button>
        <button type="button" className="nav-item" aria-label="Messages" onClick={onOpenMessages}><span><MessageCircle size={21} /></span><small>Messages</small></button>
        <button type="button" className="nav-item" aria-label="Profile" onClick={onOpenProfile}><span><UserRound size={21} /></span><small>Profile</small></button>
      </nav>
    </main>
  );
}

function NavItem({ label, active, children }: { label: string; active?: boolean; children: React.ReactNode }) { return <button type="button" className={`nav-item ${active ? "active" : ""}`} aria-label={label}><span>{children}</span><small>{label}</small></button>; }
function FeedSkeleton() { return <div className="feed-slide"><div className="post-card skeleton-card"><div className="skeleton" /><div className="skeleton skeleton-copy" /></div></div>; }
