/**
 * Employee Map Screen
 * Where today's clock-ins came from. Opened from Team Today, either on the
 * person HR tapped or, from the header's map button, on everyone at once.
 *
 * The map no longer waits for the viewer's own location. The pins do not
 * depend on where HR is standing, and indoors a GPS fix could leave
 * "Finding everyone..." spinning for a long time, or block the map outright if
 * location was refused. HR's own dot is shown only when they had already allowed
 * location for punching; this screen never asks, because the system prompt's
 * text is about attendance check-in and an HR officer who never punches would
 * be asked for nothing.
 *
 * Google Maps on Android, Apple Maps on iOS: forcing Google on iOS needs the
 * Google Maps iOS SDK, which this app does not ship, and shows an error tile.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import AuthBackdrop, { AUTH_COLORS as C } from '../components/auth/AuthBackdrop';
import { personInitials } from '../components/attendance/PunchRequestUi';

interface EmployeeLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  checkInTime: string;
  /** Set only for someone who has clocked out since; their pin is the clock-in place. */
  checkOutTime?: string;
  position?: string;
  department?: string;
}

/** What Team Today passes. No selectedEmployee means "show everyone". */
interface MapParams {
  selectedEmployee?: EmployeeLocation;
  employees?: EmployeeLocation[];
}

/**
 * Pins are green for a clock-in; the one being looked at is blue; someone who has
 * left is the same green, faded. Android colours pins by hue only, so a grey pin
 * would come out blue and read as "selected".
 */
const PIN_IN = '#16A34A';
const LEFT_OPACITY = 0.5;

/** Two punches from the same office land on the same spot to within a metre or so. */
const spotOf = (e: EmployeeLocation) => `${e.latitude.toFixed(5)},${e.longitude.toFixed(5)}`;

const EmployeeMapScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const params = (route.params ?? {}) as unknown as MapParams;

  // The tapped person is always on the map, even if the list did not repeat them.
  const employees = useMemo<EmployeeLocation[]>(() => {
    const list = params.employees ?? [];
    const selected = params.selectedEmployee;
    return selected && !list.some((e) => e.id === selected.id) ? [selected, ...list] : list;
  }, [params.employees, params.selectedEmployee]);

  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeLocation | null>(params.selectedEmployee ?? null);
  const [showMe, setShowMe] = useState(false);
  const [cardHeight, setCardHeight] = useState(0);

  // The viewer's own dot, only if location was already granted. Never prompts.
  useEffect(() => {
    let cancelled = false;
    Location.getForegroundPermissionsAsync()
      .then((current) => {
        if (!cancelled && current.granted) setShowMe(true);
      })
      .catch(() => {
        // No dot for the viewer; the employees' pins are unaffected.
      });
    return () => { cancelled = true; };
  }, []);

  // Opened on everyone: start over the middle of them, then fit them all once the map
  // can measure itself. Opened on one person: start close on them.
  const overview = !params.selectedEmployee;
  const start = useMemo(() => {
    const focus = params.selectedEmployee ?? null;
    if (focus) return { latitude: focus.latitude, longitude: focus.longitude };
    if (employees.length === 0) return null;
    const sum = employees.reduce((acc, e) => ({ lat: acc.lat + e.latitude, lng: acc.lng + e.longitude }), { lat: 0, lng: 0 });
    return { latitude: sum.lat / employees.length, longitude: sum.lng / employees.length };
  }, [params.selectedEmployee, employees]);

  const fitEveryone = () => {
    if (!overview || employees.length < 2) return;
    mapRef.current?.fitToCoordinates(
      employees.map((e) => ({ latitude: e.latitude, longitude: e.longitude })),
      // The card's height is not known on the first frame; 140 is what it measures empty.
      { edgePadding: { top: 48, right: 48, bottom: Math.max(cardHeight, 140) + 48, left: 48 }, animated: false },
    );
  };

  // Everyone else whose clock-in landed on the selected person's spot. Only the top pin
  // of a stack can be tapped, so these are reached from the card instead.
  const sameSpot = useMemo(() => {
    if (!selectedEmployee) return [];
    const spot = spotOf(selectedEmployee);
    return employees.filter((e) => e.id !== selectedEmployee.id && spotOf(e) === spot);
  }, [employees, selectedEmployee]);

  const handleMarkerPress = (employee: EmployeeLocation) => {
    setSelectedEmployee(employee);
    mapRef.current?.animateToRegion({
      latitude: employee.latitude,
      longitude: employee.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 600);
  };

  const subtitle = employees.length > 0
    ? `${employees.length} ${employees.length === 1 ? 'person' : 'people'} on the map`
    : null;

  const header = (
    <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={C.ink} />
        </TouchableOpacity>
        <View style={styles.headerText} pointerEvents="none">
          <Text style={styles.headerTitle} numberOfLines={1}>Clock-in Map</Text>
          {subtitle ? <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>
    </SafeAreaView>
  );

  // Reached without anyone to show (no list passed, or nobody with a location).
  if (!start) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <AuthBackdrop scriptLines={[]} />
        {header}
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="map-marker-off-outline" size={28} color={C.muted} />
          <Text style={styles.emptyTitle}>No clock-in locations today</Text>
          <Text style={styles.emptyBody}>Office terminal clock-ins have a time but no place.</Text>
        </View>
      </View>
    );
  }

  const role = [selectedEmployee?.position, selectedEmployee?.department].filter(Boolean).join(' · ');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {header}

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: start.latitude,
          longitude: start.longitude,
          // Wide while fitEveryone has not run yet; one person (or one pin) starts close.
          latitudeDelta: overview && employees.length > 1 ? 0.05 : 0.01,
          longitudeDelta: overview && employees.length > 1 ? 0.05 : 0.01,
        }}
        onMapReady={fitEveryone}
        // Keeps Google's buttons and the selected pin clear of the card below.
        mapPadding={{ top: 0, right: 0, bottom: cardHeight, left: 0 }}
        showsUserLocation={showMe}
        showsMyLocationButton={showMe}
        showsCompass
      >
        {employees.map((employee) => {
          const selected = selectedEmployee?.id === employee.id;
          const left = Boolean(employee.checkOutTime);
          return (
            <Marker
              key={employee.id}
              coordinate={{ latitude: employee.latitude, longitude: employee.longitude }}
              title={employee.name}
              description={left ? `In ${employee.checkInTime} · out ${employee.checkOutTime}` : `Clocked in ${employee.checkInTime}`}
              pinColor={selected ? C.blue : PIN_IN}
              opacity={left && !selected ? LEFT_OPACITY : 1}
              // The selected pin sits on top of any others at the same spot.
              zIndex={selected ? 2 : 1}
              onPress={() => handleMarkerPress(employee)}
            />
          );
        })}
      </MapView>

      {/* The card pads itself above the home indicator / Android nav bar, which
          it used to sit under. */}
      <View
        style={[styles.bottomCard, { paddingBottom: 16 + insets.bottom }]}
        onLayout={(e) => setCardHeight(Math.round(e.nativeEvent.layout.height))}
      >
        {selectedEmployee ? (
          <>
            <View style={styles.employeeRow}>
              <View style={styles.employeeAvatar}>
                <Text style={styles.employeeAvatarText}>{personInitials(selectedEmployee.name)}</Text>
              </View>
              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName} numberOfLines={1}>{selectedEmployee.name || 'Unnamed employee'}</Text>
                {role ? <Text style={styles.employeeRole} numberOfLines={1}>{role}</Text> : null}
              </View>
              <View style={styles.times}>
                <View style={[styles.timePill, styles.timePillIn]}>
                  <Text style={[styles.timeText, styles.timeTextIn]} numberOfLines={1}>In {selectedEmployee.checkInTime}</Text>
                </View>
                {selectedEmployee.checkOutTime ? (
                  <View style={[styles.timePill, styles.timePillOut]}>
                    <Text style={[styles.timeText, styles.timeTextOut]} numberOfLines={1}>Out {selectedEmployee.checkOutTime}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {sameSpot.length > 0 ? (
              <View style={styles.alsoHere}>
                <Text style={styles.alsoLabel}>Same place</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.alsoRow}>
                  {sameSpot.map((e) => (
                    <TouchableOpacity
                      key={e.id}
                      style={styles.alsoChip}
                      onPress={() => setSelectedEmployee(e)}
                      hitSlop={{ top: 5, bottom: 5 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Show ${e.name}`}
                    >
                      <Text style={styles.alsoText} numberOfLines={1}>{e.name || 'Unnamed employee'}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </>
        ) : (
          <Text style={styles.hint}>Tap a pin to see who clocked in there.</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.page,
  },

  safeAreaTop: {
    backgroundColor: C.page,
    zIndex: 10,
  },
  header: { minHeight: 52, paddingHorizontal: 10, justifyContent: 'center' },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerText: {
    ...StyleSheet.absoluteFillObject,
    left: 60,
    right: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.ink },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 1 },

  emptyCard: {
    margin: 16,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    shadowColor: C.blue,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: C.ink, textAlign: 'center', marginTop: 4 },
  emptyBody: { fontSize: 13, lineHeight: 18, color: C.body, textAlign: 'center' },

  map: {
    flex: 1,
  },

  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  hint: { fontSize: 14, color: C.body, textAlign: 'center', paddingVertical: 6 },

  employeeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // Initials in ink on grey: blue is kept for buttons and the selected pin.
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  employeeAvatarText: { fontSize: 14, fontWeight: '700', color: C.ink, letterSpacing: 0.5 },
  employeeInfo: { flex: 1, minWidth: 0 },
  employeeName: { fontSize: 15, fontWeight: '700', color: C.ink },
  employeeRole: { fontSize: 12, color: C.body, marginTop: 1 },
  times: { flexShrink: 0, alignItems: 'flex-end', gap: 4 },
  timePill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  timePillIn: { backgroundColor: `${PIN_IN}1A` },
  timePillOut: { backgroundColor: '#EEF2F7' },
  timeText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  timeTextIn: { color: PIN_IN },
  timeTextOut: { color: C.body },

  alsoHere: { marginTop: 12, gap: 6 },
  alsoLabel: { fontSize: 12, color: C.muted },
  alsoRow: { gap: 8 },
  alsoChip: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: C.line,
  },
  alsoText: { fontSize: 13, fontWeight: '600', color: C.ink },
});

export default EmployeeMapScreen;
