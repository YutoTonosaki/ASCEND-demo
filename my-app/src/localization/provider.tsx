import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { SettingsRepository } from "../storage/settings-repository";
import { localStorageAdapter } from "../storage/local";
import { translate, formatDate, formatMonth, localeTag, type TranslationKey } from "./core";
import { type Locale, type Parameters } from "./types";
import { displayValue, displayError, exerciseName } from "./presentation";
const Context = createContext<ReturnType<typeof useValue> | null>(null);
function useValue() {
  const [repository] = useState(() => new SettingsRepository(localStorageAdapter));
  const [locale, updateLocale] = useState<Locale>("en");
  const [error, setError] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  useEffect(() => { let alive = true;
    repository.load().then(d => { if (alive) updateLocale(d.settings.locale); }).catch(() => { if (alive) setError(true); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [repository]);
  const tools = useMemo(() => ({
    tr: (key: TranslationKey, values?: Parameters) => translate(locale, key, values),
    date: (value: string, time = false) => formatDate(locale, value, time),
    month: (value: string) => formatMonth(locale, value),
    number: (value: number) => value.toLocaleString(localeTag(locale)),
    display: (value: string) => displayValue(locale, value),
    errorText: (value: string) => displayError(locale, value),
    exercise: (value: {id: string; name: string; isCustom?: boolean}) => exerciseName(locale, value),
  }), [locale]);
  async function setLocale(next: Locale) {
    if (loading || busy || error) return;
    setBusy(true);
    try { const d = await repository.select(next); updateLocale(d.settings.locale); setError(false); }
    catch { setError(true); } finally { setBusy(false); }
  }
  async function retry() {
    if (busy) return;
    setBusy(true);
    try { const d = await repository.load(); updateLocale(d.settings.locale); setError(false); }
    catch { setError(true); } finally { setBusy(false); }
  }
  return {locale, ...tools, setLocale, retry, error, loading, busy};
}
export function LocalizationProvider({ children }: PropsWithChildren) {
  const value = useValue();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLocalization() {
  const value = useContext(Context);
  if (!value) throw Error("LocalizationProvider required");
  return value;
}
