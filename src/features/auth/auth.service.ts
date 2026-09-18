import { requireSupabase } from "../../lib/supabase";
import { resetPasswordInputSchema, signInInputSchema, signUpInputSchema, type ResetPasswordInput, type SignInInput, type SignUpInput } from "./auth.schema";

const functionUrl = () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sign-in-by-username`;

export async function signIn(input: SignInInput) {
  const parsed = signInInputSchema.parse(input);
  const client = requireSupabase();
  const identifier = parsed.identifier.trim();

  if (identifier.includes("@")) {
    const { data, error } = await client.auth.signInWithPassword({ email: identifier, password: parsed.password });
    if (error) throw error;
    return data;
  }

  const response = await fetch(functionUrl(), {
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
    const { data, error } = await client.rpc("request_password_reset_by_username", { requested_username: identifier.toLowerCase() });
    if (error) throw error;
    email = data ?? "";
  }

  if (!email) return;
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/auth/reset" });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  return requireSupabase().auth.getSession();
}