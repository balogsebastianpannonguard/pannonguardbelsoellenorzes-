import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChartColumn, Database, UploadCloud } from "lucide-react";
import { DatasetUpload } from "@/components/dataset-upload";
import { PageTitle } from "@/components/page-title";
import { Empty, Panel, Pill, Skeleton } from "@/components/ui";
import { datasets } from "@/lib/datasets";
import { formatStamp } from "@/lib/dates";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Adatok és ábrák" };

export default function DataPage() {
  return (
    <div className="space-y-8">
      <PageTitle eyebrow="02 · Belső ellenőrzés" title="Adatok" accent="és ábrák.">
        Tölts fel Excel-, CSV- vagy PDF-táblázatot: az oszlopokat azonnal profilozzuk, az eredményt pedig diagramokban is megjeleníthető.
      </PageTitle>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  await requireUser();
  const list = await (await datasets())
    .aggregate<{ _id: { toString(): string }; name: string; fileName: string; truncated: boolean; createdAt: Date; createdBy: string; columns: number; rowCount: number }>([
      { $sort: { createdAt: -1 } },
      { $limit: 100 },
      { $project: { name: 1, fileName: 1, truncated: 1, createdAt: 1, createdBy: 1, columns: { $size: "$headers" }, rowCount: { $size: "$rows" } } },
    ])
    .toArray();

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
      <Panel title="Új táblázat" icon={UploadCloud} className="xl:sticky xl:top-8">
        <DatasetUpload />
      </Panel>

      <section>
        <h2 className="mb-4 flex items-center gap-2.5 font-display text-lg font-semibold">
          Adatkészletek <Pill tone="muted">{list.length}</Pill>
        </h2>
        {list.length === 0 ? (
          <Empty icon={Database} title="Még nincs feltöltött táblázat" text="Az első feltöltés után itt jelennek meg az adatkészletek." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {list.map((item) => (
              <li key={item._id.toString()}>
                <Link href={`/adatfeldolgozas/${item._id.toString()}`} className="pg-card group block rounded-2xl p-5 hover:bg-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet/15 text-violet-bright transition-colors group-hover:bg-mint/15 group-hover:text-mint">
                      <ChartColumn size={19} aria-hidden />
                    </span>
                    {item.truncated && <Pill tone="warning">Csonkolt</Pill>}
                  </div>
                  <p className="mt-3 truncate font-semibold">{item.name}</p>
                  <p className="truncate text-xs text-white/45">{item.fileName}</p>
                  <p className="mt-3 text-sm text-white/65">
                    {item.rowCount} sor · {item.columns} oszlop
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    {formatStamp(item.createdAt)} · {item.createdBy}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
