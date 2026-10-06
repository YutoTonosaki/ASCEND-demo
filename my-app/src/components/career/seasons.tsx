import { useLocalization } from "@/localization";
import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { Panel, s } from "../ui/primitives";
import { Action, Sheet } from "../training/controls";
import { ClubIdentity } from "../club/club-identity";
import { useSeasons } from "../../seasons/provider";
import { activeSeason, statistics, type Season } from "../../seasons/domain";

import { useGrowth } from "../../growth/provider";
import { useCareer } from "../../career/provider";
import { overall } from "../../growth/domain";
import { cardTiers } from "../../config/visuals";

function Details({
  season,
  current,
}: {
  season: Season;
  current: number | null;
}) {
  const l = useLocalization();
  const { tr } = useLocalization();
  const end = season.end,
    ovr = end?.player.ovr ?? current,
    stats = end?.stats ?? statistics(season);
  return (
    <>
      <Text style={s.sectionTitle}>
        {tr("season.label", { number: String(season.number).padStart(2, "0") })}
      </Text>
      <Text style={s.muted}>{l.month(season.monthId)}</Text>
      <ClubIdentity club={season.club} />
      <Text style={s.muted}>
        {tr("season.startingOVR")} {season.startingPlayer.ovr}
      </Text>
      <Text style={s.muted}>
        {end ? tr("season.final") : tr("season.current")} OVR ·{" "}
        {ovr ?? "Unavailable"}
      </Text>
      <Text style={s.sectionTitle}>
        {tr("season.change")}{" "}
        {ovr === null
          ? tr("common.unavailable")
          : `${ovr - season.startingPlayer.ovr >= 0 ? "+" : ""}${ovr - season.startingPlayer.ovr}`}
      </Text>
      <Text testID="season-workouts" style={s.muted}>
        {tr("season.workouts")} {stats.workouts}
      </Text>
      <Text testID="season-days" style={s.muted}>
        {tr("season.days")} {stats.trainingDays}
      </Text>
      <Text testID="season-prs" style={s.muted}>
        {tr("season.prs")} {stats.prImprovements}
      </Text>
      {end && (
        <Text style={s.fine}>
          {l.display(cardTiers[season.startingPlayer.tier].label)} /{" "}
          {l.display(season.startingPlayer.finish.toUpperCase())} →{" "}
          {l.display(cardTiers[end.player.tier].label)} /{" "}
          {l.display(end.player.finish.toUpperCase())}
        </Text>
      )}
    </>
  );
}
export function SeasonPanel() {
  const l = useLocalization();
  const { tr } = useLocalization();
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
      <Panel title={tr("season.currentSeason")}>
        {state.error ? (
          <>
            <Text style={s.muted}>{l.errorText(state.error)}</Text>
            <Action
              label={tr("season.retry")}
              disabled={state.busy}
              onPress={() => void state.retry()}
            />
          </>
        ) : !data ? (
          <Text style={s.muted}>{tr("season.loading")}</Text>
        ) : active ? (
          <>
            <Details season={active} current={current} />
            <Text style={s.eyebrow}>
              {state.month > active.monthId
                ? tr("season.monthEnded")
                : tr("season.active")}
            </Text>
            {state.month > active.monthId && (
              <>
                <Text style={s.fine}>{tr("season.closeNote")}</Text>
                <Action
                  label={tr("season.complete")}
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
                ? tr("season.recorded")
                : tr("season.available")}
            </Text>
            <Text style={s.muted}>{l.month(state.month)}</Text>
            {!data.seasons.some((s) => s.monthId >= state.month) && (
              <Action
                label={tr("season.start")}
                disabled={state.busy || current === null || !!career.error}
                onPress={() => void state.start()}
              />
            )}
          </>
        )}
      </Panel>
      {!!data?.seasons.some((s) => s.end) && (
        <Panel title={tr("season.history")}>
          {data.seasons
            .filter((s) => s.end)
            .map((season) => (
              <Action
                key={season.id}
                label={`${tr("season.label", { number: String(season.number).padStart(2, "0") })} · ${l.month(season.monthId)} · ${season.club.name} · ${season.startingPlayer.ovr} → ${season.end!.player.ovr}`}
                onPress={() => setDetail(season)}
              />
            ))}
        </Panel>
      )}
      {detail && (
        <Sheet title={tr("season.completed")} onClose={() => setDetail(null)}>
          <Details season={detail} current={null} />
          <Text style={s.fine}>
            {tr("season.completedOn")} {l.date(detail.end!.calendar.at)}
          </Text>
        </Sheet>
      )}
    </>
  );
}
export function HomeSeason() {
  const l = useLocalization();
  const { tr } = useLocalization();
  const state = useSeasons(),
    career = useCareer();
  if (!career.club) return null;
  const active = state.data ? activeSeason(state.data) : undefined;
  return (
    <Panel title={tr("season.home")}>
      {state.error ? (
        <Text style={s.fine}>{tr("season.unavailable")}</Text>
      ) : active ? (
        <>
          <Text testID="home-season" style={s.sectionTitle}>
            {tr("season.label", {
              number: String(active.number).padStart(2, "0"),
            })}{" "}
            · {l.month(active.monthId)}
          </Text>
          <Text style={s.fine}>
            {statistics(active).workouts} {tr("season.workouts")}{" "}
            {statistics(active).trainingDays} {tr("season.trainingDays")}
          </Text>
        </>
      ) : (
        <Text style={s.fine}>
          {state.data ? tr("season.none") : tr("season.loadingOne")}
        </Text>
      )}
      <Action
        label={tr("season.viewCareer")}
        onPress={() => router.push("/career")}
      />
    </Panel>
  );
}
