import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from "react-native-reanimated";

export type EvidenceViewerImage = {
  uri: string;
  id?: string;
};

type Props = {
  visible: boolean;
  images: EvidenceViewerImage[];
  initialIndex?: number;
  onClose: () => void;
};

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

type ZoomableProps = {
  uri: string;
  width: number;
  height: number;
  active: boolean;
  resetNonce: number;
  onSwipe: (direction: "prev" | "next") => void;
};

function ZoomableEvidenceImage({ uri, width, height, active, resetNonce, onSwipe }: ZoomableProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const resetTransform = useCallback(() => {
    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY]);

  useEffect(() => {
    if (active) resetTransform();
  }, [active, resetNonce, resetTransform, uri]);

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, savedScale.value * event.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= MIN_SCALE) {
        runOnJS(resetTransform)();
      }
    });

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > 1.02) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd((event) => {
      if (scale.value <= 1.05 && Math.abs(event.translationX) > 56 && Math.abs(event.velocityX) > 180) {
        runOnJS(onSwipe)(event.translationX < 0 ? "next" : "prev");
        return;
      }
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      if (scale.value > 1.05) {
        runOnJS(resetTransform)();
      } else {
        scale.value = withSpring(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
      }
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value }
    ]
  }));

  if (!active) return null;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.imageStage, { width, height }, animatedStyle]}>
        <Image source={{ uri }} style={{ width, height }} contentFit="contain" recyclingKey={uri} />
      </Animated.View>
    </GestureDetector>
  );
}

export function EvidenceImageViewer({ visible, images, initialIndex = 0, onClose }: Props) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  const [resetNonce, setResetNonce] = useState(0);

  const safeImages = useMemo(
    () => images.filter((item) => Boolean(item?.uri?.trim())),
    [images]
  );

  useEffect(() => {
    if (!visible) return;
    const clamped = Math.min(Math.max(0, initialIndex), Math.max(0, safeImages.length - 1));
    setIndex(clamped);
  }, [initialIndex, safeImages.length, visible]);

  useEffect(() => {
    if (!visible || safeImages.length === 0) return;
    const neighbors = [index - 1, index + 1].filter((i) => i >= 0 && i < safeImages.length);
    for (const i of neighbors) {
      void Image.prefetch(safeImages[i].uri);
    }
  }, [index, safeImages, visible]);

  const goPrev = useCallback(() => {
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  const goNext = useCallback(() => {
    setIndex((current) => Math.min(safeImages.length - 1, current + 1));
  }, [safeImages.length]);

  const handleSwipe = useCallback(
    (direction: "prev" | "next") => {
      if (direction === "prev") goPrev();
      else goNext();
    },
    [goNext, goPrev]
  );

  if (!visible || safeImages.length === 0) return null;

  const current = safeImages[index];
  const stageWidth = windowWidth;
  const stageHeight = windowHeight;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close image viewer"
            onPress={onClose}
            hitSlop={12}
            style={styles.iconBtn}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.counter}>
            {index + 1} / {safeImages.length}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset zoom"
            onPress={() => setResetNonce((n) => n + 1)}
            hitSlop={12}
            style={styles.iconBtn}
          >
            <Ionicons name="scan-outline" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.stage}>
          <ZoomableEvidenceImage
            key={current.uri}
            uri={current.uri}
            width={stageWidth}
            height={stageHeight}
            active
            resetNonce={resetNonce}
            onSwipe={handleSwipe}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "#000000",
    flex: 1
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 48,
    position: "absolute",
    top: 0,
    width: "100%",
    zIndex: 2
  },
  iconBtn: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44
  },
  counter: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700"
  },
  stage: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  imageStage: {
    alignItems: "center",
    justifyContent: "center"
  }
});
