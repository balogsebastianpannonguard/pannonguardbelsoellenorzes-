"use client";

import { Trash2 } from "lucide-react";
import { buttonClass } from "@/components/ui";

/** Megerősítéses törlés; a `action` egy szerverművelet, amely a rejtett `id` mezőt kapja. */
export function AuditDelete({
  id,
  action,
  confirmText,
  label = "Törlés",
  compact = false,
}: {
  id: string;
  action: (formData: FormData) => Promise<void>;
  confirmText: string;
  label?: string;
  compact?: boolean;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" aria-label={label} title={label} className={buttonClass("danger", "sm")}>
        <Trash2 size={15} aria-hidden /> {!compact && label}
      </button>
    </form>
  );
}
