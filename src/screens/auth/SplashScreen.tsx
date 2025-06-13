import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types';
import { getStoredAuthData } from '../../utils/authStorage';
import { validateCurrentToken } from '../../services/tokenValidationService';

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

      // Wait minimum 1.5 seconds for smooth UX (instead of immediate navigation)
      const minDisplayTime = 1500;
      const startTime = Date.now();

      // Check stored authentication data
      const authData = await getStoredAuthData();
      console.log('SplashScreen: Auth data check complete:', !!authData);

      if (authData && authData.keepLoggedIn && authData.userToken) {
        console.log('SplashScreen: Found auth data with keepLoggedIn enabled');
        setAuthCheckStatus('Validating session...');

        // Validate the stored token
        const isTokenValid = await validateCurrentToken();
        console.log('SplashScreen: Token validation result:', isTokenValid);

        if (isTokenValid) {
          console.log('SplashScreen: Valid token found, navigating to MainApp');
          setAuthCheckStatus('Welcome back!');
          
          // Ensure minimum display time for smooth UX
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
          
          setTimeout(() => {
            navigation.replace('MainApp');
          }, remainingTime);
          
          return;
        } else {
          console.log('SplashScreen: Token validation failed, will navigate to SignIn');
          setAuthCheckStatus('Session expired...');
        }
      } else {
        console.log('SplashScreen: No valid auth data or keepLoggedIn disabled');
        setAuthCheckStatus('Loading...');
      }

      // Navigate to SignIn (either no auth data or invalid token)
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
      
      setTimeout(() => {
        console.log('SplashScreen: Navigating to SignIn');
        navigation.replace('SignIn');
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