import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import CardsScreen from '../screens/cards/CardsScreen';
import ContactsScreen from '../screens/contacts/ContactScreen';
import { RootTabParamList } from '../types';
import { createStackNavigator } from '@react-navigation/stack';
import AddCards from '../screens/cards/AddCards';
import EditCard from '../screens/contacts/EditCard';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.secondary,
        tabBarInactiveTintColor: COLORS.gray,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Cards"
        component={CardsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="credit-card" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="people" size={size} color={color} />
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
    </Stack.Navigator>
  );
}
