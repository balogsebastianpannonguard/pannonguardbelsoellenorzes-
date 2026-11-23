import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { LibraryDoc } from "@/lib/library";

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;
const INK = rgb(0.08, 0.09, 0.17);
const MUTED = rgb(0.42, 0.45, 0.5);

let fonts: Promise<[Buffer, Buffer]> | null = null;
/** DejaVu Sans – minden magyar ékezetet (ő, ű) tartalmaz, a beépített PDF-betűk nem. */
const loadFonts = () =>
  (fonts ??= Promise.all([
    readFile(path.join(process.cwd(), "assets/fonts/DejaVuSans.ttf")),
    readFile(path.join(process.cwd(), "assets/fonts/DejaVuSans-Bold.ttf")),
  ]));

/** A szöveget a betűkészlet és a szélesség szerint sorokra tördeli (a túl hosszú szavakat is). */
function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\t/g, "    ").split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(/ +/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > width) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

/** A betűkészletben nem szereplő jeleket (pl. emoji) kicseréli, hogy a szedés ne álljon meg. */
const printable = (font: PDFFont, text: string) => {
  const supported = new Set(font.getCharacterSet());
  return [...text.replace(/\t/g, "    ").replace(/\r/g, "")].map((char) => (char === "\n" || supported.has(char.codePointAt(0)!) ? char : "?")).join("");
};

function header(page: PDFPage, bold: PDFFont, regular: PDFFont, title: string, subtitle: string) {
  page.drawText(title, { x: MARGIN, y: A4[1] - MARGIN, size: 14, font: bold, color: INK, maxWidth: A4[0] - 2 * MARGIN });
  page.drawText(subtitle, { x: MARGIN, y: A4[1] - MARGIN - 18, size: 8.5, font: regular, color: MUTED });
  page.drawLine({ start: { x: MARGIN, y: A4[1] - MARGIN - 28 }, end: { x: A4[0] - MARGIN, y: A4[1] - MARGIN - 28 }, thickness: 0.6, color: rgb(0.8, 0.82, 0.85) });
  return A4[1] - MARGIN - 50;
}

/**
 * A kijelölt dokumentumokból egy PDF: a PDF-ek oldalai változatlanul, a képek külön oldalon, a Word- és
 * szövegfájlok szövege szedve. A kihagyott (sérült, jelszavas) fájlokról a végén lista készül.
 */
export async function mergeDocuments(items: { doc: Pick<LibraryDoc, "name" | "kind" | "text">; data: Buffer }[]) {
  const out = await PDFDocument.create();
  out.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await loadFonts();
  const regular = await out.embedFont(regularBytes, { subset: true });
  const bold = await out.embedFont(boldBytes, { subset: true });
  const skipped: string[] = [];

  for (const { doc, data } of items) {
    try {
      if (doc.kind === "pdf") {
        const source = await PDFDocument.load(data, { ignoreEncryption: false });
        for (const page of await out.copyPages(source, source.getPageIndices())) out.addPage(page);
        continue;
      }
      if (doc.kind === "image") {
        const image = /\.png$/i.test(doc.name) ? await out.embedPng(data) : /\.jpe?g$/i.test(doc.name) ? await out.embedJpg(data) : null;
        if (!image) {
          skipped.push(`${doc.name} (a WebP kép PDF-be nem illeszthető)`);
          continue;
        }
        const page = out.addPage(A4);
        const top = header(page, bold, regular, printable(bold, doc.name), "Kép");
        const scale = Math.min((A4[0] - 2 * MARGIN) / image.width, (top - MARGIN) / image.height, 1);
        page.drawImage(image, { x: (A4[0] - image.width * scale) / 2, y: top - image.height * scale, width: image.width * scale, height: image.height * scale });
        continue;
      }
      const size = 10.5;
      const leading = 14.5;
      const lines = wrap(printable(regular, doc.text || "(A dokumentum üres.)"), regular, size, A4[0] - 2 * MARGIN);
      const kind = doc.kind === "txt" ? "Szöveges fájl" : "Word-dokumentum";
      let page = out.addPage(A4);
      let y = header(page, bold, regular, printable(bold, doc.name), `${kind} – a dokumentum szövege`);
      for (const line of lines) {
        if (y < MARGIN) {
          page = out.addPage(A4);
          y = header(page, bold, regular, printable(bold, doc.name), `${kind} – folytatás`);
        }
        if (line) page.drawText(line, { x: MARGIN, y, size, font: regular, color: INK });
        y -= leading;
      }
    } catch {
      skipped.push(`${doc.name} (sérült vagy jelszóval védett)`);
    }
  }

  if (skipped.length || out.getPageCount() === 0) {
    const page = out.addPage(A4);
    let y = header(page, bold, regular, "Kimaradt dokumentumok", "Ezek a fájlok nem kerültek az összefűzött PDF-be");
    for (const line of skipped.length ? skipped : ["Nem volt összefűzhető dokumentum."]) {
      page.drawText(`• ${printable(regular, line)}`, { x: MARGIN, y, size: 10.5, font: regular, color: INK, maxWidth: A4[0] - 2 * MARGIN });
      y -= 16;
    }
  }
  out.setTitle("PannonGuard – összefűzött dokumentumok");
  out.setProducer("PannonGuard Belső ellenőrzés");
  return Buffer.from(await out.save());
}
