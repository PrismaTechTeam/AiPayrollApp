/**
 * Bottom Navigation Bar Component
 * Reusable bottom navigation bar for all screens
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

interface BottomNavBarProps {
  activeScreen?: 'home' | 'documents' | 'requests' | 'profile';
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeScreen }) => {
  const navigation = useNavigation();

  const getIconColor = (screen: string) => {
    return activeScreen === screen ? '#4285F4' : '#BDBDBD';
  };

  const handleHomePress = () => {
    navigation.navigate('PayrollHome' as never);
  };

  const handleDocumentsPress = () => {
    // TODO: Navigate to documents screen when created
    console.log('Documents pressed');
  };

  const handleRequestsPress = () => {
    navigation.navigate('Requests' as never);
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile' as never);
  };

  return (
    <SafeAreaView style={styles.navBarContainer} edges={['bottom']}>
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navItem} onPress={handleHomePress}>
          <MaterialCommunityIcons 
            name="home-outline" 
            size={28} 
            color={getIconColor('home')} 
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={handleDocumentsPress}>
          <MaterialCommunityIcons 
            name="card-text-outline" 
            size={28} 
            color={getIconColor('documents')} 
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={handleRequestsPress}>
          <MaterialCommunityIcons 
            name="email-outline" 
            size={28} 
            color={getIconColor('requests')} 
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={handleProfilePress}>
          <MaterialCommunityIcons 
            name="account-outline" 
            size={28} 
            color={getIconColor('profile')} 
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  navBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
  },
  navBar: {
    height: 60,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
