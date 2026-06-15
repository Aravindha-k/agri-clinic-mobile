import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View, type ViewStyle } from "react-native";
import { usePremiumMotion } from "../../hooks/usePremiumMotion";

export type AuroraBlob = {
  color: string;
  size: number;
  top?: number | string;
  bottom?: number | string;
  left?: number | string;
  right?: number | string;
  opacity: number;
  duration: number;
  delay: number;
};

export const DEFAULT_BLOBS: AuroraBlob[] = [
  { color: "#16a34a", size: 200, top: -60, left: -40, opacity: 0.18, duration: 8000, delay: 0 },
  { color: "#065f46", size: 160, bottom: -40, right: -30, opacity: 0.14, duration: 10000, delay: 2000 },
  { color: "#4ade80", size: 120, top: "45%", left: "35%", opacity: 0.07, duration: 6000, delay: 1000 }
];

type Props = {
  blobs?: AuroraBlob[];
  style?: ViewStyle;
};

function useBlobAnims(count: number) {
  return useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        scale: new Animated.Value(1)
      })),
    [count]
  );
}

export default function AuroraBackground({ blobs = DEFAULT_BLOBS, style }: Props) {
  const { enabled } = usePremiumMotion();
  const anims = useBlobAnims(blobs.length);
  const loopsRef = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    loopsRef.current.forEach((l) => l.stop());
    loopsRef.current = [];

    if (!enabled) return;

    blobs.forEach((blob, i) => {
      const { x, y, scale } = anims[i];
      const loop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(x, {
              toValue: 30,
              duration: blob.duration / 2,
              easing: Easing.inOut(Easing.ease),
              delay: blob.delay,
              useNativeDriver: true
            }),
            Animated.timing(x, {
              toValue: -20,
              duration: blob.duration / 2,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true
            })
          ]),
          Animated.sequence([
            Animated.timing(y, {
              toValue: -20,
              duration: blob.duration / 3,
              easing: Easing.inOut(Easing.ease),
              delay: blob.delay,
              useNativeDriver: true
            }),
            Animated.timing(y, {
              toValue: 15,
              duration: blob.duration / 3,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true
            }),
            Animated.timing(y, {
              toValue: 0,
              duration: blob.duration / 3,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true
            })
          ]),
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1.2,
              duration: blob.duration / 2,
              easing: Easing.inOut(Easing.ease),
              delay: blob.delay,
              useNativeDriver: true
            }),
            Animated.timing(scale, {
              toValue: 0.9,
              duration: blob.duration / 2,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true
            })
          ])
        ])
      );
      loop.start();
      loopsRef.current.push(loop);
    });

    return () => {
      loopsRef.current.forEach((l) => l.stop());
      anims.forEach((a) => {
        a.x.stopAnimation();
        a.y.stopAnimation();
        a.scale.stopAnimation();
      });
    };
  }, [anims, blobs, enabled]);

  return (
    <View style={[StyleSheet.absoluteFill, styles.root, style]} pointerEvents="none">
      {blobs.map((blob, i) => {
        const pos: ViewStyle = {
          width: blob.size,
          height: blob.size,
          borderRadius: blob.size / 2,
          backgroundColor: blob.color,
          opacity: enabled ? blob.opacity : blob.opacity * 0.6,
          ...(blob.top !== undefined ? { top: blob.top as ViewStyle["top"] } : {}),
          ...(blob.bottom !== undefined ? { bottom: blob.bottom as ViewStyle["bottom"] } : {}),
          ...(blob.left !== undefined ? { left: blob.left as ViewStyle["left"] } : {}),
          ...(blob.right !== undefined ? { right: blob.right as ViewStyle["right"] } : {})
        };

        return (
          <Animated.View
            key={`${blob.color}-${i}`}
            style={[
              styles.blob,
              pos,
              {
                transform: [
                  { translateX: anims[i].x },
                  { translateY: anims[i].y },
                  { scale: anims[i].scale }
                ]
              }
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: "hidden"
  },
  blob: {
    position: "absolute"
  }
});
