import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Image, Platform, KeyboardAvoidingView } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Animated } from 'react-native';
import { COLORS, CARD_COLORS } from '../../constants/colors';
import Header from '../../components/Header';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { API_BASE_URL, ENDPOINTS, buildUrl } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import Modal from 'react-native-modal';

// Add this interface for the form data type
interface FormData {
  firstName: string;
  lastName: string;
  occupation: string;
  company: string;
  email: string;
  phoneNumber: string;
  whatsapp?: string;
  x?: string;
  facebook?: string;
  linkedin?: string;
  website?: string;
  tiktok?: string;
  instagram?: string;
  profileImage?: string;
  companyLogo?: string;  // Add this line
  [key: string]: string | undefined;  // Index signature to allow dynamic social media fields
}

interface CustomModalProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttons: Array<{
    text: string;
    type?: 'cancel' | 'confirm';
    onPress: () => void;
  }>;
}

export default function EditCard() {
  const navigation = useNavigation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    occupation: '',
    company: '',
    email: '',
    phoneNumber: '',
    whatsapp: '',
    x: '',
    facebook: '',
    linkedin: '',
    website: '',
    tiktok: '',
    instagram: '',
    profileImage: '',
    companyLogo: '',  // Add this line
  });
  const [selectedColor, setSelectedColor] = useState('#1B2B5B'); // Default color
  const [selectedSocials, setSelectedSocials] = useState<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [isImageSourceModalVisible, setIsImageSourceModalVisible] = useState(false);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [currentSocialToRemove, setCurrentSocialToRemove] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'profile' | 'logo' | null>(null);
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        
        const response = await fetch(buildUrl(ENDPOINTS.GET_USER) + `/${parsedUserData.id}`);
        const userData = await response.json();

        // Set the selected color from userData
        setSelectedColor(userData.colorScheme || '#1B2B5B');

        // Set form data
        setFormData({
          firstName: userData.name || '',
          lastName: userData.surname || '',
          occupation: userData.occupation || '',
          company: userData.company || '',
          email: userData.email || '',
          phoneNumber: userData.phone || '',
          // Only set social media values if they exist and aren't null
          ...(userData.whatsapp && { whatsapp: userData.whatsapp }),
          ...(userData.x && { x: userData.x }),
          ...(userData.facebook && { facebook: userData.facebook }),
          ...(userData.linkedin && { linkedin: userData.linkedin }),
          ...(userData.website && { website: userData.website }),
          ...(userData.tiktok && { tiktok: userData.tiktok }),
          ...(userData.instagram && { instagram: userData.instagram }),
          profileImage: userData.profileImage || '',
          companyLogo: userData.companyLogo || '',
        });

        // Only select socials that have non-null values
        const existingSocials = Object.entries(userData)
          .filter(([key, value]) => {
            return ['whatsapp', 'x', 'facebook', 'linkedin', 'website', 'tiktok', 'instagram']
              .includes(key) && typeof value === 'string' && value.trim() !== '';
          })
          .map(([key]) => key);

        setSelectedSocials(existingSocials);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user data');
      setLoading(false);
    }
  };

  // Add this type for the socials array
  interface Social {
    id: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;  // This ensures the icon name is valid
    label: string;
    color: string;
  }

  // Update the socials array with the correct type
  const socials: Social[] = [
    { id: 'whatsapp', icon: 'whatsapp', label: 'WhatsApp', color: '#25D366' },
    { id: 'x', icon: 'twitter', label: 'X', color: '#000000' },
    { id: 'facebook', icon: 'facebook', label: 'Facebook', color: '#1877F2' },
    { id: 'linkedin', icon: 'linkedin', label: 'LinkedIn', color: '#0A66C2' },
    { id: 'website', icon: 'web', label: 'Website', color: '#4285F4' },
    { id: 'tiktok', icon: 'music-note', label: 'TikTok', color: '#000000' },
    { id: 'instagram', icon: 'instagram', label: 'Instagram', color: '#E4405F' },
  ];

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

  const handleSave = async () => {
    try {
      if (!validateForm()) {
        return;
      }

      const storedUserData = await AsyncStorage.getItem('userData');
      if (!storedUserData) {
        setError('User data not found');
        return;
      }

      const { id } = JSON.parse(storedUserData);

      // Create an object with all social fields explicitly set to null
      const socialFields: Record<string, string | null> = {
        whatsapp: null,
        x: null,
        facebook: null,
        linkedin: null,
        website: null,
        tiktok: null,
        instagram: null
      };

      // Update only the selected socials with their values
      selectedSocials.forEach(socialId => {
        if (formData[socialId]) {
          socialFields[socialId] = formData[socialId];
        }
      });

      // Combine the social fields with other user data
      const updateData = {
        ...(formData.firstName && { name: formData.firstName }),
        ...(formData.lastName && { surname: formData.lastName }),
        ...(formData.occupation && { occupation: formData.occupation }),
        ...(formData.company && { company: formData.company }),
        ...(formData.email && { email: formData.email }),
        ...(formData.phoneNumber && { phone: formData.phoneNumber }),
        ...socialFields,  // Include all social fields, including nulls
        colorScheme: selectedColor
      };

      const response = await fetch(buildUrl(ENDPOINTS.UPDATE_USER) + `/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      // Get fresh user data
      const updatedUserResponse = await fetch(buildUrl(ENDPOINTS.GET_USER) + `/${id}`);
      const updatedUserData = await updatedUserResponse.json();

      // Update AsyncStorage with fresh data
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));

      setModalMessage('Card updated successfully');
      setIsSuccessModalVisible(true);

    } catch (error) {
      console.error('Error updating card:', error);
      setError('Failed to update card');
    }
  };

  const handleSocialSelect = (socialId: string) => {
    if (selectedSocials.includes(socialId)) {
      setCurrentSocialToRemove(socialId);
      setIsConfirmModalVisible(true);
    } else {
      setSelectedSocials([...selectedSocials, socialId]);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: 500,
          animated: true
        });
      }, 100);
    }
  };

  const handleProfileImageEdit = () => {
    setModalType('profile');
    setIsImageSourceModalVisible(true);
  };

  const handleLogoEdit = () => {
    setModalType('logo');
    setIsImageSourceModalVisible(true);
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      let result;
      
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Sorry, we need camera permissions to make this work!');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Sorry, we need gallery permissions to make this work!');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
        });
      }

      if (!result.canceled) {
        const storedUserData = await AsyncStorage.getItem('userData');
        if (!storedUserData) {
          setError('User data not found');
          return;
        }

        const { id } = JSON.parse(storedUserData);

        // Create form data
        const formData = new FormData();
        formData.append('profileImage', {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'profile-image.jpg',
        } as any);

        // Use separate profile image endpoint
        const response = await fetch(buildUrl(ENDPOINTS.UPDATE_PROFILE_IMAGE).replace(':id', id), {
          method: 'PATCH',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to update profile image');
        }

        const updatedUserData = await response.json();
        
        // Update the local state
        setFormData(prev => ({
          ...prev,
          profileImage: updatedUserData.profileImage // Data comes directly, not nested
        }));

        // Update AsyncStorage
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));

        setModalMessage(`${modalType === 'profile' ? 'Profile picture' : 'Logo'} updated successfully`);
        setIsSuccessModalVisible(true);
      }
    } catch (error) {
      console.error('Error updating profile image:', error);
      Alert.alert('Error', 'Failed to update profile image');
    }
  };

  const pickLogo = async (source: 'camera' | 'gallery') => {
    try {
      let result;
      
      // Define size constraints (in pixels)
      const MIN_WIDTH = 800;
      const MAX_WIDTH = 3000;
      const MIN_HEIGHT = 450;  // For 16:9 ratio with MIN_WIDTH
      const MAX_HEIGHT = 1688; // For 16:9 ratio with MAX_WIDTH
      
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
        // Add size constraints
        exif: true // To get image dimensions
      };

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Sorry, we need camera permissions to make this work!');
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Sorry, we need gallery permissions to make this work!');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets[0]) {
        const selectedImage = result.assets[0];
        
        // Get image dimensions
        const { width, height } = await new Promise<{ width: number; height: number }>((resolve) => {
          Image.getSize(selectedImage.uri, (width, height) => {
            resolve({ width, height });
          });
        });

        // Validate image dimensions
        if (width < MIN_WIDTH || height < MIN_HEIGHT) {
          setModalMessage(`Image is too small. Minimum dimensions are ${MIN_WIDTH}x${MIN_HEIGHT} pixels.`);
          setIsSuccessModalVisible(true);
          return;
        }

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          setModalMessage(`Image is too large. Maximum dimensions are ${MAX_WIDTH}x${MAX_HEIGHT} pixels.`);
          setIsSuccessModalVisible(true);
          return;
        }

        // Check aspect ratio
        const aspectRatio = width / height;
        const targetRatio = 16 / 9;
        const RATIO_TOLERANCE = 0.1; // 10% tolerance

        if (Math.abs(aspectRatio - targetRatio) > RATIO_TOLERANCE) {
          setModalMessage('Please select an image closer to 16:9 aspect ratio for optimal display.');
          setIsSuccessModalVisible(true);
          return;
        }

        // Continue with upload if image meets requirements
        const storedUserData = await AsyncStorage.getItem('userData');
        if (!storedUserData) {
          setError('User data not found');
          return;
        }

        const { id } = JSON.parse(storedUserData);

        const formData = new FormData();
        formData.append('companyLogo', {
          uri: selectedImage.uri,
          type: 'image/jpeg',
          name: 'company-logo.jpg',
        } as any);

        const response = await fetch(buildUrl(ENDPOINTS.UPDATE_COMPANY_LOGO).replace(':id', id), {
          method: 'PATCH',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to update company logo');
        }

        const updatedUserData = await response.json();
        
        setFormData(prev => ({
          ...prev,
          companyLogo: updatedUserData.companyLogo
        }));

        await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));

        setModalMessage('Logo updated successfully');
        setIsSuccessModalVisible(true);
      }
    } catch (error) {
      console.error('Error updating company logo:', error);
      Alert.alert('Error', 'Failed to update company logo');
    }
  };

  const CustomModal = ({ isVisible, onClose, title, message, buttons }: CustomModalProps) => (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      animationIn="fadeIn"
      animationOut="fadeOut"
      backdropOpacity={0.5}
      style={{ margin: 20 }}
    >
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalMessage}>{message}</Text>
        <View style={styles.modalButtonsContainer}>
          {buttons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.modalButton,
                button.type === 'cancel' && styles.modalButtonCancel,
                button.type === 'confirm' && styles.modalButtonConfirm
              ]}
              onPress={button.onPress}
            >
              <Text style={[
                styles.modalButtonText,
                button.type === 'cancel' && styles.modalButtonTextCancel
              ]}>
                {button.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Header title="Edit Card" />
      
      {/* Cancel and Preview buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveButton}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 30 : 0} //check this
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Warning Message */}
          <View style={styles.colorSection}>
            <Text style={styles.sectionTitle}>Card color</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorContainer}
            >
              {CARD_COLORS.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedColor(color)}
                  style={styles.colorButtonWrapper}
                >
                  <View style={[
                    styles.colorButton,
                    { backgroundColor: color },
                    selectedColor === color && styles.selectedColor,
                  ]} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Images & Layout Section */}
          <Text style={styles.sectionTitle}>Images & layout</Text>
          <View style={styles.logoContainer}>
            <Image
              style={styles.logo}
              source={formData.companyLogo ? 
                { uri: `${API_BASE_URL}${formData.companyLogo}` } : 
                require('../../../assets/images/logoplaceholder.jpg')
              }
            />
            <TouchableOpacity 
              style={styles.editLogoButton}
              onPress={handleLogoEdit}
            >
              <MaterialIcons name="edit" size={24} color={COLORS.white} />
            </TouchableOpacity>
            
            {/* Profile Image Overlaying Logo */}
            <View style={styles.profileOverlayContainer}>
              <View style={styles.profileImageContainer}>
                <Image
                  style={styles.profileImage}
                  source={
                    formData.profileImage
                      ? { uri: `${API_BASE_URL}${formData.profileImage}` }
                      : require('../../../assets/images/profile.png')
                  }
                />
                <TouchableOpacity 
                  style={styles.editProfileButton}
                  onPress={handleProfileImageEdit}
                >
                  <MaterialIcons name="edit" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Link Socials Section */}
          <Text style={styles.sectionTitle}>Link Socials</Text>
          <View style={styles.socialsGrid}>
            {socials.map((social) => (
              <TouchableOpacity
                key={social.id}
                style={[
                  styles.socialItem,
                  selectedSocials.includes(social.id) && styles.selectedSocialItem
                ]}
                onPress={() => handleSocialSelect(social.id)}
              >
                <MaterialCommunityIcons
                  name={social.icon || 'link'}
                  size={24}
                  color={social.color}
                />
                <Text style={styles.socialLabel}>{social.label}</Text>
              </TouchableOpacity>
            ))}
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

            {/* Social Media URL Inputs */}
            {selectedSocials.map((socialId) => (
              <Animated.View 
                key={socialId}
                style={styles.socialInputContainer}
              >
                <View style={styles.socialInputHeader}>
                  <MaterialCommunityIcons
                    name={socials.find(s => s.id === socialId)?.icon || 'link'}
                    size={24}
                    color={socials.find(s => s.id === socialId)?.color}
                  />
                  <Text style={styles.socialInputLabel}>
                    {socials.find(s => s.id === socialId)?.label}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleSocialSelect(socialId)}
                    style={styles.removeSocialButton}
                  >
                    <MaterialIcons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={`${socials.find(s => s.id === socialId)?.label} ${
                    socialId === 'website' ? 'URL' : 
                    socialId === 'whatsapp' ? 'number' : 
                    'username (without @)'
                  }`}
                  placeholderTextColor="#999"
                  value={formData[socialId]}
                  onChangeText={(text) => {
                    // Remove @ symbol if user includes it
                    const cleanText = text.startsWith('@') ? text.substring(1) : text;
                    setFormData({...formData, [socialId]: cleanText});
                  }}
                  keyboardType={socialId === 'whatsapp' ? 'phone-pad' : 'default'}
                />
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomModal
        isVisible={isConfirmModalVisible}
        onClose={() => setIsConfirmModalVisible(false)}
        title="Remove Social Link"
        message="Are you sure you want to remove this social link? Any entered data will be lost."
        buttons={[
          {
            text: 'Cancel',
            type: 'cancel',
            onPress: () => setIsConfirmModalVisible(false)
          },
          {
            text: 'Remove',
            type: 'confirm',
            onPress: () => {
              if (currentSocialToRemove) {
                setSelectedSocials(selectedSocials.filter(id => id !== currentSocialToRemove));
                setFormData({
                  ...formData,
                  [currentSocialToRemove]: undefined
                });
              }
              setIsConfirmModalVisible(false);
            }
          }
        ]}
      />

      <CustomModal
        isVisible={isImageSourceModalVisible}
        onClose={() => setIsImageSourceModalVisible(false)}
        title={`Select ${modalType === 'profile' ? 'Profile Picture' : 'Logo'} Source`}
        message="Choose where you want to pick your image from"
        buttons={[
          {
            text: 'Camera',
            type: 'confirm',
            onPress: () => {
              setIsImageSourceModalVisible(false);
              modalType === 'profile' ? pickImage('camera') : pickLogo('camera');
            }
          },
          {
            text: 'Gallery',
            type: 'confirm',
            onPress: () => {
              setIsImageSourceModalVisible(false);
              modalType === 'profile' ? pickImage('gallery') : pickLogo('gallery');
            }
          },
          {
            text: 'Cancel',
            type: 'cancel',
            onPress: () => setIsImageSourceModalVisible(false)
          }
        ]}
      />

      <CustomModal
        isVisible={isSuccessModalVisible}
        onClose={() => setIsSuccessModalVisible(false)}
        title="Success"
        message={modalMessage}
        buttons={[
          {
            text: 'OK',
            type: 'confirm',
            onPress: () => {
              setIsSuccessModalVisible(false);
              if (modalMessage.includes('Card updated')) {
                navigation.goBack();
              }
            }
          }
        ]}
      />
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
    marginTop: 130,
    marginBottom: 20,
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
    top: 96,
    left: 0,
    right: 0,
    zIndex: 1,
    paddingVertical: 10,
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
  colorSection: {
    marginTop: 20,
    marginBottom: 24,
  },
  colorContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
    flexDirection: 'row',
  },
  colorButtonWrapper: {
    padding: 3, // Space for the selection border
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 4,
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
  },
  logoContainer: {
    width: '100%',
    position: 'relative',
    overflow: 'visible',
    marginLeft: -20,
    marginRight: -20,
    alignSelf: 'center',
    marginBottom: 80,
  },
  logo: {
    width: '100%',
    height: undefined,
    aspectRatio: 16/9,
    resizeMode: 'contain',
    backgroundColor: '#F8F8F8', // Light background to show logo bounds
    marginHorizontal: 0,
  },
  profileOverlayContainer: {
    position: 'absolute',
    bottom: -80,
    left: '50%',
    transform: [{ translateX: -60 }],
    alignItems: 'center',
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 5,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  editLogoButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  editProfileButton: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  socialsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  socialItem: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  selectedSocialItem: {
    backgroundColor: '#E8E8E8',
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  socialLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    color: COLORS.black,
  },
  socialInputContainer: {
    marginBottom: 12,
  },
  socialInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  socialInputLabel: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
    color: COLORS.black,
  },
  removeSocialButton: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 20,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: COLORS.black,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    color: COLORS.black,
    textAlign: 'center',
  },
  modalButtonsContainer: {
    flexDirection: 'column',
    gap: 10,
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F0F0F0',
  },
  modalButtonConfirm: {
    backgroundColor: COLORS.primary,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.white,
  },
  modalButtonTextCancel: {
    color: COLORS.black,
  },
});

