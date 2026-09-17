import { useState } from "react";
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
  const blocked = targetType === "user" && isUserBlocked(targetId);

  function handleBlock() {
    setBusy(true);
    try {
      if (blocked) unblockUser(targetId);
      else blockUser(targetId);
      setMessage(blocked ? "User unblocked on this device." : "User blocked on this device.");
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  function handleReport() {
    setBusy(true);
    try {
      reportTarget(targetType, targetId, reason, description);
      setMessage("Report saved locally for the moderation review queue.");
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
