import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Save } from "lucide-react";
import { getMyProfile, updateMyProfile, uploadMyAvatar, type ProfileUpdateInput } from "./profile.service";
import { getCountryOptions } from "../auth/countries";
import type { MyProfile } from "./profile.schema";

const EMPTY_FORM: ProfileUpdateInput = {
  username: "",
  displayName: "",
  bio: "",
  country: "",
  website: "",
  isPrivate: false,
};

export function ProfileEditor({ onBack }: { onBack: () => void }) {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [form, setForm] = useState<ProfileUpdateInput>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const countryOptions = getCountryOptions();

  useEffect(() => {
    let active = true;
    void getMyProfile()
      .then((next) => {
        if (!active || !next) return;
        setProfile(next);
        setForm({
          username: next.username,
          displayName: next.display_name,
          bio: next.bio ?? "",
          country: next.country_code ?? "",
          website: next.website ?? "",
          isPrivate: next.is_private,
        });
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Unable to load profile.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const next = await updateMyProfile(form);
      setProfile(next);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile.");
    } finally {
      setBusy(false);
    }
  }

  async function avatar(file: File) {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const next = await uploadMyAvatar(file);
      setProfile(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload photo.");
    } finally {
      setBusy(false);
    }
  }

  if (!profile && !error) {
    return (
      <main className="settings-shell">
        <section className="settings-scroll">
          <div className="profile-state">Loading profile...</div>
        </section>
      </main>
    );
  }

  return (
    <main className="settings-shell">
      <header className="settings-header">
        <button type="button" aria-label="Back" onClick={onBack}><ArrowLeft size={21} /></button>
        <strong>Edit profile</strong>
        <span />
      </header>
      <section className="settings-scroll">
        {profile && (
          <div className="profile-editor">
            <button
              type="button"
              className="profile-editor-avatar"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              aria-label="Change profile photo"
            >
              {profile.avatar_url && <img src={profile.avatar_url} alt="" />}
              <span><Camera size={18} /></span>
            </button>
            <input
              ref={inputRef}
              hidden
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void avatar(file);
                event.currentTarget.value = "";
              }}
            />

            <label>
              Username
              <input value={form.username} maxLength={30} onChange={(event) => setForm({ ...form, username: event.target.value })} />
            </label>
            <label>
              Display name
              <input value={form.displayName} maxLength={80} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
            </label>
            <label>
              Bio
              <textarea value={form.bio} maxLength={500} onChange={(event) => setForm({ ...form, bio: event.target.value })} />
            </label>
            <label>
              Country
              <input value={form.country ?? ""} maxLength={80} onChange={(event) => setForm({ ...form, country: event.target.value })} />
            </label>
            <label>
              Website
              <input value={form.website ?? ""} type="url" placeholder="https://" onChange={(event) => setForm({ ...form, website: event.target.value })} />
            </label>
            <label className="profile-editor-toggle">
              <input type="checkbox" checked={Boolean(form.isPrivate)} onChange={(event) => setForm({ ...form, isPrivate: event.target.checked })} />
              Private account
            </label>

            {error && <p className="auth-error">{error}</p>}
            {saved && <p className="profile-state">Profile saved.</p>}
            <button type="button" className="auth-primary" disabled={busy} onClick={() => void save()}>
              <Save size={17} /> {busy ? "Saving..." : "Save profile"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
