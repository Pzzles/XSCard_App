import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, TextInput, Alert, Modal, Linking } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import Header from '../../components/Header';
import { API_BASE_URL, ENDPOINTS, buildUrl } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

interface Contact {
  name: string;
  surname: string;
  number: string;
  howWeMet: string; // Add howWeMet field
  createdAt: string;
}

interface ContactData {
  id: string;
  userId: string;
  contactsList: Contact[];
}

interface ShareOption {
  id: string;
  name: string;
  icon: 'whatsapp' | 'send' | 'email';
  color: string;
  action: (contact: string) => void;
}

interface UserData {
  id: string;
  colorScheme?: string;
}

export default function ContactsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactDocId, setContactDocId] = useState<string>('');
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardColor, setCardColor] = useState(COLORS.secondary);
  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<number | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadContacts();
    }, [])
  );

  const loadContacts = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        
        // Fetch user details to get the color scheme
        const response = await fetch(buildUrl(ENDPOINTS.GET_USER) + `/${parsedUserData.id}`);
        const userData: UserData = await response.json();
        
        // Set color from user data
        if (userData.colorScheme) {
          setCardColor(userData.colorScheme);
        }

        // Continue with existing contacts loading logic
        const contactResponse = await fetch(buildUrl(ENDPOINTS.GET_CONTACTS) + `/${parsedUserData.id}`);
        const contactData: ContactData = await contactResponse.json();
        if (contactData) {
          setContacts(contactData.contactsList || []);
          setContactDocId(contactData.id); // Store the contact document ID
        }
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      showModal('Error', 'Failed to load contacts');
    }
  };

  const deleteContact = async (index: number) => {
    try {
      if (!contactDocId) {
        throw new Error('Contact document ID not found');
      }

      const response = await fetch(`${API_BASE_URL}/Contacts/${contactDocId}/contact/${index}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete contact');
      }

      // Refresh contacts list after successful deletion
      loadContacts();
      showModal('Success', 'Contact deleted successfully');
    } catch (error) {
      console.error('Error deleting contact:', error);
      showModal('Error', 'Failed to delete contact');
    }
  };

  const formatDate = (dateString: any) => {
    try {
      let date;
      
      // Handle Firestore timestamp
      if (dateString && dateString._seconds) {
        // Convert Firestore timestamp to Date
        date = new Date(dateString._seconds * 1000);
      } else if (typeof dateString === 'string') {
        // Handle ISO string
        date = new Date(dateString);
      } else if (dateString instanceof Date) {
        date = dateString;
      } else {
        console.error('Unsupported date format:', dateString);
        return 'Recently';
      }
  
      // Check if the date is valid
      if (!date || isNaN(date.getTime())) {
        console.error('Invalid date value:', dateString);
        return 'Recently';
      }
  
      // Format the date
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
  
      return new Intl.DateTimeFormat('en-US', options).format(date);
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Recently';
    }
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
      action: (number: string) => {
        const message = 'Check out my digital business card!';
        const whatsappUrl = `whatsapp://send?phone=${number}&text=${encodeURIComponent(message)}`;
        Linking.openURL(whatsappUrl).catch(() => {
          showModal('Error', 'WhatsApp is not installed on your device');
        });
      }
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: 'send',
      color: '#0088cc',
      action: (username: string) => {
        const telegramUrl = `tg://msg?text=Check out my digital business card!&to=${username}`;
        Linking.openURL(telegramUrl).catch(() => {
          showModal('Error', 'Telegram is not installed on your device');
        });
      }
    },
    {
      id: 'email',
      name: 'Email',
      icon: 'email',
      color: '#EA4335',
      action: (email: string) => {
        const emailUrl = `mailto:${email}?subject=Digital Business Card&body=Check out my digital business card!`;
        Linking.openURL(emailUrl).catch(() => {
          showModal('Error', 'Could not open email client');
        });
      }
    }
  ];

  const handleShare = (contact?: Contact) => {
    if (contact) {
      setSelectedContact(contact);
    }
    setIsShareModalVisible(true);
  };

  const handlePlatformSelect = (platform: string) => {
    setSelectedPlatform(platform);
    setPhoneNumber('');
  };

  const handleSend = () => {
    const platform = shareOptions.find(opt => opt.id === selectedPlatform);
    if (platform && phoneNumber && selectedContact) {
      const message = `Contact Information:\nName: ${selectedContact.name} ${selectedContact.surname}\nPhone: ${selectedContact.number}\nMet at: ${selectedContact.howWeMet}`;
      
      if (selectedPlatform === 'whatsapp') {
        const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
        Linking.openURL(whatsappUrl).catch(() => {
          showModal('Error', 'WhatsApp is not installed on your device');
        });
      } else if (selectedPlatform === 'telegram') {
        const telegramUrl = `tg://msg?text=${encodeURIComponent(message)}&to=${phoneNumber}`;
        Linking.openURL(telegramUrl).catch(() => {
          showModal('Error', 'Telegram is not installed on your device');
        });
      } else if (selectedPlatform === 'email') {
        const emailUrl = `mailto:${phoneNumber}?subject=Contact Information&body=${encodeURIComponent(message)}`;
        Linking.openURL(emailUrl).catch(() => {
          showModal('Error', 'Could not open email client');
        });
      }
      
      setIsShareModalVisible(false);
      setSelectedPlatform(null);
      setPhoneNumber('');
      setSelectedContact(null);
    }
  };

  const handleDeleteContact = (index: number) => {
    setContactToDelete(index);
    setConfirmModalVisible(true);
  };

  const confirmDelete = async () => {
    if (contactToDelete !== null) {
      try {
        await deleteContact(contactToDelete);
      } finally {
        setConfirmModalVisible(false);
        setContactToDelete(null);
      }
    }
  };

  // Add dynamic styles
  const dynamicStyles = {
    shareCardButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: cardColor,
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
      backgroundColor: cardColor,
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Header title="Contacts" />
        <View style={[styles.contactsContainer, { marginTop: 120 }]}>
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

          {filteredContacts.length === 0 ? (
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
            <ScrollView style={styles.contactsList}>
              {filteredContacts.map((contact, index) => (
                <Swipeable
                  key={index}
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
                          <Text style={styles.contactPosition}>{contact.number}</Text>
                          <View style={styles.metContainer}>
                            <Text style={styles.contactHowWeMet}>Met at: {contact.howWeMet}</Text>
                            <Text style={styles.contactDate}>Date: {formatDate(contact.createdAt)}</Text>
                          </View>
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
                    style={styles.input}
                    placeholder={selectedPlatform === 'email' ? 'Enter email' : 'Enter phone number'}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType={selectedPlatform === 'email' ? 'email-address' : 'phone-pad'}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, !phoneNumber && styles.disabledButton]}
                    onPress={handleSend}
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
          visible={confirmModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setConfirmModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setConfirmModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color={COLORS.black} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Confirm Delete</Text>
              <Text style={styles.modalMessage}>Are you sure you want to delete this contact?</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setConfirmModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalDeleteButton]}
                  onPress={confirmDelete}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
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
    flexDirection: 'column',
    marginTop: 4,
    gap: 2,
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
    flexWrap: 'wrap',
    gap: 20,
  },
  shareOption: {
    alignItems: 'center',
    width: 80,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    color: COLORS.black,
    textAlign: 'center',
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
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  metContainer: {
    marginTop: 2,
  },
  contactDate: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
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
});