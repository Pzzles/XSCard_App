import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Animated, ScrollView, ImageStyle, Modal, Linking, Alert, TextInput, ViewStyle, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import Header from '../../components/Header';
import { API_BASE_URL, ENDPOINTS, buildUrl } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';

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
  socialLinks: {
    platform: string;
    url: string;
  }[];
  colorScheme?: string;
}

interface ShareOption {
  id: string;
  name: string;
  icon: 'whatsapp' | 'send' | 'email';
  color: string;
  action: () => void;
}

// Add this mapping for social icons
const socialIcons: { [key: string]: keyof typeof MaterialCommunityIcons.glyphMap } = {
  whatsapp: 'whatsapp',
  x: 'twitter',
  facebook: 'facebook',
  linkedin: 'linkedin',
  website: 'web',
  tiktok: 'music-note',
  instagram: 'instagram'
};

// Add this mapping for social media base URLs
const socialBaseUrls: { [key: string]: string } = {
  whatsapp: 'https://wa.me/',  // WhatsApp expects phone number
  x: 'https://x.com/',  // X (Twitter)
  facebook: 'https://facebook.com/',
  linkedin: 'https://linkedin.com/in/',
  website: '',  // Website should already include http(s)://
  tiktok: 'https://tiktok.com/@',
  instagram: 'https://instagram.com/'
};

