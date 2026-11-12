import "server-only";
import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { Binary, ObjectId } from "mongodb";
import { aiAvailable, aiText } from "@/lib/ai";
import { getDb } from "@/lib/mongodb";

/** A figyelt jogszabályok alapkészlete; a belső ellenőrzés számára releváns okok mellett. */
export const BASE_LAWS = [
  {
    id: "mt",
    name: "Munka Törvénykönyve",
    cite: "2012. évi I. törvény",
    why: "Munkaidő, pihenőidő, rendkívüli munka, szabadság – a munkaügyi ellenőrzések alapja.",
    url: "https://njt.jog.gov.hu/jogszabaly/2012-1-00-00",
  },
  {
    id: "szvtv",
    name: "Személy- és vagyonvédelmi tv.",
    cite: "2005. évi CXXXIII. törvény",
    why: "A vagyonőri tevékenység engedélyei, a szolgálati igazolvány és az intézkedési jogkör szabályai.",
    url: "https://njt.jog.gov.hu/jogszabaly/2005-133-00-00",
  },
  {
    id: "infotv",
    name: "Információs önrendelkezési jog tv.",
    cite: "2011. évi CXII. törvény",
    why: "Személyes adatok kezelése: munkavállalói törzsadatok, nyilvántartások, kamerás megfigyelés.",
    url: "https://njt.jog.gov.hu/jogszabaly/2011-112-00-00",
  },
  {
    id: "kibertv",
    name: "Magyarország kiberbiztonságáról",
    cite: "2024. évi LXIX. törvény",
    why: "A NIS2-irányelv hazai átültetése: a szervezet kiberbiztonsági kötelezettségei és ellenőrzése.",
    url: "https://njt.jog.gov.hu/jogszabaly/2024-69-00-00",
  },
  {
    id: "kbt",
    name: "Közbeszerzési törvény",
    cite: "2015. évi CXLIII. törvény",
    why: "Közbeszerzési eljárások és pályázati anyagok szabályossága, dokumentációs követelmények.",
    url: "https://njt.jog.gov.hu/jogszabaly/2015-143-00-00",
  },
  {
    id: "szamvitel",
    name: "Számviteli törvény",
    cite: "2000. évi C. törvény",
    why: "Könyvvezetés, beszámoló és bizonylati rend – a pénzügyi ellenőrzések alapja.",
    url: "https://njt.jog.gov.hu/jogszabaly/2000-100-00-00",
  },
] as const;

// A Nemzeti Jogszabálytár az njt.hu-ról az njt.jog.gov.hu-ra irányít át; mindkettő elfogadott.
const ALLOWED_HOSTS = new Set(["njt.hu", "www.njt.hu", "njt.jog.gov.hu"]);

/** Csak a Nemzeti Jogszabálytár https-címe fogadható el (a szerver innen tölt le). */
export function validLawUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

type HistoryEntry = { at: Date; summary?: string; added: string[]; removed: string[] };

type LawDocument = {
  _id: ObjectId;
  name: string;
  cite: string;
  url: string;
  why: string;
  createdAt: Date;
  createdBy: string;
};

type WatchDocument = {
  _id: string;
  hash?: string;
  /** A legutóbbi állapot gzip-elt egyszerű szövege, a változás kiemeléséhez. */
  text?: Binary;
  checkedAt?: Date;
  changedAt?: Date;
  state: "same" | "changed" | "error";
  summary?: string;
  added?: string[];
  removed?: string[];
  error?: string;
  history?: HistoryEntry[];
  /** Érintett belső szabályzat / teendő. */
  note?: string;
  /** Hatálybalépés (ÉÉÉÉ-HH-NN). */
  effectiveDate?: string;
};

export const customLaws = async () => (await getDb()).collection<LawDocument>("legal_laws");
const watch = async () => (await getDb()).collection<WatchDocument>("legal_watch");

