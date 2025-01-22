import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types';

type SignUpScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'SignUp'>;

export default function SignUpScreen() {
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [status, setStatus] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignUp = async () => {
    try {
      const response = await fetch('https://b3f2-102-217-178-202.ngrok-free.app/AddUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phoneNumber,
          companyName,
          status,
          password
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        navigation.navigate('MainApp');
      } else {
        Alert.alert(
          'Signup Failed',
          data.message || 'Something went wrong during signup. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Network error occurred. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
      console.error('Error during signup:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Text style={styles.title}>Sign Up</Text>
          
          <TextInput
            style={styles.input}
            placeholder="First name..."
            value={firstName}
            onChangeText={setFirstName}
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.input}
            placeholder="Last name..."
            value={lastName}
            onChangeText={setLastName}
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.input}
            placeholder="Mail..."
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.input}
            placeholder="Phone number..."
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.input}
            placeholder="Company name..."
            value={companyName}
            onChangeText={setCompanyName}
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.input}
            placeholder="Status... (e.g. Software Developer)"
            value={status}
            onChangeText={setStatus}
            placeholderTextColor="#999"
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Password..."
              value={password}
              onChangeText={setPassword}
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

          <View style={styles.uploadSection}>
            <Text style={styles.uploadLabel}>Company Logo:</Text>
            <TouchableOpacity style={styles.uploadButton}>
              <MaterialIcons name="add" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.uploadSection}>
            <Text style={styles.uploadLabel}>Profile Picture:</Text>
            <TouchableOpacity style={styles.uploadButton}>
              <MaterialIcons name="add" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.signUpButton}
            onPress={handleSignUp}
          >
            <Text style={styles.signUpButtonText}>Sign Up</Text>
          </TouchableOpacity>

          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        <LinearGradient
          colors={['transparent', COLORS.white]}
          style={styles.fadeEffect}
          pointerEvents="none"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
    marginTop: 20,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  uploadSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  uploadLabel: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpButton: {
    backgroundColor: '#1E1B4B',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  signUpButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signInText: {
    color: '#666',
    fontSize: 16,
  },
  signInLink: {
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
  keyboardView: {
    flex: 1,
  },
  bottomPadding: {
    height: 50,
  },
  fadeEffect: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    zIndex: 1,
  },
}); 