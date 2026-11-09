"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input, buttonClass } from "@/components/ui";

type Cell = string | number | null;
const PAGE = 100;

export function DatasetTable({ headers, rows }: { headers: string[]; rows: Cell[][] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => row.some((cell) => cell !== null && String(cell).toLowerCase().includes(needle)));
  }, [rows, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE, current * PAGE + PAGE);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-white/40" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Keresés a sorokban…"
            aria-label="Keresés a sorokban"
            className="pl-10"
          />
        </div>
        <p className="text-xs text-white/50">
          {filtered.length === rows.length ? `${rows.length} sor` : `${filtered.length} találat / ${rows.length} sor`}
        </p>
      </div>

      <div className="max-h-[32rem] overflow-auto rounded-2xl border border-white/8">
        <table className="w-full min-w-max text-sm">
          <thead className="sticky top-0 bg-ink-800 text-left text-xs tracking-wide text-white/60 uppercase">
            <tr>
              <th className="px-3 py-2.5 font-semibold text-white/35">#</th>
              {headers.map((header, index) => (
                <th key={index} className="px-3 py-2.5 font-semibold whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {visible.map((row, index) => (
              <tr key={index} className="hover:bg-white/4">
                <td className="px-3 py-2 text-xs text-white/30 tabular-nums">{current * PAGE + index + 1}</td>
                {headers.map((_, column) => {
                  const cell = row[column];
                  return (
                    <td key={column} className={`max-w-[18rem] truncate px-3 py-2 ${typeof cell === "number" ? "text-right tabular-nums text-mint-bright" : "text-white/80"}`}>
                      {cell === null || cell === undefined ? <span className="text-white/20">–</span> : typeof cell === "number" ? String(cell).replace(".", ",") : cell}
                    </td>
                  );
                })}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={headers.length + 1} className="px-3 py-8 text-center text-white/45">
                  Nincs a keresésnek megfelelő sor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className={buttonClass("secondary", "sm")}>
            <ChevronLeft size={15} aria-hidden /> Előző
          </button>
          <span className="text-xs text-white/50">
            {current + 1}. oldal / {pages}
          </span>
          <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className={buttonClass("secondary", "sm")}>
            Következő <ChevronRight size={15} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
