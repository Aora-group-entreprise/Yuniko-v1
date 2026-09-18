import { Copy, ExternalLink, Send, X } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { recordShare } from "./share.service";

export function ShareSheet({ postId, onClose }: { postId: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/post/${encodeURIComponent(postId)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      await recordShare(postId, "copy");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { setCopied(false); }
  }

  async function systemShare() {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: "Yuniko", text: "Découvre ce post sur Yuniko", url: shareUrl });
      await recordShare(postId, "system");
    } catch { /* cancelled */ }
  }

  return (
    <div className="share-sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <motion.section initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: 0 }} className="share-sheet" role="dialog" aria-modal="true" aria-label="Partager" onMouseDown={(event) => event.stopPropagation()}>
        <header className="share-sheet-header"><strong>Partager</strong><button type="button" aria-label="Fermer" onClick={onClose}><X size={20} /></button></header>
        <div className="share-sheet-actions">
          <button type="button" onClick={() => void copyLink()}><Copy size={20} /><span>{copied ? "Lien copié" : "Copier le lien"}</span></button>
          {typeof navigator.share === "function" && <button type="button" onClick={() => void systemShare()}><Send size={20} /><span>Partager via le téléphone</span></button>}
          <div className="share-sheet-link"><ExternalLink size={16} /><span>{shareUrl}</span></div>
        </div>
      </motion.section>
    </div>
  );
}
