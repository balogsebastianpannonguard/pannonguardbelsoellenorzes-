import "server-only";
import type { ObjectId } from "mongodb";
import type { Cell } from "@/lib/files";
import { getDb } from "@/lib/mongodb";

export type DatasetDoc = {
  _id: ObjectId;
  name: string;
  fileName: string;
  headers: string[];
  rows: Cell[][];
  truncated: boolean;
  createdAt: Date;
  createdBy: string;
};

export const datasets = async () => (await getDb()).collection<DatasetDoc>("datasets");

export type ColumnKind = "szám" | "szöveg" | "dátum" | "vegyes" | "üres";

export type ColumnProfile = {
  name: string;
  kind: ColumnKind;
  filled: number;
  empty: number;
  unique: number;
  min?: number;
  max?: number;
  sum?: number;
  avg?: number;
  sample: string[];
};

const DATE = /^\d{4}-\d{2}-\d{2}$|^\d{4}\.\s?\d{2}\.\s?\d{2}\.?$/;

/** Oszloponkénti profil: típus, kitöltöttség, egyedi értékek és számoszlopoknál min/max/összeg/átlag. */
export function profileColumns(headers: string[], rows: Cell[][]): ColumnProfile[] {
  return headers.map((name, index) => {
    let nums = 0;
    let dates = 0;
    let texts = 0;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    const unique = new Set<string>();
    const sample: string[] = [];

    for (const row of rows) {
      const cell = row[index];
      if (cell === null || cell === undefined) continue;
      if (typeof cell === "number") {
        nums += 1;
        sum += cell;
        if (cell < min) min = cell;
        if (cell > max) max = cell;
      } else if (DATE.test(cell)) dates += 1;
      else texts += 1;
      const key = String(cell);
      if (!unique.has(key)) {
        unique.add(key);
        if (sample.length < 3) sample.push(key.length > 40 ? `${key.slice(0, 37)}…` : key);
      }
    }

    const filled = nums + dates + texts;
    const dominant = Math.max(nums, dates, texts);
    let kind: ColumnKind = "üres";
    if (filled > 0) {
      kind = dominant / filled >= 0.9 ? (dominant === nums ? "szám" : dominant === dates ? "dátum" : "szöveg") : "vegyes";
    }
    return {
      name,
      kind,
      filled,
      empty: rows.length - filled,
      unique: unique.size,
      sample,
      ...(nums > 0 && { min, max, sum, avg: sum / nums }),
    };
  });
}
