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

    if (!/^[a-z0-9_.]{3,30}$/.test(username)) return json({ error: "Username must be 3-30 characters and use only letters, numbers, underscores, or dots." }, 400);
    if (password.length < 6 || password.length > 72) return json({ error: "Password must be between 6 and 72 characters." }, 400);
    if (password !== confirmPassword) return json({ error: "Passwords do not match." }, 400);
    if (!displayName || displayName.length > 80) return json({ error: "Display name is required and must be 80 characters or fewer." }, 400);
    if (age !== undefined && (!Number.isInteger(age) || age < 13 || age > 120)) return json({ error: "Invalid age." }, 400);
    if (country && !/^[A-Z]{2}$/.test(country)) return json({ error: "Invalid country." }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceRoleKey || !anonKey) return json({ error: "Signup service is not configured." }, 500);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const existing = await admin.schema("yunikov_v1").from("profiles").select("id").eq("username", username).maybeSingle();
    if (existing.error) return json({ error: "Unable to check username availability." }, 500);
    if (existing.data) return json({ error: "Username is already taken." }, 409);

    const internalEmail = username + "@accounts.yuniko.app";
    const created = await admin.auth.admin.createUser({ email: internalEmail, password, email_confirm: true, user_metadata: { username, display_name: displayName, country, age } });

    if (created.error || !created.user) {
      const code = created.error?.code ?? "";
      const message = created.error?.message ?? "";
      if (code === "email_exists" || /already.*registered|already.*exists/i.test(message)) return json({ error: "Username is already taken." }, 409);
      if (/password/i.test(message)) return json({ error: "The password does not meet the account requirements." }, 400);
      return json({ error: "The account could not be created. Please try another username." }, 400);
    }

    const tokenResponse = await fetch(supabaseUrl + "/auth/v1/token?grant_type=password", { method: "POST", headers: { "Content-Type": "application/json", apikey: anonKey }, body: JSON.stringify({ email: internalEmail, password }) });
    const payload = await tokenResponse.json();
    if (!tokenResponse.ok) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: "Account created, but automatic sign-in failed. Please sign in again." }, 500);
    }

    return json({ user: created.user, session: payload });
  } catch {
    return json({ error: "The account could not be created. Please check your details and try again." }, 500);
  }
});