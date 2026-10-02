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
  return (
    <View style={{ gap: 10 }}>
      <View style={s.row}>
        <ClubCrest club={club} size={42} />
        <View style={s.flex}>
          <Text style={s.sectionTitle}>{club.name}</Text>
          <Text style={s.fine}>
            {club.shortName} · {club.country}
          </Text>
        </View>
      </View>
      <Text style={s.muted}>
        Reputation {club.reputation} / 5 ·{" "}
        {clubReputationLevels[club.reputation]}
      </Text>
      <Text style={s.muted}>
        Recommended OVR {club.recommendedOVR} · Informational only
      </Text>
      <Text style={s.muted}>{club.description}</Text>
      <Text style={s.fine}>
        Profile interests · {club.preferredAttributes.join(" / ")}. No effect on
        your ratings.
      </Text>
    </View>
  );
}
export default function CareerScreen() {
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
    <Screen kicker="CAREER / YOUR CLUB" title="WRITE YOUR STORY">
      {career.error ? (
        <Panel title="CAREER UNAVAILABLE">
          <Text style={s.muted}>{career.error}</Text>
          <Action
            label="RETRY CAREER"
            disabled={career.busy}
            onPress={() => void career.retry()}
          />
        </Panel>
      ) : !career.data ? (
        <Text style={s.muted}>Loading career…</Text>
      ) : record && career.club ? (
        <>
          <Panel title="CURRENT CLUB">
            <ClubCrest club={career.club} size={52} />
            <Text testID="current-club" style={s.sectionTitle}>
              {career.club.name}
            </Text>
            <Text style={s.muted}>
              {career.club.country} · Reputation {career.club.reputation} / 5
            </Text>
            <Action label="CLUB DETAILS" onPress={() => setDetails(!details)} />
            {details && <ClubProfile club={career.club} />}
          </Panel>
          <Panel title="PLAYER STATUS">
            <Text style={s.sectionTitle}>
              {player
                ? `OVR ${overall(player.ratings)} · ${cardTiers[cardAppearance(overall(player.ratings)).tier].label.toUpperCase()}`
                : "Player data unavailable"}
            </Text>
            <Text style={s.muted}>Club Member</Text>
          </Panel>
          <Panel title="CAREER RECORD">
            {record.clubHistory.map((entry, i) => (
              <View
                key={`${entry.clubId}:${entry.joinedAt}:${i}`}
                style={{ gap: 5 }}
              >
                <Text style={s.sectionTitle}>
                  {clubById(entry.clubId)!.name}
                </Text>
                <Text style={s.muted}>
                  Joined {new Date(entry.joinedAt).toLocaleDateString()}
                </Text>
                <Text style={s.fine}>
                  {entry.leftAt
                    ? `Left ${new Date(entry.leftAt).toLocaleDateString()}`
                    : "Current club"}
                </Text>
              </View>
            ))}
          </Panel>
          <Panel title="YOUR NEXT CHAPTER">
            <Placeholder title="SEASON" description="Coming soon" />
            <Placeholder title="MATCH" description="Coming soon" />
            <Placeholder title="TRANSFER CENTER" description="Coming soon" />
          </Panel>
        </>
      ) : (
        <Panel title="CAREER NOT STARTED">
          <Text style={s.sectionTitle}>BEGIN YOUR JOURNEY</Text>
          <Text style={s.muted}>
            Choose your first Japanese club and begin your ASCEND career.
          </Text>
          {player && !growth.error ? (
            <Action
              label="START CAREER"
              onPress={() => {
                setSelected(null);
                setSelecting(true);
              }}
            />
          ) : (
            <>
              <Text style={s.fine}>
                Initialize your Player before choosing a club. Your existing
                training and Coins stay intact.
              </Text>
              <Action
                label="OPEN PLAYER"
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
              ? `JOIN ${selected.name.toUpperCase()}?`
              : "CHOOSE YOUR FIRST CLUB"
          }
          onClose={() => setSelecting(false)}
        >
          {selected ? (
            <>
              <ClubProfile club={selected} />
              <Text style={s.muted}>
                This will become your first club. Club changes will be available
                through future transfers.
              </Text>
              <Action
                label="BACK TO CLUBS"
                disabled={career.busy}
                onPress={() => setSelected(null)}
              />
              <Action
                label={career.busy ? "JOINING…" : "JOIN CLUB"}
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
                    label={`INSPECT ${club.name.toUpperCase()}`}
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
