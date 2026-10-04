import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { Panel, s } from "../ui/primitives";
import { Action, Sheet } from "../training/controls";
import { ClubIdentity } from "../club/club-identity";
import { useSeasons } from "../../seasons/provider";
import { activeSeason, statistics, type Season } from "../../seasons/domain";
import { monthLabel } from "../../seasons/calendar";
import { useGrowth } from "../../growth/provider";
import { useCareer } from "../../career/provider";
import { overall } from "../../growth/domain";
import { cardTiers } from "../../config/visuals";
const label = (n: number) => `SEASON ${String(n).padStart(2, "0")}`;
function Details({
  season,
  current,
}: {
  season: Season;
  current: number | null;
}) {
  const end = season.end,
    ovr = end?.player.ovr ?? current,
    stats = end?.stats ?? statistics(season);
  return (
    <>
      <Text style={s.sectionTitle}>{label(season.number)}</Text>
      <Text style={s.muted}>{monthLabel(season.monthId)}</Text>
      <ClubIdentity club={season.club} />
      <Text style={s.muted}>STARTING OVR · {season.startingPlayer.ovr}</Text>
      <Text style={s.muted}>
        {end ? "FINAL" : "CURRENT"} OVR · {ovr ?? "Unavailable"}
      </Text>
      <Text style={s.sectionTitle}>
        OVR CHANGE ·{" "}
        {ovr === null
          ? "Unavailable"
          : `${ovr - season.startingPlayer.ovr >= 0 ? "+" : ""}${ovr - season.startingPlayer.ovr}`}
      </Text>
      <Text testID="season-workouts" style={s.muted}>
        WORKOUTS · {stats.workouts}
      </Text>
      <Text testID="season-days" style={s.muted}>
        TRAINING DAYS · {stats.trainingDays}
      </Text>
      <Text testID="season-prs" style={s.muted}>
        PR IMPROVEMENTS · {stats.prImprovements}
      </Text>
      {end && (
        <Text style={s.fine}>
          {cardTiers[season.startingPlayer.tier].label} /{" "}
          {season.startingPlayer.finish} → {cardTiers[end.player.tier].label} /{" "}
          {end.player.finish}
        </Text>
      )}
    </>
  );
}
export function SeasonPanel() {
  const state = useSeasons(),
    growth = useGrowth(),
    career = useCareer(),
    [detail, setDetail] = useState<Season | null>(null);
  const data = state.data,
    active = data ? activeSeason(data) : undefined,
    p = growth.data?.player;
  const current = p && !growth.error ? overall(p.ratings) : null;
  return (
    <>
      <Panel title="CURRENT SEASON">
        {state.error ? (
          <>
            <Text style={s.muted}>{state.error}</Text>
            <Action
              label="RETRY SEASONS"
              disabled={state.busy}
              onPress={() => void state.retry()}
            />
          </>
        ) : !data ? (
          <Text style={s.muted}>Loading Seasons…</Text>
        ) : active ? (
          <>
            <Details season={active} current={current} />
            <Text style={s.eyebrow}>
              {state.month > active.monthId ? "MONTH ENDED" : "ACTIVE"}
            </Text>
            {state.month > active.monthId && (
              <>
                <Text style={s.fine}>
                  Final ratings will be captured when you complete this Season.
                </Text>
                <Action
                  label="COMPLETE SEASON"
                  disabled={state.busy || current === null || !!career.error}
                  onPress={() => void state.complete()}
                />
              </>
            )}
          </>
        ) : (
          <>
            <Text style={s.sectionTitle}>
              {data.seasons.some((s) => s.monthId >= state.month)
                ? "SEASON RECORDED"
                : "NEW SEASON AVAILABLE"}
            </Text>
            <Text style={s.muted}>{monthLabel(state.month)}</Text>
            {!data.seasons.some((s) => s.monthId >= state.month) && (
              <Action
                label="START SEASON"
                disabled={state.busy || current === null || !!career.error}
                onPress={() => void state.start()}
              />
            )}
          </>
        )}
      </Panel>
      {!!data?.seasons.some((s) => s.end) && (
        <Panel title="SEASON HISTORY">
          {data.seasons
            .filter((s) => s.end)
            .map((season) => (
              <Action
                key={season.id}
                label={`${label(season.number)} · ${monthLabel(season.monthId)} · ${season.club.name} · ${season.startingPlayer.ovr} → ${season.end!.player.ovr}`}
                onPress={() => setDetail(season)}
              />
            ))}
        </Panel>
      )}
      {detail && (
        <Sheet title="COMPLETED SEASON" onClose={() => setDetail(null)}>
          <Details season={detail} current={null} />
          <Text style={s.fine}>
            Completed {new Date(detail.end!.calendar.at).toLocaleDateString()}
          </Text>
        </Sheet>
      )}
    </>
  );
}
export function HomeSeason() {
  const state = useSeasons(),
    career = useCareer();
  if (!career.club) return null;
  const active = state.data ? activeSeason(state.data) : undefined;
  return (
    <Panel title="CAREER SEASON">
      {state.error ? (
        <Text style={s.fine}>Season unavailable. Review Career to retry.</Text>
      ) : active ? (
        <>
          <Text testID="home-season" style={s.sectionTitle}>
            {label(active.number)} · {monthLabel(active.monthId)}
          </Text>
          <Text style={s.fine}>
            {statistics(active).workouts} WORKOUTS ·{" "}
            {statistics(active).trainingDays} TRAINING DAYS
          </Text>
        </>
      ) : (
        <Text style={s.fine}>
          {state.data ? "No active Season" : "Loading Season…"}
        </Text>
      )}
      <Action label="VIEW CAREER" onPress={() => router.push("/career")} />
    </Panel>
  );
}
