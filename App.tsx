import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Animated, ScrollView, ImageStyle, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const COLORS = {
  primary: '#FF4B6E',    // Pinkish red
  secondary: '#1B2B5B',  // Navy blue
  light: '#FFFFFF',
  gray: '#6B7280',
  white: '#FFFFFF',
  black: '#000000',
};

// Add this type definition for better type safety
type Contact = {
  id: number;
  name: string;
  position: string;
  company: string;
  dateAdded: string;
  image: any; // Consider using a more specific type for images
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'cards' | 'contacts'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: 1,
      name: 'Pule Tshehla',
      position: 'Founder',
      company: 'KruxTeck',
      dateAdded: '6 days ago',
      image: require('./images/profile.png'),
    },
    {
      id: 2,
      name: 'Sapho Maqhwazima',
      position: 'Co-founder',
      company: 'X Spark',
      dateAdded: '6 days ago',
      image: require('./images/profile.png'),
    },
  ]);

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

  const renderMyCardsContent = () => (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        {/* Menu Icon */}
        <TouchableOpacity id="menuButton" style={styles.icon}>
          <MaterialIcons name="menu" size={24} color={COLORS.black} />
        </TouchableOpacity>

        {/* Centered Title */}
        <View style={styles.titleContainer}>
          <Text id="headerTitle" style={styles.title}>
            {activeTab === 'cards' ? 'XS Card' : 'Contacts'}
          </Text>
        </View>

        {/* Plus and Pencil Icons */}
        <View style={styles.iconContainer}>
          <TouchableOpacity id="addButton" style={styles.icon}>
            <MaterialIcons name="add" size={24} color={COLORS.black} />
          </TouchableOpacity>
          <TouchableOpacity id="editButton" style={styles.icon}>
            <MaterialIcons name="edit" size={24} color={COLORS.black} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.contentContainer}>
        <View style={styles.scrollContent}>
          <View style={styles.qrContainer}>
            <Image
              style={styles.qrCode}
              source={require('./images/prcode.png')}
            />
          </View>
          <View style={styles.logoContainer}>
            <Image
              style={styles.logo}
              source={require('./images/logoplaceholder.jpg')}
            />
            {/* Profile Image Overlaying Logo */}
            <View style={styles.profileOverlayContainer}>
              <Animated.View style={[styles.profileImageContainer, { transform: [{ rotate: rotateInterpolate }] }]}>
                <Image
                  style={styles.profileImage}
                  source={require('./images/profile.png')}
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

  const renderContactsContent = () => (
    <View style={styles.contactsContainer}>
      <View style={styles.contactsHeader}>
        <Text style={styles.contactsHeaderText}>Contacts</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color={COLORS.gray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor={COLORS.gray}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.contactsList}>
        {contacts.map((contact) => (
          <View key={contact.id} style={styles.contactCard}>
            <View style={styles.contactLeft}>
              <Image source={contact.image} style={styles.contactImage} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <View style={styles.contactSubInfo}>
                  <Text style={styles.contactPosition}>{contact.position}</Text>
                  <Text style={styles.contactCompany}> | {contact.company}</Text>
                </View>
              </View>
            </View>
            <View style={styles.contactRight}>
              <Text style={styles.dateAdded}>{contact.dateAdded}</Text>
              <TouchableOpacity style={styles.shareButton}>
                <MaterialIcons name="share" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {activeTab === 'cards' ? renderMyCardsContent() : renderContactsContent()}
      
      {/* Fixed Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.footerItem, activeTab === 'cards' && styles.footerItemActive]} 
          onPress={() => setActiveTab('cards')}
        >
          <MaterialIcons 
            name="credit-card" 
            size={24} 
            color={activeTab === 'cards' ? COLORS.primary : COLORS.gray} 
          />
          <Text style={[
            styles.footerText, 
            activeTab === 'cards' && styles.footerTextActive
          ]}>
            My Cards
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.footerItem, activeTab === 'contacts' && styles.footerItemActive]}
          onPress={() => setActiveTab('contacts')}
        >
          <MaterialIcons 
            name="contacts" 
            size={24} 
            color={activeTab === 'contacts' ? COLORS.primary : COLORS.gray} 
          />
          <Text style={[
            styles.footerText, 
            activeTab === 'contacts' && styles.footerTextActive
          ]}>
            Contacts
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.white,
    zIndex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  contentContainer: {
    flex: 1,
    marginTop: 120, // Space for header
    marginBottom: 70, // Space for footer
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.secondary,
  },
  titleContainer: {
    paddingTop: 52,
    position: 'absolute',
    left: '55%',
    transform: [{ translateX: '-50%' }],
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,  // White text
  },
  qrContainer: {
    marginVertical: 20,
  },
  qrCode: {
    width: 300,
    height: 300,
  } as ImageStyle,
  logoContainer: {
    width: '100%',
    position: 'relative',
    overflow: 'visible',
    marginLeft: -20,
    marginRight: -20,
    alignSelf: 'center',
  },
  logo: {
    width: '100%',
    height: undefined,
    aspectRatio: 16/9,
    resizeMode: 'cover',
    marginHorizontal: 0,  // Remove any horizontal margins
  } as ImageStyle,
  profileOverlayContainer: {
    position: 'absolute',
    bottom: -40,
    left: '45%',
    transform: [{ translateX: -40 }], // Using pixels instead of percentage for better compatibility
    alignItems: 'center',
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 5,
    borderColor: COLORS.primary,  // Pinkish red border
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
  } as ImageStyle,
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 50,
    alignSelf: 'flex-start',
    paddingLeft: 20,
    padding:2,
    color: COLORS.secondary,  // Navy blue text
  },
  position: {
    fontSize: 16,
    alignSelf: 'flex-start',
    paddingLeft: 20,
    padding:2,
    color: COLORS.secondary,
  },
  company: {
    fontSize: 16,
    color: COLORS.primary,  // Pinkish red text
    alignSelf: 'flex-start',
    paddingLeft: 20,
    padding:2,
  },
  sendButton: {
    backgroundColor: COLORS.primary,  // Pinkish red button
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sendButtonIcon: {
    fontSize: 20,
    color: '#fff',
  },
  footerItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  footerItemActive: {
    backgroundColor: `${COLORS.primary}10`, // 10% opacity of primary color
  },
  footerText: {
    fontSize: 14,
    color: 'gray',
    marginTop: 4,
  },
  footerTextActive: {
    color: COLORS.primary,  // Pinkish red active text
    fontWeight: 'bold',
  },
  icon: {
    width: 24,
    height: 24,
    marginHorizontal: 4,
  },
  iconContainer: {
    flexDirection: 'row',
  },
  contactSection: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingLeft: 20,
    padding: 3,
    marginTop: 20,
  },
  contactText: {
    fontSize: 16,
    color: COLORS.secondary,
    marginRight: 8,
  },
  contactsContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingTop: 60,
  },
  contactsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  contactsHeaderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.black,
  },
  contactsList: {
    flex: 1,
    marginTop: 16,
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  } as ImageStyle,
  contactInfo: {
    justifyContent: 'center',
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 4,
  },
  contactSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactPosition: {
    fontSize: 14,
    color: COLORS.gray,
  },
  contactCompany: {
    fontSize: 14,
    color: COLORS.gray,
  },
  contactRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  dateAdded: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 8,
  },
  shareButton: {
    padding: 4,
  },
});