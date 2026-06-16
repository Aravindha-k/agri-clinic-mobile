/** Cross-platform map region — avoids importing react-native-maps on web. */
export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};
