import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Grid3X3, MoreHorizontal, UserRound, Users, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { getPublicProfile } from "./profile.service";
import { acceptFollowRequest, rejectFollowRequest, toggleFollow } from "../follow/follow.service";
import { listFollowRequests, listFollowers, listFollowing, removeFollower, type FollowListItem } from "../follow/follow-lists.service";
import { useFollowStore } from "../follow/follow.store";
import type { FollowStatus } from "../follow/follow.schema";
import { ModerationSheet } from "../moderation/ModerationSheet";

type ListView = "followers" | "following" | "requests" | null;

export function ProfilePage({ onBack, onOpenPost, profileId = "2" }: { onBack: () => void; onOpenPost: (postId: string) => void; profileId?: string }) {
  const username = profileId === "3" ? "noah.reed" : "sofia.park";
  const { data, isLoading, isError } = useQuery({ queryKey: ["profile", username], queryFn: () => getPublicProfile(username), staleTime: 30_000 });
  const storedStatus = useFollowStore((state) => state.statusByProfile[data?.id ?? ""]);
  const setStatus = useFollowStore((state) => state.setStatus);
  const setPending = useFollowStore((state) => state.setPending);
  const isPending = useFollowStore((state) => state.pendingProfiles.includes(data?.id ?? ""));
  const [followers, setFollowers] = useState(0);
  const [listView, setListView] = useState<ListView>(null);
  const [moderationOpen, setModerationOpen] = useState(false);

  useEffect(() => {
    if (!data) return;
    setFollowers(data.followerCount);
    setStatus(data.id, data.followStatus ?? "none");
  }, [data, setStatus]);

  const followersQuery = useQuery({ queryKey: ["follow", "followers", data?.id], queryFn: () => listFollowers(data!.id), enabled: Boolean(data?.id && listView === "followers") });
  const followingQuery = useQuery({ queryKey: ["follow", "following", data?.id], queryFn: () => listFollowing(data!.id), enabled: Boolean(data?.id && listView === "following") });
  const requestsQuery = useQuery({ queryKey: ["follow", "requests", data?.id], queryFn: () => listFollowRequests(data!.id), enabled: Boolean(data?.id && listView === "requests") });

  if (isLoading) return <ProfileShell><ProfileSkeleton /></ProfileShell>;
  if (isError || !data) return <ProfileShell><div className="profile-state">Unable to load profile.</div></ProfileShell>;

  const followStatus = storedStatus ?? data.followStatus ?? "none";
  const isFollowing = followStatus === "following";
  const isRequested = followStatus === "requested";

  async function handleFollow() {
    if (isPending || followStatus === "self") return;
    const previous = followStatus;
    const optimistic: FollowStatus = isFollowing || isRequested ? "none" : data.isPrivate ? "requested" : "following";
    setPending(data.id, true);
    setStatus(data.id, optimistic);
    if (optimistic === "following" && previous !== "following") setFollowers((count) => count + 1);
    if (optimistic === "none" && previous === "following") setFollowers((count) => Math.max(0, count - 1));
    try {
      const next = await toggleFollow(data.id);
      setStatus(data.id, next);
      if (next !== optimistic) setFollowers(next === "following" ? data.followerCount + 1 : data.followerCount);
    } catch {
      setStatus(data.id, previous);
      setFollowers(data.followerCount);
    } finally { setPending(data.id, false); }
  }

  return (
    <main className="profile-shell">
      <header className="profile-header">
        <button type="button" className="profile-header-button" aria-label="Back to feed" onClick={onBack}><ArrowLeft size={21} /></button>
        <span className="profile-header-name">{data.username}</span>
        <button type="button" className="profile-header-button" aria-label="More profile options" onClick={() => setModerationOpen(true)}><MoreHorizontal size={22} /></button>
      </header>
      <section className="profile-scroll">
        <div className="profile-identity">
          <div className="profile-avatar-ring"><img src={data.avatarUrl} alt="" /></div>
          <h1>{data.displayName}</h1>
          <p className="profile-username">@{data.username}</p>
          {data.country && <p className="profile-country">{data.country}</p>}
          <p className="profile-bio">{data.bio}</p>
          <div className="profile-stats" aria-label="Profile statistics"><Stat value={data.postCount} label="Posts" /><button type="button" className="profile-stat-button" onClick={() => setListView("followers")}><Stat value={followers} label="Followers" /></button><button type="button" className="profile-stat-button" onClick={() => setListView("following")}><Stat value={data.followingCount} label="Following" /></button></div>
          <button type="button" className="profile-follow-placeholder" disabled={isPending} onClick={handleFollow} aria-busy={isPending}>{isFollowing ? "Following" : isRequested ? "Requested" : "Follow"}</button>
          {data.isPrivate && <button type="button" className="profile-requests-button" onClick={() => setListView("requests")}><Users size={15} /> Follow requests</button>}
        </div>
        <div className="profile-grid-header"><Grid3X3 size={18} /><span>Posts</span></div>
        <div className="profile-grid" aria-label={`${data.displayName}'s posts`}>{data.posts.map((post) => <button key={post.id} type="button" className="profile-grid-item" aria-label={`Open post: ${post.caption}`} onClick={() => onOpenPost(post.id)}><img src={post.mediaUrl} alt="" loading="lazy" /></button>)}</div>
      </section>
      <nav className="bottom-nav profile-bottom-nav" aria-label="Primary navigation"><button type="button" className="nav-item" aria-label="Home" onClick={onBack}><span>⌂</span><small>Home</small></button><button type="button" className="nav-item" aria-label="Alerts"><span>◌</span><small>Alerts</small></button><button type="button" className="create-button" aria-label="Create"><span>+</span></button><button type="button" className="nav-item" aria-label="Messages"><span>◍</span><small>Messages</small></button><button type="button" className="nav-item active" aria-label="Profile"><span><UserRound size={21} /></span><small>Profile</small></button></nav>
      {listView && <FollowListSheet type={listView} items={listView === "followers" ? followersQuery.data ?? [] : listView === "following" ? followingQuery.data ?? [] : requestsQuery.data ?? []} loading={listView === "followers" ? followersQuery.isLoading : listView === "following" ? followingQuery.isLoading : requestsQuery.isLoading} onClose={() => setListView(null)} onRemove={listView === "followers" ? async (id) => { await removeFollower(id); await followersQuery.refetch(); } : undefined} onAccept={listView === "requests" ? async (id) => { await acceptFollowRequest(id); await requestsQuery.refetch(); } : undefined} onReject={listView === "requests" ? async (id) => { await rejectFollowRequest(id); await requestsQuery.refetch(); } : undefined} />}
      {moderationOpen && <ModerationSheet targetType="user" targetId={data.id} targetName={`@${data.username}`} onClose={() => setModerationOpen(false)} />}
    </main>
  );
}

