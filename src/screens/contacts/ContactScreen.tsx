import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import Header from '../../components/Header';
import { API_BASE_URL, ENDPOINTS, buildUrl } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Contact {
  name: string;
  surname: string;
  number: string;
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
        if (contactData.contactsList) {
          setContacts(contactData.contactsList);
        }
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} days ago`;
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
                  </View>
                </View>
              </View>
              <View style={styles.contactRight}>
                <Text style={styles.dateAdded}>
                  {formatDate(contact.createdAt)}
                </Text>
                <TouchableOpacity style={styles.shareButton}>
                  <MaterialIcons name="share" size={24} color={COLORS.gray} />
                </TouchableOpacity>
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
    flexDirection: 'row',
    marginTop: 4,
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
});