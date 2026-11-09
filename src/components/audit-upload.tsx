"use client";

import { useActionState, useRef, useState } from "react";
import { FileUp, LoaderCircle, UploadCloud } from "lucide-react";
import { Feedback, buttonClass } from "@/components/ui";
import { uploadAuditFiles } from "@/lib/actions/audits";
import type { FormState } from "@/lib/form";

export function AuditUpload({ auditId }: { auditId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(uploadAuditFiles, {});
  const [names, setNames] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="auditId" value={auditId} />
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer.files.length && inputRef.current) {
            inputRef.current.files = event.dataTransfer.files;
            setNames([...event.dataTransfer.files].map((file) => file.name));
          }
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
          dragging ? "border-mint bg-mint/10" : names.length ? "border-mint/40 bg-mint/5" : "border-white/15 hover:border-white/30"
        }`}
      >
        <UploadCloud size={28} aria-hidden className="text-mint" />
        <span className="font-medium break-all">{names.length ? names.join(", ") : "Húzd ide a fájlokat, vagy kattints a tallózáshoz"}</span>
        <span className="text-xs text-white/45">Excel, CSV, PDF, Word, szöveg – együtt legfeljebb 4 MB, egyszerre legfeljebb 8 fájl</span>
        <input
          ref={inputRef}
          name="files"
          type="file"
          multiple
          accept=".xlsx,.csv,.pdf,.docx,.txt"
          required
          className="sr-only"
          onChange={(event) => setNames([...(event.target.files ?? [])].map((file) => file.name))}
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Feedback error={state.error} message={state.ok ? state.message : undefined} />
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? <LoaderCircle size={17} aria-hidden className="animate-spin" /> : <FileUp size={17} aria-hidden />}
          {pending ? "Ellenőrzés…" : "Feltöltés és ellenőrzés"}
        </button>
      </div>
    </form>
  );
}
