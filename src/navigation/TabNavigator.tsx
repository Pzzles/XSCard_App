import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import CardsScreen from '../screens/cards/CardsScreen';
import ContactsScreen from '../screens/contacts/ContactScreen';
import { RootTabParamList, RootStackParamList } from '../types';
import { createStackNavigator } from '@react-navigation/stack';
import AddCards from '../screens/cards/AddCards';
import EditCard from '../screens/contacts/EditCard';
import { API_BASE_URL, ENDPOINTS, buildUrl } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import UnlockPremium from '../screens/Unlockpremium/UnlockPremium';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

function TabNavigator() {
  const [activeColor, setActiveColor] = useState(COLORS.secondary);

  useFocusEffect(
    React.useCallback(() => {
      loadUserColor();
    }, [])
  );

  const loadUserColor = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        
        // Fetch user details to get the color scheme
        const response = await fetch(buildUrl(ENDPOINTS.GET_USER) + `/${parsedUserData.id}`);
        const userData = await response.json();
        
        // Set color from user data
        if (userData.colorScheme) {
          setActiveColor(userData.colorScheme);
        }
      }
    } catch (error) {
      console.error('Error loading user color:', error);
    }
  };

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: '#eee',
          height: 90,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          padding: 4,
        },
        tabBarLabelStyle: {
          fontSize: 15,
          marginTop: 2,
          paddingBottom: 4,
        },
        headerShown: false,
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
      }}
    >
      <Tab.Screen
        name="Cards"
        component={CardsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="credit-card" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="people" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="AddCards" component={AddCards} />
      <Stack.Screen name="EditCard" component={EditCard} />
      <Stack.Screen name="UnlockPremium" component={UnlockPremium} />
    </Stack.Navigator>
  );
}
