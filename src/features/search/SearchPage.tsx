import { Search, ArrowLeft, UserRound, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { searchYuniko } from "./search.service";

export function SearchPage({ onBack, onOpenPost, onOpenProfile }: { onBack: () => void; onOpenPost: (postId: string) => void; onOpenProfile: (profileId: string) => void }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250); return () => window.clearTimeout(timer); }, [query]);
  const { data, isFetching } = useQuery({ queryKey: ["search", debouncedQuery], queryFn: () => searchYuniko(debouncedQuery), enabled: debouncedQuery.length > 0, staleTime: 10_000 });
  const profiles = data?.profiles ?? [];
  const posts = data?.posts ?? [];

  return <main className="feed-shell yunikov1-page min-h-screen bg-[#0d0b14]">
    <header className="absolute inset-x-0 top-0 z-50 h-14 flex items-center justify-between px-3 min-[360px]:px-4 glass border-b border-pink-400/10">
      <button type="button" aria-label="Back" onClick={onBack}><ArrowLeft size={20} className="text-white/75" /></button>
      <strong className="text-lg font-bold">Search</strong><span className="w-5"/>
    </header>
    <section className="absolute inset-x-0 top-14 bottom-0 overflow-y-auto px-4 py-3">
      <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-white/[.06] border border-white/[.08] mb-5">
        <Search size={16} className="text-white/40"/><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search people and tags" className="flex-1 bg-transparent text-white/80 text-sm outline-none placeholder:text-white/30"/>
      </label>
      {!query.trim() && <div className="flex flex-col items-center justify-center py-24 px-6 text-center text-white/45"><div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-pink-500/10 border border-pink-500/20 text-pink-400"><Search size={28}/></div><h2 className="font-bold text-lg mb-2 text-white">Search Yuniko</h2><p className="text-white/45 text-sm">Find people and posts from the world feed.</p></div>}
      {isFetching && <div className="feed-state">Searching…</div>}
      {!!profiles.length && <section><p className="text-white/40 text-xs uppercase tracking-wider mb-3">People</p>{profiles.map(profile => <button type="button" className="w-full flex items-center gap-3 py-3 text-left" key={profile.id} onClick={() => onOpenProfile(profile.id)}><img src={profile.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-pink-500/60"/><span className="flex-1"><strong className="block text-sm">{profile.displayName}</strong><small className="text-white/45 text-xs">@{profile.username}</small></span><UserRound size={17} className="text-white/25"/></button>)}</section>}
      {!!posts.length && <section className="mt-5"><p className="text-white/40 text-xs uppercase tracking-wider mb-3">Posts and tags</p><div className="grid grid-cols-3 gap-1">{posts.map(post => <button type="button" key={post.id} className="aspect-square overflow-hidden rounded-lg bg-white/5 text-left" onClick={() => onOpenPost(post.id)}><div className="w-full h-full flex items-center justify-center p-3"><FileText size={18} className="text-pink-400"/><span className="sr-only">{post.caption || "Post"}</span></div></button>)}</div></section>}
      {debouncedQuery && !isFetching && !profiles.length && !posts.length && <div className="flex flex-col items-center justify-center py-24 px-6 text-center"><div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-pink-500/10 border border-pink-500/20 text-pink-400"><Search size={28}/></div><h2 className="font-bold text-lg mb-2">No results</h2><p className="text-white/45 text-sm">Nothing matched “{query}”.</p></div>}
    </section>
  </main>;
}
