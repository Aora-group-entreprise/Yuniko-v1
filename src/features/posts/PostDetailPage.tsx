import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { PostCard } from "../feed/components/PostCard";
import { getPostById } from "./post-read.service";

export function PostDetailPage({ postId, onBack }: { postId: string; onBack: () => void }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => getPostById(postId),
    staleTime: 30_000,
  });

  return (
    <main className="profile-shell">
      <header className="profile-header">
        <button type="button" className="profile-header-button" aria-label="Back" onClick={onBack}><ArrowLeft size={21} /></button>
        <span className="profile-header-name">Post</span>
        <span aria-hidden="true" style={{ width: 34, height: 34 }} />
      </header>
      <section className="post-detail-scroll">
        {isLoading && <div className="profile-state">Loading post…</div>}
        {isError && <div className="profile-state">Unable to load this post.</div>}
        {data && <div className="post-detail-card"><PostCard post={data} /></div>}
      </section>
    </main>
  );
}
