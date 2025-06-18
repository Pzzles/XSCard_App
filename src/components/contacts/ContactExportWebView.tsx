import React, { useState } from 'react';
import { View, Modal, Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { Contact } from '../../utils/vCardGenerator';
import { COLORS } from '../../constants/colors';

interface ContactExportWebViewProps {
  visible: boolean;
  contact?: Contact;
  contacts?: Contact[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const ContactExportWebView: React.FC<ContactExportWebViewProps> = ({
  visible,
  contact,
  contacts,
  onClose,
  onSuccess
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const requestContactsPermission = async () => {
    try {
      // First check current permission status
      const { status: currentStatus } = await Contacts.getPermissionsAsync();
      console.log('Current contacts permission status:', currentStatus);
      
      if (currentStatus === 'granted') {
        return true;
      }
      
      // Request permission if not granted
      const { status } = await Contacts.requestPermissionsAsync();
      console.log('Requested contacts permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'This app needs permission to access your contacts to save contact information. Please enable contacts permission in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // This will help users navigate to settings
              Alert.alert(
                'Enable Contacts Permission',
                'Go to Settings → Apps → XS Card → Permissions → Contacts → Allow',
                [{ text: 'OK' }]
              );
            }}
          ]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      Alert.alert(
        'Permission Error',
        'Unable to request contacts permission. This might be due to app configuration. Please try rebuilding the app.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  const saveContactToPhone = async (contactData: Contact) => {
    try {
      // Create contact object for expo-contacts
      const newContact = {
        name: `${contactData.name} ${contactData.surname}`,
        firstName: contactData.name,
        lastName: contactData.surname,
        contactType: Contacts.ContactTypes.Person,
        phoneNumbers: contactData.phone ? [{
          number: contactData.phone,
          isPrimary: true,
          label: 'mobile'
        }] : [],
        emails: contactData.email ? [{
          email: contactData.email,
          isPrimary: true,
          label: 'work'
        }] : [],
        company: contactData.company || '',
        note: `Met at: ${contactData.howWeMet}`
      };

      console.log('Attempting to save contact:', contactData.name, contactData.surname);
      
      // Save contact to device
      const savedContactId = await Contacts.addContactAsync(newContact);
      console.log('Contact saved successfully with ID:', savedContactId);
      return true;
    } catch (error) {
      console.error('Error saving contact:', error);
      
      // Check if it's a permission error
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as Error).message;
        if (errorMessage.includes('permission') || errorMessage.includes('WRITE_CONTACTS')) {
          Alert.alert(
            'Permission Error',
            'Missing contacts permission. Please rebuild the app or enable contacts permission in device settings.',
            [{ text: 'OK' }]
          );
        }
      }
      
      return false;
    }
  };

  const handleExport = async () => {
    if (!contact && !contacts) return;
    
    // Request permission first
    const hasPermission = await requestContactsPermission();
    if (!hasPermission) return;
    
    setIsProcessing(true);
    setSavedCount(0);
    
    try {
      const contactData = contacts || [contact!];
      const contactsArray = Array.isArray(contactData) ? contactData : [contactData];
      
      let successCount = 0;
      
      // Save contacts one by one
      for (const contactItem of contactsArray) {
        const success = await saveContactToPhone(contactItem);
        if (success) {
          successCount++;
          setSavedCount(successCount);
        }
      }

      if (successCount > 0) {
        setExportComplete(true);
        
        const message = contactsArray.length === 1
          ? `${contactsArray[0].name} ${contactsArray[0].surname} saved to contacts!`
          : `${successCount} of ${contactsArray.length} contacts saved successfully!`;
          
        onSuccess(message);
      } else {
        throw new Error('No contacts were saved successfully');
      }
      
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(
        'Save Error', 
        'Failed to save contact(s) to your phone. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setExportComplete(false);
    setSavedCount(0);
    onClose();
  };

  if (!visible || (!contact && !contacts)) {
    return null;
  }

  const contactData = contacts || contact!;
  const contactsArray = Array.isArray(contactData) ? contactData : [contactData];
  const isMultiple = Array.isArray(contactData);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Save to Phone</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={COLORS.black} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {!exportComplete ? (
            <>
              <View style={styles.iconContainer}>
                <MaterialIcons name="person-add" size={64} color={COLORS.primary} />
              </View>
              
              <Text style={styles.subtitle}>
                {isMultiple 
                  ? `Ready to save ${contactsArray.length} contacts to your phone`
                  : `Ready to save ${contactsArray[0]?.name} ${contactsArray[0]?.surname} to your phone`
                }
              </Text>

              {!isMultiple && contactsArray[0] && (
                <View style={styles.contactInfo}>
                  <View style={styles.contactItem}>
                    <MaterialIcons name="person" size={20} color={COLORS.gray} />
                    <Text style={styles.contactText}>{contactsArray[0].name} {contactsArray[0].surname}</Text>
                  </View>
                  <View style={styles.contactItem}>
                    <MaterialIcons name="phone" size={20} color={COLORS.gray} />
                    <Text style={styles.contactText}>{contactsArray[0].phone || 'No phone'}</Text>
                  </View>
                  {contactsArray[0].email && (
                    <View style={styles.contactItem}>
                      <MaterialIcons name="email" size={20} color={COLORS.gray} />
                      <Text style={styles.contactText}>{contactsArray[0].email}</Text>
                    </View>
                  )}
                  {contactsArray[0].company && (
                    <View style={styles.contactItem}>
                      <MaterialIcons name="business" size={20} color={COLORS.gray} />
                      <Text style={styles.contactText}>{contactsArray[0].company}</Text>
                    </View>
                  )}
                  <View style={styles.contactItem}>
                    <MaterialIcons name="handshake" size={20} color={COLORS.gray} />
                    <Text style={styles.contactText}>Met at: {contactsArray[0].howWeMet}</Text>
                  </View>
                </View>
              )}

              {isMultiple && (
                <View style={styles.contactInfo}>
                  <Text style={styles.listTitle}>
                    {contactsArray.length} contacts ready to save:
                    {isProcessing && savedCount > 0 && (
                      <Text style={styles.progressText}> ({savedCount}/{contactsArray.length} saved)</Text>
                    )}
                  </Text>
                  {contactsArray.slice(0, 3).map((c, index) => (
                    <View key={index} style={styles.contactItem}>
                      <MaterialIcons name="person" size={16} color={COLORS.gray} />
                      <Text style={styles.contactText}>• {c.name} {c.surname}</Text>
                    </View>
                  ))}
                  {contactsArray.length > 3 && (
                    <Text style={styles.moreText}>... and {contactsArray.length - 3} more</Text>
                  )}
                </View>
              )}

              <TouchableOpacity 
                style={[styles.exportButton, isProcessing && styles.processingButton]} 
                onPress={handleExport}
                disabled={isProcessing}
              >
                <MaterialIcons 
                  name={isProcessing ? "hourglass-empty" : "person-add"} 
                  size={24} 
                  color={COLORS.white} 
                />
                <Text style={styles.exportButtonText}>
                  {isProcessing ? 'Saving to Phone...' : '📱 Save to Phone'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.permissionNote}>
                This will add the contact{isMultiple ? 's' : ''} directly to your phone's contacts app
              </Text>
            </>
          ) : (
            <>
              <View style={styles.iconContainer}>
                <MaterialIcons name="check-circle" size={64} color="#4CAF50" />
              </View>
              
              <Text style={styles.successTitle}>Saved Successfully!</Text>
              <Text style={styles.successMessage}>
                {isMultiple 
                  ? `${savedCount} contact${savedCount !== 1 ? 's have' : ' has'} been added to your phone's contacts.`
                  : `${contactsArray[0]?.name} ${contactsArray[0]?.surname} has been added to your phone's contacts.`
                }
              </Text>

              <View style={styles.successInfo}>
                <MaterialIcons name="info" size={20} color={COLORS.primary} />
                <Text style={styles.successInfoText}>
                  You can now find {isMultiple ? 'these contacts' : 'this contact'} in your phone's Contacts app
                </Text>
              </View>

              <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
                <MaterialIcons name="done" size={24} color={COLORS.white} />
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray + '30',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.gray + '20',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: COLORS.black,
    marginBottom: 24,
    fontWeight: '500',
  },
  contactInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 32,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: COLORS.black,
    marginLeft: 8,
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'normal',
    color: COLORS.primary,
  },
  moreText: {
    fontSize: 14,
    color: COLORS.gray,
    fontStyle: 'italic',
    marginTop: 8,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  processingButton: {
    opacity: 0.7,
  },
  exportButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  permissionNote: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: COLORS.black,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  successInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 32,
    width: '100%',
  },
  successInfoText: {
    fontSize: 14,
    color: COLORS.black,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  doneButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ContactExportWebView; 