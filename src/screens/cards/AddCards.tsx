import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import Header from '../../components/Header';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { authenticatedFetch, ENDPOINTS, getUserId, buildUrl, API_BASE_URL } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { pickImage, requestPermissions } from '../../utils/imageUtils';

type AddCardsNavigationProp = StackNavigationProp<RootStackParamList>;

export default function AddCards() {
  const navigation = useNavigation<AddCardsNavigationProp>();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    occupation: '',
    company: '',
    email: '',
    phoneNumber: '',
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  const handleCancel = () => {
    navigation.goBack();
  };

  const validateForm = () => {
    if (!formData.company || !formData.email || !formData.phoneNumber || !formData.occupation) {
      setError('Please fill in all required fields');
      return false;
    }
    setError('');
    return true;
  };

  const handleProfileImagePick = async () => {
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

  const handleAdd = async () => {
    try {
      if (!validateForm()) {
        return;
      }

      const userId = await getUserId();
      const token = await AsyncStorage.getItem('userToken');

      if (!userId || !token) {
        Alert.alert('Error', 'Please login first');
        return;
      }

      const form = new FormData();
      
      // Use formData state to append values
      form.append('company', formData.company);
      form.append('email', formData.email);
      form.append('phone', formData.phoneNumber);
      form.append('title', formData.occupation);
      form.append('name', formData.firstName);
      form.append('surname', formData.lastName);

      if (profileImage) {
        const imageName = profileImage.split('/').pop() || 'profile.jpg';
        form.append('profileImage', {
          uri: profileImage,
          type: 'image/jpeg',
          name: imageName,
        } as any);
      }

      if (companyLogo) {
        const logoName = companyLogo.split('/').pop() || 'logo.jpg';
        form.append('companyLogo', {
          uri: companyLogo,
          type: 'image/jpeg',
          name: logoName,
        } as any);
      }

      const response = await fetch(buildUrl(ENDPOINTS.ADD_CARD), {
        method: 'POST',
        headers: {
          'Authorization': `${token}`,  // Add token here
        },
        body: form,
      });

      const responseData = await response.json();
      console.log('Server Response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to create card');
      }

      Alert.alert('Success', 'Card created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);

    } catch (error) {
      console.error('Error creating card:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create card');
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Add Card" />
      
      {/* Cancel and Save buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleAdd}>
          <Text style={styles.saveButton}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 30 : 0}
      >
        <ScrollView 
          style={styles.content}
          contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 20 : 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Warning Message */}
          <View style={styles.warningBox}>
            <MaterialIcons name="info" size={20} color={COLORS.black} />
            <Text style={styles.warningText}>
              New Card, new you! Create a card that will help you connect with your network. 
            </Text>
          </View>

          {/* Images & Layout Section */}
          <Text style={styles.sectionTitle}>Images & layout</Text>
          <View style={styles.imageButtons}>
            <TouchableOpacity style={styles.imageButton} onPress={handleProfileImagePick}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.imagePreview} />
              ) : (
                <>
                  <MaterialIcons name="add" size={24} color={COLORS.black} />
                  <Text style={styles.buttonText}>Profile Picture</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.imageButton} onPress={handleLogoUpload}>
              {companyLogo ? (
                <Image source={{ uri: companyLogo }} style={styles.imagePreview} />
              ) : (
                <>
                  <MaterialIcons name="add" size={24} color={COLORS.black} />
                  <Text style={styles.buttonText}>Company logo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Personal Details Section */}
          <Text style={styles.sectionTitle}>Personal details</Text>
          <View style={styles.form}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TextInput 
              style={styles.input}
              placeholder="First name"
              placeholderTextColor="#999"
              value={formData.firstName}
              onChangeText={(text) => setFormData({...formData, firstName: text})}
            />
            <TextInput 
              style={styles.input}
              placeholder="Occupation"
              placeholderTextColor="#999"
              value={formData.occupation}
              onChangeText={(text) => setFormData({...formData, occupation: text})}
            />
            <TextInput 
              style={styles.input}
              placeholder="Last name"
              placeholderTextColor="#999"
              value={formData.lastName}
              onChangeText={(text) => setFormData({...formData, lastName: text})}
            />
            <TextInput 
              style={styles.input}
              placeholder="Company name"
              placeholderTextColor="#999"
              value={formData.company}
              onChangeText={(text) => setFormData({...formData, company: text})}
            />
            <TextInput 
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={formData.email}
              onChangeText={(text) => setFormData({...formData, email: text})}
              keyboardType="email-address"
            />
            <TextInput 
              style={styles.input}
              placeholder="Phone number"
              placeholderTextColor="#999"
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData({...formData, phoneNumber: text})}
              keyboardType="phone-pad"
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: { 
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 150,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    marginTop: 0,
  },
  warningText: {
    marginLeft: 8,
    color: COLORS.black,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
    color: COLORS.black,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  imageButton: {
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  buttonText: {
    color: COLORS.black,
    marginLeft: 4,
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    zIndex: 1,
    paddingVertical: 0,
    backgroundColor: COLORS.white,
  },
  cancelButton: {
    color: '#666',
    fontSize: 16,
  },
  saveButton: {
    color: '#666',
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#1E1B4B',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  imagePreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
