import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Employee, getCurrentEmployee } from "../../../src/api/employees";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useRefreshControlProps } from "../../../src/hooks/useRefreshControlProps";
import { useSafeAreaInsetsCompat } from "../../../src/hooks/useSafeAreaInsetsCompat";
import { useSecureScreen } from "../../../src/hooks/useSecureScreen";
import { useTabBarBottomInset } from "../../../src/hooks/useTabBarBottomInset";
import { useAuth } from "../../../src/storage/AuthContext";
import { useEmployee } from "../../../src/storage/EmployeeContext";
import { useOfflineSync } from "../../../src/storage/OfflineSyncContext";
import { useDuty } from "../../../src/features/duty/store/DutyContext";
import { useDutyPresentation } from "../../../src/features/duty/hooks/useDutyPresentation";
import {
  checkLogoutAllowed,
  showLogoutBlockedAlert,
  trySyncBeforeLogout
} from "../../lib/sync/logoutGuard";
import { beginNewVisit } from "../../lib/beginNewVisit";
import { formatDisplayRole } from "../../../src/utils/formatRole";
import { cacheBustPhotoUrl, extractPhotoUrl, photoCacheVersion } from "../../../src/utils/profilePhotoUrl";
import { fetchVisitsPage } from "../../../src/api/visits";
import { EmptyState, GhostButton } from "../../components/ui";
import { ScreenCanvas, ScreenEntranceBloom, ScreenLoader } from "../../components/layout";
import { FadeInSection, entranceListStagger, entranceStagger } from "../../components/ui/FadeInSection";
import { useScreenEntrance } from "../../hooks/useScreenEntrance";
import { getBadgeCount } from "../../lib/notificationsApi";
import { DS } from "../../../src/theme/globalStyles";
import { Colors, FontSize, FontWeight, Layout, Radius, Spacing } from "../../lib/theme";
import { SECTION_LABEL } from "../../lib/sectionLabel";
import { BRAND_COLORS } from "../../../src/config/brand";
import { ProfilePhotoFallback } from "../../../src/components/ProfilePhotoFallback";

const PROFILE_DS = { ...DS, dangerBorder: Colors.redBg, hero: BRAND_COLORS.primary } as const;

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

/** Version badge on profile hero */
function HeroVersionMark({ version }: { version: string }) {
  return (
    <View style={styles.heroBrand}>
      <Text style={styles.heroVersion}>v{version}</Text>
    </View>
  );
}

const PROFILE_AVATAR_SIZE = 116;

function HeroAvatar({
  photoUrl,
  photoVersion,
  size = PROFILE_AVATAR_SIZE
}: {
  photoUrl: string | null;
  photoVersion: string | number;
  size?: number;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const uri = photoUrl && !imgFailed ? cacheBustPhotoUrl(photoUrl, photoVersion) : null;

  useEffect(() => {
    setImgFailed(false);
  }, [photoUrl, photoVersion]);

  const onImageError = useCallback(() => setImgFailed(true), []);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Kavya Agri Clinic profile"
      style={[styles.avatarShell, { width: size, height: size, borderRadius: size / 2 }]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
          onError={onImageError}
        />
      ) : (
        <ProfilePhotoFallback size={size} />
      )}
    </View>
  );
}

