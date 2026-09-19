import { createClient } from "@supabase/supabase-js";
import { serverCacheGet,serverCacheSet } from "../../lib/server-cache";

const TTL=15;
function client(){return createClient(String(process.env.VITE_SUPABASE_URL),String(process.env.VITE_SUPABASE_PUBLISHABLE_KEY),{auth:{persistSession:false,autoRefreshToken:false}});}
export async function requireServerFeedClient(){const db=client();return {async getCandidatePostIds(country:string|null):Promise<string[]>{
 const key="yuniko:feed:candidates:"+(country??"world");
 const cached=await serverCacheGet<string[]>(key);if(cached) return cached;
 let q=db.schema("yunikov_v1").from("posts").select("id,created_at").eq("status","ready").is("deleted_at",null).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(120);
 const {data,error}=await q;if(error) throw error;
 const ids=(data??[]).map(row=>row.id);
 await serverCacheSet(key,ids,TTL);return ids;
}};}
