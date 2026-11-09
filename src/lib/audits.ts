import "server-only";
import type { ObjectId } from "mongodb";
import type { Cell } from "@/lib/files";
import { getDb } from "@/lib/mongodb";

export type AuditDoc = {
  _id: ObjectId;
  name: string;
  area?: string;
  periodFrom?: string;
  periodTo?: string;
  lead?: string;
  notes?: string;
  createdAt: Date;
  createdBy: string;
};

export type IssueLevel = "info" | "warning" | "error";
export type AuditIssue = { level: IssueLevel; message: string };

/** A hiányosságok AI-s feltárása (C ág) ezt a szerződést olvassa – a mezőnevek nem változhatnak. */
export type AuditFileDoc = {
  _id: ObjectId;
  auditId: ObjectId;
  name: string;
  kind: "table" | "text";
  /** Szöveges fájlnál a kinyert szöveg, táblázatnál a fejléc és az első 300 sor TSV-ben (legfeljebb ~60 000 karakter). */
  text: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
  issues: AuditIssue[];
};

export const audits = async () => (await getDb()).collection<AuditDoc>("audits");
export const auditFiles = async () => (await getDb()).collection<AuditFileDoc>("audit_files");

export const MAX_STORED_TEXT = 60_000;

const pct = (part: number, whole: number) => `${Math.round((part / whole) * 100)}%`;
const hu = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 });
const ORDER: Record<IssueLevel, number> = { error: 0, warning: 1, info: 2 };
export const sortIssues = (issues: AuditIssue[]) => [...issues].sort((a, b) => ORDER[a.level] - ORDER[b.level]);

/** A táblázat TSV-formában tárolt, rövidített változata. */
export function tableText(headers: string[], rows: Cell[][]) {
  const body = rows.slice(0, 300).map((row) => row.map((cell) => (cell === null ? "" : String(cell).replace(/[\t\r\n]+/g, " "))).join("\t"));
  return [headers.join("\t"), ...body].join("\n").slice(0, MAX_STORED_TEXT);
}

