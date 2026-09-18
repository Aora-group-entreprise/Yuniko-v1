import { requireSupabase } from "../../lib/supabase";
import { resetPasswordInputSchema, signInInputSchema, signUpInputSchema, type ResetPasswordInput, type SignInInput, type SignUpInput } from "./auth.schema";

async function findEmailByUsername(username: string): Promise<string> {
  const client = requireSupabase();
  const { data, error } = await client.from("profiles").select("id").eq("username", username.toLowerCase()).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Invalid username or password.");
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error("Invalid username or password.");
  return userData.user.email ?? "";
}

export async function signIn(input: SignInInput) {
  const parsed = signInInputSchema.parse(input);
  const client = requireSupabase();
  const identifier = parsed.identifier.trim();
  const email = identifier.includes("@") ? identifier : await findEmailByUsername(identifier);
  if (!email) throw new Error("Invalid username or password.");
  const { data, error } = await client.auth.signInWithPassword({ email, password: parsed.password });
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
    const { data, error } = await client.from("profiles").select("id").eq("username", identifier.toLowerCase()).maybeSingle();
    if (error) throw error;
    if (!data) return;
    const { data: userData } = await client.auth.getUser();
    email = userData.user?.email ?? "";
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