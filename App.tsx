import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from './src/constants/colors';
import AuthNavigator from './src/navigation/AuthNavigator';
import { ColorSchemeProvider } from './src/context/ColorSchemeContext';

export default function App() {
  return (
    <ColorSchemeProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={COLORS.white} />
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
          <AuthNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </ColorSchemeProvider>
  );
}