export const SEVERITIES = { alacsony: "Alacsony", kozepes: "Közepes", magas: "Magas", kritikus: "Kritikus" } as const;
export type Severity = keyof typeof SEVERITIES;
export const SEVERITY_ORDER: Severity[] = ["kritikus", "magas", "kozepes", "alacsony"];
export const SEVERITY_TONE = { alacsony: "muted", kozepes: "info", magas: "warning", kritikus: "error" } as const;

export const STATUSES = {
  javasolt: "Javasolt",
  nyitott: "Nyitott",
  folyamatban: "Folyamatban",
  lezart: "Lezárt",
  elvetett: "Elvetett",
} as const;
export type Status = keyof typeof STATUSES;
export const STATUS_TONE = { javasolt: "info", nyitott: "warning", folyamatban: "info", lezart: "ok", elvetett: "muted" } as const;

export const SOURCES = { kezi: "Kézi", ai: "AI-javaslat", fajl: "Fájl ellenőrzése" } as const;
export type Source = keyof typeof SOURCES;

export const isSeverity = (value: string): value is Severity => value in SEVERITIES;
export const isStatus = (value: string): value is Status => value in STATUSES;

export type FindingRow = {
  id: string;
  title: string;
  description: string;
  evidence?: string;
  area?: string;
  severity: Severity;
  status: Status;
  owner?: string;
  dueDate?: string;
  auditId?: string;
  auditName?: string;
  source: Source;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  history: { at: string; by: string; action: string }[];
};

export type AuditOption = { id: string; name: string };
export type AuditFileOption = { id: string; auditId: string; name: string; issueCount: number };
