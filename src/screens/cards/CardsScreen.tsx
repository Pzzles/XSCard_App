import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Animated, ScrollView, ImageStyle, Modal, Linking, Alert, TextInput, ViewStyle, ActivityIndicator } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import Header from '../../components/Header';
import { API_BASE_URL, ENDPOINTS, buildUrl } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

interface CardData {
  CardId: string;
  Company: string;
  Email: string;
  PhoneNumber: string;
  title: string;
  socialLinks: string[];
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
  const [isWalletLoading, setIsWalletLoading] = useState(false);


  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Get logged in user data from AsyncStorage
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        
        // Fetch user details
        const userResponse = await fetch(buildUrl(ENDPOINTS.GET_USER) + `/${parsedUserData.id}`);
        const userData = await userResponse.json();
        setUserData(userData);

        // Use hardcoded card ID for now
        const cardId = parsedUserData.id;
        const cardResponse = await fetch(buildUrl(ENDPOINTS.GET_CARD) + `/${cardId}`);
        const cardData = await cardResponse.json();
        setCardData(cardData);

        // Generate QR code using logged in user's ID
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
        if (!userData?.id) {
          Alert.alert('Error', 'User data not available');
          return;
        }
        const saveContactUrl = `${API_BASE_URL}/saveContact.html?userId=${userData.id}`;
        const message = `Check out my digital business card! ${saveContactUrl}`;
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
        throw new Error(data.message || 'Failed to create wallet pass');
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
      {/* Scrollable Content */}
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
              source={require('../../../assets/images/logoplaceholder.jpg')}
            />
            {/* Profile Image Overlaying Logo */}
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
          
          {/* Email Section */}
          <View style={[styles.contactBorder, styles.contactSection, styles.leftAligned]}>
            <MaterialCommunityIcons name="email-outline" size={30} color={COLORS.secondary} />
            <Text style={styles.contactText}>
              {cardData?.Email || userData?.email || 'Loading...'}
            </Text>
          </View>

          {/* Phone Section */}
          <View style={[styles.contactBorder, styles.contactSection, styles.leftAligned]}>
            <MaterialCommunityIcons name="phone-outline" size={30} color={COLORS.secondary} />
            <Text style={styles.contactText}>
              {userData?.phone || 'No phone number'}
            </Text>
          </View>

          {/* Social Links */}
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

          <TouchableOpacity style={styles.sendButton}>
            <MaterialIcons name="send" style={[styles.sendButtonIcon, { color: COLORS.light }]} />
            <Text style={styles.sendButtonText}>Send</Text>
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
                  Add to Google Wallet
                </Text>
              </>
            )}
          </TouchableOpacity>
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
    marginTop:20,
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
    marginLeft:25,
  },
  contactText: {
    marginLeft: 10,
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
  },
  sendButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000', // Shadow color
    shadowOffset: {
      width: 0,
      height: 2, // Vertical shadow offset
    },
    shadowOpacity: 0.3, // Shadow opacity
    shadowRadius: 4, // Shadow blur radius
    elevation: 3, // For Android shadow
  },
  sendButtonIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  sendButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
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
  walletButton: {
    marginTop: 10,
  },
  walletButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
});