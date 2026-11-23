import "server-only";
import { ObjectId } from "mongodb";
import { auditFileBlobs, auditFiles } from "@/lib/audits";
import type { SourceType } from "@/lib/editor-docs";
import { docxHtml, library, libraryBlobs } from "@/lib/library";
import { sanitizeEditorHtml, textToHtml } from "@/lib/rich-text";

/** Egy feltöltött dokumentum (Dokumentumok vagy Ellenőri adatok) neve és teljes szövege – csak a saját. */
export async function loadSource(type: SourceType, id: string) {
  if (!ObjectId.isValid(id)) return null;
  const _id = new ObjectId(id);
  if (type === "library") {
    const doc = await (await library()).findOne({ _id }, { projection: { name: 1, text: 1, kind: 1 } });
    return doc ? { type, id, name: doc.name, text: doc.text, href: `/dokumentumok/${id}`, docx: doc.kind === "docx" } : null;
  }
  const file = await (await auditFiles()).findOne({ _id }, { projection: { name: 1, text: 1, auditId: 1 } });
  return file ? { type, id, name: file.name, text: file.text, href: `/ellenori-adatok/${file.auditId}/fajl/${id}`, docx: /\.docx$/i.test(file.name) } : null;
}

/** A dokumentum szerkeszthető HTML-je: Wordnél a formázás (címsor, lista, táblázat) megmarad, egyébként bekezdések. */
export async function sourceHtml(source: NonNullable<Awaited<ReturnType<typeof loadSource>>>) {
  if (source.docx) {
    const blob = await (source.type === "library" ? libraryBlobs() : auditFileBlobs()).then((collection) => collection.findOne({ _id: new ObjectId(source.id) }));
    if (blob) {
      const html = await docxHtml(Buffer.from(blob.data.buffer)).catch(() => "");
      const clean = sanitizeEditorHtml(html);
      if (clean) return clean;
    }
  }
  return textToHtml(source.text);
}
