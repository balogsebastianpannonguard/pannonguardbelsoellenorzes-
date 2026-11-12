"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type DragEvent } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  ExternalLink,
  FileCheck2,
  FileUp,
  LoaderCircle,
  RefreshCw,
  Scale,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { AreaChart, Bar, Confetti, Ring, Tile } from "@/components/pajzs/charts";
import type { PajzsApi } from "@/components/pajzs/api";
import { DOC_TYPES, type DigitizeResult, type DocData, type Insights, type LegalRow } from "@/lib/pajzs-types";

const SectionTitle = ({ n, children, hint }: { n?: string; children: string; hint?: string }) => (
  <div className="mb-2.5 flex items-baseline gap-2">
    {n && <span className="font-mono text-[0.65rem] font-bold text-mint/80">{n}</span>}
    <h3 className="text-[0.7rem] font-bold tracking-[0.16em] text-white/55 uppercase">{children}</h3>
    {hint && <span className="ml-auto text-[0.65rem] text-white/35">{hint}</span>}
  </div>
);

const dateFmt = new Intl.DateTimeFormat("hu-HU", { timeZone: "Europe/Budapest", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const stamp = (iso?: string) => (iso ? dateFmt.format(new Date(iso)) : "még nem volt");

export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="pg-skeleton h-20 rounded-2xl" style={{ animationDelay: `${index * 120}ms` }} />
      ))}
    </div>
  );
}

/* ---------- 01 + 02: Megállapítások, pályázatok, javaslatok, munkaterületek ---------- */

const SEVERITY_COLOR: Record<string, string> = { kritikus: "#f87171", magas: "#fbbf24", kozepes: "#a78bfa", alacsony: "#6ee7b7" };

