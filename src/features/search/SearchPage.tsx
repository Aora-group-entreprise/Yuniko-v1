import { Search, ArrowLeft, UserRound, Image as ImageIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { searchYuniko } from "./search.service";

export function SearchPage({ onBack, onOpenPost, onOpenProfile }: { onBack: () => void; onOpenPost: (postId: string) => void; onOpenProfile: (profileId: string) => void }) {
  const [query, setQuery] = useState("");
  const { data, isFetching } = useQuery({ queryKey: ["search", query.trim()], queryFn: () => searchYuniko(query), enabled: query.trim().length > 0, staleTime: 10_000 });
  const profiles = data?.profiles ?? [];
  const posts = data?.posts ?? [];

  return (
    <main className="feed-shell">
      <header className="feed-header">
        <button type="button" aria-label="Back" onClick={onBack}><ArrowLeft size={20} /></button>
        <strong>Search</strong>
        <span />
      </header>
      <section className="search-page">
        <label className="search-box"><Search size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people, posts, #hashtags" /></label>
        {!query.trim() && <div className="feed-state"><Search size={28} /><span>Search Yuniko</span></div>}
        {isFetching && <div className="feed-state">Searching…</div>}
        {!!profiles.length && <section><h2>People</h2><div className="search-profiles">{profiles.map((profile) => <button type="button" className="search-profile" key={profile.id} onClick={() => onOpenProfile(profile.id)}><img src={profile.avatarUrl} alt="" /><span><strong>{profile.displayName}</strong><small>@{profile.username}</small></span><UserRound size={17} /></button>)}</div></section>}
        {!!posts.length && <section><h2>Posts</h2><div className="search-posts">{posts.map((post) => <button type="button" key={post.id} className="search-post" onClick={() => onOpenPost(post.id)}><img src={post.mediaUrl} alt="" /><span><strong>@{post.author.username}</strong><small>{post.caption}</small></span><ImageIcon size={16} /></button>)}</div></section>}
        {query.trim() && !isFetching && !profiles.length && !posts.length && <div className="feed-state">No results found.</div>}
      </section>
    </main>
  );
}
