import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarClock, CircleAlert, CircleCheck, Filter, Lightbulb, ListChecks, Plus, ScanSearch, SearchX, Siren } from "lucide-react";
import { FindingForm } from "@/components/finding-form";
import { ProposalButtons, QuickStatus } from "@/components/finding-actions";
import { FindingScan } from "@/components/finding-scan";
import { PageTitle } from "@/components/page-title";
import { Empty, Panel, Pill, Select, Skeleton, Stat, buttonClass } from "@/components/ui";
import { aiAvailable } from "@/lib/ai";
import { dayKey, formatShortDate } from "@/lib/dates";
import { isOpen, listAuditFileOptions, listAuditOptions, listFindings } from "@/lib/findings";
import { SEVERITIES, SEVERITY_TONE, SOURCES, STATUSES, STATUS_TONE, type FindingRow } from "@/lib/findings-meta";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Hiányosságok" };
export const maxDuration = 120;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function FindingsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="space-y-8">
      <PageTitle eyebrow="05 · Belső ellenőrzés" title="Hiányosságok" accent="feltárása.">
        A megállapítások nyilvántartása súlyosság, felelős és határidő szerint. Az ellenőrzési fájlokból az AI javasolhat
        hiányosságokat, amelyeket te hagysz jóvá.
      </PageTitle>
      <Suspense fallback={<Skeleton className="h-[40rem]" />}>
        <Findings searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

