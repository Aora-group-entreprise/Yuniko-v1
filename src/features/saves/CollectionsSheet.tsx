import { Check, FolderPlus, X } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { DEFAULT_COLLECTION_ID } from "./saves.service";
import { useSavesStore } from "./saves.store";

export function CollectionsSheet({ postId, onClose }: { postId: string; onClose: () => void }) {
  const collections = useSavesStore((state) => state.collections);
  const savedPostIds = useSavesStore((state) => state.savedPostIds);
  const toggleCollection = useSavesStore((state) => state.toggleCollection);
  const addCollection = useSavesStore((state) => state.addCollection);
  const isInCollection = useSavesStore((state) => state.isInCollection);
  const [name, setName] = useState("");
  const saved = savedPostIds.includes(postId);

  function create() {
    const collection = addCollection(name);
    if (collection) setName("");
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
              <button key={collection.id} type="button" className="collection-row" onClick={() => toggleCollection(postId, collection.id)}>
                <span className="collection-icon">{collection.id === DEFAULT_COLLECTION_ID ? "★" : "▦"}</span>
                <span>{collection.name}</span>
                {selected && <Check size={18} />}
              </button>
            );
          })}
        </div>
        <div className="collection-create">
          <input value={name} onChange={(event) => setName(event.target.value.slice(0, 80))} placeholder="Nouvelle collection" maxLength={80} onKeyDown={(event) => { if (event.key === "Enter") create(); }} />
          <button type="button" disabled={!name.trim()} onClick={create}><FolderPlus size={18} /></button>
        </div>
      </motion.section>
    </div>
  );
}
