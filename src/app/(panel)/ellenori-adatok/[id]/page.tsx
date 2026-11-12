import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, CircleAlert, Download, Eye, FileImage, FileSpreadsheet, FileText, Files, Info, ScanText, TriangleAlert, UploadCloud } from "lucide-react";
import { AuditDelete } from "@/components/audit-delete";
import { AuditUpload } from "@/components/audit-upload";
import { PageTitle } from "@/components/page-title";
import { Empty, Panel, Pill, Skeleton, Stat, buttonClass } from "@/components/ui";
import { auditFiles, audits, type IssueLevel } from "@/lib/audits";
import { deleteAudit, deleteAuditFile } from "@/lib/actions/audits";
import { formatStamp } from "@/lib/dates";
import { requireUser, toObjectId } from "@/lib/session";

export const metadata: Metadata = { title: "Ellenőrzés" };

const LEVEL = {
  error: { tone: "error", icon: CircleAlert, label: "Hiba", text: "text-red-300" },
  warning: { tone: "warning", icon: TriangleAlert, label: "Figyelmeztetés", text: "text-amber-300" },
  info: { tone: "muted", icon: Info, label: "Tájékoztatás", text: "text-white/45" },
} as const satisfies Record<IssueLevel, { tone: "error" | "warning" | "muted"; icon: unknown; label: string; text: string }>;

const size = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export default function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="space-y-8">
      <Link href="/ellenori-adatok" className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white">
        <ArrowLeft size={15} aria-hidden /> Ellenőrzések
      </Link>
      <Suspense fallback={<Skeleton className="h-[36rem]" />}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const oid = toObjectId(id);
  if (!oid) notFound();
  const audit = await (await audits()).findOne({ _id: oid });
  if (!audit) notFound();
  const files = await (await auditFiles()).find({ auditId: oid }, { projection: { text: 0 } }).sort({ uploadedAt: -1 }).toArray();

  const count = (level: IssueLevel) => files.reduce((sum, file) => sum + file.issues.filter((issue) => issue.level === level).length, 0);
  const errors = count("error");
  const warnings = count("warning");
  const meta = [audit.area, audit.periodFrom && `Időszak: ${audit.periodFrom}${audit.periodTo ? ` – ${audit.periodTo}` : ""}`, audit.lead && `Felelős: ${audit.lead}`].filter(Boolean);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle eyebrow="04 · Ellenőri adatok" title={audit.name}>
          {meta.length ? `${meta.join(" · ")} · ` : ""}létrehozta: {audit.createdBy}, {formatStamp(audit.createdAt)}
        </PageTitle>
        <AuditDelete
          id={String(audit._id)}
          action={deleteAudit}
          confirmText="Biztosan törlöd az ellenőrzést a feltöltött fájlokkal együtt? A művelet nem vonható vissza."
          label="Ellenőrzés törlése"
        />
      </div>

      {audit.notes && <p className="rounded-2xl border border-white/8 bg-white/3 p-4 text-sm whitespace-pre-wrap text-white/70">{audit.notes}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Feltöltött fájl" value={files.length} icon={Files} tone="text-mint-bright" />
        <Stat label="Hiba" value={errors} icon={CircleAlert} tone={errors ? "text-red-300" : "text-white/70"} />
        <Stat label="Figyelmeztetés" value={warnings} icon={TriangleAlert} tone={warnings ? "text-amber-300" : "text-white/70"} />
      </div>

      <Panel title="Fájlok feltöltése" icon={UploadCloud}>
        <AuditUpload auditId={String(audit._id)} />
      </Panel>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2.5 font-display text-lg font-semibold">
          Feltöltött fájlok <Pill tone="muted">{files.length}</Pill>
        </h2>
        {files.length === 0 ? (
          <Empty icon={Files} title="Még nincs feltöltött fájl" text="A feltöltés után itt látod az automatikus ellenőrzés eredményét." />
        ) : (
          files.map((file) => {
            const Icon = file.kind === "table" ? FileSpreadsheet : /\.(png|jpe?g|webp)$/i.test(file.name) ? FileImage : FileText;
            const preview = `/ellenori-adatok/${id}/fajl/${String(file._id)}`;
            const e = file.issues.filter((issue) => issue.level === "error").length;
            const w = file.issues.filter((issue) => issue.level === "warning").length;
            return (
              <article key={String(file._id)} className="pg-panel rounded-3xl p-5 sm:p-6">
                <div className="flex flex-wrap items-start gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet/15 text-violet-bright">
                    <Icon size={20} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={preview} className="font-semibold break-all hover:text-mint hover:underline hover:underline-offset-4">
                      {file.name}
                    </Link>
                    <p className="text-xs text-white/45">
                      {size(file.size)} · {formatStamp(file.uploadedAt)} · {file.uploadedBy}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {e > 0 && <Pill tone="error">{e} hiba</Pill>}
                    {w > 0 && <Pill tone="warning">{w} figyelmeztetés</Pill>}
                    {e === 0 && w === 0 && <Pill tone="ok">Rendben</Pill>}
                    {file.ocr && (
                      <Pill tone="info" icon={ScanText}>
                        OCR
                      </Pill>
                    )}
                    <AuditDelete id={String(file._id)} action={deleteAuditFile} confirmText={`Törlöd a(z) „${file.name}” fájlt?`} label="Fájl törlése" compact />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={preview} className={buttonClass("secondary", "sm")}>
                    <Eye size={15} aria-hidden /> Előnézet
                  </Link>
                  {file.stored && (
                    <a href={`/ellenori-adatok/fajl/${String(file._id)}?letoltes=1`} download={file.name} className={buttonClass("secondary", "sm")}>
                      <Download size={15} aria-hidden /> Letöltés
                    </a>
                  )}
                </div>
                <ul className="mt-4 space-y-1.5">
                  {file.issues.map((issue, index) => {
                    const level = LEVEL[issue.level];
                    const LevelIcon = level.icon;
                    return (
                      <li key={index} className="flex items-start gap-2.5 text-sm">
                        <LevelIcon size={16} aria-label={level.label} className={`mt-0.5 shrink-0 ${level.text}`} />
                        <span className={issue.level === "info" ? "text-white/60" : "text-white/85"}>{issue.message}</span>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })
        )}
      </section>
    </>
  );
}
