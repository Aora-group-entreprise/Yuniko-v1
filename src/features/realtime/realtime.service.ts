import { requireSupabase } from "../../lib/supabase";

let channelCounter = 0;
function channelName(table: string): string {
  channelCounter += 1;
  return `realtime:${table}:${channelCounter}`;
}

export function subscribeToTable(table: string, filter: string | undefined, listener: () => void) {
  const channel = requireSupabase().channel(channelName(table)).on("postgres_changes", {
    event: "*", schema: "yunikov_v1", table, ...(filter ? { filter } : {}),
  }, listener);
  void channel.subscribe();
  return () => { void requireSupabase().removeChannel(channel); };
}

export function subscribeToFeed(listener: () => void) {
  return subscribeToTable("posts", undefined, listener);
}
