import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { dayKey } from "./calc";
import { AppState } from "./types";

export async function exportBackup(state: AppState): Promise<string> {
  const name = `PIOS_Backup_${dayKey(new Date())}.json`;
  const json = JSON.stringify({ app: "PIOS", exportedAt: new Date().toISOString(), state }, null, 2);
  if (Platform.OS === "web") {
    const g = globalThis as any;
    const blob = new g.Blob([json], { type: "application/json" });
    const url = g.URL.createObjectURL(blob);
    const a = g.document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    g.URL.revokeObjectURL(url);
    return name;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: name, UTI: "public.json" });
  }
  return name;
}

export async function importBackup(): Promise<AppState | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain", "*/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0] as any;
  let text: string;
  if (Platform.OS === "web") {
    text = asset.file ? await asset.file.text() : await (await fetch(asset.uri)).text();
  } else {
    text = await new File(asset.uri).text();
  }
  const parsed = JSON.parse(text);
  const st = parsed?.state ?? parsed;
  if (!st || !Array.isArray(st.assets) || !st.settings) throw new Error("Format backup tidak valid");
  return st as AppState;
}
