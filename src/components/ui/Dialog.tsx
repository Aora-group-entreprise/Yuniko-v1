import * as DialogPrimitive from "radix-ui";
import type { ReactNode } from "react";

export function Dialog({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode }) {
  return (
    <DialogPrimitive.Dialog.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Dialog.Portal>
        <DialogPrimitive.Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 100 }} />
        <DialogPrimitive.Dialog.Content aria-describedby={undefined} style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(92vw,520px)", maxHeight: "86vh", overflow: "auto", zIndex: 101 }}>
          <DialogPrimitive.Dialog.Title>{title}</DialogPrimitive.Dialog.Title>
          {children}
          <DialogPrimitive.Dialog.Close aria-label="Close">Close</DialogPrimitive.Dialog.Close>
        </DialogPrimitive.Dialog.Content>
      </DialogPrimitive.Dialog.Portal>
    </DialogPrimitive.Dialog.Root>
  );
}
