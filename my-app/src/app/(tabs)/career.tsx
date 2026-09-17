import { currentClub, clubJoinedLabel } from "@/data/club-career";
import { ClubCrest } from "@/components/club/club-identity";
import { Icon } from "@/components/ui/icon";
import { useState } from "react";
import { Text, View, StyleSheet, Pressable } from "react-native";
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
  const [clubExpanded, setClubExpanded] = useState(false);
  const [color, setColor] = useState<RivalColor>(rival.color);
  return (
    <Screen kicker="CAREER / THE LONG GAME" title="WRITE YOUR STORY">
      <Panel title="CURRENT CHAPTER">
        <View style={s.sectionHeading}>
          <Text style={c.season}>
            SEASON <Text style={{ color: colors.blue }}>{season.number}</Text>
          </Text>
          <View style={{ gap: 3 }}>
            <Text style={s.eyebrow}>CURRENT RECORD</Text>
            <Text style={[s.number, { fontSize: 26 }]}>
              {season.wins}
              <Text style={c.unit}>W</Text> — {season.losses}
              <Text style={c.unit}>L</Text>
            </Text>
          </View>
        </View>
        {currentClub && (
          <View style={c.club}>
            <Text style={s.eyebrow}>CURRENT CLUB</Text>
            <View style={s.row}>
              <ClubCrest club={currentClub} size={30} />
              <View style={s.flex}>
                <Text style={c.clubName}>{currentClub.name}</Text>
                <Text style={s.fine}>
                  {currentClub.country}
                  {clubJoinedLabel ? ` · Joined ${clubJoinedLabel}` : ""}
                </Text>
              </View>
            </View>
          </View>
        )}
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
      <Panel title="YOUR LEGACY" kicker="CAREER">
        {currentClub && (
          <View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Club details"
              accessibilityState={{ expanded: clubExpanded }}
              onPress={() => setClubExpanded((value) => !value)}
              style={({ pressed }) => [s.utilityRow, pressed && s.pressed]}
            >
              <ClubCrest club={currentClub} size={20} />
              <View style={s.flex}>
                <Text style={s.utilityTitle}>CLUB</Text>
                <Text style={s.fine}>{currentClub.name}</Text>
              </View>
              <Icon name="arrow" size={16} />
            </Pressable>
            {clubExpanded && (
              <Text style={[s.muted, { paddingTop: 10 }]}>
                {currentClub.description}
              </Text>
            )}
          </View>
        )}
        <Placeholder
          title="TRANSFER CENTER"
          description="Coming soon"
          icon="lock"
        />
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
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -2,
  },
  club: { gap: 7 },
  clubName: { fontSize: 15, fontWeight: "700", color: colors.text },
  unit: { fontSize: 18, color: colors.muted },
  divider: { height: 1, backgroundColor: colors.border },
  rival: { fontSize: 20, fontWeight: "700", color: colors.text },
  avatar: {
    alignItems: "center",
    backgroundColor: "#142031",
    borderRadius: 12,
  },
});