/** Beérkezéskori formai és tartalmi ellenőrzés táblázatokra. */
export function analyzeTable(headers: string[], rows: Cell[][], truncated: boolean): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const width = headers.length;
  issues.push({ level: "info", message: `${rows.length} adatsor, ${width} oszlop.` });
  if (truncated) issues.push({ level: "info", message: "A fájl hosszabb, ezért csak az első 5000 sort vizsgáltuk." });

  const unnamed = headers.filter((header) => /^Oszlop \d+$/.test(header)).length;
  if (unnamed > 0) issues.push({ level: "warning", message: `Hiányzó fejléc: ${unnamed} oszlopnak nincs neve.` });
  if (width > 1 && headers.filter((header) => /^-?\d+([.,]\d+)?$/.test(header)).length > width / 2) {
    issues.push({ level: "warning", message: "Az első sor adatnak tűnik, valószínűleg hiányzik a fejléc." });
  }

  const total = rows.length * width;
  if (total > 0) {
    let empty = 0;
    let emptyRows = 0;
    const seen = new Set<string>();
    let duplicates = 0;
    const columnEmpty = new Array<number>(width).fill(0);
    for (const row of rows) {
      let rowEmpty = 0;
      for (let index = 0; index < width; index++) {
        if (row[index] === null || row[index] === undefined) {
          rowEmpty += 1;
          columnEmpty[index] += 1;
        }
      }
      empty += rowEmpty;
      if (rowEmpty === width) emptyRows += 1;
      const key = JSON.stringify(row);
      if (seen.has(key)) duplicates += 1;
      else seen.add(key);
    }

    if (empty > 0) {
      const share = empty / total;
      issues.push({
        level: share > 0.5 ? "error" : share > 0.2 ? "warning" : "info",
        message: `Az üres cellák aránya ${pct(empty, total)} (${empty} cella).`,
      });
    }
    for (let index = 0; index < width; index++) {
      if (columnEmpty[index] / rows.length > 0.5) {
        issues.push({ level: "warning", message: `A(z) „${headers[index]}” oszlop ${pct(columnEmpty[index], rows.length)}-a üres.` });
      }
    }
    if (emptyRows > 0) issues.push({ level: "warning", message: `${emptyRows} teljesen üres sor.` });
    if (duplicates > 0) {
      issues.push({
        level: duplicates / rows.length > 0.1 ? "error" : "warning",
        message: `${duplicates} duplikált sor (${pct(duplicates, rows.length)}).`,
      });
    }

    for (let index = 0; index < width; index++) {
      const numbers: number[] = [];
      let texts = 0;
      for (const row of rows) {
        const cell = row[index];
        if (typeof cell === "number") numbers.push(cell);
        else if (cell !== null && cell !== undefined) texts += 1;
      }
      const filled = numbers.length + texts;
      if (filled === 0) continue;
      const numberShare = numbers.length / filled;
      if (numbers.length > 0 && texts > 0 && numberShare >= 0.05 && numberShare <= 0.95) {
        issues.push({
          level: "warning",
          message: `A(z) „${headers[index]}” oszlop vegyes típusú: ${numbers.length} szám és ${texts} szöveg.`,
        });
      }
      if (numbers.length >= 8 && numberShare >= 0.8) {
        const mean = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
        const deviation = Math.sqrt(numbers.reduce((sum, value) => sum + (value - mean) ** 2, 0) / numbers.length);
        if (deviation > 0) {
          const outliers = numbers.filter((value) => Math.abs(value - mean) / deviation > 3);
          if (outliers.length > 0) {
            const example = outliers.reduce((far, value) => (Math.abs(value - mean) > Math.abs(far - mean) ? value : far));
            issues.push({
              level: "warning",
              message: `A(z) „${headers[index]}” oszlopban ${outliers.length} szokatlan érték van (pl. ${hu.format(example)}; átlag: ${hu.format(mean)}).`,
            });
          }
        }
      }
    }
  }

  if (!issues.some((issue) => issue.level !== "info")) {
    issues.push({ level: "info", message: "Nem találtunk formai problémát." });
  }
  return sortIssues(issues);
}

/** Beérkezéskori ellenőrzés szöveges iratokra (PDF, Word, szöveg). */
export function analyzeText(text: string, fileName: string, pages?: number): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const isPdf = fileName.toLowerCase().endsWith(".pdf");
  const length = text.trim().length;

  if (length === 0) {
    issues.push({
      level: "error",
      message: isPdf
        ? "Nincs kinyerhető szöveg: valószínűleg szkennelt (képes) PDF, szövegfelismerés (OCR) szükséges."
        : "A fájl üres.",
    });
    return issues;
  }

  const words = text.split(/\s+/).filter(Boolean).length;
  issues.push({ level: "info", message: `${hu.format(length)} karakter, kb. ${hu.format(words)} szó${pages ? `, ${pages} oldal` : ""}.` });
  if (length < 200) issues.push({ level: "warning", message: `Nagyon rövid szöveg (${length} karakter), lehet, hogy hiányos.` });
  if (isPdf && pages && length / pages < 150) {
    issues.push({ level: "warning", message: "Oldalanként nagyon kevés szöveg van, a PDF részben szkennelt lehet." });
  }
  const garbled = (text.match(/�|[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g) ?? []).length;
  if (garbled / length > 0.02) {
    issues.push({ level: "warning", message: `Sok olvashatatlan karakter (${pct(garbled, length)}), a szöveg kinyerése hibás lehet.` });
  }
  if (length > MAX_STORED_TEXT) {
    issues.push({ level: "info", message: `A tárolt szöveg az első ${hu.format(MAX_STORED_TEXT)} karakterre korlátozott.` });
  }
  if (!issues.some((issue) => issue.level === "warning" || issue.level === "error")) {
    issues.push({ level: "info", message: "Nem találtunk formai problémát." });
  }
  return sortIssues(issues);
}