export type LawRow = {
  id: string;
  custom: boolean;
  name: string;
  cite: string;
  why: string;
  url: string;
  state: "unknown" | "same" | "changed" | "error";
  checkedAt?: string;
  changedAt?: string;
  summary?: string;
  added: string[];
  removed: string[];
  error?: string;
  note: string;
  effectiveDate: string;
  history: { at: string; summary?: string; added: string[]; removed: string[] }[];
};

function plainText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&sect;/g, "§")
    .replace(/\s+/g, " ")
    .trim();
}

const segmentsOf = (value: string) =>
  value
    .split(/(?<=[.;:])\s+(?=[A-ZÁÉÍÓÖŐÚÜŰ0-9(])/)
    .map((part) => part.trim())
    .filter((part) => part.length > 25);

function diffSegments(before: string, after: string) {
  const old = new Set(segmentsOf(before));
  const now = new Set(segmentsOf(after));
  const clip = (value: string) => (value.length > 280 ? `${value.slice(0, 277)}…` : value);
  return {
    added: [...now].filter((part) => !old.has(part)).slice(0, 8).map(clip),
    removed: [...old].filter((part) => !now.has(part)).slice(0, 8).map(clip),
  };
}

async function fetchLaw(url: string) {
  if (!validLawUrl(url)) throw new Error("Nem engedélyezett cím");
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; PannonGuardLegalWatch/1.0)", "accept-language": "hu" },
    signal: AbortSignal.timeout(45_000),
    cache: "no-store",
  });
  if (!validLawUrl(response.url)) throw new Error("Nem engedélyezett átirányítás");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const value = plainText(await response.text());
  // Hibaoldalt vagy üres választ ne tekintsünk a jogszabály új állapotának.
  if (value.length < 5_000) throw new Error("Túl rövid válasz");
  return value;
}

/** Megkeresi a jogszabályt (alap vagy egyéni) az azonosítója alapján. */
async function findLaw(id: string): Promise<{ name: string; cite: string; url: string } | null> {
  const base = BASE_LAWS.find((law) => law.id === id);
  if (base) return base;
  if (!ObjectId.isValid(id)) return null;
  return (await (await customLaws()).findOne({ _id: new ObjectId(id) })) ?? null;
}

/** Egy jogszabály ellenőrzése: első futáskor alapállapotot rögzít, később a változást észleli és összefoglalja. */
export async function checkLaw(id: string) {
  const law = await findLaw(id);
  if (!law) return;
  const collection = await watch();
  const previous = await collection.findOne({ _id: id });
  const now = new Date();

  let current: string;
  try {
    current = await fetchLaw(law.url);
  } catch (error) {
    await collection.updateOne(
      { _id: id },
      { $set: { state: "error", checkedAt: now, error: (error as Error).message.slice(0, 80) } },
      { upsert: true },
    );
    return;
  }
  const hash = createHash("sha256").update(current).digest("hex");
  const packed = new Binary(gzipSync(Buffer.from(current, "utf8")));

  if (!previous?.hash) {
    await collection.updateOne(
      { _id: id },
      { $set: { hash, text: packed, checkedAt: now, state: "same" }, $unset: { error: "" } },
      { upsert: true },
    );
    return;
  }
  if (previous.hash === hash) {
    await collection.updateOne(
      { _id: id },
      { $set: { checkedAt: now, state: previous.state === "changed" ? "changed" : "same" }, $unset: { error: "" } },
    );
    return;
  }

  const oldText = previous.text ? gunzipSync(Buffer.from(previous.text.buffer)).toString("utf8") : "";
  const { added, removed } = diffSegments(oldText, current);
  const substantive = added.length > 0 || removed.length > 0;

  let summary: string | undefined;
  if (substantive && aiAvailable()) {
    try {
      summary = await aiText({
        system:
          "A PannonGuard Biztonsági Szolgáltató Zrt. belső ellenőrzési területének jogi figyelőasszisztense vagy. Magyarul, 3–4 mondatban, közérthetően foglald össze, mi változott a jogszabályban, és mit jelenthet ez a vállalat belső szabályzataira, ellenőrzési gyakorlatára. Csak az alábbi szövegrészletekre támaszkodj; ha nem derül ki a hatás, mondd ki. Jogi tanácsot ne adj, javasold a jogász megkeresését.",
        content: `Jogszabály: ${law.cite} – ${law.name}\n\nÚj / módosult szövegrészek:\n${added.map((part) => `+ ${part}`).join("\n") || "(nincs)"}\n\nElhagyott szövegrészek:\n${removed.map((part) => `- ${part}`).join("\n") || "(nincs)"}`,
        tier: "cheap",
        maxTokens: 1500,
      });
    } catch {
      summary = undefined;
    }
  }

  if (!substantive) {
    // Csak a lap egyéb (dinamikus) elemei változtak: nem tekintjük jogszabályváltozásnak, de az új alapállapotot rögzítjük.
    await collection.updateOne(
      { _id: id },
      { $set: { hash, text: packed, checkedAt: now, state: previous.state === "changed" ? "changed" : "same" }, $unset: { error: "" } },
    );
    return;
  }

  await collection.updateOne(
    { _id: id },
    {
      $set: { hash, text: packed, checkedAt: now, state: "changed", changedAt: now, added, removed, summary: summary ?? "" },
      $push: { history: { $each: [{ at: now, ...(summary && { summary }), added, removed }], $slice: -30 } },
      $unset: { error: "" },
    },
  );
}

