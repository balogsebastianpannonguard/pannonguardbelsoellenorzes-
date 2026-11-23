import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FilePenLine, Sparkles } from "lucide-react";
import { NewEditorDocButton } from "@/components/editor/new-doc-button";
import { PageTitle } from "@/components/page-title";
import { Empty, Skeleton } from "@/components/ui";
import { formatStamp } from "@/lib/dates";
import { editorDocs } from "@/lib/editor-docs";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "PannonGuard szerkesztő" };

export default function EditorListPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle eyebrow="09 · Belső ellenőrzés" title="PannonGuard szerkesztő">
          Hivatalos, fejléces dokumentumok: az AI-elemzések, összefoglalók és a feltöltött iratok szerkeszthető változatai. Nyomtatható, PDF-be és Wordbe menthető.
        </PageTitle>
        <NewEditorDocButton />
      </div>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  await requireUser();
  const docs = await (await editorDocs()).find({}, { projection: { title: 1, task: 1, source: 1, updatedAt: 1, html: 1 } }).sort({ updatedAt: -1 }).limit(200).toArray();
  if (!docs.length) {
    return (
      <Empty
        icon={FilePenLine}
        title="Még nincs szerkesztett dokumentum"
        text="Nyiss meg egy feltöltött dokumentumot a Dokumentumok között, és kérj róla elemzést vagy összefoglalót – az eredmény itt jelenik meg szerkeszthetően."
      />
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {docs.map((doc) => {
        const preview = doc.html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim().slice(0, 180);
        return (
          <li key={String(doc._id)}>
            <Link href={`/szerkeszto/${doc._id}`} className="pg-panel flex h-full flex-col gap-2 rounded-2xl p-4 transition hover:border-mint/30">
              <span className="flex items-start gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mint/12 text-mint ring-1 ring-mint/20">
                  {doc.task ? <Sparkles size={16} aria-hidden /> : <FilePenLine size={16} aria-hidden />}
                </span>
                <span className="min-w-0 font-semibold leading-snug [overflow-wrap:anywhere]">{doc.title}</span>
              </span>
              {preview && <span className="line-clamp-3 text-xs leading-relaxed text-white/50">{preview}</span>}
              <span className="mt-auto pt-1 text-[0.7rem] text-white/40">
                Módosítva: {formatStamp(doc.updatedAt)}
                {doc.source ? ` · ${doc.source.name}` : ""}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