async function Findings({ searchParams }: { searchParams: SearchParams }) {
  const [, params] = await Promise.all([requireUser(), searchParams]);
  const [rows, audits, files] = await Promise.all([listFindings(), listAuditOptions(), listAuditFileOptions()]);
  const today = dayKey(new Date());

  const overdue = (row: FindingRow) => Boolean(row.dueDate && row.dueDate < today && isOpen(row.status));
  const proposals = rows.filter((row) => row.status === "javasolt");
  const real = rows.filter((row) => row.status !== "javasolt" && row.status !== "elvetett");

  const filter = { status: one(params.status), severity: one(params.severity), area: one(params.area), auditId: one(params.audit) };
  const areas = [...new Set(rows.map((row) => row.area).filter((area): area is string => Boolean(area)))].sort((a, b) => a.localeCompare(b, "hu"));
  const list = rows.filter(
    (row) =>
      row.status !== "javasolt" &&
      (!filter.status || row.status === filter.status) &&
      (!filter.severity || row.severity === filter.severity) &&
      (!filter.area || row.area === filter.area) &&
      (!filter.auditId || row.auditId === filter.auditId),
  );
  const filtered = Boolean(filter.status || filter.severity || filter.area || filter.auditId);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Nyitott" value={real.filter((row) => isOpen(row.status)).length} icon={Siren} tone="text-amber-300" />
        <Stat label="Kritikus vagy magas" value={real.filter((row) => isOpen(row.status) && (row.severity === "kritikus" || row.severity === "magas")).length} icon={CircleAlert} tone="text-red-300" />
        <Stat label="Lejárt határidejű" value={real.filter(overdue).length} icon={CalendarClock} tone="text-orange-300" />
        <Stat label="Lezárt" value={real.filter((row) => row.status === "lezart").length} icon={CircleCheck} tone="text-mint-bright" />
      </div>

      {proposals.length > 0 && (
        <Panel title={`Javasolt – elfogadás / elvetés (${proposals.length})`} icon={Lightbulb}>
          <ul className="space-y-3">
            {proposals.map((row) => (
              <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-violet-bright/20 bg-violet/8 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/hianyossagok/${row.id}`} className="font-semibold hover:text-mint">{row.title}</Link>
                    <Pill tone={SEVERITY_TONE[row.severity]}>{SEVERITIES[row.severity]}</Pill>
                    <Pill tone="info">{SOURCES[row.source]}</Pill>
                  </div>
                  <p className="mt-1 text-sm text-white/65">{row.description}</p>
                  {row.evidence && <p className="mt-2 border-l-2 border-violet-bright/40 pl-3 text-xs text-white/50 italic">„{row.evidence}”</p>}
                  {row.auditName && <p className="mt-1 text-xs text-white/40">Ellenőrzés: {row.auditName}</p>}
                </div>
                <ProposalButtons id={row.id} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          <form method="get" className="pg-panel flex flex-wrap items-end gap-3 rounded-2xl p-4">
            <label className="min-w-32 flex-1">
              <span className="mb-1 block text-xs text-white/50">Állapot</span>
              <Select name="status" defaultValue={filter.status}>
                <option value="">Mind</option>
                {Object.entries(STATUSES).filter(([value]) => value !== "javasolt").map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </label>
            <label className="min-w-32 flex-1">
              <span className="mb-1 block text-xs text-white/50">Súlyosság</span>
              <Select name="severity" defaultValue={filter.severity}>
                <option value="">Mind</option>
                {Object.entries(SEVERITIES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </label>
            <label className="min-w-32 flex-1">
              <span className="mb-1 block text-xs text-white/50">Terület</span>
              <Select name="area" defaultValue={filter.area}>
                <option value="">Mind</option>
                {areas.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </Select>
            </label>
            <label className="min-w-40 flex-1">
              <span className="mb-1 block text-xs text-white/50">Ellenőrzés</span>
              <Select name="audit" defaultValue={filter.auditId}>
                <option value="">Mind</option>
                {audits.map((audit) => (
                  <option key={audit.id} value={audit.id}>{audit.name}</option>
                ))}
              </Select>
            </label>
            <button type="submit" className={buttonClass("secondary")}><Filter size={16} aria-hidden /> Szűrés</button>
            {filtered && <Link href="/hianyossagok" className={buttonClass("ghost")}>Törlés</Link>}
          </form>

          {list.length === 0 ? (
            <Empty
              icon={SearchX}
              title={filtered ? "Nincs a szűrésnek megfelelő megállapítás" : "Még nincs megállapítás"}
              text={filtered ? "Módosítsd a szűrést." : "Vegyél fel egyet jobb oldalon, vagy tárj fel hiányosságokat egy ellenőrzési fájlból."}
            />
          ) : (
            <ul className="space-y-3">
              {list.map((row) => (
                <li key={row.id} className="pg-card rounded-2xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/hianyossagok/${row.id}`} className="font-semibold hover:text-mint">{row.title}</Link>
                        <Pill tone={SEVERITY_TONE[row.severity]}>{SEVERITIES[row.severity]}</Pill>
                        <Pill tone={STATUS_TONE[row.status]}>{STATUSES[row.status]}</Pill>
                        {overdue(row) && <Pill tone="error" icon={CalendarClock}>Lejárt</Pill>}
                        {row.source !== "kezi" && <Pill tone="muted">{SOURCES[row.source]}</Pill>}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-white/60">{row.description}</p>
                      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/45">
                        {row.area && <span>Terület: {row.area}</span>}
                        {row.owner && <span>Felelős: {row.owner}</span>}
                        {row.dueDate && <span className={overdue(row) ? "text-red-300" : ""}>Határidő: {formatShortDate(row.dueDate)}</span>}
                        {row.auditName && <span>Ellenőrzés: {row.auditName}</span>}
                      </p>
                    </div>
                    {isOpen(row.status) || row.status === "lezart" || row.status === "elvetett" ? <QuickStatus id={row.id} status={row.status} /> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="AI-s feltárás fájlból" icon={ScanSearch}>
            <FindingScan audits={audits} files={files} aiOn={aiAvailable()} />
          </Panel>
          <Panel title="Új megállapítás" icon={Plus}>
            <FindingForm audits={audits} />
          </Panel>
        </div>
      </div>
      <p className="flex items-center gap-2 text-xs text-white/40"><ListChecks size={14} aria-hidden /> A javaslatok és a lezárás az ellenőr felelőssége; az AI csak előkészít.</p>
    </div>
  );
}

