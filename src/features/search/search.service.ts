import { requireYunikoDb } from "../../lib/supabase";
export type SearchResult={profiles:Array<{id:string;username:string;displayName:string;avatarUrl:string}>;posts:Array<{id:string;authorId:string;caption:string;createdAt:string}>};
export async function searchYuniko(query:string,limit=20):Promise<SearchResult>{const q=query.trim();if(!q)return{profiles:[],posts:[]};const db=requireYunikoDb();const [p,posts]=await Promise.all([
 db.from("profiles").select("id,username,display_name,avatar_url").or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).limit(limit),
 db.from("posts").select("id,author_id,caption,created_at").eq("status","ready").is("deleted_at",null).ilike("caption",`%${q}%`).order("created_at",{ascending:false}).limit(limit)
]);if(p.error)throw p.error;if(posts.error)throw posts.error;return{profiles:(p.data??[]).map(x=>({id:x.id,username:x.username,displayName:x.display_name,avatarUrl:x.avatar_url??""})),posts:(posts.data??[]).map(x=>({id:x.id,authorId:x.author_id,caption:x.caption??"",createdAt:x.created_at}))};}
