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
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTheme } from '../context/ThemeContext';

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

const EmployeeMapScreen: React.FC<EmployeeMapScreenProps> = ({
  navigation: navProp, route: routeProp }) => {
  const { colors } = useTheme();
  const navigation = navProp || useNavigation();
  const route = routeProp || useRoute();
  const mapRef = useRef<MapView>(null);
  
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
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
        Alert.alert(
          'Permission Denied',
          'Location permission is required to show employee locations on the map.',
          [
            { text: 'Cancel', onPress: () => navigation?.goBack() },
            {
              text: 'Grant Permission',
              onPress: () => requestLocationPermission(),
            },
          ]
        );
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
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please try again.',
        [{ text: 'OK', onPress: () => navigation?.goBack() }]
      );
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      
      {/* Header */}
      <SafeAreaView style={styles.safeAreaTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation?.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Employee Map</Text>
          <View style={styles.placeholder} />
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
            fillColor="rgba(66, 133, 244, 0.1)"
            strokeColor="rgba(66, 133, 244, 0.3)"
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
                  color={selectedEmployee?.id === employee.id ? '#4285F4' : '#666'}
                />
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      {/* Bottom Info Card */}
      <View style={styles.bottomCard}>
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
                <Text style={styles.employeeName}>{selectedEmployee.name}</Text>
                {selectedEmployee.position && (
                  <Text style={styles.employeePosition}>{selectedEmployee.position}</Text>
                )}
                {selectedEmployee.department && (
                  <View style={styles.departmentRow}>
                    <MaterialCommunityIcons name="office-building" size={14} color={colors.textTertiary} />
                    <Text style={styles.employeeDepartment}>{selectedEmployee.department}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.locationDetails}>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="clock-outline" size={18} color={colors.primary} />
                <Text style={styles.detailLabel}>Check-in Time:</Text>
                <Text style={styles.detailValue}>{selectedEmployee.checkInTime}</Text>
              </View>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="map-marker" size={18} color={colors.primary} />
                <Text style={styles.detailLabel}>Location:</Text>
                <Text style={styles.detailValue}>
                  {selectedEmployee.latitude.toFixed(4)}, {selectedEmployee.longitude.toFixed(4)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation?.goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Back to List</Text>
            </TouchableOpacity>
          </>
        ) : (
          // Show default map info
          <>
            <View style={styles.mapIconContainer}>
              <View style={styles.mapIcon}>
                <View style={styles.googleIconRed} />
                <View style={styles.googleIconBlue} />
                <View style={styles.googleIconYellow} />
                <View style={styles.googleIconGreen} />
                <MaterialCommunityIcons
                  name="magnify"
                  size={24}
                  color="#00897B"
                  style={styles.searchIcon}
                />
              </View>
            </View>

            <Text style={styles.cardTitle}>Employee Map</Text>
            <Text style={styles.cardDescription}>
              Where your employee you can check gps
            </Text>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation?.goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
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
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  safeAreaTop: {
    backgroundColor: colors.surface,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  map: {
    flex: 1,
  },
  employeeMarker: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  employeeMarkerSelected: {
    borderWidth: 3,
    borderColor: colors.primary,
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'center',
  },
  mapIconContainer: {
    marginBottom: 16,
  },
  mapIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  googleIconRed: {
    position: 'absolute',
    top: 15,
    left: 15,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EA4335',
  },
  googleIconBlue: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  googleIconYellow: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FBBC04',
  },
  googleIconGreen: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#34A853',
  },
  searchIcon: {
    position: 'absolute',
    bottom: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: 24,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFE5E5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    textAlign: 'center',
  },
  employeeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  employeeAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  employeeAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  employeePosition: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  departmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  employeeDepartment: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  locationDetails: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
});

export default EmployeeMapScreen;
