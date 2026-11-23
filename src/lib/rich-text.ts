import "server-only";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/**
 * A szerkesztőbe kerülő HTML egyetlen kapuja: csak formázó elemek maradnak (bekezdés, címsor, lista, táblázat,
 * kiemelés, link), szkript, esemény-attribútum, stílus (az igazításon kívül) és kép nem.
 */
export function sanitizeEditorHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "h1", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "blockquote", "hr", "table", "thead", "tbody", "tr", "th", "td", "a", "span", "div", "sub", "sup", "code", "pre"],
    allowedAttributes: { a: ["href"], td: ["colspan", "rowspan"], th: ["colspan", "rowspan"], "*": ["style"] },
    allowedStyles: { "*": { "text-align": [/^(left|right|center|justify)$/] } },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: { b: "strong", i: "em" },
  }).trim();
}

/** Az AI Markdown-válasza biztonságos HTML-ként. */
export function markdownToHtml(markdown: string) {
  return sanitizeEditorHtml(marked.parse(markdown, { async: false, gfm: true, breaks: false }) as string);
}

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Sima szöveg bekezdésekre bontva. */
export function textToHtml(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escape(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
