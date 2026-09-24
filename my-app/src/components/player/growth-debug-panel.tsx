import { useEffect, useState } from "react";
import { AppState, Text, View } from "react-native";
import { Sheet, Action, ErrorText } from "@/components/training/controls";
import { Panel, s } from "@/components/ui/primitives";
import { useGrowth } from "@/growth/provider";
import { overall } from "@/growth/domain";
import { bodyParts } from "@/config/training";
import type { PlayerData, GrowthEvent } from "@/types/growth";

export function GrowthDebugPanel({ onClose }: { onClose: () => void }) {
  // Also block accidental direct rendering in production.
  return __DEV__ ? <DebugContents onClose={onClose} /> : null;
}
function DebugContents({ onClose }: { onClose: () => void }) {
  const { data: liveData, readSavedDebugSnapshot } = useGrowth();
  const [snapshot, setSnapshot] = useState<PlayerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let mounted = true, request = 0;
    const read = async () => {
      const current = ++request;
      setLoading(true);
      setError(null);
      try {
        const next = await readSavedDebugSnapshot();
        if (mounted && current === request) setSnapshot(next);
      } catch (e) {
        if (mounted && current === request) {
          setSnapshot(null);
          setError(e instanceof Error ? e.message : "Could not read saved player data.");
        }
      } finally {
        if (mounted && current === request) setLoading(false);
      }
    };
    void read();
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") void read();
    });
    return () => { mounted = false; subscription.remove(); };
  }, [readSavedDebugSnapshot, liveData, reload]);
  const player = snapshot?.player;
  return <Sheet title="GROWTH DEBUG" onClose={onClose}>
    <Text style={s.fine}>DEVELOPMENT ONLY · READ ONLY · ascend.player.v1</Text>
    <Text style={s.fine}>Saved snapshot. Ratings are rounded only for display. Event differences use stored before/after values. Opening this panel does not recalculate growth.</Text>
    <Action label="REFRESH SAVED DATA" onPress={() => setReload(n => n + 1)} />
    {loading ? <Text style={s.muted}>Reading saved player data…</Text> : error ? <ErrorText message={error} /> : !player ? <Text style={s.muted}>No initialized Player is saved. This panel does not initialize ratings.</Text> : <>
      <Panel title="CURRENT RATINGS" kicker={`OVR ${overall(player.ratings)}`}>
        {bodyParts.map(area => <View key={area} style={s.sectionHeading}>
          <Text style={s.muted}>{area}</Text>
          <Text selectable style={s.sectionTitle}>{player.ratings[area].toFixed(3)} · {player.status[area].toUpperCase()}</Text>
        </View>)}
        <Text selectable style={s.fine}>Initialized: {player.initializedAt}</Text>
        <Text style={s.fine}>Saved events: {player.events.length}</Text>
      </Panel>
      <EventHistory title="GROWTH EVENTS" events={player.events} kind="growth" />
      <EventHistory title="BONUS EVENTS" events={player.events} kind="bonus" />
      <EventHistory title="ASSESSMENT EVENTS" events={player.events} kind="assessment" />
    </>}
  </Sheet>;
}
function EventHistory({ title, events, kind }: { title: string; events: GrowthEvent[]; kind: GrowthEvent["kind"] }) {
  const [limit, setLimit] = useState(10);
  const matches = [...events].reverse().filter(e => e.kind === kind)
    .sort((a,b) => Date.parse(b.at) - Date.parse(a.at));
  return <Panel title={title} kicker={`${matches.length} · NEWEST FIRST`}>
    {kind === "assessment" && <Text style={s.fine}>Assessment adjustments replace provisional values. These are not PR growth awards.</Text>}
    {!matches.length && <Text style={s.muted}>No {kind} events saved.</Text>}
    {matches.slice(0,limit).map(event => <View key={event.id} style={{ gap: 6, paddingVertical: 8 }}>
      <Text selectable style={s.sectionTitle}>{new Date(event.at).toLocaleString()}</Text>
      <Text selectable style={s.fine}>UTC: {event.at}</Text>
      <Text selectable style={s.muted}>Exercise ID: {event.exerciseId ?? "— (session bonus)"}</Text>
      <Text selectable style={s.fine}>Session: {event.sessionId}{"\n"}Set: {event.setId ?? "—"}</Text>
      {!event.changes.length && <Text style={s.muted}>No rating change · actual addition 0</Text>}
      {event.changes.map(change => {
        const delta = change.after - change.before;
        return <View key={change.area} style={{ gap: 3 }}>
          <Text style={s.sectionTitle}>{change.area}</Text>
          <Text selectable style={s.muted}>Before: {String(change.before)}{"\n"}After: {String(change.after)}{"\n"}Actual Δ: {delta > 0 ? "+" : ""}{String(delta)}</Text>
        </View>;
      })}
    </View>)}
    {matches.length > limit && <Action label={`SHOW MORE ${kind.toUpperCase()} EVENTS`} onPress={() => setLimit(n => n + 10)} />}
  </Panel>;
}
