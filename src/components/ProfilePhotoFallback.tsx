import { KavyaClinicAvatarMark } from "./brand/KavyaClinicAvatarMark";

type Props = {
  size: number;
};

/** Default profile avatar — Kavya Agri Clinic branded face icon. */
export function ProfilePhotoFallback({ size }: Props) {
  return <KavyaClinicAvatarMark size={size} />;
}
