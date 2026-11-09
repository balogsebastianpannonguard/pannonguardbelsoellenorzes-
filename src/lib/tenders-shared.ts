/** A pályázatok közös (kliens és szerver által is használt) állandói. */
export const TENDER_STATUS = {
  elokeszites: { label: "Előkészítés", tone: "muted", active: true },
  osszeallitas: { label: "Összeállítás", tone: "info", active: true },
  beadva: { label: "Beadva", tone: "ok", active: false },
  eredmenyre_var: { label: "Eredményre vár", tone: "warning", active: false },
  nyert: { label: "Nyert", tone: "ok", active: false },
  elutasitva: { label: "Elutasítva", tone: "error", active: false },
} as const;
export type TenderStatus = keyof typeof TENDER_STATUS;
export const TENDER_STATUS_KEYS = Object.keys(TENDER_STATUS) as TenderStatus[];

export const ITEM_STATUS = {
  hianyzik: { label: "Hiányzik", tone: "error" },
  folyamatban: { label: "Folyamatban", tone: "warning" },
  kesz: { label: "Kész", tone: "ok" },
} as const;
export type ItemStatus = keyof typeof ITEM_STATUS;
export const ITEM_STATUS_KEYS = Object.keys(ITEM_STATUS) as ItemStatus[];

export type TenderItemView = { id: string; title: string; owner: string; due?: string; status: ItemStatus };
export type TenderLogView = { at: string; by: string; text: string };
export type TenderView = {
  id: string;
  name: string;
  issuer: string;
  deadline: string;
  owner: string;
  status: TenderStatus;
  note: string;
  items: TenderItemView[];
  log: TenderLogView[];
  createdAt: string;
  updatedAt: string;
};

export function progress(items: { status: ItemStatus }[]) {
  if (items.length === 0) return 0;
  return Math.round((items.filter((item) => item.status === "kesz").length / items.length) * 100);
}

/** Hány nap van a megadott napig (negatív: már elmúlt). Mindkét érték ÉÉÉÉ-HH-NN. */
export function daysBetween(fromDay: string, toDay: string) {
  return Math.round((Date.parse(`${toDay}T12:00:00Z`) - Date.parse(`${fromDay}T12:00:00Z`)) / 86_400_000);
}
