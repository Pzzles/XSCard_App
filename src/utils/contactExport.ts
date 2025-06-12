import { Alert, Platform } from 'react-native';
import { Contact } from './vCardGenerator';

// Test mode flag - set to true for Expo Go testing
const TEST_MODE = true; // Keep as true for Expo Go compatibility

// Dynamic import for react-native-contacts
let Contacts: any = null;

const loadContactsModule = async () => {
  if (!TEST_MODE && !Contacts) {
    try {
      Contacts = require('react-native-contacts');
    } catch (error) {
      console.error('Failed to load react-native-contacts:', error);
      throw new Error('Contact integration not available. Please use a development build.');
    }
  }
};

// Convert our Contact interface to react-native-contacts format
const convertToNativeContact = (contact: Contact) => {
  return {
    givenName: contact.name,
    familyName: contact.surname,
    phoneNumbers: contact.phone ? [{
      label: 'mobile',
      number: contact.phone,
    }] : [],
    emailAddresses: contact.email ? [{
      label: 'work',
      email: contact.email,
    }] : [],
    note: `Met at: ${contact.howWeMet}`,
  };
};

export const exportSingleContact = async (contact: Contact): Promise<void> => {
  try {
    if (TEST_MODE) {
      // Test mode: Show what would be added to contacts
      console.log('📱 TEST MODE: Add Contact to Phone');
      console.log('📞 Contact Details:', contact);
      
      Alert.alert(
        '📱 TEST MODE: Add to Contacts',
        `This would add "${contact.name} ${contact.surname}" directly to your phone's contacts app.\n\n` +
        `Phone: ${contact.phone}\n` +
        `Email: ${contact.email || 'None'}\n` +
        `Note: Met at ${contact.howWeMet}\n\n` +
        `In production, this opens your phone's contact app with the details pre-filled.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Simulate Add', onPress: () => {
            Alert.alert('✅ Success!', `${contact.name} ${contact.surname} would be added to your contacts.`);
          }}
        ]
      );
      return;
    }
    
    // Production mode: Use react-native-contacts
    await loadContactsModule();
    
    // Check permissions first
    const permission = await Contacts.checkPermission();
    if (permission === 'undefined' || permission === 'denied') {
      const requestResult = await Contacts.requestPermission();
      if (requestResult === 'denied') {
        Alert.alert(
          'Permission Required',
          'Please allow access to contacts to add this person to your phone.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    const nativeContact = convertToNativeContact(contact);
    
    // Add contact to phone
    await Contacts.addContact(nativeContact);
    
    Alert.alert(
      '✅ Contact Added!',
      `${contact.name} ${contact.surname} has been added to your phone's contacts.`,
      [{ text: 'OK' }]
    );
    
  } catch (error) {
    console.error('Error adding contact to phone:', error);
    Alert.alert(
      'Error',
      'Failed to add contact to your phone. Please try again.',
      [{ text: 'OK' }]
    );
  }
};

export const exportAllContacts = async (contacts: Contact[]): Promise<void> => {
  try {
    if (contacts.length === 0) {
      Alert.alert('No Contacts', 'No contacts to add to your phone.');
      return;
    }
    
    if (TEST_MODE) {
      // Test mode: Show what would be added
      const contactNames = contacts.map(c => `• ${c.name} ${c.surname}`).join('\n');
      
      Alert.alert(
        '📱 TEST MODE: Add All Contacts',
        `This would add ${contacts.length} contacts directly to your phone:\n\n${contactNames}\n\n` +
        `In production, each contact opens your phone's contact app for confirmation.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Simulate Add All', onPress: () => {
            Alert.alert('✅ Success!', `All ${contacts.length} contacts would be added to your phone.`);
          }}
        ]
      );
      return;
    }
    
    // Production mode: Add each contact individually
    await loadContactsModule();
    
    // Check permissions first
    const permission = await Contacts.checkPermission();
    if (permission === 'undefined' || permission === 'denied') {
      const requestResult = await Contacts.requestPermission();
      if (requestResult === 'denied') {
        Alert.alert(
          'Permission Required',
          'Please allow access to contacts to add these people to your phone.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (const contact of contacts) {
      try {
        const nativeContact = convertToNativeContact(contact);
        await Contacts.addContact(nativeContact);
        successCount++;
      } catch (error) {
        console.error(`Failed to add contact ${contact.name} ${contact.surname}:`, error);
        failCount++;
      }
    }
    
    if (successCount > 0) {
      Alert.alert(
        '✅ Contacts Added!',
        `Successfully added ${successCount} contact${successCount > 1 ? 's' : ''} to your phone.` +
        (failCount > 0 ? ` ${failCount} failed to add.` : ''),
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Error',
        'Failed to add contacts to your phone. Please try again.',
        [{ text: 'OK' }]
      );
    }
    
  } catch (error) {
    console.error('Error adding contacts to phone:', error);
    Alert.alert(
      'Error',
      'Failed to add contacts to your phone. Please try again.',
      [{ text: 'OK' }]
    );
  }
};

export const exportSelectedContacts = async (contacts: Contact[]): Promise<void> => {
  try {
    if (contacts.length === 0) {
      Alert.alert('No Contacts', 'No contacts selected to add to your phone.');
      return;
    }
    
    if (contacts.length === 1) {
      return await exportSingleContact(contacts[0]);
    }
    
    return await exportAllContacts(contacts);
    
  } catch (error) {
    console.error('Error adding selected contacts to phone:', error);
    Alert.alert(
      'Error',
      'Failed to add selected contacts to your phone. Please try again.',
      [{ text: 'OK' }]
    );
  }
};

// Helper function to toggle test mode
export const setTestMode = (enabled: boolean) => {
  console.log(`🔄 Contact integration test mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
}; 