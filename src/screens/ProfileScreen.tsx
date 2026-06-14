import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { Employee, getCurrentEmployee, mergeEmployeePhoto } from "../api/employees";
import { fetchFarmersPage } from "../api/farmers";
import { useEmployee } from "../storage/EmployeeContext";
import { uploadEmployeePhoto } from "../api/profilePhotos";
import { Visit } from "../api/visits";
import { getHomeVisits } from "../utils/visitsCache";
import { ProfileAvatar } from "../components/ProfileAvatar";
import { ProfileSkeleton } from "../components/farmer/ProfileSkeleton";
import { AppHeader, KpiCard, PrimaryButton, SyncStatusBadge } from "../components/ui";
import { ErrorState } from "../components/ErrorState";
import { useAuth } from "../storage/AuthContext";
import { useFieldDataRefresh } from "../storage/FieldDataRefreshContext";
import { useOfflineSync } from "../storage/OfflineSyncContext";
import { useSecureScreen } from "../hooks/useSecureScreen";
import { useTabBarBottomInset } from "../hooks/useTabBarBottomInset";
import { useDesignSystem } from "../hooks/useDesignSystem";
import { isSameVisitLocalDay } from "../utils/format";
import { extractPhotoUrl, photoCacheVersion } from "../utils/profilePhotoUrl";
import {
  handleProfilePickerError,
  pickProfileImage,
  showProfilePhotoSourcePicker
} from "../utils/profileImagePick";
import { formatDisplayRole } from "../utils/formatRole";
import { useTracking } from "../storage/TrackingContext";
import { formatRelativeTime } from "../utils/formatRelativeTime";

