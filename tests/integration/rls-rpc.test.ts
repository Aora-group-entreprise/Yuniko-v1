import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;

describe("canonical database security/RPC contract",()=>{
  it("has executable atomic RPCs and owner-scoped settings when integration credentials are configured",async()=>{
    if(!url||!key){expect(true).toBe(true);return;}
    const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const like=await client.rpc("toggle_like_atomic",{p_post_id:"00000000-0000-0000-0000-000000000000",p_liked:true});
    expect(like.error).toBeTruthy();
    expect(like.error?.message).toMatch(/Authentication required|permission|JWT|authenticated/i);
    const comment=await client.rpc("create_comment_atomic",{p_post_id:"00000000-0000-0000-0000-000000000000",p_parent_id:null,p_body:"security-contract"});
    expect(comment.error).toBeTruthy();
    const settings=await client.schema("yunikov_v1").from("user_settings").select("user_id").limit(1);
    expect(settings.error).toBeFalsy();
    expect(settings.data).toEqual([]);
  });
});
