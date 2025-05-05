import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from './src/constants/colors';
import AuthNavigator from './src/navigation/AuthNavigator';
import TabNavigator from './src/navigation/TabNavigator';
import DashboardNavigator from './src/navigation/DashboardNavigator';
import { ColorSchemeProvider } from './src/context/ColorSchemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import SplashScreen from './src/screens/SplashScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContent = () => {
  const { isAuthenticated, isLoading, userData } = useAuth();
  const [initializing, setInitializing] = useState(true);

  const handleSplashFinish = async (authenticated: boolean) => {
    setInitializing(false);
  };

  if (initializing) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          primary: COLORS.primary,
          background: COLORS.background,
          card: COLORS.white,
          text: COLORS.black,
          border: COLORS.gray + '20',
          notification: COLORS.primary,
        },
        fonts: {
          regular: {
            fontFamily: 'System',
            fontWeight: '400',
          },
          medium: {
            fontFamily: 'System',
            fontWeight: '500',
          },
          bold: {
            fontFamily: 'System',
            fontWeight: '700',
          },
          heavy: {
            fontFamily: 'System',
            fontWeight: '900',
          },
        },
      }}
      onStateChange={(state) => {
        // Optional: Add navigation state logging for debugging
        console.log('New navigation state:', state);
      }}
    >
      {isLoading ? (
        <SplashScreen onFinish={handleSplashFinish} />
      ) : isAuthenticated ? (
        // Check if user is admin, if so show admin dashboard
        userData?.userRole === 'admin' ? <DashboardNavigator /> : <TabNavigator />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ColorSchemeProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" backgroundColor={COLORS.white} />
          <AppContent />
        </SafeAreaProvider>
      </ColorSchemeProvider>
    </AuthProvider>
  );
}