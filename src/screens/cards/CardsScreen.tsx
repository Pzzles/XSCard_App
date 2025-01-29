import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Animated, ScrollView, ImageStyle, Modal, Linking, Alert, TextInput } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import Header from '../../components/Header';
import { API_BASE_URL, ENDPOINTS, buildUrl } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

interface UserData {
  id: string;
  name: string;
  surname: string;
  email: string;
  company: string;
  phone: string;  // Changed from phoneNumber to phone
  occupation: string;
  status: string;
  profileImage: string | null;
  companyLogo: string | null;  // Add this line
  colorScheme?: string;
}

interface CardData {
  CardId: string;
  Company: string;
  Email: string;
  PhoneNumber: string;
  title: string;
  socialLinks: string[];
  colorScheme?: string;
}

interface ShareOption {
  id: string;
  name: string;
  icon: 'whatsapp' | 'send' | 'email';
  color: string;
  action: (contact: string) => void;
}

export default function CardsScreen() {
  const [qrCode, setQrCode] = useState<string>('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const borderRotation = useRef(new Animated.Value(0)).current;
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardColor, setCardColor] = useState(COLORS.secondary);

  // Add loading state
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      setIsLoading(true);
      loadUserData().finally(() => {
        setIsLoading(false);
      });
    }, [])
  );

  const loadUserData = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        
        // Fetch user details first to get the color scheme
        const userResponse = await fetch(buildUrl(ENDPOINTS.GET_USER) + `/${parsedUserData.id}`);
        const userData = await userResponse.json();
        setUserData(userData);

        // Set color from user data
        if (userData.colorScheme) {
          setCardColor(userData.colorScheme);
        }

        // Then fetch card data
        const cardResponse = await fetch(buildUrl(ENDPOINTS.GET_CARD) + `/${parsedUserData.id}`);
        const cardData = await cardResponse.json();
        setCardData(cardData);

        // Generate QR code
        fetchQRCode(parsedUserData.id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const fetchQRCode = async (userId: string) => {
    try {
      const response = await fetch(buildUrl(ENDPOINTS.GENERATE_QR_CODE) + `/${userId}`, {
        method: 'GET',
        headers: {
          'Accept': 'image/png'
        }
      });
      
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setQrCode(reader.result);
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error fetching QR code:', error);
    }
  };

  useEffect(() => {
    Animated.timing(borderRotation, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start();
  }, []);

  const rotateInterpolate = borderRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const shareOptions: ShareOption[] = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: 'whatsapp',
      color: '#25D366',
      action: (number: string) => {
        const message = 'Check out my digital business card!';
        const whatsappUrl = `whatsapp://send?phone=${number}&text=${encodeURIComponent(message)}`;
        Linking.openURL(whatsappUrl).catch(() => {
          Alert.alert('Error', 'WhatsApp is not installed on your device');
        });
      }
    },
    // ... add other share options ...
  ];

  const handleShare = () => {
    setIsShareModalVisible(true);
  };

  const handlePlatformSelect = (platform: string) => {
    setSelectedPlatform(platform);
    setPhoneNumber('');
  };

  const handleSend = () => {
    const platform = shareOptions.find(opt => opt.id === selectedPlatform);
    if (platform && phoneNumber) {
      platform.action(phoneNumber);
      setIsShareModalVisible(false);
      setSelectedPlatform(null);
      setPhoneNumber('');
    }
  };

  // Move styles outside of StyleSheet for dynamic values
  const dynamicStyles = {
    sendButton: {
      flexDirection: 'row',
      backgroundColor: cardColor,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 25,
      alignItems: 'center',
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    shareButton: {
      flexDirection: 'row',
      backgroundColor: cardColor,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 25,
      alignItems: 'center',
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    input: {
      width: '80%',
      height: 40,
      borderColor: cardColor,
      borderWidth: 1,
      marginBottom: 20,
      padding: 10,
    }
  };

  return (
    <View style={styles.container}>
      <Header title="XS Card" />
      <ScrollView style={[styles.contentContainer, { marginTop: 100 }]}>
        <View style={styles.scrollContent}>
          <View style={styles.qrContainer}>
            {qrCode ? (
              <Image
                style={styles.qrCode}
                source={{ uri: qrCode }}
                resizeMode="contain"
                onError={(error) => console.log('Image loading error:', error.nativeEvent.error)}
              />
            ) : (
              <Text>Loading QR Code...</Text>
            )}
          </View>
          <View style={styles.logoContainer}>
            <Image
              style={styles.logo}
              source={userData?.companyLogo ? 
                { uri: `${API_BASE_URL}${userData.companyLogo}` } : 
                require('../../../assets/images/logoplaceholder.jpg')
              }
            />
            <View style={styles.profileOverlayContainer}>
              <Animated.View style={[styles.profileImageContainer, { transform: [{ rotate: rotateInterpolate }] }]}>
                <Image
                  style={styles.profileImage}
                  source={userData?.profileImage ? 
                    { uri: `${API_BASE_URL}${userData.profileImage}` } : 
                    require('../../../assets/images/profile.png')
                  }
                />
              </Animated.View>
            </View>
          </View>
          <Text style={[styles.name, styles.leftAligned]}>
            {userData ? `${userData.name} ${userData.surname}` : 'Loading...'}
          </Text>
          <Text style={[styles.position, styles.leftAligned]}>
            {cardData?.title || userData?.occupation || 'Loading...'}
          </Text>
          <Text style={[styles.company, styles.leftAligned]}>
            {cardData?.Company || userData?.company || 'Loading...'}
          </Text>
          
          <View style={[styles.contactBorder, styles.contactSection, styles.leftAligned]}>
            <MaterialCommunityIcons name="email-outline" size={30} color={cardColor} />
            <Text style={styles.contactText}>
              {cardData?.Email || userData?.email || 'Loading...'}
            </Text>
          </View>

          <View style={[styles.contactBorder, styles.contactSection, styles.leftAligned]}>
            <MaterialCommunityIcons name="phone-outline" size={30} color={cardColor} />
            <Text style={styles.contactText}>
              {userData?.phone || 'No phone number'}
            </Text>
          </View>

          {cardData?.socialLinks && cardData.socialLinks.length > 0 && (
            <View style={styles.socialLinksContainer}>
              {cardData.socialLinks.map((link, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.socialLink}
                  onPress={() => {/* Handle link press */}}
                >
                  <Text style={styles.socialLinkText}>{link}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity onPress={handleShare} style={[styles.shareButton, dynamicStyles.shareButton]}>
            <MaterialIcons name="share" size={24} color={COLORS.white} />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={isShareModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setIsShareModalVisible(false);
          setSelectedPlatform(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setIsShareModalVisible(false);
                setSelectedPlatform(null);
              }}
            >
              <MaterialIcons name="close" size={24} color={COLORS.black} />
            </TouchableOpacity>

            {!selectedPlatform ? (
              <>
                <Text style={styles.modalTitle}>Share via</Text>
                <View style={styles.shareOptions}>
                  {shareOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={styles.shareOption}
                      onPress={() => handlePlatformSelect(option.id)}
                    >
                      <View style={[styles.iconCircle, { backgroundColor: option.color }]}>
                        {option.id === 'whatsapp' ? (
                          <MaterialCommunityIcons name="whatsapp" size={24} color={COLORS.white} />
                        ) : (
                          <MaterialIcons name={option.icon as 'send' | 'email'} size={24} color={COLORS.white} />
                        )}
                      </View>
                      <Text style={styles.optionText}>{option.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.inputContainer}>
                <Text style={styles.modalTitle}>
                  Enter {selectedPlatform === 'email' ? 'email address' : 'phone number'}
                </Text>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  placeholder={selectedPlatform === 'email' ? 'Enter email' : 'Enter phone number'}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType={selectedPlatform === 'email' ? 'email-address' : 'phone-pad'}
                />
                <TouchableOpacity
                  style={[styles.sendButton, dynamicStyles.sendButton, !phoneNumber && styles.disabledButton]}
                  onPress={handleSend}
                  disabled={!phoneNumber}
                >
                  <Text style={styles.buttonText}>Send</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Keep static styles in StyleSheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  qrContainer: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  qrCode: {
    width: '100%',
    height: '100%',
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
    bottom: -40,
    left: '50%',
    transform: [{ translateX: -60 }], // Half of profile image width
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
  name: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 5,
    marginTop: 0,
    fontFamily: 'Montserrat-Bold',
    marginLeft:25,
  },
  position: {
    fontSize: 17,
    marginBottom: 5,
    fontFamily: 'Montserrat-Regular',
    marginLeft:25,
  },
  company: {
    fontSize: 17,
    marginBottom: 20,
    fontFamily: 'Montserrat-Regular',
    marginLeft:25,
  },
  contactSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    marginLeft:25,
  },
  contactText: {
    marginLeft: 10,
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
  },
  socialLinksContainer: {
    marginVertical: 15,
    width: '100%',
  },
  socialLink: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  socialLinkText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  leftAligned: {
    alignSelf: 'flex-start',
  },
  contactBorder: {
    borderWidth: 1,
    borderColor: 'rgba(27, 43, 91, 0.5)', // #1B2B5B with 50% opacity
    borderRadius: 8, // Optional: to make the corners rounded
    padding: 10, // Optional: to add some padding inside the border
    marginBottom: 15, // Space between sections
    shadowColor: '#1B2B5B', // Shadow color
    shadowOffset: {
      width: 0,
      height: 2, // Slightly increased height for a more natural shadow
    },
    shadowOpacity: 0.5, // Further reduced shadow opacity for a softer effect
    shadowRadius: 8, // Reduced elevation for Android shadow
  },
  shareButton: {}, // Keep empty or remove if using only dynamic style
  sendButton: {}, // Keep empty or remove if using only dynamic style
  input: {}, // Keep empty or remove if using only dynamic style
  shareButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 20,
    width: '80%',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  optionText: {
    fontSize: 16,
  },
  inputContainer: {
    width: '100%',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: COLORS.disabled,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
});