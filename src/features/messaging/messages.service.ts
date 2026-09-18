import { requireSupabase, requireYunikoDb } from "../../lib/supabase";

export type ConversationSummary = { id:string; participantId:string; participantName:string; participantUsername:string; participantAvatarUrl:string; updatedAt:string; lastMessagePreview:string; unreadCount:number };
export type Message = { id:string; conversationId:string; senderId:string; body:string; mediaUrl:string|null; replyToId:string|null; createdAt:string };

async function uid(){const {data:{user},error}=await requireSupabase().auth.getUser();if(error||!user)throw new Error("Authentication required.");return user.id;}

export async function getConversations():Promise<ConversationSummary[]>{
 const userId=await uid(),db=requireYunikoDb();
 const {data:members,error}=await db.from("conversation_members").select("conversation_id,last_read_message_id").eq("user_id",userId).eq("is_archived",false);
 if(error)throw error;if(!members?.length)return [];
 const ids=members.map(x=>x.conversation_id);
 const {data:convos,error:ce}=await db.from("conversations").select("id,last_message_at").in("id",ids).order("last_message_at",{ascending:false,nullsFirst:false});if(ce)throw ce;
 const result:ConversationSummary[]=[];
 for(const c of convos??[]){
  const member=members.find(m=>m.conversation_id===c.id);const {data:other,error:oe}=await db.from("conversation_members").select("user_id").eq("conversation_id",c.id).neq("user_id",userId).limit(1).maybeSingle();if(oe)throw oe;if(!other)continue;
  const {data:p,error:pe}=await db.from("profiles").select("id,display_name,username,avatar_url").eq("id",other.user_id).maybeSingle();if(pe)throw pe;if(!p)continue;
  const {data:last,error:le}=await db.from("messages").select("body,created_at").eq("conversation_id",c.id).is("deleted_at",null).order("created_at",{ascending:false}).limit(1).maybeSingle();if(le)throw le;
  const unread=member?.last_read_message_id?0:(last?1:0);
  result.push({id:c.id,participantId:p.id,participantName:p.display_name,participantUsername:p.username,participantAvatarUrl:p.avatar_url??"",updatedAt:last?.created_at??c.last_message_at??c.created_at,lastMessagePreview:last?.body??"",unreadCount:unread});
 } return result;
}
export async function getConversationMessages(conversationId:string):Promise<Message[]>{
 const userId=await uid(),db=requireYunikoDb();const {data:member,error:me}=await db.from("conversation_members").select("conversation_id").eq("conversation_id",conversationId).eq("user_id",userId).maybeSingle();if(me)throw me;if(!member)throw new Error("Conversation access denied.");
 const {data,error}=await db.from("messages").select("id,conversation_id,sender_id,body,media_url,reply_to_id,created_at").eq("conversation_id",conversationId).is("deleted_at",null).order("created_at",{ascending:true});if(error)throw error;
 return (data??[]).map(m=>({id:m.id,conversationId:m.conversation_id,senderId:m.sender_id,body:m.body??"",mediaUrl:m.media_url,replyToId:m.reply_to_id,createdAt:m.created_at}));
}
export async function sendMessage(conversationId:string,body:string){const userId=await uid(),text=body.trim().slice(0,4000);if(!text)return null;const db=requireYunikoDb();const {data:member}=await db.from("conversation_members").select("conversation_id").eq("conversation_id",conversationId).eq("user_id",userId).maybeSingle();if(!member)throw new Error("Conversation access denied.");const {data,error}=await db.from("messages").insert({conversation_id:conversationId,sender_id:userId,body:text}).select("id,conversation_id,sender_id,body,media_url,reply_to_id,created_at").single();if(error)throw error;return data;}
export async function markConversationRead(conversationId:string,messageId:string|null){const userId=await uid();const {error}=await requireYunikoDb().from("conversation_members").update({last_read_message_id:messageId}).eq("conversation_id",conversationId).eq("user_id",userId);if(error)throw error;}
export function subscribeToConversation(conversationId:string,listener:()=>void){const c=requireSupabase().channel("conversation:"+conversationId).on("postgres_changes",{event:"*",schema:"yunikov_v1",table:"messages",filter:"conversation_id=eq."+conversationId},listener);void c.subscribe();return()=>{void requireSupabase().removeChannel(c)};}
