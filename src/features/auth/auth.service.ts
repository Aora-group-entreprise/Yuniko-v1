import { requireSupabase } from "../../lib/supabase";
import { resetPasswordInputSchema, signInInputSchema, signUpInputSchema, type ResetPasswordInput, type SignInInput, type SignUpInput } from "./auth.schema";
import { recordLoginEvent } from "../security/security.service";

const functionUrl = (name: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;

export async function signIn(input: SignInInput) {
  const parsed = signInInputSchema.parse(input);
  const client = requireSupabase();
  const identifier = parsed.identifier.trim();

  if (identifier.includes("@")) {
    const { data, error } = await client.auth.signInWithPassword({ email: identifier, password: parsed.password });
    if (error) throw error;
    await recordLoginEvent(true, typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 180) : "This device");
    return data;
  }

  const response = await fetch(functionUrl("sign-in-by-username"), {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
    body: JSON.stringify({ username: identifier, password: parsed.password }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Invalid username or password.");

  const { data, error } = await client.auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  });
  if (error) throw error;
  await recordLoginEvent(true, typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 180) : "This device");
  return data;
}

export async function signUp(input: SignUpInput) {
  const parsed = signUpInputSchema.parse(input);
  if (parsed.password !== parsed.confirmPassword) throw new Error("Passwords do not match.");
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: parsed.email,
    password: parsed.password,
    options: {
      data: {
        username: parsed.username.toLowerCase(),
        display_name: parsed.displayName,
        country: parsed.country ?? "",
        age: parsed.age,
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function resetPassword(input: ResetPasswordInput) {
  const parsed = resetPasswordInputSchema.parse(input);
  const client = requireSupabase();
  const identifier = parsed.identifier.trim();
  let email = identifier;

  if (!identifier.includes("@")) {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/request-password-reset-by-username`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
      body: JSON.stringify({ username: identifier }),
    });
    if (!response.ok) throw new Error("Unable to start password reset.");
    return;
  }

  if (!email) return;
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/auth/reset" });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  const { error } = await requireSupabase().auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  return requireSupabase().auth.getSession();
}