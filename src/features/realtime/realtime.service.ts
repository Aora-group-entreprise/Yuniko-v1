import { requireSupabase } from "../../lib/supabase";
export function subscribeToTable(table:string,filter:string|undefined,listener:()=>void){const channel=requireSupabase().channel("realtime:"+table+":"+crypto.randomUUID());channel.on("postgres_changes",{event:"*",schema:"yunikov_v1",table,...(filter?{filter}:{})},listener);void channel.subscribe();return()=>{void requireSupabase().removeChannel(channel)};}
export function subscribeToFeed(listener:()=>void){return subscribeToTable("posts",undefined,listener);}
export function subscribeToNotifications(listener:()=>void){return subscribeToTable("notifications",undefined,listener);}
