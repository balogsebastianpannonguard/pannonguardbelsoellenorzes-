import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Files, Search, UploadCloud } from "lucide-react";
import { KIND_LABEL } from "@/components/library-kinds";
import { LibraryGrid } from "@/components/library-grid";
import { LibraryUpload } from "@/components/library-upload";
import { aiAvailable } from "@/lib/ai";
import { PageTitle } from "@/components/page-title";
import { Empty, Input, Panel, Skeleton, buttonClass } from "@/components/ui";
import { formatStamp } from "@/lib/dates";
import { LIBRARY_ACCEPT, library, sizeLabel } from "@/lib/library";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Dokumentumok" };
export const maxDuration = 120;


export default function LibraryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div className="space-y-8">
      <PageTitle eyebrow="08 · Belső ellenőrzés" title="Feltöltött" accent="dokumentumok.">
        Tölts fel PDF-et, Word-dokumentumot, szöveges fájlt vagy fényképet: a rendszer előnézetet készít, kiolvassa a szövegét (szkennelt iratból is), és bármelyikről kérhetsz
        elemzést, összefoglalót vagy fordítást. Több dokumentum egy PDF-be is fűzhető.
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
        <LibraryGrid
          aiOn={aiAvailable()}
          docs={docs.map((doc) => ({
            id: String(doc._id),
            name: doc.name,
            kind: doc.kind,
            meta: `${KIND_LABEL[doc.kind].label} · ${sizeLabel(doc.size)}${doc.pages ? ` · ${doc.pages} oldal` : ""}`,
            snippet: doc.snippet,
            notice: doc.notice,
            stamp: `${formatStamp(doc.uploadedAt)} · ${doc.uploadedBy}`,
            ocr: Boolean(doc.ocr),
          }))}
        />
      )}
    </Panel>
  );
}
