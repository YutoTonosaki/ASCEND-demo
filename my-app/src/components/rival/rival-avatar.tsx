import { useId } from "react";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Ellipse,
  Path,
} from "react-native-svg";
import type { RivalColor } from "@/types/domain";
import { rivalColors } from "@/config/visuals";
export function RivalAvatar({
  color = "blue",
  size = 240,
}: {
  color?: RivalColor;
  size?: number;
}) {
  const id = "body" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const tint = rivalColors[color];
  return (
    <Svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 240 300"
      accessible
      accessibilityLabel={`${color} digital training rival`}
    >
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor={tint} stopOpacity={0.95} />
          <Stop offset="1" stopColor={tint} stopOpacity={0.18} />
        </LinearGradient>
      </Defs>
      <Ellipse
        cx="120"
        cy="278"
        rx="85"
        ry="13"
        fill="none"
        stroke={tint}
        opacity={0.3}
      />
      <Ellipse cx="120" cy="278" rx="58" ry="7" fill={tint} opacity={0.15} />
      <Path
        d="M103 29 120 23 137 29 142 46 134 67 128 72 130 82 156 91 168 104 179 145 171 159 186 199 176 206 164 195 151 158 147 129 141 153 144 175 139 212 134 258 145 273 121 273 116 256 119 210 115 187 109 214 104 258 107 273 83 273 91 255 91 210 96 173 98 150 92 127 84 158 69 195 56 204 49 195 63 155 60 143 75 101 86 91 109 82 110 72 101 62 97 44Z"
        fill={`url(#${id})`}
        stroke={tint}
        strokeWidth={1.2}
      />
      <Path
        d="m86 98 29 10 37-10-12 29-24 8-20-9ZM103 144l13 5 20-6M104 156l12 5 20-6M106 168l11 5 18-6M97 184l14 18M141 184l-18 18M78 109l-10 35M161 110l10 34M97 221l5 30M129 221l-1 30M45 65V40h21M174 40h21v25M45 225v25h20M195 225v25h-20"
        stroke={tint}
        opacity={0.6}
        fill="none"
      />
    </Svg>
  );
}
