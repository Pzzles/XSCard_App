import { API_BASE_URL } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Event,
  EventRegistration,
  EventPreferences,
  EventFilters,
  EventListResponse,
  EventTicket,
  GetTicketResponse,
  QRCodeData,
  GenerateQRResponse,
  CheckInResponse,
  AttendeesResponse,
  CheckInStatsResponse,
  BulkQRResult,
} from '../types/events';

const BASE_URL = `${API_BASE_URL}/events`;

// Helper function to get auth headers
const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('userToken');
  
  if (!token) {
    console.error('[EventService] No authentication token found in storage');
    throw new Error('No authentication token found. Please log in again.');
  }
  
  // Check if token already has Bearer prefix
  const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  
  return {
    'Content-Type': 'application/json',
    'Authorization': authHeader,
  };
};

// Event CRUD Operations
export const getEvents = async (filters: EventFilters = {}): Promise<EventListResponse> => {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${BASE_URL}?${queryParams.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};

export const getEventDetails = async (eventId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/${eventId}`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching event details:', error);
    throw error;
  }
};

export const createEvent = async (eventData: Partial<Event>) => {
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(eventData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

export const updateEvent = async (eventId: string, eventData: Partial<Event>) => {
  try {
    const response = await fetch(`${BASE_URL}/${eventId}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(eventData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

export const deleteEvent = async (eventId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/${eventId}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

// Event Registration
export const registerForEvent = async (eventId: string, registrationData: any) => {
  try {
    const response = await fetch(`${BASE_URL}/${eventId}/register`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(registrationData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error registering for event:', error);
    throw error;
  }
};

export const unregisterFromEvent = async (eventId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/${eventId}/unregister`, {
      method: 'POST',
      headers: await getAuthHeaders(),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error unregistering from event:', error);
    throw error;
  }
};

export const getMyEvents = async () => {
  try {
    const response = await fetch(`${BASE_URL}/my-events`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching my events:', error);
    throw error;
  }
};

// Event Preferences
export const getEventPreferences = async (): Promise<EventPreferences> => {
  try {
    const response = await fetch(`${BASE_URL}/preferences`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    const data = await response.json();
    return data.preferences || {};
  } catch (error) {
    console.error('Error fetching event preferences:', error);
    throw error;
  }
};

export const updateEventPreferences = async (preferences: Partial<EventPreferences>) => {
  try {
    const response = await fetch(`${BASE_URL}/preferences`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(preferences),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating event preferences:', error);
    throw error;
  }
};

// QR Code and Ticket Functions
export const getMyTicketForEvent = async (eventId: string): Promise<GetTicketResponse> => {
  try {
    console.log('[EventService] Getting ticket for event:', eventId);
    console.log('[EventService] Event ID type:', typeof eventId);
    console.log('[EventService] Event ID length:', eventId.length);
    console.log('[EventService] Calling endpoint:', `${BASE_URL}/${eventId}/my-ticket`);
    const response = await fetch(`${BASE_URL}/${eventId}/my-ticket`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    console.log('[EventService] Ticket response status:', response.status);
    const data = await response.json();
    console.log('[EventService] Ticket response data:', data);
    
    // Return the full response to match what EventTicketScreen expects
    return data;
  } catch (error) {
    console.error('[EventService] Error fetching my ticket:', error);
    throw error;
  }
};

export const generateQRCodeForTicket = async (ticketId: string): Promise<GenerateQRResponse> => {
  try {
    if (!ticketId) {
      console.error('[EventService] Ticket ID is null, undefined, or empty:', ticketId);
      throw new Error('Ticket ID is required');
    }

    console.log('[EventService] Generating QR code for ticket:', ticketId);
    console.log('[EventService] Calling endpoint:', `${API_BASE_URL}/tickets/${ticketId}/qr`);
    const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/qr`, {
      method: 'POST',
      headers: await getAuthHeaders(),
    });

    console.log('[EventService] QR generation response status:', response.status);
    const data = await response.json();
    console.log('[EventService] QR generation response data:', data);
    
    return data;
  } catch (error) {
    console.error('[EventService] Error generating QR code:', error);
    throw error;
  }
};

export const validateQRCode = async (qrData: QRCodeData) => {
  try {
    const response = await fetch(`${BASE_URL}/qr/validate`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        qrData: JSON.stringify(qrData),
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error validating QR code:', error);
    throw error;
  }
};

export const checkInAttendee = async (qrData: QRCodeData): Promise<CheckInResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/qr/checkin`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        qrData: JSON.stringify(qrData),
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking in attendee:', error);
    throw error;
  }
};

// Event Management for Organizers
export const getEventAttendees = async (eventId: string): Promise<AttendeesResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/${eventId}/attendees`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching event attendees:', error);
    throw error;
  }
};

export const getCheckInStats = async (eventId: string): Promise<CheckInStatsResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/${eventId}/checkin-stats`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching check-in stats:', error);
    throw error;
  }
};

export const generateBulkQRCodes = async (eventId: string): Promise<BulkQRResult> => {
  try {
    const response = await fetch(`${BASE_URL}/${eventId}/qr/bulk-generate`, {
      method: 'POST',
      headers: await getAuthHeaders(),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error generating bulk QR codes:', error);
    throw error;
  }
};

export const exportAttendeesToCSV = async (eventId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/${eventId}/attendees/export`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error exporting attendees:', error);
    throw error;
  }
};

// Real-time notifications (WebSocket integration would go here)
export const subscribeToEventNotifications = (eventId: string, callback: (notification: any) => void) => {
  // This would integrate with the socket service for real-time updates
  // For now, we'll use polling
  return setInterval(async () => {
    try {
      const stats = await getCheckInStats(eventId);
      callback({ type: 'stats_update', data: stats });
    } catch (error) {
      console.error('Error polling for updates:', error);
    }
  }, 30000); // Poll every 30 seconds
};

export const unsubscribeFromEventNotifications = (subscriptionId: NodeJS.Timeout) => {
  if (subscriptionId) {
    clearInterval(subscriptionId);
  }
};