export function ProfileScreen() {
  useSecureScreen();
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();
  const { colors, type, shadows } = useDesignSystem();
  const { pendingCount, lastSyncAt } = useOfflineSync();
  const { pendingSyncCount } = useTracking();
  const { bumpAfterEmployeePhotoChange, employeePhotoVersion } = useFieldDataRefresh();
  const { employee, refreshEmployee, loading: employeeLoading, error: employeeError } = useEmployee();
  const tabInset = useTabBarBottomInset();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [farmerCount, setFarmerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [photoVersion, setPhotoVersion] = useState<string | number>(Date.now());

  const load = useCallback(async () => {
    try {
      setError("");
      const [visitCache, farmerPage] = await Promise.all([
        getHomeVisits({ pageSize: 100 }),
        fetchFarmersPage({ page: 1, pageSize: 1, source: "ProfileScreen" }).catch(() => ({ count: 0, results: [], next: null }))
      ]);
      setPhotoVersion(photoCacheVersion(employee) ?? Date.now());
      setVisits(visitCache.visits);
      setFarmerCount(farmerPage.count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  }, [employee]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (employeePhotoVersion > 0) {
      void load();
      setPhotoVersion(Date.now());
    }
  }, [employeePhotoVersion, load]);

  const today = useMemo(() => new Date(), []);
  const visitsToday = useMemo(() => visits.filter((v) => isSameVisitLocalDay(v, today)).length, [visits, today]);
  const totalVisits = visits.length;

  const rootNav = navigation.getParent()?.getParent();

  function confirmSignOut() {
    Alert.alert("Sign out?", "You will need to sign in again to continue field work.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() }
    ]);
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
      if (!refreshed) throw new Error("Photo uploaded but profile could not be refreshed.");
      await refreshEmployee();
      setPhotoVersion(result.profile_photo_updated_at ?? photoCacheVersion(refreshed) ?? Date.now());
      bumpAfterEmployeePhotoChange();
    } catch (err) {
      Alert.alert("Upload failed", handleProfilePickerError(err) || "Please try again.");
    } finally {
      setUploadingPhoto(false);
      setUploadProgress(0);
    }
  }

  const displayError = error || employeeError;
  if (displayError && !employee) return <ErrorState message={displayError} onRetry={() => void load()} />;

  const displayName = employee?.full_name || employee?.name || employee?.username || "Field employee";
  const photoUrl = extractPhotoUrl(employee);
  const roleLabel = formatDisplayRole(employee?.role);
  const appVersion = Constants.expoConfig?.version ?? "—";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader
        title="Profile"
        subtitle="Your field account"
        onBack={() => navigation.goBack()}
        right={<SyncStatusBadge onPress={() => rootNav?.navigate("OfflineSync")} />}
      />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: tabInset + 24 }]} showsVerticalScrollIndicator={false}>
        {loading || employeeLoading ? (
          <ProfileSkeleton />
        ) : (
          <>
            <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.borderSubtle }, shadows.elevated]}>
              <ProfileAvatar
                name={displayName}
                photoUrl={photoUrl}
                photoVersion={photoVersion}
                size="xxl"
                editable
                uploading={uploadingPhoto}
                uploadProgress={uploadProgress}
                onPress={() => showProfilePhotoSourcePicker((s) => void changePhoto(s))}
              />
              <Text style={type.pageTitle}>{displayName}</Text>
              <View style={[styles.rolePill, { backgroundColor: colors.primarySoft }]}>
                <Text style={[type.caption, { color: colors.primaryDark, fontWeight: "800" }]}>{roleLabel}</Text>
              </View>
              {employee?.phone?.trim() ? <Text style={type.meta}>{employee.phone.trim()}</Text> : null}
              <Text style={type.caption}>Employee ID · {employee?.employee_id?.toString().trim() || "—"}</Text>
              <Pressable
                onPress={() => showProfilePhotoSourcePicker((s) => void changePhoto(s))}
                disabled={uploadingPhoto}
                style={[styles.photoBtn, { borderColor: colors.borderSubtle }]}
              >
                <Ionicons name="camera-outline" size={16} color={colors.primary} />
                <Text style={[type.caption, { color: colors.primary, fontWeight: "800" }]}>Update photo</Text>
              </Pressable>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCell}>
                <KpiCard icon="clipboard-outline" label="Visits" value={totalVisits} hint={`${visitsToday} today`} accent={visitsToday > 0} />
              </View>
              <View style={styles.statCell}>
                <KpiCard icon="trail-sign-outline" label="Route points" value={pendingSyncCount} hint="Queued today" />
              </View>
              <View style={styles.statCell}>
                <KpiCard icon="people-outline" label="Farmers" value={farmerCount || "—"} hint="In directory" />
              </View>
            </View>

            <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }, shadows.card]}>
              <Text style={[type.label, { paddingHorizontal: 14, paddingTop: 14 }]}>Workspace</Text>
              <MenuRow
                icon="navigate-outline"
                label="GPS & workday"
                subtitle="Today's route, GPS buffer, workday timer"
                onPress={() => navigation.navigate("TrackingWorkspace")}
              />
            </View>

            <View style={[styles.syncCard, { backgroundColor: colors.cardMuted, borderColor: colors.borderSubtle }]}>
              <Text style={type.label}>Sync status</Text>
              <Text style={[type.bodyStrong, { marginTop: 4 }]}>
                {pendingCount ? `${pendingCount} visit${pendingCount === 1 ? "" : "s"} pending` : "All visits synced"}
              </Text>
              <Text style={[type.caption, { marginTop: 4 }]}>
                Last synced {formatRelativeTime(lastSyncAt)}
              </Text>
            </View>

            <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }, shadows.card]}>
              <MenuRow icon="settings-outline" label="Settings" onPress={() => navigation.navigate("Settings")} />
              <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
              <MenuRow icon="help-circle-outline" label="Help" onPress={() => navigation.navigate("Help")} />
              <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
              <MenuRow icon="notifications-outline" label="Notifications" onPress={() => rootNav?.navigate("Notifications")} />
            </View>

            <Text style={[type.caption, { textAlign: "center" }]}>App v{appVersion}</Text>
            <PrimaryButton title="Sign out" onPress={confirmSignOut} variant="outline" />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  subtitle,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const { colors, type } = useDesignSystem();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.94 }]}>
      <View style={[styles.menuIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.bodyStrong}>{label}</Text>
        {subtitle ? <Text style={type.caption}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16, padding: 16 },
  hero: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    padding: 20
  },
  rolePill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  photoBtn: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  statsRow: { flexDirection: "row", gap: 8 },
  statCell: { flex: 1 },
  syncCard: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  menuCard: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  menuRow: { alignItems: "center", flexDirection: "row", gap: 12, padding: 14 },
  menuIcon: { alignItems: "center", borderRadius: 12, height: 40, justifyContent: "center", width: 40 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 }
});
