import { useLocalization } from "@/localization";
import { SeasonPanel } from "@/components/career/seasons";
import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Screen, Panel, Placeholder, s } from "@/components/ui/primitives";
import { Action, Sheet } from "@/components/training/controls";
import { ClubCrest } from "@/components/club/club-identity";
import { startingClubs, clubReputationLevels, clubById } from "@/config/clubs";
import { useCareer } from "@/career/provider";
import { useGrowth } from "@/growth/provider";
import { overall } from "@/growth/domain";
import { cardAppearance } from "@/cards/domain";
import { cardTiers } from "@/config/visuals";
import type { Club } from "@/types/club";
function ClubProfile({ club }: { club: Club }) {
  const l = useLocalization();
  const { tr } = useLocalization();
  return (
    <View style={{ gap: 10 }}>
      <View style={s.row}>
        <ClubCrest club={club} size={42} />
        <View style={s.flex}>
          <Text style={s.sectionTitle}>{club.name}</Text>
          <Text style={s.fine}>
            {club.shortName} · {l.display(club.country)}
          </Text>
        </View>
      </View>
      <Text style={s.muted}>
        {tr("career.reputation")} {club.reputation} / 5 ·{" "}
        {l.display(clubReputationLevels[club.reputation])}
      </Text>
      <Text style={s.muted}>
        {tr("career.recommended")} {club.recommendedOVR} {tr("career.infoOnly")}
      </Text>
      <Text style={s.muted}>{l.display(club.description)}</Text>
      <Text style={s.fine}>
        {tr("career.interests")}{" "}
        {club.preferredAttributes.map(l.display).join(" / ")}
        {tr("career.noEffect")}
      </Text>
    </View>
  );
}
export default function CareerScreen() {
  const l = useLocalization();
  const { tr } = useLocalization();
  const career = useCareer(),
    growth = useGrowth();
  const [selecting, setSelecting] = useState(false),
    [selected, setSelected] = useState<Club | null>(null),
    [details, setDetails] = useState(false);
  const player = growth.data?.player,
    record = career.data?.career;
  const canChoose =
    !!player && !growth.error && !record && !!career.data && !career.error;
  return (
    <Screen kicker={tr("career.kicker")} title={tr("career.title")}>
      {career.error ? (
        <Panel title={tr("career.unavailable")}>
          <Text style={s.muted}>{l.errorText(career.error)}</Text>
          <Action
            label={tr("career.retry")}
            disabled={career.busy}
            onPress={() => void career.retry()}
          />
        </Panel>
      ) : !career.data ? (
        <Text style={s.muted}>{tr("career.loading")}</Text>
      ) : record && career.club ? (
        <>
          <Panel title={tr("career.currentClub")}>
            <ClubCrest club={career.club} size={52} />
            <Text testID="current-club" style={s.sectionTitle}>
              {career.club.name}
            </Text>
            <Text style={s.muted}>
              {l.display(career.club.country)} · {tr("career.reputation")}{" "}
              {career.club.reputation} / 5
            </Text>
            <Action
              label={tr("career.details")}
              onPress={() => setDetails(!details)}
            />
            {details && <ClubProfile club={career.club} />}
          </Panel>
          <SeasonPanel />
          <Panel title={tr("career.playerStatus")}>
            <Text style={s.sectionTitle}>
              {player
                ? `OVR ${overall(player.ratings)} · ${l.display(cardTiers[cardAppearance(overall(player.ratings)).tier].label).toUpperCase()}`
                : tr("career.playerUnavailable")}
            </Text>
            <Text style={s.muted}>{tr("career.member")}</Text>
          </Panel>
          <Panel title={tr("career.history")}>
            {record.clubHistory.map((entry, i) => (
              <View
                key={`${entry.clubId}:${entry.joinedAt}:${i}`}
                style={{ gap: 5 }}
              >
                <Text style={s.sectionTitle}>
                  {clubById(entry.clubId)!.name}
                </Text>
                <Text style={s.muted}>
                  {tr("career.joined")} {l.date(entry.joinedAt)}
                </Text>
                <Text style={s.fine}>
                  {entry.leftAt
                    ? tr("career.leftDate", { date: l.date(entry.leftAt) })
                    : tr("career.current")}
                </Text>
              </View>
            ))}
          </Panel>
          <Panel title={tr("career.next")}>
            <Placeholder
              title={tr("career.match")}
              description={tr("common.comingSoonSentence")}
            />
            <Placeholder
              title={tr("career.transfer")}
              description={tr("common.comingSoonSentence")}
            />
          </Panel>
        </>
      ) : (
        <Panel title={tr("career.notStarted")}>
          <Text style={s.sectionTitle}>{tr("career.begin")}</Text>
          <Text style={s.muted}>{tr("career.chooseNote")}</Text>
          {player && !growth.error ? (
            <Action
              label={tr("career.start")}
              onPress={() => {
                setSelected(null);
                setSelecting(true);
              }}
            />
          ) : (
            <>
              <Text style={s.fine}>{tr("career.initializeNote")}</Text>
              <Action
                label={tr("home.openPlayer")}
                onPress={() => router.push("/player")}
              />
            </>
          )}
        </Panel>
      )}
      {selecting && canChoose && (
        <Sheet
          title={
            selected
              ? tr("career.joinQuestion", { club: selected.name.toUpperCase() })
              : tr("career.choose")
          }
          onClose={() => setSelecting(false)}
        >
          {selected ? (
            <>
              <ClubProfile club={selected} />
              <Text style={s.muted}>{tr("career.joinNote")}</Text>
              <Action
                label={tr("career.backToClubs")}
                disabled={career.busy}
                onPress={() => setSelected(null)}
              />
              <Action
                label={career.busy ? tr("career.joining") : tr("career.join")}
                disabled={career.busy}
                onPress={() => void career.join(selected.id)}
              />
            </>
          ) : (
            <>
              {startingClubs.map((club) => (
                <Panel key={club.id}>
                  <ClubProfile club={club} />
                  <Action
                    label={tr("career.inspect", {
                      club: club.name.toUpperCase(),
                    })}
                    onPress={() => setSelected(club)}
                  />
                </Panel>
              ))}
            </>
          )}
        </Sheet>
      )}
    </Screen>
  );
}
