import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { BRAND, LOGO_IMAGE, BRAND_COLORS } from "../../config/brand";
import { FlatProgressBar } from "../../../mobile/components/ui/FlatProgressBar";
import { Colors } from "../../../mobile/lib/theme";
import { SplashExtraEffects } from "./SplashExtraEffects";

export const SPLASH_INTRO_MS = BRAND.splashDurationMs ?? 7500;

const BG = Colors.brand700;
const ACCENT = BRAND_COLORS.primary;
const ACCENT_SOFT = BRAND_COLORS.primarySoft;
const LOGO_CIRCLE = 148;
const LOGO_IMAGE_SIZE = 128;

const STATUS_MESSAGES = [
  "Syncing your data…",
  "Loading farm records…",
  "Preparing field map…",
  "Almost ready…"
] as const;

type Props = {
  onFinish: () => void;
  onReady?: () => void;
};

type LeafSpec = {
  top: `${number}%`;
  left: `${number}%`;
  size: number;
  rotate: string;
  floatDelay: number;
  floatDuration: number;
};

const LEAVES: LeafSpec[] = [
  { top: "6%", left: "8%", size: 48, rotate: "-28deg", floatDelay: 0, floatDuration: 3200 },
  { top: "14%", left: "72%", size: 64, rotate: "18deg", floatDelay: 400, floatDuration: 4100 },
  { top: "28%", left: "82%", size: 40, rotate: "42deg", floatDelay: 800, floatDuration: 3600 },
  { top: "38%", left: "4%", size: 72, rotate: "-12deg", floatDelay: 200, floatDuration: 4800 },
  { top: "52%", left: "88%", size: 56, rotate: "24deg", floatDelay: 600, floatDuration: 3900 },
  { top: "18%", left: "38%", size: 100, rotate: "-36deg", floatDelay: 1000, floatDuration: 4500 }
];

function LeafShape({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2C7.5 8.5 4.5 12 12 22C19.5 12 16.5 8.5 12 2Z"
        fill={ACCENT}
        opacity={0.05}
      />
    </Svg>
  );
}

function FloatingLeaf({ spec }: { spec: LeafSpec }) {
  const floatY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -8,
          duration: spec.floatDuration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: spec.floatDuration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );

    const timer = setTimeout(() => loop.start(), spec.floatDelay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [floatY, spec.floatDelay, spec.floatDuration]);

  const leafStyle = {
    position: "absolute" as const,
    top: spec.top,
    left: spec.left
  };

  return (
    <Animated.View
      style={[
        leafStyle,
        { transform: [{ rotate: spec.rotate }, { translateY: floatY }] }
      ]}
    >
      <LeafShape size={spec.size} />
    </Animated.View>
  );
}

function PulseRing({ size, delayMs }: { size: number; delayMs: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    const timer = setTimeout(() => {
      loop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1.06,
              duration: 2200,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true
            }),
            Animated.timing(scale, {
              toValue: 1,
              duration: 2200,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true
            })
          ]),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.08,
              duration: 2200,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true
            }),
            Animated.timing(opacity, {
              toValue: 0.35,
              duration: 2200,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true
            })
          ])
        ])
      );
      loop.start();
    }, delayMs);

    return () => {
      clearTimeout(timer);
      loop?.stop();
    };
  }, [delayMs, opacity, scale]);

  return (
    <Animated.View
      style={{
        borderColor: "rgba(76,175,130,0.15)",
        borderRadius: size / 2,
        borderWidth: 1,
        height: size,
        opacity,
        position: "absolute",
        transform: [{ scale }],
        width: size
      }}
    />
  );
}

function PulsingDot({ delayMs }: { delayMs: number }) {
  const opacity = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    const timer = setTimeout(() => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 520,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(opacity, {
            toValue: 0.25,
            duration: 520,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          })
        ])
      );
      loop.start();
    }, 1500 + delayMs);

    return () => {
      clearTimeout(timer);
      loop?.stop();
    };
  }, [delayMs, opacity]);

  return (
    <Animated.View
      style={{
        backgroundColor: ACCENT,
        borderRadius: 99,
        height: 4,
        opacity,
        width: 4
      }}
    />
  );
}

