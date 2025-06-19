import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types';
import { useAuth } from '../../context/AuthContext';

type SplashScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Splash'>;

export default function SplashScreen() {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const { isLoading, isAuthenticated, keepLoggedIn } = useAuth();
  const [authCheckStatus, setAuthCheckStatus] = useState<string>('Checking authentication...');
  const [minDisplayTimeElapsed, setMinDisplayTimeElapsed] = useState(false);

  // Ensure minimum display time for smooth UX
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinDisplayTimeElapsed(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Handle navigation when auth state is determined and minimum time has elapsed
  useEffect(() => {
    if (!isLoading && minDisplayTimeElapsed) {
      console.log('SplashScreen: Auth state determined:', { isAuthenticated, keepLoggedIn });
      
      if (isAuthenticated && keepLoggedIn) {
        console.log('SplashScreen: User authenticated with keepLoggedIn enabled');
        setAuthCheckStatus('Welcome back!');
        setTimeout(() => {
          console.log('SplashScreen: Navigating to MainApp');
          navigation.replace('MainApp');
        }, 500);
      } else {
        console.log('SplashScreen: User not authenticated or keepLoggedIn disabled');
        setAuthCheckStatus('Loading...');
        setTimeout(() => {
          console.log('SplashScreen: Navigating to SignIn');
          navigation.replace('SignIn');
        }, 500);
      }
    } else if (!isLoading && !minDisplayTimeElapsed) {
      // Auth is ready but still showing splash for UX
      if (isAuthenticated && keepLoggedIn) {
        setAuthCheckStatus('Welcome back!');
      } else {
        setAuthCheckStatus('Loading...');
      }
    }
  }, [isLoading, isAuthenticated, keepLoggedIn, minDisplayTimeElapsed, navigation]);

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