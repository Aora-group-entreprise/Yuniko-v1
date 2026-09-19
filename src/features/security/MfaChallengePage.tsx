import { useEffect,useState } from "react";
import { requireSupabase } from "../../lib/supabase";

export function MfaChallengePage({onVerified}:{onVerified:()=>void}){
 const [factorId,setFactorId]=useState("");const [challengeId,setChallengeId]=useState("");const [code,setCode]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 useEffect(()=>{void (async()=>{const {data,error}=await requireSupabase().auth.mfa.listFactors();if(error){setError(error.message);return;}const factor=(data?.totp??[]).find(f=>f.status==="verified");if(!factor){onVerified();return;}setFactorId(factor.id);const {data:challenge,error:challengeError}=await requireSupabase().auth.mfa.challenge({factorId:factor.id});if(challengeError)setError(challengeError.message);else setChallengeId(challenge.id);})();},[onVerified]);
 async function verify(){if(!factorId||!challengeId||code.length<6)return;setBusy(true);setError("");const {error}=await requireSupabase().auth.mfa.verify({factorId,challengeId,code});if(error)setError(error.message);else onVerified();setBusy(false);}
 return <main className="auth-shell"><section className="auth-card"><h1>Verify your identity</h1><p>Enter the 6-digit code from your authenticator app.</p><input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="123456" aria-label="Two-factor code"/><button type="button" disabled={busy||code.length<6} onClick={()=>void verify()}>Verify</button>{error&&<p role="alert">{error}</p>}</section></main>;
}
