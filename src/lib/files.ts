import "server-only";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import readXlsxFile from "read-excel-file/node";

/** A Vercel-függvények kérése legfeljebb 4,5 MB lehet. */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

export type Cell = string | number | null;
export type Table = { headers: string[]; rows: Cell[][] };

const lower = (name: string) => name.toLowerCase();
export const isTableFile = (name: string) => /\.(xlsx|csv)$/.test(lower(name));
export const isTextFile = (name: string) => /\.(pdf|docx|txt)$/.test(lower(name));

export const ACCEPT_TABLES = ".xlsx,.csv";
export const ACCEPT_TEXT = ".pdf,.docx,.txt";
export const ACCEPT_ALL = ".xlsx,.csv,.pdf,.docx,.txt";

/** PDF, Word vagy szöveges fájl szövege. */
export async function extractDocumentText(buffer: Buffer, name: string): Promise<{ text: string; pages?: number }> {
  const file = lower(name);
  if (file.endsWith(".pdf")) {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text, totalPages } = await extractText(pdf, { mergePages: false });
    return { text: text.join("\n\n").trim(), pages: totalPages };
  }
  if (file.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer });
    return { text: value.trim() };
  }
  if (file.endsWith(".txt")) return { text: buffer.toString("utf8").trim() };
  throw new Error("Csak PDF, Word (.docx) vagy szöveges (.txt) fájl tölthető fel.");
}

function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const first = clean.split("\n", 1)[0] ?? "";
  const delimiter = [";", "\t", ","].reduce((best, d) => (first.split(d).length > first.split(best).length ? d : best), ",");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (quoted) {
      if (char === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && clean[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

/** Számmá alakítja a magyar és angol formátumú számokat ("1 234,5", "1,234.5"); egyébként szöveg marad. */
export function toCell(value: unknown): Cell {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  if (text === "") return null;
  if (/^-?\d{1,3}([  ]\d{3})*(,\d+)?$|^-?\d+(,\d+)?$/.test(text)) return Number(text.replace(/[  ]/g, "").replace(",", "."));
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return text;
}

export const MAX_ROWS = 5000;
export const MAX_COLUMNS = 60;

/** Excel- vagy CSV-táblázat: az első nem üres sor a fejléc. */
export async function parseTable(buffer: Buffer, name: string): Promise<Table & { truncated: boolean }> {
  const file = lower(name);
  let raw: unknown[][];
  if (file.endsWith(".xlsx")) {
    const sheets = await readXlsxFile(buffer);
    raw = (sheets[0]?.data ?? []) as unknown[][];
  } else if (file.endsWith(".csv")) {
    raw = parseCsv(buffer.toString("utf8"));
  } else {
    throw new Error("Csak Excel (.xlsx) vagy CSV fájl tölthető fel.");
  }
  const filled = raw.filter((row) => row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ""));
  if (filled.length < 2) throw new Error("A táblázatban nincs fejléc és legalább egy adatsor.");
  const width = Math.min(MAX_COLUMNS, Math.max(...filled.map((row) => row.length)));
  const seen = new Map<string, number>();
  const headers = Array.from({ length: width }, (_, index) => {
    const base = String(filled[0][index] ?? "").trim() || `Oszlop ${index + 1}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count > 1 ? `${base} (${count})` : base;
  });
  const body = filled.slice(1);
  const rows = body.slice(0, MAX_ROWS).map((row) => Array.from({ length: width }, (_, index) => toCell(row[index])));
  return { headers, rows, truncated: body.length > MAX_ROWS };
}
