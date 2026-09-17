import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StorageAdapter } from "./index";
export const localStorageAdapter: StorageAdapter<string> = {
  read: (key) => AsyncStorage.getItem(key),
  write: (key, value) => AsyncStorage.setItem(key, value),
  remove: (key) => AsyncStorage.removeItem(key),
};
