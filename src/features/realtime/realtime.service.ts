import { requireSupabase } from "../../lib/supabase";
import { queryClient } from "../../lib/query-client";

type RealtimeScope = "feed" | "notifications" | "stories" | "interactions" | `conversation:${string}`;

type RealtimePayload = {
  new?: { id?: unknown };
  old?: { id?: unknown };
};

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

function payloadId(payload: RealtimePayload): string {
  const id = payload.new?.id ?? payload.old?.id;
  return typeof id === "string" || typeof id === "number" ? String(id) : crypto.randomUUID();
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

function addChannel(
  name: string,
  setup: (channel: ReturnType<ReturnType<typeof requireSupabase>["channel"]>) => void,
): () => void {
  const client = requireSupabase();
  const channel = client.channel(name);
  setup(channel);
  let active = true;
  void channel.subscribe((status) => {
    if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && active) {
      setTimeout(() => { if (active) void channel.subscribe(); }, 1500);
    }
  });
  const cleanup = () => {
    active = false;
    void client.removeChannel(channel);
    activeCleanups.delete(cleanup);
  };
  activeCleanups.add(cleanup);
  return cleanup;
}

export function subscribeToRealtime(): () => void {
  const cleanups: (() => void)[] = [];
  cleanups.push(addChannel("feed:global", channel => {
    channel.on("postgres_changes", { event: "*", schema: "yunikov_v1", table: "posts" }, (payload) => {
      if (rememberEvent(payloadId(payload))) invalidate("feed", "post");
    });
  }));
  cleanups.push(addChannel("interactions:global", channel => {
    for (const table of ["likes", "comments", "saves", "shares", "follows", "blocks"]) {
      channel.on("postgres_changes", { event: "*", schema: "yunikov_v1", table }, (payload) => {
        const id = payloadId(payload) + ":" + table;
        if (rememberEvent(id)) invalidate("interactions", table);
      });
    }
  }));
  cleanups.push(addChannel("stories:global", channel => {
    channel.on("postgres_changes", { event: "*", schema: "yunikov_v1", table: "stories" }, (payload) => {
      if (rememberEvent(payloadId(payload))) invalidate("stories", "story");
    });
  }));
  void requireSupabase().auth.getUser().then(({ data }) => {
    const userId = data.user?.id;
    if (!userId) return;
    const cleanup = addChannel("user:notifications:" + userId, channel => {
      channel.on("postgres_changes", {
        event: "*",
        schema: "yunikov_v1",
        table: "notifications",
        filter: "recipient_id=eq." + userId,
      }, (payload) => {
        if (rememberEvent(payloadId(payload))) invalidate("notifications", "notification");
      });
    });
    cleanups.push(cleanup);
  }).catch(() => undefined);
  return () => {
    for (const cleanup of [...cleanups]) cleanup();
  };
}

export function subscribeToTable(table: string, filter: string | undefined, listener: (payload: RealtimePayload) => void) {
  const client = requireSupabase();
  const channel = client.channel(`realtime:${table}:${crypto.randomUUID()}`).on(
    "postgres_changes",
    { event: "*", schema: "yunikov_v1", table, ...(filter ? { filter } : {}) },
    listener,
  );
  void channel.subscribe();
  return () => { void client.removeChannel(channel); };
}

export function subscribeToFeed(listener: (payload: RealtimePayload) => void) {
  return subscribeToTable("posts", undefined, listener);
}
