import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Employee, getCurrentEmployee, mergeEmployeePhoto } from "../../../src/api/employees";
import { uploadEmployeePhoto } from "../../../src/api/profilePhotos";
import { BrandLogo } from "../../../src/components/brand/BrandLogo";
import { useI18n } from "../../../src/i18n/I18nContext";
import { formatRelativeTimeLocalized } from "../../../src/i18n";
import { useRefreshControlProps } from "../../../src/hooks/useRefreshControlProps";
import { useSafeAreaInsetsCompat } from "../../../src/hooks/useSafeAreaInsetsCompat";
import { useSecureScreen } from "../../../src/hooks/useSecureScreen";
import { useTabBarBottomInset } from "../../../src/hooks/useTabBarBottomInset";
import { useAuth } from "../../../src/storage/AuthContext";
import { useEmployee } from "../../../src/storage/EmployeeContext";
import { useFieldDataRefresh } from "../../../src/storage/FieldDataRefreshContext";
import { useOfflineSync } from "../../../src/storage/OfflineSyncContext";
import { isSameVisitLocalDay, visitDisplayIso } from "../../../src/utils/format";
import { formatDisplayRole } from "../../../src/utils/formatRole";
import {
  handleProfilePickerError,
  pickProfileImage,
  showProfilePhotoSourcePicker
} from "../../../src/utils/profileImagePick";
import { cacheBustPhotoUrl, extractPhotoUrl, photoCacheVersion } from "../../../src/utils/profilePhotoUrl";
import { getHomeVisits } from "../../../src/utils/visitsCache";
import { EmptyState } from "../../components/ui";
import { FadeInSection, entranceListStagger, entranceStagger } from "../../components/ui/FadeInSection";
import { ScreenLoader } from "../../components/layout/ScreenLoader";
import { useScreenEntrance } from "../../hooks/useScreenEntrance";
import { getBadgeCount } from "../../lib/notificationsApi";
import { clearAppStorage } from "../../lib/mmkv";
import { useSyncStore } from "../../lib/store/syncStore";
import { DS } from "../../../src/theme/globalStyles";
import { ScreenCanvas, ScreenEntranceWash } from "../../components/layout";
import { Colors } from "../../lib/theme";
import { SECTION_LABEL } from "../../lib/sectionLabel";
import { BRAND_COLORS } from "../../../src/config/brand";

const PROFILE_DS = { ...DS, dangerBorder: "#fee2e2", hero: BRAND_COLORS.primary } as const;

type MenuRow = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  badge?: number;
  onPress?: () => void;
};

function SectionLabel({ title }: { title: string }) {
  return <Text style={[styles.sectionLabel, SECTION_LABEL]}>{title.toUpperCase()}</Text>;
}

/** Part 1 — PLACEMENT 2: compact logo + version on hero */
function HeroBrandMark({ version }: { version: string }) {
  return (
    <View style={styles.heroBrand}>
      <View style={styles.heroLogoWrap}>
        <BrandLogo variant="onPrimary" width={44} height={44} />
      </View>
      <Text style={styles.heroVersion}>v{version}</Text>
    </View>
  );
}

function HeroAvatar({
  photoUrl,
  photoVersion,
  uploading,
  onPress
}: {
  photoUrl: string | null;
  photoVersion: string | number;
  uploading: boolean;
  onPress: () => void;
}) {
  const uri = photoUrl ? cacheBustPhotoUrl(photoUrl, photoVersion) : null;

  return (
    <Pressable onPress={onPress} disabled={uploading} style={styles.heroAvatarWrap}>
      {uri ? (
        <Image source={{ uri }} style={styles.heroAvatarImage} resizeMode="cover" />
      ) : (
        <Ionicons name="person" size={24} color="#fff" />
      )}
      {uploading ? (
        <View style={styles.heroAvatarOverlay}>
          <ActivityIndicator color="#fff" size="small" />
        </View>
      ) : null}
    </Pressable>
  );
}

