import { Bell, Heart, MessageCircle, Bookmark, Share2, UserPlus, CheckCheck, ArrowLeft } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotifications, markAllNotificationsRead, markNotificationRead, notificationTypeLabel, subscribeToNotifications } from "./notifications.service";
import { useEffect } from "react";

const icons = { like: Heart, comment: MessageCircle, reply: MessageCircle, save: Bookmark, share: Share2, follow: UserPlus, follow_request: UserPlus, message: MessageCircle };

export function NotificationsPage({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["notifications"], queryFn: getNotifications });
  const unread = data.filter((item) => !item.read).length;
  useEffect(() => subscribeToNotifications(() => { void queryClient.invalidateQueries({ queryKey: ["notifications"] }); }), [queryClient]);
  const markRead = async (id: string) => { await markNotificationRead(id); await queryClient.invalidateQueries({ queryKey: ["notifications"] }); };
  const markAll = async () => { await markAllNotificationsRead(); await queryClient.invalidateQueries({ queryKey: ["notifications"] }); };

  return <main className="feed-shell notifications-shell min-h-screen bg-[#0d0b14]">
    <header className="absolute inset-x-0 top-0 z-50 h-14 flex items-center justify-between px-3 min-[360px]:px-4 glass border-b border-pink-400/10">
      <button type="button" aria-label="Back" onClick={onBack}><ArrowLeft size={20} className="text-white/75" /></button>
      <strong className="text-lg font-bold">Notifications</strong>
      <button type="button" aria-label="Mark all as read" onClick={markAll} disabled={!unread}><CheckCheck size={20} className={unread ? "text-pink-400" : "text-white/25"} /></button>
    </header>
    <section className="absolute inset-x-0 top-14 bottom-0 overflow-y-auto px-4 pt-3" aria-label="Notifications">
      {isLoading && <div className="feed-state">Loading notifications…</div>}
      {!isLoading && data.length === 0 && <div className="feed-state"><Bell size={28} /><span>No notifications yet.</span></div>}
      {!isLoading && data.map((item) => {
        const Icon = icons[item.type];
        return <button type="button" key={item.id} className="w-full flex items-center gap-3 py-4 border-b border-white/5 text-left" onClick={() => void markRead(item.id)}>
          <div className="relative shrink-0"><img src={item.actorAvatarUrl} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-pink-500/60" /><span className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full flex items-center justify-center bg-[#120e1e] border border-pink-400/30 text-pink-400"><Icon size={11}/></span></div>
          <p className="text-sm text-white/80 flex-1"><b>@{item.actorUsername}</b> {item.message}<span className="block text-xs text-white/40 mt-1">{notificationTypeLabel(item.type)} · {new Date(item.createdAt).toLocaleString()}</span></p>
          {!item.read && <span className="w-2 h-2 rounded-full bg-pink-400 shrink-0" aria-label="Unread" />}
        </button>;
      })}
    </section>
  </main>;
}
