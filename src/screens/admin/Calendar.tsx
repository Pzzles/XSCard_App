import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, Modal, Alert, TextInput, KeyboardAvoidingView, Animated } from 'react-native';
import { Calendar as RNCalendar, DateData } from 'react-native-calendars';
import { COLORS } from '../../constants/colors';
import AdminHeader from '../../components/AdminHeader';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AdminTabParamList, Contact, AuthStackParamList } from '../../types';
import { API_BASE_URL, ENDPOINTS, authenticatedFetch, getUserId } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type CalendarNavigationProp = BottomTabNavigationProp<AdminTabParamList, 'Calendar'>;
type CalendarScreenNavigationProp = StackNavigationProp<AuthStackParamList>;

type Event = {
  id?: string;  // Optional as backend generates this
  meetingWith: string;
  meetingWhen: string;
  description: string;
};

interface MarkedDates {
  [date: string]: {
    marked?: boolean;
    selected?: boolean;
    selectedColor?: string;
    dotColor?: string;
  };
}

interface NoteModalProps {
  visible: boolean;
  selectedContact: Contact | null;
  selectedTime: string;
  eventNote: string;
  onChangeNote: (text: string) => void;
  onBack: () => void;
  onSave: () => void;
  onRequestClose: () => void;
}

interface SuccessModalProps {
  visible: boolean;
  onClose: () => void;
}

interface DeleteModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const NoteModal = ({ 
  visible, 
  selectedContact, 
  selectedTime, 
  eventNote, 
  onChangeNote, 
  onBack, 
  onSave,
  onRequestClose 
}: NoteModalProps) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="none"
    onRequestClose={onRequestClose}
  >
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Note (Optional)</Text>
          <Text style={styles.selectedInfo}>
            Meeting with {selectedContact?.name} at {selectedTime}
          </Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Add meeting notes (optional)..."
            multiline
            value={eventNote}
            onChangeText={onChangeNote}
            autoCapitalize="sentences"
            textAlignVertical="top"
          />
          <View style={styles.noteButtonsContainer}>
            <TouchableOpacity 
              style={[styles.noteButton, styles.backButton]}
              onPress={onBack}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.noteButton, styles.saveButton]}
              onPress={onSave}
            >
              <Text style={styles.saveButtonText}>Create Meeting</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

