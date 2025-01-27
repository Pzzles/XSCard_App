import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, TextInput, Alert, Modal, Linking } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import Header from '../../components/Header';
import { API_BASE_URL, ENDPOINTS, buildUrl } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export default function ContactsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactDocId, setContactDocId] = useState<string>('');
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        const response = await fetch(buildUrl(ENDPOINTS.GET_CONTACTS) + `/${parsedUserData.id}`);
        const contactData: ContactData = await response.json();
        if (contactData) {
          setContacts(contactData.contactsList || []);
          setContactDocId(contactData.id); // Store the contact document ID
        }
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
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
      Alert.alert('Success', 'Contact deleted successfully');
    } catch (error) {
      console.error('Error deleting contact:', error);
      Alert.alert('Error', 'Failed to delete contact');
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
          Alert.alert('Error', 'WhatsApp is not installed on your device');
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
          Alert.alert('Error', 'Telegram is not installed on your device');
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
          Alert.alert('Error', 'Could not open email client');
        });
      }
    }
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

  return (
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
            <TouchableOpacity style={styles.shareCardButton} onPress={handleShare}>
              <MaterialIcons name="share" size={24} color={COLORS.white} />
              <Text style={styles.shareCardButtonText}>Share my card</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={styles.contactsList}>
            {filteredContacts.map((contact, index) => (
              <View key={index} style={styles.contactCard}>
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
                <View style={styles.contactRight}>
                  <Text style={styles.dateAdded}>
                    {formatDate(contact.createdAt)}
                  </Text>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                      <MaterialIcons name="share" size={24} color={COLORS.gray} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => {
                        Alert.alert(
                          'Delete Contact',
                          'Are you sure you want to delete this contact?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { 
                              text: 'Delete', 
                              onPress: () => deleteContact(index),
                              style: 'destructive'
                            }
                          ]
                        );
                      }}
                    >
                      <MaterialIcons name="delete" size={24} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contactsContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray + '20',
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
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray,
    marginBottom: 10,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    padding: 20,
  },
  shareCardButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shareCardButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
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
    borderRadius: 10,
    width: '80%',
    maxHeight: '80%',
  },
  closeButton: {
    alignItems: 'flex-end',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 20,
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  inputContainer: {
    marginTop: 20,
  },
  input: {
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 5,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  disabledButton: {
    backgroundColor: COLORS.gray,
  },
});