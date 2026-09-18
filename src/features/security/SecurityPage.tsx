import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Copy, KeyRound, LogOut, ShieldCheck, Smartphone, XCircle } from "lucide-react";
import {
  disableTwoFactor,
  enableTwoFactor,
  getLoginEvents,
  getSecurityState,
  getSessions,
  regenerateRecoveryCodes,
  revokeSession,
  subscribeToSecurityChanges,
  type LoginEvent,
  type SecurityState,
  type Session,
} from "./security.service";

export function SecurityPage({ onBack }: { onBack: () => void }) {
  const [security, setSecurity] = useState<SecurityState>(() => getSecurityState());
  const [sessions, setSessions] = useState<Session[]>(() => getSessions());
  const [events, setEvents] = useState<LoginEvent[]>(() => getLoginEvents());
  const [showCodes, setShowCodes] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = () => {
    setSecurity(getSecurityState());
    setSessions(getSessions());
    setEvents(getLoginEvents());
  };

  useEffect(() => subscribeToSecurityChanges(refresh), []);

  const recoveryText = useMemo(() => security.recoveryCodes.join("\n"), [security.recoveryCodes]);

  async function copyRecoveryCodes() {
    if (!recoveryText || !navigator.clipboard) return;
    await navigator.clipboard.writeText(recoveryText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function toggleTwoFactor() {
    const next = security.twoFactorEnabled ? disableTwoFactor() : enableTwoFactor();
    setSecurity(next);
    setShowCodes(next.twoFactorEnabled);
  }

  function regenerateCodes() {
    const codes = regenerateRecoveryCodes();
    setSecurity(getSecurityState());
    setShowCodes(true);
    if (navigator.clipboard) void navigator.clipboard.writeText(codes.join("\n"));
  }

  return (
    <main className="security-shell">
      <header className="security-header">
        <button type="button" className="security-header-button" aria-label="Back to feed" onClick={onBack}><ArrowLeft size={21} /></button>
        <div><strong>Security</strong><span>Account protection</span></div>
        <ShieldCheck size={21} aria-hidden="true" />
      </header>

      <section className="security-scroll">
        <div className="security-prototype-note">
          <ShieldCheck size={18} />
          <div><strong>Frontend security prototype</strong><p>These controls are local to this device for now. Real authentication and server-side security will be connected later.</p></div>
        </div>

        <section className="security-card">
          <div className="security-card-heading"><div className="security-icon"><KeyRound size={19} /></div><div><h2>Two-factor authentication</h2><p>Add a second verification step to the account.</p></div></div>
          <div className="security-row">
            <div><strong>{security.twoFactorEnabled ? "Enabled" : "Disabled"}</strong><span>{security.twoFactorEnabled ? "Recovery codes are available." : "Not configured on this prototype."}</span></div>
            <button type="button" className={`security-toggle ${security.twoFactorEnabled ? "on" : ""}`} onClick={toggleTwoFactor} aria-pressed={security.twoFactorEnabled}>{security.twoFactorEnabled ? "Turn off" : "Enable"}</button>
          </div>
          {security.twoFactorEnabled && <div className="recovery-area">
            <button type="button" className="security-secondary-button" onClick={() => setShowCodes((value) => !value)}>{showCodes ? "Hide recovery codes" : "Show recovery codes"}</button>
            <button type="button" className="security-secondary-button" onClick={regenerateCodes}>Regenerate</button>
            {showCodes && <div className="recovery-codes" aria-label="Recovery codes">{security.recoveryCodes.map((code: string) => <code key={code}>{code}</code>)}</div>}
            {showCodes && <button type="button" className="security-copy-button" onClick={() => void copyRecoveryCodes()}><Copy size={15} />{copied ? "Copied" : "Copy codes"}</button>}
          </div>}
        </section>

        <section className="security-card">
          <div className="security-card-heading"><div className="security-icon"><Smartphone size={19} /></div><div><h2>Active sessions</h2><p>Devices currently associated with this local prototype.</p></div></div>
          <div className="security-list">
            {sessions.length === 0 && <div className="security-empty">No session recorded yet.</div>}
            {sessions.map((session) => <div className="security-list-row" key={session.id}>
              <div className="security-list-main"><Smartphone size={17} /><div><strong>{session.deviceLabel}</strong><span>Last seen {formatDate(session.lastSeenAt)}</span></div></div>
              {session.current ? <span className="current-badge"><CheckCircle2 size={14} />Current</span> : <button type="button" className="revoke-button" onClick={() => { revokeSession(session.id); refresh(); }}><LogOut size={14} />Revoke</button>}
            </div>)}
          </div>
        </section>

        <section className="security-card">
          <div className="security-card-heading"><div className="security-icon"><ShieldCheck size={19} /></div><div><h2>Recent login activity</h2><p>Local login events recorded by this prototype.</p></div></div>
          <div className="security-list">
            {events.length === 0 && <div className="security-empty">No login events recorded yet.</div>}
            {[...events].reverse().slice(0, 8).map((event) => <div className="security-list-row" key={event.id}>
              <div className="security-list-main">{event.success ? <CheckCircle2 size={17} /> : <XCircle size={17} />}<div><strong>{event.deviceLabel}</strong><span>{event.countryCode} · {formatDate(event.createdAt)}</span></div></div>
              <span className={`login-status ${event.success ? "success" : "failed"}`}>{event.success ? "Success" : "Failed"}</span>
            </div>)}
          </div>
        </section>
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
