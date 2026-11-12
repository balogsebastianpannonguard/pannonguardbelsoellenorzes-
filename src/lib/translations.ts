import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { ownCollection } from "@/lib/owner";

export type TranslationDoc = {
  _id: ObjectId;
  title: string;
  sourceLanguage: string;
  targetLanguage: string;
  tone: string;
  original: string;
  translated: string;
  terms: { source: string; target: string }[];
  createdAt: Date;
  createdBy: string;
};

/** A belépett felhasználó fordításai. */
export const translations = async () => ownCollection((await getDb()).collection<TranslationDoc>("translations"));

export type TranslationRow = {
  id: string;
  title: string;
  sourceLanguage: string;
  targetLanguage: string;
  tone: string;
  createdAt: string;
  createdBy: string;
};

export async function listTranslations(limit = 30): Promise<TranslationRow[]> {
  const docs = await (await translations())
    .find({}, { projection: { original: 0, translated: 0, terms: 0 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map((doc) => ({
    id: String(doc._id),
    title: doc.title,
    sourceLanguage: doc.sourceLanguage,
    targetLanguage: doc.targetLanguage,
    tone: doc.tone,
    createdAt: doc.createdAt.toISOString(),
    createdBy: doc.createdBy,
  }));
}

export async function getTranslation(id: string) {
  if (!ObjectId.isValid(id)) return null;
  return (await translations()).findOne({ _id: new ObjectId(id) });
}
