import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Switch,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS } from '../../constants/colors';
import Header from '../../components/Header';
import { useEventNotifications } from '../../context/EventNotificationContext';
import { authenticatedFetchWithRefresh, ENDPOINTS } from '../../utils/api';
import { useToast } from '../../hooks/useToast';
import { Event, UserEventsResponse } from '../../types/events';

type NavigationProp = NativeStackNavigationProp<any>;

interface EventStats {
  totalEvents: number;
  publishedEvents: number;
  draftEvents: number;
  totalRegistrations: number;
  totalViews: number;
}

interface EventActionModalProps {
  visible: boolean;
  event: Event | null;
  onClose: () => void;
  onAction: (action: string, eventId: string) => void;
}

export default function MyEventsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const toast = useToast();
  const { notifications } = useEventNotifications();

  // State management
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [lastProcessedNotificationId, setLastProcessedNotificationId] = useState<string | null>(null);
  const [stats, setStats] = useState<EventStats>({
    totalEvents: 0,
    publishedEvents: 0,
    draftEvents: 0,
    totalRegistrations: 0,
    totalViews: 0,
  });
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'cancelled'>('all');
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Load user events when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadMyEvents();
    }, [filter])
  );

  // Load user's events
  const loadMyEvents = async () => {
    try {
      setLoading(true);

      const statusFilter = filter === 'all' ? '' : `?status=${filter}`;
      const response = await authenticatedFetchWithRefresh(
        `${ENDPOINTS.GET_USER_EVENTS}${statusFilter}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`Failed to load events: ${response.status}`);
      }

      const data: UserEventsResponse = await response.json();

      if (data.success) {
        setEvents(data.data.events);
        calculateStats(data.data.events);
      } else {
        throw new Error('Failed to load events');
      }
    } catch (error) {
      console.error('Error loading my events:', error);
      toast.error('Error', 'Failed to load your events. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Calculate dashboard statistics
  const calculateStats = (eventList: Event[]) => {
    const newStats: EventStats = {
      totalEvents: eventList.length,
      publishedEvents: eventList.filter(e => e.status === 'published').length,
      draftEvents: eventList.filter(e => e.status === 'draft').length,
      totalRegistrations: eventList.reduce((sum, e) => sum + (e.currentAttendees || 0), 0),
      totalViews: 0, // Would need to implement view tracking
    };
    setStats(newStats);
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadMyEvents();
  };

  // Handle event actions
  const handleEventAction = async (action: string, eventId: string) => {
    try {
      let response: Response;
      let successMessage = '';

      switch (action) {
        case 'publish':
          response = await authenticatedFetchWithRefresh(
            ENDPOINTS.PUBLISH_EVENT.replace(':eventId', eventId),
            { method: 'POST' }
          );
          successMessage = 'Event published successfully';
          break;

        case 'delete':
          response = await authenticatedFetchWithRefresh(
            ENDPOINTS.DELETE_EVENT.replace(':eventId', eventId),
            { method: 'DELETE' }
          );
          successMessage = 'Event cancelled successfully';
          break;

        case 'duplicate':
          // TODO: Implement duplication
          toast.info('Coming Soon', 'Event duplication will be available soon');
          return;

        default:
          return;
      }

      if (response.ok) {
        toast.success('Success', successMessage);
        loadMyEvents(); // Refresh the list
      } else {
        throw new Error(`Failed to ${action} event`);
      }
    } catch (error) {
      console.error(`Error ${action} event:`, error);
      toast.error('Error', `Failed to ${action} event. Please try again.`);
    }

    setActionModalVisible(false);
    setSelectedEvent(null);
  };

  // Render stats cards
  const renderStatsCard = (title: string, value: number, icon: string, color: string) => (
    <View style={[styles.statsCard, { borderLeftColor: color }]}>
      <View style={styles.statsContent}>
        <MaterialIcons name={icon as any} size={24} color={color} />
        <View>
          <Text style={styles.statsValue}>{value}</Text>
          <Text style={styles.statsTitle}>{title}</Text>
        </View>
      </View>
    </View>
  );

  // Render event item
  const renderEventItem = ({ item }: { item: Event }) => {
    const isSelected = selectedEvents.includes(item.id);
    
    return (
      <TouchableOpacity style={[styles.eventCard, isSelected && styles.eventCardSelected]}>
        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.eventMeta}>
            <View style={styles.metaItem}>
              <MaterialIcons name="schedule" size={16} color={COLORS.gray} />
              <Text style={styles.metaText}>
                {new Date(item.eventDate).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name="location-on" size={16} color={COLORS.gray} />
              <Text style={styles.metaText}>{item.location.city}</Text>
            </View>
          </View>

          <View style={styles.eventStats}>
            <View style={styles.statItem}>
              <MaterialIcons name="people" size={16} color={COLORS.gray} />
              <Text style={styles.statText}>
                {item.currentAttendees || 0}
                {item.maxAttendees !== -1 && `/${item.maxAttendees}`} attendees
              </Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="attach-money" size={16} color={COLORS.gray} />
              <Text style={styles.statText}>
                {item.eventType === 'free' ? 'Free' : `R${item.ticketPrice}`}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setSelectedEvent(item);
            setActionModalVisible(true);
          }}
        >
          <MaterialIcons name="more-vert" size={24} color={COLORS.gray} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return '#4CAF50';
      case 'draft': return '#FF9800';
      case 'cancelled': return '#F44336';
      default: return COLORS.gray;
    }
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="event-note" size={64} color={COLORS.gray} />
      <Text style={styles.emptyTitle}>No Events Yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first event to start building your audience and managing attendees.
      </Text>
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: COLORS.primary }]}
        onPress={() => navigation.navigate('CreateEvent')}
      >
        <MaterialIcons name="add" size={20} color={COLORS.white} />
        <Text style={styles.createButtonText}>Create Your First Event</Text>
      </TouchableOpacity>
    </View>
  );

  // Listen for real-time registration notifications (for organizers)
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      // Only process the latest notification if it's new
      const latestNotification = notifications[0];
      const notificationId = (latestNotification as any).id;
      
      // Skip if we've already processed this notification
      if (notificationId && notificationId === lastProcessedNotificationId) {
        return;
      }
      
      // Update the last processed notification ID
      if (notificationId) {
        setLastProcessedNotificationId(notificationId);
      }
      
      // Handle organizer notifications for registrations
      if (latestNotification.type === 'new_registration') {
        console.log('[MyEventsScreen] Received new registration notification');
        toast.success(
          '👤 New Registration',
          `${latestNotification.registration?.userName} registered for your event "${latestNotification.event?.title}"`
        );
        // Refresh the events list to update registration counts
        loadMyEvents();
      }
      
      if (latestNotification.type === 'event_unregistration') {
        console.log('[MyEventsScreen] Received unregistration notification');
        toast.info(
          '👋 Unregistration',
          `${latestNotification.unregistration?.userName} unregistered from your event "${latestNotification.event?.title}"`
        );
        // Refresh the events list to update registration counts
        loadMyEvents();
      }
    }
  }, [notifications, lastProcessedNotificationId]);

  return (
    <View style={styles.container}>
      <Header 
        title="My Events" 
        rightIcon={
          <TouchableOpacity onPress={() => navigation.navigate('CreateEvent')}>
            <MaterialIcons name="add" size={24} color={COLORS.black} />
          </TouchableOpacity>
        }
      />

      {/* Stats Dashboard */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          {renderStatsCard('Total Events', stats.totalEvents, 'event', COLORS.primary)}
          {renderStatsCard('Published', stats.publishedEvents, 'publish', '#4CAF50')}
        </View>
        <View style={styles.statsRow}>
          {renderStatsCard('Registrations', stats.totalRegistrations, 'people', '#2196F3')}
          {renderStatsCard('Drafts', stats.draftEvents, 'edit', '#FF9800')}
        </View>
      </View>

      {/* Events List */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your events...</Text>
        </View>
      ) : events.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={events}
          renderItem={renderEventItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        />
      )}

      {/* Event Action Modal */}
      <EventActionModal
        visible={actionModalVisible}
        event={selectedEvent}
        onClose={() => {
          setActionModalVisible(false);
          setSelectedEvent(null);
        }}
        onAction={handleEventAction}
      />
    </View>
  );
}

// Event Action Modal Component
function EventActionModal({ visible, event, onClose, onAction }: EventActionModalProps) {
  if (!event) return null;

  const actions = [
    { 
      key: 'edit', 
      label: 'Edit Event', 
      icon: 'edit', 
      color: COLORS.primary,
      available: true 
    },
    { 
      key: 'publish', 
      label: event.status === 'published' ? 'Republish' : 'Publish Event', 
      icon: 'publish', 
      color: '#4CAF50',
      available: event.status !== 'cancelled' 
    },
    { 
      key: 'duplicate', 
      label: 'Duplicate Event', 
      icon: 'content-copy', 
      color: '#2196F3',
      available: true 
    },
    { 
      key: 'delete', 
      label: 'Cancel Event', 
      icon: 'delete', 
      color: '#F44336',
      available: event.status !== 'cancelled' 
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Event Actions</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          <Text style={styles.eventName} numberOfLines={2}>{event.title}</Text>

          <View style={styles.actionsList}>
            {actions.filter(action => action.available).map((action) => (
              <TouchableOpacity
                key={action.key}
                style={styles.actionItem}
                onPress={() => onAction(action.key, event.id)}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                  <MaterialIcons name={action.icon as any} size={20} color={COLORS.white} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <MaterialIcons name="chevron-right" size={20} color={COLORS.gray} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingTop: 120, // Account for header
    paddingBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  statsTitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  eventCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F8FF',
  },
  eventContent: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.white,
  },
  eventMeta: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  eventStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  eventName: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 16,
  },
  actionsList: {
    gap: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    gap: 12,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: 16,
    color: COLORS.black,
  },
});