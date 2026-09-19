import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);
  try {
    const input = await req.json();
    const username = typeof input.username === "string" ? input.username.trim().toLowerCase() : "";
    const password = typeof input.password === "string" ? input.password : "";
    const confirmPassword = typeof input.confirmPassword === "string" ? input.confirmPassword : "";
    const displayName = typeof input.displayName === "string" ? input.displayName.trim() : "";
    const country = typeof input.country === "string" ? input.country.trim().toUpperCase() : "";
    const age = typeof input.age === "number" ? input.age : undefined;
    if (!/^[a-z0-9_.]{3,30}$/.test(username) || password.length < 6 || password.length > 72 || password !== confirmPassword || !displayName || displayName.length > 80) return json({ error: "Invalid signup details." }, 400);
    if (age !== undefined && (!Number.isInteger(age) || age < 13 || age > 120)) return json({ error: "Invalid age." }, 400);
    if (country && !/^[A-Z]{2}$/.test(country)) return json({ error: "Invalid country." }, 400);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } });
    const existing = await admin.schema("yunikov_v1").from("profiles").select("id").eq("username", username).maybeSingle();
    if (existing.error) return json({ error: "Unable to create account." }, 500);
    if (existing.data) return json({ error: "Username is already taken." }, 409);
    const internalEmail = username + "@accounts.yuniko.app";
    const created = await admin.auth.admin.createUser({ email: internalEmail, password, email_confirm: true, user_metadata: { username, display_name: displayName, country, age } });
    if (created.error || !created.user) return json({ error: created.error?.message ?? "Unable to create account." }, 400);
    const tokenResponse = await fetch(Deno.env.get("SUPABASE_URL") + "/auth/v1/token?grant_type=password", { method: "POST", headers: { "Content-Type": "application/json", apikey: Deno.env.get("SUPABASE_ANON_KEY")! }, body: JSON.stringify({ email: internalEmail, password }) });
    const payload = await tokenResponse.json();
    if (!tokenResponse.ok) { await admin.auth.admin.deleteUser(created.user.id); return json({ error: "Account created but sign-in could not be completed." }, 500); }
    return json({ user: created.user, session: payload });
  } catch { return json({ error: "Unable to create your account." }, 500); }
});