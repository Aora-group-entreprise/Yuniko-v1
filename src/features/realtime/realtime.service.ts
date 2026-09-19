import { requireSupabase } from "../../lib/supabase";
import { queryClient } from "../../lib/query-client";

type RealtimeScope = "feed" | "notifications" | "stories" | "interactions" | `conversation:${string}`;

const activeCleanups = new Set<() => void>();
const recentEventIds: string[] = [];
const recentEventSet = new Set<string>();

function rememberEvent(id: string): boolean {
  if (recentEventSet.has(id)) return false;
  recentEventSet.add(id);
  recentEventIds.push(id);
  if (recentEventIds.length > 256) {
    const oldest = recentEventIds.shift();
    if (oldest) recentEventSet.delete(oldest);
  }
  return true;
}

function invalidate(scope: RealtimeScope, kind: string): void {
  if (scope === "feed") {
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
    void queryClient.invalidateQueries({ queryKey: ["posts"] });
  } else if (scope === "notifications") {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    void queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
  } else if (scope === "stories") {
    void queryClient.invalidateQueries({ queryKey: ["stories"] });
  } else if (scope.startsWith("conversation:")) {
    const id = scope.slice("conversation:".length);
    void queryClient.invalidateQueries({ queryKey: ["conversation", id] });
    void queryClient.invalidateQueries({ queryKey: ["messages", id] });
    void queryClient.invalidateQueries({ queryKey: ["conversations"] });
  } else if (kind === "likes" || kind === "comments" || kind === "saves" || kind === "shares" || kind === "follows" || kind === "blocks") {
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
    void queryClient.invalidateQueries({ queryKey: ["posts"] });
    void queryClient.invalidateQueries({ queryKey: ["recommendations"] });
  }
}

function addChannel(name: string, setup: (channel: ReturnType<ReturnType<typeof requireSupabase>["channel"]>) => void): () => void {
  const client = requireSupabase();
  const channel = client.channel(name);
  setup(channel);
  let active = true;
  void channel.subscribe((status) => {
    if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && active) {
      setTimeout(() => { if (active) void channel.subscribe(); }, 1500);
    }
  });
  const cleanup = () => { active = false; void client.removeChannel(channel); activeCleanups.delete(cleanup); };
  activeCleanups.add(cleanup);
  return cleanup;
}

export function subscribeToRealtime(): () => void {
  const cleanups: (() => void)[] = [];
  cleanups.push(addChannel("feed:global", channel => {
    channel.on("postgres_changes",{event:"*",schema:"yunikov_v1",table:"posts"},payload => {
      const id = String(payload.new?.id ?? payload.old?.id ?? crypto.randomUUID());
      if (rememberEvent(id)) invalidate("feed","post");
    });
  }));
  cleanups.push(addChannel("interactions:global", channel => {
    for (const table of ["likes","comments","saves","shares","follows","blocks"]) {
      channel.on("postgres_changes",{event:"*",schema:"yunikov_v1",table},payload => {
        const id = String(payload.new?.id ?? payload.old?.id ?? crypto.randomUUID()) + ":" + table;
        if (rememberEvent(id)) invalidate("interactions",table);
      });
    }
  }));
  cleanups.push(addChannel("stories:global", channel => {
    channel.on("postgres_changes",{event:"*",schema:"yunikov_v1",table:"stories"},payload => {
      const id = String(payload.new?.id ?? payload.old?.id ?? crypto.randomUUID());
      if (rememberEvent(id)) invalidate("stories","story");
    });
  }));
  const stopUser = () => {
    for (const cleanup of [...cleanups]) cleanup();
  };
  return stopUser;
}

export function subscribeToTable(table:string,filter:string|undefined,listener:()=>void) {
  const channel=requireSupabase().channel(`realtime:${table}:${crypto.randomUUID()}`).on("postgres_changes",{event:"*",schema:"yunikov_v1",table,...(filter?{filter}:{})},listener);
  void channel.subscribe();
  return () => { void requireSupabase().removeChannel(channel); };
}

export function subscribeToFeed(listener:()=>void) {
  return subscribeToTable("posts",undefined,listener);
}
