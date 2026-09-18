import { Bell, Heart, MessageCircle, Bookmark, Share2, UserPlus, CheckCheck } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotifications, markAllNotificationsRead, markNotificationRead, notificationTypeLabel, subscribeToNotifications } from "./notifications.service";
import { useEffect } from "react";

const icons = { like: Heart, comment: MessageCircle, reply: MessageCircle, save: Bookmark, share: Share2, follow: UserPlus, follow_request: UserPlus, message: MessageCircle };

export function NotificationsPage({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["notifications"], queryFn: getNotifications });
  const unread = data.filter((item) => !item.read).length;

  useEffect(() => {
    return subscribeToNotifications(() => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
  }, [queryClient]);

  const markRead = async (id: string) => {
    await markNotificationRead(id);
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAll = async () => {
    await markAllNotificationsRead();
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <main className="feed-shell">
      <header className="feed-header">
        <button type="button" className="yuniko-wordmark" onClick={onBack}>Yuniko</button>
        <strong>Notifications</strong>
        <button type="button" aria-label="Mark all as read" onClick={markAll} disabled={!unread}><CheckCheck size={20} /></button>
      </header>
      <section className="notification-list" aria-label="Notifications">
        {isLoading && <div className="feed-state">Loading notifications…</div>}
        {!isLoading && data.length === 0 && <div className="feed-state"><Bell size={28} /><span>No notifications yet.</span></div>}
        {data.map((item) => {
          const Icon = icons[item.type];
          return <button type="button" key={item.id} className={`notification-item ${item.read ? "" : "unread"}`} onClick={() => markRead(item.id)}>
            <img src={item.actorAvatarUrl} alt="" className="notification-avatar" />
            <span className="notification-icon"><Icon size={14} /></span>
            <span className="notification-copy"><strong>@{item.actorUsername}</strong> {item.message}<small>{notificationTypeLabel(item.type)} · {new Date(item.createdAt).toLocaleString()}</small></span>
            {!item.read && <span className="notification-dot" aria-label="Unread" />}
          </button>;
        })}
      </section>
    </main>
  );
}
