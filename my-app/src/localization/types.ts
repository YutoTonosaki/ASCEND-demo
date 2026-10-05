export type Locale = "en" | "ja";
export const supportedLocales = [
  { id: "en", name: "English", tag: "en-US" },
  { id: "ja", name: "日本語", tag: "ja-JP" },
] as const;
export const isLocale = (v: unknown): v is Locale => v === "en" || v === "ja";
export type Parameters = Record<string, string | number>;
