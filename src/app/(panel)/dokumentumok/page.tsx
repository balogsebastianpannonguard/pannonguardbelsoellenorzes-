import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Files, Search, ScanText, UploadCloud } from "lucide-react";
import { KIND_LABEL } from "@/components/library-kinds";
import { LibraryUpload } from "@/components/library-upload";
import { PageTitle } from "@/components/page-title";
import { Empty, Input, Panel, Pill, Skeleton, buttonClass } from "@/components/ui";
import { formatStamp } from "@/lib/dates";
import { LIBRARY_ACCEPT, library, sizeLabel } from "@/lib/library";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Dokumentumok" };
export const maxDuration = 120;


export default function LibraryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div className="space-y-8">
      <PageTitle eyebrow="08 · Belső ellenőrzés" title="Feltöltött" accent="dokumentumok.">
        Tölts fel PDF-et, Word-dokumentumot, szöveges fájlt vagy fényképet: a rendszer előnézetet készít, és a szövegét is
        kiolvassa – szkennelt iratból is –, így kereshető és másolható.
      </PageTitle>
      <Panel title="Feltöltés" icon={UploadCloud}>
        <LibraryUpload accept={LIBRARY_ACCEPT} />
      </Panel>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <List searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function List({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q = "" }] = await Promise.all([searchParams, requireUser()]);
  const query = q.trim().slice(0, 100);
  const filter = query ? { $or: [{ name: { $regex: escapeRegExp(query), $options: "i" } }, { text: { $regex: escapeRegExp(query), $options: "i" } }] } : {};
  const docs = await (await library()).find(filter, { projection: { text: 0 } }).sort({ uploadedAt: -1 }).limit(200).toArray();

  return (
    <Panel
      title={<>Dokumentumok <span className="text-sm font-normal text-white/45">({docs.length}{docs.length === 200 ? "+" : ""})</span></>}
      icon={Files}
      action={
        <form className="relative" role="search">
          <Search size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/35" />
          <Input name="q" defaultValue={query} placeholder="Keresés névben és szövegben…" aria-label="Keresés" className="h-9 w-64 pl-9 text-sm" />
        </form>
      }
    >
      {docs.length === 0 ? (
        query ? (
          <Empty icon={Search} title="Nincs találat" text={`Egyik dokumentum neve vagy szövege sem tartalmazza: „${query}”.`} action={<Link href="/dokumentumok" className={buttonClass("secondary", "sm")}>Összes dokumentum</Link>} />
        ) : (
          <Empty icon={Files} title="Még nincs feltöltött dokumentum" text="A fenti mezőbe húzva vagy tallózva tölthetsz fel." />
        )
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {docs.map((doc) => {
            const kind = KIND_LABEL[doc.kind];
            return (
              <li key={String(doc._id)}>
                <Link
                  href={`/dokumentumok/${doc._id}`}
                  className="pg-card group flex h-full flex-col gap-3 rounded-2xl border border-white/8 bg-white/3 p-4 transition hover:bg-white/5"
                >
                  <div className="flex items-start gap-3">
                    <span className={`grid size-11 shrink-0 place-items-center rounded-xl ring-1 ${kind.tone}`}>
                      <kind.icon size={20} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium group-hover:text-mint" title={doc.name}>{doc.name}</p>
                      <p className="text-xs text-white/45">
                        {kind.label} · {sizeLabel(doc.size)}
                        {doc.pages ? ` · ${doc.pages} oldal` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="line-clamp-3 flex-1 text-xs leading-relaxed text-white/55">
                    {doc.snippet || <span className="italic text-white/35">{doc.notice ?? "Nincs kinyert szöveg."}</span>}
                  </p>
                  <div className="flex items-center justify-between gap-2 text-xs text-white/40">
                    <span className="truncate">{formatStamp(doc.uploadedAt)} · {doc.uploadedBy}</span>
                    {doc.ocr && <Pill tone="info" icon={ScanText}>OCR</Pill>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
