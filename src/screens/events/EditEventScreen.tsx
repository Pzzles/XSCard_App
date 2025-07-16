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

  // Image upload state
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

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

    // Set existing images for display
    // Check if event has both bannerImage and images array or just images array
    const existingImages = [];
    
    if (event.bannerImage) {
      existingImages.push(event.bannerImage);
    }
    
    if (event.images && Array.isArray(event.images)) {
      // If we already added banner image, skip it in the images array
      const imagesToAdd = event.bannerImage 
        ? event.images.filter(img => img !== event.bannerImage)
        : event.images;
      existingImages.push(...imagesToAdd);
    }

    if (existingImages.length > 0) {
      setSelectedImages(existingImages);
    }
  };

  // Image handling functions
  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast.warning('Permission needed', 'Please grant permission to access your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [16, 9],
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setSelectedImages(prev => [...prev, ...newImages].slice(0, 5)); // Max 5 images
      }
    } catch (error) {
      console.error('Error picking images:', error);
      toast.error('Error', 'Failed to pick images. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Validation functions
  const isStepValid = () => {
    switch (currentStep) {
      case STEPS.BASIC_INFO:
        return eventData.title.trim() && eventData.description.trim();
      case STEPS.DETAILS:
        return eventData.eventType === 'free' || (eventData.eventType === 'paid' && eventData.ticketPrice > 0);
      case STEPS.LOCATION:
        return eventData.location.venue.trim() && eventData.location.city.trim();
      default:
        return true;
    }
  };

  const isFormValid = () => {
    return eventData.title.trim() && 
           eventData.description.trim() &&
           eventData.location.venue.trim() && 
           eventData.location.city.trim();
  };

  const handleUpdateEvent = async () => {
    try {
      setSaving(true);

      // Final validation
      if (!isFormValid()) {
        toast.warning('Validation Error', 'Please fix the errors before updating the event.');
        return;
      }

      // Check if we have new images (local URIs) that need to be uploaded
      const newImages = selectedImages.filter(uri => uri.startsWith('file://') || uri.startsWith('content://'));
      const existingImages = selectedImages.filter(uri => !uri.startsWith('file://') && !uri.startsWith('content://'));

      console.log('Image analysis:', {
        totalImages: selectedImages.length,
        newImages: newImages.length,
        existingImages: existingImages.length
      });

      // Prepare payload - use FormData if we have new images, otherwise use JSON
      if (newImages.length > 0) {
        // --------------------------
        // FormData approach (with new images)
        // --------------------------
        const payload = new FormData();

        // Append basic string/numeric fields
        payload.append('title', eventData.title);
        payload.append('description', eventData.description);
        payload.append('eventDate', eventData.eventDate ? new Date(eventData.eventDate).toISOString() : '');
        payload.append('endDate', eventData.endDate ? new Date(eventData.endDate).toISOString() : '');
        payload.append('category', eventData.category);
        payload.append('eventType', eventData.eventType);
        payload.append('ticketPrice', eventData.ticketPrice.toString());
        payload.append('maxAttendees', eventData.maxAttendees.toString());
        payload.append('visibility', eventData.visibility);

        // Location & tags as JSON strings
        payload.append('location', JSON.stringify(eventData.location));
        payload.append('tags', JSON.stringify(eventData.tags || []));

        // Handle images - first image as banner, rest as event images
        if (selectedImages.length > 0) {
          const firstImage = selectedImages[0];
          
          // If first image is new, add it as banner
          if (firstImage.startsWith('file://') || firstImage.startsWith('content://')) {
            const bannerName = firstImage.split('/').pop() || `banner_${Date.now()}.jpg`;
            payload.append('bannerImage', {
              uri: firstImage,
              name: bannerName,
              type: 'image/jpeg',
            } as any);
          } else {
            // Keep existing banner image
            payload.append('bannerImage', firstImage);
          }

          // Add remaining images
          selectedImages.slice(1).forEach((uri, idx) => {
            if (uri.startsWith('file://') || uri.startsWith('content://')) {
              const name = uri.split('/').pop() || `image_${idx}_${Date.now()}.jpg`;
              payload.append('eventImages', {
                uri,
                name,
                type: 'image/jpeg',
              } as any);
            } else {
              // Keep existing image
              payload.append('eventImages', uri);
            }
          });
        }

        // Send existing images that weren't replaced
        if (existingImages.length > 0) {
          payload.append('existingImages', JSON.stringify(existingImages));
        }

        console.log('[UpdateEvent] Submitting FormData with fields:', Array.from(payload.keys()));

        const response = await authenticatedFetchWithRefresh(
          ENDPOINTS.UPDATE_EVENT.replace(':eventId', eventId),
          {
            method: 'PATCH',
            body: payload,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to update event: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          toast.success('Success', 'Event updated successfully');
          navigation.navigate('MyEvents');
        } else {
          throw new Error(result.message || 'Failed to update event');
        }
      } else {
        // --------------------------
        // JSON approach (no new images)
        // --------------------------
        const updateData = {
          title: eventData.title,
          description: eventData.description,
          eventDate: eventData.eventDate ? new Date(eventData.eventDate).toISOString() : '',
          endDate: eventData.endDate ? new Date(eventData.endDate).toISOString() : null,
          category: eventData.category,
          eventType: eventData.eventType,
          ticketPrice: eventData.ticketPrice,
          maxAttendees: eventData.maxAttendees,
          visibility: eventData.visibility,
          location: eventData.location,
          images: selectedImages, // Keep existing images
          tags: eventData.tags,
        };

        console.log('[UpdateEvent] Submitting JSON data:', updateData);

        const response = await authenticatedFetchWithRefresh(
          ENDPOINTS.UPDATE_EVENT.replace(':eventId', eventId),
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to update event: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          toast.success('Success', 'Event updated successfully');
          navigation.navigate('MyEvents');
        } else {
          throw new Error(result.message || 'Failed to update event');
        }
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
      <Text style={styles.stepTitle}>Where will it happen?</Text>
      <Text style={styles.stepSubtitle}>Please provide the venue and city for your event</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Venue Name *</Text>
        <TextInput
          style={styles.input}
          value={eventData.location.venue}
          onChangeText={(text) => setEventData(prev => ({ 
            ...prev, 
            location: { ...prev.location, venue: text }
          }))}
          placeholder="Enter venue name (required)"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Street Address</Text>
        <TextInput
          style={styles.input}
          value={eventData.location.address}
          onChangeText={(text) => setEventData(prev => ({ 
            ...prev, 
            location: { ...prev.location, address: text }
          }))}
          placeholder="Street address (optional)"
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
          placeholder="Enter city name (required)"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Country</Text>
        <TextInput
          style={styles.input}
          value={eventData.location.country}
          onChangeText={(text) => setEventData(prev => ({ 
            ...prev, 
            location: { ...prev.location, country: text }
          }))}
          placeholder="Country (optional)"
        />
      </View>
    </View>
  );

  const renderMediaStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Add some visuals</Text>
      <Text style={styles.stepSubtitle}>Images help attract more attendees to your event</Text>

      <TouchableOpacity style={styles.imagePickerButton} onPress={pickImages}>
        <MaterialIcons name="add-photo-alternate" size={48} color={COLORS.primary} />
        <Text style={[styles.imagePickerText, { color: COLORS.primary }]}>
          Add Event Images
        </Text>
        <Text style={styles.imagePickerSubtext}>
          Select up to 5 images (first image will be the banner)
        </Text>
      </TouchableOpacity>

      {selectedImages.length > 0 && (
        <View style={styles.imageGrid}>
          {selectedImages.map((image, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.eventImage} />
              {index === 0 && (
                <View style={styles.bannerBadge}>
                  <Text style={styles.bannerText}>Banner</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => removeImage(index)}
              >
                <MaterialIcons name="close" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderReviewStep = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review Your Changes</Text>
      <Text style={styles.stepSubtitle}>Make sure everything looks good before updating</Text>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Basic Information</Text>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Title:</Text>
          <Text style={styles.reviewValue}>{eventData.title}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Category:</Text>
          <Text style={styles.reviewValue}>{eventData.category}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Date:</Text>
          <Text style={styles.reviewValue}>
            {eventData.eventDate ? new Date(eventData.eventDate).toLocaleString() : 'Not set'}
          </Text>
        </View>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Event Details</Text>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Type:</Text>
          <Text style={styles.reviewValue}>
            {eventData.eventType === 'free' ? 'Free' : `Paid - R${eventData.ticketPrice}`}
          </Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Max Attendees:</Text>
          <Text style={styles.reviewValue}>{eventData.maxAttendees === -1 ? 'Unlimited' : eventData.maxAttendees}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Visibility:</Text>
          <Text style={styles.reviewValue}>{eventData.visibility}</Text>
        </View>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Location</Text>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Venue:</Text>
          <Text style={styles.reviewValue}>{eventData.location.venue}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Address:</Text>
          <Text style={styles.reviewValue}>
            {eventData.location.address}, {eventData.location.city}, {eventData.location.country}
          </Text>
        </View>
      </View>

      {eventData.tags && eventData.tags.length > 0 && (
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Tags</Text>
          <View style={styles.tagContainer}>
            {eventData.tags.map((tag, index) => (
              <View key={index} style={styles.reviewTag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {selectedImages.length > 0 && (
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Images ({selectedImages.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedImages.map((image, index) => (
              <Image key={index} source={{ uri: image }} style={styles.reviewImage} />
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
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
        {currentStep === STEPS.MEDIA && renderMediaStep()}
        {currentStep === STEPS.REVIEW && renderReviewStep()}
        
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

          {currentStep < STEPS.REVIEW ? (
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
  stepSubtitle: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 24,
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
  imagePickerButton: {
    alignItems: 'center',
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 20,
  },
  imagePickerText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
  },
  imagePickerSubtext: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 5,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  imageContainer: {
    width: '30%', // Adjust as needed for 3 columns
    aspectRatio: 1,
    marginVertical: 5,
    position: 'relative',
  },
  eventImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  bannerBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 1,
  },
  bannerText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  reviewSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  reviewSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 10,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  reviewLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.gray,
  },
  reviewValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reviewTag: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  reviewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
    resizeMode: 'cover',
  },
});