function MenuItemCard({ row }: { row: MenuRow }) {
  return (
    <Pressable
      onPress={row.onPress}
      accessibilityRole="button"
      accessibilityLabel={row.title}
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
          accessibilityRole="button"
          accessibilityLabel={t("profile.english")}
          accessibilityState={{ selected: language === "en" }}
          style={[styles.langPill, language === "en" ? styles.langPillActive : styles.langPillInactive]}
        >
          <Text style={[styles.langPillText, language === "en" && styles.langPillTextActive]}>EN</Text>
        </Pressable>
        <Pressable
          onPress={() => onSelect("ta")}
          accessibilityRole="button"
          accessibilityLabel={t("profile.tamil")}
          accessibilityState={{ selected: language === "ta" }}
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
  const tabsNav = navigation.getParent();
  const rootNav = navigation.getParent()?.getParent();
  const { top: safeTop } = useSafeAreaInsetsCompat();
  const tabInset = useTabBarBottomInset();
  const refreshControlProps = useRefreshControlProps();
  const { signOut } = useAuth();
  const { employee, refreshEmployee } = useEmployee();
  const { refreshQueue } = useOfflineSync();
  const { t, language, setLanguage } = useI18n();
  const { currentDuty, hydrationStatus } = useDuty();
  const dutyPresentation = useDutyPresentation(currentDuty);

  const [profile, setProfile] = useState<Employee | null>(employee);
  const [loading, setLoading] = useState(!employee);
  const entranceTick = useScreenEntrance();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [photoVersion, setPhotoVersion] = useState<string | number>(Date.now());
  const [visitsToday, setVisitsToday] = useState(0);
  const [visitsMonth, setVisitsMonth] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const lastLoadAtRef = useRef(0);
  const PROFILE_FOCUS_TTL_MS = 45_000;

  const load = useCallback(async () => {
    try {
      setError("");
      const [me, todayPage, monthPage, unread] = await Promise.all([
        getCurrentEmployee(),
        fetchVisitsPage({ dateFilter: "today", pageSize: 1 }),
        fetchVisitsPage({ dateFilter: "month", pageSize: 1 }),
        getBadgeCount(true)
      ]);

      setProfile(me);
      setUnreadNotifications(unread);
      setPhotoVersion(photoCacheVersion(me) ?? Date.now());
      setVisitsToday(todayPage.count ?? 0);
      setVisitsMonth(monthPage.count ?? 0);
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
      const now = Date.now();
      if (now - lastLoadAtRef.current < PROFILE_FOCUS_TTL_MS && profile) {
        void getBadgeCount(true).then(setUnreadNotifications);
        void refreshQueue();
        return;
      }
      lastLoadAtRef.current = now;
      void load();
    }, [load, profile, refreshQueue])
  );

  function confirmSignOut() {
    const blocked = checkLogoutAllowed();
    if (!blocked.allowed) {
      if (blocked.reason === "unsaved_visit") {
        Alert.alert(t("visitFlow.leaveVisitTitle"), t("visitFlow.leaveVisitBody"), [
          { text: t("visitFlow.continueEditing"), style: "cancel" },
          {
            text: t("visitFlow.saveDraft"),
            onPress: () => {
              void signOut();
            }
          },
          {
            text: t("visitFlow.discard"),
            style: "destructive",
            onPress: () => {
              beginNewVisit({ discardMedia: true });
              void signOut();
            }
          }
        ]);
        return;
      }
      showLogoutBlockedAlert({
        title: t("fieldWorkflow.logoutBlockedTitle"),
        message: t("fieldWorkflow.logoutBlocked"),
        syncNow: t("fieldWorkflow.syncNow"),
        staySignedIn: t("fieldWorkflow.staySignedIn"),
        onSyncNow: () => {
          void (async () => {
            const result = await trySyncBeforeLogout();
            if (result.allowed) {
              await signOut();
              return;
            }
            Alert.alert(
              t("fieldWorkflow.partialFailureTitle"),
              t("fieldWorkflow.partialFailure")
            );
          })();
        }
      });
      return;
    }

    Alert.alert(t("profile.signOutTitle"), t("profile.signOutBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("profile.signOut"),
        style: "destructive",
        onPress: () => {
          void signOut();
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
  const workdayStatusLabel =
    hydrationStatus === "loading" || hydrationStatus === "idle"
      ? t("workdayUx.loadingWorkday")
      : dutyPresentation.isActive
        ? t("workdayUx.workdayActive")
        : dutyPresentation.isCompleted
          ? t("workdayUx.statusCompleted")
          : t("workdayUx.startYourWorkday");

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
        <ScreenLoader message={t("common.loading")} />
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
      <ScreenEntranceBloom replayKey={entranceTick} />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: tabInset + Layout.scrollBottomExtra }]}
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
          <View style={[styles.hero, { paddingTop: safeTop + Spacing.md }]}>
            <View style={styles.heroTopRow}>
              <Text style={styles.pageTitle}>{t("profile.pageTitle")}</Text>
              <HeroVersionMark version={appVersion} />
            </View>

            <View style={styles.profileIdentity}>
              <HeroAvatar photoUrl={photoUrl} photoVersion={photoVersion} />
              <Text style={styles.userName} numberOfLines={2}>
                {displayName}
              </Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{roleLabel}</Text>
              </View>
              <Text style={styles.userMeta} numberOfLines={2}>
                {employeeId !== "—" ? `EMP ${employeeId}` : "EMP —"}
                {phone !== "—" ? ` · ${phone}` : ""}
              </Text>
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

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(1)} variant="card">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={workdayStatusLabel}
            onPress={() => tabsNav?.navigate("Day")}
            style={({ pressed }) => [styles.workdayStatusLink, pressed && { opacity: 0.92 }]}
          >
            <View style={[styles.workdayStatusDot, dutyPresentation.isActive && styles.workdayStatusDotActive]} />
            <View style={styles.workdayStatusCopy}>
              <Text style={styles.workdayStatusTitle}>{workdayStatusLabel}</Text>
              <Text style={styles.workdayStatusHint}>{t("tabs.day")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.brand700} />
          </Pressable>
        </FadeInSection>

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(2)}>
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
          <GhostButton
            label={t("profile.signOut")}
            onPress={confirmSignOut}
            variant="danger"
            icon={<Ionicons name="log-out-outline" size={18} color={Colors.red} />}
            style={styles.signOutBtnOuter}
          />
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
    backgroundColor: Colors.surface,
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 18,
    paddingHorizontal: 20
  },
  heroTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.lg
  },
  pageTitle: {
    color: Colors.text1,
    fontSize: FontSize.h1,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3
  },
  heroBrand: {
    gap: 4
  },
  profileIdentity: {
    alignItems: "center",
    gap: 10,
    marginBottom: 18
  },
  heroVersion: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: "600"
  },
  avatarShell: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden"
  },
  userName: {
    color: Colors.text1,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    textAlign: "center"
  },
  roleBadge: {
    backgroundColor: Colors.brand50,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3
  },
  roleText: {
    color: Colors.greenText,
    fontSize: FontSize.sm,
    fontWeight: "700"
  },
  userMeta: {
    color: Colors.text3,
    fontSize: FontSize.md,
    textAlign: "center"
  },
  statsRow: {
    flexDirection: "row",
    gap: 10
  },
  statBox: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md
  },
  statValue: {
    color: Colors.text1,
    fontSize: 22,
    fontWeight: "800"
  },
  statLabel: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginTop: 2,
    textAlign: "center"
  },
  menuSection: {
    backgroundColor: Colors.bg,
    flex: 1,
    paddingBottom: 8,
    paddingTop: Spacing.md
  },
  workdayStatusLink: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    minHeight: 64,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md
  },
  workdayStatusDot: {
    backgroundColor: Colors.text4,
    borderRadius: 6,
    height: 12,
    width: 12
  },
  workdayStatusDotActive: {
    backgroundColor: Colors.green
  },
  workdayStatusCopy: {
    flex: 1,
    gap: 2
  },
  workdayStatusTitle: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  workdayStatusHint: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg
  },
  menuItem: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.lg,
    minHeight: 52,
    paddingHorizontal: Spacing.cardLg,
    paddingVertical: Spacing.md
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
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  menuBadge: {
    backgroundColor: PROFILE_DS.danger,
    borderRadius: 99,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  menuBadgeText: {
    color: Colors.onPrimary,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    textAlign: "center"
  },
  langToggle: {
    flexDirection: "row",
    gap: 6
  },
  langPill: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 8
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
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold
  },
  langPillTextActive: {
    color: Colors.onPrimary
  },
  signOutBtnOuter: {
    borderColor: Colors.red,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm
  }
});
