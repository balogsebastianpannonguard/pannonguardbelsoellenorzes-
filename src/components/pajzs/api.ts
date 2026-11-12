import type { BriefingItem, DigitizeResponse, Insights, LegalRow } from "@/lib/pajzs-types";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type TicketInput = { kind: string; priority: string; title: string; description: string; page: string; diagnostics?: string[] };
export type TicketResult = { ok?: boolean; number?: string; emailed?: boolean; error?: string };

/** A szerveroldali műveletek (vagy a bemutató próbabábuk) csomagja, amit a lebegő ablak használ. */
export type PajzsApi = {
  ask: (history: ChatMessage[]) => Promise<{ reply?: string; error?: string }>;
  briefing: () => Promise<BriefingItem[]>;
  insights: () => Promise<Insights>;
  digitize: (formData: FormData) => Promise<DigitizeResponse>;
  legalCheck: () => Promise<{ rows?: LegalRow[]; error?: string }>;
  ticket: (input: TicketInput) => Promise<TicketResult>;
};
