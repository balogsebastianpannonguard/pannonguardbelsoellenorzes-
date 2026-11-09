"use client";

import { useActionState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { analyzeDataset, type AnalysisState } from "@/lib/actions/datasets";

export function DatasetAnalysis({ id }: { id: string }) {
  const [state, action, pending] = useActionState<AnalysisState, FormData>(analyzeDataset, {});

  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="id" value={id} />
        <button type="submit" disabled={pending} className={buttonClass("secondary")}>
          {pending ? <LoaderCircle size={17} aria-hidden className="animate-spin" /> : <Sparkles size={17} aria-hidden />}
          {pending ? "Elemzés…" : "Elemzés kérése"}
        </button>
        <p className="max-w-xl text-xs text-white/45">
          Az oszlopprofil és az első 100 sor a Google Gemini szolgáltatóhoz kerül feldolgozásra. Személyes vagy bizalmas adatot tartalmazó táblázatnál ezt vedd figyelembe.
        </p>
      </form>
      {state.error && (
        <p role="alert" className="text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state.text && (
        <div className="rounded-2xl border border-violet-bright/20 bg-violet/8 p-4 text-sm leading-relaxed whitespace-pre-wrap text-white/80">{state.text}</div>
      )}
    </div>
  );
}
