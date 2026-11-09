"use client";

import { forwardRef, useId, useState } from "react";

export type ChartType = "bar" | "hbar" | "pie" | "line";
export type Point = { label: string; value: number };

export const PALETTE = ["#34d399", "#a78bfa", "#6ee7b7", "#7c5cff", "#c4b5fd", "#10b981", "#8b5cf6", "#5eead4", "#ddd6fe", "#059669"];
const BG = "#0a1712";
const GRID = "rgba(255,255,255,0.09)";
const TEXT = "#c9d6d1";
const MUTED = "rgba(255,255,255,0.5)";
const FONT = "ui-sans-serif, system-ui, sans-serif";

export const formatValue = (value: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 }).format(value);
const compact = (value: number) => new Intl.NumberFormat("hu-HU", { notation: "compact", maximumFractionDigits: 1 }).format(value);
const clip = (label: string, max: number) => (label.length > max ? `${label.slice(0, max - 1)}…` : label);

function niceTicks(min: number, max: number, count = 5) {
  const lo = Math.min(0, min);
  const hi = Math.max(0, max);
  const range = hi - lo || 1;
  const raw = range / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const frac = raw / pow;
  const step = (frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10) * pow;
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= end + step / 2; value += step) ticks.push(Number(value.toFixed(10)));
  return ticks;
}

const W = 760;

