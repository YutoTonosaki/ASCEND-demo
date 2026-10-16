import { assertOwner, type MatchData, type MatchOwner } from "../domain";
interface SavedMatchSource {
  play: (owner: MatchOwner, id: string) => Promise<MatchData>;
  load: () => Promise<MatchData>;
}
/** Read back durable evidence, including lost acknowledgment. Never retry resolution here. */
export async function playSaved(
  source: SavedMatchSource,
  owner: MatchOwner,
  id: string,
) {
  let failure: unknown;
  try {
    await source.play(owner, id);
  } catch (error) {
    failure = error;
  }
  const data = await source.load();
  assertOwner(data, owner);
  const match = data.matches.find((m) => m.id === id);
  if (!match?.result || !match.weekEnd || match.skippedAt)
    throw failure ?? Error("Saved Match result unavailable");
  return { data, match };
}
