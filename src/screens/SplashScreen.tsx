import React, { useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/colors';

interface SplashScreenProps {
  onFinish: (isAuthenticated: boolean) => void;
}

const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const { checkAuth } = useAuth();
  
  useEffect(() => {
    const checkAuthentication = async () => {
      // Add a small delay to show the splash screen
      await new Promise(resolve => setTimeout(resolve, 2500));
      const isAuthenticated = await checkAuth();
      onFinish(isAuthenticated);
    };
    
    checkAuthentication();
  }, []);

  return (
    <View style={styles.container}>
      {/* Use the correct path to the logo */}
      <Image 
        source={require('../../assets/images/xslogo.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.black,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 30,
  },
  loader: {
    marginTop: 20,
  },
});

export default SplashScreen; 