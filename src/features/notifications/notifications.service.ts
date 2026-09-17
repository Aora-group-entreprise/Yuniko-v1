import { notificationsStateSchema, notificationSchema, type Notification, type NotificationType } from "./notification.schema";

const KEY = "yuniko.notifications.v1";
const REFERENCE_MEDIA = "https://raw.githubusercontent.com/Aora-group-entreprise/Yunikov1.0.0/main/artifacts/yuniko-app/public";

const demoNotifications: Notification[] = [
  { id: "n1", type: "like", actorId: "2", actorName: "Noah Reyes", actorUsername: "noah.reyes", actorAvatarUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`, postId: "p1", message: "a aimé votre publication.", createdAt: new Date(Date.now() - 15 * 60_000).toISOString(), read: false },
  { id: "n2", type: "comment", actorId: "3", actorName: "Lina Rose", actorUsername: "lina.rose", actorAvatarUrl: `${REFERENCE_MEDIA}/scene-flower.jpg`, postId: "p1", message: "a commenté votre publication.", createdAt: new Date(Date.now() - 2 * 3_600_000).toISOString(), read: false },
  { id: "n3", type: "follow", actorId: "2", actorName: "Noah Reyes", actorUsername: "noah.reyes", actorAvatarUrl: `${REFERENCE_MEDIA}/scene-dj.jpg`, message: "a commencé à vous suivre.", createdAt: new Date(Date.now() - 24 * 3_600_000).toISOString(), read: true },
];

function read(): Notification[] {
  if (typeof window === "undefined") return demoNotifications;
  try {
    const raw = window.localStorage.getItem(KEY);
    return notificationsStateSchema.parse(raw ? JSON.parse(raw) : { items: demoNotifications }).items;
  } catch { return demoNotifications; }
}

function write(items: Notification[]): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(KEY, JSON.stringify({ items: items.slice(0, 100) })); } catch { /* best effort */ }
}

export async function getNotifications(): Promise<Notification[]> {
  return read().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function getUnreadNotificationCount(): number { return read().filter((item) => !item.read).length; }

export async function markNotificationRead(id: string): Promise<void> {
  write(read().map((item) => item.id === id ? { ...item, read: true } : item));
}

export async function markAllNotificationsRead(): Promise<void> {
  write(read().map((item) => ({ ...item, read: true })));
}

export function addLocalNotification(input: Omit<Notification, "id" | "createdAt" | "read">): void {
  const notification = notificationSchema.parse({ ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString(), read: false });
  write([notification, ...read()]);
}

export function notificationTypeLabel(type: NotificationType): string {
  return ({ like: "J’aime", comment: "Commentaire", reply: "Réponse", save: "Enregistrement", share: "Partage", follow: "Abonnement", follow_request: "Demande" })[type];
}
