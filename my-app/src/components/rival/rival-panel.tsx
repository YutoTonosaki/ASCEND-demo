import { StyleSheet, Text, View } from "react-native";
import { rival, season } from "@/data/mock";
import { colors } from "@/config/theme";
import { Panel, s } from "@/components/ui/primitives";
import { RivalAvatar } from "./rival-avatar";
export function RivalPanel() {
  return (
    <Panel>
      <View style={r.row}>
        <View style={r.copy}>
          <Text style={s.eyebrow}>
            NEXT MATCH · {season.nextMatch.toUpperCase()}
          </Text>
          <Text style={r.name}>{rival.name}</Text>
          <Text style={r.rating}>
            {rival.ovr} <Text style={s.tiny}>OVR</Text>
          </Text>
        </View>
        <RivalAvatar color={rival.color} size={84} />
      </View>
    </Panel>
  );
}
const r = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  copy: { flex: 1, gap: 8 },
  name: { color: colors.text, fontSize: 18, fontWeight: "800" },
  rating: { fontSize: 24, fontWeight: "700", color: colors.blue },
});
