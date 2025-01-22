import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, TextInput, ImageStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { Contact } from '../../types';
import Header from '../../components/Header';

export default function ContactsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: 1,
      name: 'Pule Tshehla',
      position: 'Founder',
      company: 'KruxTeck',
      dateAdded: '6 days ago',
      image: require('../../../assets/images/profile.png'),
    },
    {
      id: 2,
      name: 'Sapho Maqhwazima',
      position: 'Co-founder',
      company: 'X Spark',
      dateAdded: '6 days ago',
      image: require('../../../assets/images/profile.png'),
    },
  ]);

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