import { View } from "react-native";
import { CompanyLogo } from "./CompanyLogo";

type Props = {
  size: number;
};

/** Profile / avatar fallback — same canonical circular logo. */
export function KavyaClinicAvatarMark({ size }: Props) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <CompanyLogo size={size} accessibilityLabel="Kavya Agri Clinic" />
    </View>
  );
}
