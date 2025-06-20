import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { validateCurrentToken } from '../../services/tokenValidationService';
import { auth } from '../../config/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

type SplashScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Splash'>;

export default function SplashScreen() {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const { isLoading, isAuthenticated, keepLoggedIn } = useAuth();
  const [authCheckStatus, setAuthCheckStatus] = useState<string>('Checking authentication...');
  const [minDisplayTimeElapsed, setMinDisplayTimeElapsed] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);

  // Ensure minimum display time for smooth UX
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinDisplayTimeElapsed(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Wait for Firebase auth state to be ready
  useEffect(() => {
    console.log('SplashScreen: Setting up Firebase auth state listener');
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('SplashScreen: Firebase auth state ready, user:', !!firebaseUser);
      setFirebaseReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Enhanced validation when everything is ready
  useEffect(() => {
    const validateAuthAndToken = async () => {
      if (!isLoading && firebaseReady && !validationComplete) {
        console.log('SplashScreen: Starting enhanced authentication validation');
        console.log('SplashScreen: Auth state:', { isAuthenticated, keepLoggedIn });
        console.log('SplashScreen: Firebase user:', !!auth.currentUser);
        
        setAuthCheckStatus('Validating session...');
        
        try {
          if (isAuthenticated && keepLoggedIn) {
            console.log('SplashScreen: User appears authenticated with keepLoggedIn enabled');
            setAuthCheckStatus('Welcome back!');
            
            // Check Firebase user exists
            const firebaseUser = auth.currentUser;
            if (!firebaseUser) {
              console.log('SplashScreen: No Firebase user found after auth state ready');
              setAuthCheckStatus('Session expired...');
              setValidationComplete(true);
              return;
            }
            
            console.log('SplashScreen: Firebase user confirmed:', firebaseUser.uid);
            
            // Validate stored token with Firebase user available
            console.log('SplashScreen: Validating stored token...');
            const isTokenValid = await validateCurrentToken();
            
            if (isTokenValid) {
              console.log('SplashScreen: Token validation successful');
              setAuthCheckStatus('Welcome back!');
            } else {
              console.log('SplashScreen: Token validation failed');
              setAuthCheckStatus('Session expired...');
            }
          } else {
            console.log('SplashScreen: User not authenticated or keepLoggedIn disabled');
            setAuthCheckStatus('Loading...');
          }
        } catch (error) {
          console.error('SplashScreen: Error during token validation:', error);
          setAuthCheckStatus('Authentication error...');
        }
        
        setValidationComplete(true);
      }
    };

    validateAuthAndToken();
  }, [isLoading, isAuthenticated, keepLoggedIn, firebaseReady, validationComplete]);

  // Handle navigation when all checks are complete
  useEffect(() => {
    if (!isLoading && minDisplayTimeElapsed && firebaseReady && validationComplete) {
      console.log('SplashScreen: All checks complete, determining navigation');
      console.log('SplashScreen: Final auth state:', { isAuthenticated, keepLoggedIn });
      console.log('SplashScreen: Firebase user:', !!auth.currentUser);
      
      if (isAuthenticated && keepLoggedIn && auth.currentUser) {
        console.log('SplashScreen: User authenticated with valid session');
        setTimeout(() => {
          console.log('SplashScreen: Navigating to MainApp');
          navigation.replace('MainApp');
        }, 500);
      } else {
        console.log('SplashScreen: Redirecting to SignIn');
        setTimeout(() => {
          console.log('SplashScreen: Navigating to SignIn');
          navigation.replace('SignIn');
        }, 500);
      }
    } else if (!isLoading && !minDisplayTimeElapsed && firebaseReady && validationComplete) {
      // Auth and token validation are ready but still showing splash for UX
      if (isAuthenticated && keepLoggedIn && auth.currentUser) {
        setAuthCheckStatus('Welcome back!');
      } else {
        setAuthCheckStatus('Loading...');
      }
    }
  }, [isLoading, isAuthenticated, keepLoggedIn, minDisplayTimeElapsed, firebaseReady, validationComplete, navigation]);

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