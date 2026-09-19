import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") return new Response("Method not allowed",{status:405});
  const authHeader=req.headers.get("Authorization") ?? "";
  const token=authHeader.replace(/^Bearer\s+/i,"");
  if(!token) return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{"content-type":"application/json"}});
  const url=Deno.env.get("SUPABASE_URL")!, anon=Deno.env.get("SUPABASE_ANON_KEY")!, service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client=createClient(url,anon,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await client.auth.getUser(token);
  if(error||!user) return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{"content-type":"application/json"}});
  if(req.method==="POST"){
    const body=await req.json().catch(()=>({}));
    if(body?.action==="revoke_others"){
      const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
      const {error:revokeError}=await admin.auth.admin.signOut(user.id,"others");
      if(revokeError) return new Response(JSON.stringify({error:revokeError.message}),{status:400,headers:{"content-type":"application/json"}});
    }
  }
  let claims:{session_id?:string}={};
  try{const part=token.split(".")[1];claims=JSON.parse(atob(part.replace(/-/g,"+").replace(/_/g,"/")));}catch{}
  return new Response(JSON.stringify({session:{id:claims.session_id??"",userId:user.id,userAgent:req.headers.get("user-agent")??"Current device",createdAt:user.created_at,lastSeenAt:new Date().toISOString()}}),{headers:{"content-type":"application/json"}});
});
