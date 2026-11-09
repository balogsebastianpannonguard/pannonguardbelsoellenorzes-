import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { ItemStatus, TenderItemView, TenderStatus, TenderView } from "@/lib/tenders-shared";

export type TenderDocument = {
  _id: ObjectId;
  name: string;
  issuer: string;
  deadline: string;
  owner: string;
  status: TenderStatus;
  note: string;
  items: { id: string; title: string; owner: string; due?: string; status: ItemStatus }[];
  log: { at: Date; by: string; text: string }[];
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
};

export const tenders = async () => (await getDb()).collection<TenderDocument>("tenders");

function view(doc: TenderDocument): TenderView {
  return {
    id: String(doc._id),
    name: doc.name,
    issuer: doc.issuer,
    deadline: doc.deadline,
    owner: doc.owner,
    status: doc.status,
    note: doc.note,
    items: doc.items.map((item): TenderItemView => ({ ...item })),
    log: [...doc.log].reverse().map((entry) => ({ at: entry.at.toISOString(), by: entry.by, text: entry.text })),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function listTenders() {
  const docs = await (await tenders()).find({}).sort({ deadline: 1 }).limit(500).toArray();
  return docs.map(view);
}

export async function getTender(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const doc = await (await tenders()).findOne({ _id: new ObjectId(id) });
  return doc ? view(doc) : null;
}
