/**
 * Whether this build can draw a map.
 *
 * Android draws react-native-maps with Google Maps, which needs a Maps SDK key in the
 * app's manifest (expo.android.config.googleMaps.apiKey). Expo Go carries its own, so the
 * map works there; a release or dev-client build without one crashes the moment a MapView
 * mounts. No key is configured yet, so on such a build the map entry points are hidden
 * rather than offered and crashing. Once a key is added to app.json this turns them back on
 * by itself. iOS uses Apple Maps and needs nothing.
 */
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export function mapsAvailable(): boolean {
  if (Platform.OS !== 'android') return true;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return true;
  const config = Constants.expoConfig?.android?.config as { googleMaps?: { apiKey?: string } } | undefined;
  return !!config?.googleMaps?.apiKey;
}