/** Saját SVG-diagramok: oszlop, vízszintes sáv, kör és vonal. Az SVG önállóan exportálható (inline stílusok). */
export const Chart = forwardRef<SVGSVGElement, { type: ChartType; points: Point[]; valueLabel: string }>(function Chart(
  { type, points, valueLabel },
  ref,
) {
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const total = points.reduce((sum, point) => sum + Math.max(0, point.value), 0);

  const hovered = hover !== null ? points[hover] : null;
  const tip = hovered
    ? `${hovered.label}: ${formatValue(hovered.value)}${type === "pie" && total > 0 ? ` (${((Math.max(0, hovered.value) / total) * 100).toFixed(1).replace(".", ",")}%)` : ""}`
    : `${valueLabel} – húzd az egeret egy elemre a pontos értékért`;

  const values = points.map((point) => point.value);
  const ticks = niceTicks(Math.min(...values, 0), Math.max(...values, 0));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const span = hi - lo || 1;

  let height = 380;
  let body: React.ReactNode = null;

  if (type === "bar" || type === "line") {
    const ml = 64;
    const mr = 16;
    const mt = 40;
    const mb = 100;
    const pw = W - ml - mr;
    const ph = height - mt - mb;
    const y = (value: number) => mt + ph - ((value - lo) / span) * ph;
    const band = pw / points.length;
    const every = Math.ceil(points.length / 24);
    body = (
      <>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={ml} x2={W - mr} y1={y(tick)} y2={y(tick)} stroke={GRID} />
            <text x={ml - 8} y={y(tick) + 4} textAnchor="end" fontSize="11" fill={MUTED}>
              {compact(tick)}
            </text>
          </g>
        ))}
        <line x1={ml} x2={W - mr} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.3)" />
        {type === "bar" &&
          points.map((point, index) => {
            const bw = Math.min(56, band * 0.7);
            const x = ml + band * index + (band - bw) / 2;
            const top = y(Math.max(point.value, 0));
            const h = Math.max(1, Math.abs(y(point.value) - y(0)));
            return (
              <g key={index} onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)} opacity={hover === null || hover === index ? 1 : 0.45}>
                <rect x={ml + band * index} y={mt} width={band} height={ph} fill="transparent" />
                <rect x={x} y={top} width={bw} height={h} rx="4" fill={`url(#${uid}b)`} />
                <title>{`${point.label}: ${formatValue(point.value)}`}</title>
              </g>
            );
          })}
        {type === "line" && (
          <>
            <path
              d={`M${ml + band / 2},${y(0)} ${points.map((point, index) => `L${ml + band * index + band / 2},${y(point.value)}`).join(" ")} L${ml + band * (points.length - 1) + band / 2},${y(0)} Z`}
              fill={`url(#${uid}a)`}
            />
            <path
              d={points.map((point, index) => `${index ? "L" : "M"}${ml + band * index + band / 2},${y(point.value)}`).join(" ")}
              fill="none"
              stroke="#34d399"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {points.map((point, index) => (
              <g key={index} onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)}>
                <rect x={ml + band * index} y={mt} width={band} height={ph} fill="transparent" />
                <circle cx={ml + band * index + band / 2} cy={y(point.value)} r={hover === index ? 6 : 3.5} fill="#a78bfa" stroke={BG} strokeWidth="2" />
                <title>{`${point.label}: ${formatValue(point.value)}`}</title>
              </g>
            ))}
          </>
        )}
        {points.map((point, index) =>
          index % every === 0 ? (
            <text
              key={index}
              transform={`translate(${ml + band * index + band / 2},${mt + ph + 14}) rotate(-35)`}
              textAnchor="end"
              fontSize="11"
              fill={TEXT}
            >
              {clip(point.label, 18)}
            </text>
          ) : null,
        )}
      </>
    );
  } else if (type === "hbar") {
    const ml = 170;
    const mr = 70;
    const mt = 40;
    const row = 30;
    height = mt + points.length * row + 16;
    const pw = W - ml - mr;
    const x = (value: number) => ml + ((value - lo) / span) * pw;
    body = (
      <>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={x(tick)} x2={x(tick)} y1={mt - 6} y2={height - 12} stroke={GRID} />
            <text x={x(tick)} y={height - 0} textAnchor="middle" fontSize="11" fill={MUTED}>
              {compact(tick)}
            </text>
          </g>
        ))}
        {points.map((point, index) => {
          const top = mt + index * row;
          const x0 = x(0);
          const x1 = x(point.value);
          return (
            <g key={index} onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)} opacity={hover === null || hover === index ? 1 : 0.45}>
              <rect x={0} y={top} width={W} height={row} fill="transparent" />
              <text x={ml - 10} y={top + row / 2 + 4} textAnchor="end" fontSize="12" fill={TEXT}>
                {clip(point.label, 24)}
              </text>
              <rect x={Math.min(x0, x1)} y={top + 5} width={Math.max(1, Math.abs(x1 - x0))} height={row - 10} rx="4" fill={`url(#${uid}h)`} />
              <text x={Math.max(x0, x1) + 6} y={top + row / 2 + 4} fontSize="11" fill={MUTED}>
                {compact(point.value)}
              </text>
              <title>{`${point.label}: ${formatValue(point.value)}`}</title>
            </g>
          );
        })}
      </>
    );
  } else {
    const cx = 190;
    const cy = 215;
    const r = 130;
    height = Math.max(380, 70 + points.length * 22);
    let angle = -Math.PI / 2;
    const slices = points.map((point, index) => {
      const share = total > 0 ? Math.max(0, point.value) / total : 0;
      const start = angle;
      angle += share * Math.PI * 2;
      return { point, index, share, start, end: angle };
    });
    const polar = (a: number, radius: number) => [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius];
    body = (
      <>
        {slices.map(({ point, index, share, start, end }) => {
          if (share <= 0) return null;
          const color = PALETTE[index % PALETTE.length];
          const [x0, y0] = polar(start, r);
          const [x1, y1] = polar(end, r);
          const shift = hover === index ? polar((start + end) / 2, 6) : [cx, cy];
          return (
            <g key={index} transform={`translate(${shift[0] - cx},${shift[1] - cy})`} onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)}>
              {share >= 0.9999 ? (
                <circle cx={cx} cy={cy} r={r} fill={color} stroke={BG} strokeWidth="2" />
              ) : (
                <path d={`M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${share > 0.5 ? 1 : 0} 1 ${x1},${y1} Z`} fill={color} stroke={BG} strokeWidth="2" />
              )}
              <title>{`${point.label}: ${formatValue(point.value)}`}</title>
            </g>
          );
        })}
        {points.map((point, index) => (
          <g key={index} transform={`translate(380,${60 + index * 22})`} onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)} opacity={hover === null || hover === index ? 1 : 0.45}>
            <rect width="12" height="12" rx="3" fill={PALETTE[index % PALETTE.length]} />
            <text x="20" y="10" fontSize="12" fill={TEXT}>
              {clip(point.label, 30)}
            </text>
            <text x="360" y="10" fontSize="12" fill={MUTED} textAnchor="end">
              {total > 0 ? `${((Math.max(0, point.value) / total) * 100).toFixed(1).replace(".", ",")}%` : ""}
            </text>
          </g>
        ))}
      </>
    );
  }

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${height}`}
      width={W}
      height={height}
      role="img"
      aria-label={`${valueLabel} diagram`}
      className="h-auto w-full"
      style={{ fontFamily: FONT }}
    >
      <defs>
        <linearGradient id={`${uid}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6ee7b7" />
          <stop offset="1" stopColor="#7c5cff" />
        </linearGradient>
        <linearGradient id={`${uid}h`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7c5cff" />
          <stop offset="1" stopColor="#6ee7b7" />
        </linearGradient>
        <linearGradient id={`${uid}a`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34d399" stopOpacity="0.35" />
          <stop offset="1" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={W} height={height} rx="16" fill={BG} />
      <text x={16} y={24} fontSize="13" fontWeight="600" fill="#6ee7b7">
        {tip}
      </text>
      {body}
    </svg>
  );
});
