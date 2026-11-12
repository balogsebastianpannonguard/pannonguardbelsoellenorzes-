export type Mood = "idle" | "think" | "talk" | "happy";

import { useId } from "react";

/**
 * Pajzs, a védőember: pajzs-test, sapka, élő arc. Pislog; gondolkodáskor felfelé néz és pöttyök jelennek meg,
 * beszéléskor mozog a szája, örömkor mosolygó szemei és csillogása van. Tiszta SVG, külső kép nélkül.
 */
export function Mascot({ size = 56, mood = "idle", float = false }: { size?: number; mood?: Mood; float?: boolean }) {
  // Egyedi azonosító a színátmenetekhez, hogy több figura egymás mellett se ütközzön.
  const id = `pz${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const look = mood === "think" ? { x: 1.3, y: -1.3 } : { x: 0.6, y: 0.5 };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Pajzs, a védőember"
      className={float ? "pg-float" : undefined}
      overflow="visible"
    >
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#8b6dff" />
          <stop offset="0.55" stopColor="#5a3fd0" />
          <stop offset="1" stopColor="#22135c" />
        </linearGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a7f3d0" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
        <radialGradient id={`${id}s`} cx="0.3" cy="0.2" r="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* pajzs-test */}
      <path
        d="M32 5.500 55 13v17.500c0 14.500-9.800 24.500-23 28.500C18.800 55 9 45 9 30.500V13L32 5.500Z"
        fill={`url(#${id}b)`}
        stroke={`url(#${id}g)`}
        strokeWidth="2.600"
        strokeLinejoin="round"
      />
      <path d="M32 9 51.500 15v15c0 12.500-8.400 21-19.500 24.600" fill="none" stroke="#fff" strokeOpacity="0.12" strokeWidth="1.600" strokeLinecap="round" />
      <ellipse cx="22" cy="21" rx="12" ry="9" fill={`url(#${id}s)`} />

      {/* sapka */}
      <path d="M16.500 22.500c.8-8.500 7.300-13 15.500-13s14.700 4.500 15.500 13Z" fill="#0a1712" stroke={`url(#${id}g)`} strokeWidth="1.800" strokeLinejoin="round" />
      <rect x="13.500" y="21.500" width="37" height="5" rx="2.500" fill={`url(#${id}g)`} />
      <path d="m32 12 1.700 3.400 3.700.55-2.700 2.600.65 3.700L32 20.500l-3.350 1.750.65-3.700-2.700-2.600 3.700-.55Z" fill={`url(#${id}g)`} />

      {/* szemek */}
      {mood === "happy" ? (
        <>
          <path d="M21.500 36.500c1.200-2.800 4.800-2.800 6 0" fill="none" stroke="#fff" strokeWidth="2.400" strokeLinecap="round" />
          <path d="M36.500 36.500c1.200-2.800 4.800-2.800 6 0" fill="none" stroke="#fff" strokeWidth="2.400" strokeLinecap="round" />
        </>
      ) : (
        <>
          <g className="pg-blink">
            <circle cx="24.500" cy="35.500" r="3.300" fill="#fff" />
            <circle cx="24.500" cy="35.500" r="3.300" fill="none" stroke="#0a1712" strokeOpacity="0.25" strokeWidth="0.6" />
            <circle cx={24.500 + look.x} cy={35.500 + look.y} r="1.700" fill="#0a1712" />
            <circle cx={25 + look.x} cy={34.800 + look.y} r="0.55" fill="#fff" />
          </g>
          <g className="pg-blink">
            <circle cx="39.500" cy="35.500" r="3.300" fill="#fff" />
            <circle cx="39.500" cy="35.500" r="3.300" fill="none" stroke="#0a1712" strokeOpacity="0.25" strokeWidth="0.6" />
            <circle cx={39.500 + look.x} cy={35.500 + look.y} r="1.700" fill="#0a1712" />
            <circle cx={40 + look.x} cy={34.800 + look.y} r="0.55" fill="#fff" />
          </g>
        </>
      )}
      {mood === "think" && <path d="M36 30.500c2-1.600 5-1.800 7.200-.4" fill="none" stroke="#fff" strokeWidth="1.600" strokeLinecap="round" />}

      {/* arc: pír és száj */}
      <circle cx="19.500" cy="42" r="2.400" fill="#ff8aa0" opacity={mood === "happy" ? 0.7 : 0.4} />
      <circle cx="44.500" cy="42" r="2.400" fill="#ff8aa0" opacity={mood === "happy" ? 0.7 : 0.4} />
      {mood === "talk" ? (
        <ellipse className="pg-talk" cx="32" cy="45" rx="3.600" ry="3" fill="#0a1712" stroke="#fff" strokeWidth="1.400" />
      ) : mood === "think" ? (
        <path d="M28.500 45.500h7" stroke="#fff" strokeWidth="2.200" strokeLinecap="round" />
      ) : (
        <path d="M26.500 43.500c2.200 3.400 8.800 3.400 11 0" fill="none" stroke="#fff" strokeWidth="2.300" strokeLinecap="round" />
      )}

      {/* gondolkodás pöttyei és örömcsillogás */}
      {mood === "think" && (
        <g fill="#6ee7b7">
          {[0, 1, 2].map((n) => (
            <circle key={n} className="pg-dot" cx={46 + n * 5.500} cy={9 - n * 2} r={1.600 + n * 0.5} style={{ animationDelay: `${n * 0.2}s` }} />
          ))}
        </g>
      )}
      {mood === "happy" && (
        <g fill="#6ee7b7">
          <path className="pg-dot" d="m52 8 1.200 2.800L56 12l-2.800 1.200L52 16l-1.200-2.800L48 12l2.800-1.200Z" />
          <path className="pg-dot" style={{ animationDelay: "0.4s" }} d="m10 14 .9 2.100L13 17l-2.100.9L10 20l-.9-2.100L7 17l2.100-.9Z" />
        </g>
      )}
    </svg>
  );
}