export default function CardsScreen() {
  const [qrCode, setQrCode] = useState<string>('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [cardData, setCardData] = useState<CardData | null>(null);
  const borderRotation = useRef(new Animated.Value(0)).current;
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [cardColor, setCardColor] = useState(COLORS.secondary);

  // Add loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isWalletLoading, setIsWalletLoading] = useState(false);

  // Add these new state variables at the beginning of the CardsScreen component
  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'email' | 'phone' | null>(null);
  const [modalData, setModalData] = useState<string>('');

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

        // Log the userData to see what we're getting
        console.log('Loaded user data:', userData);

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
      action: async () => {
        if (!userData?.id) {
          Alert.alert('Error', 'User data not available');
          return;
        }
        const saveContactUrl = `${API_BASE_URL}/saveContact.html?userId=${userData.id}`;
        const message = `Check out my digital business card! ${saveContactUrl}`;
        Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`).catch(() => {
          Alert.alert('Error', 'WhatsApp is not installed on your device');
        });
      }
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: 'send',
      color: '#0088cc',
      action: async () => {
        if (!userData?.id) {
          Alert.alert('Error', 'User data not available');
          return;
        }
        const saveContactUrl = `${API_BASE_URL}/saveContact.html?userId=${userData.id}`;
        const message = `Check out my digital business card! ${saveContactUrl}`;
        Linking.openURL(`tg://msg?text=${encodeURIComponent(message)}`).catch(() => {
          Alert.alert('Error', 'Telegram is not installed on your device');
        });
      }
    },
    {
      id: 'email',
      name: 'Email',
      icon: 'email',
      color: '#EA4335',
      action: async () => {
        if (!userData?.id) {
          Alert.alert('Error', 'User data not available');
          return;
        }
        const saveContactUrl = `${API_BASE_URL}/saveContact.html?userId=${userData.id}`;
        const message = `Check out my digital business card! ${saveContactUrl}`;
        const emailUrl = `mailto:?subject=Digital Business Card&body=${encodeURIComponent(message)}`;
        Linking.openURL(emailUrl).catch(() => {
          Alert.alert('Error', 'Could not open email client');
        });
      }
    }
  ];

  const handlePlatformSelect = (platform: string) => {
    const selectedOption = shareOptions.find(opt => opt.id === platform);
    if (selectedOption) {
      selectedOption.action();
      setIsShareModalVisible(false);
      setSelectedPlatform(null);
    }
  };

  const handleAddToWallet = async () => {
    if (!userData?.id) {
      Alert.alert('Error', 'User data not available');
      return;
    }

    setIsWalletLoading(true);
    try {
      const response = await fetch(buildUrl(ENDPOINTS.ADD_TO_WALLET.replace(':id', userData.id)), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create wallet pass' + data.message);
      }

      // Open the pass page URL in browser
      if (data.passPageUrl) {
        await Linking.openURL(data.passPageUrl);
      } else {
        throw new Error('No pass page URL received');
      }

    } catch (error) {
      console.error('Error adding to wallet:', error);
      Alert.alert('Error', 'Failed to add to Google Wallet');
    } finally {
      setIsWalletLoading(false);
    }
  };

  const handleEmailPress = (email: string) => {
    setModalType('email');
    setModalData(email);
    setIsOptionsModalVisible(true);
  };

  const handlePhonePress = (phone: string) => {
    setModalType('phone');
    setModalData(phone);
    setIsOptionsModalVisible(true);
  };

  // Move styles outside of StyleSheet for dynamic values
  const dynamicStyles: Record<string, ViewStyle> = {
    sendButton: {
      flexDirection: 'row',
      backgroundColor: cardColor,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 25,
      alignItems: 'center' as const,
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
      alignItems: 'center' as const,
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
    },
    contactBorder: {
      borderWidth: 1,
      borderColor: cardColor,
      borderRadius: 8,
      padding: 10,
      marginBottom: 15,
      shadowColor: '#1B2B5B',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.5,
      shadowRadius: 8,
    },
    qrContainer: {
      width: 170,
      height: 170,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 20,
      backgroundColor: '#fff',
      marginTop: 20,
      borderWidth: 4,
      borderColor: cardColor,
      borderRadius: 10,
      padding: 10,
    },
    walletButton: {
      flexDirection: 'row',
      backgroundColor: COLORS.white,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 25,
      alignItems: 'center' as const,
      marginBottom: 20,
      borderWidth: 2,
      borderColor: cardColor,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
  };

  return (
    <View style={styles.container}>
      <Header title="XS Card" />
      <ScrollView style={[styles.contentContainer, { marginTop: 100 }]}>
        <View style={styles.scrollContent}>
          <View style={dynamicStyles.qrContainer}>
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
          
          {/* Update the email contact section */}
          <TouchableOpacity 
            style={[styles.contactSection, styles.leftAligned]}
            onPress={() => {
              const email = cardData?.Email || userData?.email;
              if (email && email !== 'Loading...') {
                handleEmailPress(email);
              }
            }}
          >
            <MaterialCommunityIcons name="email-outline" size={30} color={cardColor} />
            <Text style={styles.contactText}>
              {cardData?.Email || userData?.email || 'Loading...'}
            </Text>
          </TouchableOpacity>

          {/* Update the phone contact section */}
          <TouchableOpacity 
            style={[styles.contactSection, styles.leftAligned]}
            onPress={() => {
              const phone = userData?.phone;
              if (phone && phone !== 'No phone number') {
                handlePhonePress(phone);
              }
            }}
          >
            <MaterialCommunityIcons name="phone-outline" size={30} color={cardColor} />
            <Text style={styles.contactText}>
              {userData?.phone || 'No phone number'}
            </Text>
          </TouchableOpacity>

          {/* Replace the existing social links section with this: */}
          {userData && (
            <View style={styles.socialLinksContainer}>
              {Object.entries(userData).map(([key, value]) => {
                if (socialIcons[key] && value && value.trim() !== '') {
                  return (
                    <TouchableOpacity 
                      key={key}
                      style={[styles.contactSection, styles.leftAligned]}
                      onPress={() => {
                        if (value) {
                          let url = value;
                          // If it's not a website (which should include http(s)://) and not already a full URL
                          if (key !== 'website' && !url.startsWith('http://') && !url.startsWith('https://')) {
                            // Remove any @ symbol from the username if present
                            const username = url.startsWith('@') ? url.substring(1) : url;
                            // For WhatsApp, remove any non-numeric characters
                            if (key === 'whatsapp') {
                              const phoneNumber = username.replace(/\D/g, '');
                              url = `${socialBaseUrls[key]}${phoneNumber}`;
                            } else {
                              url = `${socialBaseUrls[key]}${username}`;
                            }
                          } else if (key === 'website' && !url.startsWith('http://') && !url.startsWith('https://')) {
                            url = 'https://' + url;
                          }
                          
                          Linking.openURL(url).catch(() => {
                            Alert.alert('Error', 'Could not open link');
                          });
                        }
                      }}
                    >
                      <MaterialCommunityIcons 
                        name={socialIcons[key]} 
                        size={30} 
                        color={cardColor} 
                      />
                      <Text style={[styles.contactText, { color: '#333' }]}>
                        {value}
                      </Text>
                    </TouchableOpacity>
                  );
                }
                return null;
              })}
            </View>
          )}

          <TouchableOpacity onPress={() => setIsShareModalVisible(true)} style={[styles.shareButton, dynamicStyles.shareButton]}>
            <MaterialIcons name="share" size={24} color={COLORS.white} />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleAddToWallet} 
            style={[styles.walletButton, dynamicStyles.walletButton]}
            disabled={isWalletLoading}
          >
            {isWalletLoading ? (
              <ActivityIndicator size="small" color={cardColor} />
            ) : (
              <>
                <MaterialCommunityIcons name="wallet" size={24} color={cardColor} />
                <Text style={[styles.walletButtonText, { color: cardColor }]}>
                  Add to {Platform.OS === 'ios' ? 'Apple' : 'Google'} Wallet
                </Text>
              </>
            )}
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
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isOptionsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOptionsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsOptionsModalVisible(false)}
            >
              <MaterialIcons name="close" size={24} color={COLORS.black} />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>
              {modalType === 'email' ? 'Email Options' : 'Phone Options'}
            </Text>

            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[styles.optionButton, { backgroundColor: cardColor }]}
                onPress={async () => {
                  await Clipboard.setStringAsync(modalData);
                  setIsOptionsModalVisible(false);
                  Alert.alert('Success', `${modalType === 'email' ? 'Email' : 'Phone number'} copied to clipboard`);
                }}
              >
                <MaterialIcons name="content-copy" size={24} color={COLORS.white} />
                <Text style={styles.optionButtonText}>
                  Copy {modalType === 'email' ? 'Email' : 'Number'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionButton, { backgroundColor: cardColor }]}
                onPress={() => {
                  const url = modalType === 'email' ? `mailto:${modalData}` : `tel:${modalData}`;
                  Linking.openURL(url).catch(() => {
                    Alert.alert('Error', `Could not open ${modalType === 'email' ? 'email' : 'phone'} app`);
                  });
                  setIsOptionsModalVisible(false);
                }}
              >
                <MaterialIcons 
                  name={modalType === 'email' ? 'email' : 'phone'} 
                  size={24} 
                  color={COLORS.white} 
                />
                <Text style={styles.optionButtonText}>
                  {modalType === 'email' ? 'Send Email' : 'Call'}
                </Text>
              </TouchableOpacity>
            </View>
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
    width: 170,
    height: 170,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 20,
    backgroundColor: '#fff',
    marginTop: 20,
    borderWidth: 4,
    borderColor: COLORS.secondary,
    borderRadius: 10,
    padding: 10,
  },
  qrCode: {
    width: 150,
    height: 150,
  },
  logoContainer: {
    width: '100%',
    position: 'relative',
    overflow: 'visible',
    marginLeft: -20,
    marginRight: -20,
    alignSelf: 'center',
    marginBottom: 75,
  },
  logo: {
    width: '100%',
    height: undefined,
    aspectRatio: 16/9,
    resizeMode: 'contain',
    backgroundColor: '#F8F8F8',
    marginHorizontal: 0,
  },
  profileOverlayContainer: {
    position: 'absolute',
    bottom: -80,
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
    marginTop: 20,
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
    padding: 5,
    borderRadius: 8,
    marginLeft:17,
  },
  contactText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  socialLinksContainer: {
    marginVertical: 5,
    width: '100%',
    paddingHorizontal: 10,
    marginRight:20,
  },
  leftAligned: {
    alignSelf: 'stretch',
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
    maxWidth: 300,
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
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  shareOption: {
    padding: 10,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
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
  walletButton: {
    marginTop: 10,
  },
  walletButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
  optionsContainer: {
    width: '100%',
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 10,
  },
  optionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
});