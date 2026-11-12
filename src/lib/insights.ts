import "server-only";
import { auditFiles, audits } from "@/lib/audits";
import { datasets } from "@/lib/datasets";
import { addDays, dayKey, formatShortDate } from "@/lib/dates";
import { recentDocuments } from "@/lib/documents";
import { findings, isOpen } from "@/lib/findings";
import { SEVERITIES, SEVERITY_ORDER } from "@/lib/findings-meta";
import { listLaws } from "@/lib/legal";
import type { AnomalyItem, Insights, LegalRow, TenderPulse } from "@/lib/pajzs-types";
import { recommendations } from "@/lib/recommendations";
import { tenders } from "@/lib/tenders";
import { TENDER_STATUS, daysBetween, progress } from "@/lib/tenders-shared";
import { translations } from "@/lib/translations";

async function safe<T>(job: () => Promise<T>, fallback: T) {
  try {
    return await job();
  } catch (error) {
    console.error("Pajzs-összesítő hiba:", (error as Error).name);
    return fallback;
  }
}

const count = async (collection: Promise<{ estimatedDocumentCount: () => Promise<number> }>) => (await collection).estimatedDocumentCount();

/** A figyelt jogszabályok a panelhez (a teljes lista a /jogszabalyok oldalon van). */
export async function legalRows(): Promise<LegalRow[]> {
  return (await listLaws()).map(({ id, name, cite, why, url, state, checkedAt, changedAt, summary, added, removed }) => ({
    id,
    name,
    cite,
    why,
    url,
    state,
    checkedAt,
    changedAt,
    summary,
    added,
    removed,
  }));
}

const ago = (days: number) => (days === 0 ? "ma" : days === 1 ? "tegnap" : `${days} napja`);

/**
 * A lebegő asszisztens paneljeinek számai és teendői egy lekérésben. Csak a belépett felhasználó látja;
 * az AI-nak ebből csak a darabszámok és a pályázatok nevei kerülnek át (lásd `insightLines`).
 */
