export const PRIORITIES = { alacsony: "Alacsony", kozepes: "Közepes", magas: "Magas" } as const;
export type Priority = keyof typeof PRIORITIES;
export const PRIORITY_ORDER: Priority[] = ["magas", "kozepes", "alacsony"];

export const REC_STATUSES = { tervezet: "Tervezet", jovahagyva: "Jóváhagyva", elutasitva: "Elutasítva" } as const;
export type RecStatus = keyof typeof REC_STATUSES;
export const REC_TONE = { tervezet: "info", jovahagyva: "ok", elutasitva: "muted" } as const;

export const isPriority = (value: string): value is Priority => Object.hasOwn(PRIORITIES, value);
export const isRecStatus = (value: string): value is RecStatus => Object.hasOwn(REC_STATUSES, value);

export type RecommendationRow = {
  id: string;
  findingId: string;
  findingTitle: string;
  title: string;
  text: string;
  priority: Priority;
  owner?: string;
  dueDate?: string;
  status: RecStatus;
  source: "kezi" | "ai";
  createdAt: string;
  createdBy: string;
  updatedAt: string;
};
