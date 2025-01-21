import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Animated, ScrollView, ImageStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import Header from '../../components/Header';

export default function CardsScreen() {
  const borderRotation = useRef(new Animated.Value(0)).current;

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
            <Image
              style={styles.qrCode}
              source={require('../../../assets/images/prcode.png')}
            />
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
    marginBottom: 20,
  },
  qrCode: {
    width: 300,
    height: 300,
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