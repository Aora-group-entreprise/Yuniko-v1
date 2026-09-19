import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProfileEditor } from "../profile/ProfileEditor";
import { ArrowLeft, Bell, Check, ChevronRight, Database, FileText, HelpCircle, Info, LogOut, Moon, RotateCcw, ShieldCheck, Sun, UserRound } from "lucide-react";
import { DEFAULT_SETTINGS, getSettings, resetSettings, updateSettings, type AppLanguage, type Appearance, type CommentPrivacy, type MessagePrivacy, type StoryPrivacy, type YunikoSettings } from "./settings.service";
import { useSessionStore } from "../../stores/sessionStore";
import { getMyProfile, updateMyProfile } from "../profile/profile.service";

type Section = "main" | "account" | "privacy" | "notifications" | "data" | "moderation" | "about" | "blocked" | "reports" | "terms" | "policy" | "guidelines" | "support" | "profile-editor" | "credentials";

export function SettingsPage({ onBack, onOpenSecurity }: { onBack: () => void; onOpenSecurity: () => void }) {
  const [settings, setSettings] = useState<YunikoSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [section, setSection] = useState<Section>("main");
  const logout = useSessionStore((state) => state.logout);
  useEffect(() => {
    let mounted = true;
    void getSettings().then(value => { if (mounted) { setSettings(value); setSettingsLoaded(true); } });
    return () => { mounted = false; };
  }, []);
  const change = (patch: Partial<YunikoSettings>) => { void updateSettings(patch).then(setSettings); };
  const title: Record<Section, string> = { main: "Settings", account: "Account", privacy: "Privacy", notifications: "Notifications", data: "Your data", moderation: "Safety & moderation", about: "Information", blocked: "Blocked accounts", reports: "My reports", terms: "Terms of use", policy: "Privacy policy", guidelines: "Community guidelines", support: "Help & support", "profile-editor": "Edit profile", credentials: "Email & password" };
  if (!settingsLoaded) return <main className="settings-shell"><section className="settings-scroll"><div className="settings-info">Loading settings...</div></section></main>;
  if (section !== "main") return <SubPage title={title[section]} onBack={() => setSection(section === "profile-editor" || section === "credentials" ? "account" : section === "blocked" || section === "reports" ? "moderation" : section === "terms" || section === "policy" || section === "guidelines" || section === "support" ? "about" : "main")}>
    {section === "account" && <><InfoBox>Manage the identity and profile information shown on Yuniko.</InfoBox><ActionRow title="Edit profile" description="Open the profile editor entry point." onClick={() => setSection("profile-editor")} /><ActionRow title="Email & password" description="Open account credential information." onClick={() => setSection("credentials")} /></>}
    {section === "profile-editor" && <ProfileEditor onBack={() => setSection("account")} />}
    {section === "credentials" && <><InfoBox>Email and password changes require the future authentication service. No credential is stored or exposed by this frontend-only prototype.</InfoBox><ActionRow title="Back to account" description="Return to account settings." onClick={() => setSection("account")} /></>}
    {section === "privacy" && <><PrivateAccountSetting localValue={settings.privateAccount} onLocalChange={v => change({ privateAccount: v })} /><SettingRow title="Activity status" description="Allow people to see when you are active." value={settings.showActivityStatus} onChange={v => change({ showActivityStatus: v })} /><SelectRow title="Who can message you" value={settings.messagePrivacy} options={["everyone", "followers", "nobody"]} onChange={v => change({ messagePrivacy: v as MessagePrivacy })} /><SelectRow title="Who can view your stories" value={settings.storyPrivacy} options={["everyone", "followers", "close_friends"]} onChange={v => change({ storyPrivacy: v as StoryPrivacy })} /><SelectRow title="Who can comment" value={settings.commentPrivacy} options={["everyone", "followers", "nobody"]} onChange={v => change({ commentPrivacy: v as CommentPrivacy })} /><ActionRow title="Blocked accounts" description="Open blocked-account management." onClick={() => setSection("blocked")} /></>}
    {section === "notifications" && <><SettingRow title="Push notifications" description="Receive notification alerts on this device." value={settings.pushNotifications} onChange={v => change({ pushNotifications: v })} /><SettingRow title="Messages" description="Alerts for new private messages." value={settings.messageNotifications} onChange={v => change({ messageNotifications: v })} /><SettingRow title="Likes" description="Alerts when someone likes your content." value={settings.likeNotifications} onChange={v => change({ likeNotifications: v })} /><SettingRow title="Comments" description="Alerts for comments and replies." value={settings.commentNotifications} onChange={v => change({ commentNotifications: v })} /><SettingRow title="Followers" description="New followers and follow requests." value={settings.followerNotifications} onChange={v => change({ followerNotifications: v })} /><SettingRow title="Stories" description="Story-related notifications." value={settings.storyNotifications} onChange={v => change({ storyNotifications: v })} /><SettingRow title="Email notifications" description="Allow non-essential notification emails." value={settings.emailNotifications} onChange={v => change({ emailNotifications: v })} /></>}
    {section === "data" && <><InfoBox>Yuniko is currently frontend-only. These controls manage local prototype state, not server data.</InfoBox><ActionRow title="Server-backed settings" description="Preferences are stored securely in the Yuniko database." onClick={() => undefined} /><button type="button" className="settings-action danger" onClick={() => { if (window.confirm("Reset all local Yuniko preferences?")) void resetSettings().then(setSettings); }}><Database size={17}/><span><strong>Reset local preferences</strong><small>Restore settings to their defaults.</small></span></button></>}
    {section === "moderation" && <><ActionRow title="Blocked accounts" description="Open blocked-account management." onClick={() => setSection("blocked")} /><ActionRow title="My reports" description="Review reports submitted from this device." onClick={() => setSection("reports")} /><InfoBox>Reporting and blocking use the local frontend moderation queue until the server moderation system is connected.</InfoBox></>}
    {section === "blocked" && <><InfoBox>Blocked accounts are stored by the moderation service. Existing moderation controls on profiles and posts are the active block/unblock surface in this frontend-only prototype.</InfoBox><ActionRow title="Back to safety & moderation" description="Return to moderation settings." onClick={() => setSection("moderation")} /></>}
    {section === "reports" && <><InfoBox>Your submitted reports are stored in the local moderation queue during this frontend-only stage. Server-side review will be connected later.</InfoBox><ActionRow title="Back to safety & moderation" description="Return to moderation settings." onClick={() => setSection("moderation")} /></>}
    {section === "about" && <><ActionRow title="Terms of use" description="Terms of use for Yuniko." onClick={() => setSection("terms")} /><ActionRow title="Privacy policy" description="How Yuniko will handle account and content data." onClick={() => setSection("policy")} /><ActionRow title="Community guidelines" description="Rules for respectful and safe participation." onClick={() => setSection("guidelines")} /><ActionRow title="Help & support" description="Help and support information." onClick={() => setSection("support")} /><div className="settings-version"><Info size={16}/>Yuniko frontend prototype</div></>}
    {section === "terms" && <><InfoBox>Yuniko terms will define acceptable use, user responsibilities, content ownership and service rules before public launch.</InfoBox><ActionRow title="Back to information" description="Return to information settings." onClick={() => setSection("about")} /></>}
    {section === "policy" && <><InfoBox>Yuniko's privacy policy will document account, content, device and analytics data handling before public launch.</InfoBox><ActionRow title="Back to information" description="Return to information settings." onClick={() => setSection("about")} /></>}
    {section === "guidelines" && <><InfoBox>Be respectful. Do not use Yuniko for harassment, threats, scams, spam or prohibited content. Reports and blocks are available throughout the app.</InfoBox><ActionRow title="Back to information" description="Return to information settings." onClick={() => setSection("about")} /></>}
    {section === "support" && <><InfoBox>Help & support is currently a frontend information surface. A real support contact and help center will be connected when the backend and production identity system are added.</InfoBox><ActionRow title="Back to information" description="Return to information settings." onClick={() => setSection("about")} /></>}
  </SubPage>;
  return <main className="settings-shell"><header className="settings-header"><button type="button" aria-label="Back" onClick={onBack}><ArrowLeft size={21}/></button><strong>Settings</strong><span/></header><section className="settings-scroll"><MenuRow icon={<UserRound size={18}/>} title="Account" description="Edit your real Yuniko profile and identity" onClick={() => setSection("account")}/><MenuRow icon={<ShieldCheck size={18}/>} title="Privacy" description="Control visibility, messages and comments" onClick={() => setSection("privacy")}/><MenuRow icon={<Bell size={18}/>} title="Notifications" description="Choose what Yuniko can notify you about" onClick={() => setSection("notifications")}/><section className="settings-card"><h2><Moon size={18}/>Appearance</h2><div className="settings-choice-grid">{(["system","light","dark"] as Appearance[]).map(v => <button type="button" key={v} className={settings.appearance === v ? "selected" : ""} onClick={() => change({ appearance: v })}>{v === "system" ? "System" : v === "light" ? <><Sun size={16}/>Light</> : <><Moon size={16}/>Dark</>}{settings.appearance === v && <Check size={15}/>}</button>)}</div></section><section className="settings-card"><h2>Language</h2><select value={settings.language} onChange={e => change({ language: e.target.value as AppLanguage })} aria-label="Language"><option value="system">Phone default</option><option value="fr">Français</option><option value="en">English</option><option value="mg">Malagasy</option></select></section><MenuRow icon={<Database size={18}/>} title="Your data" description="Your server-backed account and preferences" onClick={() => setSection("data")}/><MenuRow icon={<ShieldCheck size={18}/>} title="Security" description="Sessions, login activity and 2FA prototype" onClick={onOpenSecurity}/><MenuRow icon={<HelpCircle size={18}/>} title="Safety & moderation" description="Blocked accounts and your reports" onClick={() => setSection("moderation")}/><MenuRow icon={<FileText size={18}/>} title="Information" description="Terms, privacy, guidelines and support" onClick={() => setSection("about")}/><section className="settings-card settings-account-actions"><button type="button" className="settings-action" onClick={() => void logout()}><LogOut size={17}/><span><strong>Log out</strong><small>End this Yuniko session on this device.</small></span></button><button type="button" className="settings-action danger" onClick={() => { if (window.confirm("Reset local Yuniko settings?")) setSettings(resetSettings()); }}><RotateCcw size={17}/><span><strong>Reset settings</strong><small>Restore default preferences on this device</small></span></button></section></section></main>;
}
function SubPage({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) { return <main className="settings-shell"><header className="settings-header"><button type="button" aria-label="Back" onClick={onBack}><ArrowLeft size={21}/></button><strong>{title}</strong><span/></header><section className="settings-scroll">{children}</section></main>; }
function MenuRow({ icon, title, description, onClick }: { icon: ReactNode; title: string; description: string; onClick: () => void }) { return <section className="settings-card settings-menu"><button type="button" className="settings-action" onClick={onClick}>{icon}<span><strong>{title}</strong><small>{description}</small></span><ChevronRight size={17}/></button></section>; }
function ActionRow({ title, description, onClick }: { title: string; description: string; onClick: () => void }) { return <section className="settings-card"><button type="button" className="settings-action" onClick={onClick}><span><strong>{title}</strong><small>{description}</small></span><ChevronRight size={17}/></button></section>; }
function InfoBox({ children }: { children: ReactNode }) { return <div className="settings-info">{children}</div>; }
function SelectRow({ title, value, options, onChange }: { title: string; value: string; options: string[]; onChange: (v: string) => void }) { return <div className="settings-row"><div><strong>{title}</strong></div><select value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o} value={o}>{o.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}</select></div>; }
function SettingRow({ title, description, value, onChange }: { title: string; description: string; value: boolean; onChange: (value: boolean) => void }) { return <div className="settings-row"><div><strong>{title}</strong><small>{description}</small></div><button type="button" className={`settings-toggle ${value ? "on" : ""}`} aria-pressed={value} onClick={() => onChange(!value)}><span/></button></div>; }


function PrivateAccountSetting({ localValue, onLocalChange }: { localValue: boolean; onLocalChange: (value: boolean) => void }) {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["my-profile"], queryFn: getMyProfile, staleTime: 30_000 });
  const mutation = useMutation({
    mutationFn: (isPrivate: boolean) => {
      const profile = profileQuery.data;
      if (!profile) throw new Error("Profile not available.");
      return updateMyProfile({
        username: profile.username,
        displayName: profile.display_name,
        bio: profile.bio ?? "",
        country: profile.country_code ?? "",
        website: profile.website ?? "",
        isPrivate,
      });
    },
    onSuccess: (profile) => {
      onLocalChange(profile.is_private);
      queryClient.setQueryData(["my-profile"], profile);
    },
  });

  const value = profileQuery.data?.is_private ?? localValue;
  return (
    <div className="settings-row">
      <div>
        <strong>Private account</strong>
        <small>Only approved followers can follow this account.</small>
      </div>
      <button
        type="button"
        className={`settings-toggle ${value ? "on" : ""}`}
        aria-pressed={value}
        aria-busy={mutation.isPending}
        disabled={profileQuery.isLoading || mutation.isPending}
        onClick={() => void mutation.mutateAsync(!value)}
      >
        <span />
      </button>
    </div>
  );
}
