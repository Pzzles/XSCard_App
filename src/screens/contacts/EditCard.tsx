import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Animated } from 'react-native';
import { COLORS, CARD_COLORS } from '../../constants/colors';
import Header from '../../components/Header';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { API_BASE_URL, ENDPOINTS, buildUrl } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

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

        setFormData({
          firstName: userData.name || '',
          lastName: userData.surname || '',
          occupation: userData.occupation || '',
          company: userData.company || '',
          email: userData.email || '',
          phoneNumber: userData.phone || '',
          whatsapp: userData.whatsapp || '',
          x: userData.x || '',
          facebook: userData.facebook || '',
          linkedin: userData.linkedin || '',
          website: userData.website || '',
          tiktok: userData.tiktok || '',
          instagram: userData.instagram || '',
          profileImage: userData.profileImage || '',
          companyLogo: userData.companyLogo || '',  // Add this line
        });

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

      // Only include fields that have values
      const updateData = {
        ...(formData.firstName && { name: formData.firstName }),
        ...(formData.lastName && { surname: formData.lastName }),
        ...(formData.occupation && { occupation: formData.occupation }),
        ...(formData.company && { company: formData.company }),
        ...(formData.email && { email: formData.email }),
        ...(formData.phoneNumber && { phone: formData.phoneNumber }),
        ...(formData.whatsapp && { whatsapp: formData.whatsapp }),
        ...(formData.x && { x: formData.x }),
        ...(formData.facebook && { facebook: formData.facebook }),
        ...(formData.linkedin && { linkedin: formData.linkedin }),
        ...(formData.website && { website: formData.website }),
        ...(formData.tiktok && { tiktok: formData.tiktok }),
        ...(formData.instagram && { instagram: formData.instagram }),
        colorScheme: selectedColor // Add color to user update
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

      Alert.alert('Success', 'Card updated successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);

    } catch (error) {
      console.error('Error updating card:', error);
      setError('Failed to update card');
    }
  };

  const handleSocialSelect = (socialId: string) => {
    if (selectedSocials.includes(socialId)) {
      setSelectedSocials(selectedSocials.filter(id => id !== socialId));
      setFormData({
        ...formData,
        [socialId]: undefined
      });
    } else {
      setSelectedSocials([...selectedSocials, socialId]);
      // Scroll to personal details section
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: 500, // Adjust this value based on your layout
          animated: true
        });
      }, 100);
    }
  };

  const handleProfileImageEdit = async () => {
    Alert.alert(
      "Update Profile Image",
      "Would you like to update your profile image?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Choose Method",
          onPress: () => showImageSourceOptions()
        }
      ]
    );
  };

  const showImageSourceOptions = () => {
    Alert.alert(
      "Select Image Source",
      "Choose where you want to pick your image from",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Camera",
          onPress: () => pickImage('camera')
        },
        {
          text: "Gallery",
          onPress: () => pickImage('gallery')
        }
      ]
    );
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

        Alert.alert('Success', 'Profile image updated successfully');
      }
    } catch (error) {
      console.error('Error updating profile image:', error);
      Alert.alert('Error', 'Failed to update profile image');
    }
  };

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

      <ScrollView 
        ref={scrollViewRef}
        style={styles.content}
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
          <TouchableOpacity style={styles.editLogoButton}>
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
                placeholder={`${socials.find(s => s.id === socialId)?.label} URL`}
                placeholderTextColor="#999"
                value={formData[socialId]}
                onChangeText={(text) => setFormData({...formData, [socialId]: text})}
              />
            </Animated.View>
          ))}
        </View>
      </ScrollView>
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
    marginBottom: 50,
  },
  logo: {
    width: '100%',
    height: undefined,
    aspectRatio: 16/9,
    resizeMode: 'cover',
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
});