export async function checkAllLaws() {
  const custom = await (await customLaws()).find({}, { projection: { _id: 1 } }).toArray();
  const ids = [...BASE_LAWS.map((law) => law.id as string), ...custom.map((law) => String(law._id))];
  await Promise.allSettled(
    ids.map((id) => checkLaw(id).catch((error) => console.error("Jogszabály-ellenőrzési hiba:", id, (error as Error).name))),
  );
}

export async function listLaws(): Promise<LawRow[]> {
  const [custom, docs] = await Promise.all([
    (await customLaws()).find({}).sort({ createdAt: 1 }).limit(200).toArray(),
    (await watch()).find({}, { projection: { text: 0, hash: 0 } }).toArray(),
  ]);
  const byId = new Map(docs.map((doc) => [doc._id, doc]));
  const rows = [
    ...BASE_LAWS.map((law) => ({ id: law.id as string, custom: false, name: law.name, cite: law.cite, why: law.why, url: law.url })),
    ...custom.map((law) => ({ id: String(law._id), custom: true, name: law.name, cite: law.cite, why: law.why, url: law.url })),
  ];
  return rows.map((law): LawRow => {
    const doc = byId.get(law.id);
    return {
      ...law,
      state: doc?.state ?? "unknown",
      checkedAt: doc?.checkedAt?.toISOString(),
      changedAt: doc?.changedAt?.toISOString(),
      summary: doc?.summary || undefined,
      added: doc?.added ?? [],
      removed: doc?.removed ?? [],
      error: doc?.error,
      note: doc?.note ?? "",
      effectiveDate: doc?.effectiveDate ?? "",
      history: [...(doc?.history ?? [])].reverse().map((entry) => ({
        at: entry.at.toISOString(),
        summary: entry.summary,
        added: entry.added,
        removed: entry.removed,
      })),
    };
  });
}

export async function saveMeta(id: string, note: string, effectiveDate: string) {
  await (await watch()).updateOne(
    { _id: id },
    { $set: { note, effectiveDate } },
    { upsert: true },
  );
}

/** A változás átnézve: a jogszabály újra „nincs változás” állapotú (az előzmények megmaradnak). */
export async function acknowledgeChange(id: string) {
  await (await watch()).updateOne({ _id: id, state: "changed" }, { $set: { state: "same" } });
}

export async function lawExists(id: string) {
  return (await findLaw(id)) !== null;
}

export async function removeCustomLaw(id: string) {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await customLaws()).deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 1) await (await watch()).deleteOne({ _id: id });
  return result.deletedCount === 1;
}

export async function insertCustomLaw(law: { name: string; cite: string; url: string; why: string }, by: string) {
  const _id = new ObjectId();
  await (await customLaws()).insertOne({ _id, ...law, createdAt: new Date(), createdBy: by });
  return String(_id);
}
