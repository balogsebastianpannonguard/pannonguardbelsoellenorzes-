import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, CircleAlert, Download, ExternalLink, FileSearch, Info, ScanText, TriangleAlert } from "lucide-react";
import { OcrButton } from "@/components/ocr-button";
import { PageTitle } from "@/components/page-title";
import { Panel, Pill, Skeleton, buttonClass } from "@/components/ui";
import { aiAvailable } from "@/lib/ai";
import { auditFileBlobs, auditFiles, audits, isImageFile, previewKind, type IssueLevel } from "@/lib/audits";
import { formatStamp } from "@/lib/dates";
import { requireUser, toObjectId } from "@/lib/session";

export const metadata: Metadata = { title: "Fájl előnézete" };

const LEVEL = {
  error: { icon: CircleAlert, label: "Hiba", text: "text-red-300" },
  warning: { icon: TriangleAlert, label: "Figyelmeztetés", text: "text-amber-300" },
  info: { icon: Info, label: "Tájékoztatás", text: "text-white/45" },
} as const satisfies Record<IssueLevel, { icon: unknown; label: string; text: string }>;

const size = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export default function FilePreviewPage({ params }: { params: Promise<{ id: string; fileId: string }> }) {
  return (
    <div className="space-y-8">
      <Suspense fallback={<Skeleton className="h-[40rem]" />}>
        <Preview params={params} />
      </Suspense>
    </div>
  );
}

/** A táblázatos fájl tárolt szövege (fejléc + sorok, tabulátorral) táblázatként. */
function TablePreview({ text }: { text: string }) {
  const [head, ...rows] = text.split("\n").map((line) => line.split("\t"));
  if (!head) return null;
  return (
    <div className="max-h-[70vh] overflow-auto rounded-2xl border border-white/8 [scrollbar-width:thin]">
      <table className="w-full min-w-max text-left text-sm">
        <thead className="sticky top-0 bg-ink-900">
          <tr>
            {head.map((cell, index) => (
              <th key={index} className="border-b border-white/10 px-3 py-2 font-semibold whitespace-nowrap text-white/80">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="odd:bg-white/2">
              {head.map((_, cellIndex) => (
                <td key={cellIndex} className="border-b border-white/5 px-3 py-1.5 whitespace-nowrap text-white/70">
                  {row[cellIndex] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function Preview({ params }: { params: Promise<{ id: string; fileId: string }> }) {
  await requireUser();
  const { id, fileId } = await params;
  const auditId = toObjectId(id);
  const _id = toObjectId(fileId);
  if (!auditId || !_id) notFound();
  const [audit, file, blob] = await Promise.all([
    (await audits()).findOne({ _id: auditId }, { projection: { name: 1 } }),
    (await auditFiles()).findOne({ _id, auditId }),
    (await auditFileBlobs()).findOne({ _id }, { projection: { contentType: 1 } }),
  ]);
  if (!audit || !file) notFound();

  const kind = blob ? previewKind(blob.contentType) : null;
  const raw = `/ellenori-adatok/fajl/${fileId}`;
  const scannable = /\.pdf$/i.test(file.name) || isImageFile(file.name);
  const ocrMissing = scannable && !file.ocr && file.text.trim().length < 40;
  const aiOn = aiAvailable();

  return (
    <>
      <Link href={`/ellenori-adatok/${id}`} className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white">
        <ArrowLeft size={15} aria-hidden /> {audit.name}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle eyebrow="04 · Ellenőri adatok · Fájl" title={file.name}>
          {size(file.size)} · feltöltve: {formatStamp(file.uploadedAt)} · {file.uploadedBy}
          {file.ocr ? " · szövegfelismeréssel olvasva" : ""}
        </PageTitle>
        {blob && (
          <div className="flex flex-wrap gap-2">
            <a href={`${raw}?letoltes=1`} download={file.name} className={buttonClass("primary")}>
              <Download size={17} aria-hidden /> Letöltés
            </a>
            {kind && (
              <a href={raw} target="_blank" rel="noopener" className={buttonClass("secondary")}>
                <ExternalLink size={17} aria-hidden /> Megnyitás új lapon
              </a>
            )}
          </div>
        )}
      </div>

      {file.issues.length > 0 && (
        <ul className="space-y-1.5 rounded-2xl border border-white/8 bg-white/3 p-4">
          {file.issues.map((issue, index) => {
            const level = LEVEL[issue.level];
            const Icon = level.icon;
            return (
              <li key={index} className="flex items-start gap-2.5 text-sm">
                <Icon size={16} aria-label={level.label} className={`mt-0.5 shrink-0 ${level.text}`} />
                <span className={issue.level === "info" ? "text-white/60" : "text-white/85"}>{issue.message}</span>
              </li>
            );
          })}
        </ul>
      )}

      {!blob && (
        <p className="rounded-2xl border border-amber-300/25 bg-amber-300/8 p-4 text-sm text-amber-100">
          Ennek a fájlnak az eredetije nincs meg: még azelőtt töltötték fel, hogy a rendszer az eredeti fájlokat is megőrizte volna.
          Töltsd fel újra az ellenőrzés oldalán, és utána megtekinthető, letölthető, a szkennelt PDF szövege pedig automatikusan felismerődik.
        </p>
      )}

      {blob && scannable && (ocrMissing || file.ocr) && (
        <Panel title={ocrMissing ? "Szkennelt irat" : "Szövegfelismerés"} icon={ScanText}>
          <p className="mb-4 text-sm text-white/60">
            {ocrMissing
              ? "A fájlban nincs kinyerhető szöveg, mert szkennelt (képes). Az AI felismeri és átírja a szövegét, utána a megállapítások feltárása is működik rajta."
              : "A szöveget szövegfelismerés adta. Ha a minőség nem megfelelő, újrafuttatható."}
          </p>
          <OcrButton fileId={fileId} aiOn={aiOn} again={!ocrMissing} />
        </Panel>
      )}

      {blob && kind === "pdf" && (
        <iframe src={raw} title={`${file.name} előnézete`} className="h-[80vh] w-full rounded-3xl border border-white/10 bg-white" />
      )}
      {blob && kind === "image" && (
        // eslint-disable-next-line @next/next/no-img-element -- a saját, hitelesített végpontról érkező kép, optimalizálás nélkül
        <img src={raw} alt={file.name} className="mx-auto max-h-[80vh] rounded-3xl border border-white/10 bg-white object-contain" />
      )}

      {file.text.trim() && (
        <Panel title={file.kind === "table" ? "Táblázat (az első 300 sor)" : kind === "pdf" || kind === "image" ? "Kinyert szöveg" : "A fájl szövege"} icon={FileSearch}>
          {file.kind === "table" ? (
            <TablePreview text={file.text} />
          ) : (
            <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-white/8 bg-ink-950/50 p-5 text-sm leading-relaxed whitespace-pre-wrap text-white/80 [overflow-wrap:anywhere] [scrollbar-width:thin]">
              {file.text}
            </div>
          )}
        </Panel>
      )}
      {!file.text.trim() && blob && !kind && (
        <p className="text-sm text-white/55">Ehhez a fájltípushoz nincs előnézet, de a Letöltés gombbal megnyitható.</p>
      )}
      {file.text.trim() && <Pill tone="muted">{file.text.length.toLocaleString("hu-HU")} karakter</Pill>}
    </>
  );
}
