import { z } from "zod";

export const authIdentifierSchema = z.string().trim().min(3).max(254);
export const usernameSchema = z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_.]+$/);
export const passwordSchema = z.string().min(6).max(72);
export const signInInputSchema = z.object({ identifier: authIdentifierSchema, password: passwordSchema });
export const signUpInputSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  displayName: z.string().trim().min(1).max(80),
  country: z.string().trim().regex(/^[A-Za-z]{2}$/).optional(),
  age: z.number().int().min(13).max(120).optional(),
});
export const resetPasswordInputSchema = z.object({ identifier: z.string().trim().min(3).max(254) });
export type SignInInput = z.infer<typeof signInInputSchema>;
export type SignUpInput = z.infer<typeof signUpInputSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
