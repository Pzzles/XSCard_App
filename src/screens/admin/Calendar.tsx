import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, Modal, Alert, TextInput, KeyboardAvoidingView, Animated, ActivityIndicator } from 'react-native';
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

// Update Event type to match actual Firebase response
type Event = {
  id?: string;
  meetingWith: string;
  meetingWhen: string;  // Change this to string to match Firebase format
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
  isLoading: boolean;
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
  onRequestClose,
  isLoading
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
              disabled={isLoading}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.noteButton, styles.saveButton]}
              onPress={onSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.saveButtonText}>Create Meeting</Text>
              )}
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

const MONTH_MAP: { [key: string]: string } = {
  'January': '01',
  'February': '02',
  'March': '03',
  'April': '04',
  'May': '05',
  'June': '06',
  'July': '07',
  'August': '08',
  'September': '09',
  'October': '10',
  'November': '11',
  'December': '12'
};

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
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const navigation = useNavigation<CalendarScreenNavigationProp>();
  const [userInfo, setUserInfo] = useState<{ name: string; surname: string; email: string } | null>(null);
  
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

  // Update loadEvents function to debug date handling
const loadEvents = async () => {
  try {
    setIsLoadingEvents(true);
    const userId = await getUserId();
    if (!userId) {
      throw new Error('No user ID found');
    }

    const response = await authenticatedFetch(`/meetings/${userId}`);
    const data = await response.json();
    
    console.log('Meetings response:', JSON.stringify(data, null, 2));

    if (data.success && data.data.meetings) {
      setEvents(data.data.meetings);
      
      const marks: MarkedDates = {};
      data.data.meetings.forEach((event: Event) => {
        try {
          const dateStr = event.meetingWhen.replace(' at at ', ' at ');
          console.log('Processing fixed date:', dateStr);
          
          // Parse the date parts
          const [monthStr, day, year] = dateStr.split(' at ')[0].split(' ');
          
          // Get month number from our mapping
          const month = MONTH_MAP[monthStr];
          
          // Format the date in YYYY-MM-DD format
          const formattedDate = `${year}-${month}-${day.padStart(2, '0')}`;
          console.log('Formatted date:', formattedDate);
          
          marks[formattedDate] = { marked: true, dotColor: '#FF69B4' };
        } catch (error) {
          console.error('Error parsing date:', error, event.meetingWhen);
        }
      });
      setMarkedDates(marks);
    }
  } catch (error) {
    console.error('Error loading events:', error);
    Alert.alert('Error', 'Failed to load meetings');
  } finally {
    setIsLoadingEvents(false);
  }
};

  useEffect(() => {
    fetchUserInfo();
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

  const fetchUserInfo = async () => {
    try {
      const userId = await getUserId();
      if (!userId) {
        console.error('No user ID found for fetching user info');
        return;
      }
      
      console.log('Fetching user card info for user ID:', userId);
      const response = await authenticatedFetch(`${ENDPOINTS.GET_CARD}/${userId}`);
      
      if (!response.ok) {
        console.error('Failed to fetch user card info');
        return;
      }
      
      const cards = await response.json();
      console.log('User cards data:', cards);
      
      if (cards && cards.length > 0) {
        // Use the default card (first card)
        const defaultCard = cards[0];
        setUserInfo({
          name: defaultCard.name || '',
          surname: defaultCard.surname || '',
          email: defaultCard.email || 'contact@xscard.com'
        });
        
        console.log('Set user info from card:', {
          name: defaultCard.name,
          surname: defaultCard.surname,
          email: defaultCard.email
        });
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const handleSaveEvent = async () => {
    if (isCreatingMeeting) return; // Prevent double submission
    
    try {
      setIsCreatingMeeting(true);

      if (!selectedDate || !selectedTime || !selectedContact) {
        Alert.alert('Error', 'Please select date, time and contact');
        return;
      }

      const [hour, minute] = selectedTime.split(':');
      const startDateTime = new Date(
        selectedDate + 'T' + `${hour}:${minute}:00`
      );
      
      // Calculate end time (1 hour after start time)
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + 1);
      
      // Create default organizer info
      let organizerName = "XS Card User";
      let organizerEmail = "contact@xscard.com";
      
      // Use user info from card if available
      if (userInfo) {
        organizerName = `${userInfo.name} ${userInfo.surname}`.trim();
        if (organizerName.length === 0) organizerName = "XS Card User";
        
        if (userInfo.email) {
          organizerEmail = userInfo.email;
        }
      }
      
      console.log('Using organizer info:', { name: organizerName, email: organizerEmail });
      
      // Create meeting invite with proper attendee format
      const meetingData = {
        // Use the organizer name for the title
        title: `Meeting with ${organizerName}`,
        description: eventNote || '', 
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        location: "https://zoom.us/j/123456789", // Dummy Zoom link
        attendees: [
          {
            name: `${selectedContact.name} ${selectedContact.surname}`.trim(),
            email: selectedContact.email || `${selectedContact.name.toLowerCase()}@example.com` // Fallback if email is missing
          }
        ],
        // Add organizer information explicitly
        organizer: {
          name: organizerName,
          email: organizerEmail
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone // Get user's timezone
      };

      console.log('Sending meeting data:', meetingData);

      // First try to send invitation
      const inviteResponse = await authenticatedFetch(ENDPOINTS.MEETING_INVITE, {
        method: 'POST',
        body: JSON.stringify(meetingData)
      });
      
      let inviteResult;
      try {
        // Log the response for debugging
        inviteResult = await inviteResponse.json();
        console.log('Invite response:', inviteResult);
      } catch (jsonError) {
        console.error('Error parsing invite response:', jsonError);
      }
      
      if (!inviteResponse.ok) {
        console.warn("Failed to send invitation, falling back to regular meeting creation");
        
        // Fallback to regular meeting creation if invite fails
        const fallbackMeeting = {
          meetingWith: `${selectedContact.name} ${selectedContact.surname}`.trim(),
          meetingWhen: startDateTime.toISOString(),
          description: eventNote || ''
        };
        
        const fallbackResponse = await authenticatedFetch(ENDPOINTS.CREATE_MEETING, {
          method: 'POST',
          body: JSON.stringify(fallbackMeeting)
        });
        
        if (!fallbackResponse.ok) {
          let errorMessage = 'Failed to create meeting';
          try {
            const errorData = await fallbackResponse.json();
            if (errorData && errorData.message) {
              errorMessage = errorData.message;
            }
          } catch (e) {
            console.error('Error parsing error response:', e);
          }
          
          throw new Error(errorMessage);
        }
      }

      // Reload events to get updated list
      await loadEvents();
      
      // Show success and reset states
      setShowSuccessModal(true);
      setIsNoteModalVisible(false);
      setSelectedContact(null);
      setEventNote('');
      setSelectedDate('');
      setSelectedTime('');

    } catch (error: unknown) {
      console.error('Error saving event:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create meeting');
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  const handleDeleteMeeting = async (index: number) => {
    try {
      const userId = await getUserId();
      if (!userId) {
        throw new Error('No user ID found');
      }

      const response = await authenticatedFetch(`/meetings/${userId}/${index}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete meeting');
      }

      // Reload events after deletion
      await loadEvents();
      setIsDeleteModalVisible(false);
      setMeetingToDelete(null);
      setSelectedEventIndex(null);

    } catch (error) {
      console.error('Error deleting meeting:', error);
      Alert.alert('Error', 'Failed to delete meeting');
    }
  };

const renderEventDate = (dateStr: string) => {
  try {
    const fixedDateStr = dateStr.replace(' at at ', ' at ');
    const [monthStr, day, year] = fixedDateStr.split(' at ')[0].split(' ');
    
    // Return day, abbreviated month, and year
    return `${day} ${monthStr.slice(0, 3).toUpperCase()} ${year}`;
  } catch (error) {
    console.error('Error rendering date:', error);
    return 'Invalid date';
  }
};

  const renderEventTime = (dateStr: string) => {
    try {
      const fixedDateStr = dateStr.replace(' at at ', ' at ');
      const [, timeStr] = fixedDateStr.split(' at ');
      return timeStr.split(' ')[0]; // Returns just the time part
    } catch (error) {
      console.error('Error rendering time:', error);
      return 'Invalid time';
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
          {events.length > 0 ? (
            Platform.OS === 'ios' ? (
              <View style={styles.eventsWrapper}>
                <ScrollView 
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.eventsScrollView}
                  style={styles.eventsScrollContainer}
                  nestedScrollEnabled={true}
                >
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
                        {renderEventDate(event.meetingWhen)}
                      </Text>
                      <Text style={styles.eventTitle}>Meeting with {event.meetingWith}</Text>
                      <Text style={styles.eventTime}>
                        {renderEventTime(event.meetingWhen)}
                      </Text>
                      {event.description && <Text style={styles.eventNote}>{event.description}</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : (
              <View style={styles.androidEventsWrapper}>
                <ScrollView
                  horizontal={false}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={styles.androidEventsScrollView}
                  style={styles.androidEventsScrollContainer}
                  nestedScrollEnabled={true}
                >
                  <View style={styles.androidEventsGrid}>
                    {events.map((event, index) => (
                      <TouchableOpacity 
                        key={event.id ? `event-${event.id}-${index}` : `event-${index}`} 
                        style={styles.androidEventCard}
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
                        <Text style={styles.eventDate}>{renderEventDate(event.meetingWhen)}</Text>
                        <Text style={styles.eventTitle}>Meeting with {event.meetingWith}</Text>
                        <Text style={styles.eventTime}>{renderEventTime(event.meetingWhen)}</Text>
                        {event.description && <Text style={styles.eventNote}>{event.description}</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )
          ) : (
            <Text style={styles.emptyEventsMessage}>No events scheduled</Text>
          )}
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
        isLoading={isCreatingMeeting}
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
            handleDeleteMeeting(meetingToDelete);
          }
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
      android: 80,
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
    marginBottom: 20, // Add some bottom margin
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
    minWidth: 200, // Increase minimum width
    maxWidth: 250, // Add maximum width
    position: 'relative',
    marginVertical: 5, // Add vertical margin
  },
  eventsScrollView: {
    paddingLeft: 20, // Add left padding
    paddingRight: 5, // Add right padding
    marginBottom: 15, // Add bottom margin
  },
  emptyEventsMessage: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    paddingVertical: 20,
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
    marginBottom: Platform.OS === 'android' ? 20 : 0,
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
    minHeight: 45, // Add minimum height to prevent size change during loading
    justifyContent: 'center',
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
  eventsWrapper: {
    flex: 1,
  },
  eventsScrollContainer: {
    flex: 1,
  },
  androidEventsWrapper: {
    height: 200,
    marginBottom: 10,
  },
  androidEventsScrollContainer: {
    flex: 1,
  },
  androidEventsScrollView: {
    paddingHorizontal: 10,
  },
  androidEventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  androidEventCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    width: '48%',
    marginBottom: 12,
    position: 'relative',
  },
});