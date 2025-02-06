import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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

export default function ContactsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactDocId, setContactDocId] = useState<string>('');

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
            <TouchableOpacity style={dynamicStyles.shareCardButton} onPress={handleShare}>
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

                  <View style={styles.actionButtons}>
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
              <View style={styles.contactRight}>
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.shareButton}>
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
      </View>
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
});