import { clubById } from "../config/clubs";
export interface CareerTenure {
  clubId: string;
  joinedAt: string;
  leftAt: string | null;
}
export interface Career {
  playerId: string;
  clubHistory: CareerTenure[];
}
export interface CareerData {
  version: 1;
  career: Career | null;
}
export const currentTenure = (career: Career) =>
  career.clubHistory[career.clubHistory.length - 1];
const timestamp = (v: unknown): v is string => {
  if (typeof v !== "string") return false;
  try {
    return new Date(v).toISOString() === v;
  } catch {
    return false;
  }
};
export function parseCareer(raw: string | null): CareerData {
  if (raw === null) return { version: 1, career: null };
  try {
    const d = JSON.parse(raw);
    if (
      d?.version !== 1 ||
      !d.career ||
      typeof d.career.playerId !== "string" ||
      !d.career.playerId.trim()
    )
      throw Error();
    const history = d.career.clubHistory;
    if (!Array.isArray(history) || !history.length) throw Error();
    for (let i = 0; i < history.length; i++) {
      const h = history[i];
      if (
        !h ||
        typeof h.clubId !== "string" ||
        !clubById(h.clubId) ||
        !timestamp(h.joinedAt)
      )
        throw Error();
      if (
        i === history.length - 1
          ? h.leftAt !== null
          : !timestamp(h.leftAt) || h.leftAt < h.joinedAt
      )
        throw Error();
      if (i && history[i - 1].leftAt !== h.joinedAt) throw Error();
    }
    return {
      version: 1,
      career: {
        playerId: d.career.playerId,
        clubHistory: history.map((h: CareerTenure) => ({
          clubId: h.clubId,
          joinedAt: h.joinedAt,
          leftAt: h.leftAt,
        })),
      },
    };
  } catch {
    throw new Error(
      "Career data is unavailable or incompatible. Saved data is preserved. Please retry.",
    );
  }
}
export function beginCareer(
  playerId: string,
  clubId: string,
  at: string,
): CareerData {
  if (!playerId.trim() || clubById(clubId)?.environment !== "japan")
    throw new Error(
      "Choose a starting Japanese club for your initialized Player.",
    );
  return parseCareer(
    JSON.stringify({
      version: 1,
      career: {
        playerId,
        clubHistory: [{ clubId, joinedAt: at, leftAt: null }],
      },
    }),
  );
}
