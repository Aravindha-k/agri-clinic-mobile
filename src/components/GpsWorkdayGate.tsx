import { Ionicons } from "@expo/vector-icons";

import { ReactNode } from "react";

import { Modal, StyleSheet, Text, View } from "react-native";

import { useSafeAreaInsetsCompat } from "../hooks/useSafeAreaInsetsCompat";

import { AppButton } from "./AppButton";

import { useTracking } from "../storage/TrackingContext";

import { colors } from "../theme/colors";

import { space } from "../theme/layout";



/** Blocks the in-app experience when the workday is on but GPS is denied (silent tracking cannot run). */

export function GpsWorkdayGate({ children }: { children: ReactNode }) {

  const insets = useSafeAreaInsetsCompat();

  const { fieldLocationBlocked, retryForegroundSync, busy } = useTracking();



  function handleRetry() {

    void retryForegroundSync().catch(() => undefined);

  }



  return (

    <View style={styles.flex}>

      {children}

      <Modal visible={fieldLocationBlocked} animationType="fade" transparent>

        <View style={[styles.backdrop, { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg }]}>

          <View style={styles.panel}>

            <View style={styles.iconCircle}>

              <Ionicons name="warning" size={36} color={colors.danger} />

            </View>

            <Text style={styles.title}>Location access required for field work</Text>

            <Text style={styles.body}>

              Your workday is on, but this device is not sharing location. Turn on GPS and allow the app to use your location, then try again.

            </Text>

            <AppButton title="I have enabled location — retry" onPress={handleRetry} loading={busy} />

          </View>

        </View>

      </Modal>

    </View>

  );

}



const styles = StyleSheet.create({

  flex: {

    flex: 1

  },

  backdrop: {

    flex: 1,

    backgroundColor: "rgba(15, 81, 50, 0.92)",

    justifyContent: "center",

    paddingHorizontal: space.lg

  },

  panel: {

    backgroundColor: colors.card,

    borderRadius: 16,

    gap: space.md,

    padding: space.xl

  },

  iconCircle: {

    alignItems: "center",

    alignSelf: "center",

    backgroundColor: colors.dangerSoft,

    borderRadius: 999,

    height: 72,

    justifyContent: "center",

    width: 72

  },

  title: {

    color: colors.text,

    fontSize: 20,

    fontWeight: "900",

    textAlign: "center"

  },

  body: {

    color: colors.muted,

    fontSize: 15,

    lineHeight: 22,

    textAlign: "center"

  }

});


