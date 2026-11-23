"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, FileStack, LoaderCircle, ScanText, Sparkles, X } from "lucide-react";
import { KIND_LABEL } from "@/components/library-kinds";
import { Pill, buttonClass } from "@/components/ui";
import { summarizeDocuments } from "@/lib/actions/doc-ai";
import type { LibraryKind } from "@/lib/library";

export type GridDoc = { id: string; name: string; kind: LibraryKind; meta: string; snippet: string; notice?: string; stamp: string; ocr: boolean };

/** A dokumentumok rácsa kijelöléssel: a kijelöltek egy PDF-be fűzhetők, vagy közös AI-összefoglaló kérhető róluk. */
export function LibraryGrid({ docs, aiOn }: { docs: GridDoc[]; aiOn: boolean }) {
  const router = useRouter();
  // A kijelölés sorrendje = az összefűzés sorrendje.
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  function summarize() {
    setError(undefined);
    start(async () => {
      const result = await summarizeDocuments(selected);
      if (result.id) router.push(`/szerkeszto/${result.id}`);
      else setError(result.error ?? "Nem sikerült.");
    });
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-white/50">
        <span>Jelöld ki a dokumentumokat a sarokban lévő négyzettel – a kijelölés sorrendjében fűzöm össze őket.</span>
        {selected.length < docs.length && (
          <button type="button" onClick={() => setSelected(docs.map((doc) => doc.id))} className="text-mint hover:underline">
            Mind kijelölése
          </button>
        )}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {docs.map((doc) => {
          const kind = KIND_LABEL[doc.kind];
          const position = selected.indexOf(doc.id);
          const checked = position >= 0;
          return (
            <li key={doc.id} className="relative">
              <Link
                href={`/dokumentumok/${doc.id}`}
                className={`pg-card group flex h-full flex-col gap-3 rounded-2xl border p-4 pr-12 transition hover:bg-white/5 ${checked ? "border-mint/45 bg-mint/6" : "border-white/8 bg-white/3"}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-xl ring-1 ${kind.tone}`}>
                    <kind.icon size={20} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium group-hover:text-mint" title={doc.name}>
                      {doc.name}
                    </p>
                    <p className="text-xs text-white/45">{doc.meta}</p>
                  </div>
                </div>
                <p className="line-clamp-3 flex-1 text-xs leading-relaxed text-white/55">
                  {doc.snippet || <span className="text-white/35 italic">{doc.notice ?? "Nincs kinyert szöveg."}</span>}
                </p>
                <div className="flex items-center justify-between gap-2 text-xs text-white/40">
                  <span className="truncate">{doc.stamp}</span>
                  {doc.ocr && (
                    <Pill tone="info" icon={ScanText}>
                      OCR
                    </Pill>
                  )}
                </div>
              </Link>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                aria-label={`${doc.name} kijelölése`}
                onClick={() => toggle(doc.id)}
                className={`absolute top-3 right-3 grid size-7 place-items-center rounded-lg border text-xs font-bold transition ${
                  checked ? "border-mint bg-mint text-ink-950" : "border-white/20 bg-ink-900/60 text-transparent hover:border-mint/60"
                }`}
              >
                {checked ? position + 1 : <Check size={14} aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>

      {selected.length > 0 && (
        <div className="pg-wn-pop sticky bottom-4 z-30 mt-5 mr-0 flex sm:mr-20 flex-wrap items-center gap-2 rounded-2xl border border-mint/30 bg-ink-900/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <span className="px-2 text-sm font-semibold">{selected.length} kijelölve</span>
          <a href={`/dokumentumok/osszefuzes?ids=${selected.join(",")}`} className={buttonClass("primary", "sm")}>
            <FileStack size={15} aria-hidden /> PDF-be fűzés
          </a>
          <button type="button" disabled={pending || !aiOn} onClick={summarize} className={buttonClass("secondary", "sm")}>
            {pending ? <LoaderCircle size={15} aria-hidden className="animate-spin" /> : <Sparkles size={15} aria-hidden />}
            {pending ? "Összefoglaló készül…" : "AI-összefoglaló"}
          </button>
          <button type="button" onClick={() => setSelected([])} className={`${buttonClass("ghost", "sm")} ml-auto`}>
            <X size={15} aria-hidden /> Kijelölés törlése
          </button>
          {error && <p className="w-full px-2 text-sm text-red-300">{error}</p>}
        </div>
      )}
    </>
  );
}
