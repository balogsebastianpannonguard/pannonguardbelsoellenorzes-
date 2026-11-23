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

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A kifejezés minden előfordulását lecseréli, kis-nagybetűtől függetlenül; a nagy kezdőbetűt (mondat eleje) megtartja.
 * Ahol a szövegben már az új alak áll (pl. a régi alak az új része), ott nem cserél, így az ismételt csere sem ront.
 */
export function replaceTerm(text: string, current: string, next: string) {
  let count = 0;
  const nextLower = next.toLowerCase();
  const replaced = text.replace(new RegExp(escapeRegExp(current), "giu"), (match, at: number, whole: string) => {
    if (whole.slice(at, at + next.length).toLowerCase() === nextLower) return match;
    count++;
    const upper = match[0] !== match[0].toLowerCase() && current[0] === current[0].toLowerCase();
    return upper ? next[0].toUpperCase() + next.slice(1) : next;
  });
  return { text: replaced, count };
}

/** Szövegrész a kiemelt megjelenítéshez: sima szöveg vagy egy kifejezés (a terms tömb indexével). */
export type Segment = { text: string; term?: number };

/** A fordítást szakaszokra bontja, a kifejezéseket (leghosszabb elöl, kis-nagybetűtől függetlenül) megjelölve. */
export function segmentTerms(text: string, targets: string[]): Segment[] {
  const order = targets
    .map((target, index) => ({ target: target.trim(), index }))
    .filter((item) => item.target.length > 1)
    .sort((a, b) => b.target.length - a.target.length);
  if (!order.length) return [{ text }];
  const lookup = new Map(order.map((item) => [item.target.toLowerCase(), item.index]));
  const pattern = new RegExp(order.map((item) => escapeRegExp(item.target)).join("|"), "giu");
  const segments: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) segments.push({ text: text.slice(last, at) });
    segments.push({ text: match[0], term: lookup.get(match[0].toLowerCase()) });
    last = at + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}
