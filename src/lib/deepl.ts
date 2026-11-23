import "server-only";
import { recordExternalSend } from "@/lib/activity";

/**
 * DeepL API (REST v2): a fordítást a DeepL végzi, az ellenőrzést, a szakszavak jelölését és a csevegést a Claude.
 * Csak a szerverről hívható; a kulcs a DEEPL_API_KEY környezeti változóban van. Az ingyenes kulcs „:fx” végű,
 * annak a végpontja más.
 */

export class DeeplError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

/**
 * A DeepL ingyenes (API Free, „:fx” végű) kulcsa a DeepL feltételei szerint a szöveget korlátlan ideig tárolhatja, és
 * személyes adat nem küldhető vele – ezért belső iratokhoz nem használjuk; ilyenkor a Claude fordít. Csak a
 * fizetős (API Pro) kulcs kapcsolja be a DeepL-t. (Kifejezett döntéssel a DEEPL_ALLOW_FREE=1 felülírja.)
 */
export function deeplAvailable() {
  const key = process.env.DEEPL_API_KEY;
  return Boolean(key) && (!key!.endsWith(":fx") || process.env.DEEPL_ALLOW_FREE === "1");
}

const base = () => (process.env.DEEPL_API_KEY?.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com");

/** A rendszer nyelvkódjai → DeepL célnyelvkód. */
const TARGET: Record<string, string> = { hu: "HU", en: "EN-GB", de: "DE", ro: "RO", sk: "SK", uk: "UK", sr: "SR" };

/** DeepL forrásnyelvkód → magyar név a felületre. */
const NAMES: Record<string, string> = {
  AR: "arab", BG: "bolgár", CS: "cseh", DA: "dán", DE: "német", EL: "görög", EN: "angol", ES: "spanyol", ET: "észt",
  FI: "finn", FR: "francia", HE: "héber", HR: "horvát", HU: "magyar", ID: "indonéz", IT: "olasz", JA: "japán", KO: "koreai",
  LT: "litván", LV: "lett", NB: "norvég", NL: "holland", PL: "lengyel", PT: "portugál", RO: "román", RU: "orosz",
  SK: "szlovák", SL: "szlovén", SR: "szerb", SV: "svéd", TR: "török", UK: "ukrán", VI: "vietnámi", ZH: "kínai",
};
export const deeplLanguageName = (code: string) => NAMES[code.toUpperCase()] ?? code.toLowerCase();

async function call<T>(path: string, init: { method?: string; body?: unknown }, timeoutMs = 60_000): Promise<T> {
  const key = process.env.DEEPL_API_KEY;
  if (!key) throw new DeeplError("A DeepL-fordításhoz DEEPL_API_KEY szükséges.");
  let response: Response;
  try {
    response = await fetch(`${base()}${path}`, {
      method: init.method ?? "POST",
      headers: { Authorization: `DeepL-Auth-Key ${key}`, ...(init.body !== undefined && { "content-type": "application/json" }) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    throw new DeeplError((error as Error).name === "TimeoutError" ? "A DeepL túl sokáig válaszolt." : "Nem érhető el a DeepL.");
  }
  if (response.status === 403) throw new DeeplError("Érvénytelen DeepL API-kulcs.", 403);
  if (response.status === 456) throw new DeeplError("Elfogyott a DeepL havi karakterkerete.", 456);
  if (response.status === 429) throw new DeeplError("A DeepL most túlterhelt, próbáld újra egy perc múlva.", 429);
  if (!response.ok) throw new DeeplError(`DeepL-hiba (${response.status}).`, response.status);
  return (response.status === 204 ? undefined : await response.json()) as T;
}

type TranslateResponse = { translations: { detected_source_language: string; text: string }[] };

/** Ideiglenes DeepL-szótár a felhasználó jóváhagyott szakszavaiból; a fordítás után töröljük. */
async function withGlossary<T>(entries: { source: string; target: string }[], source: string, target: string, run: (id?: string) => Promise<T>) {
  const clean = entries
    .map((entry) => ({ source: entry.source.replace(/[\t\r\n]+/g, " ").trim(), target: entry.target.replace(/[\t\r\n]+/g, " ").trim() }))
    .filter((entry) => entry.source && entry.target);
  if (!clean.length) return run();
  let id: string | undefined;
  try {
    const created = await call<{ glossary_id: string }>("/v2/glossaries", {
      body: {
        name: `pg-${Date.now()}`,
        source_lang: source.toLowerCase(),
        target_lang: target.split("-")[0].toLowerCase(),
        entries: [...new Map(clean.map((entry) => [entry.source.toLowerCase(), entry])).values()].map((entry) => `${entry.source}\t${entry.target}`).join("\n"),
        entries_format: "tsv",
      },
    });
    id = created.glossary_id;
  } catch (error) {
    // Ha a nyelvpárhoz nincs DeepL-szótár, a fordítás szótár nélkül fut; a Claude-ellenőrzés után a szakszavakat cseréljük.
    console.warn("[deepl] szótár nem jött létre:", (error as Error).message);
  }
  try {
    return await run(id);
  } finally {
    if (id) await call(`/v2/glossaries/${id}`, { method: "DELETE" }).catch(() => undefined);
  }
}

/**
 * Szövegrészek fordítása egy kérésben. A forrásnyelvet a DeepL ismeri fel; ha van szótár, előbb egy rövid mintán
 * felismerjük a nyelvet (a szótárhoz meg kell adni), majd a teljes szöveget a szótárral fordítjuk.
 */
export async function deeplTranslate({
  texts,
  target,
  formality,
  glossary = [],
}: {
  texts: string[];
  target: string;
  formality: "prefer_more" | "prefer_less" | "default";
  glossary?: { source: string; target: string }[];
}) {
  const targetLang = TARGET[target];
  if (!targetLang) throw new DeeplError("Ezt a célnyelvet a DeepL nem támogatja.");
  if (!deeplAvailable()) throw new DeeplError("A DeepL nincs engedélyezve.");
  await recordExternalSend("DeepL", "fordítás", texts.reduce((sum, text) => sum + text.length, 0));

  const body = (extra: Record<string, unknown>) => ({
    text: texts,
    target_lang: targetLang,
    formality,
    preserve_formatting: true,
    split_sentences: "nonewlines",
    ...extra,
  });

  let sourceLang: string | undefined;
  if (glossary.length) {
    const sample = await call<TranslateResponse>("/v2/translate", { body: { text: [texts.join("\n").slice(0, 300)], target_lang: targetLang } });
    sourceLang = sample.translations[0]?.detected_source_language;
  }

  const result =
    sourceLang && sourceLang.toUpperCase() !== targetLang.split("-")[0]
      ? await withGlossary(glossary, sourceLang, targetLang, (glossaryId) =>
          call<TranslateResponse>("/v2/translate", { body: body(glossaryId ? { source_lang: sourceLang, glossary_id: glossaryId } : {}) }, 90_000),
        )
      : await call<TranslateResponse>("/v2/translate", { body: body({}) }, 90_000);

  return {
    sourceLanguage: deeplLanguageName(result.translations[0]?.detected_source_language ?? sourceLang ?? "?"),
    parts: result.translations.map((item) => item.text),
  };
}
