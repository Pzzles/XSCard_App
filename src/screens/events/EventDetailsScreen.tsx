import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS } from '../../constants/colors';
import Header from '../../components/Header';
import { authenticatedFetchWithRefresh, ENDPOINTS } from '../../utils/api';
import {
  Event,
  EventDetailsResponse,
  EventRegistration,
  EventRegistrationResponse,
} from '../../types/events';

// Navigation types
type RootStackParamList = {
  EventDetails: { eventId: string; event?: Event };
  Events: undefined;
};

type EventDetailsRouteProp = RouteProp<RootStackParamList, 'EventDetails'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function EventDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EventDetailsRouteProp>();

  const { eventId, event: passedEvent } = route.params;

  // State management
  const [event, setEvent] = useState<Event | null>(passedEvent || null);
  const [loading, setLoading] = useState(!passedEvent);
  const [registering, setRegistering] = useState(false);
  const [userRegistration, setUserRegistration] = useState<EventRegistration | null>(null);
  const [isOrganizer, setIsOrganizer] = useState(false);

  // Load event details
  useEffect(() => {
    if (!passedEvent) {
      loadEventDetails();
    } else {
      // If we have passed event data, still load full details
      loadEventDetails();
    }
  }, [eventId]);

  const loadEventDetails = async () => {
    try {
      setLoading(true);

      const response = await authenticatedFetchWithRefresh(
        ENDPOINTS.GET_EVENT_DETAILS.replace(':eventId', eventId),
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`Failed to load event details: ${response.status}`);
      }

      const data: EventDetailsResponse = await response.json();

      if (data.success) {
        setEvent(data.data.event);
        setUserRegistration(data.data.userRegistration || null);
        setIsOrganizer(data.data.isOrganizer);
      } else {
        throw new Error('Failed to load event details');
      }
    } catch (error) {
      console.error('Error loading event details:', error);
      Alert.alert(
        'Error',
        'Failed to load event details. Please try again.',
        [
          { text: 'Retry', onPress: loadEventDetails },
          { text: 'Go Back', onPress: () => navigation.goBack() },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle event registration
  const handleRegister = async () => {
    if (!event) return;

    try {
      setRegistering(true);

      // Check if event is full
      if (event.maxAttendees !== -1 && event.currentAttendees >= event.maxAttendees) {
        Alert.alert('Event Full', 'This event is at full capacity.');
        return;
      }

      const response = await authenticatedFetchWithRefresh(
        ENDPOINTS.REGISTER_EVENT.replace(':eventId', eventId),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            specialRequests: '', // You can add a text input for this later
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Registration failed: ${response.status}`);
      }

      const data: EventRegistrationResponse = await response.json();

      if (data.success) {
        setUserRegistration(data.registration);
        
        // Update event attendance count
        setEvent(prev => prev ? {
          ...prev,
          currentAttendees: prev.currentAttendees + 1
        } : null);

        Alert.alert(
          'Registration Successful!',
          `You've successfully registered for ${event.title}. You should receive a confirmation email shortly.`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Error registering for event:', error);
      Alert.alert(
        'Registration Failed',
        error instanceof Error ? error.message : 'Failed to register for event. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setRegistering(false);
    }
  };

  // Handle event unregistration
  const handleUnregister = async () => {
    if (!event || !userRegistration) return;

    Alert.alert(
      'Unregister from Event',
      `Are you sure you want to unregister from ${event.title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unregister',
          style: 'destructive',
          onPress: async () => {
            try {
              setRegistering(true);

              const response = await authenticatedFetchWithRefresh(
                ENDPOINTS.UNREGISTER_EVENT.replace(':eventId', eventId),
                { method: 'DELETE' }
              );

              if (!response.ok) {
                throw new Error(`Unregistration failed: ${response.status}`);
              }

              setUserRegistration(null);
              
              // Update event attendance count
              setEvent(prev => prev ? {
                ...prev,
                currentAttendees: Math.max(0, prev.currentAttendees - 1)
              } : null);

              Alert.alert('Unregistered', 'You have been unregistered from this event.');
            } catch (error) {
              console.error('Error unregistering from event:', error);
              Alert.alert('Error', 'Failed to unregister from event. Please try again.');
            } finally {
              setRegistering(false);
            }
          },
        },
      ]
    );
  };

  // Format date and time
  const formatEventDateTime = (dateString: string, endDateString?: string) => {
    const startDate = new Date(dateString);
    const endDate = endDateString ? new Date(endDateString) : null;

    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
    };

    const formattedDate = startDate.toLocaleDateString([], dateOptions);
    const startTime = startDate.toLocaleTimeString([], timeOptions);
    const endTime = endDate ? endDate.toLocaleTimeString([], timeOptions) : null;

    return {
      date: formattedDate,
      time: endTime ? `${startTime} - ${endTime}` : startTime,
    };
  };

  // Open location in maps
  const openInMaps = () => {
    if (!event) return;
    
    const { venue, address, city } = event.location;
    const query = encodeURIComponent(`${venue}, ${address}, ${city}`);
    const url = `https://maps.google.com/?q=${query}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open maps application.');
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Event Details" />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading event details...</Text>
        </View>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <Header title="Event Details" />
        <View style={styles.error}>
          <MaterialIcons name="error" size={64} color={COLORS.error} />
          <Text style={styles.errorText}>Event not found</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const dateTime = formatEventDateTime(event.eventDate, event.endDate);
  const isEventFull = event.maxAttendees !== -1 && event.currentAttendees >= event.maxAttendees;
  const canRegister = !userRegistration && !isEventFull && event.status === 'published';

  return (
    <View style={styles.container}>
      <Header 
        title="Event Details"
        rightIcon={
          isOrganizer ? (
            <TouchableOpacity onPress={() => {/* Navigate to edit */}}>
              <MaterialIcons name="edit" size={24} color={COLORS.black} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Event Image */}
        {event.bannerImage || (event.images && event.images.length > 0) ? (
          <Image
            source={{ uri: event.bannerImage || event.images![0] }}
            style={styles.eventImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: COLORS.primary }]}>
            <MaterialIcons name="event" size={48} color={COLORS.white} />
          </View>
        )}

        <View style={styles.content}>
          {/* Title and Price */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{event.title}</Text>
            <View style={[
              styles.priceBadge,
              { backgroundColor: event.eventType === 'free' ? '#4CAF50' : COLORS.primary }
            ]}>
              <Text style={styles.priceText}>
                {event.eventType === 'free' ? 'FREE' : `R${event.ticketPrice}`}
              </Text>
            </View>
          </View>

          {/* Category */}
          <View style={styles.categorySection}>
            <Text style={styles.categoryText}>
              {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
            </Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About This Event</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>

          {/* Date and Time */}
          <View style={styles.section}>
            <View style={styles.infoRow}>
              <MaterialIcons name="schedule" size={24} color={COLORS.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Date & Time</Text>
                <Text style={styles.infoText}>{dateTime.date}</Text>
                <Text style={styles.infoSubtext}>{dateTime.time}</Text>
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.infoRow} onPress={openInMaps}>
              <MaterialIcons name="location-on" size={24} color={COLORS.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Location</Text>
                <Text style={styles.infoText}>{event.location.venue}</Text>
                <Text style={styles.infoSubtext}>
                  {event.location.address}, {event.location.city}
                </Text>
              </View>
              <MaterialIcons name="launch" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          {/* Organizer */}
          <View style={styles.section}>
            <View style={styles.infoRow}>
              <MaterialIcons name="person" size={24} color={COLORS.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Organized by</Text>
                <Text style={styles.infoText}>{event.organizerInfo.name}</Text>
                {event.organizerInfo.company && (
                  <Text style={styles.infoSubtext}>{event.organizerInfo.company}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Attendance */}
          <View style={styles.section}>
            <View style={styles.infoRow}>
              <MaterialIcons name="people" size={24} color={COLORS.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Attendance</Text>
                <Text style={styles.infoText}>
                  {event.maxAttendees === -1 
                    ? `${event.currentAttendees} attending`
                    : `${event.currentAttendees} / ${event.maxAttendees} attending`
                  }
                </Text>
                {isEventFull && (
                  <Text style={[styles.infoSubtext, { color: COLORS.error }]}>
                    Event is full
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Registration Status */}
          {userRegistration && (
            <View style={styles.registrationStatus}>
              <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
              <Text style={styles.registrationText}>
                You're registered for this event!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {userRegistration ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.unregisterButton]}
            onPress={handleUnregister}
            disabled={registering}
          >
            {registering ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <MaterialIcons name="cancel" size={24} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Unregister</Text>
              </>
            )}
          </TouchableOpacity>
        ) : canRegister ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
            onPress={handleRegister}
            disabled={registering}
          >
            {registering ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <MaterialIcons name="event-available" size={24} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Register for Event</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[styles.actionButton, styles.disabledButton]}>
            <Text style={[styles.actionButtonText, { color: COLORS.gray }]}>
              {isEventFull ? 'Event Full' : 'Registration Closed'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
    marginTop: 100, // Account for header
  },
  eventImage: {
    width: '100%',
    height: 250,
  },
  imagePlaceholder: {
    width: '100%',
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
    marginRight: 16,
  },
  priceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priceText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryText: {
    fontSize: 16,
    color: COLORS.gray,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: COLORS.black,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 16,
    color: COLORS.black,
    marginBottom: 2,
  },
  infoSubtext: {
    fontSize: 14,
    color: COLORS.gray,
  },
  registrationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
  },
  registrationText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
  },
  actionContainer: {
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  unregisterButton: {
    backgroundColor: COLORS.error,
  },
  disabledButton: {
    backgroundColor: COLORS.background,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.error,
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 