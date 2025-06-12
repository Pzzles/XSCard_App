import { Alert } from 'react-native';
import { 
  Contact, 
  generateVCard, 
  generateMultipleVCards, 
  generateFileName, 
  generateBatchFileName 
} from './vCardGenerator';

// Test mode flag - set to true for Expo Go testing
const TEST_MODE = false;

// Dynamic imports for native modules (only in production)
let RNFS: any = null;
let Share: any = null;

const loadNativeModules = async () => {
  if (!TEST_MODE && !RNFS && !Share) {
    try {
      RNFS = require('react-native-fs');
      Share = require('react-native-share').default;
    } catch (error) {
      console.error('Failed to load native modules:', error);
      throw new Error('Native modules not available. Please use a development build.');
    }
  }
};

export const exportSingleContact = async (contact: Contact): Promise<void> => {
  try {
    const vCardData = generateVCard(contact);
    const fileName = generateFileName(contact);
    
    if (TEST_MODE) {
      // Test mode: Show what would be exported
      console.log('📱 TEST MODE: Export Single Contact');
      console.log('📁 File Name:', fileName);
      console.log('📄 vCard Data:', vCardData);
      
      Alert.alert(
        '📱 TEST MODE: Export Success!',
        `Contact: ${contact.name} ${contact.surname}\n\nFile: ${fileName}\n\nIn production, this would export a vCard file that can be imported to any phone's contacts.`,
        [{ text: 'View vCard Data', onPress: () => {
          Alert.alert('vCard Content', vCardData);
        }}, { text: 'OK' }]
      );
      return;
    }
    
    // Production mode: Load native modules and perform actual file operations
    await loadNativeModules();
    
    const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
    
    await RNFS.writeFile(filePath, vCardData, 'utf8');
    
    const shareOptions = {
      title: `Export Contact - ${contact.name} ${contact.surname}`,
      message: `Contact information for ${contact.name} ${contact.surname}`,
      url: `file://${filePath}`,
      type: 'text/vcard',
      filename: fileName,
      saveToFiles: true,
    };
    
    await Share.open(shareOptions);
    
    setTimeout(async () => {
      try {
        const fileExists = await RNFS.exists(filePath);
        if (fileExists) {
          await RNFS.unlink(filePath);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup temporary file:', cleanupError);
      }
    }, 5000);
    
  } catch (error) {
    console.error('Error exporting single contact:', error);
    throw new Error('Failed to export contact. Please try again.');
  }
};

export const exportAllContacts = async (contacts: Contact[]): Promise<void> => {
  try {
    if (contacts.length === 0) {
      throw new Error('No contacts to export');
    }
    
    const vCardData = generateMultipleVCards(contacts);
    const fileName = generateBatchFileName(contacts.length);
    
    if (TEST_MODE) {
      // Test mode: Show what would be exported
      console.log('📱 TEST MODE: Export All Contacts');
      console.log('📊 Contact Count:', contacts.length);
      console.log('📁 File Name:', fileName);
      console.log('📄 vCard Data Preview:', vCardData.substring(0, 500) + '...');
      
      const contactNames = contacts.map(c => `• ${c.name} ${c.surname}`).join('\n');
      
      Alert.alert(
        '📱 TEST MODE: Bulk Export Success!',
        `Exported ${contacts.length} contacts:\n\n${contactNames}\n\nFile: ${fileName}\n\nIn production, this would create a single vCard file with all contacts.`,
        [{ text: 'View vCard Preview', onPress: () => {
          Alert.alert('vCard Content Preview', vCardData.substring(0, 800) + '\n\n... and more');
        }}, { text: 'OK' }]
      );
      return;
    }
    
    // Production mode: Load native modules and perform actual file operations
    await loadNativeModules();
    
    const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
    
    await RNFS.writeFile(filePath, vCardData, 'utf8');
    
    const shareOptions = {
      title: `Export All Contacts (${contacts.length})`,
      message: `Exporting ${contacts.length} contacts from XS Card`,
      url: `file://${filePath}`,
      type: 'text/vcard',
      filename: fileName,
      saveToFiles: true,
    };
    
    await Share.open(shareOptions);
    
    setTimeout(async () => {
      try {
        const fileExists = await RNFS.exists(filePath);
        if (fileExists) {
          await RNFS.unlink(filePath);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup temporary file:', cleanupError);
      }
    }, 5000);
    
  } catch (error) {
    console.error('Error exporting all contacts:', error);
    throw new Error('Failed to export contacts. Please try again.');
  }
};

export const exportSelectedContacts = async (contacts: Contact[]): Promise<void> => {
  try {
    if (contacts.length === 0) {
      throw new Error('No contacts selected for export');
    }
    
    if (contacts.length === 1) {
      return await exportSingleContact(contacts[0]);
    }
    
    return await exportAllContacts(contacts);
    
  } catch (error) {
    console.error('Error exporting selected contacts:', error);
    throw new Error('Failed to export selected contacts. Please try again.');
  }
};

// Helper function to toggle test mode
export const setTestMode = (enabled: boolean) => {
  // In a real app, you could store this in AsyncStorage or make it configurable
  console.log(`🔄 Export test mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
}; 