function MenuItemCard({ row }: { row: MenuRow }) {
  return (
    <Pressable
      onPress={row.onPress}
      style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.menuIconBox}>
        <Ionicons name={row.icon} size={16} color={Colors.text3} />
      </View>
      <Text style={styles.menuLabel}>{row.title}</Text>
      {row.badge != null && row.badge > 0 ? (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{row.badge > 99 ? "99+" : row.badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={14} color={Colors.text4} />
    </Pressable>
  );
}

function LanguageMenuItem({
  language,
  onSelect
}: {
  language: "en" | "ta";
  onSelect: (lang: "en" | "ta") => void;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.menuItem}>
      <View style={styles.menuIconBox}>
        <Ionicons name="language-outline" size={16} color={Colors.text3} />
      </View>
      <Text style={styles.menuLabel}>{t("profile.language")}</Text>
      <View style={styles.langToggle}>
        <Pressable
          onPress={() => onSelect("en")}
          style={[styles.langPill, language === "en" ? styles.langPillActive : styles.langPillInactive]}
        >
          <Text style={[styles.langPillText, language === "en" && styles.langPillTextActive]}>EN</Text>
        </Pressable>
        <Pressable
          onPress={() => onSelect("ta")}
          style={[styles.langPill, language === "ta" ? styles.langPillActive : styles.langPillInactive]}
        >
          <Text style={[styles.langPillText, language === "ta" && styles.langPillTextActive]}>தமிழ்</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ProfileTabScreen() {
  useSecureScreen();
  const navigation = useNavigation<any>();
  const rootNav = navigation.getParent()?.getParent();
  const { top: safeTop } = useSafeAreaInsetsCompat();
  const tabInset = useTabBarBottomInset();
  const refreshControlProps = useRefreshControlProps();
  const { signOut } = useAuth();
  const { employee, refreshEmployee } = useEmployee();
  const { bumpAfterEmployeePhotoChange } = useFieldDataRefresh();
  const { pendingCount, lastSyncAt, refreshQueue, syncAll } = useOfflineSync();
  const pendingGpsCount = useSyncStore((state) => state.pendingGPSCount);
  const { t, language, setLanguage } = useI18n();

  const [profile, setProfile] = useState<Employee | null>(employee);
  const [loading, setLoading] = useState(!employee);
  const entranceTick = useScreenEntrance();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoVersion, setPhotoVersion] = useState<string | number>(Date.now());
  const [visitsToday, setVisitsToday] = useState(0);
  const [visitsMonth, setVisitsMonth] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [syncingAll, setSyncingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const [me, visits, unread] = await Promise.all([
        getCurrentEmployee(),
        getHomeVisits({ pageSize: 100, force: true }),
        getBadgeCount(true)
      ]);

      setProfile(me);
      setUnreadNotifications(unread);
      setPhotoVersion(photoCacheVersion(me) ?? Date.now());

      const today = new Date();
      const month = today.getMonth();
      const year = today.getFullYear();
      let todayCount = 0;
      let monthCount = 0;
      for (const visit of visits.visits) {
        if (isSameVisitLocalDay(visit, today)) todayCount += 1;
        const iso = visitDisplayIso(visit);
        if (iso) {
          const d = new Date(iso);
          if (!Number.isNaN(d.getTime()) && d.getMonth() === month && d.getFullYear() === year) {
            monthCount += 1;
          }
        }
      }
      setVisitsToday(todayCount);
      setVisitsMonth(monthCount);
      await refreshEmployee().catch(() => undefined);
      await refreshQueue().catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profile.loadErrorGeneric"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshEmployee, refreshQueue, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function changePhoto(source: "camera" | "library") {
    try {
      const picked = await pickProfileImage(source);
      if (!picked) return;
      setUploadingPhoto(true);
      const result = await uploadEmployeePhoto(picked, () => undefined);
      const refreshed = mergeEmployeePhoto(profile, result);
      if (refreshed) {
        setProfile(refreshed);
        setPhotoVersion(result.profile_photo_updated_at ?? photoCacheVersion(refreshed) ?? Date.now());
      }
      bumpAfterEmployeePhotoChange();
    } catch (err) {
      Alert.alert(t("common.uploadFailed"), handleProfilePickerError(err) || t("common.tryAgain"));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSyncAll() {
    setSyncingAll(true);
    try {
      await syncAll();
      await load();
    } catch (err) {
      Alert.alert(t("common.syncFailed"), err instanceof Error ? err.message : t("common.tryAgain"));
    } finally {
      setSyncingAll(false);
    }
  }

  function confirmSignOut() {
    Alert.alert(t("profile.signOutTitle"), t("profile.signOutBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.signOut"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            clearAppStorage();
            await signOut();
          })();
        }
      }
    ]);
  }

  const displayName =
    profile?.full_name || profile?.name || profile?.username || t("profile.fieldEmployee");
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const photoUrl = extractPhotoUrl(profile);
  const roleLabel = formatDisplayRole(profile?.role);
  const employeeId = profile?.employee_id?.toString().trim() || "—";
  const phone = profile?.phone?.trim() || "—";
  const lastSyncedLabel = formatRelativeTimeLocalized(language, lastSyncAt);
  const neverSynced = !lastSyncAt;

  const menuRows: MenuRow[] = useMemo(
    () => [
      {
        key: "notifications",
        icon: "notifications-outline",
        title: t("profile.notifications"),
        badge: unreadNotifications,
        onPress: () => rootNav?.navigate("Notifications")
      },
      {
        key: "diagnostics",
        icon: "pulse-outline",
        title: t("profile.diagnostics"),
        onPress: () => navigation.navigate("Diagnostics")
      },
      {
        key: "help",
        icon: "help-circle-outline",
        title: t("profile.help"),
        onPress: () => navigation.navigate("Help")
      },
      {
        key: "settings",
        icon: "settings-outline",
        title: t("settings.title"),
        onPress: () => navigation.navigate("Settings")
      }
    ],
    [navigation, rootNav, t, unreadNotifications]
  );

  if (loading && !profile) {
    return (
      <View style={[styles.screen, { paddingTop: safeTop }]}>
        <ScreenLoader />
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={[styles.screen, { paddingTop: safeTop }]}>
        <EmptyState
          icon="person-outline"
          title={t("profile.loadError")}
          subtitle={error}
          action={t("common.retry")}
          onAction={() => void load()}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenCanvas />
      <ScreenEntranceWash replayKey={entranceTick} />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: tabInset + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            {...refreshControlProps}
          />
        }
      >
        <FadeInSection replayKey={entranceTick} delay={entranceStagger(0)}>
          <View style={[styles.hero, { paddingTop: safeTop + 20 }]}>
            <View style={styles.heroTopRow}>
              <HeroBrandMark version={appVersion} />
            </View>

            <View style={styles.userRow}>
              <HeroAvatar
                photoUrl={photoUrl}
                photoVersion={photoVersion}
                uploading={uploadingPhoto}
                onPress={() => showProfilePhotoSourcePicker((s) => void changePhoto(s))}
              />
              <View style={styles.userCol}>
                <Text style={styles.userName} numberOfLines={2}>
                  {displayName}
                </Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{roleLabel}</Text>
                </View>
                <Text style={styles.userMeta} numberOfLines={1}>
                  {employeeId !== "—" ? `EMP ${employeeId}` : "EMP —"}
                  {phone !== "—" ? ` · ${phone}` : ""}
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{visitsToday}</Text>
                <Text style={styles.statLabel}>{t("profile.visitsToday")}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{visitsMonth}</Text>
                <Text style={styles.statLabel}>{t("profile.thisMonth")}</Text>
              </View>
            </View>
          </View>
        </FadeInSection>

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(1)}>
          <View style={styles.menuSection}>
          <SectionLabel title={t("profile.menu")} />

          {menuRows.map((row, index) => (
            <FadeInSection
              key={row.key}
              replayKey={entranceTick}
              delay={entranceListStagger(2, index)}
              variant="card"
            >
              <MenuItemCard row={row} />
            </FadeInSection>
          ))}
          <FadeInSection replayKey={entranceTick} delay={entranceListStagger(2, menuRows.length)} variant="card">
            <LanguageMenuItem language={language} onSelect={(lang) => void setLanguage(lang)} />
          </FadeInSection>

          <FadeInSection replayKey={entranceTick} delay={entranceListStagger(2, menuRows.length + 1)} variant="card">
          <View style={styles.syncCard}>
            <SectionLabel title={t("profile.syncOffline")} />
            <View style={styles.syncRow}>
              <Text style={styles.syncKey}>{t("profile.pendingVisits")}</Text>
              <Text style={[styles.syncValue, pendingCount > 0 && styles.syncValueWarn]}>
                {pendingCount}
              </Text>
            </View>
            <View style={styles.syncRow}>
              <Text style={styles.syncKey}>{t("profile.pendingGps")}</Text>
              <Text style={[styles.syncValue, pendingGpsCount > 0 && styles.syncValueWarn]}>
                {pendingGpsCount} {t("common.points")}
              </Text>
            </View>
            <View style={[styles.syncRow, styles.syncRowLast]}>
              <Text style={styles.syncKey}>{t("profile.lastSynced")}</Text>
              <Text style={[styles.syncValue, neverSynced && styles.syncValueNever]}>{lastSyncedLabel}</Text>
            </View>
          </View>
          </FadeInSection>

          <FadeInSection replayKey={entranceTick} delay={entranceListStagger(2, menuRows.length + 2)} variant="card">
          <Pressable
            onPress={() => void handleSyncAll()}
            disabled={syncingAll}
            style={({ pressed }) => [
              styles.syncBtn,
              syncingAll && styles.syncBtnDisabled,
              pressed && !syncingAll && { opacity: 0.92 }
            ]}
          >
            {syncingAll ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="refresh" size={16} color="#fff" />
            )}
            <Text style={styles.syncBtnText}>{t("profile.syncAllNow")}</Text>
          </Pressable>
          </FadeInSection>

          <FadeInSection replayKey={entranceTick} delay={entranceListStagger(2, menuRows.length + 3)} variant="card">
          <Pressable
            onPress={confirmSignOut}
            style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.92 }]}
          >
            <Ionicons name="log-out-outline" size={15} color={PROFILE_DS.danger} />
            <Text style={styles.signOutText}>{t("profile.signOut")}</Text>
          </Pressable>
          </FadeInSection>
          </View>
        </FadeInSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  scrollView: {
    flex: 1
  },
  scroll: {
    flexGrow: 1
  },
  hero: {
    backgroundColor: Colors.brand700,
    paddingBottom: 18,
    paddingHorizontal: 20
  },
  heroTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16
  },
  heroBrand: {
    gap: 4
  },
  heroLogoWrap: {
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 12,
    borderWidth: 2,
    height: 48,
    overflow: "hidden",
    width: 48
  },
  heroVersion: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    fontWeight: "600"
  },
  userRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    marginBottom: 16
  },
  heroAvatarWrap: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 26,
    borderWidth: 2,
    height: 52,
    justifyContent: "center",
    overflow: "hidden",
    width: 52
  },
  heroAvatarImage: {
    height: 52,
    width: 52
  },
  heroAvatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center"
  },
  userCol: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  userName: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3
  },
  roleText: {
    color: "#fff",
    fontSize: 9.5,
    fontWeight: "700"
  },
  userMeta: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 9.5,
    marginTop: 4
  },
  statsRow: {
    flexDirection: "row",
    gap: 10
  },
  statBox: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  statValue: {
    color: Colors.text1,
    fontSize: 22,
    fontWeight: "800"
  },
  statLabel: {
    color: Colors.text3,
    fontSize: 9.5,
    fontWeight: "500",
    marginTop: 2,
    textAlign: "center"
  },
  menuSection: {
    backgroundColor: Colors.bg,
    flex: 1,
    paddingBottom: 8
  },
  sectionLabel: {
    marginBottom: 6,
    marginHorizontal: 16,
    marginTop: 14
  },
  menuItem: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  menuIconBox: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderRadius: 11,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  menuLabel: {
    color: Colors.text1,
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600"
  },
  menuBadge: {
    backgroundColor: PROFILE_DS.danger,
    borderRadius: 99,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  menuBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center"
  },
  langToggle: {
    flexDirection: "row",
    gap: 6
  },
  langPill: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  langPillActive: {
    backgroundColor: PROFILE_DS.accent
  },
  langPillInactive: {
    borderColor: PROFILE_DS.inputBorder,
    borderWidth: 1.5
  },
  langPillText: {
    color: PROFILE_DS.textMuted,
    fontSize: 9.5,
    fontWeight: "700"
  },
  langPillTextActive: {
    color: "#fff"
  },
  syncCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop: 4,
    padding: 14
  },
  syncRow: {
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5
  },
  syncRowLast: {
    borderBottomWidth: 0
  },
  syncKey: {
    color: Colors.text3,
    fontSize: 11,
    fontWeight: "500"
  },
  syncValue: {
    color: Colors.text1,
    fontSize: 11,
    fontWeight: "700"
  },
  syncValueWarn: {
    color: Colors.amber
  },
  syncValueNever: {
    color: Colors.red
  },
  syncBtn: {
    alignItems: "center",
    backgroundColor: Colors.brand700,
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    height: 48,
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 10
  },
  syncBtnDisabled: {
    opacity: 0.7
  },
  syncBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700"
  },
  signOutBtn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    height: 44,
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 8
  },
  signOutText: {
    color: PROFILE_DS.danger,
    fontSize: 13,
    fontWeight: "600"
  }
});
