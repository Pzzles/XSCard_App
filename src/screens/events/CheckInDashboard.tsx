import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../context/AuthContext';
import { 
  getEventAttendees, 
  getCheckInStats, 
  exportAttendeesToCSV,
  getEventDetails 
} from '../../services/eventService';
import { useToast } from '../../hooks/useToast';
import { 
  Event, 
  EventAttendee, 
  CheckInStatsResponse,
  AttendeesResponse 
} from '../../types/events';
import { COLORS } from '../../constants/colors';

interface CheckInDashboardProps {
  route: {
    params: {
      event: Event;
    };
  };
}

type RootStackParamList = {
  QRScanner: { event: Event };
  CheckInDashboard: { event: Event };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');
const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: COLORS.primary,
  },
};

export const CheckInDashboard: React.FC = () => {
  const route = useRoute() as CheckInDashboardProps['route'];
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const { event: initialEvent } = route.params;

  const [event, setEvent] = useState<Event>(initialEvent);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [stats, setStats] = useState<CheckInStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState<EventAttendee | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadEventDetails(),
        loadAttendees(),
        loadStats(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadEventDetails = async () => {
    try {
      const response = await getEventDetails(event.id);
      if (response.success) {
        setEvent(response.data.event);
      }
    } catch (error) {
      console.error('Error loading event details:', error);
    }
  };

  const loadAttendees = async () => {
    try {
      const response: AttendeesResponse = await getEventAttendees(event.id);
      if (response.success) {
        setAttendees(response.attendees);
      }
    } catch (error) {
      console.error('Error loading attendees:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response: CheckInStatsResponse = await getCheckInStats(event.id);
      if (response.success) {
        setStats(response);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const openQRScanner = () => {
    navigation.navigate('QRScanner', { event });
  };

  const exportAttendees = async () => {
    try {
      setExporting(true);
      const result = await exportAttendeesToCSV(event.id);
      if (result.success) {
        success('Attendees exported successfully');
        // Here you could implement file sharing or save to device
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      showError(error.message || 'Failed to export attendees');
    } finally {
      setExporting(false);
    }
  };

  const showAttendeeDetails = (attendee: EventAttendee) => {
    setSelectedAttendee(attendee);
    setModalVisible(true);
  };

  const renderStatsCards = () => {
    if (!stats) return null;

    const cards = [
      {
        title: 'Total Tickets',
        value: stats.totalTickets,
        icon: 'confirmation-number',
        color: COLORS.primary,
      },
      {
        title: 'Checked In',
        value: stats.checkedInCount,
        icon: 'check-circle',
        color: COLORS.success,
      },
      {
        title: 'Pending',
        value: stats.pendingCheckIn,
        icon: 'schedule',
        color: COLORS.warning,
      },
      {
        title: 'Check-in Rate',
        value: `${Math.round(stats.checkInRate)}%`,
        icon: 'trending-up',
        color: COLORS.info,
      },
    ];

    return (
      <View style={styles.statsGrid}>
        {cards.map((card, index) => (
          <View key={index} style={styles.statCard}>
            <MaterialIcons name={card.icon as any} size={24} color={card.color} />
            <Text style={styles.statValue}>{card.value}</Text>
            <Text style={styles.statTitle}>{card.title}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderCheckInChart = () => {
    if (!stats || stats.checkInDetails.length === 0) return null;

    // Group check-ins by hour
    const checkInsByHour = stats.checkInDetails.reduce((acc, detail) => {
      const hour = new Date(detail.checkedInAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const hours = Object.keys(checkInsByHour).map(Number).sort((a, b) => a - b);
    const data = {
      labels: hours.map(h => `${h}:00`),
      datasets: [{
        data: hours.map(h => checkInsByHour[h]),
      }],
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Check-ins by Hour</Text>
        <LineChart
          data={data}
          width={width - 40}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>
    );
  };

  const renderStatusPieChart = () => {
    if (!stats) return null;

    const data = [
      {
        name: 'Checked In',
        population: stats.checkedInCount,
        color: COLORS.success,
        legendFontColor: COLORS.text,
        legendFontSize: 12,
      },
      {
        name: 'Pending',
        population: stats.pendingCheckIn,
        color: COLORS.warning,
        legendFontColor: COLORS.text,
        legendFontSize: 12,
      },
    ];

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Attendance Status</Text>
        <PieChart
          data={data}
          width={width - 40}
          height={200}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[10, 0]}
        />
      </View>
    );
  };

  const renderAttendeeItem = ({ item }: { item: EventAttendee }) => (
    <TouchableOpacity 
      style={styles.attendeeItem}
      onPress={() => showAttendeeDetails(item)}
    >
      <View style={styles.attendeeInfo}>
        <Text style={styles.attendeeName}>
          {item.userData?.name || 'Unknown Attendee'}
        </Text>
        <Text style={styles.attendeeEmail}>
          {item.userData?.email || ''}
        </Text>
        {item.userData?.company && (
          <Text style={styles.attendeeCompany}>{item.userData.company}</Text>
        )}
      </View>
      <View style={styles.attendeeStatus}>
        <MaterialIcons
          name={item.checkedIn ? 'check-circle' : 'schedule'}
          size={20}
          color={item.checkedIn ? COLORS.success : COLORS.warning}
        />
        <Text style={[
          styles.statusText,
          { color: item.checkedIn ? COLORS.success : COLORS.warning }
        ]}>
          {item.checkedIn ? 'Checked In' : 'Pending'}
        </Text>
        {item.checkedIn && item.checkedInAt && (
          <Text style={styles.checkInTime}>
            {new Date(item.checkedInAt).toLocaleTimeString()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Check-in Dashboard</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventDate}>
            {new Date(event.eventDate).toLocaleDateString()} at{' '}
            {new Date(event.eventDate).toLocaleTimeString()}
          </Text>
          <Text style={styles.eventLocation}>{event.location.venue}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.primaryButton} onPress={openQRScanner}>
            <MaterialIcons name="qr-code-scanner" size={20} color="white" />
            <Text style={styles.buttonText}>Scan QR Code</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.secondaryButton, exporting && styles.disabledButton]} 
            onPress={exportAttendees}
            disabled={exporting}
          >
            <MaterialIcons name="download" size={20} color={COLORS.primary} />
            <Text style={styles.secondaryButtonText}>
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        {renderStatsCards()}

        {/* Charts */}
        {renderCheckInChart()}
        {renderStatusPieChart()}

        {/* Attendees List */}
        <View style={styles.attendeesSection}>
          <Text style={styles.sectionTitle}>Attendees ({attendees.length})</Text>
          <FlatList
            data={attendees}
            renderItem={renderAttendeeItem}
            keyExtractor={(item) => item.ticketId}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ScrollView>

      {/* Attendee Details Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Attendee Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedAttendee && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>
                    {selectedAttendee.userData?.name || 'N/A'}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>
                    {selectedAttendee.userData?.email || 'N/A'}
                  </Text>
                </View>

                {selectedAttendee.userData?.company && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Company:</Text>
                    <Text style={styles.detailValue}>
                      {selectedAttendee.userData.company}
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ticket ID:</Text>
                  <Text style={styles.detailValue}>{selectedAttendee.ticketId}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Registered:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedAttendee.registeredAt).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <View style={styles.statusBadge}>
                    <MaterialIcons
                      name={selectedAttendee.checkedIn ? 'check-circle' : 'schedule'}
                      size={16}
                      color={selectedAttendee.checkedIn ? COLORS.success : COLORS.warning}
                    />
                    <Text style={[
                      styles.statusBadgeText,
                      { color: selectedAttendee.checkedIn ? COLORS.success : COLORS.warning }
                    ]}>
                      {selectedAttendee.checkedIn ? 'Checked In' : 'Pending'}
                    </Text>
                  </View>
                </View>

                {selectedAttendee.checkedIn && selectedAttendee.checkedInAt && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Checked In:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedAttendee.checkedInAt).toLocaleString()}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  eventInfo: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 15,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  eventDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 3,
  },
  eventLocation: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginLeft: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    margin: '1%',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
  },
  statTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: 'white',
    margin: 20,
    marginVertical: 10,
    borderRadius: 8,
    padding: 15,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  attendeesSection: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 10,
    borderRadius: 8,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  attendeeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  attendeeEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  attendeeCompany: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  attendeeStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  checkInTime: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: '80%',
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalBody: {
    padding: 20,
  },
  detailRow: {
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
});

export default CheckInDashboard;
