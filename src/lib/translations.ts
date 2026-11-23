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
  terms: TranslationTerm[];
  createdAt: Date;
  createdBy: string;
  /** Ki fordított: „DeepL + Claude”, „DeepL” vagy „Claude”. */
  engine?: string;
  /** Kézi szerkesztés (szakszócsere vagy szövegjavítás) ideje. */
  editedAt?: Date;
};

/**
 * Szakkifejezés a fordításban. `uncertain`: az AI nem biztos a fordításban; `alternatives`: további javasolt
 * fordítások; `fromGlossary`: a felhasználó szótárából jött (korábban jóváhagyott fordítás).
 */
export type TranslationTerm = {
  source: string;
  target: string;
  uncertain?: boolean;
  alternatives?: string[];
  note?: string;
  fromGlossary?: boolean;
};

/** A felhasználó szótára: jóváhagyott szakszófordítások, amelyeket a későbbi fordítások kötelezően használnak. */
export type GlossaryDoc = {
  _id: ObjectId;
  source: string;
  /** Kisbetűs, szóközökben egységesített kulcs az egyezéshez. */
  key: string;
  target: string;
  /** A célnyelv neve (pl. „magyar”), mint a TranslationDoc.targetLanguage. */
  targetLanguage: string;
  createdAt: Date;
  updatedAt: Date;
};

export const glossaryKey = (value: string) => value.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();

/** A belépett felhasználó szótára. */
export const glossary = async () => ownCollection((await getDb()).collection<GlossaryDoc>("translation_glossary"));

export type GlossaryRow = { id: string; source: string; target: string; targetLanguage: string; updatedAt: string };

export async function listGlossary(limit = 500): Promise<GlossaryRow[]> {
  const docs = await (await glossary()).find({}).sort({ targetLanguage: 1, key: 1 }).limit(limit).toArray();
  return docs.map((doc) => ({
    id: String(doc._id),
    source: doc.source,
    target: doc.target,
    targetLanguage: doc.targetLanguage,
    updatedAt: doc.updatedAt.toISOString(),
  }));
}

/** A szótár azon bejegyzései, amelyek forrása előfordul a szövegben (kis-nagybetűtől függetlenül). */
export async function glossaryHits(text: string, targetLanguage: string, limit = 200) {
  const haystack = glossaryKey(text);
  const docs = await (await glossary()).find({ targetLanguage }).limit(2000).toArray();
  return docs.filter((doc) => doc.key && haystack.includes(doc.key)).slice(0, limit);
}

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
