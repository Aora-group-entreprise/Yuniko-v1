import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Save } from "lucide-react";
import { getMyProfile, updateMyProfile, uploadMyAvatar, type ProfileUpdateInput } from "./profile.service";

export function ProfileEditor({ onBack }: { onBack: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState<ProfileUpdateInput>({ username:"", displayName:"", bio:"", country:"", website:"", isPrivate:false });
  const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [saved,setSaved]=useState(false);
  const inputRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{void getMyProfile().then((p)=>{if(p){setProfile(p);setForm({username:p.username,displayName:p.display_name,bio:p.bio,country:p.country??"",website:p.website??"",isPrivate:p.is_private});}}).catch(e=>setError(e instanceof Error?e.message:"Unable to load profile."));},[]);
  async function save(){setBusy(true);setError("");setSaved(false);try{await updateMyProfile(form);setSaved(true);}catch(e){setError(e instanceof Error?e.message:"Unable to save profile.");}finally{setBusy(false);}}
  async function avatar(file:File){setBusy(true);setError("");try{const p=await uploadMyAvatar(file);setProfile(p);}catch(e){setError(e instanceof Error?e.message:"Unable to upload photo.");}finally{setBusy(false);}}
  if(!profile && !error)return <main className="settings-shell"><section className="settings-scroll"><div className="profile-state">Loading profile...</div></section></main>;
  return <main className="settings-shell"><header className="settings-header"><button type="button" aria-label="Back" onClick={onBack}><ArrowLeft size={21}/></button><strong>Edit profile</strong><span/></header><section className="settings-scroll">
    {profile && <div className="profile-editor">
      <button type="button" className="profile-editor-avatar" onClick={()=>inputRef.current?.click()} disabled={busy}><img src={profile.avatar_url||""} alt=""/><span><Camera size={18}/></span></button>
      <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f)void avatar(f);e.currentTarget.value="";}}/>
      <label>Username<input value={form.username} onChange={e=>setForm({...form,username:e.target.value})}/></label>
      <label>Display name<input value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})}/></label>
      <label>Bio<textarea value={form.bio} maxLength={500} onChange={e=>setForm({...form,bio:e.target.value})}/></label>
      <label>Country<input value={form.country??""} onChange={e=>setForm({...form,country:e.target.value})}/></label>
      <label>Website<input value={form.website??""} type="url" placeholder="https://" onChange={e=>setForm({...form,website:e.target.value})}/></label>
      <label className="profile-editor-toggle"><input type="checkbox" checked={Boolean(form.isPrivate)} onChange={e=>setForm({...form,isPrivate:e.target.checked})}/> Private account</label>
      {error&&<p className="auth-error">{error}</p>}{saved&&<p className="profile-state">Profile saved.</p>}
      <button type="button" className="auth-primary" disabled={busy} onClick={()=>void save()}><Save size={17}/>{busy?"Saving...":"Save profile"}</button>
    </div>}
  </section></main>;
}
