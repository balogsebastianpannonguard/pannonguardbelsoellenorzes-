import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Download, ExternalLink, TriangleAlert } from "lucide-react";
import { LibraryActions, LibraryViewer } from "@/components/library-viewer";
import { PageTitle } from "@/components/page-title";
import { Skeleton, buttonClass } from "@/components/ui";
import { formatStamp } from "@/lib/dates";
import { docxHtml, library, libraryBlobs, sizeLabel } from "@/lib/library";
import { requireUser, toObjectId } from "@/lib/session";
import { KIND_LABEL } from "@/components/library-kinds";

export const metadata: Metadata = { title: "Dokumentum" };
export const maxDuration = 120;

export default function LibraryDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="space-y-6">
      <Link href="/dokumentumok" className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white">
        <ArrowLeft size={15} aria-hidden /> Dokumentumok
      </Link>
      <Suspense fallback={<Skeleton className="h-[40rem]" />}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }] = await Promise.all([params, requireUser()]);
  const _id = toObjectId(id);
  if (!_id) notFound();
  const doc = await (await library()).findOne({ _id });
  if (!doc) notFound();

  let html: string | undefined;
  if (doc.kind === "docx") {
    const blob = await (await libraryBlobs()).findOne({ _id });
    html = blob ? await docxHtml(Buffer.from(blob.data.buffer)).catch(() => undefined) : undefined;
  }
  const raw = `/dokumentumok/fajl/${id}`;
  const kind = KIND_LABEL[doc.kind];
  const opensInline = doc.kind === "pdf" || doc.kind === "image" || doc.kind === "txt";

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle eyebrow={`Dokumentum · ${kind.label}`} title={doc.name}>
          {sizeLabel(doc.size)}
          {doc.pages ? ` · ${doc.pages} oldal` : ""} · feltöltve: {formatStamp(doc.uploadedAt)} · {doc.uploadedBy}
          {doc.ocr ? " · szövegfelismeréssel olvasva" : ""}
        </PageTitle>
        <div className="flex flex-wrap gap-2">
          <a href={`${raw}?letoltes=1`} download={doc.name} className={buttonClass("primary")}>
            <Download size={17} aria-hidden /> Letöltés
          </a>
          {opensInline && (
            <a href={raw} target="_blank" rel="noopener" className={buttonClass("secondary")}>
              <ExternalLink size={17} aria-hidden /> Megnyitás új lapon
            </a>
          )}
        </div>
      </div>

      {doc.notice && (
        <p className="flex gap-2.5 rounded-2xl border border-amber-300/25 bg-amber-300/8 p-4 text-sm text-amber-100">
          <TriangleAlert size={17} aria-hidden className="mt-0.5 shrink-0 text-amber-300" /> {doc.notice}
        </p>
      )}
      {doc.kind === "doc" && (
        <p className="text-xs text-white/45">A régi Word (.doc) formátum eredeti formázása a böngészőben nem jeleníthető meg; az előnézet a dokumentum szövegét mutatja. Az eredeti a Letöltés gombbal nyitható meg.</p>
      )}

      <LibraryViewer name={doc.name} kind={doc.kind} text={doc.text} html={html} rawUrl={raw} />
      <LibraryActions id={id} canOcr={doc.kind === "pdf" || doc.kind === "image"} ocrDone={Boolean(doc.ocr)} />
    </>
  );
}
