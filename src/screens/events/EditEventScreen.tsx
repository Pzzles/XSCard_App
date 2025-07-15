import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import { COLORS } from '../../constants/colors';
import EventHeader from '../../components/EventHeader';
import { authenticatedFetchWithRefresh, ENDPOINTS } from '../../utils/api';
import { useToast } from '../../hooks/useToast';
import {
  CreateEventData,
  EVENT_CATEGORIES,
  EventCategory,
  EventLocation,
  Event,
} from '../../types/events';

type RootStackParamList = {
  EditEvent: { eventId: string; event?: Event };
  MyEvents: undefined;
};

type EditEventRouteProp = RouteProp<RootStackParamList, 'EditEvent'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Form steps
const STEPS = {
  BASIC_INFO: 0,
  DETAILS: 1,
  LOCATION: 2,
  MEDIA: 3,
  REVIEW: 4,
} as const;

const STEP_TITLES = [
  'Basic Information',
  'Event Details', 
  'Location & Venue',
  'Images & Media',
  'Review & Publish',
];

export default function EditEventScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditEventRouteProp>();
  const toast = useToast();

  const { eventId, event: passedEvent } = route.params;

  // State for form steps
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(!passedEvent);
  const [saving, setSaving] = useState(false);

  // State for event data
  const [eventData, setEventData] = useState<CreateEventData>({
    title: '',
    description: '',
    eventDate: '',
    endDate: undefined,
    category: 'other' as EventCategory,
    eventType: 'free',
    ticketPrice: 0,
    maxAttendees: -1,
    visibility: 'public',
    location: {
      venue: '',
      address: '',
      city: '',
      country: '',
      coordinates: undefined,
    },
    images: [],
    tags: [],
  });

  // Load event data if editing existing event
  useEffect(() => {
    if (passedEvent) {
      populateFormFromEvent(passedEvent);
      setLoading(false);
    } else {
      loadEventDetails();
    }
  }, [eventId, passedEvent]);

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetchWithRefresh(
        ENDPOINTS.GET_EVENT_DETAILS.replace(':eventId', eventId),
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error('Failed to load event details');
      }

      const data = await response.json();
      if (data.success && data.data) {
        populateFormFromEvent(data.data);
      } else {
        throw new Error('Event not found');
      }
    } catch (error) {
      console.error('Error loading event:', error);
      toast.error('Error', 'Failed to load event details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const populateFormFromEvent = (event: Event) => {
    setEventData({
      title: event.title,
      description: event.description,
      eventDate: event.eventDateISO || event.eventDate, // Prefer ISO format for editing
      endDate: event.endDateISO || event.endDate, // Prefer ISO format for editing
      category: event.category as EventCategory,
      eventType: event.eventType,
      ticketPrice: event.ticketPrice,
      maxAttendees: event.maxAttendees,
      visibility: event.visibility,
      location: event.location,
      images: event.images || [],
      tags: event.tags || [],
    });
  };

  // Validation functions
  const isStepValid = () => {
    switch (currentStep) {
      case STEPS.BASIC_INFO:
        return eventData.title.trim() && eventData.description.trim();
      case STEPS.DETAILS:
        return eventData.eventType === 'free' || (eventData.eventType === 'paid' && eventData.ticketPrice > 0);
      case STEPS.LOCATION:
        return eventData.location.venue.trim() && 
               eventData.location.address.trim() && 
               eventData.location.city.trim() && 
               eventData.location.country.trim();
      default:
        return true;
    }
  };

  const isFormValid = () => {
    return eventData.title.trim() && 
           eventData.description.trim() &&
           eventData.location.venue.trim() && 
           eventData.location.address.trim() && 
           eventData.location.city.trim() && 
           eventData.location.country.trim();
  };

  const handleUpdateEvent = async () => {
    try {
      setSaving(true);

      // Prepare the update data with proper date formatting
      const updateData = {
        title: eventData.title,
        description: eventData.description,
        eventDate: eventData.eventDate, // Keep as string - backend will handle conversion
        endDate: eventData.endDate || null, // Ensure null if undefined
        category: eventData.category,
        eventType: eventData.eventType,
        ticketPrice: eventData.ticketPrice,
        maxAttendees: eventData.maxAttendees,
        visibility: eventData.visibility,
        location: eventData.location,
        images: eventData.images,
        tags: eventData.tags,
      };

      // Validate dates are proper ISO strings before sending
      if (updateData.eventDate) {
        const eventDate = new Date(updateData.eventDate);
        if (isNaN(eventDate.getTime())) {
          throw new Error('Invalid event date');
        }
        updateData.eventDate = eventDate.toISOString();
      }

      if (updateData.endDate) {
        const endDate = new Date(updateData.endDate);
        if (isNaN(endDate.getTime())) {
          throw new Error('Invalid end date');
        }
        updateData.endDate = endDate.toISOString();
      }

      console.log('Updating event with data:', updateData);
      console.log('Using endpoint:', ENDPOINTS.UPDATE_EVENT.replace(':eventId', eventId));

      const response = await authenticatedFetchWithRefresh(
        ENDPOINTS.UPDATE_EVENT.replace(':eventId', eventId),
        {
          method: 'PATCH', // Changed from PUT to PATCH
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        }
      );

      console.log('Update response status:', response.status);
      const responseText = await response.text();
      console.log('Update response body:', responseText);

      if (!response.ok) {
        throw new Error(`Failed to update event: ${response.status} - ${responseText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Invalid response format from server');
      }

      if (data.success) {
        toast.success('Success', 'Event updated successfully');
        navigation.navigate('MyEvents');
      } else {
        throw new Error(data.message || 'Failed to update event');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Error', error instanceof Error ? error.message : 'Failed to update event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderBasicInfo = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Event Information</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Event Title *</Text>
        <TextInput
          style={styles.input}
          value={eventData.title}
          onChangeText={(text) => setEventData(prev => ({ ...prev, title: text }))}
          placeholder="Enter event title"
          maxLength={100}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={eventData.description}
          onChangeText={(text) => setEventData(prev => ({ ...prev, description: text }))}
          placeholder="Describe your event..."
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
          {EVENT_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                eventData.category === category && styles.categoryChipSelected
              ]}
              onPress={() => setEventData(prev => ({ ...prev, category }))}
            >
              <Text style={[
                styles.categoryText,
                eventData.category === category && styles.categoryTextSelected
              ]}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderDetails = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Event Details</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Event Type</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleOption,
              eventData.eventType === 'free' && styles.toggleOptionSelected
            ]}
            onPress={() => setEventData(prev => ({ ...prev, eventType: 'free', ticketPrice: 0 }))}
          >
            <Text style={[
              styles.toggleText,
              eventData.eventType === 'free' && styles.toggleTextSelected
            ]}>Free</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleOption,
              eventData.eventType === 'paid' && styles.toggleOptionSelected
            ]}
            onPress={() => setEventData(prev => ({ ...prev, eventType: 'paid' }))}
          >
            <Text style={[
              styles.toggleText,
              eventData.eventType === 'paid' && styles.toggleTextSelected
            ]}>Paid</Text>
          </TouchableOpacity>
        </View>
      </View>

      {eventData.eventType === 'paid' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Ticket Price</Text>
          <TextInput
            style={styles.input}
            value={eventData.ticketPrice.toString()}
            onChangeText={(text) => setEventData(prev => ({ ...prev, ticketPrice: parseFloat(text) || 0 }))}
            placeholder="0.00"
            keyboardType="numeric"
          />
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Maximum Attendees</Text>
        <TextInput
          style={styles.input}
          value={eventData.maxAttendees === -1 ? '' : eventData.maxAttendees.toString()}
          onChangeText={(text) => setEventData(prev => ({ ...prev, maxAttendees: text === '' ? -1 : parseInt(text) || -1 }))}
          placeholder="Unlimited"
          keyboardType="numeric"
        />
        <Text style={styles.helperText}>Leave empty for unlimited attendees</Text>
      </View>
    </View>
  );

  const renderLocation = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Location & Venue</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Venue Name *</Text>
        <TextInput
          style={styles.input}
          value={eventData.location.venue}
          onChangeText={(text) => setEventData(prev => ({ 
            ...prev, 
            location: { ...prev.location, venue: text }
          }))}
          placeholder="Enter venue name"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Address *</Text>
        <TextInput
          style={styles.input}
          value={eventData.location.address}
          onChangeText={(text) => setEventData(prev => ({ 
            ...prev, 
            location: { ...prev.location, address: text }
          }))}
          placeholder="Enter street address"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>City *</Text>
        <TextInput
          style={styles.input}
          value={eventData.location.city}
          onChangeText={(text) => setEventData(prev => ({ 
            ...prev, 
            location: { ...prev.location, city: text }
          }))}
          placeholder="Enter city"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Country *</Text>
        <TextInput
          style={styles.input}
          value={eventData.location.country}
          onChangeText={(text) => setEventData(prev => ({ 
            ...prev, 
            location: { ...prev.location, country: text }
          }))}
          placeholder="Enter country"
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <EventHeader title="Edit Event" />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading event details...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <EventHeader 
        title="Edit Event"
        backToScreen="MyEvents"
      />

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${((currentStep + 1) / Object.keys(STEPS).length) * 100}%`,
                backgroundColor: COLORS.primary 
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          Step {currentStep + 1} of {Object.keys(STEPS).length}: {STEP_TITLES[currentStep]}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {currentStep === STEPS.BASIC_INFO && renderBasicInfo()}
        {currentStep === STEPS.DETAILS && renderDetails()}
        {currentStep === STEPS.LOCATION && renderLocation()}
        
        {/* Navigation buttons */}
        <View style={styles.navigationContainer}>
          {currentStep > 0 && (
            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={() => setCurrentStep(prev => prev - 1)}
            >
              <Text style={styles.secondaryButtonText}>Previous</Text>
            </TouchableOpacity>
          )}

          {currentStep < STEPS.LOCATION ? (
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={() => setCurrentStep(prev => prev + 1)}
              disabled={!isStepValid()}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={handleUpdateEvent}
              disabled={saving || !isFormValid()}
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Update Event</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
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
  progressContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.background,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.black,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS.white,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  toggleOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    fontSize: 14,
    color: COLORS.black,
  },
  toggleTextSelected: {
    color: COLORS.white,
  },
  categoryContainer: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  categoryTextSelected: {
    color: COLORS.white,
  },
  buttonContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  navigationContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 32,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