function FollowListSheet({ type, items, loading, onClose, onRemove, onAccept, onReject }: { type: Exclude<ListView, null>; items: FollowListItem[]; loading: boolean; onClose: () => void; onRemove?: (id: string) => Promise<void>; onAccept?: (id: string) => Promise<void>; onReject?: (id: string) => Promise<void> }) { const title = type === "followers" ? "Followers" : type === "following" ? "Following" : "Follow requests"; return <div className="follow-sheet-backdrop" role="presentation" onClick={onClose}><section className="follow-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}><header className="follow-sheet-header"><strong>{title}</strong><button type="button" className="profile-header-button" aria-label="Close" onClick={onClose}><X size={20} /></button></header><div className="follow-sheet-list">{loading && <div className="follow-sheet-state">Loading…</div>}{!loading && items.length === 0 && <div className="follow-sheet-state">No users here yet.</div>}{!loading && items.map((item) => <div className="follow-list-row" key={item.id}><img src={item.avatarUrl} alt="" /><div className="follow-list-copy"><strong>{item.displayName}</strong><span>@{item.username}</span></div>{onAccept && <button type="button" className="follow-list-action accept" aria-label={`Accept ${item.username}`} onClick={() => void onAccept(item.id)}><Check size={17} /></button>}{onReject && <button type="button" className="follow-list-action reject" aria-label={`Reject ${item.username}`} onClick={() => void onReject(item.id)}><X size={17} /></button>}{onRemove && <button type="button" className="follow-list-text-action" onClick={() => void onRemove(item.id)}>Remove</button>}</div>)}</div></section></div>; }
function Stat({ value, label }: { value: number; label: string }) { return <div><strong>{formatCount(value)}</strong><span>{label}</span></div>; }
function formatCount(value: number) { return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value); }
function ProfileShell({ children }: { children: ReactNode }) { return <main className="profile-shell"><header className="profile-header"><span className="profile-header-name">Profile</span></header><section className="profile-scroll">{children}</section></main>; }
function ProfileSkeleton() { return <div className="profile-skeleton"><div className="profile-skeleton-avatar" /><div className="profile-skeleton-line wide" /><div className="profile-skeleton-line" /><div className="profile-skeleton-grid">{Array.from({ length: 6 }).map((_, index) => <div key={index} />)}</div></div>; }
