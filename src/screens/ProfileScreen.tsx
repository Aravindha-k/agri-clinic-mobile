import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { Employee, getCurrentEmployee, mergeEmployeePhoto } from "../api/employees";
import { useEmployee } from "../storage/EmployeeContext";
import { uploadEmployeePhoto } from "../api/profilePhotos";
import { getVisits, Visit } from "../api/visits";
import { ProfileAvatar } from "../components/ProfileAvatar";
import { AppHeader, PremiumCard, PrimaryButton, SkeletonCard, StatWidget, SyncStatusBadge } from "../components/ui";
import { ErrorState } from "../components/ErrorState";
import { useAuth } from "../storage/AuthContext";
import { useFieldDataRefresh } from "../storage/FieldDataRefreshContext";
import { useOfflineSync } from "../storage/OfflineSyncContext";
import { useTabBarBottomInset } from "../hooks/useTabBarBottomInset";
import { useTheme } from "../theme";
import { isSameVisitLocalDay } from "../utils/format";
import { extractPhotoUrl, photoCacheVersion } from "../utils/profilePhotoUrl";
import {
  handleProfilePickerError,
  pickProfileImage,
  showProfilePhotoSourcePicker
} from "../utils/profileImagePick";
import { BRAND } from "../brand/constants";
import { getDeviceInfo } from "../utils/deviceInfo";
import { useNotifications } from "../storage/NotificationsContext";
import { useTracking } from "../storage/TrackingContext";

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const c = theme.colors;
  const { pendingCount, lastSyncAt } = useOfflineSync();
  const { unreadCount } = useNotifications();
  const { lastSyncTime } = useTracking();
  const { bumpAfterEmployeePhotoChange, employeePhotoVersion } = useFieldDataRefresh();
  const { employee, refreshEmployee, loading: employeeLoading, error: employeeError } = useEmployee();
  const tabInset = useTabBarBottomInset();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [photoVersion, setPhotoVersion] = useState<string | number>(Date.now());

  const load = useCallback(async () => {
    try {
      setError("");
      const [emp, visitRows] = await Promise.all([refreshEmployee(), getVisits()]);
      setPhotoVersion(photoCacheVersion(emp) ?? Date.now());
      setVisits(visitRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  }, [refreshEmployee]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void refreshEmployee().catch(() => undefined);
    }, [refreshEmployee])
  );

  useEffect(() => {
    if (employeePhotoVersion > 0) {
      void load();
      setPhotoVersion(Date.now());
    }
  }, [employeePhotoVersion, load]);

  const today = useMemo(() => new Date(), []);
  const todayCount = useMemo(
    () => visits.filter((v) => isSameVisitLocalDay(v, today)).length,
    [visits, today]
  );
  const monthCount = useMemo(() => {
    const now = new Date();
    return visits.filter((v) => {
      if (!v.created_at) return false;
      const d = new Date(v.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }, [visits]);

  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "—";
  const buildNumber =
    Constants.expoConfig?.android?.versionCode ?? Constants.nativeBuildVersion ?? "—";
  const device = getDeviceInfo();
  const rootNav = navigation.getParent();

  function confirmSignOut() {
    Alert.alert("Sign out?", "You will need to sign in again to continue field work.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() }
    ]);
  }

  function formatSync(iso: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? "—"
      : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  async function changePhoto(source: "camera" | "library") {
    try {
      const picked = await pickProfileImage(source);
      if (!picked) return;
      setUploadingPhoto(true);
      setUploadProgress(0);
      const result = await uploadEmployeePhoto(picked, setUploadProgress);
      const refreshed =
        mergeEmployeePhoto(await getCurrentEmployee(), result) ??
        (result.entity && typeof result.entity === "object" ? (result.entity as Employee) : null);
      if (!refreshed) {
        throw new Error("Photo uploaded but profile could not be refreshed.");
      }
      await refreshEmployee();
      setPhotoVersion(
        result.profile_photo_updated_at ??
          photoCacheVersion(refreshed) ??
          photoCacheVersion(result.entity) ??
          Date.now()
      );
      bumpAfterEmployeePhotoChange();
      if (!extractPhotoUrl(refreshed) && !result.photo_url) {
        Alert.alert(
          "Photo uploaded",
          "If you do not see your photo yet, the server may still be processing it."
        );
      }
    } catch (err) {
      Alert.alert("Upload failed", handleProfilePickerError(err) || "Please try again.");
    } finally {
      setUploadingPhoto(false);
      setUploadProgress(0);
    }
  }

  const displayError = error || employeeError;
  if (displayError && !employee) return <ErrorState message={displayError} onRetry={load} />;

  const displayName = employee?.full_name || employee?.name || employee?.username || "Field employee";
  const photoUrl = extractPhotoUrl(employee);

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <AppHeader title="Profile" subtitle="Your field account" right={<SyncStatusBadge onPress={() => rootNav?.navigate("OfflineSync")} />} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: tabInset }]} showsVerticalScrollIndicator={false}>
        {loading || employeeLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <PremiumCard elevated tint="primary" style={styles.employeeCard}>
              <View style={styles.employeeRow}>
                <ProfileAvatar
                  name={displayName}
                  photoUrl={photoUrl}
                  photoVersion={photoVersion}
                  size="xl"
                  editable
                  uploading={uploadingPhoto}
                  uploadProgress={uploadProgress}
                  onPress={() => showProfilePhotoSourcePicker((s) => void changePhoto(s))}
                />
                <View style={styles.employeeCopy}>
                  <Text style={[styles.empName, { color: c.primaryDark }]}>{displayName}</Text>
                  <Text style={{ color: c.muted, fontSize: 13 }}>{employee?.role?.trim() || "Field staff"}</Text>
                  {employee?.phone?.trim() ? (
                    <Text style={{ color: c.muted, fontSize: 12, marginTop: 4 }}>{employee.phone.trim()}</Text>
                  ) : null}
                  <Text style={{ color: c.muted, fontSize: 12, marginTop: 4 }}>
                    ID {employee?.employee_id?.toString().trim() || "—"}
                  </Text>
                  <Pressable
                    onPress={() => showProfilePhotoSourcePicker((s) => void changePhoto(s))}
                    disabled={uploadingPhoto}
                    style={styles.changePhotoBtn}
                  >
                    <Ionicons name="camera-outline" size={16} color={c.primaryDark} />
                    <Text style={{ color: c.primaryDark, fontWeight: "800", fontSize: 13 }}>Change photo</Text>
                  </Pressable>
                </View>
              </View>
            </PremiumCard>

            <View style={styles.stats}>
              <StatWidget label="Today" value={todayCount} />
              <StatWidget label="This month" value={monthCount} />
            </View>

            <PremiumCard elevated tint="soft">
              <MenuRow
                icon="notifications-outline"
                label="Notifications"
                hint={unreadCount ? `${unreadCount} unread` : "No new alerts"}
                onPress={() => rootNav?.navigate("Notifications")}
              />
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <MenuRow icon="navigate" label="Live map" onPress={() => rootNav?.navigate("LiveMap")} />
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <MenuRow icon="trail-sign-outline" label="Today's travel" onPress={() => rootNav?.navigate("TravelHistory")} />
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <MenuRow
                icon="cloud-upload-outline"
                label="Offline sync"
                hint={pendingCount ? `${pendingCount} queued` : "All synced"}
                onPress={() => rootNav?.navigate("OfflineSync")}
              />
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <MenuRow icon={isDark ? "sunny-outline" : "moon-outline"} label={isDark ? "Light mode" : "Dark mode"} onPress={toggleTheme} />
            </PremiumCard>

            <PremiumCard elevated tint="soft">
              <Text style={[styles.sectionLabel, { color: c.text }]}>Device & sync</Text>
              <InfoLine label="Last visit sync" value={formatSync(lastSyncAt)} />
              <InfoLine label="Last GPS sync" value={formatSync(lastSyncTime)} />
              <InfoLine label="Device" value={device.device_model || "—"} />
              <InfoLine label="App version" value={`${appVersion} (${buildNumber})`} />
            </PremiumCard>

            <PremiumCard elevated tint="soft" style={styles.aboutCard}>
              <Text style={[styles.aboutName, { color: c.text }]}>{BRAND.appName}</Text>
              <Text style={[styles.aboutTag, { color: c.muted }]}>{BRAND.tagline}</Text>
            </PremiumCard>
            <PrimaryButton title="Sign out" onPress={confirmSignOut} variant="outline" />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={styles.infoRow}>
      <Text style={{ color: c.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: c.text, fontSize: 14, fontWeight: "700", marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  hint,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Pressable onPress={onPress} style={styles.menuRow} accessibilityRole="button">
      <View style={[styles.menuIcon, { backgroundColor: c.primarySoft }]}>
        <Ionicons name={icon} size={20} color={c.primaryDark} />
      </View>
      <View style={styles.menuText}>
        <Text style={[styles.menuLabel, { color: c.text }]}>{label}</Text>
        {hint ? <Text style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>{hint}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={c.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { gap: 14, padding: 16, paddingBottom: 32 },
  employeeCard: { paddingVertical: 16 },
  employeeRow: { alignItems: "center", flexDirection: "row", gap: 14 },
  employeeCopy: { flex: 1 },
  empName: { fontSize: 18, fontWeight: "900" },
  changePhotoBtn: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 10 },
  stats: { flexDirection: "row", gap: 10 },
  menuRow: { alignItems: "center", flexDirection: "row", gap: 12, paddingVertical: 4 },
  menuIcon: { alignItems: "center", borderRadius: 12, height: 40, justifyContent: "center", width: 40 },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: "800" },
  divider: { height: 1, marginVertical: 10 },
  sectionLabel: { fontSize: 15, fontWeight: "800", marginBottom: 8 },
  infoRow: { marginTop: 10 },
  aboutCard: { alignItems: "center", gap: 4, paddingVertical: 16 },
  aboutName: { fontSize: 16, fontWeight: "900", textAlign: "center" },
  aboutTag: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  version: { fontSize: 12, marginTop: 6, textAlign: "center" }
});
