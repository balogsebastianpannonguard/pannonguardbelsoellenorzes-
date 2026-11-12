"use server";

import { AiError, aiAvailable, aiChat, type ChatTurn } from "@/lib/ai";
import { briefingFrom, buildSystemPrompt, takeQuota } from "@/lib/assistant";
import { ACCEPTED_DOCS, MAX_BATCH_BYTES, MAX_DOC_FILES, digitizeMany } from "@/lib/documents";
import { insightLines, legalRows, loadInsights } from "@/lib/insights";
import { checkAllLaws } from "@/lib/legal";
import type { BriefingItem, DigitizeResponse, Insights, LegalRow } from "@/lib/pajzs-types";
import { requireUser } from "@/lib/session";

export type AssistantState = { reply?: string; error?: string };

const MAX_TURNS = 10;
const MAX_CHARS = 1500;

function cleanTurns(input: unknown): ChatTurn[] {
  if (!Array.isArray(input)) return [];
  const turns = input
    .filter(
      (turn): turn is ChatTurn =>
        typeof turn === "object" &&
        turn !== null &&
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.content === "string" &&
        turn.content.trim().length > 0,
    )
    .map((turn) => ({ role: turn.role, content: turn.content.trim().slice(0, MAX_CHARS) }))
    .slice(-MAX_TURNS);
  // A beszélgetésnek felhasználói üzenettel kell kezdődnie, és azzal is kell végződnie.
  while (turns.length && turns[0].role !== "user") turns.shift();
  return turns.at(-1)?.role === "user" ? turns : [];
}

/** A mai helyzet a lebegő ablak nyitólapjához; AI nélkül is működik. */
export async function assistantBriefing(): Promise<BriefingItem[]> {
  await requireUser();
  return briefingFrom(await loadInsights(new Date()));
}

/** Számok, teendők, iratok, jogszabályok egy lekérésben. */
export async function assistantInsights(): Promise<Insights> {
  await requireUser();
  return loadInsights(new Date());
}

export async function askAssistant(history: ChatTurn[]): Promise<AssistantState> {
  const user = await requireUser();
  if (!aiAvailable()) return { error: "A csevegés még nincs bekapcsolva (hiányzik a GEMINI_API_KEY). A többi fül AI nélkül is működik." };

  const turns = cleanTurns(history);
  if (!turns.length) return { error: "Írj be egy kérdést." };
  if (!(await takeQuota(user.id, "chat", 40))) return { error: "Elfogyott az óránkénti keret (40 kérdés). Próbáld újra később." };

  try {
    const now = new Date();
    const insights = await loadInsights(now);
    const { reply } = await aiChat({ system: buildSystemPrompt(briefingFrom(insights), now, insightLines(insights)), turns });
    return { reply };
  } catch (error) {
    if (error instanceof AiError) return { error: error.message };
    console.error("Asszisztens hiba:", (error as Error).name);
    return { error: "Váratlan hiba történt, próbáld újra." };
  }
}

/** Beérkező iratok digitalizálása: egy vagy több fájl, párhuzamosan; az eredmény strukturált adat. */
export async function digitizeDocuments(formData: FormData): Promise<DigitizeResponse> {
  const user = await requireUser();
  if (!aiAvailable()) return { error: "A digitalizáláshoz AI-kulcs kell (GEMINI_API_KEY)." };

  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (!files.length) return { error: "Válassz ki legalább egy fájlt." };
  if (files.length > MAX_DOC_FILES) return { error: `Egyszerre legfeljebb ${MAX_DOC_FILES} fájl dolgozható fel.` };
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_BATCH_BYTES) return { error: "A fájlok együtt legfeljebb 4 MB-ot tehetnek ki; tölts fel kisebb csomagot." };
  const allowed = new Set(ACCEPTED_DOCS.split(",").map((ext) => ext.slice(1)));
  const bad = files.find((file) => !allowed.has(file.name.split(".").pop()?.toLowerCase() ?? ""));
  if (bad) return { error: `Nem támogatott fájltípus: ${bad.name.slice(0, 60)}.` };
  if (!(await takeQuota(user.id, "docs", 40, files.length))) return { error: "Elfogyott az óránkénti iratkeret (40 fájl). Próbáld újra később." };

  return { results: await digitizeMany(files, user.email) };
}

/** A figyelt jogszabályok azonnali ellenőrzése (a napi automatikus futáson felül). */
export async function assistantLegalCheck(): Promise<{ rows?: LegalRow[]; error?: string }> {
  const user = await requireUser();
  if (!(await takeQuota(user.id, "legal", 4))) return { error: "Óránként legfeljebb 4 ellenőrzés kérhető." };
  await checkAllLaws();
  return { rows: await legalRows() };
}
