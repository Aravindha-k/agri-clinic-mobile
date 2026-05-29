import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useRef, useState } from "react";
import { VisitAttachment } from "../../api/visitAttachments";
import { useTheme } from "../../theme";
import { listCardType } from "../../theme/listCard";
import { formatBytes } from "../../utils/visitAttachmentFiles";
import { formatDisplayDateTime } from "../../utils/format";

type Props = {
  attachment: VisitAttachment;
  deleting?: boolean;
  onDelete?: () => void;
};

export function AttachmentCard({ attachment, deleting, onDelete }: Props) {
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
    if (!attachment.file_url) return;
    try {
      if (playing && soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setPlaying(false);
        return;
      }
      const { sound } = await Audio.Sound.createAsync({ uri: attachment.file_url });
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

  const when = attachment.uploaded_at ? formatDisplayDateTime(attachment.uploaded_at) : "—";
  const type = attachment.attachment_type;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      {type === "image" && attachment.file_url ? (
        <Image source={{ uri: attachment.file_url }} style={styles.thumb} resizeMode="cover" />
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
          {type === "text"
            ? "Text note"
            : attachment.original_filename || typeLabel(type)}
        </Text>
        {type === "text" && attachment.text_content ? (
          <Text style={[listCardType.meta, { color: c.textSecondary }]} numberOfLines={3}>
            {attachment.text_content}
          </Text>
        ) : (
          <Text style={[listCardType.caption, { color: c.muted }]} numberOfLines={1}>
            {formatBytes(attachment.file_size)}
            {attachment.file_size ? " · " : ""}
            {when}
          </Text>
        )}

        {type === "audio" && attachment.file_url ? (
          <Pressable
            onPress={() => void toggleAudio()}
            style={[styles.playBtn, { backgroundColor: c.primarySoft }]}
            accessibilityRole="button"
          >
            <Ionicons name={playing ? "pause" : "play"} size={16} color={c.primaryDark} />
            <Text style={[listCardType.caption, { color: c.primaryDark }]}>
              {playing ? "Playing…" : "Play voice note"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {onDelete ? (
        <Pressable
          onPress={onDelete}
          disabled={deleting}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Delete attachment"
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
        >
          {deleting ? (
            <Ionicons name="hourglass-outline" size={20} color={c.muted} />
          ) : (
            <Ionicons name="trash-outline" size={20} color={c.danger} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

function typeLabel(type: string) {
  if (type === "image") return "Photo";
  if (type === "pdf") return "PDF document";
  if (type === "audio") return "Voice note";
  if (type === "other") return "File";
  return "Attachment";
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    overflow: "hidden",
    padding: 12
  },
  thumb: {
    borderRadius: 10,
    height: 72,
    width: 72
  },
  iconBox: {
    alignItems: "center",
    borderRadius: 10,
    height: 72,
    justifyContent: "center",
    width: 72
  },
  body: {
    flex: 1,
    gap: 4,
    minWidth: 0,
    paddingVertical: 2
  },
  playBtn: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  deleteBtn: {
    alignSelf: "flex-start",
    padding: 4
  }
});
