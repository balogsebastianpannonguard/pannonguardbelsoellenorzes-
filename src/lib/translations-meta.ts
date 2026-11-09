export const LANGUAGES = {
  hu: "magyar",
  en: "angol",
  de: "német",
  ro: "román",
  sk: "szlovák",
  uk: "ukrán",
  sr: "szerb",
} as const;
export type Language = keyof typeof LANGUAGES;

export const TONES = {
  hivatalos: "Hivatalos",
  uzleti: "Üzleti",
  kozertheto: "Közérthető",
} as const;
export type Tone = keyof typeof TONES;

export const MAX_TRANSLATE_CHARS = 30_000;

/** Bekezdéshatáron ~size karakteres darabokra bontja a szöveget. */
export function chunkText(text: string, size = 6000) {
  const pieces: string[] = [];
  for (const paragraph of text.split(/\n{2,}/)) {
    if (paragraph.length <= size) {
      pieces.push(paragraph);
      continue;
    }
    let rest = paragraph;
    while (rest.length > size) {
      const window = rest.slice(0, size);
      const cut = Math.max(window.lastIndexOf(". "), window.lastIndexOf("\n"), window.lastIndexOf("; "));
      const at = cut > size * 0.4 ? cut + 1 : size;
      pieces.push(rest.slice(0, at));
      rest = rest.slice(at).trimStart();
    }
    if (rest) pieces.push(rest);
  }
  const chunks: string[] = [];
  let current = "";
  for (const piece of pieces) {
    if (current && current.length + piece.length + 2 > size) {
      chunks.push(current);
      current = piece;
    } else current = current ? `${current}\n\n${piece}` : piece;
  }
  if (current) chunks.push(current);
  return chunks;
}
