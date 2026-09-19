import { requireSupabase } from "../../lib/supabase";

const LIMITS={image:15*1024*1024,video:50*1024*1024,story:25*1024*1024,avatar:5*1024*1024} as const;
const IMAGE_TYPES=new Set(["image/jpeg","image/png","image/webp","image/gif"]);
const VIDEO_TYPES=new Set(["video/mp4","video/webm","video/quicktime"]);

export function validateMedia(file:File,kind:keyof typeof LIMITS):void{
 if(!file||file.size<=0) throw new Error("Media file is empty.");
 const valid=kind==="avatar"?new Set(["image/jpeg","image/png","image/webp"]):new Set([...IMAGE_TYPES,...VIDEO_TYPES]);
 if(!valid.has(file.type)) throw new Error("Unsupported media type.");
 if(file.size>LIMITS[kind]) throw new Error("Media file exceeds the allowed size.");
}
export async function uploadUserMedia(file:File,kind:"image"|"video"|"story"|"avatar"):Promise<{objectKey:string;url:string}>{
 validateMedia(file,kind);
 const {data:{user},error}=await requireSupabase().auth.getUser(); if(error) throw error; if(!user) throw new Error("Not authenticated.");
 const bucket=kind==="avatar"?"avatars":kind==="story"?"story-media":"post-media";
 const extension=file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g,"")||"bin";
 const objectKey=user.id+"/"+kind+"s/"+crypto.randomUUID()+"."+extension;
 const {error:uploadError}=await requireSupabase().storage.from(bucket).upload(objectKey,file,{contentType:file.type,cacheControl:"31536000",upsert:false});
 if(uploadError) throw uploadError;
 return {objectKey,url:requireSupabase().storage.from(bucket).getPublicUrl(objectKey).data.publicUrl};
}
export async function removeUserMedia(bucket:string,objectKey:string):Promise<void>{
 if(!objectKey) return; const {error}=await requireSupabase().storage.from(bucket).remove([objectKey]); if(error) throw error;
}