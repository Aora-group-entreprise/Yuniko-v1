import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Camera, Eye, EyeOff, Globe, Lock, User, Users } from "lucide-react";
import { FormEvent, ReactNode, useState } from "react";
import { resetPassword, signIn, signUp } from "./auth.service";

const GRADIENT = "linear-gradient(135deg,#ff006e,#8b00ff)";

type Mode = "signin" | "signup" | "forgot";

export function AuthPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [age, setAge] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function resetError() { setError(""); }

  async function submitSignIn(event: FormEvent) {
    event.preventDefault(); resetError();
    setBusy(true);
    try {
      await signIn({ identifier: username, password });
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally { setBusy(false); }
  }

  async function continueSignup() {
    resetError();
    if (step === 1) {
      if (username.trim().length < 3 || password.length < 6 || password !== confirmPassword || !email.includes("@")) {
        setError("Use a valid email, a 3+ character username, and matching passwords.");
        return;
      }
      setStep(2); return;
    }
    if (step === 2) { if (!name.trim()) { setError("Enter your display name."); return; } setStep(3); return; }
    setBusy(true);
    try {
      const result = await signUp({ email, username, password, confirmPassword, displayName: name, country, age: age ? Number(age) : undefined });
      if (result.session) onAuthenticated();
      else setError("Check your email to confirm your account, then sign in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create your account.");
    } finally { setBusy(false); }
  }

  async function submitReset(event: FormEvent) {
    event.preventDefault(); resetError(); setBusy(true);
    try { await resetPassword({ identifier: username }); setMode("signin"); setError("If the account exists, a reset email has been sent."); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to start password reset."); }
    finally { setBusy(false); }
  }

  return (
    <main className="auth-shell">
      <div className="auth-glow" />
      <section className="auth-brand">
        <div className="auth-logo" style={{ background: GRADIENT }}><span>✦</span></div>
        <h1>Yuniko</h1>
      </section>
      <div className="auth-content">
        <AnimatePresence mode="wait" initial={false}>
          {mode === "signin" && <motion.form key="signin" className="auth-form" onSubmit={submitSignIn} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}>
            <ModeTabs mode={mode} onChange={(next) => { setMode(next); resetError(); }} />
            <div className="auth-fields">
              <Field icon={<User size={18} />} value={username} onChange={setUsername} placeholder="Username or email" autoComplete="username" />
              <Field icon={<Lock size={18} />} value={password} onChange={setPassword} placeholder="Password" type={showPw ? "text" : "password"} autoComplete="current-password" suffix={<button type="button" aria-label="Toggle password" onClick={() => setShowPw((v) => !v)}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>} />
            </div>
            <button type="button" className="auth-link-right" onClick={() => { setMode("forgot"); resetError(); }}>Forgot Password?</button>
            {error && <p className="auth-error">{error}</p>}
            <button className="auth-primary" disabled={busy}>{busy ? "Signing In..." : "Sign In"} <ArrowRight size={16} /></button>
            <p className="auth-footer">Don't have an account? <button type="button" onClick={() => { setMode("signup"); setStep(1); resetError(); }}>Sign Up</button></p>
          </motion.form>}

          {mode === "signup" && <motion.div key={`signup-${step}`} className="auth-form" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
            <div className="auth-step-head"><button type="button" onClick={() => step === 1 ? setMode("signin") : setStep(step - 1)}><ArrowLeft size={20} /></button><div className="auth-progress">{[1,2,3].map((n) => <span key={n} className={n <= step ? "active" : ""} style={n <= step ? { background: GRADIENT } : undefined} />)}</div><span className="auth-spacer" /></div>
            {step === 1 && <><h2>Create account</h2><p className="auth-subtitle">Choose your Yuniko identity</p><div className="auth-fields"><Field icon={<span>@</span>} value={username} onChange={setUsername} placeholder="username" /><Field icon={<User size={18} />} value={email} onChange={setEmail} placeholder="Email" type="email" /><Field icon={<Lock size={18} />} value={password} onChange={setPassword} placeholder="Password (min 6 characters)" type="password" /><Field icon={<Lock size={18} />} value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" type="password" /></div><button type="button" className="auth-primary" onClick={() => void continueSignup()}>Continue <ArrowRight size={16} /></button></>}
            {step === 2 && <><h2>About you</h2><p className="auth-subtitle">Help others find and know you</p><div className="auth-fields"><Field icon={<User size={18} />} value={name} onChange={setName} placeholder="Display name" /><Field icon={<Globe size={18} />} value={country} onChange={setCountry} placeholder="Where are you from?" /><Field icon={<Users size={18} />} value={age} onChange={setAge} placeholder="Your age" type="number" /></div><button type="button" className="auth-primary" onClick={() => void continueSignup()}>Continue <ArrowRight size={16} /></button></>}
            {step === 3 && <><h2>Add your photo</h2><p className="auth-subtitle">Help people recognize you</p><div className="auth-photo-placeholder"><Camera size={28} /></div><button type="button" className="auth-primary" disabled={busy} onClick={() => void continueSignup()}>{busy ? "Creating..." : "Create Account"} <ArrowRight size={16} /></button><button type="button" className="auth-skip" disabled={busy} onClick={() => void continueSignup()}>Skip for now</button></>}
            {error && <p className="auth-error">{error}</p>}
          </motion.div>}

          {mode === "forgot" && <motion.form key="forgot" className="auth-form" onSubmit={submitReset} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
            <button type="button" className="auth-back" onClick={() => setMode("signin")}><ArrowLeft size={20} /></button>
            <h2>Reset password</h2><p className="auth-subtitle">Enter your email or username to continue</p>
            <Field icon={<User size={18} />} value={username} onChange={setUsername} placeholder="Your username or email" />
            {error && <p className="auth-error">{error}</p>}
            <button className="auth-primary" disabled={busy}>{busy ? "Sending..." : "Continue"} <ArrowRight size={16} /></button>
          </motion.form>}
        </AnimatePresence>
      </div>
    </main>
  );
}

function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return <div className="auth-tabs"><button type="button" className={mode === "signin" ? "active" : ""} onClick={() => onChange("signin")}>Sign In</button><button type="button" onClick={() => onChange("signup")}>Sign Up</button></div>;
}

function Field({ icon, value, onChange, placeholder, type = "text", suffix, autoComplete }: { icon: ReactNode; value: string; onChange: (value: string) => void; placeholder: string; type?: string; suffix?: ReactNode; autoComplete?: string }) {
  return <div className="auth-field">{icon}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} />{suffix}</div>;
}