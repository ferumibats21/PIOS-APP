import { Trash2 } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Btn, Card, Chip, Field, ScreenHeader, Segmented, Sheet, Txt, useToast } from "@/src/components/ui";
import { addNote, deleteNote } from "@/src/lib/actions";
import { fmtDate } from "@/src/lib/calc";
import { TxRow } from "@/src/components/TxRow";
import { TxType } from "@/src/lib/types";
import { usesNativeTabs } from "@/src/navigation";
import { useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

const FILTERS: { key: "ALL" | TxType; label: string }[] = [
  { key: "ALL", label: "Semua" },
  { key: "BUY", label: "Beli" },
  { key: "DCA", label: "DCA" },
  { key: "SELL", label: "Jual" },
  { key: "EDIT", label: "Edit" },
  { key: "INIT", label: "Init" },
];

export default function Journal() {
  const { state, update } = useStore();
  const toast = useToast();
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const [view, setView] = useState<"ledger" | "thesis">("ledger");
  const [filter, setFilter] = useState<"ALL" | TxType>("ALL");
  const [title, setTitle] = useState("");
  const [ticker, setTicker] = useState("");
  const [body, setBody] = useState("");
  const [toDelete, setToDelete] = useState<string | null>(null);

  const data = useMemo(
    () => [...state.ledger].filter((t) => filter === "ALL" || t.type === filter).sort((a, b) => b.date.localeCompare(a.date)),
    [state.ledger, filter],
  );

  const saveNote = () => {
    update((st) => addNote(st, title.trim() || "Thesis tanpa judul", body.trim(), ticker.trim() || undefined));
    setTitle("");
    setBody("");
    setTicker("");
    toast("Thesis tersimpan");
  };

  return (
    <View style={s.root} testID="journal-screen">
      <ScreenHeader title="Journal & Ledger" subtitle={`${state.ledger.length} transaksi · ${state.notes.length} thesis`} />
      <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        <Segmented
          testIDPrefix="journal-view"
          value={view}
          onChange={setView}
          options={[
            { value: "ledger", label: "Ledger" },
            { value: "thesis", label: "Investment Thesis" },
          ]}
        />
      </View>

      {view === "ledger" ? (
        <>
          <View style={{ height: 56 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, alignItems: "center" }}>
              {FILTERS.map((f) => (
                <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} testID={`ledger-filter-${f.key.toLowerCase()}`} />
              ))}
            </ScrollView>
          </View>
          <FlatList
            testID="ledger-list"
            data={data}
            keyExtractor={(t) => t.id}
            renderItem={({ item }) => <TxRow t={item} />}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomChrome + 24, gap: 8 }}
            ListEmptyComponent={
              <Card testID="ledger-empty-state">
                <Txt v="body" c="onSurfaceSecondary">
                  Belum ada catatan transaksi.
                </Txt>
              </Card>
            }
          />
        </>
      ) : (
        <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomChrome + 24 }}>
          <Card style={{ gap: 10 }}>
            <Field label="Judul" value={title} onChangeText={setTitle} placeholder="mis. Akumulasi BBCA Q3" testID="thesis-title-input" />
            <Field label="Ticker (opsional)" value={ticker} onChangeText={setTicker} autoCapitalize="characters" placeholder="BBCA / QQQ / Emas" testID="thesis-ticker-input" />
            <Field label="Thesis / Catatan" value={body} onChangeText={setBody} multiline placeholder="Alasan beli/jual, target, risiko, exit plan…" testID="thesis-body-input" />
            <Btn label="Simpan Thesis" onPress={saveNote} disabled={!body.trim()} testID="thesis-save-button" />
          </Card>
          {state.notes.length === 0 ? (
            <Txt v="caption" testID="thesis-empty-state">
              Belum ada thesis tersimpan.
            </Txt>
          ) : (
            state.notes.map((n) => (
              <Card key={n.id} testID={`thesis-card-${n.id}`}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Txt v="title" style={{ flex: 1 }}>
                    {n.title}
                  </Txt>
                  <Pressable hitSlop={10} onPress={() => setToDelete(n.id)} testID={`thesis-delete-${n.id}`}>
                    <Trash2 color={colors.muted} size={16} />
                  </Pressable>
                </View>
                <Txt v="caption">
                  {fmtDate(n.date, true)}
                  {n.ticker ? ` · ${n.ticker}` : ""}
                </Txt>
                <Txt v="body" c="onSurfaceSecondary" style={{ marginTop: 6 }}>
                  {n.body}
                </Txt>
              </Card>
            ))
          )}
        </KeyboardAwareScrollView>
      )}

      <Sheet visible={!!toDelete} onClose={() => setToDelete(null)} title="Hapus thesis ini?" testID="thesis-delete-sheet">
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn style={{ flex: 1 }} variant="secondary" label="Batal" onPress={() => setToDelete(null)} testID="thesis-delete-cancel" />
          <Btn
            style={{ flex: 1 }}
            variant="danger"
            label="Hapus"
            testID="thesis-delete-confirm"
            onPress={() => {
              const id = toDelete!;
              update((st) => deleteNote(st, id));
              setToDelete(null);
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
}));
