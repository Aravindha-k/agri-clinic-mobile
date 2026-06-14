import { useEffect, useRef } from "react";

import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from "react-native";

import { BRAND } from "../../config/brand";

import { fontWeights } from "../../theme/fontWeights";

import { BrandLogo } from "./BrandLogo";



export function BrandedLoader() {

  const pulse = useRef(new Animated.Value(1)).current;

  const ring = useRef(new Animated.Value(0)).current;



  useEffect(() => {

    const loop = Animated.loop(

      Animated.parallel([

        Animated.sequence([

          Animated.timing(pulse, {

            toValue: 1.05,

            duration: 700,

            easing: Easing.inOut(Easing.ease),

            useNativeDriver: true

          }),

          Animated.timing(pulse, {

            toValue: 1,

            duration: 700,

            easing: Easing.inOut(Easing.ease),

            useNativeDriver: true

          })

        ]),

        Animated.timing(ring, {

          toValue: 1,

          duration: 2000,

          easing: Easing.linear,

          useNativeDriver: true

        })

      ])

    );

    loop.start();

    return () => loop.stop();

  }, [pulse, ring]);



  const rotate = ring.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });



  return (

    <View style={styles.wrap}>

      <Animated.View style={[styles.ring, { transform: [{ rotate }, { scale: pulse }] }]} />

      <Animated.View style={{ transform: [{ scale: pulse }] }}>

        <BrandLogo variant="onPrimary" />

      </Animated.View>

      <Text style={styles.appName}>{BRAND.appName}</Text>
      <Text style={styles.sub}>{BRAND.loaderSubtitle}</Text>

      <ActivityIndicator color="#FFFFFF" size="small" style={styles.spinner} />

    </View>

  );

}



const styles = StyleSheet.create({

  wrap: { alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },

  ring: {

    borderColor: "rgba(255,255,255,0.4)",

    borderRadius: 999,

    borderWidth: 2,

    height: 88,

    position: "absolute",

    width: 88

  },

  appName: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: fontWeights.heavy,
    letterSpacing: -0.4,
    marginTop: 20,
    textAlign: "center"
  },
  sub: {

    color: "rgba(255,255,255,0.72)",

    fontSize: 13,

    fontWeight: fontWeights.regular,

    lineHeight: 20,

    marginTop: 10,

    textAlign: "center"

  },

  spinner: { marginTop: 20 }

});