export async function loadInsights(now: Date): Promise<Insights> {
  const today = dayKey(now);

  const [findingDocs, tenderDocs, recDocs, flaggedFiles, work, docs, legal] = await Promise.all([
    safe(
      async () =>
        (await findings())
          .find({}, { projection: { title: 1, severity: 1, status: 1, owner: 1, dueDate: 1, createdAt: 1 } })
          .limit(5000)
          .toArray(),
      [],
    ),
    safe(async () => (await tenders()).find({}, { projection: { name: 1, deadline: 1, status: 1, items: 1 } }).limit(500).toArray(), []),
    safe(
      async () =>
        (await recommendations())
          .find({}, { projection: { findingId: 1, title: 1, status: 1, dueDate: 1, createdAt: 1 } })
          .limit(5000)
          .toArray(),
      [],
    ),
    safe(
      async () =>
        (await auditFiles())
          .find({ "issues.level": "error" }, { projection: { auditId: 1, name: 1, issues: 1, uploadedAt: 1 } })
          .sort({ uploadedAt: -1 })
          .limit(6)
          .toArray(),
      [],
    ),
    Promise.all([
      safe(() => count(audits()), 0),
      safe(() => count(auditFiles()), 0),
      safe(() => count(datasets()), 0),
      safe(() => count(translations()), 0),
    ]),
    safe(() => recentDocuments(8), { total: 0, recent: [] }),
    safe(() => legalRows(), []),
  ]);

  const items: AnomalyItem[] = [];

  /* Megállapítások */
  const open = findingDocs.filter((doc) => isOpen(doc.status));
  const closed = findingDocs.filter((doc) => doc.status === "lezart").length;
  const decided = findingDocs.filter((doc) => doc.status !== "javasolt").length;
  const overdue = open.filter((doc) => doc.dueDate && doc.dueDate < today);
  const withRecommendation = new Set(recDocs.filter((rec) => rec.status !== "elutasitva").map((rec) => String(rec.findingId)));

  for (const doc of overdue.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))) {
    items.push({
      level: "error",
      area: "Hiányosság",
      title: doc.title,
      message: `Lejárt az intézkedés határideje (${ago(daysBetween(doc.dueDate!, today))}), a megállapítás még ${doc.status === "nyitott" ? "nyitott" : "folyamatban van"}.`,
      date: doc.dueDate,
      href: `/hianyossagok/${doc._id}`,
    });
  }
  for (const doc of open.filter((item) => item.severity === "kritikus" || item.severity === "magas")) {
    const gaps = [!doc.owner && "felelős", !doc.dueDate && "határidő"].filter(Boolean);
    if (gaps.length) {
      items.push({
        level: doc.severity === "kritikus" ? "error" : "warning",
        area: "Hiányosság",
        title: doc.title,
        message: `${SEVERITIES[doc.severity]} súlyosságú, de nincs ${gaps.join(" és ")} megadva.`,
        href: `/hianyossagok/${doc._id}`,
      });
    }
  }
  const noRecommendation = open.filter((doc) => !withRecommendation.has(String(doc._id)));
  for (const doc of noRecommendation.slice(0, 6)) {
    items.push({
      level: "warning",
      area: "Javaslat",
      title: doc.title,
      message: "Nyitott megállapítás, de még nincs hozzá javaslat. A Javaslattételben az AI vázlatot is ír.",
      href: `/hianyossagok/${doc._id}`,
    });
  }
  const pendingCount = findingDocs.filter((doc) => doc.status === "javasolt").length;
  if (pendingCount) {
    items.push({
      level: "warning",
      area: "Hiányosság",
      title: `${pendingCount} AI-javaslat jóváhagyásra vár`,
      message: "A fájlok ellenőrzéséből javasolt megállapításokat el kell fogadni vagy el kell vetni.",
      href: "/hianyossagok",
    });
  }

  /* Javaslatok */
  const staleCutoff = new Date(now.getTime() - 7 * 86_400_000);
  for (const rec of recDocs.filter((item) => item.status === "tervezet" && item.createdAt < staleCutoff).slice(0, 5)) {
    items.push({
      level: "warning",
      area: "Javaslat",
      title: rec.title,
      message: `Egy hete tervezet: jóváhagyásra vagy elutasításra vár (felvéve ${formatShortDate(dayKey(rec.createdAt))}).`,
      href: `/javaslatok/${rec._id}`,
    });
  }
  const openIds = new Set(open.map((doc) => String(doc._id)));
  for (const rec of recDocs.filter((item) => item.status === "jovahagyva" && item.dueDate && item.dueDate < today && openIds.has(String(item.findingId))).slice(0, 5)) {
    items.push({
      level: "error",
      area: "Javaslat",
      title: rec.title,
      message: `A jóváhagyott intézkedés határideje lejárt (${ago(daysBetween(rec.dueDate!, today))}), a megállapítás még nincs lezárva.`,
      date: rec.dueDate,
      href: `/javaslatok/${rec._id}`,
    });
  }

  /* Pályázatok */
  const activeTenders = tenderDocs.filter((doc) => TENDER_STATUS[doc.status]?.active);
  const pulse: TenderPulse[] = activeTenders
    .map((doc) => ({
      id: String(doc._id),
      name: doc.name,
      deadline: doc.deadline,
      daysLeft: daysBetween(today, doc.deadline),
      progress: progress(doc.items ?? []),
      missing: (doc.items ?? []).filter((item) => item.status !== "kesz").length,
      status: TENDER_STATUS[doc.status]?.label ?? doc.status,
    }))
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  for (const tender of pulse) {
    if (tender.daysLeft < 0) {
      items.push({
        level: "error",
        area: "Pályázat",
        title: tender.name,
        message: `A beadási határidő ${ago(-tender.daysLeft)} lejárt, de a pályázat még „${tender.status}” állapotú.`,
        date: tender.deadline,
        href: `/palyazatok/${tender.id}`,
      });
    } else if (tender.daysLeft <= 7 && tender.missing > 0) {
      items.push({
        level: tender.daysLeft <= 3 ? "error" : "warning",
        area: "Pályázat",
        title: tender.name,
        message: `${tender.daysLeft === 0 ? "Ma" : `${tender.daysLeft} nap múlva`} a határidő, és még ${tender.missing} elem nincs kész (${tender.progress}%).`,
        date: tender.deadline,
        href: `/palyazatok/${tender.id}`,
      });
    }
  }
  for (const doc of activeTenders) {
    const late = (doc.items ?? []).filter((item) => item.status !== "kesz" && item.due && item.due < today);
    if (late.length) {
      items.push({
        level: "warning",
        area: "Pályázat",
        title: doc.name,
        message: `${late.length} melléklet belső határideje lejárt: ${late
          .slice(0, 3)
          .map((item) => item.title)
          .join(", ")}${late.length > 3 ? " …" : ""}.`,
        href: `/palyazatok/${doc._id}`,
      });
    }
  }

  /* Ellenőri adatok */
  for (const file of flaggedFiles) {
    const errors = file.issues.filter((issue) => issue.level === "error");
    items.push({
      level: "warning",
      area: "Ellenőri adat",
      title: file.name,
      message: `${errors.length} formai hiba a beérkezéskor: ${errors[0]?.message ?? ""}`.trim(),
      date: dayKey(file.uploadedAt),
      href: `/ellenori-adatok/${file.auditId}`,
    });
  }

  /* Trend: az elmúlt 8 hét új megállapításai */
  const weekStart = addDays(today, -55);
  const trend = Array.from({ length: 8 }, (_, index) => {
    const from = addDays(weekStart, index * 7);
    const to = addDays(from, 7);
    return {
      label: formatShortDate(from).replace(/\.$/, ""),
      count: findingDocs.filter((doc) => {
        const day = dayKey(doc.createdAt);
        return day >= from && day < to;
      }).length,
    };
  });

  const errorsFirst = [...items].sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1));
  const approved = recDocs.filter((rec) => rec.status === "jovahagyva").length;

  return {
    today,
    findings: {
      total: findingDocs.length,
      open: open.length,
      overdue: overdue.length,
      closedPct: decided ? Math.round((closed / decided) * 100) : 0,
      severity: SEVERITY_ORDER.map((key) => ({ key, label: SEVERITIES[key], count: open.filter((doc) => doc.severity === key).length })),
      trend,
    },
    tenders: { active: activeTenders.length, items: pulse.slice(0, 8) },
    recommendations: {
      draft: recDocs.filter((rec) => rec.status === "tervezet").length,
      approved,
      rejected: recDocs.filter((rec) => rec.status === "elutasitva").length,
      coveragePct: open.length ? Math.round(((open.length - noRecommendation.length) / open.length) * 100) : 100,
    },
    work: { audits: work[0], files: work[1], datasets: work[2], translations: work[3], documents: docs.total },
    anomalies: {
      errors: items.filter((item) => item.level === "error").length,
      warnings: items.filter((item) => item.level === "warning").length,
      items: errorsFirst.slice(0, 40),
    },
    docs,
    legal,
  };
}