const SuccessModal = ({ visible, onClose }: SuccessModalProps) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
  >
    <View style={styles.modalContainer}>
      <View style={styles.successModalContent}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>Meeting Created!</Text>
        <TouchableOpacity style={styles.successButton} onPress={onClose}>
          <Text style={styles.successButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const DeleteConfirmationModal = ({ visible, onClose, onConfirm }: DeleteModalProps) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
  >
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Delete Meeting</Text>
        <Text style={styles.modalMessage}>Are you sure you want to delete this meeting?</Text>
        <View style={styles.modalButtonsContainer}>
          <TouchableOpacity
            style={[styles.modalButton, styles.modalButtonCancel]}
            onPress={onClose}
          >
            <Text style={[styles.modalButtonText, styles.modalButtonTextCancel]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.modalButtonConfirm]}
            onPress={onConfirm}
          >
            <Text style={styles.modalButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

export default function Calendar() {
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedDate, setSelectedDate] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isContactsModalVisible, setIsContactsModalVisible] = useState(false);
  const [isTimeModalVisible, setIsTimeModalVisible] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [eventNote, setEventNote] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<number | null>(null);
  const navigation = useNavigation<CalendarScreenNavigationProp>();
  
  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00',
    '17:00', '18:00'
  ];

  const loadContacts = async () => {
    try {
      const userId = await getUserId();
      if (!userId) {
        console.error('No user ID found');
        return;
      }

      // Fetch contacts from server
      const response = await authenticatedFetch(ENDPOINTS.GET_CONTACTS + `/${userId}`);
      const data = await response.json();
      
      console.log('Loaded contacts data:', data); // Debug log

      if (data && Array.isArray(data.contactList)) {
        setContacts(data.contactList);
      } else {
        console.log('No contacts found or invalid format:', data);
        setContacts([]);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    }
  };

  const loadEvents = async () => {
    try {
      const savedEvents = await AsyncStorage.getItem('calendarEvents');
      if (savedEvents) {
        const parsedEvents = JSON.parse(savedEvents);
        setEvents(parsedEvents);
        
        // Create marked dates object
        const marks: MarkedDates = {};
        parsedEvents.forEach((event: Event) => {
          const eventDate = event.meetingWhen.split('T')[0];  // Extract date part from ISO string
          marks[eventDate] = { marked: true, dotColor: '#FF69B4' };
        });
        setMarkedDates(marks);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    const checkUserPlan = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const { plan } = JSON.parse(userData);
          setUserPlan(plan);
          
          // Redirect if user is on free plan
          if (plan === 'free') {
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainApp', params: undefined }],
            });
          }
        }
      } catch (error) {
        console.error('Error checking user plan:', error);
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp', params: undefined }],
        });
      }
    };

    checkUserPlan();
  }, [navigation]);

  const handleSaveEvent = async () => {
    try {
      if (!selectedDate || !selectedTime || !selectedContact) {
        Alert.alert('Error', 'Please select date, time and contact');
        return;
      }

      // Format the date and time to ISO string
      const [year, month, day] = selectedDate.split('-');
      const [hour, minute] = selectedTime.split(':');
      const meetingDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );

      const newEvent = {
        meetingWith: `${selectedContact.name} ${selectedContact.surname}`.trim(),
        meetingWhen: meetingDate.toISOString(),
        description: eventNote // Use the eventNote value instead of empty string
      };

      // Save to backend
      const response = await authenticatedFetch(ENDPOINTS.CREATE_MEETING, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEvent)
      });

      const savedMeeting = await response.json();
      
      if (savedMeeting.error) {
        throw new Error(savedMeeting.error);
      }

      // Update local state with the note included
      setEvents(prevEvents => [...prevEvents, {
        ...newEvent,
        id: savedMeeting.id,
        description: eventNote // Ensure note is included in local state
      }]);

      // Update marked dates
      setMarkedDates(prev => ({
        ...prev,
        [selectedDate]: { marked: true, dotColor: '#FF69B4' }
      }));

      // Show success and reset states
      setShowSuccessModal(true);
      setIsNoteModalVisible(false);
      setSelectedContact(null);
      setEventNote('');
      setSelectedDate('');
      setSelectedTime('');
    } catch (error) {
      console.error('Error saving event:', error);
      setShowSuccessModal(false);
    }
  };

  return (
    <View style={styles.container}>
      <AdminHeader title="Calendar" />
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.yearSelector}>
          <Text style={styles.yearText}>{selectedYear}</Text>
          <TouchableOpacity>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
        </View>

        <RNCalendar
          style={styles.calendar}
          theme={{
            backgroundColor: '#ffffff',
            calendarBackground: '#ffffff',
            textSectionTitleColor: '#000000',
            selectedDayBackgroundColor: COLORS.primary,
            selectedDayTextColor: '#ffffff',
            todayTextColor: COLORS.primary,
            dayTextColor: '#2d4150',
            monthTextColor: COLORS.primary,
            textMonthFontSize: 20,
            textMonthFontWeight: 'bold',
          }}
          markedDates={{
            ...markedDates,
            [selectedDate]: { selected: true, selectedColor: COLORS.primary }
          }}
          onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        />

        <View style={styles.eventsSection}>
          <Text style={styles.upcomingTitle}>Upcoming Events</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {events.map((event, index) => (
              <TouchableOpacity 
                key={event.id ? `event-${event.id}-${index}` : `event-${index}`} 
                style={styles.eventCard}
                onPress={() => setSelectedEventIndex(selectedEventIndex === index ? null : index)}
              >
                {selectedEventIndex === index && (
                  <TouchableOpacity 
                    style={styles.deleteIcon}
                    onPress={() => {
                      setMeetingToDelete(index);
                      setIsDeleteModalVisible(true);
                    }}
                  >
                    <Ionicons name="close-circle" size={24} color="red" />
                  </TouchableOpacity>
                )}
                <Text style={styles.eventDate}>
                  {new Date(event.meetingWhen).getDate()} {new Date(event.meetingWhen).toLocaleString('default', { weekday: 'short' }).toUpperCase()}
                </Text>
                <Text style={styles.eventTitle}>Meeting with {event.meetingWith}</Text>
                <Text style={styles.eventTime}>
                  {new Date(event.meetingWhen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {event.description && <Text style={styles.eventNote}>{event.description}</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity 
            style={[
              styles.createEventButton,
              selectedDate && styles.createEventButtonActive
            ]}
            onPress={() => {
              if (selectedDate) {
                setIsTimeModalVisible(true);
              }
            }}
          >
            <Text style={[
              styles.createEventText,
              selectedDate && styles.createEventTextActive
            ]}>
              + Create Events
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={isContactsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsContactsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Contacts</Text>
            <ScrollView style={styles.contactsList}>
              {contacts.map((contact, index) => (
                <TouchableOpacity 
                  key={`contact-${contact.id || index}`}
                  style={styles.contactItem}
                  onPress={() => {
                    setSelectedContact(contact);
                    setIsContactsModalVisible(false);
                    setIsNoteModalVisible(true);
                  }}
                >
                  <Text style={styles.contactName}>
                    {contact.name} {contact.surname}
                  </Text>
                  <Text style={styles.contactDetails}>{contact.number}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setIsContactsModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isTimeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsTimeModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Time</Text>
            <ScrollView style={styles.timeList}>
              {timeSlots.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeItem,
                    selectedTime === time && styles.selectedTimeItem
                  ]}
                  onPress={() => {
                    setSelectedTime(time);
                    setIsTimeModalVisible(false);
                    loadContacts();
                    setIsContactsModalVisible(true);
                  }}
                >
                  <Text style={[
                    styles.timeText,
                    selectedTime === time && styles.selectedTimeText
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setIsTimeModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <NoteModal 
        visible={isNoteModalVisible}
        selectedContact={selectedContact}
        selectedTime={selectedTime}
        eventNote={eventNote}
        onChangeNote={setEventNote}
        onBack={() => {
          setIsNoteModalVisible(false);
          setSelectedContact(null);
          setEventNote('');
          setIsContactsModalVisible(true);
        }}
        onSave={handleSaveEvent}
        onRequestClose={() => setIsNoteModalVisible(false)}
      />

      <SuccessModal 
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
      />

      <DeleteConfirmationModal
        visible={isDeleteModalVisible}
        onClose={() => {
          setIsDeleteModalVisible(false);
          setMeetingToDelete(null);
        }}
        onConfirm={() => {
          if (meetingToDelete !== null) {
            const updatedEvents = events.filter((e, i) => i !== meetingToDelete);
            setEvents(updatedEvents);
            const newMarkedDates = { ...markedDates };
            delete newMarkedDates[events[meetingToDelete].meetingWhen.split('T')[0]];
            setMarkedDates(newMarkedDates);
            setSelectedEventIndex(null);
          }
          setIsDeleteModalVisible(false);
          setMeetingToDelete(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    marginTop: 90,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: Platform.select({
      ios: 20,
      android: 40,
    }),
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  yearText: {
    fontSize: 18,
    marginRight: 5,
  },
  dropdownIcon: {
    fontSize: 12,
  },
  calendar: {
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  eventsSection: {
    marginTop: 20,
  },
  upcomingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  eventCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginRight: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    minWidth: 150,
    position: 'relative',
  },
  eventDate: {
    color: '#FF69B4',
    fontSize: 12,
    marginBottom: 5,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  eventTime: {
    color: '#666',
    fontSize: 12,
  },
  createEventButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  createEventButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  createEventText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  createEventTextActive: {
    color: 'white',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    width: '90%',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  contactsList: {
    maxHeight: '80%',
  },
  contactItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
  },
  contactDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  closeButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  timeList: {
    maxHeight: '70%',
  },
  timeItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  selectedTimeItem: {
    backgroundColor: COLORS.primary + '20',
  },
  timeText: {
    fontSize: 18,
    color: '#333',
  },
  selectedTimeText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  selectedInfo: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    height: 120,
    backgroundColor: '#fff',
    fontSize: 16,
    textAlignVertical: 'top',
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  noteButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
  },
  noteButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#666',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  eventNote: {
    color: '#666',
    fontSize: 12,
    marginTop: 5,
    fontStyle: 'italic',
  },
  successModalContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    width: '80%',
  },
  successIcon: {
    fontSize: 50,
    color: '#4CAF50',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  successButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  successButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: COLORS.black,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F0F0F0',
  },
  modalButtonConfirm: {
    backgroundColor: COLORS.error,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.white,
  },
  modalButtonTextCancel: {
    color: COLORS.black,
  },
});
