"use client";

import { useActionState, useRef, useState } from "react";
import { FileUp, LoaderCircle, UploadCloud } from "lucide-react";
import { Feedback, Input, Label, buttonClass } from "@/components/ui";
import { uploadDataset } from "@/lib/actions/datasets";
import type { FormState } from "@/lib/form";

export function DatasetUpload() {
  const [state, action, pending] = useActionState<FormState, FormData>(uploadDataset, {});
  const [fileName, setFileName] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form action={action} className="space-y-4">
      <Label label="Név" hint="Ha üresen hagyod, a fájl neve lesz.">
        <Input name="name" maxLength={120} placeholder="Pl. 2026. évi beszerzések" />
      </Label>
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file && inputRef.current) {
            const transfer = new DataTransfer();
            transfer.items.add(file);
            inputRef.current.files = transfer.files;
            setFileName(file.name);
          }
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
          dragging ? "border-mint bg-mint/10" : fileName ? "border-mint/40 bg-mint/5" : "border-white/15 hover:border-white/30"
        }`}
      >
        <UploadCloud size={28} aria-hidden className="text-mint" />
        <span className="font-medium break-all">{fileName || "Húzd ide a táblázatot, vagy kattints a tallózáshoz"}</span>
        <span className="text-xs text-white/45">Excel (.xlsx) vagy CSV – legfeljebb 4 MB, az első 5000 sor kerül be</span>
        <input
          ref={inputRef}
          name="file"
          type="file"
          accept=".xlsx,.csv"
          required
          className="sr-only"
          onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Feedback error={state.error} message={state.ok ? state.message : undefined} />
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? <LoaderCircle size={17} aria-hidden className="animate-spin" /> : <FileUp size={17} aria-hidden />}
          {pending ? "Feldolgozás…" : "Feltöltés"}
        </button>
      </div>
    </form>
  );
}
