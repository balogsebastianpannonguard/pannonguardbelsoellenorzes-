"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle, UploadCloud } from "lucide-react";
import { Feedback, buttonClass } from "@/components/ui";
import { uploadLibraryFiles } from "@/lib/actions/library";
import type { FormState } from "@/lib/form";
import { useKeepForm, uploadTooBig } from "@/components/use-keep-form";

export function LibraryUpload({ accept }: { accept: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState, FormData>(uploadLibraryFiles, {});
  const [names, setNames] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { ref, onSubmit, clientError, clearClientError } = useKeepForm(action, state, { resetOnOk: true, check: uploadTooBig, onReset: () => setNames([]) });

  // Egy dokumentumnál rögtön a megtekintésre lépünk.
  useEffect(() => {
    if (state.ok && state.id) router.push(`/dokumentumok/${state.id}`);
  }, [state, router]);

  const pick = (files: FileList | null) => {
    setNames([...(files ?? [])].map((file) => file.name));
    clearClientError();
  };

  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-4">
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
            pick(event.dataTransfer.files);
          }
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragging ? "border-mint bg-mint/10" : names.length ? "border-mint/40 bg-mint/5" : "border-white/15 hover:border-white/30"
        }`}
      >
        <span className="grid size-14 place-items-center rounded-2xl bg-mint/12 text-mint ring-1 ring-mint/20">
          <UploadCloud size={28} aria-hidden />
        </span>
        <span className="mt-1 font-medium break-all">{names.length ? names.join(", ") : "Húzd ide a dokumentumokat, vagy kattints a tallózáshoz"}</span>
        <span className="text-xs text-white/45">PDF (szkennelt is), Word (.docx, .doc), TXT, fénykép – egyszerre legfeljebb 10 fájl, együtt 4 MB</span>
        <input ref={inputRef} name="files" type="file" multiple accept={accept} required className="sr-only" onChange={(event) => pick(event.target.files)} />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Feedback error={clientError ?? state.error} message={state.ok ? state.message : undefined} />
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? <LoaderCircle size={17} aria-hidden className="animate-spin" /> : <FileUp size={17} aria-hidden />}
          {pending ? "Feltöltés és olvasás…" : "Feltöltés"}
        </button>
      </div>
    </form>
  );
}
