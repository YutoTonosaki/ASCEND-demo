import { useId, type CSSProperties } from "react";
import { rivalColors } from "@/config/visuals";
import type { RivalColor } from "@/types/domain";
export function RivalAvatar({ color = "blue" }: { color?: RivalColor }) {
  const id = useId().replace(/:/g, "");
  return (
    <div
      className="rival-avatar"
      style={{ "--rival-color": rivalColors[color] } as CSSProperties}
    >
      <svg
        viewBox="0 0 240 300"
        role="img"
        aria-label={`${color} digital training rival`}
      >
        <defs>
          <linearGradient id={`body-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="currentColor" stopOpacity=".9" />
            <stop offset="1" stopColor="currentColor" stopOpacity=".15" />
          </linearGradient>
          <pattern
            id={`scan-${id}`}
            width="4"
            height="5"
            patternUnits="userSpaceOnUse"
          >
            <path d="M0 0h4" stroke="currentColor" strokeOpacity=".12" />
          </pattern>
        </defs>
        <ellipse
          cx="120"
          cy="278"
          rx="87"
          ry="13"
          fill="none"
          stroke="currentColor"
          opacity=".3"
        />
        <ellipse
          cx="120"
          cy="278"
          rx="58"
          ry="7"
          fill="currentColor"
          opacity=".1"
        />
        <path
          d="M103 29 120 23 137 29 142 46 134 67 128 72 130 82 156 91 168 104 179 145 171 159 186 199 176 206 164 195 151 158 147 129 141 153 144 175 139 212 134 258 145 273 121 273 116 256 119 210 115 187 109 214 104 258 107 273 83 273 91 255 91 210 96 173 98 150 92 127 84 158 69 195 56 204 49 195 63 155 60 143 75 101 86 91 109 82 110 72 101 62 97 44Z"
          fill={`url(#body-${id})`}
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="m86 98 29 10 37-10-12 29-24 8-20-9ZM103 144l13 5 20-6M104 156l12 5 20-6M106 168l11 5 18-6M120 35v30M102 46h35M97 184l14 18M141 184l-18 18M78 109l-10 35M161 110l10 34M97 221l5 30M129 221l-1 30"
          stroke="currentColor"
          opacity=".65"
          fill="none"
        />
        <rect
          x="44"
          y="20"
          width="145"
          height="254"
          fill={`url(#scan-${id})`}
        />
        <path
          d="M45 65V40h21M174 40h21v25M45 225v25h20M195 225v25h-20"
          stroke="currentColor"
          opacity=".35"
        />
      </svg>
    </div>
  );
}
