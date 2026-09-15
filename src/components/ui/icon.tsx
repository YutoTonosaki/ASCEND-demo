import type { CSSProperties } from "react";
export type IconName =
  | "home"
  | "train"
  | "player"
  | "career"
  | "shop"
  | "arrow"
  | "bolt"
  | "lock"
  | "target"
  | "check"
  | "grid";
const paths: Record<IconName, string> = {
  home: "m3 10 9-7 9 7v10H3z M9 20v-7h6v7",
  train: "m6 5 13 13 M3 7l4-4 M2 11l9-9 M13 22l9-9 M17 21l4-4",
  player: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-3a8 8 0 0 1 16 0v3",
  career:
    "M7 3h10v6a5 5 0 0 1-10 0z M7 5H3v3a4 4 0 0 0 4 4 M17 5h4v3a4 4 0 0 1-4 4 M12 14v7 M7 21h10",
  shop: "M4 8h16l1 13H3z M8 8V6a4 4 0 0 1 8 0v2",
  arrow: "M4 12h16 M14 6l6 6-6 6",
  bolt: "m14 2-10 12h7l-1 8L21 9h-8z",
  lock: "M6 10h12v11H6z M8 10V6a4 4 0 0 1 8 0v4",
  target: "M21 12a9 9 0 1 1-9-9 M17 12a5 5 0 1 1-5-5 M12 12l9-9 M16 3h5v5",
  check: "m5 12 4 4L19 6",
  grid: "M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M15 15h6v6h-6z",
};
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
