"use client";

import { useMemo, useRef, useState } from "react";
import { ChartColumn, Download, Image as ImageIcon } from "lucide-react";
import { Chart, formatValue, type ChartType, type Point } from "@/components/chart-svg";
import { Label, Select, buttonClass } from "@/components/ui";

type Cell = string | number | null;
export type ChartColumnInfo = { name: string; numeric: boolean };

const TYPES: { value: ChartType; label: string }[] = [
  { value: "bar", label: "Oszlopdiagram" },
  { value: "hbar", label: "Vízszintes sáv" },
  { value: "pie", label: "Kördiagram" },
  { value: "line", label: "Vonaldiagram" },
];
const AGGS = { sum: "Összeg", avg: "Átlag", count: "Darab" } as const;
type Agg = keyof typeof AGGS;

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ChartBuilder({ columns, rows }: { columns: ChartColumnInfo[]; rows: Cell[][] }) {
  const numeric = columns.map((column, index) => ({ ...column, index })).filter((column) => column.numeric);
  const [category, setCategory] = useState(0);
  const [value, setValue] = useState(numeric[0]?.index ?? -1);
  const [agg, setAgg] = useState<Agg>(numeric.length ? "sum" : "count");
  const [type, setType] = useState<ChartType>("bar");
  const [top, setTop] = useState(10);
  const svg = useRef<SVGSVGElement>(null);

  const effectiveAgg: Agg = value < 0 ? "count" : agg;

  const groups = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    for (const row of rows) {
      const label = row[category] === null || row[category] === undefined ? "(üres)" : String(row[category]);
      const entry = map.get(label) ?? { sum: 0, count: 0 };
      if (effectiveAgg === "count") entry.count += 1;
      else {
        const cell = row[value];
        if (typeof cell === "number") {
          entry.sum += cell;
          entry.count += 1;
        }
      }
      map.set(label, entry);
    }
    return [...map.entries()]
      .filter(([, entry]) => effectiveAgg === "count" || entry.count > 0)
      .map(([label, entry]): Point => ({ label, value: effectiveAgg === "avg" ? entry.sum / entry.count : effectiveAgg === "sum" ? entry.sum : entry.count }))
      .sort((a, b) => b.value - a.value);
  }, [rows, category, value, effectiveAgg]);

  const limit = Math.min(top, type === "pie" ? 20 : 60);
  const points = useMemo(() => {
    let shown = groups.slice(0, limit);
    if (type === "pie") {
      shown = shown.filter((point) => point.value > 0);
      const rest = groups.slice(limit).reduce((sum, point) => sum + Math.max(0, point.value), 0);
      if (rest > 0 && effectiveAgg !== "avg") shown = [...shown, { label: "Egyéb", value: rest }];
    }
    if (type === "line") shown = [...shown].sort((a, b) => a.label.localeCompare(b.label, "hu", { numeric: true }));
    return shown;
  }, [groups, limit, type, effectiveAgg]);

  const valueLabel = effectiveAgg === "count" ? `Darab (${columns[category]?.name})` : `${AGGS[effectiveAgg]}: ${columns[value]?.name}`;

  function exportCsv() {
    const escape = (text: string) => (/[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);
    const lines = [`${escape(columns[category]?.name ?? "Kategória")};${escape(valueLabel)}`, ...groups.map((point) => `${escape(point.label)};${String(point.value).replace(".", ",")}`)];
    download("osszesites.csv", new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
  }

  function serialize() {
    const node = svg.current;
    if (!node) return null;
    const clone = node.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return { text: new XMLSerializer().serializeToString(clone), width: node.viewBox.baseVal.width, height: node.viewBox.baseVal.height };
  }

  function exportSvg() {
    const data = serialize();
    if (data) download("abra.svg", new Blob([data.text], { type: "image/svg+xml" }));
  }

  function exportPng() {
    const data = serialize();
    if (!data) return;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = data.width * 2;
      canvas.height = data.height * 2;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(2, 2);
      context.drawImage(image, 0, 0, data.width, data.height);
      canvas.toBlob((blob) => blob && download("abra.png", blob), "image/png");
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data.text)}`;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Label label="Csoportosítás (kategória)">
          <Select value={category} onChange={(event) => setCategory(Number(event.target.value))}>
            {columns.map((column, index) => (
              <option key={index} value={index}>
                {column.name}
              </option>
            ))}
          </Select>
        </Label>
        <Label label="Érték">
          <Select value={value} onChange={(event) => setValue(Number(event.target.value))}>
            <option value={-1}>Sorok száma</option>
            {numeric.map((column) => (
              <option key={column.index} value={column.index}>
                {column.name}
              </option>
            ))}
          </Select>
        </Label>
        <Label label="Összesítés">
          <Select value={effectiveAgg} onChange={(event) => setAgg(event.target.value as Agg)} disabled={value < 0}>
            {(Object.keys(AGGS) as Agg[]).map((key) => (
              <option key={key} value={key}>
                {AGGS[key]}
              </option>
            ))}
          </Select>
        </Label>
        <Label label="Ábratípus">
          <Select value={type} onChange={(event) => setType(event.target.value as ChartType)}>
            {TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Label>
        <Label label="Megjelenített tételek">
          <Select value={top} onChange={(event) => setTop(Number(event.target.value))}>
            {[5, 10, 15, 20, 60].map((count) => (
              <option key={count} value={count}>
                {count === 60 ? "Mind (legfeljebb 60)" : `Első ${count}`}
              </option>
            ))}
          </Select>
        </Label>
      </div>

      {points.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/12 p-8 text-center text-sm text-white/55">
          Ehhez a beállításhoz nincs megjeleníthető adat.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-2xl">
            <div className="min-w-[34rem]">
              <Chart ref={svg} type={type} points={points} valueLabel={valueLabel} />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-white/45">
              {groups.length} csoport, ebből {points.length} látszik · legnagyobb: {formatValue(groups[0]?.value ?? 0)}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={exportCsv} className={buttonClass("secondary", "sm")}>
                <Download size={15} aria-hidden /> Összesítés (CSV)
              </button>
              <button type="button" onClick={exportSvg} className={buttonClass("secondary", "sm")}>
                <ChartColumn size={15} aria-hidden /> Ábra (SVG)
              </button>
              <button type="button" onClick={exportPng} className={buttonClass("secondary", "sm")}>
                <ImageIcon size={15} aria-hidden /> Ábra (PNG)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
