import { Check, FolderPlus, X } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useSaves } from "./useSaves";

export function CollectionsSheet({ postId, onClose }: { postId: string; onClose: () => void }) {
  const { collections, savedPostIds, toggleCollection, addCollection, isInCollection, isPending } = useSaves();
  const [name, setName] = useState("");
  const saved = savedPostIds.includes(postId);

  async function create() {
    const trimmed = name.trim();
    if (!trimmed) return;
    try { await addCollection(trimmed); setName(""); } catch { /* surfaced by query state */ }
  }

  return (
    <div className="collections-sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <motion.section initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="collections-sheet" role="dialog" aria-modal="true" aria-label="Collections" onMouseDown={(event) => event.stopPropagation()}>
        <header className="collections-sheet-header">
          <div><strong>Collections</strong><span>{saved ? "Post enregistré" : "Enregistre le post dans une collection"}</span></div>
          <button type="button" aria-label="Fermer" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="collections-list">
          {collections.map((collection) => {
            const selected = isInCollection(postId, collection.id);
            return (
              <button key={collection.id} type="button" className="collection-row" disabled={isPending} onClick={() => toggleCollection(postId, collection.id)}>
                <span className="collection-icon">▦</span>
                <span>{collection.name}</span>
                {selected && <Check size={18} />}
              </button>
            );
          })}
        </div>
        <div className="collection-create">
          <input value={name} onChange={(event) => setName(event.target.value.slice(0, 80))} placeholder="Nouvelle collection" maxLength={80} onKeyDown={(event) => { if (event.key === "Enter") void create(); }} />
          <button type="button" disabled={!name.trim() || isPending} onClick={() => void create()}><FolderPlus size={18} /></button>
        </div>
      </motion.section>
    </div>
  );
}
