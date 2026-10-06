import type { StorageAdapter } from "./index";
import { isLocale, type Locale } from "../localization/types";
export const SETTINGS_KEY = "ascend.settings.v1";
export interface SettingsData {
  version: 1;
  settings: { locale: Locale };
}
export function parseSettings(raw: string | null): SettingsData {
  if (raw === null) return { version: 1, settings: { locale: "en" } };
  try {
    const d = JSON.parse(raw);
    if (d?.version !== 1 || !isLocale(d.settings?.locale)) throw Error();
    return { version: 1, settings: { locale: d.settings.locale } };
  } catch {
    throw Error("Settings unavailable or incompatible");
  }
}
export class SettingsRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private adapter: StorageAdapter<string>) {}
  private enqueue<T>(f: () => Promise<T>) {
    const result = this.queue.then(f);
    this.queue = result.catch(() => {});
    return result;
  }
  load() {
    return this.enqueue(async () =>
      parseSettings(await this.adapter.read(SETTINGS_KEY)),
    );
  }
  select(locale: Locale) {
    return this.enqueue(async () => {
      if (!isLocale(locale)) throw Error("Unsupported locale");
      const raw = await this.adapter.read(SETTINGS_KEY);
      const previous = parseSettings(raw); // Never overwrite corrupt/newer storage.
      const next: SettingsData = { version: 1, settings: { locale } };
      if (raw === null || previous.settings.locale !== locale)
        await this.adapter.write(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }
}
