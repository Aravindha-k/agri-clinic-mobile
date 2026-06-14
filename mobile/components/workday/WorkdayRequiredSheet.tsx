import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsetsCompat } from "../../../src/hooks/useSafeAreaInsetsCompat";
import { useI18n } from "../../../src/i18n/I18nContext";
import { GhostButton, PrimaryButton } from "../ui";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

export type WorkdayRequiredSheetRef = {
  open: () => void;
  close: () => void;
};

type Props = {
  busy?: boolean;
  onStart: () => void | Promise<void>;
};

export const WorkdayRequiredSheet = forwardRef<WorkdayRequiredSheetRef, Props>(function WorkdayRequiredSheet(
  { busy, onStart },
  ref
) {
  const modalRef = useRef<BottomSheetModal>(null);
  const { bottom } = useSafeAreaInsetsCompat();
  const { t } = useI18n();
  const snapPoints = useMemo(() => ["42%"], []);

  useImperativeHandle(ref, () => ({
    open: () => modalRef.current?.present(),
    close: () => modalRef.current?.dismiss()
  }));

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.45} />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheet}
    >
      <BottomSheetView style={[styles.content, { paddingBottom: Math.max(bottom, Spacing.lg) }]}>
        <Text style={styles.title}>{t("visitFlow.workdayFirstTitle")}</Text>
        <Text style={styles.body}>{t("visitFlow.workdayFirstBody")}</Text>
        <View style={styles.actions}>
          <PrimaryButton
            label={t("visitFlow.startWorkdayNow")}
            onPress={() => void onStart()}
            loading={busy}
          />
          <GhostButton label={t("common.cancel")} onPress={() => modalRef.current?.dismiss()} />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl
  },
  handle: {
    backgroundColor: Colors.border2,
    width: 40
  },
  content: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.sm
  },
  title: {
    color: Colors.text1,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold
  },
  body: {
    color: Colors.text2,
    fontSize: FontSize.base,
    lineHeight: 22
  },
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.sm
  }
});
