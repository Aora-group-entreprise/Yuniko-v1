import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Grid3X3, MoreHorizontal, UserRound, Users, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { getMyProfile, getPublicProfileById } from "./profile.service";
import { acceptFollowRequest, rejectFollowRequest, toggleFollow } from "../follow/follow.service";
import { listFollowRequests, listFollowers, listFollowing, removeFollower, type FollowListItem } from "../follow/follow-lists.service";
import { useFollowStore } from "../follow/follow.store";
import type { FollowStatus } from "../follow/follow.schema";
import { ModerationSheet } from "../moderation/ModerationSheet";

type ListView = "followers" | "following" | "requests" | null;

export function ProfilePage({ onBack, onOpenPost, profileId }: { onBack: () => void; onOpenPost: (postId: string) => void; profileId?: string }) {
  const validProfileId = profileId && /^[0-9a-f-]{36}$/i.test(profileId) ? profileId : null;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["profile", validProfileId ?? "me"],
    queryFn: async () => {
      if (validProfileId) return getPublicProfileById(validProfileId);
      const me = await getMyProfile();
      if (!me) throw new Error("Not authenticated.");
      return getPublicProfileById(me.id);
    },
    staleTime: 30_000,
  });
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

  const profile = data;
  const followStatus = storedStatus ?? profile.followStatus ?? "none";
  const isFollowing = followStatus === "following";
  const isRequested = followStatus === "requested";

  async function handleFollow() {
    if (isPending || followStatus === "self") return;
    const previous = followStatus;
    const optimistic: FollowStatus = isFollowing || isRequested ? "none" : profile.isPrivate ? "requested" : "following";
    setPending(profile.id, true);
    setStatus(profile.id, optimistic);
    if (optimistic === "following" && previous !== "following") setFollowers((count) => count + 1);
    if (optimistic === "none" && previous === "following") setFollowers((count) => Math.max(0, count - 1));
    try {
      const next = await toggleFollow(profile.id);
      setStatus(profile.id, next);
      if (next !== optimistic) setFollowers(next === "following" ? profile.followerCount + 1 : profile.followerCount);
    } catch {
      setStatus(profile.id, previous);
      setFollowers(profile.followerCount);
    } finally { setPending(profile.id, false); }
  }

  return (
    <main className="w-full min-h-screen bg-[#0d0b14] text-white pb-20">
      <header className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3 glass border-b border-white/[.06]">
        <button type="button" aria-label="Back" onClick={onBack}><ArrowLeft size={22} className="text-white/80" /></button>
        <h1 className="text-base font-semibold flex-1">@{data.username}</h1>
        <button type="button" aria-label="More" onClick={() => setModerationOpen(true)}><MoreHorizontal size={22} className="text-white/80" /></button>
      </header>
      <div className="h-32" style={{ background: "linear-gradient(135deg,#FF006E 0%,#8B00FF 100%)" }} />
      <div className="px-4 relative">
        <div className="flex items-end justify-between -mt-9 mb-3">
          <div className="w-[76px] h-[76px] rounded-full p-[3px]" style={{background:"linear-gradient(135deg,#FF006E 0%,#8B00FF 100%)"}}><img src={data.avatarUrl ?? ""} alt="" className="w-full h-full rounded-full object-cover border-2 border-[#0d0b14]" /></div>
          {!isPending && followStatus !== "self" && <button type="button" onClick={() => void handleFollow()} className="px-5 py-2 rounded-xl text-sm font-semibold" style={{ background: isFollowing ? "rgba(255,255,255,.1)" : "linear-gradient(135deg,#FF006E 0%,#8B00FF 100%)" }}>{isFollowing ? "Following" : isRequested ? "Requested" : "Follow"}</button>}
        </div>
        <div className="mb-4">
          <div className="flex items-center gap-1"><h2 className="font-bold text-base">{data.displayName}</h2></div>
          <p className="text-white/50 text-sm">@{data.username}</p>
          <p className="text-white/80 text-sm mt-2">{data.bio}</p>
          {data.country && <p className="text-white/45 text-xs mt-2">{data.country}</p>}
        </div>
        <div className="flex rounded-2xl mb-4 overflow-hidden bg-white/[.04] border border-white/[.07]">
          <Stat value={data.postCount} label="Posts" />
          <button type="button" onClick={() => setListView("followers")} className="flex-1 py-3 border-r border-white/[.07]"><b className="block">{formatCount(followers)}</b><span className="text-white/45 text-xs">Followers</span></button>
          <button type="button" onClick={() => setListView("following")} className="flex-1 py-3"><b className="block">{formatCount(data.followingCount)}</b><span className="text-white/45 text-xs">Following</span></button>
        </div>
        <div className="flex border-b border-white/5 mb-2"><button type="button" aria-label="Posts" className="flex-1 py-3 text-pink-400"><Grid3X3 size={18} className="mx-auto" /></button></div>
        {data.posts.length === 0 ? <div className="flex flex-col items-center justify-center py-24 px-6 text-center"><div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-pink-500/10 border border-pink-500/20 text-pink-400"><Grid3X3 size={24} /></div><h2 className="font-bold text-lg mb-2">Nothing here yet</h2><p className="text-white/45 text-sm">Posts will appear here.</p></div> : <div className="grid grid-cols-3 gap-1">{data.posts.map(post => <button key={post.id} type="button" onClick={() => onOpenPost(post.id)} className="aspect-square bg-white/5 overflow-hidden"><img src={post.mediaUrl} alt={post.caption} className="w-full h-full object-cover" /></button>)}</div>}
        {data.isPrivate && <button type="button" className="mt-4 px-4 py-2 rounded-full bg-white/10 text-xs" onClick={() => setListView("requests")}><Users size={14} className="inline mr-1" />Follow requests</button>}
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-50 yuniko-bottom-nav glass border-t border-pink-400/15"><div className="flex items-center justify-around h-16 max-w-[1120px] mx-auto px-2"><button type="button" aria-label="Home" onClick={onBack} className="w-14 h-14 flex flex-col items-center justify-center gap-0.5"><span className="text-white/45 text-xl">⌂</span><span className="text-[10px] text-white/38">Home</span></button><button type="button" aria-label="Alerts" className="w-14 h-14 flex flex-col items-center justify-center gap-0.5"><span className="text-white/45">◌</span><span className="text-[10px] text-white/38">Alerts</span></button><span className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-white text-2xl" style={{background:"linear-gradient(135deg,#FF006E 0%,#8B00FF 100%)"}}>+</span><span className="w-14 h-14 flex flex-col items-center justify-center gap-0.5"><span className="text-white/45">◍</span><span className="text-[10px] text-white/38">Messages</span></span><button type="button" aria-label="Profile" className="w-14 h-14 flex flex-col items-center justify-center gap-0.5"><UserRound size={21} className="text-pink-400"/><span className="text-[10px] text-pink-400">Profile</span></button></div></nav>
      {listView && <FollowListSheet type={listView} items={listView === "followers" ? followersQuery.data ?? [] : listView === "following" ? followingQuery.data ?? [] : requestsQuery.data ?? []} loading={listView === "followers" ? followersQuery.isLoading : listView === "following" ? followingQuery.isLoading : requestsQuery.isLoading} onClose={() => setListView(null)} onRemove={listView === "followers" ? async (id) => { await removeFollower(id); await followersQuery.refetch(); } : undefined} onAccept={listView === "requests" ? async (id) => { await acceptFollowRequest(id); await requestsQuery.refetch(); } : undefined} onReject={listView === "requests" ? async (id) => { await rejectFollowRequest(id); await requestsQuery.refetch(); } : undefined} />}
      {moderationOpen && <ModerationSheet targetType="user" targetId={data.id} targetName={`@${data.username}`} onClose={() => setModerationOpen(false)} />}
    </main>
;
}

function FollowListSheet({ type, items, loading, onClose, onRemove, onAccept, onReject }: { type: Exclude<ListView, null>; items: FollowListItem[]; loading: boolean; onClose: () => void; onRemove?: (id: string) => Promise<void>; onAccept?: (id: string) => Promise<void>; onReject?: (id: string) => Promise<void> }) { const title = type === "followers" ? "Followers" : type === "following" ? "Following" : "Follow requests"; return <div className="follow-sheet-backdrop" role="presentation" onClick={onClose}><section className="follow-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}><header className="follow-sheet-header"><strong>{title}</strong><button type="button" className="profile-header-button" aria-label="Close" onClick={onClose}><X size={20} /></button></header><div className="follow-sheet-list">{loading && <div className="follow-sheet-state">Loading…</div>}{!loading && items.length === 0 && <div className="follow-sheet-state">No users here yet.</div>}{!loading && items.map((item) => <div className="follow-list-row" key={item.id}><img src={item.avatarUrl ?? ""} alt="" /><div className="follow-list-copy"><strong>{item.displayName}</strong><span>@{item.username}</span></div>{onAccept && <button type="button" className="follow-list-action accept" aria-label={`Accept ${item.username}`} onClick={() => void onAccept(item.id)}><Check size={17} /></button>}{onReject && <button type="button" className="follow-list-action reject" aria-label={`Reject ${item.username}`} onClick={() => void onReject(item.id)}><X size={17} /></button>}{onRemove && <button type="button" className="follow-list-text-action" onClick={() => void onRemove(item.id)}>Remove</button>}</div>)}</div></section></div>; }
function Stat({ value, label }: { value: number; label: string }) { return <div><strong>{formatCount(value)}</strong><span>{label}</span></div>; }
function formatCount(value: number) { return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value); }
function ProfileShell({ children }: { children: ReactNode }) { return <main className="profile-shell"><header className="profile-header"><span className="profile-header-name">Profile</span></header><section className="profile-scroll">{children}</section></main>; }
function ProfileSkeleton() { return <div className="profile-skeleton"><div className="profile-skeleton-avatar" /><div className="profile-skeleton-line wide" /><div className="profile-skeleton-line" /><div className="profile-skeleton-grid">{Array.from({ length: 6 }).map((_, index) => <div key={index} />)}</div></div>; }
