import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types';
import { getStoredAuthData, getKeepLoggedInPreference } from '../../utils/authStorage';
import { validateCurrentToken } from '../../services/tokenValidationService';
// Firebase integration
import { auth } from '../../config/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

type SplashScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Splash'>;

export default function SplashScreen() {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const [authCheckStatus, setAuthCheckStatus] = useState<string>('Checking authentication...');

  useEffect(() => {
    checkAuthStatusAndNavigate();
  }, [navigation]);

  const checkAuthStatusAndNavigate = async () => {
    try {
      console.log('SplashScreen: Starting Firebase-enhanced authentication check...');
      setAuthCheckStatus('Checking authentication...');

      // Wait minimum 1.5 seconds for smooth UX (instead of immediate navigation)
      const minDisplayTime = 1500;
      const startTime = Date.now();

      // Set up Firebase auth state listener for immediate auth check
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          console.log('SplashScreen: Firebase auth state:', !!firebaseUser);

          if (firebaseUser) {
            console.log('SplashScreen: Firebase user authenticated:', firebaseUser.uid);
            setAuthCheckStatus('Validating session...');

            // Check if we have stored user data and keepLoggedIn preference
            const [authData, keepLoggedIn] = await Promise.all([
              getStoredAuthData(),
              getKeepLoggedInPreference()
            ]);

            console.log('SplashScreen: Auth data exists:', !!authData);
            console.log('SplashScreen: Keep logged in preference:', keepLoggedIn);

            if (authData && authData.userData && keepLoggedIn) {
              console.log('SplashScreen: Valid stored data with keepLoggedIn enabled');
              setAuthCheckStatus('Welcome back!');
              
              // Firebase user is authenticated and we have stored data
              // Firebase auth state listener in AuthContext will handle token refresh
              const elapsedTime = Date.now() - startTime;
              const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
              
              setTimeout(() => {
                console.log('SplashScreen: Navigating to MainApp with Firebase auth');
                unsubscribe(); // Clean up listener
                navigation.replace('MainApp');
              }, remainingTime);
              
              return;
            } else if (!keepLoggedIn) {
              console.log('SplashScreen: Firebase user exists but keepLoggedIn is disabled');
              setAuthCheckStatus('Session expired...');
              
              // User exists in Firebase but doesn't want to stay logged in
              // Sign them out and go to SignIn
              try {
                await auth.signOut();
                console.log('SplashScreen: Signed out Firebase user due to keepLoggedIn=false');
              } catch (signOutError) {
                console.error('SplashScreen: Error signing out Firebase user:', signOutError);
              }
            } else {
              console.log('SplashScreen: Firebase user exists but no stored user data');
              setAuthCheckStatus('Setting up your session...');
              
              // Firebase user exists but no stored data - this might be a fresh login
              // Let the auth flow handle this in SignIn screen
            }
          } else {
            console.log('SplashScreen: No Firebase user authenticated');
            setAuthCheckStatus('Loading...');
          }

          // Navigate to SignIn (either no Firebase user, no keepLoggedIn, or missing data)
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
          
          setTimeout(() => {
            console.log('SplashScreen: Navigating to SignIn');
            unsubscribe(); // Clean up listener
            navigation.replace('SignIn');
          }, remainingTime);

        } catch (error) {
          console.error('SplashScreen: Error in Firebase auth state handler:', error);
          setAuthCheckStatus('Loading...');
          
          // On error in auth state handler, default to SignIn
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
          
          setTimeout(() => {
            unsubscribe(); // Clean up listener
            navigation.replace('SignIn');
          }, remainingTime);
        }
      });

      // Set up a timeout to ensure we don't wait forever
      setTimeout(() => {
        console.log('SplashScreen: Auth check timeout, defaulting to SignIn');
        unsubscribe();
        navigation.replace('SignIn');
      }, 5000); // 5 second timeout

    } catch (error) {
      console.error('SplashScreen: Error during auth check setup:', error);
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