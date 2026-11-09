import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Columns3, Rows3, Sigma, Sparkles, TextCursorInput } from "lucide-react";
import { DatasetAnalysis } from "@/components/dataset-analysis";
import { DatasetDelete } from "@/components/dataset-delete";
import { DatasetExplorer } from "@/components/dataset-explorer";
import { PageTitle } from "@/components/page-title";
import { Panel, Pill, Skeleton, Stat, type Tone } from "@/components/ui";
import { aiAvailable } from "@/lib/ai";
import { datasets, profileColumns, type ColumnKind } from "@/lib/datasets";
import { formatStamp } from "@/lib/dates";
import { requireUser, toObjectId } from "@/lib/session";
import { ObjectId } from "mongodb";

export const metadata: Metadata = { title: "Adatkészlet" };

const KIND_TONE: Record<ColumnKind, Tone> = { szám: "ok", szöveg: "info", dátum: "warning", vegyes: "error", üres: "muted" };
const num = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 });

export default function DatasetPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="space-y-8">
      <Link href="/adatfeldolgozas" className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white">
        <ArrowLeft size={15} aria-hidden /> Adatkészletek
      </Link>
      <Suspense fallback={<Skeleton className="h-[40rem]" />}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const oid = toObjectId(id);
  if (!oid || !ObjectId.isValid(id)) notFound();
  const dataset = await (await datasets()).findOne({ _id: oid });
  if (!dataset) notFound();

  const profile = profileColumns(dataset.headers, dataset.rows);
  const cells = dataset.rows.length * dataset.headers.length;
  const filled = profile.reduce((sum, column) => sum + column.filled, 0);
  const columns = profile.map((column) => ({ name: column.name, numeric: column.kind === "szám" }));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle eyebrow="02 · Adatok és ábrák" title={dataset.name}>
          {dataset.fileName} · feltöltötte: {dataset.createdBy}, {formatStamp(dataset.createdAt)}
        </PageTitle>
        <DatasetDelete id={String(dataset._id)} />
      </div>

      {dataset.truncated && (
        <p className="rounded-2xl border border-amber-300/25 bg-amber-300/8 p-4 text-sm text-amber-100">
          A fájl hosszabb volt, ezért csak az első 5000 sor került be az adatkészletbe.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Sor" value={num.format(dataset.rows.length)} icon={Rows3} tone="text-mint-bright" />
        <Stat label="Oszlop" value={dataset.headers.length} icon={Columns3} />
        <Stat label="Számoszlop" value={profile.filter((column) => column.kind === "szám").length} icon={Sigma} tone="text-violet-bright" />
        <Stat label="Kitöltöttség" value={cells ? `${Math.round((filled / cells) * 100)}%` : "–"} icon={TextCursorInput} />
      </div>

      <DatasetExplorer headers={dataset.headers} columns={columns} rows={dataset.rows} />

      <Panel title="Oszlopprofil" icon={Columns3}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="text-left text-xs tracking-wide text-white/50 uppercase">
              <tr>
                <th className="py-2 pr-3 font-semibold">Oszlop</th>
                <th className="px-3 py-2 font-semibold">Típus</th>
                <th className="px-3 py-2 text-right font-semibold">Kitöltött</th>
                <th className="px-3 py-2 text-right font-semibold">Egyedi</th>
                <th className="px-3 py-2 text-right font-semibold">Min</th>
                <th className="px-3 py-2 text-right font-semibold">Max</th>
                <th className="px-3 py-2 text-right font-semibold">Összeg</th>
                <th className="py-2 pl-3 text-right font-semibold">Átlag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {profile.map((column, index) => (
                <tr key={index} className="align-top">
                  <td className="max-w-[16rem] py-2.5 pr-3">
                    <p className="truncate font-medium">{column.name}</p>
                    {column.sample.length > 0 && <p className="truncate text-xs text-white/35">pl. {column.sample.join(", ")}</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    <Pill tone={KIND_TONE[column.kind]}>{column.kind}</Pill>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {column.filled}
                    <span className="text-white/35"> / {dataset.rows.length}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{column.unique}</td>
                  {(["min", "max", "sum", "avg"] as const).map((key) => (
                    <td key={key} className="px-3 py-2.5 text-right text-white/75 tabular-nums last:pr-0">
                      {column.kind === "szám" && column[key] !== undefined ? num.format(column[key]) : <span className="text-white/20">–</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Elemzés" icon={Sparkles}>
        {aiAvailable() ? (
          <DatasetAnalysis id={String(dataset._id)} />
        ) : (
          <p className="text-sm text-white/55">Az AI-elemzéshez a szerveren be kell állítani a GEMINI_API_KEY változót. Az oszlopprofil és az ábrák nélküle is működnek.</p>
        )}
      </Panel>
    </>
  );
}
