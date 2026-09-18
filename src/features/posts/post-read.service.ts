import { z } from "zod";
import { requireSupabase, requireYunikoDb } from "../../lib/supabase";

const postRecordSchema=z.object({
 id:z.string().uuid(),author:z.object({id:z.string().uuid(),username:z.string(),displayName:z.string(),avatarUrl:z.string().url().nullable()}),
 mediaUrl:z.string().url(),caption:z.string(),hashtags:z.array(z.string()),likeCount:z.number().int().nonnegative(),commentCount:z.number().int().nonnegative(),saveCount:z.number().int().nonnegative(),shareCount:z.number().int().nonnegative(),viewCount:z.number().int().nonnegative(),location:z.string().optional(),createdAt:z.string().datetime(),deletedAt:z.string().datetime().nullable().optional()
});
export type PostRecord=z.infer<typeof postRecordSchema>;

async function loadPosts(filter?: {authorId?:string;postId?:string}):Promise<PostRecord[]> {
 const db=requireYunikoDb();
 let query=db.from("posts").select("id,author_id,caption,created_at,deleted_at,like_count,comment_count,save_count,share_count,view_count").eq("status","ready").is("deleted_at",null).order("created_at",{ascending:false}).limit(100);
 if(filter?.authorId) query=query.eq("author_id",filter.authorId);
 if(filter?.postId) query=query.eq("id",filter.postId);
 const {data:posts,error}=await query;if(error)throw error;
 if(!posts?.length)return [];
 const authorIds=[...new Set(posts.map(p=>p.author_id))];
 const postIds=posts.map(p=>p.id);
 const [{data:authors,error:authorError},{data:media,error:mediaError}]=await Promise.all([
  db.from("profiles").select("id,username,display_name,avatar_url").in("id",authorIds),
  db.from("post_media").select("post_id,url,position").in("post_id",postIds).eq("status","ready").order("position",{ascending:true})
 ]);
 if(authorError)throw authorError;if(mediaError)throw mediaError;
 const authorMap=new Map((authors??[]).map(a=>[a.id,a]));const mediaMap=new Map<string,string>();
 for(const item of media??[])if(!mediaMap.has(item.post_id))mediaMap.set(item.post_id,item.url);
 return postRecordSchema.array().parse(posts.map(post=>{const author=authorMap.get(post.author_id);const mediaUrl=mediaMap.get(post.id);if(!author||!mediaUrl)return null;return {id:post.id,author:{id:author.id,username:author.username,displayName:author.display_name,avatarUrl:author.avatar_url},mediaUrl,caption:post.caption??"",hashtags:[],likeCount:post.like_count,commentCount:post.comment_count,saveCount:post.save_count,shareCount:post.share_count,viewCount:post.view_count,createdAt:post.created_at,deletedAt:post.deleted_at};}).filter(Boolean));
}
export async function listPosts(){return loadPosts();}
export async function listPostsByAuthor(authorId:string){return loadPosts({authorId});}
export async function getPostById(postId:string){const parsed=z.string().uuid().safeParse(postId);if(!parsed.success)throw new Error("Post not found");const posts=await loadPosts({postId});if(!posts[0])throw new Error("Post not found");return posts[0];}

export async function updatePostCaption(postId:string,caption:string):Promise<PostRecord>{
 const next=z.string().max(2200).parse(caption).trim();if(!next)throw new Error("Caption cannot be empty");
 const client=requireSupabase();const {data:{user},error:userError}=await client.auth.getUser();if(userError)throw userError;if(!user)throw new Error("Not authenticated.");
 const db=requireYunikoDb();const {data,error}=await db.from("posts").update({caption:next}).eq("id",postId).eq("author_id",user.id).is("deleted_at",null).select("id").single();if(error||!data)throw error??new Error("Post not found");
 return getPostById(postId);
}
export async function deletePost(postId:string):Promise<void>{
 const client=requireSupabase();const {data:{user},error:userError}=await client.auth.getUser();if(userError)throw userError;if(!user)throw new Error("Not authenticated.");
 const {data,error}=await requireYunikoDb().from("posts").update({deleted_at:new Date().toISOString()}).eq("id",postId).eq("author_id",user.id).is("deleted_at",null).select("id").single();if(error||!data)throw error??new Error("Post not found");
}
