import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../types';
import { API_BASE_URL, ENDPOINTS, buildUrl } from '../../utils/api';
import * as ImagePicker from 'expo-image-picker';
import { pickImage, requestPermissions } from '../../utils/imageUtils';
import ErrorPopup from '../../components/popups/ErrorPopup';

type SignUpScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'SignUp'>;

export default function SignUpScreen() {
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [occupation, setOccupation] = useState(''); // Changed from status
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    companyName: '',
    occupation: '',
    password: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);

  const handleImagePick = async () => {
    const { cameraGranted, galleryGranted } = await requestPermissions();
    
    if (!cameraGranted || !galleryGranted) {
      Alert.alert('Permission Required', 'Camera and gallery permissions are required to use this feature.');
      return;
    }

    Alert.alert(
      'Select Image Source',
      'Choose where you want to pick your profile picture from',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const imageUri = await pickImage(true);
            if (imageUri) setProfileImage(imageUri);
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const imageUri = await pickImage(false);
            if (imageUri) setProfileImage(imageUri);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleLogoUpload = async () => {
    const { cameraGranted, galleryGranted } = await requestPermissions();
    
    if (!cameraGranted || !galleryGranted) {
      Alert.alert('Permission Required', 'Camera and gallery permissions are required to use this feature.');
      return;
    }

    Alert.alert(
      'Select Logo Source',
      'Choose where you want to pick your company logo from',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const imageUri = await pickImage(true);
            if (imageUri) setCompanyLogo(imageUri);
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const imageUri = await pickImage(false);
            if (imageUri) setCompanyLogo(imageUri);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    return phoneRegex.test(phone);
  };

  const validatePassword = (password: string) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };

  const validateForm = () => {
    const newErrors = {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      companyName: '',
      occupation: '',
      password: '',
    };

    let isValid = true;

    if (!firstName.trim()) {
      setErrorMessage('First name is required');
      setShowError(true);
      newErrors.firstName = 'First name is required';
      isValid = false;
    }

    if (!lastName.trim()) {
      setErrorMessage('Last name is required');
      setShowError(true);
      newErrors.lastName = 'Last name is required';
      isValid = false;
    }

    if (!email.trim()) {
      setErrorMessage('Email is required');
      setShowError(true);
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address');
      setShowError(true);
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!phoneNumber.trim()) {
      setErrorMessage('Phone number is required');
      setShowError(true);
      newErrors.phoneNumber = 'Phone number is required';
      isValid = false;
    } else if (!validatePhone(phoneNumber)) {
      setErrorMessage('Please enter a valid phone number');
      setShowError(true);
      newErrors.phoneNumber = 'Please enter a valid phone number';
      isValid = false;
    }

    if (!companyName.trim()) {
      setErrorMessage('Company name is required');
      setShowError(true);
      newErrors.companyName = 'Company name is required';
      isValid = false;
    }

    if (!occupation.trim()) {
      setErrorMessage('Occupation is required');
      setShowError(true);
      newErrors.occupation = 'Occupation is required';
      isValid = false;
    }

    if (!password) {
      setErrorMessage('Password is required');
      setShowError(true);
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (!validatePassword(password)) {
      setErrorMessage('Password must be at least 8 characters and contain uppercase, lowercase, and numbers');
      setShowError(true);
      newErrors.password = 'Password must be at least 8 characters and contain uppercase, lowercase, and numbers';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      // Create form data for multipart/form-data
      const formData = new FormData();
      formData.append('name', firstName);
      formData.append('surname', lastName);
      formData.append('email', email);
      formData.append('phone', phoneNumber);
      formData.append('password', password);
      formData.append('occupation', occupation);
      formData.append('company', companyName);
      formData.append('status', 'active');

      if (profileImage) {
        const imageName = profileImage.split('/').pop() || 'profile.jpg';
        formData.append('profileImage', {
          uri: profileImage,
          type: 'image/jpeg',
          name: imageName,
        } as any);
      }

      if (companyLogo) {
        const logoName = companyLogo.split('/').pop() || 'logo.jpg';
        formData.append('companyLogo', {
          uri: companyLogo,
          type: 'image/jpeg',
          name: logoName,
        } as any);
      }

      const response = await fetch(buildUrl(ENDPOINTS.ADD_USER), {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (response.ok) {
        Alert.alert(
          'Success',
          'Account created successfully! Please sign in.',
          [{ text: 'OK', onPress: () => navigation.navigate('SignIn') }]
        );
      } else {
        Alert.alert('Error', 'Failed to create account. Please try again.');
      }
    } catch (error) {
      setErrorMessage('Network error. Please check your connection.');
      setShowError(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ErrorPopup
        visible={showError}
        message={errorMessage}
        onClose={() => setShowError(false)}
      />
      
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
            style={[styles.input, errors.firstName ? styles.inputError : null]}
            placeholder="First name"
            value={firstName}
            onChangeText={(text) => {
              setFirstName(text);
              setErrors(prev => ({ ...prev, firstName: '' }));
            }}
            placeholderTextColor="#999"
          />
          {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}

          <TextInput
            style={[styles.input, errors.lastName ? styles.inputError : null]}
            placeholder="Last name"
            value={lastName}
            onChangeText={(text) => {
              setLastName(text);
              setErrors(prev => ({ ...prev, lastName: '' }));
            }}
            placeholderTextColor="#999"
          />
          {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}

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

          <TextInput
            style={[styles.input, errors.phoneNumber ? styles.inputError : null]}
            placeholder="Phone number"
            value={phoneNumber}
            onChangeText={(text) => {
              setPhoneNumber(text);
              setErrors(prev => ({ ...prev, phoneNumber: '' }));
            }}
            keyboardType="phone-pad"
            placeholderTextColor="#999"
          />
          {errors.phoneNumber ? <Text style={styles.errorText}>{errors.phoneNumber}</Text> : null}

          <TextInput
            style={[styles.input, errors.companyName ? styles.inputError : null]}
            placeholder="Company name"
            value={companyName}
            onChangeText={(text) => {
              setCompanyName(text);
              setErrors(prev => ({ ...prev, companyName: '' }));
            }}
            placeholderTextColor="#999"
          />
          {errors.companyName ? <Text style={styles.errorText}>{errors.companyName}</Text> : null}

          <TextInput
            style={[styles.input, errors.occupation ? styles.inputError : null]}
            placeholder="Occupation (e.g. Software Developer)"
            value={occupation}
            onChangeText={(text) => {
              setOccupation(text);
              setErrors(prev => ({ ...prev, occupation: '' }));
            }}
            placeholderTextColor="#999"
          />
          {errors.occupation ? <Text style={styles.errorText}>{errors.occupation}</Text> : null}

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

          <View style={styles.uploadSection}>
            <Text style={styles.uploadLabel}>Company Logo:</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={handleLogoUpload}>
              {companyLogo ? (
                <Image 
                  source={{ uri: companyLogo }} 
                  style={styles.profilePreview} 
                />
              ) : (
                <MaterialIcons name="add" size={24} color={COLORS.white} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.uploadSection}>
            <Text style={styles.uploadLabel}>Profile Picture:</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={handleImagePick}>
              {profileImage ? (
                <Image 
                  source={{ uri: profileImage }} 
                  style={styles.profilePreview} 
                />
              ) : (
                <MaterialIcons name="add" size={24} color={COLORS.white} />
              )}
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
  profilePreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
});