import { useEffect, useState } from "react";
import { Flag, ShieldBan, X } from "lucide-react";
import { blockUser, isUserBlocked, reportTarget, unblockUser } from "./moderation.service";
import type { ModerationTargetType, ReportReason } from "./moderation.schema";
import "./moderation.css";

type Props = {
  targetType: ModerationTargetType;
  targetId: string;
  targetName?: string;
  onClose: () => void;
  onChanged?: () => void;
};

const reasons: Array<{ value: ReportReason; label: string }> = [
  { value: "spam", label: "Spam or misleading content" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate", label: "Hateful content" },
  { value: "violence", label: "Violence or threats" },
  { value: "sexual_content", label: "Sexual content" },
  { value: "scam", label: "Scam or fraud" },
  { value: "copyright", label: "Copyright issue" },
  { value: "other", label: "Something else" },
];

export function ModerationSheet({ targetType, targetId, targetName, onClose, onChanged }: Props) {
  const [mode, setMode] = useState<"actions" | "report">("actions");
  const [reason, setReason] = useState<ReportReason>("spam");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);\n\n  useEffect(() => {\n    if (targetType !== "user") return;\n    void isUserBlocked(targetId).then(setBlocked).catch(() => setBlocked(false));\n  }, [targetId, targetType]);

  async function handleBlock() {
    setBusy(true);
    try {
      if (blocked) await unblockUser(targetId);
      else await blockUser(targetId);
      setBlocked(!blocked);
      setMessage(blocked ? "User unblocked." : "User blocked.");
      onChanged?.();
    } catch {
      setMessage("Unable to update the block right now.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReport() {
    setBusy(true);
    try {
      const details = description.trim() ? `${reason}: ${description.trim()}` : reason;
      await reportTarget(targetType, targetId, details);
      setMessage("Report submitted.");
    } catch {
      setMessage("Unable to submit the report right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="moderation-backdrop" role="presentation" onClick={onClose}>
      <section className="moderation-sheet" role="dialog" aria-modal="true" aria-label="Safety options" onClick={(event) => event.stopPropagation()}>
        <header className="moderation-header">
          <div><strong>{mode === "report" ? "Report" : "Safety options"}</strong>{targetName && <span>{targetName}</span>}</div>
          <button type="button" className="moderation-close" aria-label="Close" onClick={onClose}><X size={20} /></button>
        </header>
        {message ? (
          <div className="moderation-success">
            <strong>Saved</strong>
            <p>{message}</p>
            <button type="button" onClick={onClose}>Done</button>
          </div>
        ) : mode === "actions" ? (
          <div className="moderation-actions">
            {targetType === "user" && <button type="button" className="moderation-action danger" disabled={busy} onClick={handleBlock}><ShieldBan size={19} /> {blocked ? "Unblock user" : "Block user"}</button>}
            <button type="button" className="moderation-action" onClick={() => setMode("report")}><Flag size={19} /> Report {targetType}</button>
          </div>
        ) : (
          <div className="moderation-report-form">
            <label>Why are you reporting this?</label>
            <select value={reason} onChange={(event) => setReason(event.target.value as ReportReason)}>
              {reasons.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <label>Additional details <span>(optional)</span></label>
            <textarea maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add useful context" />
            <button type="button" className="moderation-submit" disabled={busy} onClick={handleReport}>Submit report</button>
            <button type="button" className="moderation-cancel" onClick={() => setMode("actions")}>Back</button>
          </div>
        )}
      </section>
    </div>
  );
}
