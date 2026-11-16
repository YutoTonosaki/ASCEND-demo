import type { XPActivation } from "./types";

/** Activation only. XP awards and balances are outside Phase XP-2A. */
export interface XPData {
  version: 1;
  activation: XPActivation | null;
}

export function parseXPData(raw: string | null): XPData {
  if (raw === null) return { version: 1, activation: null };
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid XP storage. Saved data has been preserved.");
  const v = value as Record<string, unknown>;
  if (v.version !== 1 || Object.keys(v).some(k => k !== "version" && k !== "activation"))
    throw new Error("Unsupported or invalid XP storage. Saved data has been preserved.");
  const a = v.activation;
  if (!a || typeof a !== "object" || Array.isArray(a))
    throw new Error("Invalid XP activation. Saved data has been preserved.");
  const activation = a as Record<string, unknown>;
  const at = activation.activatedAt;
  const ids = activation.excludedSessionIds;
  if (
    Object.keys(activation).some(k => k !== "activatedAt" && k !== "excludedSessionIds") ||
    typeof at !== "string" || !Number.isFinite(Date.parse(at)) ||
    new Date(at).toISOString() !== at || !Array.isArray(ids) ||
    ids.some(id => typeof id !== "string" || !id || id.trim() !== id || id.length > 150) ||
    new Set(ids).size !== ids.length
  ) throw new Error("Invalid XP activation. Saved data has been preserved.");
  return { version: 1, activation: { activatedAt: at, excludedSessionIds: [...ids] } };
}
