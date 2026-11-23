"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, FilePenLine, Languages, ListChecks, LoaderCircle, MessageSquareText, ScrollText, Sparkles, TableProperties, TriangleAlert, type LucideIcon } from "lucide-react";
import { Feedback, Select, buttonClass } from "@/components/ui";
import { openSourceInEditor, runDocumentTask, translateSource } from "@/lib/actions/doc-ai";
import { DOC_TASKS, type DocTask } from "@/lib/doc-tasks";
import { LANGUAGES, TONES, type Language, type Tone } from "@/lib/translations-meta";

const ICONS: Record<DocTask, LucideIcon> = {
  elemzes: Sparkles,
  osszefoglalo: ScrollText,
  kockazatok: TriangleAlert,
  kulcsadatok: TableProperties,
  teendok: ListChecks,
  egyeni: MessageSquareText,
};

type Source = { type: "library" | "audit"; id: string };

/**
 * Minden feltöltött dokumentumhoz: AI-feladatok (az eredmény a PannonGuard szerkesztőben nyílik meg), fordítás
 * bármelyik nyelvre, illetve a dokumentum megnyitása szerkesztésre.
 */
export function DocAiPanel({ source, aiOn, hasText }: { source: Source; aiOn: boolean; hasText: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [custom, setCustom] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [target, setTarget] = useState<Language>("hu");
  const [tone, setTone] = useState<Tone>("hivatalos");

  function go(key: string, run: () => Promise<{ id?: string; error?: string }>, href: (id: string) => string) {
    setError(undefined);
    setBusy(key);
    start(async () => {
      const result = await run();
      if (result.error || !result.id) {
        setError(result.error ?? "Nem sikerült.");
        setBusy(null);
        return;
      }
      router.push(href(result.id));
    });
  }

  const disabled = pending || !hasText;
  const task = (key: DocTask) => go(key, () => runDocumentTask({ source, task: key, prompt: key === "egyeni" ? prompt : undefined }), (id) => `/szerkeszto/${id}`);

  return (
    <section className="pg-panel space-y-5 rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-display text-lg font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-mint/15 text-mint">
            <Sparkles size={16} aria-hidden />
          </span>
          Mit kérsz a dokumentumról?
        </h2>
        <button
          type="button"
          disabled={pending}
          onClick={() => go("editor", () => openSourceInEditor(source), (id) => `/szerkeszto/${id}`)}
          className={buttonClass("secondary", "sm")}
        >
          {busy === "editor" ? <LoaderCircle size={15} aria-hidden className="animate-spin" /> : <FilePenLine size={15} aria-hidden />}
          Szerkesztés a PannonGuard szerkesztőben
        </button>
      </div>

      {!hasText && <p className="text-sm text-amber-200/80">Ebből a dokumentumból még nincs kiolvasott szöveg. Szkennelt iratnál futtasd a szövegfelismerést, utána elérhetők az AI-feladatok és a fordítás.</p>}
      {!aiOn && <p className="text-sm text-white/55">Az AI-feladatokhoz AI-kulcs kell a szerveren.</p>}

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {(Object.keys(DOC_TASKS) as DocTask[]).map((key) => {
          const Icon = ICONS[key];
          const active = busy === key;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled || !aiOn}
              onClick={() => (key === "egyeni" ? setCustom(!custom) : task(key))}
              className={`group flex items-start gap-3 rounded-2xl border p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                active || (key === "egyeni" && custom) ? "border-mint/50 bg-mint/10" : "border-white/8 bg-white/3 hover:border-mint/30 hover:bg-white/6"
              }`}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mint/12 text-mint ring-1 ring-mint/20">
                {active ? <LoaderCircle size={17} aria-hidden className="animate-spin" /> : <Icon size={17} aria-hidden />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{active ? "Dolgozom rajta…" : DOC_TASKS[key].label}</span>
                <span className="mt-0.5 block text-xs text-white/50">{DOC_TASKS[key].hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {custom && (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            task("egyeni");
          }}
        >
          <textarea
            autoFocus
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="Pl. „Írj belőle egy hivatalos levelet a beszállítónak a hiányzó számlákról” vagy „Hasonlítsd össze a 2025-ös feltételekkel”…"
            className="pg-field pg-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/25"
          />
          <div className="flex justify-end">
            <button type="submit" disabled={disabled || !aiOn || !prompt.trim()} className={buttonClass("primary", "sm")}>
              {busy === "egyeni" ? <LoaderCircle size={15} aria-hidden className="animate-spin" /> : <Sparkles size={15} aria-hidden />} Kérés elküldése
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-white/8 bg-white/3 p-3.5">
        <span className="flex items-center gap-2 self-center pr-2 text-sm font-semibold">
          <Languages size={17} aria-hidden className="text-mint" /> Fordítás
        </span>
        <Select value={target} onChange={(event) => setTarget(event.target.value as Language)} aria-label="Célnyelv" className="h-9 w-auto text-sm">
          {Object.entries(LANGUAGES).map(([code, name]) => (
            <option key={code} value={code}>
              {name[0].toUpperCase() + name.slice(1)}
            </option>
          ))}
        </Select>
        <Select value={tone} onChange={(event) => setTone(event.target.value as Tone)} aria-label="Hangnem" className="h-9 w-auto text-sm">
          {Object.entries(TONES).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </Select>
        <button
          type="button"
          disabled={disabled}
          onClick={() => go("translate", () => translateSource({ source, target, tone }), (id) => `/forditas/${id}`)}
          className={buttonClass("primary", "sm")}
        >
          {busy === "translate" ? <LoaderCircle size={15} aria-hidden className="animate-spin" /> : <ClipboardList size={15} aria-hidden />}
          {busy === "translate" ? "Fordítás…" : "Lefordítom"}
        </button>
      </div>

      <Feedback error={error} />
    </section>
  );
}
