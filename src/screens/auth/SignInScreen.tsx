import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ScrollView, Animated } from 'react-native';
import { COLORS } from '../../constants/colors';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types';
import { MaterialIcons } from '@expo/vector-icons';
import { API_BASE_URL, ENDPOINTS, buildUrl } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ErrorPopup from '../../components/popups/ErrorPopup';
import { setKeepLoggedInPreference, storeAuthData, updateLastLoginTime } from '../../utils/authStorage';
import { ErrorHandler, ERROR_CODES, handleAuthError, handleNetworkError, createAppError } from '../../utils/errorHandler';

type SignInScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'SignIn'>;

// Add these admin credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@xscard.com',
  password: 'admin123'
};

export default function SignInScreen() {
  const navigation = useNavigation<SignInScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true); // Default to true for better UX
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [pendingVerificationUid, setPendingVerificationUid] = useState('');
  const [resendingVerification, setResendingVerification] = useState(false);

  // Animated values for smooth toggle
  const toggleAnimation = useRef(new Animated.Value(1)).current; // Start at 1 (on position)
  const backgroundColorAnimation = useRef(new Animated.Value(1)).current; // Start at 1 (active color)

  useEffect(() => {
    // Animate toggle when keepLoggedIn changes
    Animated.parallel([
      Animated.spring(toggleAnimation, {
        toValue: keepLoggedIn ? 1 : 0,
        tension: 100,
        friction: 8,
        useNativeDriver: false,
      }),
      Animated.timing(backgroundColorAnimation, {
        toValue: keepLoggedIn ? 1 : 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  }, [keepLoggedIn]);

  const handleTogglePress = () => {
    setKeepLoggedIn(!keepLoggedIn);
  };

  // const validateEmail = (email: string) => {
  //   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  //   return emailRegex.test(email);
  // };

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
    };

    let isValid = true;

    if (!email.trim()) {
      setErrorMessage('Email is required');
      setShowError(true);
      newErrors.email = 'Email is required';
      isValid = false;
    }
    // } else if (!validateEmail(email)) {
    //   setErrorMessage('Please enter a valid email address');
    //   setShowError(true);
    //   newErrors.email = 'Please enter a valid email address';
    //   isValid = false;
    // }

    if (!password) {
      setErrorMessage('Password is required');
      setShowError(true);
      newErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationUid) {
      setErrorMessage('Unable to resend verification. Please try signing up again.');
      setShowError(true);
      return;
    }

    setResendingVerification(true);

    try {
      const response = await fetch(buildUrl(`/resend-verification/${pendingVerificationUid}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setErrorMessage('Verification email sent! Please check your inbox and verify your email.');
        setShowError(true);
        console.log('Verification email resent successfully');
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.message || 'Failed to resend verification email. Please try again.');
        setShowError(true);
      }
    } catch (error) {
      console.error('Error resending verification:', error);
      setErrorMessage('Failed to resend verification email. Please check your connection and try again.');
      setShowError(true);
    } finally {
      setResendingVerification(false);
    }
  };

  const handleSignIn = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      console.log('SignIn: Starting backend authentication with email verification...');
      
      // Use your backend endpoint that enforces email verification
      const response = await fetch(buildUrl(ENDPOINTS.SIGN_IN), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('SignIn: Backend authentication successful');
        
        // Store the token and user data using our enhanced storage system
        const token = data.token;
        const finalUserData = {
          ...data.user,
          id: data.user.uid,
          name: data.user.name || '',
          email: data.user.email || ''
        };

        // Use our Phase 1 storage system to store all auth data
        await storeAuthData({
          userToken: token,
          userData: finalUserData,
          userRole: finalUserData.plan === 'admin' ? 'admin' : 'user',
          keepLoggedIn,
          lastLoginTime: Date.now(),
        });

        // Update last login time
        await updateLastLoginTime();

        console.log('SignIn: Data stored successfully, keepLoggedIn:', keepLoggedIn);
        
        navigation.replace('MainApp');
      } else {
        const errorData = await response.json();
        
        // Handle email verification required
        if (response.status === 403 && errorData.needsVerification) {
          console.log('SignIn: Email verification required');
          setNeedsVerification(true);
          setPendingVerificationUid(errorData.uid);
          setErrorMessage('Please verify your email before signing in. Check your inbox for the verification link.');
          setShowError(true);
          return;
        }
        
        // Handle other authentication errors
        let errorMessage = 'Authentication failed';
        
        if (response.status === 401) {
          errorMessage = 'Invalid email or password';
        } else if (response.status === 429) {
          errorMessage = errorData.message || 'Too many login attempts. Please try again later.';
        } else if (response.status === 404) {
          errorMessage = 'Account not found. Please check your email or sign up.';
        } else {
          errorMessage = errorData.message || 'Authentication failed';
        }
        
        const appError = createAppError(ERROR_CODES.AUTHENTICATION_FAILED, new Error(errorMessage));
        await handleAuthError(appError);
        setErrorMessage(errorMessage);
        setShowError(true);
      }
    } catch (error: any) {
      console.error('SignIn: Authentication error:', error);
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        await handleNetworkError(error, async () => {
          await handleSignIn();
        });
        setErrorMessage('Please check your internet connection and try again.');
      } else {
        // Handle other errors
        const appError = createAppError(ERROR_CODES.UNKNOWN_ERROR, error as Error);
        await ErrorHandler.handleError(appError);
        setErrorMessage(appError.userMessage);
      }
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
      <ErrorPopup
        visible={showError}
        message={errorMessage}
        onClose={() => setShowError(false)}
      />
      
      <Text style={styles.title}>Sign In</Text>

      <TextInput
        style={[styles.input, errors.email ? styles.inputError : null]}
        placeholder="Mail"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setErrors(prev => ({ ...prev, email: '' }));
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#999"
      />
      {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, styles.passwordInput, errors.password ? styles.inputError : null]}
          placeholder="Password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setErrors(prev => ({ ...prev, password: '' }));
          }}
          secureTextEntry={!showPassword}
          placeholderTextColor="#999"
        />
        <TouchableOpacity 
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
        >
          <MaterialIcons 
            name={showPassword ? "visibility" : "visibility-off"} 
            size={24} 
            color="#999" 
          />
        </TouchableOpacity>
      </View>
      {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
      
      <TouchableOpacity 
        style={styles.forgotPasswordLink}
        onPress={() => navigation.navigate('ForgotPassword')}
      >
        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
      </TouchableOpacity>

      {/* Keep me logged in toggle */}
      <View style={styles.keepLoggedInContainer}>
        <TouchableOpacity 
          style={styles.toggleTouchArea}
          onPress={handleTogglePress}
          activeOpacity={0.8}
        >
          <Animated.View 
            style={[
              styles.toggleSwitch,
              {
                backgroundColor: backgroundColorAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#FFFFFF', COLORS.primary],
                }),
                borderColor: backgroundColorAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#E0E0E0', COLORS.primary],
                }),
              }
            ]}
          >
            <Animated.View style={[
              styles.toggleThumb,
              {
                transform: [{
                  translateX: toggleAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 28], // More precise calculation: 60 - 24 - 8 (accounting for padding)
                  })
                }],
                backgroundColor: backgroundColorAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#E0E0E0', '#FFFFFF'],
                }),
              }
            ]} />
          </Animated.View>
          <Text style={styles.keepLoggedInText}>Keep me logged in</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.signInButton, isLoading && styles.disabledButton]}
        onPress={handleSignIn}
        disabled={isLoading}
      >
        <Text style={styles.signInButtonText}>
          {isLoading ? 'Signing In...' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      {/* Show resend verification button when needed */}
      {needsVerification && (
        <TouchableOpacity 
          style={[styles.resendButton, resendingVerification && styles.disabledButton]}
          onPress={handleResendVerification}
          disabled={resendingVerification}
        >
          <Text style={styles.resendButtonText}>
            {resendingVerification ? 'Sending...' : 'Resend Verification Email'}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.signUpContainer}>
        <Text style={styles.signUpText}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.signUpLink}>Sign Up</Text>
        </TouchableOpacity>
      </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.white,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  signInButton: {
    backgroundColor: '#1E1B4B',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  signInButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  resendButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signUpText: {
    color: '#666',
    fontSize: 16,
  },
  signUpLink: {
    color: COLORS.primary,
    fontSize: 16,
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 15,
  },
  passwordInput: {
    marginBottom: 0,
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 12,
    padding: 5,
  },
  disabledButton: {
    opacity: 0.7,
  },
  inputError: {
    borderColor: 'red',
    borderWidth: 1,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 15,
  },
  forgotPasswordLink: {
    alignItems: 'flex-end',
    marginTop: -10,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 12,
  },
  // New styles for Keep me logged in toggle
  keepLoggedInContainer: {
    marginTop: 10,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  toggleTouchArea: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  toggleSwitch: {
    width: 60,
    height: 32,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 3,
    marginBottom: 8,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    alignSelf: 'flex-start',
  },
  keepLoggedInText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});