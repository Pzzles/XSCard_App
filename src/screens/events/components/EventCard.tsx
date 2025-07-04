import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { COLORS } from '../../../constants/colors';
import { useColorScheme } from '../../../context/ColorSchemeContext';
import { Event } from '../../../types/events';

interface EventCardProps {
  event: Event;
  onPress: () => void;
}

export default function EventCard({ event, onPress }: EventCardProps) {
  const { colorScheme } = useColorScheme();

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if it's today or tomorrow
    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Format price
  const formatPrice = () => {
    if (event.eventType === 'free') {
      return 'FREE';
    }
    return `R${event.ticketPrice}`;
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: keyof typeof MaterialIcons.glyphMap } = {
      tech: 'computer',
      business: 'business',
      social: 'people',
      sports: 'sports-soccer',
      arts: 'palette',
      education: 'school',
      networking: 'network-check',
      entertainment: 'local-movies',
      health: 'favorite',
      other: 'event',
    };
    return iconMap[category] || 'event';
  };

  // Get availability status
  const getAvailabilityStatus = () => {
    if (event.maxAttendees === -1) {
      return { text: `${event.currentAttendees} attending`, color: COLORS.gray };
    }
    
    const spotsLeft = event.maxAttendees - event.currentAttendees;
    if (spotsLeft === 0) {
      return { text: 'SOLD OUT', color: COLORS.error };
    } else if (spotsLeft <= 5) {
      return { text: `${spotsLeft} spots left`, color: '#FF8C00' };
    } else {
      return { text: `${event.currentAttendees}/${event.maxAttendees} attending`, color: COLORS.gray };
    }
  };

  const availability = getAvailabilityStatus();

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      {/* Event Image or Placeholder */}
      <View style={styles.imageContainer}>
        {event.bannerImage || (event.images && event.images.length > 0) ? (
          <Image
            source={{ uri: event.bannerImage || event.images![0] }}
            style={styles.eventImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colorScheme }]}>
            <MaterialIcons 
              name={getCategoryIcon(event.category)} 
              size={32} 
              color={COLORS.white} 
            />
          </View>
        )}
        
        {/* Price Badge */}
        <View style={[
          styles.priceBadge,
          { backgroundColor: event.eventType === 'free' ? '#4CAF50' : colorScheme }
        ]}>
          <Text style={styles.priceText}>{formatPrice()}</Text>
        </View>
      </View>

      {/* Event Content */}
      <View style={styles.content}>
        {/* Title and Category */}
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
            </Text>
          </View>
        </View>

        {/* Date and Time */}
        <View style={styles.dateRow}>
          <MaterialIcons name="schedule" size={16} color={COLORS.gray} />
          <Text style={styles.dateText}>{formatDate(event.eventDate)}</Text>
        </View>

        {/* Location */}
        <View style={styles.locationRow}>
          <MaterialIcons name="location-on" size={16} color={COLORS.gray} />
          <Text style={styles.locationText} numberOfLines={1}>
            {event.location.venue}, {event.location.city}
          </Text>
        </View>

        {/* Organizer */}
        <View style={styles.organizerRow}>
          <MaterialIcons name="person" size={16} color={COLORS.gray} />
          <Text style={styles.organizerText} numberOfLines={1}>
            by {event.organizerInfo.name}
          </Text>
        </View>

        {/* Availability */}
        <View style={styles.availabilityRow}>
          <MaterialIcons name="people" size={16} color={availability.color} />
          <Text style={[styles.availabilityText, { color: availability.color }]}>
            {availability.text}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 160,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginRight: 8,
  },
  categoryBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.black,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.gray,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  organizerText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.gray,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 