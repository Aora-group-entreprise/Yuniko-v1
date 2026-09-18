import { useInfiniteQuery } from "@tanstack/react-query";
import { Bell, ChevronDown, Globe, MessageCircle, Plus, Search, Settings, ShieldCheck, UserPlus, UserRound, WifiOff } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useSessionStore } from "../../stores/sessionStore";
import { getFeedPage, markPostsSeen } from "./feed.service";
import { getAlgorithmicFeed } from "./feed-ranking.service";
import { PostCard } from "./components/PostCard";
import { getUnreadNotificationCount, subscribeToNotifications } from "../notifications/notifications.service";

const ProfilePage = lazy(() => import("../profile/ProfilePage").then(module => ({ default: module.ProfilePage })));
const CreatePostPage = lazy(() => import("../posts/CreatePostPage").then(module => ({ default: module.CreatePostPage })));
const PostDetailPage = lazy(() => import("../posts/PostDetailPage").then(module => ({ default: module.PostDetailPage })));
const NotificationsPage = lazy(() => import("../notifications/NotificationsPage").then(module => ({ default: module.NotificationsPage })));
const SearchPage = lazy(() => import("../search/SearchPage").then(module => ({ default: module.SearchPage })));
const MessagesPage = lazy(() => import("../messages/MessagesPage").then(module => ({ default: module.MessagesPage })));
const StoriesPage = lazy(() => import("../stories/StoriesPage").then(module => ({ default: module.StoriesPage })));
const SecurityPage = lazy(() => import("../security/SecurityPage").then(module => ({ default: module.SecurityPage })));
const SettingsPage = lazy(() => import("../settings/SettingsPage").then(module => ({ default: module.SettingsPage })));

type AppView = "feed" | "profile" | "create" | "post" | "notifications" | "search" | "messages" | "stories" | "security" | "settings";

export function FeedPage() {
  const user = useSessionStore(state => state.user);
  const [view, setView] = useState<AppView>("feed");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(user?.id ?? null);

  const openOwnProfile = () => {
    if (!user?.id) return;
    setSelectedProfileId(user.id);
    setView("profile");
  };

  return <Suspense fallback={<PageLoadingFallback />}>
    {view === "profile" && selectedProfileId && <ProfilePage profileId={selectedProfileId} onBack={() => setView("feed")} onOpenPost={postId => { setSelectedPostId(postId); setView("post"); }} />}
    {view === "create" && <CreatePostPage onBack={() => setView("feed")} />}
    {view === "post" && selectedPostId && <PostDetailPage postId={selectedPostId} onBack={() => setView("feed")} />}
    {view === "notifications" && <NotificationsPage onBack={() => setView("feed")} />}
    {view === "search" && <SearchPage onBack={() => setView("feed")} onOpenPost={postId => { setSelectedPostId(postId); setView("post"); }} onOpenProfile={profileId => { setSelectedProfileId(profileId); setView("profile"); }} />}
    {view === "messages" && <MessagesPage onBack={() => setView("feed")} />}
    {view === "stories" && <StoriesPage initialStoryId={selectedStoryId} onBack={() => setView("feed")} />}
    {view === "security" && <SecurityPage onBack={() => setView("settings")} />}
    {view === "settings" && <SettingsPage onBack={() => setView("feed")} onOpenSecurity={() => setView("security")} />}
    {view === "feed" && <FollowingFeed onOpenProfile={openOwnProfile} onOpenCreate={() => setView("create")} onOpenNotifications={() => setView("notifications")} onOpenSearch={() => setView("search")} onOpenMessages={() => setView("messages")} onOpenSecurity={() => setView("security")} onOpenSettings={() => setView("settings")} onOpenStory={storyId => { setSelectedStoryId(storyId); setView("stories"); }} onCreateStory={() => { setSelectedStoryId(null); setView("stories"); }} />}
  </Suspense>;
}

function PageLoadingFallback() {
  return <main className="phase10-page-loading" role="status" aria-live="polite">Chargement…</main>;
}

