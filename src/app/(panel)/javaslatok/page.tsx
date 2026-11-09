import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CircleCheck, FileText, Filter, Lightbulb, Plus, Sparkles } from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { RecommendationForm, RecommendationGenerate } from "@/components/recommendation-actions";
import { Empty, Panel, Pill, Select, Skeleton, Stat, buttonClass } from "@/components/ui";
import { aiAvailable } from "@/lib/ai";
import { dayKey, formatShortDate } from "@/lib/dates";
import { listFindings } from "@/lib/findings";
import { listRecommendations } from "@/lib/recommendations";
import { PRIORITIES, REC_STATUSES, REC_TONE } from "@/lib/recommendations-meta";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Javaslattétel" };
export const maxDuration = 120;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export default function RecommendationsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="space-y-8">
      <PageTitle eyebrow="06 · Belső ellenőrzés" title="Javaslattétel" accent="és vezetői összefoglaló.">
        A megállapításokhoz javaslatokat készíthetsz kézzel vagy AI-vázlatból. A jóváhagyott javaslatokból nyomtatható
        vezetői összefoglaló készül.
      </PageTitle>
      <Suspense fallback={<Skeleton className="h-[36rem]" />}>
        <Recommendations searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Recommendations({ searchParams }: { searchParams: SearchParams }) {
  const [, params] = await Promise.all([requireUser(), searchParams]);
  const [rows, findingRows] = await Promise.all([listRecommendations(), listFindings()]);
  const options = findingRows.filter((row) => row.status !== "elvetett").map((row) => ({ id: row.id, title: row.title }));
  const today = dayKey(new Date());

  const status = one(params.status);
  const priority = one(params.priority);
  const list = rows.filter((row) => (!status || row.status === status) && (!priority || row.priority === priority));
  const filtered = Boolean(status || priority);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Tervezet" value={rows.filter((row) => row.status === "tervezet").length} icon={Lightbulb} tone="text-violet-bright" />
        <Stat label="Jóváhagyva" value={rows.filter((row) => row.status === "jovahagyva").length} icon={CircleCheck} tone="text-mint-bright" />
        <Stat label="Elutasítva" value={rows.filter((row) => row.status === "elutasitva").length} icon={FileText} tone="text-white/70" />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          <form method="get" className="pg-panel flex flex-wrap items-end gap-3 rounded-2xl p-4">
            <label className="min-w-36 flex-1">
              <span className="mb-1 block text-xs text-white/50">Állapot</span>
              <Select name="status" defaultValue={status}>
                <option value="">Mind</option>
                {Object.entries(REC_STATUSES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </label>
            <label className="min-w-36 flex-1">
              <span className="mb-1 block text-xs text-white/50">Prioritás</span>
              <Select name="priority" defaultValue={priority}>
                <option value="">Mind</option>
                {Object.entries(PRIORITIES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </label>
            <button type="submit" className={buttonClass("secondary")}><Filter size={16} aria-hidden /> Szűrés</button>
            {filtered && <Link href="/javaslatok" className={buttonClass("ghost")}>Törlés</Link>}
            <Link href="/javaslatok/osszefoglalo" className={buttonClass("primary")}>Vezetői összefoglaló</Link>
          </form>

          {list.length === 0 ? (
            <Empty icon={Lightbulb} title={filtered ? "Nincs a szűrésnek megfelelő javaslat" : "Még nincs javaslat"} text={filtered ? "Módosítsd a szűrést." : "Készíts vázlatot egy megállapításból, vagy írj kézzel javaslatot."} />
          ) : (
            <ul className="space-y-3">
              {list.map((row) => (
                <li key={row.id}>
                  <Link href={`/javaslatok/${row.id}`} className="pg-card block rounded-2xl p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{row.title}</span>
                      <Pill tone={REC_TONE[row.status]}>{REC_STATUSES[row.status]}</Pill>
                      <Pill tone={row.priority === "magas" ? "warning" : "muted"}>{PRIORITIES[row.priority]}</Pill>
                      {row.source === "ai" && <Pill tone="info" icon={Sparkles}>AI-vázlat</Pill>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-white/60">{row.text}</p>
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/45">
                      <span>Megállapítás: {row.findingTitle}</span>
                      {row.owner && <span>Felelős: {row.owner}</span>}
                      {row.dueDate && <span className={row.dueDate < today && row.status !== "elutasitva" ? "text-red-300" : ""}>Határidő: {formatShortDate(row.dueDate)}</span>}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Vázlat AI-val" icon={Sparkles}>
            {options.length === 0 ? (
              <p className="text-sm text-white/55">Előbb vegyél fel megállapítást a Hiányosságok oldalon.</p>
            ) : (
              <RecommendationGenerate findings={options} aiOn={aiAvailable()} />
            )}
          </Panel>
          <Panel title="Új javaslat kézzel" icon={Plus}>
            {options.length === 0 ? <p className="text-sm text-white/55">Még nincs megállapítás, amelyhez javaslatot lehetne írni.</p> : <RecommendationForm findings={options} />}
          </Panel>
        </div>
      </div>
    </div>
  );
}
