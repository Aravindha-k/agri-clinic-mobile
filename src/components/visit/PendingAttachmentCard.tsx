import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useRef, useState } from "react";
import { PendingVisitAttachment } from "../../visit/pendingAttachments";
import { useTheme } from "../../theme";
import { listCardType } from "../../theme/listCard";
import { formatDisplayDateTime } from "../../utils/format";

type Props = {
  item: PendingVisitAttachment;
  onDelete: () => void;
};

export function PendingAttachmentCard({ item, onDelete }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [playing, setPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync();
    };
  }, []);

  async function toggleAudio() {
    if (!item.uri) return;
    try {
      if (playing && soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setPlaying(false);
        return;
      }
      const { sound } = await Audio.Sound.createAsync({ uri: item.uri });
      soundRef.current = sound;
      setPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlaying(false);
          void sound.unloadAsync();
          soundRef.current = null;
        }
      });
      await sound.playAsync();
    } catch {
      setPlaying(false);
    }
  }

  const when = formatDisplayDateTime(item.createdAt);
  const type = item.attachmentType;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[styles.badge, { backgroundColor: c.warningSoft }]}>
        <Text style={[styles.badgeText, { color: c.warning }]}>Pending</Text>
      </View>

      {type === "image" && item.originalUri ? (
        <View style={[styles.proofBadge, { backgroundColor: c.primary }]}>
          <Text style={styles.proofBadgeText}>Proof</Text>
        </View>
      ) : null}

      {type === "image" && item.uri ? (
        <Image source={{ uri: item.uri }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.iconBox, { backgroundColor: c.primarySoft }]}>
          <Ionicons
            name={
              type === "pdf"
                ? "document-text"
                : type === "audio"
                  ? "mic"
                  : type === "text"
                    ? "create-outline"
                    : "document-outline"
            }
            size={26}
            color={c.primaryDark}
          />
        </View>
      )}

      <View style={styles.body}>
        <Text style={[listCardType.title, { color: c.text }]} numberOfLines={1}>
          {type === "text" ? "Text note" : item.name || "Attachment"}
        </Text>
        {type === "text" && item.textContent ? (
          <Text style={[listCardType.meta, { color: c.textSecondary }]} numberOfLines={3}>
            {item.textContent}
          </Text>
        ) : (
          <Text style={[listCardType.caption, { color: c.muted }]}>{when}</Text>
        )}
        {type === "audio" && item.uri ? (
          <Pressable onPress={() => void toggleAudio()} style={[styles.playBtn, { backgroundColor: c.primarySoft }]}>
            <Ionicons name={playing ? "pause" : "play"} size={16} color={c.primaryDark} />
            <Text style={[listCardType.caption, { color: c.primaryDark }]}>
              {playing ? "Playing…" : "Play voice note"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable onPress={onDelete} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove attachment">
        <Ionicons name="close-circle" size={22} color={c.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    overflow: "hidden",
    padding: 12
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    left: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: "absolute",
    top: 10,
    zIndex: 2
  },
  badgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },
  proofBadge: {
    borderRadius: 6,
    left: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: "absolute",
    top: 28,
    zIndex: 2
  },
  proofBadgeText: { color: "#FFFFFF", fontSize: 8, fontWeight: "800" },
  thumb: { borderRadius: 10, height: 64, width: 64 },
  iconBox: {
    alignItems: "center",
    borderRadius: 10,
    height: 64,
    justifyContent: "center",
    width: 64
  },
  body: { flex: 1, gap: 4, minWidth: 0, paddingTop: 18 },
  playBtn: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6
  }
});
