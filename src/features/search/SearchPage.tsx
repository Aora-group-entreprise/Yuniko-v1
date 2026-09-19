import { Search, ArrowLeft, UserRound, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { searchYuniko } from "./search.service";

export function SearchPage({ onBack, onOpenPost, onOpenProfile }: { onBack: () => void; onOpenPost: (postId: string) => void; onOpenProfile: (profileId: string) => void }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => searchYuniko(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    staleTime: 10_000,
  });
  const profiles = data?.profiles ?? [];
  const posts = data?.posts ?? [];

  return <main className="feed-shell yunikov1-page">
    <header className="feed-header">
      <button type="button" aria-label="Back" onClick={onBack}><ArrowLeft size={20} /></button>
      <strong>Search</strong>
      <span />
    </header>
    <section className="search-page yunikov1-search">
      <label className="search-box"><Search size={18} /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search people or posts" /></label>
      {!query.trim() && <div className="feed-state"><Search size={28} /><span>Search Yuniko</span></div>}
      {isFetching && <div className="feed-state">Searching…</div>}
      {!!profiles.length && <section><h2>People</h2><div className="search-profiles">{profiles.map(profile =>
        <button type="button" className="search-profile" key={profile.id} onClick={() => onOpenProfile(profile.id)}>
          <img src={profile.avatarUrl} alt="" /><span><strong>{profile.displayName}</strong><small>@{profile.username}</small></span><UserRound size={17} />
        </button>)}</div></section>}
      {!!posts.length && <section><h2>Posts</h2><div className="search-posts">{posts.map(post =>
        <button type="button" key={post.id} className="search-post" onClick={() => onOpenPost(post.id)}>
          <FileText size={18} /><span><strong>Post</strong><small>{post.caption || "Publication sans texte"}</small></span>
        </button>)}</div></section>}
      {debouncedQuery && !isFetching && !profiles.length && !posts.length && <div className="feed-state">No results found.</div>}
    </section>
  </main>;
}
