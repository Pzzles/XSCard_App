// Event type definitions for XSCard Events feature

export interface EventLocation {
  venue: string;
  address: string;
  city: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface OrganizerInfo {
  name: string;
  email: string;
  profileImage?: string;
  company?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  endDate?: string;
  location: EventLocation;
  category: string;
  eventType: 'free' | 'paid';
  ticketPrice: number;
  maxAttendees: number;
  currentAttendees: number;
  attendeesList?: string[];
  organizerId: string;
  organizerInfo: OrganizerInfo;
  status: 'draft' | 'published' | 'cancelled';
  visibility: 'public' | 'private' | 'invite-only';
  images?: string[];
  bannerImage?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  cancelledAt?: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  userInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  status: 'registered' | 'pending_payment' | 'cancelled';
  registeredAt: string;
  specialRequests?: string;
  ticketId?: string;
  paymentReference?: string;
}

export interface EventPreferences {
  receiveEventNotifications: boolean;
  receiveNewEventBroadcasts: boolean;
  receiveEventUpdates: boolean;
  receiveEventReminders: boolean;
  preferredCategories: string[];
  locationRadius: number;
  preferredLocation?: {
    city: string;
    country: string;
  };
  eventTypePreference?: 'free' | 'paid' | null;
  priceRange?: {
    min: number;
    max: number;
  };
}

export interface EventFilters {
  search?: string;
  category?: string;
  location?: string;
  eventType?: 'free' | 'paid';
  startDate?: string;
  endDate?: string;
  organizerId?: string;
  limit?: number;
  page?: number;
}

export interface EventListResponse {
  success: boolean;
  data: {
    events: Event[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalEvents: number;
      eventsPerPage: number;
    };
  };
}

export interface EventDetailsResponse {
  success: boolean;
  data: {
    event: Event;
    userRegistration?: EventRegistration;
    isOrganizer: boolean;
    attendeeDetails?: {
      totalAttendees: number;
      attendees: EventRegistration[];
    };
  };
}

export interface EventRegistrationResponse {
  success: boolean;
  message: string;
  registration: EventRegistration;
}

export interface UserEventsResponse {
  success: boolean;
  data: {
    events: Event[];
    totalEvents: number;
  };
}

export interface UserRegistrationsResponse {
  success: boolean;
  data: {
    registrations: Array<{
      registration: EventRegistration;
      event: Event;
    }>;
    totalRegistrations: number;
  };
}

export interface EventSearchResponse {
  success: boolean;
  data: {
    events: Event[];
    searchTerm: string;
    resultsCount: number;
  };
}

// Event categories
export const EVENT_CATEGORIES = [
  'tech',
  'business',
  'social',
  'sports',
  'arts',
  'education',
  'networking',
  'entertainment',
  'health',
  'other'
] as const;

export type EventCategory = typeof EVENT_CATEGORIES[number];

// Event status types
export const EVENT_STATUS = [
  'draft',
  'published',
  'cancelled'
] as const;

export type EventStatus = typeof EVENT_STATUS[number];

// Registration status types
export const REGISTRATION_STATUS = [
  'registered',
  'pending_payment',
  'cancelled'
] as const;

export type RegistrationStatus = typeof REGISTRATION_STATUS[number];

// Event visibility types
export const EVENT_VISIBILITY = [
  'public',
  'private',
  'invite-only'
] as const;

export type EventVisibility = typeof EVENT_VISIBILITY[number];

// Event type for creation/editing
export interface CreateEventData {
  title: string;
  description: string;
  eventDate: string;
  endDate?: string;
  location: EventLocation;
  category: EventCategory;
  eventType: 'free' | 'paid';
  ticketPrice: number;
  maxAttendees: number;
  visibility: EventVisibility;
  images?: string[];
  bannerImage?: string;
  tags?: string[];
}

// Event analytics data
export interface EventAnalytics {
  totalViews: number;
  totalRegistrations: number;
  conversionRate: number;
  popularityScore: number;
  peakRegistrationTime: string;
  registrationsByDay: Array<{
    date: string;
    count: number;
  }>;
} 