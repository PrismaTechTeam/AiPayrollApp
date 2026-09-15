/**
 * Employee Map Screen
 * Allows managers to track employee GPS locations during attendance check-in
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';

interface EmployeeLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  checkInTime: string;
  position?: string;
  department?: string;
}

interface EmployeeMapScreenProps {
  navigation?: any;
  route?: any;
}

const EmployeeMapScreen: React.FC<EmployeeMapScreenProps> = ({ navigation: navProp, route: routeProp }) => {
  const navigation = navProp || useNavigation();
  const route = routeProp || useRoute();
  const mapRef = useRef<MapView>(null);

  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  // Both refusals end the screen, so they are the screen rather than a dialog
  // stacked over a map that will never draw.
  const [blocked, setBlocked] = useState<{ title: string; body: string } | null>(null);
  const [employees, setEmployees] = useState<EmployeeLocation[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeLocation | null>(null);

  useEffect(() => {
    // Get selected employee and employee list from route params
    const params = route.params as any;
    if (params?.selectedEmployee) {
      setSelectedEmployee(params.selectedEmployee);
    }
    if (params?.employees) {
      setEmployees(params.employees);
    } else {
      setEmployees([]);
    }

    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setBlocked({
          title: 'Location access is off',
          body: 'The map places people against where you are, so it needs your location. You can turn it on and try again.',
        });
        setLoading(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setLoading(false);
    } catch (error) {
      setBlocked({
        title: 'Could not find where you are',
        body: 'Step outside or near a window and try again.',
      });
      setLoading(false);
    }
  };

  const handleMarkerPress = (employee: EmployeeLocation) => {
    setSelectedEmployee(employee);

    // Animate map to employee location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: employee.latitude,
        longitude: employee.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  // Center map on selected employee when component mounts
  useEffect(() => {
    if (selectedEmployee && mapRef.current && currentLocation) {
      setTimeout(() => {
        mapRef.current?.animateToRegion({
          latitude: selectedEmployee.latitude || currentLocation.latitude,
          longitude: selectedEmployee.longitude || currentLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }, 500);
    }
  }, [currentLocation, selectedEmployee]);

  if (loading) {
    return (
      <View style={styles.stateContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <AuthBackdrop scriptLines={[]} />
        <ActivityIndicator size="large" color={C.blue} />
        <Text style={styles.loadingText}>Finding everyone…</Text>
      </View>
    );
  }

  if (blocked) {
    return (
      <View style={styles.stateContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <AuthBackdrop scriptLines={[]} />
        <View style={styles.blockedCard}>
          <View style={styles.blockedIcon}>
            <MaterialCommunityIcons name="map-marker-off-outline" size={26} color={C.blue} />
          </View>
          <Text style={styles.blockedTitle}>{blocked.title}</Text>
          <Text style={styles.blockedBody}>{blocked.body}</Text>
          <TouchableOpacity
            style={styles.blockedButton}
            onPress={() => {
              setBlocked(null);
              setLoading(true);
              void requestLocationPermission();
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.blockedButtonText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            style={styles.blockedBackHit}
            accessibilityRole="button"
          >
            <Text style={styles.blockedBack}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerText} pointerEvents="none">
            <Text style={styles.headerTitle}>Employee Map</Text>
            <Text style={styles.headerSubtitle}>Where today's punches came from</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Map View */}
      {currentLocation && (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: selectedEmployee?.latitude || currentLocation.latitude,
            longitude: selectedEmployee?.longitude || currentLocation.longitude,
            latitudeDelta: selectedEmployee ? 0.01 : 0.02,
            longitudeDelta: selectedEmployee ? 0.01 : 0.02,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
        >
          {/* Manager's location circle */}
          <Circle
            center={currentLocation}
            radius={500}
            fillColor="rgba(47, 107, 255, 0.10)"
            strokeColor="rgba(47, 107, 255, 0.30)"
            strokeWidth={2}
          />

          {/* Employee markers */}
          {employees.map((employee) => (
            <Marker
              key={employee.id}
              coordinate={{
                latitude: employee.latitude,
                longitude: employee.longitude,
              }}
              title={employee.name}
              description={`Check-in: ${employee.checkInTime}`}
              onPress={() => handleMarkerPress(employee)}
            >
              <View style={[
                styles.employeeMarker,
                selectedEmployee?.id === employee.id && styles.employeeMarkerSelected,
              ]}>
                <MaterialCommunityIcons
                  name="account-circle"
                  size={selectedEmployee?.id === employee.id ? 40 : 36}
                  color={selectedEmployee?.id === employee.id ? C.blue : C.muted}
                />
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      {/* Bottom Info Card */}
      <View style={styles.bottomCard}>
        <View style={styles.grabber} />
        {selectedEmployee ? (
          // Show selected employee info
          <>
            <View style={styles.employeeInfoHeader}>
              <View style={styles.employeeAvatar}>
                <Text style={styles.employeeAvatarText}>
                  {selectedEmployee.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName} numberOfLines={1}>{selectedEmployee.name}</Text>
                {selectedEmployee.position && (
                  <Text style={styles.employeePosition} numberOfLines={1}>{selectedEmployee.position}</Text>
                )}
                {selectedEmployee.department && (
                  <View style={styles.departmentRow}>
                    <MaterialCommunityIcons name="office-building-outline" size={13} color={C.muted} />
                    <Text style={styles.employeeDepartment} numberOfLines={1}>{selectedEmployee.department}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.locationDetails}>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="clock-outline" size={18} color={C.blue} />
                <Text style={styles.detailLabel}>Check-in</Text>
                <Text style={styles.detailValue} numberOfLines={1}>{selectedEmployee.checkInTime}</Text>
              </View>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={18} color={C.blue} />
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {selectedEmployee.latitude.toFixed(4)}, {selectedEmployee.longitude.toFixed(4)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation?.goBack()}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>Back to list</Text>
            </TouchableOpacity>
          </>
        ) : (
          // Show default map info
          <>
            <View style={styles.mapIcon}>
              <MaterialCommunityIcons name="map-search-outline" size={28} color={C.blue} />
            </View>

            <Text style={styles.cardTitle}>Employee Map</Text>
            <Text style={styles.cardDescription}>
              Tap a marker to see who clocked in there and when.
            </Text>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation?.goBack()}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>Back to list</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FF',
  },

  // Loading and permission refusals share one frame: backdrop, centred content.
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F6F8FF',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: C.body,
  },
  blockedCard: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: C.blue,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  blockedIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E6EEFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  blockedTitle: { fontSize: 18, fontWeight: '800', color: C.ink, textAlign: 'center', marginBottom: 8 },
  blockedBody: { fontSize: 14, color: C.body, textAlign: 'center', lineHeight: 20 },
  blockedButton: {
    marginTop: 20,
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: C.blue,
  },
  blockedButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15, textAlign: 'center' },
  blockedBackHit: { marginTop: 6, paddingVertical: 10, paddingHorizontal: 16 },
  blockedBack: { fontSize: 14, fontWeight: '600', color: C.body },

  safeAreaTop: {
    backgroundColor: '#F6F8FF',
    zIndex: 10,
  },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, justifyContent: 'center' },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerText: {
    ...StyleSheet.absoluteFillObject,
    left: 68,
    right: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.ink },
  headerSubtitle: { fontSize: 13, color: C.body, marginTop: 2 },

  map: {
    flex: 1,
  },
  employeeMarker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: C.line,
  },
  employeeMarkerSelected: {
    borderWidth: 3,
    borderColor: C.blue,
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },

  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
  },
  // A short bar so the card reads as a sheet resting over the map.
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, marginBottom: 16 },

  mapIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E6EEFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.ink,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: C.body,
    textAlign: 'center',
    marginBottom: 20,
  },

  secondaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.field,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
    textAlign: 'center',
  },

  employeeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    width: '100%',
  },
  employeeAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E6EEFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  employeeAvatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: C.blue,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '800',
    color: C.ink,
  },
  employeePosition: {
    fontSize: 13,
    color: C.body,
    marginTop: 2,
  },
  departmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  employeeDepartment: {
    flex: 1,
    fontSize: 12,
    color: C.muted,
  },

  locationDetails: {
    width: '100%',
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 18,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  detailDivider: { height: 1, backgroundColor: C.line },
  detailLabel: {
    fontSize: 13,
    color: C.body,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: C.ink,
    fontWeight: '700',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});

export default EmployeeMapScreen;
