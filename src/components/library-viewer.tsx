"use client";

import { useState, useTransition } from "react";
import { Check, Columns2, Copy, Eye, FileText, LoaderCircle, ScanText, Trash2 } from "lucide-react";
import { Feedback, buttonClass } from "@/components/ui";
import { deleteLibraryFile, recognizeLibraryFile } from "@/lib/actions/library";
import type { LibraryKind } from "@/lib/library";

type View = "preview" | "text" | "both";

/** Előnézet + kinyert szöveg, fülekkel (széles képernyőn egymás mellett is). */
export function LibraryViewer({ name, kind, text, html, rawUrl }: { name: string; kind: LibraryKind; text: string; html?: string; rawUrl: string }) {
  const [view, setView] = useState<View>("both");
  const [copied, setCopied] = useState(false);

  const preview =
    kind === "pdf" ? (
      <iframe src={rawUrl} title={`${name} előnézete`} className="h-[78vh] w-full rounded-2xl border border-white/10 bg-white" />
    ) : kind === "image" ? (
      // eslint-disable-next-line @next/next/no-img-element -- hitelesített saját végpont, optimalizálás nélkül
      <img src={rawUrl} alt={name} className="mx-auto max-h-[78vh] rounded-2xl border border-white/10 bg-white object-contain" />
    ) : kind === "docx" && html !== undefined ? (
      <iframe
        sandbox=""
        title={`${name} előnézete`}
        className="h-[78vh] w-full rounded-2xl border border-white/10 bg-[#e9ecef]"
        srcDoc={`<!doctype html><html lang="hu"><head><meta charset="utf-8"><style>
          body{margin:0;padding:28px 16px;background:#e9ecef;font:15px/1.6 Georgia,"Times New Roman",serif;color:#1f2328}
          .page{max-width:780px;margin:0 auto;background:#fff;padding:56px 64px;box-shadow:0 4px 24px rgba(0,0,0,.12);border-radius:4px}
          img{max-width:100%;height:auto} table{border-collapse:collapse;width:100%;margin:12px 0} td,th{border:1px solid #c9ccd1;padding:6px 8px;vertical-align:top}
          h1,h2,h3{font-family:Arial,sans-serif;line-height:1.25} p{margin:0 0 10px}
          @media (max-width:640px){.page{padding:28px 20px}}
        </style></head><body><div class="page">${html || "<p><em>A dokumentum üres.</em></p>"}</div></body></html>`}
      />
    ) : (
      <div className="h-[78vh] overflow-y-auto rounded-2xl bg-[#e9ecef] px-4 py-7 [scrollbar-width:thin]">
        <div className="mx-auto max-w-[780px] rounded bg-white px-8 py-12 font-serif text-[15px] leading-relaxed whitespace-pre-wrap text-[#1f2328] shadow-lg [overflow-wrap:anywhere] sm:px-16">
          {text || "A dokumentum üres."}
        </div>
      </div>
    );

  const textPanel = (
    <div className="flex h-[78vh] flex-col rounded-2xl border border-white/8 bg-ink-950/50">
      <div className="flex items-center justify-between gap-2 border-b border-white/8 px-4 py-2.5">
        <span className="text-xs text-white/45">{text ? `${text.length.toLocaleString("hu-HU")} karakter` : "Nincs kinyert szöveg"}</span>
        <button
          type="button"
          disabled={!text}
          onClick={async () => {
            await navigator.clipboard.writeText(text).catch(() => undefined);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          className={buttonClass("secondary", "sm")}
        >
          {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />} {copied ? "Másolva" : "Szöveg másolása"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 text-sm leading-relaxed whitespace-pre-wrap text-white/80 [overflow-wrap:anywhere] [scrollbar-width:thin]">
        {text || <span className="text-white/45">Ebből a dokumentumból nem sikerült szöveget kinyerni.</span>}
      </div>
    </div>
  );

  const tabs: { id: View; label: string; icon: typeof Eye; wide?: boolean }[] = [
    { id: "preview", label: "Előnézet", icon: Eye },
    { id: "text", label: "Szöveg", icon: FileText },
    { id: "both", label: "Egymás mellett", icon: Columns2 },
  ];

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Nézet" className="inline-flex rounded-2xl border border-white/10 bg-white/4 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={view === tab.id}
            onClick={() => setView(tab.id)}
            className={`${tab.wide ? "hidden lg:inline-flex" : "inline-flex"} items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
              view === tab.id ? "bg-mint text-ink-950 shadow" : "text-white/60 hover:text-white"
            }`}
          >
            <tab.icon size={15} aria-hidden /> {tab.label}
          </button>
        ))}
      </div>
      {view === "both" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {preview}
          {textPanel}
        </div>
      ) : view === "text" ? (
        textPanel
      ) : (
        preview
      )}
    </div>
  );
}

export function LibraryActions({ id, canOcr, ocrDone }: { id: string; canOcr: boolean; ocrDone: boolean }) {
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<{ error?: string; message?: string }>({});
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canOcr && (
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => setNotice(await recognizeLibraryFile(id)))}
          className={buttonClass("secondary")}
        >
          {pending ? <LoaderCircle size={16} aria-hidden className="animate-spin" /> : <ScanText size={16} aria-hidden />}
          {ocrDone ? "Szövegfelismerés újra" : "Szövegfelismerés (OCR)"}
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Biztosan törlöd ezt a dokumentumot?")) start(async () => deleteLibraryFile(id));
        }}
        className={buttonClass("danger")}
      >
        <Trash2 size={16} aria-hidden /> Törlés
      </button>
      <Feedback error={notice.error} message={notice.message} />
    </div>
  );
}