export function AnimatedSplashScreen({ onFinish, onReady }: Props) {
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const circleOpacity = useRef(new Animated.Value(0)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandY = useRef(new Animated.Value(12)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeY = useRef(new Animated.Value(12)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const statusOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const morphScaleX = useRef(new Animated.Value(1)).current;
  const morphScaleY = useRef(new Animated.Value(1)).current;

  const [statusIndex, setStatusIndex] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(circleOpacity, {
        toValue: 1,
        duration: 300,
        delay: 80,
        useNativeDriver: true
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 55,
        friction: 6,
        delay: 180,
        useNativeDriver: true
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        delay: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();

    Animated.parallel([
      Animated.timing(brandOpacity, {
        toValue: 1,
        duration: 450,
        delay: 1100,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true
      }),
      Animated.timing(brandY, {
        toValue: 0,
        duration: 450,
        delay: 1100,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true
      })
    ]).start();

    Animated.parallel([
      Animated.timing(badgeOpacity, {
        toValue: 1,
        duration: 450,
        delay: 1300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true
      }),
      Animated.timing(badgeY, {
        toValue: 0,
        duration: 450,
        delay: 1300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true
      })
    ]).start();

    Animated.timing(loadingOpacity, {
      toValue: 1,
      duration: 400,
      delay: 1400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true
    }).start();

    Animated.timing(progressWidth, {
      toValue: 120,
      duration: 2800,
      delay: 1200,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false
        })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(morphScaleX, { toValue: 1.3, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(morphScaleY, { toValue: 0.8, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(morphScaleX, { toValue: 0.8, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(morphScaleY, { toValue: 1.3, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(morphScaleX, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(morphScaleY, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])
      ])
    ).start();

    const progressListener = progressWidth.addListener(({ value }) => {
      setLoadProgress(value / 120);
    });

    const statusFadeIn = setTimeout(() => {
      Animated.timing(statusOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }).start();
    }, 1500);

    let statusCycle: ReturnType<typeof setInterval> | null = null;
    const statusCycleStart = setTimeout(() => {
      statusCycle = setInterval(() => {
        Animated.timing(statusOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        }).start(({ finished }) => {
          if (!finished) return;
          setStatusIndex((i) => (i + 1) % STATUS_MESSAGES.length);
          Animated.timing(statusOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true
          }).start();
        });
      }, 850);
    }, 1500);

    const finishTimer = setTimeout(onFinish, SPLASH_INTRO_MS);

    return () => {
      progressWidth.removeListener(progressListener);
      clearTimeout(statusFadeIn);
      clearTimeout(statusCycleStart);
      if (statusCycle) clearInterval(statusCycle);
      clearTimeout(finishTimer);
    };
  }, [
    badgeOpacity,
    badgeY,
    brandOpacity,
    brandY,
    circleOpacity,
    loadingOpacity,
    logoOpacity,
    logoScale,
    onFinish,
    progressWidth,
    glowAnim,
    morphScaleX,
    morphScaleY,
    statusOpacity
  ]);

  const glowShadow = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 28] });

  return (
    <View style={{ flex: 1, backgroundColor: BG }} onLayout={() => onReady?.()}>
      <StatusBar hidden />

      <View style={{ ...StyleSheetAbsolute, backgroundColor: BG }} pointerEvents="none">
        <SplashExtraEffects />
        {LEAVES.map((leaf, index) => (
          <FloatingLeaf key={index} spec={leaf} />
        ))}
      </View>

      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        {/* Zone 1 — top spacer + decorative leaves (leaves are absolute above) */}
        <View style={{ flex: 1 }} />

        {/* Zone 2 — center logo block */}
        <View style={{ alignItems: "center", flex: 2, justifyContent: "center", paddingHorizontal: 32 }}>
          <View style={{ alignItems: "center", height: 220, justifyContent: "center", width: 220 }}>
            <Animated.View
              style={{
                backgroundColor: "rgba(76,175,130,0.05)",
                borderRadius: 65,
                height: 130,
                position: "absolute",
                width: 130,
                transform: [{ scaleX: morphScaleX }, { scaleY: morphScaleY }]
              }}
            />
            <Animated.View
              style={{
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#4ade80",
                shadowOpacity: 0.4,
                shadowRadius: glowShadow
              }}
            >
              <Animated.View
                style={{
                  alignItems: "center",
                  backgroundColor: "rgba(255,255,255,0.95)",
                  borderColor: "rgba(76,175,130,0.55)",
                  borderRadius: LOGO_CIRCLE / 2,
                  borderWidth: 3,
                  height: LOGO_CIRCLE,
                  justifyContent: "center",
                  opacity: circleOpacity,
                  overflow: "hidden",
                  width: LOGO_CIRCLE
                }}
              >
                {LOGO_IMAGE ? (
                  <Animated.View
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: logoOpacity,
                      transform: [{ scale: logoScale }]
                    }}
                  >
                    <Image
                      source={LOGO_IMAGE}
                      style={{ height: LOGO_IMAGE_SIZE, width: LOGO_IMAGE_SIZE }}
                      resizeMode="contain"
                      accessibilityLabel="Kavya Agri Clinic logo"
                    />
                  </Animated.View>
                ) : null}
              </Animated.View>
            </Animated.View>
          </View>

          <Animated.View
            style={{
              alignItems: "center",
              marginTop: 28,
              opacity: brandOpacity,
              transform: [{ translateY: brandY }]
            }}
          >
            <View
              style={{
                backgroundColor: ACCENT,
                height: 22,
                marginBottom: 10,
                opacity: 0.7,
                width: 1
              }}
            />
            <Text
              style={{
                color: "rgba(255,255,255,0.92)",
                fontSize: 15,
                fontWeight: "600",
                letterSpacing: 3,
                textAlign: "center"
              }}
            >
              KAVYA AGRI CLINIC
            </Text>
          </Animated.View>

          <Animated.View
            style={{
              marginTop: 12,
              opacity: badgeOpacity,
              transform: [{ translateY: badgeY }]
            }}
          >
            <View
              style={{
                backgroundColor: "rgba(76,175,130,0.18)",
                borderColor: "rgba(76,175,130,0.45)",
                borderRadius: 99,
                borderWidth: 1,
                paddingHorizontal: 14,
                paddingVertical: 4
              }}
            >
              <Text
                style={{
                  color: ACCENT_SOFT,
                  fontSize: 11,
                  fontWeight: "500",
                  letterSpacing: 1,
                  textAlign: "center"
                }}
              >
                {BRAND.splashSubtitle}
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Zone 3 — bottom loading block */}
        <Animated.View
          style={{
            alignItems: "center",
            flex: 1,
            justifyContent: "flex-end",
            opacity: loadingOpacity,
            paddingBottom: 8
          }}
        >
          <View style={{ width: 120, marginTop: 0 }}>
            <FlatProgressBar progress={loadProgress} height={2} trackColor="rgba(255,255,255,0.1)" color={ACCENT} />
          </View>

          <View style={{ alignItems: "center", flexDirection: "row", gap: 6, marginTop: 14 }}>
            <PulsingDot delayMs={0} />
            <PulsingDot delayMs={200} />
            <PulsingDot delayMs={400} />
          </View>

          <Animated.Text
            style={{
              color: "rgba(255,255,255,0.38)",
              fontSize: 12,
              letterSpacing: 0.8,
              marginTop: 14,
              minHeight: 18,
              opacity: statusOpacity,
              textAlign: "center"
            }}
          >
            {STATUS_MESSAGES[statusIndex]}
          </Animated.Text>

          <Text
            style={{
              color: "rgba(255,255,255,0.18)",
              fontSize: 11,
              marginBottom: 28,
              marginTop: 18,
              textAlign: "center"
            }}
          >
            v{version} · {BRAND.appName}
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const StyleSheetAbsolute = {
  bottom: 0,
  left: 0,
  position: "absolute" as const,
  right: 0,
  top: 0
};
