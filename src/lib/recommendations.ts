import "server-only";
import { ObjectId } from "mongodb";
import { findings } from "@/lib/findings";
import { getDb } from "@/lib/mongodb";
import { PRIORITY_ORDER, type Priority, type RecommendationRow, type RecStatus } from "@/lib/recommendations-meta";

export type RecommendationDoc = {
  _id: ObjectId;
  findingId: ObjectId;
  title: string;
  text: string;
  priority: Priority;
  owner?: string;
  dueDate?: string;
  status: RecStatus;
  source: "kezi" | "ai";
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
};

export const recommendations = async () => (await getDb()).collection<RecommendationDoc>("recommendations");

async function titles(ids: ObjectId[]) {
  const docs = ids.length ? await (await findings()).find({ _id: { $in: ids } }, { projection: { title: 1 } }).toArray() : [];
  return new Map(docs.map((doc) => [String(doc._id), doc.title]));
}

function toRow(doc: RecommendationDoc, names: Map<string, string>): RecommendationRow {
  return {
    id: String(doc._id),
    findingId: String(doc.findingId),
    findingTitle: names.get(String(doc.findingId)) ?? "(törölt megállapítás)",
    title: doc.title,
    text: doc.text,
    priority: doc.priority,
    owner: doc.owner,
    dueDate: doc.dueDate,
    status: doc.status,
    source: doc.source,
    createdAt: doc.createdAt.toISOString(),
    createdBy: doc.createdBy,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function rows(docs: RecommendationDoc[]) {
  const names = await titles([...new Set(docs.map((doc) => String(doc.findingId)))].map((id) => new ObjectId(id)));
  return docs.map((doc) => toRow(doc, names));
}

export async function listRecommendations(): Promise<RecommendationRow[]> {
  const docs = await (await recommendations()).find({}).sort({ createdAt: -1 }).toArray();
  return (await rows(docs)).sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));
}

export async function listRecommendationsFor(findingId: string): Promise<RecommendationRow[]> {
  if (!ObjectId.isValid(findingId)) return [];
  const docs = await (await recommendations()).find({ findingId: new ObjectId(findingId) }).sort({ createdAt: -1 }).toArray();
  return rows(docs);
}

export async function getRecommendationRow(id: string): Promise<RecommendationRow | null> {
  if (!ObjectId.isValid(id)) return null;
  const doc = await (await recommendations()).findOne({ _id: new ObjectId(id) });
  return doc ? (await rows([doc]))[0] : null;
}
