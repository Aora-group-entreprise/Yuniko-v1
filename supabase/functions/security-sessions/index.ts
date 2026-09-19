import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") return new Response("Method not allowed",{status:405});
  const authHeader=req.headers.get("Authorization") ?? "";
  const token=authHeader.replace(/^Bearer\s+/i,"");
  if(!token) return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{"content-type":"application/json"}});
  const url=Deno.env.get("SUPABASE_URL")!;
  const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient=createClient(url,anon,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userError}=await userClient.auth.getUser(token);
  if(userError||!user) return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{"content-type":"application/json"}});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  if(req.method==="POST"){
    const body=await req.json().catch(()=>({}));
    if(body?.action==="revoke_others"){
      const {error}=await admin.auth.admin.signOut(user.id,"others");
      if(error) return new Response(JSON.stringify({error:error.message}),{status:400,headers:{"content-type":"application/json"}});
    }
  }
  const {data,error}=await admin.schema("auth").from("sessions").select("id,created_at,updated_at,user_agent,ip,aal,not_after").eq("user_id",user.id).order("updated_at",{ascending:false});
  if(error) return new Response(JSON.stringify({error:error.message}),{status:500,headers:{"content-type":"application/json"}});
  return new Response(JSON.stringify({sessions:(data??[]).map(row=>({id:row.id,createdAt:row.created_at,lastSeenAt:row.updated_at,userAgent:row.user_agent ?? "Unknown device",ip:row.ip,aal:row.aal,notAfter:row.not_after}))}),{headers:{"content-type":"application/json"}});
});