import { lazy, Suspense, useMemo, type RefObject } from "react";
import { isExpoGo } from "../../utils/mapLibreNative";
import type { FieldMapCameraRef } from "./fieldMapCamera";
import { FieldMapViewPlaceholder } from "./FieldMapViewPlaceholder";
import { FieldMapViewSchematic } from "./FieldMapViewSchematic";
import type { FieldMapViewProps } from "./FieldMapView.types";
import { MapErrorBoundary } from "./MapErrorBoundary";

export type { MapCoordinate, MapPin, MapPinKind } from "./FieldMapView.types";
export type { FieldMapCameraRef } from "./fieldMapCamera";

const LazyFieldMapViewMapLibre = lazy(async () => {
  const mod = await import("./FieldMapViewMapLibre");
  return { default: mod.FieldMapViewMapLibre };
});

type Props = FieldMapViewProps & {
  mapRef?: RefObject<FieldMapCameraRef | null>;
};

/**
 * Shared field map — SVG preview in Expo Go only; native MapLibre in dev/release APK.
 */
export function FieldMapView(props: Props) {
  const expoGo = useMemo(() => isExpoGo(), []);
  const mapHeight = props.height > 0 ? props.height : 220;

  if (expoGo) {
    return (
      <MapErrorBoundary height={mapHeight} screenName={props.screenName}>
        <FieldMapViewSchematic {...props} />
      </MapErrorBoundary>
    );
  }

  return (
    <Suspense
      fallback={
        <FieldMapViewPlaceholder
          {...props}
          message="Loading map…"
          showSpinner
        />
      }
    >
      <LazyFieldMapViewMapLibre {...props} />
    </Suspense>
  );
}
