import { useEffect, useState } from "react";
import { FeedPage } from "../features/feed/FeedPage";
import { AuthPage } from "../features/auth/AuthPage";
import { AuthResetPage } from "../features/auth/AuthResetPage";
import { getCurrentSession } from "../features/auth/auth.service";
import { requireSupabase } from "../lib/supabase";

export function AppRoutes() {
  const [authenticated,setAuthenticated]=useState<boolean|null>(null);
  const [reset,setReset]=useState(()=>window.location.pathname==="/auth/reset");
  useEffect(()=>{let mounted=true;const client=(()=>{try{return requireSupabase();}catch{return null;}})();if(!client){setAuthenticated(false);return;}void getCurrentSession().then(({data})=>{if(mounted)setAuthenticated(Boolean(data.session));});const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{if(mounted)setAuthenticated(Boolean(session));});return()=>{mounted=false;subscription.unsubscribe();};},[]);
  if(reset)return <AuthResetPage onDone={()=>{setReset(false);setAuthenticated(true);window.history.replaceState({}, "", "/");}}/>;
  if(authenticated===null)return <div className="auth-loading">Loading Yuniko...</div>;
  if(!authenticated)return <AuthPage onAuthenticated={()=>setAuthenticated(true)}/>;
  return <FeedPage />;
}