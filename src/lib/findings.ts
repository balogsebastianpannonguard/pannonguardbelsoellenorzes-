import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { ownCollection } from "@/lib/owner";
import {
  SEVERITY_ORDER,
  type AuditFileOption,
  type AuditOption,
  type FindingRow,
  type Severity,
  type Source,
  type Status,
} from "@/lib/findings-meta";

export type FindingDoc = {
  _id: ObjectId;
  title: string;
  description: string;
  evidence?: string;
  area?: string;
  severity: Severity;
  status: Status;
  owner?: string;
  dueDate?: string;
  auditId?: ObjectId;
  fileId?: ObjectId;
  source: Source;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  history: { at: Date; by: string; action: string }[];
};

/** A belépett felhasználó megállapításai. */
export const findings = async () => ownCollection((await getDb()).collection<FindingDoc>("findings"));

/* A „Ellenőrzési adatok” munkaterület gyűjteményei; itt csak olvassuk őket (közös séma). */
type AuditDoc = { _id: ObjectId; name: string; area?: string; createdAt: Date };
type AuditFileDoc = {
  _id: ObjectId;
  auditId: ObjectId;
  name: string;
  kind: "table" | "text";
  text: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
  issues: { level: "info" | "warning" | "error"; message: string }[];
};

const audits = async () => ownCollection((await getDb()).collection<AuditDoc>("audits"));
const auditFiles = async () => ownCollection((await getDb()).collection<AuditFileDoc>("audit_files"));

export async function listAuditOptions(): Promise<AuditOption[]> {
  const docs = await (await audits()).find({}, { projection: { name: 1 } }).sort({ createdAt: -1 }).limit(200).toArray();
  return docs.map((doc) => ({ id: String(doc._id), name: doc.name }));
}

export async function listAuditFileOptions(): Promise<AuditFileOption[]> {
  const docs = await (await auditFiles())
    .find({}, { projection: { auditId: 1, name: 1, issues: 1 } })
    .sort({ uploadedAt: -1 })
    .limit(500)
    .toArray();
  return docs.map((doc) => ({ id: String(doc._id), auditId: String(doc.auditId), name: doc.name, issueCount: doc.issues?.length ?? 0 }));
}

export async function getAuditFile(id: string) {
  if (!ObjectId.isValid(id)) return null;
  return (await auditFiles()).findOne({ _id: new ObjectId(id) });
}

function toRow(doc: FindingDoc, names: Map<string, string>): FindingRow {
  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description,
    evidence: doc.evidence,
    area: doc.area,
    severity: doc.severity,
    status: doc.status,
    owner: doc.owner,
    dueDate: doc.dueDate,
    auditId: doc.auditId ? String(doc.auditId) : undefined,
    auditName: doc.auditId ? names.get(String(doc.auditId)) : undefined,
    source: doc.source,
    createdAt: doc.createdAt.toISOString(),
    createdBy: doc.createdBy,
    updatedAt: doc.updatedAt.toISOString(),
    history: (doc.history ?? []).map((entry) => ({ at: entry.at.toISOString(), by: entry.by, action: entry.action })),
  };
}

async function auditNames() {
  return new Map((await listAuditOptions()).map((audit) => [audit.id, audit.name]));
}

/** Rendezés: súlyosság, majd határidő, majd újdonság szerint. */
export async function listFindings(): Promise<FindingRow[]> {
  const [docs, names] = await Promise.all([(await findings()).find({}).toArray(), auditNames()]);
  return docs
    .map((doc) => toRow(doc, names))
    .sort(
      (a, b) =>
        SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
        (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
        b.createdAt.localeCompare(a.createdAt),
    );
}

export async function getFindingRow(id: string): Promise<FindingRow | null> {
  if (!ObjectId.isValid(id)) return null;
  const doc = await (await findings()).findOne({ _id: new ObjectId(id) });
  return doc ? toRow(doc, await auditNames()) : null;
}

export const isOpen = (status: Status) => status === "nyitott" || status === "folyamatban";
