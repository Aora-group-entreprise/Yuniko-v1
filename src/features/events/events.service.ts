import { z } from "zod";
import { requireSupabase, requireYunikoDb } from "../../lib/supabase";
import { eventLogSchema, type EventType, type InteractionEvent } from "./event.schema";

export async function recordInteraction(type: EventType, postId: string, targetId?: string, metadata?: Record<string,string>): Promise<InteractionEvent> {
  const { data: { user }, error: authError } = await requireSupabase().auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("Authentication required.");
  const { data: profile } = await requireYunikoDb().from("profiles").select("country_code").eq("id",user.id).maybeSingle();
  const { data, error } = await requireYunikoDb().from("events").insert({ user_id:user.id, post_id:postId, type, weight:1, country_code:profile?.country_code ?? null, metadata:{...(metadata??{}), ...(targetId ? {target_id:targetId}: {})} }).select("id,user_id,post_id,type,weight,country_code,created_at,metadata").single();
  if(error) throw error;
  return { id:data.id, type:data.type, postId:data.post_id ?? postId, actorId:data.user_id ?? user.id, ...(targetId ? {targetId}:{}), createdAt:data.created_at, metadata:{ countryCode:data.country_code ?? "", ...((data.metadata as Record<string,string>) ?? {}) } };
}

export async function getInteractionEvents(postId?: string): Promise<InteractionEvent[]> {
  const { data: { user }, error: authError } = await requireSupabase().auth.getUser();
  if(authError) throw authError; if(!user) throw new Error("Authentication required.");
  let query=requireYunikoDb().from("events").select("id,user_id,post_id,type,weight,country_code,created_at,metadata").eq("user_id",user.id).order("created_at",{ascending:false}).limit(500);
  if(postId) query=query.eq("post_id",postId);
  const {data,error}=await query; if(error) throw error;
  return (data??[]).map(row=>({id:row.id,type:row.type,postId:row.post_id ?? "",actorId:row.user_id ?? user.id,createdAt:row.created_at,metadata:{countryCode:row.country_code ?? "",...((row.metadata as Record<string,string>)??{})}}));
}
