import { useInfiniteQuery } from "@tanstack/react-query";
import { Bell, ChevronDown, Globe, Hash, MessageCircle, Plus, Search, UserPlus, UserRound, WifiOff } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useSessionStore } from "../../stores/sessionStore";
import { getFeedPage, markPostsSeen } from "./feed.service";
import { getAlgorithmicFeed } from "./feed-ranking.service";
import { PostCard } from "./components/PostCard";
import { StoryStrip } from "./components/StoryStrip";
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
    {view === "feed" && <FollowingFeed onOpenProfile={openOwnProfile} onOpenCreate={() => setView("create")} onOpenNotifications={() => setView("notifications")} onOpenSearch={() => setView("search")} onOpenMessages={() => setView("messages")} onOpenSecurity={() => setView("security")} onOpenSettings={() => setView("settings")} onOpenStory={(storyId: string) => { setSelectedStoryId(storyId); setView("stories"); }} onCreateStory={() => { setSelectedStoryId(null); setView("stories"); }} />}
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
  const stories = data?.pages[0]?.stories ?? [];

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
      const newlyVisible: string[] = [];
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.6) continue;
        const id = (entry.target as HTMLElement).dataset.postId;
        if (!id || seenBatchRef.current.has(id)) continue;
        newlyVisible.push(id);
      }
      if (!newlyVisible.length) return;
      for (const id of newlyVisible) seenBatchRef.current.add(id);
      void markPostsSeen(newlyVisible).catch(() => undefined);
    }, { root, threshold: [0.6] });
    root.querySelectorAll<HTMLElement>(".feed-slide[data-post-id]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [posts.length]);

  return <main className="feed-shell relative min-h-screen bg-[#0d0b14] overflow-hidden">
    <header className="absolute inset-x-0 top-0 z-50 h-14 flex items-center justify-between gap-2 px-3 min-[360px]:px-4 glass border-b border-pink-400/10">
      <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="text-2xl font-black gradient-text">Yuniko</button>
      <button type="button" onClick={() => setWorldMenu(value => !value)} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/[.06] border border-pink-400/30 text-white/90 text-xs min-[360px]:text-sm" aria-expanded={worldMenu}><Globe size={12} />World Feed<ChevronDown size={11} /></button>
      <div className="flex items-center gap-3">
        <button type="button" aria-label="Search" onClick={onOpenSearch}><Search size={20} className="text-white/75" /></button>
        <button type="button" aria-label="Add friends" onClick={onOpenSearch}><UserPlus size={20} className="text-white/75" /></button>
      </div>
    </header>
    <StoryStrip stories={stories} onOpenStory={onOpenStory} onCreateStory={onCreateStory} />
    {worldMenu && <><button className="fixed inset-0 z-40 cursor-default" aria-label="Close menu" onClick={() => setWorldMenu(false)} /><div className="absolute top-[60px] left-1/2 -translate-x-1/2 w-44 rounded-2xl z-50 overflow-hidden bg-[#120e1e] border border-pink-400/25" role="menu"><button type="button" role="menuitem" onClick={() => setWorldMenu(false)} className="w-full px-4 py-3 text-left text-sm flex items-center gap-2"><Globe size={13} />World Feed</button><button type="button" role="menuitem" onClick={() => { setWorldMenu(false); onOpenSearch(); }} className="w-full px-4 py-3 text-left text-sm flex items-center gap-2"><Hash size={13} />Trending tags</button></div></>}
    {!online && <div className="absolute inset-x-0 top-[134px] z-40 flex items-center justify-center gap-1.5 py-1.5 bg-red-500/85"><WifiOff size={12} /><span className="text-xs">Offline mode</span></div>}
    <section className="absolute inset-x-0 top-[134px] bottom-[64px] overflow-y-scroll snap-y snap-mandatory no-scrollbar" data-testid="posts-feed" aria-label="World Feed">
      {isLoading && <FeedSkeleton />}
      {isError && <div className="feed-state">Unable to load the feed.</div>}
      {!isLoading && !isError && posts.map(post => <div key={post.id} data-post-id={post.id} className="relative w-full max-w-[920px] mx-auto px-2 py-1 snap-start snap-always" style={{ height: "calc(100dvh - 198px)", minHeight: 480 }}><div className="relative w-full h-full rounded-2xl overflow-hidden"><PostCard post={post} /></div></div>)}
      {!isLoading && !isError && posts.length === 0 && <div className="feed-state">No posts yet.</div>}
      <div ref={loadMoreRef} aria-hidden="true" style={{ height: 1 }} />
      {isFetchingNextPage && <div className="feed-state">Chargement…</div>}
    </section>
    <nav className="fixed bottom-0 left-0 right-0 z-50 yuniko-bottom-nav glass border-t border-pink-400/15" aria-label="Primary navigation">
      <div className="flex items-center justify-around h-16 max-w-[1120px] mx-auto px-2">
        <button type="button" aria-label="Home" onClick={() => window.scrollTo({top:0,behavior:"smooth"})} className="w-14 h-14 flex flex-col items-center justify-center gap-0.5 relative"><HomeIcon size={22} className="text-pink-400" strokeWidth={2.3} /><span className="text-[10px] text-pink-400">Home</span><span className="absolute bottom-0 w-1 h-1 rounded-full bg-pink-400" /></button>
        <button type="button" aria-label="Notifications" onClick={onOpenNotifications} className="w-14 h-14 flex flex-col items-center justify-center gap-0.5 relative"><span className="relative"><Bell size={22} className="text-white/45" strokeWidth={1.7} />{unreadNotifications > 0 && <b className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-pink-400 text-white text-[9px] leading-4 text-center">{unreadNotifications > 99 ? "99+" : unreadNotifications}</b>}</span><span className="text-[10px] text-white/38">Alerts</span></button>
        <motion.button whileTap={{scale:.88}} type="button" aria-label="Create" onClick={onOpenCreate} className="w-[52px] h-[52px] rounded-full flex items-center justify-center" style={{background:"linear-gradient(135deg,#FF006E 0%,#8B00FF 100%)",boxShadow:"0 0 24px rgba(255,0,110,.45)"}}><Plus size={25} className="text-white" strokeWidth={2.8}/></motion.button>
        <button type="button" aria-label="Messages" onClick={onOpenMessages} className="w-14 h-14 flex flex-col items-center justify-center gap-0.5 relative"><MessageCircle size={22} className="text-white/45" strokeWidth={1.7}/><span className="text-[10px] text-white/38">Messages</span></button>
        <button type="button" aria-label="Profile" onClick={onOpenProfile} className="w-14 h-14 flex flex-col items-center justify-center gap-0.5 relative"><UserRound size={22} className="text-white/45" strokeWidth={1.7}/><span className="text-[10px] text-white/38">Profile</span></button>
      </div>
    </nav>
  </main>;
}

function FeedSkeleton() {
  return <div className="feed-slide"><div className="post-card skeleton-card"><div className="skeleton" /><div className="skeleton skeleton-copy" /></div></div>;
}
