import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types';
import { getStoredAuthData, getKeepLoggedInPreference } from '../../utils/authStorage';

type SplashScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Splash'>;

export default function SplashScreen() {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const [authCheckStatus, setAuthCheckStatus] = useState<string>('Checking authentication...');

  useEffect(() => {
    checkAuthStatusAndNavigate();
  }, [navigation]);

  const checkAuthStatusAndNavigate = async () => {
    try {
      console.log('SplashScreen: Starting authentication check...');
      setAuthCheckStatus('Checking authentication...');

      // Wait minimum 1.5 seconds for smooth UX
      const minDisplayTime = 1500;
      const startTime = Date.now();

      // Check stored auth data and keep logged in preference
      const [authData, keepLoggedIn] = await Promise.all([
        getStoredAuthData(),
        getKeepLoggedInPreference()
      ]);

      console.log('SplashScreen: Auth data exists:', !!authData);
      console.log('SplashScreen: Keep logged in preference:', keepLoggedIn);

      let shouldNavigateToMainApp = false;

      if (authData && authData.userData && keepLoggedIn) {
        console.log('SplashScreen: Valid stored data with keepLoggedIn enabled');
        setAuthCheckStatus('Welcome back!');
        shouldNavigateToMainApp = true;
      } else {
        console.log('SplashScreen: No valid stored data or keepLoggedIn disabled');
        setAuthCheckStatus('Loading...');
        shouldNavigateToMainApp = false;
      }

      // Ensure minimum display time for smooth UX
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

      setTimeout(() => {
        if (shouldNavigateToMainApp) {
          console.log('SplashScreen: Navigating to MainApp');
          navigation.replace('MainApp');
        } else {
          console.log('SplashScreen: Navigating to SignIn');
          navigation.replace('SignIn');
        }
      }, remainingTime);

    } catch (error) {
      console.error('SplashScreen: Error during auth check:', error);
      setAuthCheckStatus('Loading...');
      
      // On error, default to SignIn after minimum display time
      setTimeout(() => {
        navigation.replace('SignIn');
      }, 1500);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/images/xslogo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
      <Text style={styles.statusText}>{authCheckStatus}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
  },
  loader: {
    marginTop: 30,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 20,
    opacity: 0.8,
    textAlign: 'center',
  },
}); 