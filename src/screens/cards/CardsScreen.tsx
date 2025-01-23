import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Animated, ScrollView, ImageStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import Header from '../../components/Header';
import { API_BASE_URL, ENDPOINTS, buildUrl } from '../../utils/api';


export default function CardsScreen() {
  const [qrCode, setQrCode] = useState<string>('');
  const borderRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchQRCode();
  }, []);

  const fetchQRCode = async () => {
    try {
      const response = await fetch(buildUrl(ENDPOINTS.GENERATE_QR_CODE), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'image/png'
        },
        body: JSON.stringify({
          name: "Xolisa Ndaba",
          status: "Software Project Manager"
        })
      });
      
      // Get the response as a blob
      const blob = await response.blob();
      
      // Create a FileReader to convert blob to base64
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
          <Text style={styles.name}>Xolisa</Text>
          <Text style={styles.position}>Software Project Manager</Text>
          <Text style={styles.company}>XSpark</Text>
          
          {/* Email Section */}
          <View style={styles.contactSection}>
            <MaterialIcons name="email" size={24} color={COLORS.secondary} />
            <Text style={styles.contactText}>xolisa@xspark.com</Text>
          </View>

          {/* Phone Section */}
          <View style={styles.contactSection}>
            <MaterialIcons name="phone" size={24} color={COLORS.secondary} />
            <Text style={styles.contactText}>+123 456 7890</Text>
          </View>

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
});