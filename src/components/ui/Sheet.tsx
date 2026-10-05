"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

/** Bottom sheet on phones, centred dialog on wider screens. Uses the native <dialog>. */
export function Sheet({
  open,
  onClose,
  title,
  closeLabel = "Close",
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  closeLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on backdrop
      }}
      className={cn(
        "m-0 mt-auto w-full max-w-none rounded-t-3xl bg-white p-0 backdrop:bg-forest/40 backdrop:backdrop-blur-sm",
        "sm:m-auto sm:max-w-lg sm:rounded-3xl",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <h2 className="text-lg font-bold text-forest">{title}</h2>
        <button type="button" onClick={onClose} aria-label={closeLabel} className="grid min-h-11 min-w-11 place-items-center rounded-lg hover:bg-mint">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto p-4">{children}</div>
    </dialog>
  );
}
