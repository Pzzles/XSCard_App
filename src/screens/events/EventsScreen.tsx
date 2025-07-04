import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS } from '../../constants/colors';
import Header from '../../components/Header';
import { useColorScheme } from '../../context/ColorSchemeContext';
import { useEventNotifications } from '../../context/EventNotificationContext';
import { authenticatedFetchWithRefresh, ENDPOINTS } from '../../utils/api';
import {
  Event,
  EventListResponse,
  EventFilters,
  EVENT_CATEGORIES,
  EventCategory,
} from '../../types/events';
import EventCard from './components/EventCard';
import EventFiltersComponent from './components/EventFilters';
import EventNotificationToast from '../../components/EventNotificationToast';

// Navigation types
type RootStackParamList = {
  EventDetails: { eventId: string; event?: Event };
  CreateEvent: undefined;
  MyEvents: undefined;
  EventRegistrations: undefined;
  EventPreferences: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const EVENTS_ENDPOINT = '/events/public';

export default function EventsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colorScheme } = useColorScheme();
  const { connected, connectToSocket, notifications } = useEventNotifications();

  // State management
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<EventFilters>({
    search: '',
    category: '',
    eventType: undefined,
    limit: 20,
    page: 1,
  });
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Load events when screen focuses
  useFocusEffect(
    React.useCallback(() => {
      loadEvents(true);
      
      // Auto-connect to real-time updates if not connected
      if (!connected) {
        console.log('[EventsScreen] Auto-connecting to real-time updates...');
        connectToSocket();
      }
    }, [filters, connected])
  );

  // Listen for real-time event notifications
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      // Check for new event notifications and refresh list
      const latestNotification = notifications[0];
      if (latestNotification.type === 'new_event' || latestNotification.type === 'event_update') {
        console.log('[EventsScreen] Received real-time event update, refreshing list...');
        loadEvents(true);
      }
    }
  }, [notifications]);

  // Load events function
  const loadEvents = async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setEvents([]);
      }

      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('q', filters.search);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.location) queryParams.append('location', filters.location);
      if (filters.eventType) queryParams.append('eventType', filters.eventType);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      queryParams.append('limit', (filters.limit || 20).toString());
      queryParams.append('page', (filters.page || 1).toString());

      const endpoint = filters.search 
        ? `${ENDPOINTS.SEARCH_EVENTS}?${queryParams.toString()}`
        : `${ENDPOINTS.GET_PUBLIC_EVENTS}?${queryParams.toString()}`;

      console.log('Loading events from:', endpoint);
      console.log('Full URL:', `http://localhost:8383${endpoint}`);

      // Use regular fetch for public events (no authentication required)
      const response = await fetch(`http://localhost:8383${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to load events: ${response.status} - ${errorText}`);
      }

      const data: EventListResponse = await response.json();
      console.log('Events data received:', data);

      if (data.success) {
        const newEvents = data.data.events;
        console.log('Number of events received:', newEvents.length);
        
        if (reset) {
          setEvents(newEvents);
        } else {
          setEvents(prev => [...prev, ...newEvents]);
        }

        // Check if there are more events to load
        const { currentPage, totalPages } = data.data.pagination;
        setHasMore(currentPage < totalPages);
      } else {
        throw new Error('Failed to load events');
      }
    } catch (error) {
      console.error('Error loading events:', error);
      Alert.alert(
        'Error',
        'Failed to load events. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Handle search
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        search: text.trim(),
        page: 1,
      }));
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<EventFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1,
    }));
    setShowFilters(false);
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    setFilters(prev => ({ ...prev, page: 1 }));
    loadEvents(true);
  };

  // Handle load more
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      setFilters(prev => ({
        ...prev,
        page: (prev.page || 1) + 1,
      }));
    }
  };

  // Handle event press
  const handleEventPress = (event: Event) => {
    navigation.navigate('EventDetails', { 
      eventId: event.id,
      event: event 
    });
  };

  // Load more events for pagination
  const loadMoreEvents = async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const nextPage = (filters.page || 1) + 1;
      const queryParams = new URLSearchParams({
        limit: filters.limit?.toString() || '20',
        page: nextPage.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.category && { category: filters.category }),
        ...(filters.eventType && { eventType: filters.eventType }),
      });

      const response = await fetch(`http://localhost:8383${EVENTS_ENDPOINT}?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load more events: ${response.status}`);
      }

      const data: EventListResponse = await response.json();

      if (data.success && data.data.events.length > 0) {
        setEvents(prev => [...prev, ...data.data.events]);
        setFilters(prev => ({ ...prev, page: nextPage }));
        
        // Check if there are more pages
        if (nextPage >= data.data.pagination.totalPages) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more events:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Render event item
  const renderEventItem = ({ item }: { item: Event }) => (
    <EventCard
      event={item}
      onPress={() => handleEventPress(item)}
    />
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="event-busy" size={64} color={COLORS.gray} />
      <Text style={styles.emptyTitle}>No Events Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || filters.category || filters.eventType
          ? 'Try adjusting your search or filters to find more events.'
          : 'Be the first to create an event in your area!'}
      </Text>
    </View>
  );

  // Render loading footer
  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.footerText}>Loading more events...</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Events" 
        rightIcon={
          <View style={styles.headerIcons}>
            {/* Connection Status Indicator */}
            <View style={[
              styles.connectionIndicator,
              { backgroundColor: connected ? '#4CAF50' : '#FF5722' }
            ]} />
            
            {/* Preferences Button */}
            <TouchableOpacity onPress={() => navigation.navigate('EventPreferences')}>
              <MaterialIcons 
                name="settings" 
                size={24} 
                color={COLORS.black} 
              />
            </TouchableOpacity>
            
            {/* Filter Button */}
            <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
              <MaterialIcons 
                name={showFilters ? "filter-list-off" : "filter-list"} 
                size={24} 
                color={COLORS.black} 
              />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleSearch(searchQuery)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              handleSearch('');
            }}>
              <MaterialIcons name="close" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('MyEvents')}
          >
            <MaterialIcons name="event-note" size={20} color={COLORS.primary} />
            <Text style={styles.quickActionText}>My Events</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('EventPreferences')}
          >
            <MaterialIcons name="tune" size={20} color={COLORS.primary} />
            <Text style={styles.quickActionText}>Preferences</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('CreateEvent')}
          >
            <MaterialIcons name="add" size={20} color={COLORS.primary} />
            <Text style={styles.quickActionText}>Create Event</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Connection Status Banner */}
      {!connected && (
        <View style={styles.connectionBanner}>
          <MaterialIcons name="wifi-off" size={16} color={COLORS.white} />
          <Text style={styles.connectionBannerText}>
            Not connected to real-time updates
          </Text>
          <TouchableOpacity onPress={connectToSocket}>
            <Text style={styles.connectText}>Connect</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filters */}
      {showFilters && (
        <EventFiltersComponent
          filters={filters}
          onFiltersChange={handleFilterChange}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Events List */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Discovering amazing events...</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEventItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContainer,
            events.length === 0 && styles.emptyListContainer
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={renderEmptyState}
          onEndReached={loadMoreEvents}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
        />
      )}

      {/* Floating Action Button for Create Event */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: COLORS.primary }]}
        onPress={() => navigation.navigate('CreateEvent')}
      >
        <MaterialIcons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 120, // Account for header height
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.black,
    paddingVertical: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Account for fab
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
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
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
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
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#FF5722',
    borderTopWidth: 1,
    borderTopColor: '#FF5722',
  },
  connectionBannerText: {
    fontSize: 16,
    color: COLORS.white,
    marginRight: 8,
  },
  connectText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 4,
  },
  quickActionText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  statsIcon: {
    marginRight: 8,
  },
  statsText: {
    fontSize: 14,
    color: COLORS.primary,
  },
}); 