function FollowingFeed({ onOpenProfile, onOpenCreate, onOpenNotifications, onOpenSearch, onOpenMessages, onOpenSecurity, onOpenSettings, onOpenStory, onCreateStory }: {
  onOpenProfile: () => void; onOpenCreate: () => void; onOpenNotifications: () => void; onOpenSearch: () => void;
  onOpenMessages: () => void; onOpenSecurity: () => void; onOpenSettings: () => void; onOpenStory: (storyId: string) => void; onCreateStory: () => void;
}) {
  const [worldMenu, setWorldMenu] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const seenBatchRef = useRef(new Set<string>());
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["feed", "world", "ranked"],
    initialPageParam: null as import("./feed.service").FeedCursor,
    queryFn: async ({ pageParam }) => getAlgorithmicFeed(await getFeedPage(pageParam)),
    getNextPageParam: lastPage => lastPage.hasMore ? lastPage.nextCursor : undefined,
    staleTime: 30_000,
  });

  const posts = data?.pages.flatMap(page => page.posts) ?? [];

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const refreshNotifications = () => { void getUnreadNotificationCount().then(setUnreadNotifications).catch(() => setUnreadNotifications(0)); };
    refreshNotifications();
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const unsubscribeNotifications = subscribeToNotifications(refreshNotifications);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); unsubscribeNotifications(); };
  }, []);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
    }, { rootMargin: "900px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".feed-viewport");
    if (!root) return;
    const observer = new IntersectionObserver((entries) => {
      const newlyVisible = entries
        .filter((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.6)
        .map((entry) => (entry.target as HTMLElement).dataset.postId)
        .filter((id): id is string => Boolean(id) && !seenBatchRef.current.has(id));
      if (!newlyVisible.length) return;
      for (const id of newlyVisible) seenBatchRef.current.add(id);
      void markPostsSeen(newlyVisible).catch(() => undefined);
    }, { root, threshold: [0.6] });
    root.querySelectorAll<HTMLElement>(".feed-slide[data-post-id]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [posts.length]);

  return <main className="feed-shell">
    <header className="feed-header">
      <button type="button" className="yuniko-wordmark" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Yuniko</button>
      <button type="button" className="world-selector" onClick={() => setWorldMenu(value => !value)} aria-expanded={worldMenu}><Globe size={12} />World Feed<ChevronDown size={11} /></button>
      <div className="feed-header-actions">
        <button type="button" aria-label="Search" onClick={onOpenSearch}><Search size={20} /></button>
        <button type="button" aria-label="Add friends" onClick={onOpenSearch}><UserPlus size={20} /></button>
        <button type="button" aria-label="Security" onClick={onOpenSecurity}><ShieldCheck size={20} /></button>
        <button type="button" aria-label="Settings" onClick={onOpenSettings}><Settings size={20} /></button>
      </div>
    </header>
    {worldMenu && <div className="world-menu" role="menu"><button type="button" role="menuitem" onClick={() => setWorldMenu(false)}><Globe size={13} />World Feed</button><button type="button" role="menuitem" onClick={() => setWorldMenu(false)}><span>#</span>Trending tags</button></div>}
    {!online && <div className="offline-bar"><WifiOff size={12} /><span>Offline mode</span></div>}
    <section className="feed-viewport" data-testid="posts-feed" aria-label="World Feed">
      {isLoading && <FeedSkeleton />}
      {isError && <div className="feed-state">Unable to load the feed.</div>}
      {!isLoading && !isError && posts.map(post => <div key={post.id} data-post-id={post.id} className="feed-slide"><PostCard post={post} /></div>)}
      {!isLoading && !isError && posts.length === 0 && <div className="feed-state">No posts yet.</div>}
      <div ref={loadMoreRef} aria-hidden="true" style={{ height: 1 }} />
      {isFetchingNextPage && <div className="feed-state">Chargement…</div>}
    </section>
    <nav className="bottom-nav" aria-label="Primary navigation">
      <button type="button" className="nav-item active" aria-label="Home"><span>⌂</span></button>
      <button type="button" className="nav-item notification-nav" aria-label="Notifications" onClick={onOpenNotifications}><span><Bell size={21} />{unreadNotifications > 0 && <b>{unreadNotifications > 99 ? "99+" : unreadNotifications}</b>}</span></button>
      <button className="create-button" type="button" aria-label="Create" onClick={onOpenCreate}><Plus size={28} /></button>
      <button type="button" className="nav-item" aria-label="Messages" onClick={onOpenMessages}><span><MessageCircle size={21} /></span></button>
      <button type="button" className="nav-item" aria-label="Profile" onClick={onOpenProfile}><span><UserRound size={21} /></span></button>
    </nav>
  </main>;
}

function FeedSkeleton() {
  return <div className="feed-slide"><div className="post-card skeleton-card"><div className="skeleton" /><div className="skeleton skeleton-copy" /></div></div>;
}
