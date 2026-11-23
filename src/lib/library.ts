import "server-only";
import type { Binary, ObjectId } from "mongodb";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import { extractDocumentText } from "@/lib/files";
import { getDb } from "@/lib/mongodb";
import { ownCollection } from "@/lib/owner";

/**
 * Dokumentumtár: a felhasználó feltöltött iratai (PDF, Word, szöveg, kép) eredetivel, előnézettel és kinyert
 * szöveggel. Mint minden munkaterület, felhasználónként elkülönített.
 */
export type LibraryKind = "pdf" | "docx" | "doc" | "txt" | "image";

export type LibraryDoc = {
  _id: ObjectId;
  name: string;
  kind: LibraryKind;
  contentType: string;
  size: number;
  /** A kinyert (szkennelt iratnál AI-val felismert) szöveg. */
  text: string;
  /** Az első néhány sor a listához. */
  snippet: string;
  pages?: number;
  /** A szöveget szövegfelismerés (OCR) adta. */
  ocr?: boolean;
  /** Ha a szöveg nem nyerhető ki (pl. szkennelt irat AI nélkül), a felhasználónak szóló magyarázat. */
  notice?: string;
  uploadedAt: Date;
  uploadedBy: string;
};

/** Az eredeti fájl; az azonosítója megegyezik a dokumentuméval. */
export type LibraryBlob = { _id: ObjectId; data: Binary; contentType: string };

export const library = async () => ownCollection((await getDb()).collection<LibraryDoc>("library_documents"));
export const libraryBlobs = async () => ownCollection((await getDb()).collection<LibraryBlob>("library_blobs"));

export const LIBRARY_ACCEPT = ".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp";
export const MAX_LIBRARY_TEXT = 300_000;

const TYPES: Record<string, { kind: LibraryKind; contentType: string }> = {
  pdf: { kind: "pdf", contentType: "application/pdf" },
  docx: { kind: "docx", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  doc: { kind: "doc", contentType: "application/msword" },
  txt: { kind: "txt", contentType: "text/plain; charset=utf-8" },
  png: { kind: "image", contentType: "image/png" },
  jpg: { kind: "image", contentType: "image/jpeg" },
  jpeg: { kind: "image", contentType: "image/jpeg" },
  webp: { kind: "image", contentType: "image/webp" },
};
export const libraryType = (name: string) => TYPES[name.split(".").pop()?.toLowerCase() ?? ""] ?? null;

/** Kinyeri a fájl szövegét; képnél és szöveg nélküli (szkennelt) PDF-nél üres szöveget ad. */
export async function extractLibraryText(buffer: Buffer, name: string, kind: LibraryKind): Promise<{ text: string; pages?: number }> {
  if (kind === "image") return { text: "" };
  if (kind === "doc") {
    const document = await new WordExtractor().extract(buffer);
    return { text: [document.getHeaders({ includeFooters: false }), document.getBody(), document.getFootnotes()].map((part) => part.trim()).filter(Boolean).join("\n\n") };
  }
  if (kind === "txt") {
    // UTF-8, vagy ha abban érvénytelen, régi Windows-1250 (közép-európai) kódolású szövegfájl.
    const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    const text = utf8.includes("�") ? new TextDecoder("windows-1250").decode(buffer) : utf8;
    return { text: text.replace(/^﻿/, "").replace(/\r\n?/g, "\n").trim() };
  }
  return extractDocumentText(buffer, name);
}

/** Word (.docx) formázott előnézete HTML-ként (képekkel), szkriptek nélkül; sandboxolt iframe-ben jelenik meg. */
export async function docxHtml(buffer: Buffer) {
  const { value } = await mammoth.convertToHtml({ buffer });
  return value;
}

/** Ha egy oldalra ennyinél kevesebb szöveg jut, a PDF-et szkenneltnek tekintjük. */
export const looksScanned = (text: string, pages?: number) => text.trim().length < Math.max(40, (pages ?? 1) * 60);

export const sizeLabel = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
