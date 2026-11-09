"use client";

import { Trash2 } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { deleteDataset } from "@/lib/actions/datasets";

export function DatasetDelete({ id }: { id: string }) {
  return (
    <form
      action={deleteDataset}
      onSubmit={(event) => {
        if (!window.confirm("Biztosan törlöd ezt az adatkészletet? A művelet nem vonható vissza.")) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={buttonClass("danger", "sm")}>
        <Trash2 size={15} aria-hidden /> Törlés
      </button>
    </form>
  );
}
