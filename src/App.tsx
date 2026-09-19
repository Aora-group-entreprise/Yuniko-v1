import { useEffect,useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { FeedPage } from "./features/feed/FeedPage";
import { AuthPage } from "./features/auth/AuthPage";
import { AuthResetPage } from "./features/auth/AuthResetPage";
import { MfaChallengePage } from "./features/security/MfaChallengePage";
import { useSessionStore } from "./stores/sessionStore";
import { requireSupabase } from "./lib/supabase";
import { queryClient } from "./lib/query-client";

export function App() {
 return <AppErrorBoundary><QueryClientProvider client={queryClient}><AppRoutes /></QueryClientProvider></AppErrorBoundary>;
}

function AppRoutes(){
 const session=useSessionStore(state=>state.session);const initialized=useSessionStore(state=>state.initialized);const setSession=useSessionStore(state=>state.setSession);const initialize=useSessionStore(state=>state.initialize);const [reset,setReset]=useState(()=>typeof window!=="undefined"&&window.location.pathname==="/auth/reset");const [mfaRequired,setMfaRequired]=useState(false);
 useEffect(()=>{let mounted=true;const client=(()=>{try{return requireSupabase();}catch{return null;}})();if(!client){setSession(null);return;}void initialize().catch(()=>{if(mounted)setSession(null);});const {data:{subscription}}=client.auth.onAuthStateChange((_event,nextSession)=>{if(mounted)setSession(nextSession);});return()=>{mounted=false;subscription.unsubscribe();};},[initialize,setSession]);
 useEffect(()=>{if(!session){setMfaRequired(false);return;}void (async()=>{const client=requireSupabase();const {data,error}=await client.auth.mfa.listFactors();if(!error){const verified=(data?.totp??[]).some(f=>f.status==="verified");const {data:aal}=await client.auth.mfa.getAuthenticatorAssuranceLevel();setMfaRequired(verified&&aal?.currentLevel!=="aal2");}})();},[session]);
 if(reset)return <AuthResetPage onDone={()=>{setReset(false);setSession(session);window.history.replaceState({}, "", "/");}}/>;
 if(!initialized)return <div className="auth-loading">Loading Yuniko...</div>;
 if(!session)return <AuthPage onAuthenticated={()=>void initialize()}/>;
 if(mfaRequired)return <MfaChallengePage onVerified={()=>setMfaRequired(false)}/>;
 return <FeedPage/>;
}
