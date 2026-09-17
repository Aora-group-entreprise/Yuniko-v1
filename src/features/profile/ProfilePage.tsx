import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Grid3X3, MoreHorizontal, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { getPublicProfile } from "./profile.service";
import { toggleFollow } from "../follow/follow.service";
import { useFollowStore } from "../follow/follow.store";
import type { FollowStatus } from "../follow/follow.schema";

export function ProfilePage({ onBack }: { onBack: () => void }) {
  const { data, isLoading, isError } = useQuery({ queryKey: ["profile", "sofia.park"], queryFn: () => getPublicProfile("sofia.park"), staleTime: 30_000 });
  const storedStatus = useFollowStore((state) => state.statusByProfile[data?.id ?? ""]);
  const setStatus = useFollowStore((state) => state.setStatus);
  const setPending = useFollowStore((state) => state.setPending);
  const isPending = useFollowStore((state) => state.pendingProfiles.includes(data?.id ?? ""));
  const [followers, setFollowers] = useState(0);

  useEffect(() => { if (data) setFollowers(data.followerCount); }, [data]);
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
        <button type="button" className="profile-header-button" aria-label="More profile options"><MoreHorizontal size={22} /></button>
      </header>
      <section className="profile-scroll">
        <div className="profile-identity">
          <div className="profile-avatar-ring"><img src={data.avatarUrl} alt="" /></div>
          <h1>{data.displayName}</h1>
          <p className="profile-username">@{data.username}</p>
          {data.country && <p className="profile-country">{data.country}</p>}
          <p className="profile-bio">{data.bio}</p>
          <div className="profile-stats" aria-label="Profile statistics"><Stat value={data.postCount} label="Posts" /><Stat value={followers} label="Followers" /><Stat value={data.followingCount} label="Following" /></div>
          <button type="button" className="profile-follow-placeholder" disabled={isPending} onClick={handleFollow} aria-busy={isPending}>{isFollowing ? "Following" : isRequested ? "Requested" : "Follow"}</button>
        </div>
        <div className="profile-grid-header"><Grid3X3 size={18} /><span>Posts</span></div>
        <div className="profile-grid" aria-label={`${data.displayName}'s posts`}>
          {data.posts.map((post) => <button key={post.id} type="button" className="profile-grid-item" aria-label={`Open post: ${post.caption}`}><img src={post.mediaUrl} alt="" loading="lazy" /></button>)}
        </div>
      </section>
      <nav className="bottom-nav profile-bottom-nav" aria-label="Primary navigation">
        <button type="button" className="nav-item" aria-label="Home" onClick={onBack}><span>⌂</span><small>Home</small></button>
        <button type="button" className="nav-item" aria-label="Alerts"><span>◌</span><small>Alerts</small></button>
        <button type="button" className="create-button" aria-label="Create"><span>+</span></button>
        <button type="button" className="nav-item" aria-label="Messages"><span>◍</span><small>Messages</small></button>
        <button type="button" className="nav-item active" aria-label="Profile"><span><UserRound size={21} /></span><small>Profile</small></button>
      </nav>
    </main>
  );
}
function Stat({ value, label }: { value: number; label: string }) { return <div><strong>{formatCount(value)}</strong><span>{label}</span></div>; }
function formatCount(value: number) { return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value); }
function ProfileShell({ children }: { children: React.ReactNode }) { return <main className="profile-shell"><header className="profile-header"><span className="profile-header-name">Profile</span></header><section className="profile-scroll">{children}</section></main>; }
function ProfileSkeleton() { return <div className="profile-skeleton"><div className="profile-skeleton-avatar" /><div className="profile-skeleton-line wide" /><div className="profile-skeleton-line" /><div className="profile-skeleton-grid">{Array.from({ length: 6 }).map((_, index) => <div key={index} />)}</div></div>; }
