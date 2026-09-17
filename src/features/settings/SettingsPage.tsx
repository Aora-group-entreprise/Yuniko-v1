import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Check, LogOut, Moon, RotateCcw, ShieldCheck, Sun, UserRound } from "lucide-react";
import { getSettings, resetSettings, subscribeToSettings, updateSettings, type AppLanguage, type Appearance, type YunikoSettings } from "./settings.service";

export function SettingsPage({ onBack, onOpenSecurity }: { onBack: () => void; onOpenSecurity: () => void }) {
  const [settings, setSettings] = useState<YunikoSettings>(() => getSettings());

  useEffect(() => subscribeToSettings(() => setSettings(getSettings())), []);

  const change = (patch: Partial<YunikoSettings>) => setSettings(updateSettings(patch));

  return (
    <main className="settings-shell">
      <header className="settings-header">
        <button type="button" aria-label="Back" onClick={onBack}><ArrowLeft size={21} /></button>
        <strong>Settings</strong>
        <span />
      </header>
      <section className="settings-scroll">
        <section className="settings-card">
          <h2><UserRound size={18} />Account & privacy</h2>
          <SettingRow title="Private account" description="Only approved followers can follow this account." value={settings.privateAccount} onChange={(value) => change({ privateAccount: value })} />
          <SettingRow title="Activity status" description="Allow people to see when you are active." value={settings.showActivityStatus} onChange={(value) => change({ showActivityStatus: value })} />
        </section>
        <section className="settings-card">
          <h2><Bell size={18} />Notifications</h2>
          <SettingRow title="Push notifications" description="Receive notification alerts on this device." value={settings.pushNotifications} onChange={(value) => change({ pushNotifications: value })} />
          <SettingRow title="Message notifications" description="Receive alerts for new messages." value={settings.messageNotifications} onChange={(value) => change({ messageNotifications: value })} />
          <SettingRow title="Email notifications" description="Allow non-essential notification emails." value={settings.emailNotifications} onChange={(value) => change({ emailNotifications: value })} />
        </section>
        <section className="settings-card">
          <h2><Moon size={18} />Appearance</h2>
          <div className="settings-choice-grid">{(["system", "light", "dark"] as Appearance[]).map((value) => <button type="button" key={value} className={settings.appearance === value ? "selected" : ""} onClick={() => change({ appearance: value })}>{value === "system" ? "System" : value === "light" ? <><Sun size={16} />Light</> : <><Moon size={16} />Dark</>}{settings.appearance === value && <Check size={15} />}</button>)}</div>
        </section>
        <section className="settings-card">
          <h2>Language</h2>
          <select value={settings.language} onChange={(event) => change({ language: event.target.value as AppLanguage })} aria-label="Language">
            <option value="system">Phone default</option><option value="fr">Français</option><option value="en">English</option><option value="mg">Malagasy</option>
          </select>
        </section>
        <section className="settings-card">
          <h2><ShieldCheck size={18} />Security</h2>
          <button type="button" className="settings-action" onClick={onOpenSecurity}><ShieldCheck size={17} /><span><strong>Security center</strong><small>Sessions, login activity and 2FA prototype</small></span></button>
        </section>
        <section className="settings-card settings-account-actions">
          <button type="button" className="settings-action" onClick={() => window.dispatchEvent(new CustomEvent("yuniko:logout-requested"))}><LogOut size={17} /><span><strong>Log out</strong><small>Frontend prototype action</small></span></button>
          <button type="button" className="settings-action danger" onClick={() => { if (window.confirm("Reset local Yuniko settings?")) setSettings(resetSettings()); }}><RotateCcw size={17} /><span><strong>Reset local settings</strong><small>Restore default preferences on this device</small></span></button>
        </section>
      </section>
    </main>
  );
}

function SettingRow({ title, description, value, onChange }: { title: string; description: string; value: boolean; onChange: (value: boolean) => void }) {
  return <div className="settings-row"><div><strong>{title}</strong><small>{description}</small></div><button type="button" className={`settings-toggle ${value ? "on" : ""}`} aria-pressed={value} onClick={() => onChange(!value)}><span /></button></div>;
}
