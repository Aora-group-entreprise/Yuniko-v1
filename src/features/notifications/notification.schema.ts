import { z } from "zod";

export const notificationTypeSchema = z.enum(["like", "comment", "reply", "save", "share", "follow", "follow_request", "message"]);

export const notificationSchema = z.object({
  id: z.string(),
  type: notificationTypeSchema,
  actorId: z.string(),
  actorName: z.string(),
  actorUsername: z.string(),
  actorAvatarUrl: z.string().url().or(z.literal("")),
  postId: z.string().optional(),
  conversationId: z.string().optional(),
  count: z.number().int().positive(),
  message: z.string(),
  createdAt: z.string(),
  read: z.boolean(),
});

export const notificationsStateSchema = z.object({ items: z.array(notificationSchema) });

export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type NotificationsState = z.infer<typeof notificationsStateSchema>;
