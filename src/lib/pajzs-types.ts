/** A lebegő asszisztens (Pajzs) kliens- és szerveroldal közti közös típusai; semmilyen szerveroldali kódot nem importál. */

export type BriefingItem = { tone: "ok" | "warn" | "bad" | "info"; text: string; href?: string };

export type AnomalyItem = {
  level: "error" | "warning";
  /** A munkaterület rövid neve (pl. „Hiányosság”, „Pályázat”). */
  area: string;
  title: string;
  message: string;
  date?: string;
  href: string;
};

export type DocRow = {
  id: string;
  fileName: string;
  docType: string;
  title: string;
  date: string;
  summary: string;
  createdAt: string;
  issues: number;
};

export type LegalRow = {
  id: string;
  name: string;
  cite: string;
  why: string;
  url: string;
  state: "unknown" | "same" | "changed" | "error";
  checkedAt?: string;
  changedAt?: string;
  summary?: string;
  added?: string[];
  removed?: string[];
};

export type TenderPulse = {
  id: string;
  name: string;
  deadline: string;
  daysLeft: number;
  progress: number;
  missing: number;
  status: string;
};

export type Insights = {
  today: string;
  findings: {
    total: number;
    open: number;
    overdue: number;
    closedPct: number;
    /** Nyitott megállapítások súlyosság szerint (kritikustól az alacsonyig). */
    severity: { key: string; label: string; count: number }[];
    /** Az elmúlt 8 hét új megállapításai hetente. */
    trend: { label: string; count: number }[];
  };
  tenders: { active: number; items: TenderPulse[] };
  recommendations: { draft: number; approved: number; rejected: number; coveragePct: number };
  work: { audits: number; files: number; datasets: number; translations: number; documents: number };
  anomalies: { errors: number; warnings: number; items: AnomalyItem[] };
  docs: { total: number; recent: DocRow[] };
  legal: LegalRow[];
};

export type DocData = {
  docType: string;
  title: string;
  date: string;
  parties: string[];
  amounts: { label: string; value: number; currency: string }[];
  deadlines: { label: string; date: string }[];
  summary: string;
  actionItems: string[];
  issues: string[];
  language: string;
  confidence: "magas" | "kozepes" | "alacsony";
};

export type DigitizeResult = {
  fileName: string;
  ok: boolean;
  duplicate?: boolean;
  id?: string;
  data?: DocData;
  error?: string;
};

export type DigitizeResponse = { results?: DigitizeResult[]; error?: string };

export const DOC_TYPES: Record<string, string> = {
  szerzodes: "Szerződés",
  szamla: "Számla",
  bizonylat: "Bizonylat",
  jegyzokonyv: "Jegyzőkönyv",
  szabalyzat: "Szabályzat",
  palyazat: "Pályázati anyag",
  hatarozat: "Határozat / hatósági irat",
  jelentes: "Ellenőrzési jelentés",
  munkaugyi: "Munkaügyi irat",
  level: "Levél",
  egyeb: "Egyéb",
};

/** Böngészőoldali hibák rövid naplója, amit a hibabejelentéshez mellékelünk. */
export type ClientIssue = { at: string; message: string };
