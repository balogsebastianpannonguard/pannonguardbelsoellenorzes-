import "server-only";
import { z } from "zod";
import { GEMINI_FAST, GEMINI_SMART, GeminiError, geminiAvailable, geminiGenerate } from "@/lib/gemini";

export class AiError extends Error {}

const MISSING_KEY = "Az AI-funkciókhoz GEMINI_API_KEY szükséges.";

/** Az AI-funkciók akkor érhetők el, ha a szerveren van Gemini-kulcs. */
export function aiAvailable() {
  return geminiAvailable();
}

export type AiTier = "smart" | "cheap";

function explain(error: unknown): never {
  if (error instanceof AiError) throw error;
  if (error instanceof GeminiError) throw new AiError(error.message);
  if ((error as Error)?.name === "TimeoutError") throw new AiError("Az AI túl sokáig válaszolt.");
  throw new AiError("Az AI most nem érhető el.");
}

/** Szabad szöveges válasz (fordítás, javaslatvázlat). */
export async function aiText({ system, content, tier = "smart", maxTokens = 8000 }: { system: string; content: string; tier?: AiTier; maxTokens?: number }) {
  if (!aiAvailable()) throw new AiError(MISSING_KEY);
  try {
    return await geminiGenerate({
      model: tier === "cheap" ? GEMINI_FAST : GEMINI_SMART,
      system,
      turns: [{ role: "user", parts: [{ text: content }] }],
      maxTokens,
      timeoutMs: 150_000,
    });
  } catch (error) {
    explain(error);
  }
}

/** Sémához kötött (JSON) válasz. */
export async function aiJson<T extends z.ZodType>({
  system,
  content,
  schema,
  tier = "smart",
}: {
  system: string;
  content: string;
  schema: T;
  tier?: AiTier;
}): Promise<z.infer<T>> {
  if (!aiAvailable()) throw new AiError(MISSING_KEY);
  try {
    const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
    delete jsonSchema.$schema;
    const raw = await geminiGenerate({
      model: tier === "cheap" ? GEMINI_FAST : GEMINI_SMART,
      system,
      turns: [{ role: "user", parts: [{ text: content }] }],
      maxTokens: 16_000,
      jsonSchema,
      timeoutMs: 150_000,
    });
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) throw new AiError("Az AI-válasz nem volt értelmezhető.");
    return parsed.data;
  } catch (error) {
    if (error instanceof SyntaxError) throw new AiError("Az AI-válasz nem volt értelmezhető.");
    explain(error);
  }
}
