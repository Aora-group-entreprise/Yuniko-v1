import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Camera, Eye, EyeOff, Globe, Lock, User, Users } from "lucide-react";
import { FormEvent, ReactNode, useMemo, useRef, useState } from "react";
import { resetPassword, signIn, signUp } from "./auth.service";
import { getCountryOptions } from "./countries";
import { uploadMyAvatar } from "../profile/profile.service";

const GRADIENT = "linear-gradient(135deg,#ff006e,#8b00ff)";

type Mode = "signin" | "signup" | "forgot";

export function AuthPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [age, setAge] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const countryOptions = useMemo(() => getCountryOptions(), []);

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
      if (username.trim().length < 3 || password.length < 6 || password !== confirmPassword) {
        setError("Use a 3+ character username and matching passwords.");
        return;
      }
      setStep(2); return;
    }
    if (step === 2) { if (!name.trim()) { setError("Enter your display name."); return; } if (!country) { setError("Choose your country."); return; } setStep(3); return; }
    setBusy(true);
    try {
      const result = await signUp({ username, password, confirmPassword, displayName: name, country, age: age ? Number(age) : undefined });
      if (avatarFile) await uploadMyAvatar(avatarFile);
      if (result.session) onAuthenticated();
      else setError("Account created. Please sign in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create your account.");
    } finally { setBusy(false); }
  }

  function chooseAvatar(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Profile photo must be JPEG, PNG, or WebP."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Profile photo must be smaller than 5 MB."); return; }
    setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); resetError();
  }

  async function submitReset(event: FormEvent) {
    event.preventDefault(); resetError(); setBusy(true);
    try { await resetPassword({ identifier: username }); setMode("signin"); setError("If the account exists, a reset email has been sent."); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to start password reset."); }
    finally { setBusy(false); }
  }

  return (
    <main className="auth-shell flex flex-col">
      <div className="auth-glow" />
      <section className="auth-brand relative flex flex-col items-center justify-end px-6 pt-14 pb-7 min-h-[220px]">
        <div className="auth-logo w-[68px] h-[68px] rounded-[20px]" style={{ background: GRADIENT, boxShadow: "0 0 44px rgba(255,0,110,.45)" }}><span>✦</span></div>
        <h1>Yuniko</h1>
      </section>
      <div className="auth-content flex-1 w-full max-w-lg mx-auto px-6 pb-10">
        <AnimatePresence mode="wait" initial={false}>
          {mode === "signin" && <motion.form key="signin" className="auth-form" onSubmit={submitSignIn} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}>
            <ModeTabs mode={mode} onChange={(next) => { setMode(next); resetError(); }} />
            <div className="auth-fields">
              <Field icon={<User size={18} />} value={username} onChange={setUsername} placeholder="Username" autoComplete="username" />
              <Field icon={<Lock size={18} />} value={password} onChange={setPassword} placeholder="Password" type={showPw ? "text" : "password"} autoComplete="current-password" suffix={<button type="button" aria-label="Toggle password" onClick={() => setShowPw((v) => !v)}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>} />
            </div>
            <button type="button" className="auth-link-right" onClick={() => { setMode("forgot"); resetError(); }}>Forgot Password?</button>
            {error && <p className="auth-error">{error}</p>}
            <button className="auth-primary" disabled={busy}>{busy ? "Signing In..." : "Sign In"} <ArrowRight size={16} /></button>
            <p className="auth-footer">Don't have an account? <button type="button" onClick={() => { setMode("signup"); setStep(1); resetError(); }}>Sign Up</button></p>
          </motion.form>}

          {mode === "signup" && <motion.div key={`signup-${step}`} className="auth-form" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
            <div className="auth-step-head"><button type="button" onClick={() => step === 1 ? setMode("signin") : setStep(step - 1)}><ArrowLeft size={20} /></button><div className="auth-progress">{[1,2,3].map((n) => <span key={n} className={n <= step ? "active" : ""} style={n <= step ? { background: GRADIENT } : undefined} />)}</div><span className="auth-spacer" /></div>
            {step === 1 && <><h2>Create account</h2><p className="auth-subtitle">Choose a unique username</p><div className="auth-fields"><Field icon={<span>@</span>} value={username} onChange={setUsername} placeholder="username" /><Field icon={<Lock size={18} />} value={password} onChange={setPassword} placeholder="Password (min 6 characters)" type={showPw ? "text" : "password"} suffix={<button type="button" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw((v) => !v)}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>} /><Field icon={<Lock size={18} />} value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" type={showConfirmPw ? "text" : "password"} suffix={<button type="button" aria-label={showConfirmPw ? "Hide password" : "Show password"} onClick={() => setShowConfirmPw((v) => !v)}>{showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>} /></div><button type="button" className="auth-primary" onClick={() => void continueSignup()}>Continue <ArrowRight size={16} /></button></>}
            {step === 2 && <><h2>About you</h2><p className="auth-subtitle">Help others find and know you</p><div className="auth-fields"><Field icon={<User size={18} />} value={name} onChange={setName} placeholder="Display name" /><label className="auth-field auth-country-field"><Globe size={18} /><select value={country} onChange={(event) => setCountry(event.target.value)} aria-label="Country"><option value="">Choose your country</option>{countryOptions.map((item) => <option key={item.code} value={item.code}>{item.flag} {item.getName(navigator.language)}</option>)}</select></label><Field icon={<Users size={18} />} value={age} onChange={setAge} placeholder="Your age" type="number" /></div><button type="button" className="auth-primary" onClick={() => void continueSignup()}>Continue <ArrowRight size={16} /></button></>}
            {step === 3 && <><h2>Add your photo</h2><p className="auth-subtitle">Help people recognize you</p><button type="button" className="auth-photo-placeholder" onClick={() => avatarInputRef.current?.click()} disabled={busy} aria-label="Choose profile photo">{avatarPreview ? <img src={avatarPreview} alt="Selected profile" /> : <Camera size={28} />}</button><input ref={avatarInputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { chooseAvatar(event.target.files?.[0]); event.currentTarget.value = ""; }} />{avatarFile && <p className="auth-subtitle">Photo selected. It will be uploaded when the account is created.</p>}<button type="button" className="auth-primary" disabled={busy} onClick={() => void continueSignup()}>{busy ? "Creating..." : "Create Account"} <ArrowRight size={16} /></button><button type="button" className="auth-skip" disabled={busy} onClick={() => void continueSignup()}>Skip for now</button></>}
            {error && <p className="auth-error">{error}</p>}
          </motion.div>}

          {mode === "forgot" && <motion.form key="forgot" className="auth-form" onSubmit={submitReset} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
            <button type="button" className="auth-back" onClick={() => setMode("signin")}><ArrowLeft size={20} /></button>
            <h2>Reset password</h2><p className="auth-subtitle">Yuniko accounts do not use email addresses.</p>
            <Field icon={<User size={18} />} value={username} onChange={setUsername} placeholder="Your username" />
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