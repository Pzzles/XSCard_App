import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Animated, ScrollView, ImageStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
    Animated.loop(
      Animated.timing(borderRotation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, [borderRotation]);

  const rotateInterpolate = borderRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Header title="XS Card" />
      {/* Scrollable Content */}
      <ScrollView style={[styles.contentContainer, { marginTop: 120 }]}>
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
                  source={require('../../../assets/images/profile.png')}
                />
              </Animated.View>
            </View>
          </View>
          <Text style={styles.name}>
            {userData ? `${userData.name} ${userData.surname}` : 'Loading...'}
          </Text>
          <Text style={styles.position}>{cardData?.title || userData?.occupation || 'Loading...'}</Text>
          <Text style={styles.company}>{cardData?.Company || userData?.company || 'Loading...'}</Text>
          
          {/* Email Section */}
          <View style={styles.contactSection}>
            <MaterialIcons name="email" size={24} color={COLORS.secondary} />
            <Text style={styles.contactText}>{cardData?.Email || userData?.email || 'Loading...'}</Text>
          </View>

          {/* Phone Section */}
          <View style={styles.contactSection}>
            <MaterialIcons name="phone" size={24} color={COLORS.secondary} />
            <Text style={styles.contactText}>{userData?.phone || 'No phone number'}</Text>
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  qrContainer: {
    width: 300,
    height: 300,
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
    marginBottom: 60,
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
    borderColor: COLORS.primary,
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 20,
  },
  position: {
    fontSize: 16,
    color: COLORS.secondary,
    marginBottom: 5,
  },
  company: {
    fontSize: 18,
    marginBottom: 20,
  },
  contactSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  contactText: {
    marginLeft: 10,
    fontSize: 16,
  },
  sendButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
  },
  sendButtonIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  sendButtonText: {
    color: COLORS.light,
    fontSize: 16,
    fontWeight: 'bold',
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
});