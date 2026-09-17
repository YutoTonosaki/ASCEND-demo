import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { ClubIdentity as Identity } from "@/types/club";
import { colors } from "@/config/theme";
export function ClubCrest({
  club,
  size = 24,
}: {
  club: Identity;
  size?: number;
}) {
  return (
    <Svg
      width={size}
      height={size * 1.1}
      viewBox={club.crest.viewBox}
      accessible={false}
    >
      <Path
        d={club.crest.outlinePath}
        fill={club.secondaryColor}
        stroke={club.primaryColor}
        strokeWidth={1.5}
      />
      <Path d={club.crest.markPath} fill={club.primaryColor} />
    </Svg>
  );
}
export function ClubIdentity({
  club,
  compact = false,
}: {
  club: Identity;
  compact?: boolean;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${club.name}, ${club.country}`}
      style={styles.row}
    >
      <ClubCrest club={club} size={compact ? 16 : 22} />
      <Text style={[styles.label, compact && styles.compact]}>{club.name}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  label: { fontSize: 11, color: colors.muted, flexShrink: 1 },
  compact: { fontSize: 10 },
});
