"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, ScanText } from "lucide-react";
import { Feedback, buttonClass } from "@/components/ui";
import { recognizeAuditFile } from "@/lib/actions/audits";
import type { FormState } from "@/lib/form";

/** Szövegfelismerés (OCR) utólagos indítása egy szkennelt ellenőri fájlon. */
export function OcrButton({ fileId, aiOn, again = false }: { fileId: string; aiOn: boolean; again?: boolean }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>({});
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending || !aiOn}
        title={aiOn ? undefined : "A szövegfelismeréshez AI-kulcs (GEMINI_API_KEY) kell."}
        onClick={() =>
          start(async () => {
            try {
              setState(await recognizeAuditFile(fileId));
            } catch {
              setState({ error: "A szövegfelismerés most nem sikerült, próbáld újra." });
            }
          })
        }
        className={buttonClass(again ? "secondary" : "primary", "sm")}
      >
        {pending ? <LoaderCircle size={15} aria-hidden className="animate-spin" /> : <ScanText size={15} aria-hidden />}
        {pending ? "Szöveg felismerése…" : again ? "Szövegfelismerés újra" : "Szöveg felismerése (OCR)"}
      </button>
      <Feedback error={state.error} message={state.ok ? state.message : undefined} />
    </div>
  );
}
