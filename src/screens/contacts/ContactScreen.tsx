import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, TextInput, Alert, Modal, Linking, RefreshControl, ActivityIndicator } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import Header from '../../components/Header';
import { API_BASE_URL, ENDPOINTS, buildUrl, authenticatedFetch, getUserId } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { Swipeable } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from '../../context/ColorSchemeContext';

// Define constant for free plan contact limit
const FREE_PLAN_CONTACT_LIMIT = 3;

// Update interfaces to match Firestore structure
interface Contact {
  name: string;
  surname: string;
  phone: string; // Changed from number to phone to match DB
  email?: string; // Add email field as optional
  howWeMet: string;
  createdAt: string; // Will now be in format "Date: February 25, 2025 at 6:25 PM"
}

interface ContactData {
  id: string;
  contactList: Contact[];  // Changed from contactsList to contactList to match DB
}

interface ShareOption {
  id: string;
  name: string;
  icon: 'whatsapp' | 'send' | 'email';
  color: string;
  action: (contact?: Contact) => void;
}

interface UserData {
  id: string;
  colorScheme?: string;
}

export default function ContactsScreen() {
  // Add navigation prop
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactDocId, setContactDocId] = useState<string>('');
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [remainingContacts, setRemainingContacts] = useState<number | 'unlimited'>(FREE_PLAN_CONTACT_LIMIT);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { colorScheme } = useColorScheme();

  // Create a ref to store the swipeables
  const swipeableRefs = useRef<Map<number, Swipeable | null>>(new Map());
  
  // Reset refs when contacts change
  useEffect(() => {
    swipeableRefs.current = new Map();
    
    // Cleanup when component unmounts
    return () => {
      closeAllSwipeables();
    };
  }, [contacts]);

  // Helper to close all swipeables
  const closeAllSwipeables = () => {
    // Close all open swipeables
    swipeableRefs.current.forEach(ref => {
      ref?.close();
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      loadContacts();
      return () => {
        closeAllSwipeables();
      };
    }, [])
  );

  const loadContacts = async () => {
    setIsLoading(true); // Set loading to true before fetching
    try {
      const userId = await getUserId();
      if (!userId) {
        console.error('No user ID found');
        return;
      }

      const contactResponse = await authenticatedFetch(ENDPOINTS.GET_CONTACTS + `/${userId}`);
      const data = await contactResponse.json();

      // Get user data to check plan
      const userResponse = await authenticatedFetch(ENDPOINTS.GET_USER + `/${userId}`);
      const userData = await userResponse.json();
      
      if (data && Array.isArray(data.contactList)) {
        setContacts(data.contactList);
        setContactDocId(userId);
        // Set remaining contacts based on plan
        if (userData.plan === 'free') {
          const remaining = Math.max(0, FREE_PLAN_CONTACT_LIMIT - data.contactList.length);
          setRemainingContacts(remaining);
          
          // Show limit modal if no contacts remaining
          if (remaining === 0) {
            setShowLimitModal(true);
          }
        } else {
          setRemainingContacts('unlimited');
        }
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      showModal('Error', 'Failed to load contacts');
    } finally {
      setIsLoading(false); // Set loading to false after fetching (success or error)
    }
  };

  const handleDeleteContact = (index: number) => {
    // Store a reference to the swipeable we want to delete
    const swipeableToDelete = swipeableRefs.current.get(index);
    
    // First close the swipeable
    swipeableToDelete?.close();
    
    // Small delay to allow the swipeable to close
    setTimeout(() => {
      Alert.alert(
        "Delete Contact",
        "Are you sure you want to delete this contact?",
        [
          { 
            text: "Cancel", 
            style: "cancel"
          },
          { 
            text: "Delete", 
            style: "destructive",
            onPress: async () => {
              try {
                const userId = await getUserId();
                if (!userId) {
                  throw new Error('User ID not found');
                }

                const response = await authenticatedFetch(
                  `${ENDPOINTS.DELETE_CONTACT}/${userId}/contact/${index}`,
                  { 
                    method: 'DELETE',
                    headers: {
                      'Content-Type': 'application/json'
                    }
                  }
                );

                const responseData = await response.json();

                if (!response.ok) {
                  throw new Error(responseData.message || 'Failed to delete contact');
                }

                // Update local state
                const updatedContacts = [...contacts];
                updatedContacts.splice(index, 1);
                setContacts(updatedContacts);
                
                // Update remaining contacts count
                if (typeof remainingContacts === 'number') {
                  setRemainingContacts(remainingContacts + 1);
                }
                
                // Show success message
                Alert.alert("Success", "Contact deleted successfully");
              } catch (error) {
                console.error('Error deleting contact:', error);
                Alert.alert("Error", error instanceof Error ? error.message : 'Failed to delete contact');
              }
            }
          }
        ]
      );
    }, 300);
  };

  const filteredContacts = contacts.filter(contact =>
    `${contact.name} ${contact.surname}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const shareOptions: ShareOption[] = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: 'whatsapp',
      color: '#25D366',
      action: async (contact?: Contact) => {
        const storedUserData = await AsyncStorage.getItem('userData');
        if (!storedUserData) return;
        
        const userData = JSON.parse(storedUserData);
        const shareUrl = `${API_BASE_URL}/saveContact.html?userId=${userData.id}`;
        const message = contact 
          ? `Contact Information:\nName: ${contact.name} ${contact.surname}\nPhone: ${contact.phone}${contact.email ? `\nEmail: ${contact.email}` : ''}\nMet at: ${contact.howWeMet}`
          : `Check out my digital business card! ${shareUrl}`;
          
        Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`).catch(() => {
          showModal('Error', 'WhatsApp is not installed on your device');
        });
      }
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: 'send',
      color: '#0088cc',
      action: async (contact?: Contact) => {
        const storedUserData = await AsyncStorage.getItem('userData');
        if (!storedUserData) return;
        
        const userData = JSON.parse(storedUserData);
        const shareUrl = `${API_BASE_URL}/saveContact.html?userId=${userData.id}`;
        const message = contact 
          ? `Contact Information:\nName: ${contact.name} ${contact.surname}\nPhone: ${contact.phone}${contact.email ? `\nEmail: ${contact.email}` : ''}\nMet at: ${contact.howWeMet}`
          : `Check out my business card: ${shareUrl}`;

        Linking.openURL(`tg://msg?text=${encodeURIComponent(message)}`).catch(() => {
          showModal('Error', 'Telegram is not installed on your device');
        });
      }
    },
    {
      id: 'email',
      name: 'Email',
      icon: 'email',
      color: '#EA4335',
      action: async (contact?: Contact) => {
        try {
          const storedUserData = await AsyncStorage.getItem('userData');
          if (!storedUserData) {
            showModal('Error', 'User data not available');
            return;
          }
          
          const userData = JSON.parse(storedUserData);
          let emailUrl = '';
          
          if (contact) {
            // Case: Sharing a contact's information
            const formattedMessage = `Hello,\n\nI wanted to share this contact information with you:\n\nName: ${contact.name} ${contact.surname}\nPhone: ${contact.phone}${contact.email ? `\nEmail: ${contact.email}` : ''}\nMet at: ${contact.howWeMet}\n\nBest regards,\n${userData.name || ''} ${userData.surname || ''}${userData.email ? `\n${userData.email}` : ''}`;
            
            emailUrl = `mailto:?${userData.email ? `reply-to=${encodeURIComponent(userData.email)}&cc=${encodeURIComponent(userData.email)}&` : ''}subject=${encodeURIComponent(`Contact Information - ${contact.name} ${contact.surname}`)}&body=${encodeURIComponent(formattedMessage)}`;
          } else {
            // Case: Sharing user's own business card (similar to CardsScreen)
            const shareUrl = `${API_BASE_URL}/saveContact.html?userId=${userData.id}`;
            
            const formattedMessage = `Hello,\n\nI'm ${userData.name || ''} ${userData.surname || ''}${userData.company ? ` from ${userData.company}` : ''}.\n\nHere's my digital business card: ${shareUrl}\n\nBest regards,\n${userData.name || ''} ${userData.surname || ''}${userData.phone ? `\n${userData.phone}` : ''}${userData.email ? `\n${userData.email}` : ''}`;
            
            emailUrl = `mailto:?${userData.email ? `reply-to=${encodeURIComponent(userData.email)}&cc=${encodeURIComponent(userData.email)}&` : ''}subject=${encodeURIComponent(`Digital Business Card - ${userData.name || ''} ${userData.surname || ''}${userData.company ? `, ${userData.company}` : ''}`)}&body=${encodeURIComponent(formattedMessage)}`;
          }
          
          Linking.openURL(emailUrl).catch(() => {
            showModal('Error', 'Could not open email client');
          });
        } catch (error) {
          console.error('Error preparing email:', error);
          showModal('Error', 'Failed to prepare email');
        }
      }
    }
  ];

  const handleShare = async (contact?: Contact) => {
    try {
      // If sharing a new contact and limit is reached, show upgrade modal
      if (!contact && remainingContacts === 0) {
        setShowLimitModal(true);
        return;
      }
      
      const storedUserData = await AsyncStorage.getItem('userData');
      if (!storedUserData) {
        showModal('Error', 'User data not available');
        return;
      }
      
      const userData = JSON.parse(storedUserData);
      const shareUrl = `${API_BASE_URL}/saveContact.html?userId=${userData.id}`;
      
      if (contact) {
        setSelectedContact(contact);
      }
      setIsShareModalVisible(true);
    } catch (error) {
      console.error('Error preparing share:', error);
      showModal('Error', 'Failed to prepare sharing');
    }
  };

  const handlePlatformSelect = async (platform: string) => {
    try {
      const selectedOption = shareOptions.find(opt => opt.id === platform);
      if (selectedOption) {
        await selectedOption.action(selectedContact || undefined);
      }
      
      setIsShareModalVisible(false);
      setSelectedPlatform(null);
      setSelectedContact(null);
    } catch (error) {
      console.error('Error sharing:', error);
      showModal('Error', 'Failed to share');
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadContacts().finally(() => setRefreshing(false));
  }, []);

  // Add dynamic styles
  const dynamicStyles = {
    shareCardButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colorScheme,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 25,
      gap: 8,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    shareAction: {
      backgroundColor: colorScheme,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      width: 80,
      height: '100%' as const,
    }
  };

  // Add this component for the swipe actions
  const RenderRightActions = (progress: any, dragX: any, index: number) => {
    return (
      <TouchableOpacity 
        style={styles.deleteAction}
        onPress={() => handleDeleteContact(index)}
      >
        <MaterialIcons name="delete" size={24} color={COLORS.white} />
      </TouchableOpacity>
    );
  };

  const RenderLeftActions = (progress: any, dragX: any, contact: Contact) => {
    return (
      <TouchableOpacity 
        style={dynamicStyles.shareAction}
        onPress={() => handleShare(contact)}
      >
        <MaterialIcons name="share" size={24} color={COLORS.white} />
      </TouchableOpacity>
    );
  };

  const showModal = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setIsOptionsModalVisible(true);
  };

  // Add function to navigate to UnlockPremium
  const navigateToUpgrade = () => {
    setShowLimitModal(false);
    navigation.navigate('UnlockPremium');
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Header title="Contacts" />
        
        {/* Only show remaining contacts for free users */}
        {remainingContacts !== 'unlimited' && (
          <View style={styles.contactCountContainer}>
            <View style={styles.contactCountIconContainer}>
              <MaterialIcons 
                name={remainingContacts === 0 ? "error-outline" : "people-outline"} 
                size={22} 
                color={remainingContacts === 0 ? COLORS.error : colorScheme} 
              />
            </View>
            <View style={styles.contactCountContent}>
              <Text style={[
                styles.contactCountText,
                { color: remainingContacts === 0 ? COLORS.error : COLORS.black }
              ]}>
                {remainingContacts > 0 
                  ? `${remainingContacts} free contacts remaining` 
                  : 'Contact limit reached'}
              </Text>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { 
                      width: `${(remainingContacts / FREE_PLAN_CONTACT_LIMIT) * 100}%`,
                      backgroundColor: remainingContacts === 0 
                        ? COLORS.error 
                        : remainingContacts === 1 
                          ? '#FFA500' // Orange for warning when only 1 left
                          : colorScheme
                    }
                  ]} 
                />
              </View>
              {remainingContacts === 0 && (
                <TouchableOpacity 
                  onPress={navigateToUpgrade}
                  style={[styles.upgradeButton, {backgroundColor: colorScheme}]}
                >
                  <Text style={styles.upgradeButtonText}>Upgrade</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        
        <View style={[
          styles.contactsContainer, 
          remainingContacts === 'unlimited' && styles.premiumContactsContainer
        ]}>
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

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colorScheme} />
              <Text style={styles.loadingText}>Loading contacts...</Text>
            </View>
          ) : filteredContacts.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <MaterialIcons name="people" size={64} color={COLORS.gray} />
              <Text style={styles.emptyStateTitle}>No contact yet</Text>
              <Text style={styles.emptyStateDescription}>
                When you share your card and they share their details back, it will appear here
              </Text>
              <TouchableOpacity style={dynamicStyles.shareCardButton} onPress={() => handleShare()}>
                <MaterialIcons name="share" size={24} color={COLORS.white} />
                <Text style={styles.shareCardButtonText}>Share my card</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView 
              style={styles.contactsList}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colorScheme]} // Uses your app's theme color
                  tintColor={colorScheme}
                />
              }
            >
              {filteredContacts.map((contact, index) => (
                <Swipeable
                  key={index}
                  ref={(el) => swipeableRefs.current.set(index, el)}
                  renderRightActions={(progress, dragX) => 
                    RenderRightActions(progress, dragX, index)
                  }
                  renderLeftActions={(progress, dragX) => 
                    RenderLeftActions(progress, dragX, contact)
                  }
                >
                  <View style={styles.contactCard}>
                    <View style={styles.contactLeft}>
                      <Image 
                        source={require('../../../assets/images/profile.png')} 
                        style={styles.contactImage} 
                      />
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>
                          {contact.name} {contact.surname}
                        </Text>
                        <View style={styles.contactSubInfo}>
                          <Text style={styles.contactPhone}>
                            {contact.phone || 'No phone number'}
                          </Text>
                          {contact.email && (
                            <Text style={styles.contactEmail}>
                              {contact.email || 'No email address'}
                            </Text>
                          )}
                          <Text style={styles.contactHowWeMet}>
                            Met at: {contact.howWeMet}
                          </Text>
                          <Text style={styles.contactDate}>
                            {contact.createdAt || 'Recently'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Swipeable>
              ))}
            </ScrollView>
          )}
        </View>

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
                    style={styles.input}
                    placeholder={selectedPlatform === 'email' ? 'Enter email' : 'Enter phone number'}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType={selectedPlatform === 'email' ? 'email-address' : 'phone-pad'}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, !phoneNumber && styles.disabledButton]}
                    onPress={() => handlePlatformSelect(selectedPlatform)}
                    disabled={!phoneNumber}
                  >
                    <Text style={styles.sendButtonText}>Send</Text>
                  </TouchableOpacity>
                </View>
              )}
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
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <Text style={styles.modalMessage}>{modalMessage}</Text>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showLimitModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowLimitModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Contact Limit Reached</Text>
              <Text style={styles.modalMessage}>
                You have reached the limit of {FREE_PLAN_CONTACT_LIMIT} contacts for free users. 
                Upgrade to Premium to add unlimited contacts!
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowLimitModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Maybe Later</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colorScheme }]}
                  onPress={navigateToUpgrade}  // Updated to use the new function
                >
                  <Text style={styles.deleteButtonText}>Upgrade Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  contactsContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  premiumContactsContainer: {
    paddingTop: 120, // Add top padding to compensate for missing contact count container
  },
  searchContainer: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    margin: 15,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.black,
  },
  contactsList: {
    flex: 1,
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    margin: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 1,
    borderWidth: 1,
    borderColor: COLORS.gray + '20',
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  contactInfo: {
    justifyContent: 'center',
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  contactSubInfo: {
    marginTop: 4,
    gap: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: COLORS.black,
    marginBottom: 4,
  },
  contactEmail: {
    fontSize: 14,
    color: COLORS.black,
    marginBottom: 4,
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
  },
  shareButton: {
    padding: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteButton: {
    padding: 5,
  },
  error: {
    color: COLORS.error,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  shareCardButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
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
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
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
  inputContainer: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray + '50',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.5,
  },
  contactHowWeMet: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 2,
  },
  metContainer: {
    marginTop: 2,
  },
  contactDate: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  deleteAction: {
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.gray,
  },
  modalDeleteButton: {
    backgroundColor: COLORS.error,
  },
  cancelButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  deleteButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  contactCountContainer: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    marginHorizontal: 15,
    marginTop: 120,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#eeeeee',
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactCountIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactCountContent: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  contactCountText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  upgradeButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 15,
    alignSelf: 'flex-end',
  },
  upgradeButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
  },
});