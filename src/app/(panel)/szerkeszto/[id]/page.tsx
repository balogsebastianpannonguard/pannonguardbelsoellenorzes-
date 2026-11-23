import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { PgEditor } from "@/components/editor/pg-editor";
import { Skeleton } from "@/components/ui";
import { editorDocs } from "@/lib/editor-docs";
import { requireUser, toObjectId } from "@/lib/session";

export const metadata: Metadata = { title: "PannonGuard szerkesztő" };

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="space-y-5">
      <Suspense fallback={<Skeleton className="h-[48rem]" />}>
        <Editor params={params} />
      </Suspense>
    </div>
  );
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }] = await Promise.all([params, requireUser()]);
  const _id = toObjectId(id);
  if (!_id) notFound();
  const doc = await (await editorDocs()).findOne({ _id });
  if (!doc) notFound();
  const sourceHref = doc.source ? (doc.source.type === "library" ? `/dokumentumok/${doc.source.id}` : null) : null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/szerkeszto" className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white">
          <ArrowLeft size={15} aria-hidden /> Szerkesztett dokumentumok
        </Link>
        {doc.source && (
          <p className="flex items-center gap-1.5 text-xs text-white/50">
            <FileText size={13} aria-hidden />
            {doc.task ? `${doc.task} ebből: ` : "Forrás: "}
            {sourceHref ? (
              <Link href={sourceHref} className="text-mint hover:underline">
                {doc.source.name}
              </Link>
            ) : (
              doc.source.name
            )}
          </p>
        )}
      </div>
      <PgEditor id={id} title={doc.title} html={doc.html} updatedAt={doc.updatedAt.toISOString()} />
      {doc.task && <p className="text-center text-xs text-white/40 print:hidden">AI által készített tartalom – hivatalos felhasználás előtt ellenőrizd.</p>}
    </>
  );
}
