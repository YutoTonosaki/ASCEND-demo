import Svg, { Path } from "react-native-svg";
import type { ColorValue } from "react-native";
import { colors } from "@/config/theme";
export type IconName =
  | "settings"
  | "close"
  | "home"
  | "train"
  | "player"
  | "career"
  | "shop"
  | "arrow"
  | "bolt"
  | "lock"
  | "check"
  | "grid";
const paths: Record<IconName, string> = {
  settings:
    "M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  close: "m6 6 12 12M18 6 6 18",
  home: "m3 10 9-7 9 7v10H3z M9 20v-7h6v7",
  train: "m6 5 13 13 M3 7l4-4 M2 11l9-9 M13 22l9-9 M17 21l4-4",
  player: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-3a8 8 0 0 1 16 0v3",
  career:
    "M7 3h10v6a5 5 0 0 1-10 0z M7 5H3v3a4 4 0 0 0 4 4 M17 5h4v3a4 4 0 0 1-4 4 M12 14v7 M7 21h10",
  shop: "M4 8h16l1 13H3z M8 8V6a4 4 0 0 1 8 0v2",
  arrow: "M4 12h16 M14 6l6 6-6 6",
  bolt: "m14 2-10 12h7l-1 8L21 9h-8z",
  lock: "M6 10h12v11H6z M8 10V6a4 4 0 0 1 8 0v4",
  check: "m5 12 4 4L19 6",
  grid: "M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M15 15h6v6h-6z",
};
export function Icon({
  name,
  size = 22,
  color = colors.muted,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      accessible={false}
    >
      <Path
        d={paths[name]}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
export function Emblem({
  size = 100,
  color = colors.bronze,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 140 170"
      accessible={false}
    >
      <Path
        d="m70 9 60 128-35-15-25-58-25 58-35 15L70 9Z"
        fill={color}
        opacity={0.7}
      />
      <Path d="m70 98 31 63-31-14-31 14 31-63Z" fill={color} />
    </Svg>
  );
}
