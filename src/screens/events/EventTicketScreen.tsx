import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { getMyTicketForEvent, generateQRCodeForTicket } from '../../services/eventService';
import { Event, EventTicket, QRCodeData } from '../../types/events';

interface EventTicketScreenProps {
  route: {
    params: {
      event: Event;
      ticket?: EventTicket;
    };
  };
}

const { width } = Dimensions.get('window');
const QR_SIZE = Math.min(width * 0.7, 280);

export const EventTicketScreen: React.FC = () => {
  const route = useRoute() as EventTicketScreenProps['route'];
  const navigation = useNavigation();
  const { user } = useAuth();
  const { event, ticket: initialTicket } = route.params;

  const [ticket, setTicket] = useState<EventTicket | null>(initialTicket || null);
  const [qrData, setQrData] = useState<string>('');
  const [qrVerificationToken, setQrVerificationToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [brightness, setBrightness] = useState(1.0);

  useEffect(() => {
    loadTicketData();
  }, []);

  const loadTicketData = async () => {
    if (!user) return;

    // Always fetch fresh ticket data from API, don't rely on route params
    setLoading(true);
    try {
      console.log('[EventTicketScreen] Loading ticket for event:', event.id);
      console.log('[EventTicketScreen] User ID:', user.uid);
      
      const response = await getMyTicketForEvent(event.id);
      console.log('[EventTicketScreen] Ticket response:', response);
      
      if (response && response.success && response.ticket) {
        console.log('[EventTicketScreen] Ticket found:', response.ticket.id);
        console.log('[EventTicketScreen] Full ticket object:', JSON.stringify(response.ticket, null, 2));
        setTicket(response.ticket);
      } else {
        console.log('[EventTicketScreen] No ticket found or invalid response');
        console.log('[EventTicketScreen] Response details:', JSON.stringify(response, null, 2));
        
        // More specific error message based on response
        const errorMessage = response?.message || 'You are not registered for this event or no ticket was found.';
        Alert.alert('No Ticket Found', errorMessage);
      }
    } catch (error: any) {
      console.error('[EventTicketScreen] Error loading ticket:', error);
      Alert.alert('Error', 'Failed to load ticket information: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    if (!ticket || !user) {
      console.log('[EventTicketScreen] Missing ticket or user:', { ticket: !!ticket, user: !!user });
      return;
    }

    if (!ticket.id) {
      console.error('[EventTicketScreen] Ticket ID is missing:', ticket);
      Alert.alert('Error', 'Ticket ID is missing. Please reload the screen.');
      return;
    }

    if (!user.uid) {
      console.error('[EventTicketScreen] User ID is missing:', user);
      Alert.alert('Error', 'User authentication error. Please log out and log back in.');
      return;
    }

    console.log('[EventTicketScreen] Generating QR code for ticket:', ticket.id);
    console.log('[EventTicketScreen] Event ID:', event.id);
    console.log('[EventTicketScreen] User ID:', user.uid);
    console.log('[EventTicketScreen] Full ticket object:', JSON.stringify(ticket, null, 2));
    
    setGeneratingQR(true);
    try {
      const response = await generateQRCodeForTicket(ticket.id);
      console.log('[EventTicketScreen] QR generation response:', response);
      
      if (response.success) {
        // Store the verification token and create QR data object for display
        setQrVerificationToken(response.verificationToken);
        
        // Create the QR data object that matches what the backend expects for scanning
        const qrDataObj: QRCodeData = {
          eventId: event.id,
          userId: user.uid,
          ticketId: ticket.id,
          verificationToken: response.verificationToken,
          timestamp: Date.now(),
          type: 'event_checkin',
          version: '1.0'
        };
        
        // Validate QR data before setting it
        if (!qrDataObj.eventId || !qrDataObj.userId || !qrDataObj.ticketId || !qrDataObj.verificationToken) {
          console.error('[EventTicketScreen] Invalid QR data object:', qrDataObj);
          Alert.alert('Error', 'Failed to create valid QR code. Please try again.');
          return;
        }
        
        console.log('[EventTicketScreen] Generated QR data:', JSON.stringify(qrDataObj, null, 2));
        setQrData(JSON.stringify(qrDataObj));
        
        // Update ticket with QR generation status
        setTicket(prev => prev ? {
          ...prev,
          qrGenerated: true,
          qrGeneratedAt: new Date().toISOString()
        } : null);
      } else {
        console.error('[EventTicketScreen] QR generation failed:', response);
        Alert.alert('Error', response.message || 'Failed to generate QR code');
      }
    } catch (error: any) {
      console.error('[EventTicketScreen] Error generating QR code:', error);
      Alert.alert('Error', 'Failed to generate QR code: ' + (error.message || 'Unknown error'));
    } finally {
      setGeneratingQR(false);
    }
  };

  const shareTicket = async () => {
    try {
      await Share.share({
        message: `My ticket for ${event.title}\n\nEvent: ${event.title}\nDate: ${new Date(event.eventDate).toLocaleDateString()}\nVenue: ${event.location.venue}\n\nTicket ID: ${ticket?.id}`,
        title: `XSCard Event Ticket - ${event.title}`,
      });
    } catch (error) {
      console.error('Error sharing ticket:', error);
    }
  };

  const increaseBrightness = () => {
    setBrightness(1.0);
    // TODO: Implement actual screen brightness control if needed
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading ticket...</Text>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#FF6B6B" />
        <Text style={styles.errorTitle}>Ticket Not Found</Text>
        <Text style={styles.errorText}>
          You don't have a ticket for this event or it may have been cancelled.
        </Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Ticket</Text>
        <TouchableOpacity onPress={shareTicket}>
          <MaterialIcons name="share" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Ticket Card */}
      <View style={styles.ticketCard}>
        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <View style={styles.eventDetails}>
            <View style={styles.detailRow}>
              <MaterialIcons name="event" size={20} color="#666" />
              <Text style={styles.detailText}>{formatDate(event.eventDate)}</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialIcons name="access-time" size={20} color="#666" />
              <Text style={styles.detailText}>{formatTime(event.eventDate)}</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialIcons name="location-on" size={20} color="#666" />
              <Text style={styles.detailText}>
                {event.location.venue}, {event.location.city}
              </Text>
            </View>
          </View>
        </View>

        {/* QR Code Section */}
        <View style={styles.qrSection}>
          {qrData ? (
            <>
              <Text style={styles.qrTitle}>Your Entry QR Code</Text>
              <View style={styles.qrContainer}>
                <QRCode
                  value={qrData}
                  size={QR_SIZE}
                  backgroundColor="white"
                  color="black"
                />
              </View>
              <Text style={styles.qrInstructions}>
                Show this QR code to the event organizer for check-in
              </Text>
              
              {/* QR Actions */}
              <View style={styles.qrActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={increaseBrightness}
                >
                  <MaterialIcons name="brightness-high" size={20} color="#007AFF" />
                  <Text style={styles.actionButtonText}>Brighten</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={generateQRCode}
                  disabled={generatingQR}
                >
                  <MaterialIcons name="refresh" size={20} color="#007AFF" />
                  <Text style={styles.actionButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.generateQRSection}>
              <MaterialIcons name="qr-code" size={64} color="#DDD" />
              <Text style={styles.generateQRTitle}>Generate QR Code</Text>
              <Text style={styles.generateQRText}>
                Create your QR code to enable quick check-in at the event
              </Text>
              <TouchableOpacity 
                style={[styles.generateButton, generatingQR && styles.generateButtonDisabled]}
                onPress={generateQRCode}
                disabled={generatingQR}
              >
                {generatingQR ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <MaterialIcons name="qr-code-scanner" size={20} color="white" />
                )}
                <Text style={styles.generateButtonText}>
                  {generatingQR ? 'Generating...' : 'Generate QR Code'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Ticket Details */}
        <View style={styles.ticketDetails}>
          <Text style={styles.sectionTitle}>Ticket Information</Text>
          
          <View style={styles.ticketInfoRow}>
            <Text style={styles.ticketLabel}>Ticket ID:</Text>
            <Text style={styles.ticketValue}>{ticket.id}</Text>
          </View>
          
          <View style={styles.ticketInfoRow}>
            <Text style={styles.ticketLabel}>Registration Date:</Text>
            <Text style={styles.ticketValue}>
              {new Date(ticket.createdAt).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.ticketInfoRow}>
            <Text style={styles.ticketLabel}>Status:</Text>
            <View style={[styles.statusBadge, getStatusBadgeStyle(ticket.status)]}>
              <Text style={[styles.statusText, getStatusTextStyle(ticket.status)]}>
                {ticket.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {ticket.checkedIn && (
            <View style={styles.checkedInInfo}>
              <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.checkedInText}>
                Checked in at {new Date(ticket.checkedInAt!).toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Important Notes */}
      <View style={styles.notesSection}>
        <Text style={styles.notesTitle}>Important Notes</Text>
        <Text style={styles.notesText}>
          • Keep this QR code safe and don't share it with others
        </Text>
        <Text style={styles.notesText}>
          • You can regenerate the QR code if needed
        </Text>
        <Text style={styles.notesText}>
          • Arrive at the venue 15 minutes before the event starts
        </Text>
        <Text style={styles.notesText}>
          • Contact the organizer if you have any issues
        </Text>
      </View>
    </ScrollView>
  );
};

const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case 'confirmed':
      return styles.statusConfirmed;
    case 'cancelled':
      return styles.statusCancelled;
    case 'pending':
      return styles.statusPending;
    default:
      return styles.statusDefault;
  }
};

const getStatusTextStyle = (status: string) => {
  switch (status) {
    case 'confirmed':
      return styles.statusTextConfirmed;
    case 'cancelled':
      return styles.statusTextCancelled;
    case 'pending':
      return styles.statusTextPending;
    default:
      return styles.statusTextDefault;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  ticketCard: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  eventInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  eventDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  qrSection: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 16,
  },
  qrInstructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  qrActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  generateQRSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  generateQRTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  generateQRText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  generateButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  ticketDetails: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  ticketInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  ticketLabel: {
    fontSize: 16,
    color: '#666',
  },
  ticketValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusConfirmed: {
    backgroundColor: '#E8F5E8',
  },
  statusTextConfirmed: {
    color: '#4CAF50',
  },
  statusCancelled: {
    backgroundColor: '#FFE8E8',
  },
  statusTextCancelled: {
    color: '#F44336',
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
  },
  statusTextPending: {
    color: '#FF9800',
  },
  statusDefault: {
    backgroundColor: '#F0F0F0',
  },
  statusTextDefault: {
    color: '#666',
  },
  checkedInInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
  },
  checkedInText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  notesSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
});

export default EventTicketScreen;
