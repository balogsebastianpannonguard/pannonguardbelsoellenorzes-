"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { ExternalLink, LoaderCircle, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { Feedback, Input, Label, Pill, Textarea, buttonClass } from "@/components/ui";
import { addLaw, checkEverything, checkOne, deleteLaw, saveLawMeta } from "@/lib/actions/legal";
import { formatStamp } from "@/lib/dates";
import type { FormState } from "@/lib/form";
import type { LawRow } from "@/lib/legal";

export function CheckAllButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await checkEverything();
            setError(result.error);
          })
        }
        className={buttonClass("primary")}
      >
        {pending ? <LoaderCircle size={17} aria-hidden className="animate-spin" /> : <RefreshCw size={17} aria-hidden />}
        {pending ? "Ellenőrzés…" : "Mind ellenőrzése most"}
      </button>
      {error && <span role="alert" className="text-sm text-red-300">{error}</span>}
    </div>
  );
}

const STATE: Record<LawRow["state"], { label: string; tone: "ok" | "warning" | "error" | "muted" }> = {
  unknown: { label: "Még nem ellenőrzött", tone: "muted" },
  same: { label: "Nincs változás", tone: "ok" },
  changed: { label: "Változás észlelve", tone: "warning" },
  error: { label: "Nem sikerült ellenőrizni", tone: "error" },
};

export function LawCard({ law, aiOn }: { law: LawRow; aiOn: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [metaState, metaAction, metaPending] = useActionState<FormState, FormData>(saveLawMeta, {});
  const state = STATE[law.state];

  return (
    <article className={`pg-card rounded-2xl p-5 ${law.state === "changed" ? "border-amber-300/30" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold">{law.name}</h3>
          <p className="text-sm text-white/55">{law.cite}</p>
        </div>
        <Pill tone={state.tone}>{state.label}</Pill>
      </div>
      {law.why && <p className="mt-3 text-sm text-white/65">{law.why}</p>}

      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/45">
        <a href={law.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-mint underline underline-offset-4">
          Megnyitás a Jogszabálytárban <ExternalLink size={12} aria-hidden />
        </a>
        <span>Utolsó ellenőrzés: {law.checkedAt ? formatStamp(new Date(law.checkedAt)) : "–"}</span>
        {law.changedAt && <span>Utolsó változás: {formatStamp(new Date(law.changedAt))}</span>}
      </p>

      {law.state === "error" && (
        <p className="mt-3 rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-100">
          A jogszabály szövegét nem sikerült letölteni ({law.error ?? "ismeretlen hiba"}). A következő ellenőrzéskor újra próbáljuk.
        </p>
      )}

      {law.state === "changed" && (
        <div className="mt-4 space-y-3 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4">
          {law.summary ? (
            <p className="text-sm leading-relaxed text-white/80">{law.summary}</p>
          ) : (
            <p className="text-sm text-white/55">
              {aiOn ? "Az összefoglaló nem készült el, a változás szövegrészei alább láthatók." : "Összefoglaló nincs: az AI-hoz GEMINI_API_KEY szükséges. A változás szövegrészei alább láthatók."}
            </p>
          )}
          <details className="text-sm">
            <summary className="cursor-pointer text-white/70 hover:text-white">Változott szövegrészek</summary>
            <div className="mt-3 space-y-2">
              {law.added.map((part, index) => (
                <p key={`a${index}`} className="rounded-lg bg-emerald-400/8 px-3 py-2 text-emerald-100/90">+ {part}</p>
              ))}
              {law.removed.map((part, index) => (
                <p key={`r${index}`} className="rounded-lg bg-red-500/8 px-3 py-2 text-red-100/90">− {part}</p>
              ))}
            </div>
          </details>
        </div>
      )}

      <form action={metaAction} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
        <input type="hidden" name="id" value={law.id} />
        <Label label="Érintett belső szabályzat / teendő">
          <Textarea name="note" defaultValue={law.note} maxLength={1000} className="min-h-16" placeholder="Pl. Adatkezelési szabályzat felülvizsgálata" />
        </Label>
        <Label label="Hatálybalépés">
          <Input name="effectiveDate" type="date" defaultValue={law.effectiveDate} />
        </Label>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
          <Feedback error={metaState.error} message={metaState.ok ? metaState.message : undefined} />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={metaPending} className={buttonClass("secondary", "sm")}>
              {metaPending ? <LoaderCircle size={15} aria-hidden className="animate-spin" /> : <Save size={15} aria-hidden />}
              Megjegyzés mentése
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await checkOne(law.id);
                  setError(result.error);
                })
              }
              className={buttonClass("secondary", "sm")}
            >
              {pending ? <LoaderCircle size={15} aria-hidden className="animate-spin" /> : <RefreshCw size={15} aria-hidden />}
              Ellenőrzés most
            </button>
            {law.custom && (
              <button
                type="button"
                disabled={pending}
                aria-label={`${law.name} törlése`}
                onClick={() => {
                  if (window.confirm(`Biztosan törlöd a figyelésből: ${law.name}?`)) {
                    startTransition(async () => {
                      const result = await deleteLaw(law.id);
                      setError(result.error);
                    });
                  }
                }}
                className={buttonClass("danger", "sm")}
              >
                <Trash2 size={15} aria-hidden /> Törlés
              </button>
            )}
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-red-300 sm:col-span-2">{error}</p>}
      </form>
    </article>
  );
}

export function AddLawForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(async (previous, formData) => {
    const result = await addLaw(previous, formData);
    if (result.ok) formRef.current?.reset();
    return result;
  }, {});

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <Label label="Jogszabály neve">
        <Input name="name" required minLength={3} maxLength={160} placeholder="Pl. Adózás rendjéről szóló törvény" />
      </Label>
      <Label label="Hivatkozás">
        <Input name="cite" required minLength={3} maxLength={120} placeholder="Pl. 2017. évi CL. törvény" />
      </Label>
      <Label label="Jogszabálytár-cím" hint="A Nemzeti Jogszabálytár oldalának címe, https://njt.hu/…">
        <Input name="url" type="url" required maxLength={300} placeholder="https://njt.hu/jogszabaly/2017-150-00-00" />
      </Label>
      <Label label="Miért releváns?">
        <Textarea name="why" maxLength={400} className="min-h-20" placeholder="Nem kötelező" />
      </Label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Feedback error={state.error} message={state.ok ? state.message : undefined} />
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? <LoaderCircle size={17} aria-hidden className="animate-spin" /> : <Plus size={17} aria-hidden />}
          {pending ? "Felvétel és ellenőrzés…" : "Jogszabály felvétele"}
        </button>
      </div>
    </form>
  );
}
