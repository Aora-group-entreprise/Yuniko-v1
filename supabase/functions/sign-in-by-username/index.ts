import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  try {
    const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { username, password } = await req.json();
    if (typeof username !== "string" || typeof password !== "string") return json({ error: "Invalid credentials." }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const now = new Date();
    const { data: limit } = await admin.schema("yunikov_v1").from("auth_rate_limits")
      .select("failures,window_started_at,locked_until").eq("ip", ip).maybeSingle();

    if (limit?.locked_until && new Date(limit.locked_until) > now) return json({ error: "Too many attempts. Try again later." }, 429);

    if (limit?.window_started_at && now.getTime() - new Date(limit.window_started_at).getTime() > 15 * 60_000) {
      await admin.schema("yunikov_v1").from("auth_rate_limits").upsert({ ip, failures: 0, window_started_at: now.toISOString(), locked_until: null });
    }

    const { data: profile } = await admin.schema("yunikov_v1").from("profiles")
      .select("id").eq("username", username.trim().toLowerCase()).maybeSingle();

    if (!profile) return json({ error: "Invalid username or password." }, 401);

    const { data: userData } = await admin.auth.admin.getUserById(profile.id);
    const email = userData.user?.email;
    if (!email) return json({ error: "Invalid username or password." }, 401);

    const tokenResponse = await fetch(Deno.env.get("SUPABASE_URL") + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
      body: JSON.stringify({ email, password }),
    });
    const payload = await tokenResponse.json();

    if (!tokenResponse.ok) {
      const failures = (limit?.failures ?? 0) + 1;
      const lockedUntil = failures >= 5 ? new Date(now.getTime() + 15 * 60_000).toISOString() : null;
      await admin.schema("yunikov_v1").from("auth_rate_limits").upsert({
        ip,
        failures,
        window_started_at: limit?.window_started_at ?? now.toISOString(),
        locked_until: lockedUntil,
      });
      return json({ error: "Invalid username or password." }, 401);
    }

    await admin.schema("yunikov_v1").from("auth_rate_limits").upsert({
      ip, failures: 0, window_started_at: now.toISOString(), locked_until: null,
    });

    return json(payload, tokenResponse.status);
  } catch {
    return json({ error: "Invalid credentials." }, 401);
  }
});
