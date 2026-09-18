import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ok = () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  try {
    const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { username } = await req.json();
    if (typeof username !== "string" || username.trim().length < 3) return ok();

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const db = admin.schema("yunikov_v1");

    const { data: limit } = await db.from("auth_rate_limits")
      .select("failures,window_started_at,locked_until").eq("ip", ip).maybeSingle();
    const now = new Date();
    if (limit?.locked_until && new Date(limit.locked_until) > now) return ok();

    const { data: profile } = await db.from("profiles")
      .select("id").eq("username", username.trim().toLowerCase()).maybeSingle();

    if (profile) {
      const { data: userData } = await admin.auth.admin.getUserById(profile.id);
      const email = userData.user?.email;
      if (email) {
        await fetch(Deno.env.get("SUPABASE_URL") + "/auth/v1/recover", {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
          body: JSON.stringify({ email, gotrue_meta_security: {} }),
        });
      }
    }

    const failures = (limit?.failures ?? 0) + 1;
    await db.from("auth_rate_limits").upsert({
      ip,
      failures: failures >= 5 ? 0 : failures,
      window_started_at: limit?.window_started_at ?? now.toISOString(),
      locked_until: failures >= 5 ? new Date(now.getTime() + 15 * 60_000).toISOString() : null,
    });
    return ok();
  } catch {
    return ok();
  }
});
