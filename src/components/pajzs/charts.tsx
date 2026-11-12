import type { ReactNode } from "react";

/** Gyűrűs mérő: középen a szám, a gyűrű a százalékot rajzolja ki. */
export function Ring({
  value,
  size = 96,
  stroke = 9,
  tone = "#6ee7b7",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: string;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.2,0.8,0.2,1)", filter: `drop-shadow(0 0 6px ${tone}88)` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/** Terület-diagram a következő napok beosztásáról. */
export function AreaChart({ data, height = 84, label = "Diagram" }: { data: { label: string; value: number }[]; height?: number; label?: string }) {
  const width = 300;
  const pad = 8;
  const max = Math.max(1, ...data.map((item) => item.value));
  const points = data.map((item, index) => {
    const x = pad + (index * (width - pad * 2)) / Math.max(1, data.length - 1);
    const y = height - pad - (item.value / max) * (height - pad * 2);
    return { x, y, ...item };
  });
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const area = `${line} L${points.at(-1)!.x} ${height} L${points[0].x} ${height} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={label}>
        <defs>
          <linearGradient id="pz-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6ee7b7" stopOpacity="0.45" />
            <stop offset="1" stopColor="#6ee7b7" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line key={fraction} x1={pad} x2={width - pad} y1={height * fraction} y2={height * fraction} stroke="rgb(255 255 255 / 0.06)" strokeDasharray="3 4" />
        ))}
        <path d={area} fill="url(#pz-area)" />
        <path d={line} pathLength={1} className="pg-draw" fill="none" stroke="#6ee7b7" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <circle key={point.label + point.x} cx={point.x} cy={point.y} r="3.200" fill="#0a1712" stroke="#6ee7b7" strokeWidth="2" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[0.65rem] text-white/45">
        {data.map((item) => (
          <span key={item.label} className="text-center">
            <span className="block font-semibold text-white/75">{item.value}</span>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Vízszintes sáv a lefedettséghez; a szín a százalékhoz igazodik. */
export function Bar({ value, tone }: { value: number; tone?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const color = tone ?? (clamped >= 100 ? "#34d399" : clamped >= 60 ? "#fbbf24" : "#f87171");
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/8" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div className="pg-grow h-full rounded-full" style={{ width: `${clamped}%`, background: `linear-gradient(90deg, ${color}aa, ${color})`, boxShadow: `0 0 10px ${color}77` }} />
    </div>
  );
}

export function Tile({ label, value, hint, tone = "text-white" }: { label: string; value: ReactNode; hint?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
      <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-white/45 uppercase">{label}</p>
      <p className={`mt-1 font-display text-2xl leading-none font-semibold ${tone}`}>{value}</p>
      {hint && <p className="mt-1 text-[0.7rem] text-white/45">{hint}</p>}
    </div>
  );
}

/** Egyszerű konfetti-robbanás sikeres műveletek után. */
export function Confetti() {
  const colors = ["#6ee7b7", "#a78bfa", "#34d399", "#c4b5fd", "#34d399", "#fff"];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center">
      {Array.from({ length: 22 }, (_, index) => {
        const angle = (index / 22) * Math.PI * 2;
        const distance = 70 + ((index * 37) % 70);
        return (
          <span
            key={index}
            className="absolute size-2 rounded-[2px]"
            style={
              {
                background: colors[index % colors.length],
                "--dx": `${Math.cos(angle) * distance}px`,
                "--dy": `${Math.sin(angle) * distance - 30}px`,
                "--rot": `${(index * 97) % 540}deg`,
                animation: "pg-confetti 1.1s cubic-bezier(0.2,0.7,0.3,1) both",
                animationDelay: `${(index % 5) * 30}ms`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
