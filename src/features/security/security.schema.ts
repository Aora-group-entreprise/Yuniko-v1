import { z } from "zod";

export const sessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  deviceLabel: z.string().min(1),
  createdAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
  current: z.boolean(),
});

export const loginEventSchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: z.string().datetime(),
  deviceLabel: z.string().min(1),
  countryCode: z.string().length(2),
  success: z.boolean(),
});

export const securityStateSchema = z.object({
  userId: z.string(),
  twoFactorEnabled: z.boolean(),
  recoveryCodes: z.array(z.string().min(8)).max(12),
});

export const sessionLogSchema = z.array(sessionSchema);
export const loginEventLogSchema = z.array(loginEventSchema);

export type Session = z.infer<typeof sessionSchema>;
export type LoginEvent = z.infer<typeof loginEventSchema>;
export type SecurityState = z.infer<typeof securityStateSchema>;
