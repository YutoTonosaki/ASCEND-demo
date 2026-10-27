import { View, StyleSheet } from "react-native";
import Svg, { Path, Rect, Line, Circle } from "react-native-svg";
import type { CosmeticItem } from "../../shop/catalog";
/** The same static geometry is used by swatches and full cards. Never a gameplay layer. */
export function CosmeticArt({ item }: { item: CosmeticItem }) {
  if (!item.treatment || item.category === "title") return null;
  const color = item.color;
  return (
    <View
      pointerEvents="none"
      aria-hidden={true}
      testID={`cosmetic-art-${item.id}`}
      style={StyleSheet.absoluteFill}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {item.treatment === "lanes" && (
          <>
            <Path
              d="M5 100 L35 0 M30 100 L46 0 M70 100 L54 0 M95 100 L65 0"
              stroke="#9bd5bb"
              strokeWidth="0.6"
              opacity="0.25"
            />
            <Line
              x1="0"
              y1="72"
              x2="100"
              y2="72"
              stroke="#9bd5bb"
              opacity="0.2"
            />
          </>
        )}
        {item.treatment === "arena" && (
          <>
            <Path
              d="M0 4 L48 100 L14 0 M100 4 L52 100 L86 0"
              fill="#8bbcff"
              opacity="0.10"
            />
            <Path
              d="M0 7 L100 7 M0 11 L100 11"
              stroke="#a9d2ff"
              strokeDasharray="2 4"
              strokeWidth="0.8"
              opacity="0.5"
            />
          </>
        )}
        {item.treatment === "grid" && (
          <>
            <Path
              d="M0 100 L50 20 L100 100 M20 100 L50 20 L80 100 M40 100 L50 20 L60 100 M0 55 H100 M0 72 H100 M0 94 H100"
              fill="none"
              stroke="#70dfe9"
              strokeWidth="0.5"
              opacity="0.3"
            />
            <Circle cx="50" cy="20" r="8" fill="#70dfe9" opacity="0.08" />
          </>
        )}
        {item.treatment === "carbon" && (
          <>
            <Rect
              x="4"
              y="3"
              width="92"
              height="94"
              rx="4"
              fill="none"
              stroke={color}
              strokeWidth="1.1"
              strokeDasharray="5 2"
            />
            <Path
              d="M7 20 V7 H25 M75 93 H93 V80"
              fill="none"
              stroke={color}
              strokeWidth="1.5"
            />
          </>
        )}
        {item.treatment === "platinum" && (
          <>
            <Rect
              x="4"
              y="3"
              width="92"
              height="94"
              rx="4"
              fill="none"
              stroke={color}
              strokeWidth="1"
            />
            <Rect
              x="6"
              y="5"
              width="88"
              height="90"
              rx="3"
              fill="none"
              stroke={color}
              strokeWidth="0.4"
              opacity="0.65"
            />
          </>
        )}
        {item.treatment === "champion" && (
          <>
            <Rect
              x="4"
              y="3"
              width="92"
              height="94"
              rx="4"
              fill="none"
              stroke={color}
              strokeWidth="0.4"
            />
            <Path
              d="M4 23 V3 H27 M73 3 H96 V23 M4 77 V97 H27 M73 97 H96 V77"
              fill="none"
              stroke={color}
              strokeWidth="1.8"
            />
          </>
        )}
        {item.treatment === "electric" && (
          <>
            <Path
              d="M5 12 L10 28 L5 43 L9 57 L5 86 M95 12 L90 28 L95 43 L91 57 L95 86"
              fill="none"
              stroke={color}
              strokeWidth="4"
              opacity="0.12"
            />
            <Path
              d="M5 12 L10 28 L5 43 L9 57 L5 86 M95 12 L90 28 L95 43 L91 57 L95 86"
              fill="none"
              stroke={color}
              strokeWidth="0.9"
              opacity="0.8"
            />
          </>
        )}
        {item.treatment === "crimson" && (
          <>
            <Path
              d="M5 20 L11 50 L5 80 L1 50 Z M95 20 L89 50 L95 80 L99 50 Z"
              fill={color}
              opacity="0.13"
            />
            <Path
              d="M5 20 L11 50 L5 80 M95 20 L89 50 L95 80"
              fill="none"
              stroke={color}
              strokeWidth="0.8"
              opacity="0.8"
            />
          </>
        )}
      </Svg>
    </View>
  );
}
