import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { OfflineExperienceBanner } from "../components/OfflineExperienceBanner";
import { PageHeader } from "../components/ui/PageHeader";
import { MenuSection } from "../components/ui/MenuSection";
import { SyncStatusBadge } from "../components/ui/SyncStatusBadge";
import { useSecureScreen } from "../hooks/useSecureScreen";
import { useTabBarBottomInset } from "../hooks/useTabBarBottomInset";
import { useEmployee } from "../storage/EmployeeContext";
import { useOfflineSync } from "../storage/OfflineSyncContext";
import { useNotifications } from "../storage/NotificationsContext";
import { useDesignSystem } from "../hooks/useDesignSystem";
import { extractPhotoUrl } from "../utils/profilePhotoUrl";
import { ProfileAvatar } from "../components/ProfileAvatar";
import { StatusChip } from "../components/ui/StatusChip";

export function MoreMenuScreen() {
  useSecureScreen();
  const navigation = useNavigation<any>();
  const rootNav = navigation.getParent()?.getParent();
  const { colors, type, shadows } = useDesignSystem();
  const tabInset = useTabBarBottomInset();
  const { employee } = useEmployee();
  const { pendingCount } = useOfflineSync();
  const { unreadCount } = useNotifications();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: tabInset + 24, gap: 16 }}
    >
      <PageHeader title="More" subtitle="Tools & account" right={<SyncStatusBadge onPress={() => rootNav?.navigate("OfflineSync")} />} />

      <View style={{ paddingHorizontal: 16 }}>
        <OfflineExperienceBanner onPressSync={() => rootNav?.navigate("OfflineSync")} compact />
      </View>

      <Pressable
        onPress={() => navigation.navigate("Profile")}
        style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }, shadows.elevated]}
      >
        <ProfileAvatar name={employee?.full_name || employee?.name} photoUrl={extractPhotoUrl(employee)} size="lg" />
        <View style={styles.profileCopy}>
          <Text style={type.cardTitle}>{employee?.full_name || employee?.name || "Field staff"}</Text>
          <Text style={type.meta}>{employee?.role || "Agri clinic field"}</Text>
          <StatusChip variant="completed" label="Signed in" compact />
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>

      <View style={styles.sections}>
        <MenuSection
          title="Account"
          items={[
            {
              icon: "person-outline",
              title: "Profile",
              subtitle: "Photo, stats, sign out",
              onPress: () => navigation.navigate("Profile")
            },
            {
              icon: "clipboard-outline",
              title: "Visits",
              subtitle: "All field visits",
              onPress: () => navigation.navigate("Visits", { screen: "VisitsList" })
            }
          ]}
        />

        <MenuSection
          title="Field tools"
          items={[
            {
              icon: "cloud-upload-outline",
              title: "Offline sync",
              subtitle: pendingCount ? `${pendingCount} visit${pendingCount === 1 ? "" : "s"} queued` : "All visits synced",
              badge: pendingCount > 0 ? String(pendingCount) : undefined,
              onPress: () => rootNav?.navigate("OfflineSync")
            },
            {
              icon: "notifications-outline",
              title: "Notifications",
              subtitle: unreadCount ? `${unreadCount} unread` : "Alerts & reminders",
              badge: unreadCount > 0 ? String(unreadCount) : undefined,
              onPress: () => rootNav?.navigate("Notifications")
            },
            {
              icon: "navigate-outline",
              title: "Route history",
              subtitle: "Past workday routes",
              onPress: () => rootNav?.navigate("TravelHistory")
            }
          ]}
        />

        <MenuSection
          title="App"
          items={[
            {
              icon: "settings-outline",
              title: "Settings",
              subtitle: "Theme, sync & tracking",
              onPress: () => navigation.navigate("Settings")
            },
            {
              icon: "help-circle-outline",
              title: "Help",
              subtitle: "Quick start guide",
              onPress: () => navigation.navigate("Help")
            }
          ]}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 14,
    marginHorizontal: 16,
    padding: 16
  },
  profileCopy: { flex: 1, gap: 4 },
  sections: { gap: 20, paddingHorizontal: 16 }
});
