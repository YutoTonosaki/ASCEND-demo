import { useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import {
  Screen,
  Panel,
  Choice,
  Placeholder,
  s,
} from "@/components/ui/primitives";
import { RivalAvatar } from "@/components/rival/rival-avatar";
import { season, rival } from "@/data/mock";
import { rivalColors } from "@/config/visuals";
import { colors } from "@/config/theme";
import type { RivalColor } from "@/types/domain";
export default function Career() {
  const [color, setColor] = useState<RivalColor>(rival.color);
  return (
    <Screen kicker="CAREER / THE LONG GAME" title="WRITE YOUR STORY">
      <Panel title="CURRENT CHAPTER">
        <Text style={c.season}>
          SEASON <Text style={{ color: colors.blue }}>{season.number}</Text>
        </Text>
        <Text style={s.eyebrow}>CURRENT RECORD</Text>
        <Text style={[s.number, { fontSize: 36 }]}>
          {season.wins}
          <Text style={c.unit}>W</Text> — {season.losses}
          <Text style={c.unit}>L</Text>
        </Text>
        <View style={c.divider} />
        <View style={s.sectionHeading}>
          <View style={{ gap: 8 }}>
            <Text style={s.eyebrow}>CURRENT RIVAL</Text>
            <Text style={c.rival}>{rival.name}</Text>
          </View>
          <Text style={c.rival}>
            {rival.ovr} <Text style={s.tiny}>OVR</Text>
          </Text>
        </View>
        <View style={c.avatar}>
          <RivalAvatar color={color} size={184} />
        </View>
        <View style={s.sectionHeading}>
          <Text style={s.eyebrow}>NEXT MATCH</Text>
          <Text style={c.rival}>{season.nextMatch}</Text>
        </View>
      </Panel>
      <Panel title="RIVAL COLOR">
        <View style={s.choices}>
          {(Object.keys(rivalColors) as RivalColor[]).map((key) => (
            <Choice
              key={key}
              label={key[0].toUpperCase() + key.slice(1)}
              selected={color === key}
              color={rivalColors[key]}
              onPress={() => setColor(key)}
            />
          ))}
        </View>
      </Panel>
      <Panel title="YOUR LEGACY" kicker="COMING SOON">
        <Placeholder title="SEASON HISTORY" icon="grid" />
        <Placeholder title="TROPHY ROOM" icon="career" />
        <Placeholder title="PAST PLAYER CARDS" icon="player" />
      </Panel>
    </Screen>
  );
}
const c = StyleSheet.create({
  season: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -2,
  },
  unit: { fontSize: 18, color: colors.muted },
  divider: { height: 1, backgroundColor: colors.border },
  rival: { fontSize: 20, fontWeight: "700", color: colors.text },
  avatar: {
    alignItems: "center",
    backgroundColor: "#142031",
    borderRadius: 12,
  },
});
