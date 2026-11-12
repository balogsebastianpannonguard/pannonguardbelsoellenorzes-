import "server-only";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import readXlsxFile from "read-excel-file/node";

/** A Vercel-függvények kérése legfeljebb 4,5 MB lehet. */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

export type Cell = string | number | null;
export type Table = { headers: string[]; rows: Cell[][] };

const lower = (name: string) => name.toLowerCase();
export const isTableFile = (name: string) => /\.(xlsx|csv|pdf)$/.test(lower(name));
export const isPdfFile = (name: string) => lower(name).endsWith(".pdf");
export const isTextFile = (name: string) => /\.(pdf|docx|txt)$/.test(lower(name));

export const ACCEPT_TABLES = ".xlsx,.csv,.pdf";
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

/**
 * Táblázat egy szöveges PDF-ből, AI nélkül: a sorokat tabulátor vagy legalább két szóköz tagolja oszlopokra.
 * Ha a PDF-ben nincs kinyerhető szöveg (szkennelt), hibát dob.
 */
async function pdfRows(buffer: Buffer): Promise<string[][]> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const lines: string[][] = [];
  for (let page = 1; page <= pdf.numPages; page++) {
    const { items } = await (await pdf.getPage(page)).getTextContent();
    // Az azonos magasságú szövegdarabok egy sort alkotnak; a nagyobb vízszintes hézag új cellát kezd.
    const rows = new Map<number, { x: number; end: number; size: number; text: string }[]>();
    for (const item of items as { str?: string; transform?: number[]; width?: number }[]) {
      if (!item.str?.trim() || !item.transform) continue;
      const y = Math.round(item.transform[5]);
      const key = [...rows.keys()].find((existing) => Math.abs(existing - y) <= 2) ?? y;
      const list = rows.get(key) ?? [];
      list.push({ x: item.transform[4], end: item.transform[4] + (item.width ?? 0), size: Math.abs(item.transform[0]) || 10, text: item.str });
      rows.set(key, list);
    }
    for (const y of [...rows.keys()].sort((a, b) => b - a)) {
      const parts = rows.get(y)!.sort((a, b) => a.x - b.x);
      const cells: string[] = [];
      let previousEnd = -Infinity;
      for (const part of parts) {
        // Egy szóköznél (a betűméret ~0,3-a) nagyobb hézag már cellahatár.
        const gap = part.x - previousEnd;
        if (cells.length && gap < Math.max(2, part.size * 0.3)) cells[cells.length - 1] += (gap > part.size * 0.15 ? " " : "") + part.text;
        else cells.push(part.text);
        previousEnd = part.end;
      }
      const clean = cells.flatMap((cell) => cell.split(/\t| {2,}/)).map((cell) => cell.trim()).filter(Boolean);
      if (clean.length) lines.push(clean);
    }
  }
  if (!lines.length) throw new Error("A PDF-ben nincs kiolvasható szöveg (valószínűleg szkennelt). Az AI-kulcs bekapcsolásával a szkennelt táblázat is beolvasható.");
  // A fejléc az első olyan sor, amelynek legalább annyi cellája van, mint a sorok jellemző szélessége.
  const counts = lines.map((row) => row.length);
  const typical = counts.sort((a, b) => a - b)[Math.floor(counts.length * 0.75)] ?? 1;
  const start = Math.max(0, lines.findIndex((row) => row.length >= typical));
  return lines.slice(start);
}

/** Excel-, CSV- vagy PDF-táblázat: az első nem üres sor a fejléc. A PDF-et a `rawRows` (pl. AI-kinyerés) is adhatja. */
export async function parseTable(buffer: Buffer, name: string, rawRows?: unknown[][]): Promise<Table & { truncated: boolean }> {
  const file = lower(name);
  let raw: unknown[][];
  if (rawRows) {
    raw = rawRows;
  } else if (file.endsWith(".pdf")) {
    raw = await pdfRows(buffer);
  } else if (file.endsWith(".xlsx")) {
    const sheets = await readXlsxFile(buffer);
    raw = (sheets[0]?.data ?? []) as unknown[][];
  } else if (file.endsWith(".csv")) {
    raw = parseCsv(buffer.toString("utf8"));
  } else {
    throw new Error("Csak Excel (.xlsx), CSV vagy PDF fájl tölthető fel.");
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