const AREA_PAGE: Record<string, string> = { Hiányosság: "/hianyossagok", Javaslat: "/javaslatok", Pályázat: "/palyazatok", "Ellenőri adat": "/ellenori-adatok" };

/** Területenkénti bontás a hozzá tartozó oldallal, pl. „ Ellenőri adat: 1 (/ellenori-adatok)”. */
function areaSummary(items: AnomalyItem[]) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.area, (counts.get(item.area) ?? 0) + 1);
  return counts.size ? ` Bontás: ${[...counts].map(([area, n]) => `${area}: ${n} (${AREA_PAGE[area] ?? "/"})`).join(", ")}.` : "";
}

/** Az AI elé kerülő, személyes adatot és megállapítás-szöveget nem tartalmazó összegzés. */
export function insightLines(data: Insights) {
  const { findings: f, tenders: t, recommendations: r, work: w, anomalies: a } = data;
  const lines = [
    `Megállapítások: ${f.total} összesen, ${f.open} nyitott/folyamatban, ${f.overdue} lejárt határidejű; lezárási arány ${f.closedPct}%.`,
    `Nyitott megállapítások súlyosság szerint: ${f.severity.map((item) => `${item.label.toLowerCase()} ${item.count}`).join(", ")}.`,
    `Új megállapítások hetente (utolsó 8 hét): ${f.trend.map((item) => item.count).join(", ")}.`,
    `Javaslatok: ${r.draft} tervezet, ${r.approved} jóváhagyott, ${r.rejected} elutasított; a nyitott megállapítások ${r.coveragePct}%-ához van javaslat.`,
    `Aktív pályázatok: ${t.active}${t.items.length ? ` – ${t.items
      .slice(0, 5)
      .map((item) => `${item.name} (határidő ${item.deadline}, ${item.daysLeft < 0 ? "lejárt" : `${item.daysLeft} nap`}, ${item.progress}% kész)`)
      .join("; ")}` : ""}.`,
    `Ellenőrzések: ${w.audits}, beérkezett ellenőri fájlok: ${w.files}, adatállományok: ${w.datasets}, fordítások: ${w.translations}, digitalizált iratok: ${w.documents}.`,
    `Eltérések: ${a.errors} sürgős, ${a.warnings} figyelmeztetés (a Pajzs panel „Teendő” fülén, tételesen).${areaSummary(a.items)}`,
  ];
  const changed = data.legal.filter((law) => law.state === "changed");
  lines.push(changed.length ? `Változott jogszabályok: ${changed.map((law) => `${law.cite} (${law.name})`).join("; ")}.` : "A figyelt jogszabályok közül egyik sem változott.");
  return lines;
}
