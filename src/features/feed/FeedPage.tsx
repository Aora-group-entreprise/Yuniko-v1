import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronDown, Globe, MessageCircle, Plus, Search, ShieldCheck, UserPlus, UserRound, WifiOff } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { getWorldFeed } from "./feed.service";
import { getAlgorithmicFeed, markPostSeen } from "./feed-ranking.service";
import { PostCard } from "./components/PostCard";
import { StoryStrip } from "./components/StoryStrip";
import { getUnreadNotificationCount } from "../notifications/notifications.service";

const ProfilePage = lazy(() => import("../profile/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const CreatePostPage = lazy(() => import("../posts/CreatePostPage").then((module) => ({ default: module.CreatePostPage })));
const PostDetailPage = lazy(() => import("../posts/PostDetailPage").then((module) => ({ default: module.PostDetailPage })));
const NotificationsPage = lazy(() => import("../notifications/NotificationsPage").then((module) => ({ default: module.NotificationsPage })));
const SearchPage = lazy(() => import("../search/SearchPage").then((module) => ({ default: module.SearchPage })));
const MessagesPage = lazy(() => import("../messages/MessagesPage").then((module) => ({ default: module.MessagesPage })));
const StoriesPage = lazy(() => import("../stories/StoriesPage").then((module) => ({ default: module.StoriesPage })));
const SecurityPage = lazy(() => import("../security/SecurityPage").then((module) => ({ default: module.SecurityPage })));

type AppView = "feed" | "profile" | "create" | "post" | "notifications" | "search" | "messages" | "stories" | "security";

export function FeedPage() {
  const [view, setView] = useState<AppView>("feed");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      {view === "profile" && <ProfilePage onBack={() => setView("feed")} onOpenPost={(postId) => { setSelectedPostId(postId); setView("post"); }} />}
      {view === "create" && <CreatePostPage onBack={() => setView("feed")} />}
      {view === "post" && selectedPostId && <PostDetailPage postId={selectedPostId} onBack={() => setView("feed")} />}
      {view === "notifications" && <NotificationsPage onBack={() => setView("feed")} />}
      {view === "search" && <SearchPage onBack={() => setView("feed")} onOpenPost={(postId) => { setSelectedPostId(postId); setView("post"); }} />}
      {view === "messages" && <MessagesPage onBack={() => setView("feed")} />}
      {view === "stories" && <StoriesPage initialStoryId={selectedStoryId} onBack={() => setView("feed")} />}
      {view === "security" && <SecurityPage onBack={() => setView("feed")} />}
      {view === "feed" && <FollowingFeed onOpenProfile={() => setView("profile")} onOpenCreate={() => setView("create")} onOpenNotifications={() => setView("notifications")} onOpenSearch={() => setView("search")} onOpenMessages={() => setView("messages")} onOpenSecurity={() => setView("security")} onOpenStory={(storyId) => { setSelectedStoryId(storyId); setView("stories"); }} onCreateStory={() => { setSelectedStoryId(null); setView("stories"); }} />}
    </Suspense>
  );
}

function PageLoadingFallback() {
  return <main className="phase10-page-loading" role="status" aria-live="polite">Chargement…</main>;
}

function FollowingFeed({ onOpenProfile, onOpenCreate, onOpenNotifications, onOpenSearch, onOpenMessages, onOpenSecurity, onOpenStory, onCreateStory }: { onOpenProfile: () => void; onOpenCreate: () => void; onOpenNotifications: () => void; onOpenSearch: () => void; onOpenMessages: () => void; onOpenSecurity: () => void; onOpenStory: (storyId: string) => void; onCreateStory: () => void }) {
  const [worldMenu, setWorldMenu] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [unreadNotifications, setUnreadNotifications] = useState(() => getUnreadNotificationCount());
  const seenPostsRef = useRef(new Set<string>());
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
    const refreshInterval = window.setInterval(refresh, 10_000);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); window.removeEventListener("storage", refresh); window.clearInterval(refreshInterval); };
  }, []);

  const handlePostSeen = (postId: string) => {
    if (seenPostsRef.current.has(postId)) return;
    seenPostsRef.current.add(postId);
    markPostSeen(postId);
  };

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
        {!isLoading && !isError && data?.posts.map((post) => <div key={post.id} className="feed-slide" onFocus={() => handlePostSeen(post.id)}><PostCard post={post} /></div>)}
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
