import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '../context/ColorSchemeContext';
import { API_BASE_URL, authenticatedFetch } from '../utils/api';

// Update this type to match your actual navigation type
type RootStackParamList = {
  MainTabs: undefined;
  AddCards: undefined;
  EditCard: undefined;
  SignIn: undefined;
  UnlockPremium: undefined;
  Cards: undefined;
  Contacts: undefined;
  AdminDashboard: undefined;
  MainApp: undefined;
};

interface HeaderProps {
  title: string;
  rightIcon?: React.ReactNode;
  showAddButton?: boolean;
}

export default function Header({ title, rightIcon, showAddButton = false }: HeaderProps) {
  const [userPlan, setUserPlan] = useState<string>('free');
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const { colorScheme } = useColorScheme();

  // Add this useEffect to get the user's plan
  useEffect(() => {
    const getUserPlan = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const { plan } = JSON.parse(userData);
          setUserPlan(plan);
        }
      } catch (error) {
        console.error('Error fetching user plan:', error);
      }
    };

    getUserPlan();
  }, []);

  const handleAddPress = () => {
    navigation.navigate('AddCards');
  };

  const handleEditPress = () => {
    navigation.navigate('EditCard');
  };

  const handleLogout = async () => {
    try {
      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('userToken');
      
      if (token) {
        try {
          // Call backend logout endpoint using api utilities
          await fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            headers: {
              'Authorization': token,
              'Content-Type': 'application/json'
            }
          });
          console.log('Successfully logged out on server');
        } catch (error) {
          console.error('Error during server logout:', error);
          // Continue with local logout even if server logout fails
        }
      }
      
      // Clear local storage and navigate regardless of server response
      await AsyncStorage.clear();
      navigation.reset({
        index: 0,
        routes: [{ name: 'SignIn' }],
      });
    } catch (error) {
      console.error('Error during logout:', error);
      // If everything fails, still try to navigate to sign in
      navigation.reset({
        index: 0,
        routes: [{ name: 'SignIn' }],
      });
    }
  };

  const handleNavigate = async (screenName: keyof RootStackParamList) => {
    setIsMenuVisible(false);
    try {
      // For AdminDashboard, just navigate directly
      if (screenName === 'AdminDashboard') {
        navigation.navigate('AdminDashboard');
      } else {
        navigation.navigate(screenName);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Failed to navigate. Please try again.');
    }
  };

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.icon}
          onPress={() => setIsMenuVisible(true)}
        >
          <Text style={styles.iconContainer}>
            <MaterialIcons name="menu" size={24} color={COLORS.black} />
          </Text>
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>

        <View style={styles.rightIconContainer}>
          {showAddButton && userPlan !== 'free' && userPlan !== 'enterprise' && (
            <TouchableOpacity style={styles.icon} onPress={handleAddPress}>
              <Text style={styles.iconContainer}>
                <MaterialIcons name="add" size={24} color={COLORS.black} />
              </Text>
            </TouchableOpacity>
          )}
          {rightIcon}
        </View>
      </View>

      <Modal
        visible={isMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            {userPlan !== 'free' && (
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => handleNavigate('AdminDashboard')}
              >
                <MaterialIcons name="dashboard" size={24} color={COLORS.secondary} />
                <Text style={[styles.menuText, { color: COLORS.secondary }]}>Dashboard</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => handleNavigate('Cards')}
            >
              <MaterialIcons name="credit-card" size={24} color={COLORS.secondary} />
              <Text style={[styles.menuText, { color: COLORS.secondary }]}>Cards</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => handleNavigate('Contacts')}
            >
              <MaterialIcons name="people" size={24} color={COLORS.secondary} />
              <Text style={[styles.menuText, { color: COLORS.secondary }]}>Contacts</Text>
            </TouchableOpacity>

            {userPlan !== 'enterprise' && (
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => handleNavigate('UnlockPremium')}
              >
                <MaterialIcons 
                  name={userPlan === 'free' ? "star" : "settings"} 
                  size={24} 
                  color={COLORS.secondary} 
                />
                <Text style={[styles.menuText, { color: COLORS.secondary }]}>
                  {userPlan === 'free' ? 'Unlock Premium' : 'Manage Subscription'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleLogout}
            >
              <MaterialIcons name="logout" size={24} color={COLORS.error} />
              <Text style={[styles.menuText, { color: COLORS.error }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.white,
    zIndex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  titleContainer: {
    paddingTop: 52,
    position: 'absolute',
    left: '55%',
    transform: [{ translateX: '-50%' }],
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  icon: {
    width: 24,
    height: 24,
    marginHorizontal: 4,
  },
  iconContainer: {
    flexDirection: 'row',
  },
  rightIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.secondary,
  },
});