export function StatsTab({ data, frameRef }: { data: Insights; frameRef: React.RefObject<HTMLDivElement | null> }) {
  const { findings, tenders, recommendations, work } = data;
  const closedTone = findings.closedPct >= 75 ? "#34d399" : findings.closedPct >= 40 ? "#fbbf24" : "#f87171";
  const maxSeverity = Math.max(1, ...findings.severity.map((item) => item.count));
  return (
    <div className="space-y-6 p-4">
      <section>
        <SectionTitle n="01" hint="Hiányosságok">
          Megállapítások
        </SectionTitle>
        <Link href="/hianyossagok" className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/4 p-4 transition hover:border-mint/40">
          <Ring value={findings.closedPct} tone={closedTone}>
            <span>
              <span className="block font-display text-2xl leading-none font-semibold">{findings.closedPct}%</span>
              <span className="mt-1 block text-[0.6rem] tracking-wider text-white/50 uppercase">lezárva</span>
            </span>
          </Ring>
          <div className="grid flex-1 grid-cols-3 gap-2 text-center">
            <Tile label="Összes" value={findings.total} />
            <Tile label="Nyitott" value={findings.open} tone={findings.open ? "text-amber-300" : "text-white"} />
            <Tile label="Lejárt" value={findings.overdue} tone={findings.overdue ? "text-red-300" : "text-emerald-300"} />
          </div>
        </Link>

        <div className="mt-3 space-y-2.5 rounded-2xl border border-white/8 bg-white/4 p-4">
          <p className="text-xs font-semibold text-white/70">Nyitott megállapítások súlyosság szerint</p>
          {findings.severity.map((item) => (
            <div key={item.key}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                <span className="text-white/85">{item.label}</span>
                <b style={{ color: item.count ? SEVERITY_COLOR[item.key] : undefined }}>{item.count}</b>
              </div>
              <Bar value={(item.count / maxSeverity) * 100} tone={SEVERITY_COLOR[item.key]} />
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-2xl border border-white/8 bg-white/4 p-4">
          <p className="mb-2 text-xs font-semibold text-white/70">Új megállapítások hetente – utolsó 8 hét</p>
          <AreaChart data={findings.trend.map((week) => ({ label: week.label, value: week.count }))} label="Új megállapítások hetente az elmúlt 8 hétben" />
        </div>
      </section>

      <section ref={frameRef}>
        <SectionTitle n="02" hint={`${tenders.active} aktív`}>
          Pályázati határidők
        </SectionTitle>
        {tenders.items.length === 0 ? (
          <p className="rounded-2xl border border-white/8 bg-white/4 p-4 text-xs text-white/50">
            Nincs aktív pályázat. Újat a <Link href="/palyazatok" className="text-mint underline-offset-2 hover:underline">/palyazatok</Link> oldalon vehetsz fel.
          </p>
        ) : (
          <ul className="space-y-2">
            {tenders.items.map((tender) => {
              const late = tender.daysLeft < 0;
              const tone = late || (tender.daysLeft <= 3 && tender.missing) ? "text-red-300" : tender.daysLeft <= 7 ? "text-amber-300" : "text-emerald-300";
              return (
                <li key={tender.id}>
                  <Link href={`/palyazatok/${tender.id}`} className="block rounded-2xl border border-white/8 bg-white/4 p-3 transition hover:border-mint/40">
                    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
                      <span className="truncate font-semibold text-white/90">{tender.name}</span>
                      <span className={`shrink-0 font-semibold ${tone}`}>{late ? `${-tender.daysLeft} napja lejárt` : tender.daysLeft === 0 ? "ma" : `${tender.daysLeft} nap`}</span>
                    </div>
                    <Bar value={tender.progress} />
                    <p className="mt-1.5 flex justify-between text-[0.66rem] text-white/45">
                      <span>
                        {tender.status} · {tender.deadline}
                      </span>
                      <span>{tender.missing ? `${tender.missing} elem hiányzik` : "minden elem kész"} · {tender.progress}%</span>
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle n="03" hint="Javaslattétel">
          Javaslatok
        </SectionTitle>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Tile label="Tervezet" value={recommendations.draft} tone={recommendations.draft ? "text-violet-bright" : "text-white"} />
          <Tile label="Jóváhagyva" value={recommendations.approved} tone="text-emerald-300" />
          <Tile label="Elutasítva" value={recommendations.rejected} />
        </div>
        <div className="mt-3 rounded-2xl border border-white/8 bg-white/4 p-4">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="font-semibold text-white/70">Nyitott megállapítás javaslattal</span>
            <b>{recommendations.coveragePct}%</b>
          </div>
          <Bar value={recommendations.coveragePct} />
          <p className="mt-2 text-[0.7rem] leading-snug text-white/50">
            {recommendations.coveragePct < 100
              ? "Ahol még nincs javaslat, a megállapítás oldalán az AI egy kattintással vázlatot készít."
              : "Minden nyitott megállapításhoz tartozik javaslat."}
          </p>
        </div>
      </section>

      <section>
        <SectionTitle n="04">Munkaterületek számokban</SectionTitle>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Tile label="Ellenőrzés" value={work.audits} />
          <Tile label="Ellenőri fájl" value={work.files} />
          <Tile label="Adatállomány" value={work.datasets} />
          <Tile label="Fordítás" value={work.translations} />
          <Tile label="Irat" value={work.documents} hint="digitalizálva" />
          <Tile label="Pályázat" value={tenders.active} hint="aktív" />
        </div>
      </section>
    </div>
  );
}

/* ---------- 03: Teendők és eltérések ---------- */

export function AnomaliesTab({ data }: { data: Insights }) {
  const { errors, warnings, items } = data.anomalies;
  const clean = errors + warnings === 0;
  return (
    <div className="space-y-4 p-4">
      <SectionTitle n="03" hint="Élő ellenőrzés">
        Teendők és eltérések
      </SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <Tile label="Sürgős" value={errors} tone={errors ? "text-red-300" : "text-white"} hint="lejárt vagy kritikus" />
        <Tile label="Figyelendő" value={warnings} tone={warnings ? "text-amber-300" : "text-white"} hint="hiányzó adat, várakozó tétel" />
      </div>

      {clean ? (
        <div className="pg-pop grid place-items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/8 px-4 py-10 text-center">
          <CheckCircle2 size={38} className="text-emerald-300" aria-hidden />
          <p className="font-display text-lg font-semibold">Minden rendben</p>
          <p className="text-xs text-white/55">Nincs lejárt határidő, felelős nélküli súlyos megállapítás, várakozó javaslat vagy hibás ellenőri fájl.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => {
            const tone =
              item.level === "warning"
                ? { box: "border-amber-300/25 bg-amber-300/8", icon: <AlertTriangle size={16} className="text-amber-300" aria-hidden /> }
                : { box: "border-red-400/30 bg-red-500/10", icon: <AlertOctagon size={16} className="text-red-300" aria-hidden /> };
            return (
              <li key={index} className="pg-pop" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
                <Link href={item.href} className={`flex items-start gap-2.5 rounded-xl border p-3 transition hover:brightness-125 ${tone.box}`}>
                  <span className="mt-0.5 shrink-0">{tone.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="mb-0.5 flex items-center gap-2 text-[0.65rem] font-semibold tracking-wide text-white/50">
                      <span className="shrink-0 rounded bg-white/8 px-1.5 py-0.5 uppercase">{item.area}</span>
                      <span className="truncate">{item.title}</span>
                      {item.date && <span className="ml-auto shrink-0 font-mono">{item.date}</span>}
                    </span>
                    <span className="block text-[0.8rem] leading-snug text-white/90">{item.message}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[0.7rem] leading-snug text-white/40">
        Pajzs a megállapításokat, javaslatokat, pályázatokat és a beérkezett ellenőri fájlokat veti össze: lejárt határidők, felelős vagy határidő nélküli súlyos tételek, javaslat nélküli megállapítások, régóta várakozó tervezetek, formai hibák.
      </p>
    </div>
  );
}

/* ---------- 04: Iratok digitalizálása, tömeges feldolgozás ---------- */

function csvOf(results: DigitizeResult[]) {
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const head = ["Fájl", "Típus", "Cím", "Kelt", "Felek", "Összegek", "Határidők", "Összefoglaló", "Teendők", "Hibák / eltérések", "Biztonság"];
  const rows = results
    .filter((item): item is DigitizeResult & { data: DocData } => item.ok && Boolean(item.data))
    .map(({ fileName, data }) =>
      [
        fileName,
        DOC_TYPES[data.docType] ?? data.docType,
        data.title,
        data.date,
        data.parties.join("; "),
        data.amounts.map((a) => `${a.label}: ${a.value} ${a.currency}`).join("; "),
        data.deadlines.map((d) => `${d.label}: ${d.date}`).join("; "),
        data.summary,
        data.actionItems.join("; "),
        data.issues.join("; "),
        data.confidence,
      ]
        .map(cell)
        .join(","),
    );
  return `﻿${[head.map(cell).join(","), ...rows].join("\r\n")}`;
}

function DocCard({ result }: { result: DigitizeResult }) {
  const [open, setOpen] = useState(false);
  if (!result.ok || !result.data) {
    return (
      <li className="flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs">
        <AlertOctagon size={16} className="mt-0.5 shrink-0 text-red-300" aria-hidden />
        <span className="min-w-0">
          <b className="block truncate">{result.fileName}</b>
          <span className="text-red-100/80">{result.error}</span>
        </span>
      </li>
    );
  }
  const d = result.data;
  return (
    <li className="pg-pop overflow-hidden rounded-xl border border-white/10 bg-white/4">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-start gap-3 p-3 text-left">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-mint/15 text-mint">
          <FileCheck2 size={17} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-0.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-violet/40 px-2 py-0.5 text-[0.62rem] font-bold tracking-wide text-white/90 uppercase">{DOC_TYPES[d.docType] ?? d.docType}</span>
            {result.duplicate && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.62rem] text-white/60">már feldolgozva</span>}
            {d.issues.length > 0 && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[0.62rem] font-bold text-red-200">{d.issues.length} eltérés</span>}
          </span>
          <b className="block text-[0.82rem] leading-snug">{d.title}</b>
          <span className="block truncate text-[0.68rem] text-white/45">{result.fileName}</span>
        </span>
        <ChevronDown size={16} aria-hidden className={`mt-1 shrink-0 text-white/40 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-2.5 border-t border-white/8 p-3 text-xs leading-relaxed">
          <p className="text-white/80">{d.summary}</p>
          <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5 text-white/75">
            {d.date && (<><dt className="text-white/40">Kelt</dt><dd>{d.date}</dd></>)}
            {d.parties.length > 0 && (<><dt className="text-white/40">Felek</dt><dd>{d.parties.join("; ")}</dd></>)}
            {d.amounts.length > 0 && (<><dt className="text-white/40">Összegek</dt><dd>{d.amounts.map((a) => `${a.label}: ${a.value.toLocaleString("hu-HU")} ${a.currency}`).join(" · ")}</dd></>)}
            {d.deadlines.length > 0 && (<><dt className="text-white/40">Határidők</dt><dd>{d.deadlines.map((x) => `${x.label}: ${x.date}`).join(" · ")}</dd></>)}
            <dt className="text-white/40">Biztonság</dt>
            <dd>{d.confidence} · {d.language}</dd>
          </dl>
          {d.actionItems.length > 0 && (
            <div>
              <p className="mb-1 font-semibold text-mint">Teendők</p>
              <ul className="list-disc space-y-0.5 pl-4 text-white/80">{d.actionItems.map((item, i) => <li key={i}>{item}</li>)}</ul>
            </div>
          )}
          {d.issues.length > 0 && (
            <div className="rounded-lg border border-red-400/25 bg-red-500/10 p-2.5">
              <p className="mb-1 font-semibold text-red-200">Eltérések és hibák</p>
              <ul className="list-disc space-y-0.5 pl-4 text-red-100/90">{d.issues.map((item, i) => <li key={i}>{item}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export function DocsTab({ data, api, onDone }: { data: Insights; api: PajzsApi; onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<DigitizeResult[]>([]);
  const [error, setError] = useState<string>();
  const [celebrate, setCelebrate] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const total = files.reduce((sum, file) => sum + file.size, 0);
  const tooBig = total > 4 * 1024 * 1024;

  function add(list: FileList | File[] | null) {
    if (!list) return;
    setError(undefined);
    setFiles((current) => [...current, ...Array.from(list)].slice(0, 8));
  }
  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    add(event.dataTransfer.files);
  }
  function run() {
    setError(undefined);
    setResults([]);
    const formData = new FormData();
    for (const file of files) formData.append("files", file);
    startTransition(async () => {
      try {
        const response = await api.digitize(formData);
        if (response.error) return setError(response.error);
        setResults(response.results ?? []);
        setFiles([]);
        if (response.results?.some((item) => item.ok)) {
          setCelebrate(true);
          setTimeout(() => setCelebrate(false), 1600);
          onDone();
        }
      } catch {
        setError("Nem sikerült elérni a szervert (túl nagy csomag?). Próbáld kevesebb fájllal.");
      }
    });
  }
  function download() {
    const url = URL.createObjectURL(new Blob([csvOf(results)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `digitalizalt-dokumentumok-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="relative space-y-4 p-4">
      {celebrate && <Confetti />}
      <SectionTitle n="04" hint="legfeljebb 8 fájl, 4 MB">
        Dokumentumok digitalizálása
      </SectionTitle>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-5 text-center transition ${
          dragging ? "border-mint bg-mint/10" : "border-white/15 bg-white/3 hover:border-mint/50"
        }`}
      >
        {pending && <span className="pg-scanline" aria-hidden />}
        <input ref={input} type="file" multiple hidden accept=".pdf,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp" onChange={(event) => { add(event.target.files); event.target.value = ""; }} />
        <button type="button" onClick={() => input.current?.click()} disabled={pending} className="mx-auto flex flex-col items-center gap-2 disabled:opacity-60">
          <span className="grid size-12 place-items-center rounded-2xl bg-mint/15 text-mint">
            <UploadCloud size={26} aria-hidden />
          </span>
          <span className="font-display text-base font-semibold">{pending ? "Olvasom és értelmezem…" : "Húzd ide, vagy válassz fájlokat"}</span>
          <span className="text-[0.7rem] text-white/50">PDF (akár szkennelt), kép, Word, Excel, CSV, szöveg · az AI kiolvassa a típust, feleket, összegeket, határidőket és az ellenőrzési szempontból lényeges hibákat</span>
        </button>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <ul className="space-y-1.5">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2 text-xs">
                <FileUp size={15} className="shrink-0 text-mint" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <span className="shrink-0 text-white/40">{(file.size / 1024).toFixed(0)} KB</span>
                <button type="button" onClick={() => setFiles(files.filter((_, i) => i !== index))} aria-label={`${file.name} eltávolítása`} className="text-white/40 hover:text-red-300">
                  <Trash2 size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={run} disabled={pending || tooBig} className="pg-button flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50">
            {pending ? <LoaderCircle size={17} className="animate-spin" aria-hidden /> : <Sparkles size={16} aria-hidden />}
            {files.length} fájl digitalizálása
          </button>
          {tooBig && <p className="text-[0.7rem] text-red-300">A fájlok együtt {Math.round(total / 1024 / 1024 * 10) / 10} MB-ot tesznek ki; legfeljebb 4 MB engedett.</p>}
        </div>
      )}

      {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">{error}</p>}

      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-white/70">
              Eredmény: {results.filter((r) => r.ok).length}/{results.length} sikeres
            </p>
            <button type="button" onClick={download} className="flex items-center gap-1.5 rounded-lg border border-mint/40 px-2.5 py-1.5 text-[0.7rem] font-semibold text-mint hover:bg-mint/10">
              <Download size={13} aria-hidden /> CSV
            </button>
          </div>
          <ul className="space-y-2">{results.map((result, index) => <DocCard key={index} result={result} />)}</ul>
        </div>
      )}

      {results.length === 0 && data.docs.recent.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-white/60">Legutóbb digitalizált ({data.docs.total} összesen)</p>
          <ul className="space-y-1.5">
            {data.docs.recent.slice(0, 6).map((doc) => (
              <li key={doc.id} className="flex items-start gap-2.5 rounded-lg bg-white/4 px-3 py-2 text-xs">
                <span className="mt-0.5 shrink-0 rounded bg-violet/40 px-1.5 py-0.5 text-[0.6rem] font-bold text-white/85 uppercase">{DOC_TYPES[doc.docType] ?? doc.docType}</span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate">{doc.title}</b>
                  <span className="block truncate text-white/45">{doc.summary}</span>
                </span>
                {doc.issues > 0 && <span className="shrink-0 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[0.6rem] font-bold text-red-200">{doc.issues}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[0.68rem] leading-snug text-white/35">
        Az iratok tartalma feldolgozásra az AI-szolgáltatóhoz kerül; a rendszer csak a kinyert adatokat és az összefoglalót menti, a fájlt nem. Személyes adatot tartalmazó iratot csak adatkezelési jogalappal tölts fel.
      </p>
    </div>
  );
}

/* ---------- 05: Jogszabályok változásának nyomon követése ---------- */

function LawCard({ law, index }: { law: LegalRow; index: number }) {
  const [open, setOpen] = useState(law.state === "changed");
  const pill =
    law.state === "changed"
      ? { cls: "bg-amber-300/15 text-amber-200 border-amber-300/40", text: "Változott", icon: <AlertTriangle size={12} aria-hidden /> }
      : law.state === "same"
        ? { cls: "bg-emerald-400/10 text-emerald-200 border-emerald-400/30", text: "Változatlan", icon: <CheckCircle2 size={12} aria-hidden /> }
        : law.state === "error"
          ? { cls: "bg-red-500/10 text-red-200 border-red-400/30", text: "Nem érhető el", icon: <AlertOctagon size={12} aria-hidden /> }
          : { cls: "bg-white/6 text-white/60 border-white/15", text: "Még nem ellenőrzött", icon: <Clock size={12} aria-hidden /> };
  return (
    <li className="pg-pop overflow-hidden rounded-2xl border border-white/10 bg-white/4" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="p-3.5">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-violet/35 text-violet-bright">
            <Scale size={16} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <b className="block text-[0.82rem] leading-snug">{law.name}</b>
            <span className="font-mono text-[0.65rem] text-white/45">{law.cite}</span>
          </div>
          <span className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[0.62rem] font-bold ${pill.cls}`}>
            {pill.icon} {pill.text}
          </span>
        </div>
        <p className="mt-2 text-[0.72rem] leading-snug text-white/55">{law.why}</p>
        <div className="mt-2 flex items-center gap-3 text-[0.65rem] text-white/40">
          <span>Ellenőrizve: {stamp(law.checkedAt)}</span>
          <a href={law.url} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-mint hover:underline">
            Megnyitás <ExternalLink size={11} aria-hidden />
          </a>
        </div>
      </div>
      {law.state === "changed" && (
        <div className="border-t border-amber-300/20 bg-amber-300/5">
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[0.72rem] font-semibold text-amber-200">
            Változás ({stamp(law.changedAt)}) <ChevronDown size={14} aria-hidden className={`ml-auto transition ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="space-y-2.5 px-3.5 pb-3 text-[0.72rem] leading-snug">
              {law.summary && <p className="rounded-lg bg-white/6 p-2.5 text-white/85"><b className="text-mint">Pajzs szerint: </b>{law.summary}</p>}
              {law.added && law.added.length > 0 && (
                <div>
                  <p className="mb-1 font-semibold text-emerald-300">Új / módosult</p>
                  <ul className="space-y-1">{law.added.slice(0, 5).map((part, i) => <li key={i} className="rounded border-l-2 border-emerald-400/60 bg-emerald-400/5 px-2 py-1 text-white/75">{part}</li>)}</ul>
                </div>
              )}
              {law.removed && law.removed.length > 0 && (
                <div>
                  <p className="mb-1 font-semibold text-red-300">Elhagyott</p>
                  <ul className="space-y-1">{law.removed.slice(0, 5).map((part, i) => <li key={i} className="rounded border-l-2 border-red-400/60 bg-red-500/5 px-2 py-1 text-white/55 line-through decoration-white/20">{part}</li>)}</ul>
                </div>
              )}
              <p className="text-[0.65rem] text-white/40">Jogi tanács helyett tájékoztatás: a belső szabályzatokra gyakorolt hatás megítélése előtt kérd jogász véleményét.</p>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export function LegalTab({ rows, api, onRows }: { rows: LegalRow[]; api: PajzsApi; onRows: (rows: LegalRow[]) => void }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const changed = rows.filter((row) => row.state === "changed").length;

  function check() {
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await api.legalCheck();
        if (result.error) setError(result.error);
        if (result.rows) onRows(result.rows);
      } catch {
        setError("Az ellenőrzés most nem sikerült, próbáld újra.");
      }
    });
  }

  return (
    <div className="space-y-4 p-4">
      <SectionTitle n="05">Jogszabály-figyelő</SectionTitle>
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/4 p-3.5">
        <div className="min-w-0 flex-1 text-xs leading-snug">
          <b className="block text-[0.85rem]">{changed ? `${changed} jogszabály változott` : "Egyik jogszabály sem változott"}</b>
          <span className="text-white/50">Naponta egyszer automatikusan ellenőrizve a Nemzeti Jogszabálytárban. Teljes lista, jegyzetek és hatálybalépés: /jogszabalyok.</span>
        </div>
        <button type="button" onClick={check} disabled={pending} className="pg-button flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold disabled:opacity-60">
          {pending ? <LoaderCircle size={15} className="animate-spin" aria-hidden /> : <RefreshCw size={14} aria-hidden />}
          Most
        </button>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">{error}</p>}
      <ul className="space-y-2.5">{rows.map((law, index) => <LawCard key={law.id} law={law} index={index} />)}</ul>
    </div>
  );
}
