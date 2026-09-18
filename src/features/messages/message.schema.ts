import { z } from "zod";

export const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  body: z.string().min(1).max(4000),
  createdAt: z.string().datetime(),
});

export const conversationSchema = z.object({
  id: z.string(),
  participantId: z.string(),
  participantName: z.string().min(1),
  participantUsername: z.string().min(1),
  participantAvatarUrl: z.string(),
  updatedAt: z.string().datetime(),
  lastMessagePreview: z.string(),
  unreadCount: z.number().int().nonnegative(),
});

export const messageLogSchema = z.array(messageSchema);
export const conversationListSchema = z.array(conversationSchema);

export type Message = z.infer<typeof messageSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
