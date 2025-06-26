# 🎉 XSCard Events Feature - Developer Implementation Guide

## Overview
Implementation guide for adding a comprehensive Events system to XSCard, similar to Eventbrite functionality. Events will be broadcast in real-time to active users using WebSockets (Socket.io), with mandatory user opt-out capabilities. This implementation focuses purely on WebSocket-based real-time notifications without mobile push notifications.

## System Architecture Changes

### Database Schema Extensions

#### New Firestore Collections

```javascript
// events collection
events/{eventId} = {
  id: string,
  title: string,
  description: string,
  organizerId: string,
  organizerInfo: {
    name: string,
    email: string,
    profileImage: string,
    company: string
  },
  eventDate: Date,
  endDate: Date,
  location: {
    venue: string,
    address: string,
    city: string,
    country: string,
    coordinates: { lat: number, lng: number } // Optional
  },
  category: 'business' | 'networking' | 'tech' | 'social' | 'education' | 'other',
  eventType: 'free' | 'paid',
  ticketPrice: number, // 0 for free events
  maxAttendees: number, // -1 for unlimited
  currentAttendees: number,
  attendeesList: [userId],
  images: [string], // Firebase Storage URLs
  bannerImage: string, // Main event image
  tags: [string],
  status: 'draft' | 'published' | 'cancelled' | 'completed',
  visibility: 'public' | 'private' | 'invite-only',
  createdAt: Timestamp,
  updatedAt: Timestamp,
  publishedAt: Timestamp,
  requirements: {
    isPremiumOnly: boolean,
    minAge: number,
    maxAge: number
  },
  contact: {
    email: string,
    phone: string,
    website: string
  },
  agenda: [{
    time: string,
    title: string,
    speaker: string,
    description: string
  }],
  isRecurring: boolean,
  recurringPattern: {
    frequency: 'daily' | 'weekly' | 'monthly',
    interval: number,
    endDate: Date
  }
}

// event_registrations collection
event_registrations/{registrationId} = {
  id: string,
  eventId: string,
  userId: string,
  userInfo: {
    name: string,
    email: string,
    phone: string
  },
  status: 'registered' | 'confirmed' | 'attended' | 'cancelled' | 'no-show',
  registeredAt: Timestamp,
  ticketId: string, // For paid events
  paymentReference: string, // Paystack reference
  specialRequests: string,
  checkedInAt: Timestamp
}

// event_broadcasts collection (tracking)
event_broadcasts/{broadcastId} = {
  eventId: string,
  type: 'new_event' | 'event_update' | 'event_reminder' | 'event_cancelled',
  message: string,
  targetAudience: 'all' | 'category' | 'specific',
  categoryFilter: string, // if targetAudience = 'category'
  userIds: [string], // if targetAudience = 'specific'
  sentAt: Timestamp,
  activeUsersCount: number,
  deliveredCount: number
}

// tickets collection (for paid events)
tickets/{ticketId} = {
  id: string,
  eventId: string,
  userId: string,
  ticketNumber: string, // QR code compatible
  paymentReference: string,
  status: 'active' | 'used' | 'refunded' | 'transferred',
  purchasedAt: Timestamp,
  price: number,
  qrCode: string, // Base64 QR code
  validatedAt: Timestamp,
  validatedBy: string // Staff user ID
}
```

#### Updated User Schema

```javascript
// Add to existing users collection
users/{userId} = {
  // ...existing fields...
  
  // Event preferences - MANDATORY opt-out capabilities
  eventPreferences: {
    receiveEventNotifications: boolean, // Default: true - USERS CAN OPT OUT
    receiveNewEventBroadcasts: boolean, // Default: true - opt-out for new event broadcasts
    receiveEventUpdates: boolean, // Default: true - opt-out for event updates
    receiveEventReminders: boolean, // Default: true - opt-out for reminders
    preferredCategories: [string], // Categories user is interested in
    locationRadius: number, // km radius for location-based events
    preferredLocation: {
      city: string,
      country: string,
      coordinates: { lat: number, lng: number }
    }
  },
  
  // Event statistics
  eventStats: {
    eventsCreated: number,
    eventsAttended: number,
    eventsOrganized: number,
    lastEventActivity: Timestamp
  }
}
```

## Backend Implementation

### 1. WebSocket Setup with Socket.io

#### Install Dependencies
```bash
npm install socket.io
npm install socket.io-client # For frontend
```

#### Socket.io Server Setup
**File**: `backend/services/socketService.js`

```javascript
const { Server } = require('socket.io');
const { db } = require('../firebase');

class SocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.connectedUsers = new Map(); // userId -> socketId
    this.userRooms = new Map(); // userId -> [roomIds]
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // User authentication and room joining
      socket.on('authenticate', async (data) => {
        const { userId, token } = data;
        
        try {
          // Verify JWT token here
          const isValid = await this.verifyToken(token);
          if (!isValid) {
            socket.emit('auth_error', { message: 'Invalid token' });
            return;
          }

          // Get user preferences
          const userDoc = await db.collection('users').doc(userId).get();
          const userData = userDoc.data();
          
          // Store user connection
          this.connectedUsers.set(userId, socket.id);
          socket.userId = userId;

          // Join rooms based on preferences
          await this.joinUserRooms(socket, userData);
          
          socket.emit('authenticated', { success: true });
          console.log(`User ${userId} authenticated and joined rooms`);
          
        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('auth_error', { message: 'Authentication failed' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
          console.log(`User ${socket.userId} disconnected`);
        }
      });

      // Handle event preferences update
      socket.on('update_preferences', async (preferences) => {
        if (socket.userId) {
          await this.updateUserRooms(socket, preferences);
        }
      });
    });
  }

  async joinUserRooms(socket, userData) {
    const preferences = userData.eventPreferences || {};
    const rooms = ['events_global']; // Global events room
    
    // Check if user wants event notifications
    if (preferences.receiveEventNotifications !== false) {
      // Join category-specific rooms
      if (preferences.preferredCategories) {
        preferences.preferredCategories.forEach(category => {
          rooms.push(`events_${category}`);
        });
      }
      
      // Join location-based room if available
      if (preferences.preferredLocation?.city) {
        rooms.push(`events_${preferences.preferredLocation.city.toLowerCase()}`);
      }
    }

    // Join all relevant rooms
    rooms.forEach(room => {
      socket.join(room);
    });

    this.userRooms.set(socket.userId, rooms);
    console.log(`User ${socket.userId} joined rooms:`, rooms);
  }

  async updateUserRooms(socket, newPreferences) {
    // Leave all current rooms
    const currentRooms = this.userRooms.get(socket.userId) || [];
    currentRooms.forEach(room => {
      socket.leave(room);
    });

    // Update user preferences in database
    await db.collection('users').doc(socket.userId).update({
      eventPreferences: newPreferences
    });

    // Join new rooms based on updated preferences
    await this.joinUserRooms(socket, { eventPreferences: newPreferences });
  }

  // Broadcast new event to relevant users - RESPECTS OPT-OUT PREFERENCES
  async broadcastNewEvent(eventData) {
    const broadcast = {
      type: 'new_event',
      event: eventData,
      timestamp: new Date().toISOString()
    };

    // Get all active users and check their opt-out preferences
    const activeSockets = Array.from(this.connectedUsers.entries());
    const eligibleUsers = [];

    for (const [socketId, userData] of activeSockets) {
      const preferences = userData.eventPreferences || {};
      
      // Check if user has opted out of event notifications
      if (preferences.receiveEventNotifications === false) continue;
      if (preferences.receiveNewEventBroadcasts === false) continue;
      
      // Check category preferences
      if (preferences.preferredCategories?.length > 0) {
        if (!preferences.preferredCategories.includes(eventData.category)) continue;
      }
      
      eligibleUsers.push(socketId);
    }

    // Send broadcast only to users who haven't opted out
    eligibleUsers.forEach(socketId => {
      this.io.to(socketId).emit('event_broadcast', broadcast);
    });

    // Log broadcast with actual delivery count
    await this.logBroadcast('new_event', eventData.id, eligibleUsers.length);
    
    console.log(`Broadcasted new event ${eventData.id} to ${eligibleUsers.length} eligible users (respecting opt-out preferences)`);
  }

  // Broadcast event updates - RESPECTS OPT-OUT PREFERENCES
  async broadcastEventUpdate(eventData, updateType = 'event_update') {
    const broadcast = {
      type: updateType,
      event: eventData,
      timestamp: new Date().toISOString()
    };

    // Send to users who registered for this event AND haven't opted out
    const registrations = await db.collection('event_registrations')
      .where('eventId', '==', eventData.id)
      .get();

    const notifiedUsers = [];
    
    for (const doc of registrations.docs) {
      const registration = doc.data();
      const socketId = this.getSocketByUserId(registration.userId);
      
      if (socketId) {
        // Check user's opt-out preferences
        const userData = this.connectedUsers.get(socketId);
        const preferences = userData?.eventPreferences || {};
        
        // Respect opt-out preferences
        if (preferences.receiveEventNotifications === false) continue;
        if (preferences.receiveEventUpdates === false) continue;
        
        this.io.to(socketId).emit('event_update', broadcast);
        notifiedUsers.push(registration.userId);
      }
    }

    console.log(`Sent event update to ${notifiedUsers.length} registered users (respecting opt-out preferences)`);
  }

  async verifyToken(token) {
    // Implement JWT verification logic here
    // Return true if valid, false otherwise
    try {
      // Use your existing token verification logic
      return true; // Placeholder
    } catch (error) {
      return false;
    }
  }

  async logBroadcast(type, eventId, roomCount) {
    await db.collection('event_broadcasts').add({
      eventId,
      type,
      targetAudience: 'category',
      sentAt: new Date(),
      activeUsersCount: this.connectedUsers.size,
      deliveredCount: roomCount
    });
  }

  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }
}

module.exports = SocketService;
```

#### Update Server.js
```javascript
// Add to backend/server.js
const http = require('http');
const SocketService = require('./services/socketService');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const socketService = new SocketService(server);

// Make socketService available globally
app.socketService = socketService;

// Update server listening
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Socket.io server initialized`);
});
```

### 2. Events Controller

**File**: `backend/controllers/eventController.js`

```javascript
const { db, admin } = require('../firebase');
const { formatDate } = require('../utils/dateFormatter');
const QRCode = require('qrcode');

// Helper function for error responses
const sendError = (res, status, message, error = null) => {
  console.error(`${message}:`, error);
  res.status(status).json({ 
    success: false,
    message,
    ...(error && { error: error.message })
  });
};

// Create new event
exports.createEvent = async (req, res) => {
  try {
    const userId = req.user.uid;
    const eventData = {
      ...req.body,
      id: db.collection('events').doc().id,
      organizerId: userId,
      currentAttendees: 0,
      attendeesList: [],
      status: 'draft',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    // Get organizer info
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    eventData.organizerInfo = {
      name: `${userData.name} ${userData.surname}`.trim(),
      email: userData.email,
      profileImage: userData.profileImage || null,
      company: userData.company || ''
    };

    // Validate required fields
    if (!eventData.title || !eventData.description || !eventData.eventDate) {
      return sendError(res, 400, 'Missing required fields: title, description, eventDate');
    }

    // Convert date strings to Firestore Timestamps
    eventData.eventDate = new Date(eventData.eventDate);
    if (eventData.endDate) {
      eventData.endDate = new Date(eventData.endDate);
    }

    // Save to database
    await db.collection('events').doc(eventData.id).set(eventData);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event: {
        ...eventData,
        eventDate: formatDate(eventData.eventDate),
        endDate: eventData.endDate ? formatDate(eventData.endDate) : null,
        createdAt: formatDate(eventData.createdAt)
      }
    });

  } catch (error) {
    sendError(res, 500, 'Error creating event', error);
  }
};

// Publish event (makes it visible and broadcasts)
exports.publishEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.uid;

    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return sendError(res, 404, 'Event not found');
    }

    const eventData = eventDoc.data();

    // Check if user owns this event
    if (eventData.organizerId !== userId) {
      return sendError(res, 403, 'Not authorized to publish this event');
    }

    // Update event status
    await eventRef.update({
      status: 'published',
      publishedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });

    // Get updated event data
    const updatedDoc = await eventRef.get();
    const updatedEvent = updatedDoc.data();

    // Broadcast to connected users if socket service is available
    if (req.app.socketService) {
      await req.app.socketService.broadcastNewEvent(updatedEvent);
    }

    res.status(200).json({
      success: true,
      message: 'Event published and broadcasted successfully',
      event: {
        ...updatedEvent,
        eventDate: formatDate(updatedEvent.eventDate),
        publishedAt: formatDate(updatedEvent.publishedAt)
      }
    });

  } catch (error) {
    sendError(res, 500, 'Error publishing event', error);
  }
};

// Get all public events with pagination and filters
exports.getAllEvents = async (req, res) => {
  try {
    const { 
      limit = 20, 
      page = 1, 
      category, 
      location, 
      startDate, 
      endDate,
      eventType,
      organizerId 
    } = req.query;

    let query = db.collection('events')
      .where('status', '==', 'published')
      .orderBy('eventDate', 'asc');

    // Apply filters
    if (category) {
      query = query.where('category', '==', category);
    }
    
    if (eventType) {
      query = query.where('eventType', '==', eventType);
    }
    
    if (organizerId) {
      query = query.where('organizerId', '==', organizerId);
    }

    // Apply date filters
    if (startDate) {
      query = query.where('eventDate', '>=', new Date(startDate));
    }
    
    if (endDate) {
      query = query.where('eventDate', '<=', new Date(endDate));
    }

    // Apply pagination
    const pageSize = Math.min(parseInt(limit), 50); // Max 50 events per page
    const offset = (parseInt(page) - 1) * pageSize;
    
    if (offset > 0) {
      const offsetSnapshot = await query.limit(offset).get();
      if (!offsetSnapshot.empty) {
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.limit(pageSize).get();
    
    const events = [];
    snapshot.forEach(doc => {
      const eventData = doc.data();
      events.push({
        ...eventData,
        eventDate: formatDate(eventData.eventDate),
        endDate: eventData.endDate ? formatDate(eventData.endDate) : null,
        createdAt: formatDate(eventData.createdAt)
      });
    });

    // Get total count for pagination
    const totalSnapshot = await db.collection('events')
      .where('status', '==', 'published')
      .get();

    res.status(200).json({
      success: true,
      data: {
        events,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalSnapshot.size / pageSize),
          totalEvents: totalSnapshot.size,
          eventsPerPage: pageSize
        }
      }
    });

  } catch (error) {
    sendError(res, 500, 'Error fetching events', error);
  }
};

// Register for event
exports.registerForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.uid;
    const { specialRequests = '' } = req.body;

    // Get event details
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return sendError(res, 404, 'Event not found');
    }

    const eventData = eventDoc.data();

    // Check if event is published
    if (eventData.status !== 'published') {
      return sendError(res, 400, 'Event is not available for registration');
    }

    // Check if user already registered
    const existingRegistration = await db.collection('event_registrations')
      .where('eventId', '==', eventId)
      .where('userId', '==', userId)
      .get();

    if (!existingRegistration.empty) {
      return sendError(res, 400, 'Already registered for this event');
    }

    // Check capacity
    if (eventData.maxAttendees > 0 && eventData.currentAttendees >= eventData.maxAttendees) {
      return sendError(res, 400, 'Event is at full capacity');
    }

    // Get user info
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    // Create registration
    const registrationData = {
      id: db.collection('event_registrations').doc().id,
      eventId,
      userId,
      userInfo: {
        name: `${userData.name} ${userData.surname}`.trim(),
        email: userData.email,
        phone: userData.phone || ''
      },
      status: 'registered',
      registeredAt: admin.firestore.Timestamp.now(),
      specialRequests,
      ticketId: null, // Will be set if paid event
      paymentReference: null
    };

    // Handle paid events
    if (eventData.eventType === 'paid' && eventData.ticketPrice > 0) {
      // TODO: Integrate with Paystack payment
      // For now, we'll mark as pending payment
      registrationData.status = 'pending_payment';
    }

    // Save registration
    await db.collection('event_registrations').doc(registrationData.id).set(registrationData);

    // Update event attendee count
    await db.collection('events').doc(eventId).update({
      currentAttendees: admin.firestore.FieldValue.increment(1),
      attendeesList: admin.firestore.FieldValue.arrayUnion(userId)
    });

    res.status(201).json({
      success: true,
      message: 'Successfully registered for event',
      registration: {
        ...registrationData,
        registeredAt: formatDate(registrationData.registeredAt)
      }
    });

  } catch (error) {
    sendError(res, 500, 'Error registering for event', error);
  }
};

// Update event
exports.updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.uid;
    const updateData = req.body;

    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return sendError(res, 404, 'Event not found');
    }

    const eventData = eventDoc.data();

    // Check ownership
    if (eventData.organizerId !== userId) {
      return sendError(res, 403, 'Not authorized to update this event');
    }

    // Prepare update data
    const updates = {
      ...updateData,
      updatedAt: admin.firestore.Timestamp.now()
    };

    // Convert dates if provided
    if (updates.eventDate) {
      updates.eventDate = new Date(updates.eventDate);
    }
    if (updates.endDate) {
      updates.endDate = new Date(updates.endDate);
    }

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.organizerId;
    delete updates.createdAt;
    delete updates.currentAttendees;
    delete updates.attendeesList;

    await eventRef.update(updates);

    // Get updated event
    const updatedDoc = await eventRef.get();
    const updatedEvent = updatedDoc.data();

    // Broadcast update to registered users if published
    if (updatedEvent.status === 'published' && req.app.socketService) {
      await req.app.socketService.broadcastEventUpdate(updatedEvent, 'event_update');
    }

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event: {
        ...updatedEvent,
        eventDate: formatDate(updatedEvent.eventDate),
        updatedAt: formatDate(updatedEvent.updatedAt)
      }
    });

  } catch (error) {
    sendError(res, 500, 'Error updating event', error);
  }
};

// Delete event
exports.deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.uid;

    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return sendError(res, 404, 'Event not found');
    }

    const eventData = eventDoc.data();

    // Check ownership
    if (eventData.organizerId !== userId) {
      return sendError(res, 403, 'Not authorized to delete this event');
    }

    // Check if event has registrations
    const registrations = await db.collection('event_registrations')
      .where('eventId', '==', eventId)
      .get();

    if (registrations.size > 0) {
      return sendError(res, 400, 'Cannot delete event with existing registrations. Cancel the event instead.');
    }

    // Delete event
    await db.collection('events').doc(eventId).delete();

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    sendError(res, 500, 'Error deleting event', error);
  }
};

// Search events
exports.searchEvents = async (req, res) => {
  try {
    const { q, category, location, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return sendError(res, 400, 'Search query must be at least 2 characters');
    }

    // Basic text search (Firestore limitation - would be better with Algolia)
    let query = db.collection('events')
      .where('status', '==', 'published')
      .orderBy('eventDate', 'asc')
      .limit(parseInt(limit));

    const snapshot = await query.get();
    
    // Filter results client-side for text search
    const searchTerm = q.toLowerCase();
    const events = [];
    
    snapshot.forEach(doc => {
      const eventData = doc.data();
      const searchableText = `${eventData.title} ${eventData.description} ${eventData.tags?.join(' ') || ''}`.toLowerCase();
      
      if (searchableText.includes(searchTerm)) {
        // Apply additional filters
        if (category && eventData.category !== category) return;
        if (location && !eventData.location?.city?.toLowerCase().includes(location.toLowerCase())) return;
        
        events.push({
          ...eventData,
          eventDate: formatDate(eventData.eventDate),
          endDate: eventData.endDate ? formatDate(eventData.endDate) : null
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        events,
        searchTerm: q,
        resultsCount: events.length
      }
    });

  } catch (error) {
    sendError(res, 500, 'Error searching events', error);
  }
};

// Get user's created events
exports.getUserEvents = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { status } = req.query;

    let query = db.collection('events')
      .where('organizerId', '==', userId)
      .orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    const events = [];

    snapshot.forEach(doc => {
      const eventData = doc.data();
      events.push({
        ...eventData,
        eventDate: formatDate(eventData.eventDate),
        endDate: eventData.endDate ? formatDate(eventData.endDate) : null,
        createdAt: formatDate(eventData.createdAt)
      });
    });

    res.status(200).json({
      success: true,
      data: {
        events,
        totalEvents: events.length
      }
    });

  } catch (error) {
    sendError(res, 500, 'Error fetching user events', error);
  }
};

// Get user's event registrations
exports.getUserRegistrations = async (req, res) => {
  try {
    const userId = req.user.uid;

    const registrationsSnapshot = await db.collection('event_registrations')
      .where('userId', '==', userId)
      .orderBy('registeredAt', 'desc')
      .get();

    const registrations = [];
    
    // Get event details for each registration
    for (const doc of registrationsSnapshot.docs) {
      const registrationData = doc.data();
      
      const eventDoc = await db.collection('events').doc(registrationData.eventId).get();
      if (eventDoc.exists) {
        const eventData = eventDoc.data();
        
        registrations.push({
          registration: {
            ...registrationData,
            registeredAt: formatDate(registrationData.registeredAt)
          },
          event: {
            ...eventData,
            eventDate: formatDate(eventData.eventDate),
            endDate: eventData.endDate ? formatDate(eventData.endDate) : null
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        registrations,
        totalRegistrations: registrations.length
      }
    });

  } catch (error) {
    sendError(res, 500, 'Error fetching user registrations', error);
  }
};

// Get event by ID with full details
exports.getEventById = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.uid; // Optional for public events

    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return sendError(res, 404, 'Event not found');
    }

    const eventData = eventDoc.data();

    // Check if user can view this event
    if (eventData.visibility === 'private' && eventData.organizerId !== userId) {
      return sendError(res, 403, 'Not authorized to view this event');
    }

    if (eventData.visibility === 'invite-only' && 
        eventData.organizerId !== userId && 
        !eventData.attendeesList?.includes(userId)) {
      return sendError(res, 403, 'This is an invite-only event');
    }

    // Check if current user is registered
    let userRegistration = null;
    if (userId) {
      const registrationSnapshot = await db.collection('event_registrations')
        .where('eventId', '==', eventId)
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (!registrationSnapshot.empty) {
        userRegistration = registrationSnapshot.docs[0].data();
      }
    }

    // Get attendee count and some attendee info (if organizer)
    let attendeeDetails = null;
    if (userId === eventData.organizerId) {
      const attendeesSnapshot = await db.collection('event_registrations')
        .where('eventId', '==', eventId)
        .get();

      attendeeDetails = {
        totalAttendees: attendeesSnapshot.size,
        attendees: attendeesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: data.id,
            userInfo: data.userInfo,
            status: data.status,
            registeredAt: formatDate(data.registeredAt)
          };
        })
      };
    }

    res.status(200).json({
      success: true,
      data: {
        event: {
          ...eventData,
          eventDate: formatDate(eventData.eventDate),
          endDate: eventData.endDate ? formatDate(eventData.endDate) : null,
          createdAt: formatDate(eventData.createdAt)
        },
        userRegistration: userRegistration ? {
          ...userRegistration,
          registeredAt: formatDate(userRegistration.registeredAt)
        } : null,
        isOrganizer: userId === eventData.organizerId,
        attendeeDetails
      }
    });

  } catch (error) {
    sendError(res, 500, 'Error fetching event details', error);
  }
};

module.exports = exports;
```

### 3. Events Routes

**File**: `backend/routes/eventRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticateUser } = require('../middleware/auth');
const { handleMultipleUploads } = require('../middleware/fileUpload');

// Public routes (no authentication required)
router.get('/events/public', eventController.getAllEvents);
router.get('/events/search', eventController.searchEvents);

// Protected routes (authentication required)
router.use(authenticateUser);

// Event CRUD operations
router.post('/events', 
  handleMultipleUploads([
    { name: 'bannerImage', maxCount: 1 },
    { name: 'eventImages', maxCount: 5 }
  ]), 
  eventController.createEvent
);

router.get('/events/:eventId', eventController.getEventById);
router.patch('/events/:eventId', eventController.updateEvent);
router.delete('/events/:eventId', eventController.deleteEvent);
router.post('/events/:eventId/publish', eventController.publishEvent);

// Event registration
router.post('/events/:eventId/register', eventController.registerForEvent);
router.delete('/events/:eventId/unregister', eventController.unregisterFromEvent);

// User-specific routes
router.get('/user/events', eventController.getUserEvents);
router.get('/user/registrations', eventController.getUserRegistrations);

// Event management (organizer only)
router.get('/events/:eventId/attendees', eventController.getEventAttendees);
router.patch('/events/:eventId/attendees/:userId', eventController.updateAttendeeStatus);

module.exports = router;
```

### 4. User Preferences Controller Update

**File**: `backend/controllers/userController.js` (additions)

```javascript
// Add these methods to existing userController

// Update user event preferences
exports.updateEventPreferences = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { eventPreferences } = req.body;

    await db.collection('users').doc(userId).update({
      eventPreferences: {
        receiveEventNotifications: eventPreferences.receiveEventNotifications ?? true,
        receiveNewEventBroadcasts: eventPreferences.receiveNewEventBroadcasts ?? true,
        receiveEventUpdates: eventPreferences.receiveEventUpdates ?? true,
        receiveEventReminders: eventPreferences.receiveEventReminders ?? true,
        preferredCategories: eventPreferences.preferredCategories || [],
        locationRadius: eventPreferences.locationRadius || 50,
        preferredLocation: eventPreferences.preferredLocation || null
      }
    });

    res.status(200).json({
      success: true,
      message: 'Event preferences updated successfully'
    });

  } catch (error) {
    console.error('Error updating event preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating preferences',
      error: error.message
    });
  }
};

// Get user event preferences
exports.getEventPreferences = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    const preferences = userData.eventPreferences || {
      receiveEventNotifications: true,
      receiveNewEventBroadcasts: true,
      receiveEventUpdates: true,
      receiveEventReminders: true,
      preferredCategories: [],
      locationRadius: 50,
      preferredLocation: null
    };

    res.status(200).json({
      success: true,
      data: { eventPreferences: preferences }
    });

  } catch (error) {
    console.error('Error fetching event preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching preferences',
      error: error.message
    });
  }
};
```

## Frontend Implementation

### 1. Socket.io Client Setup

**File**: `src/services/socketService.ts`

```typescript
import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../utils/api';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  async connect(): Promise<void> {
    try {
      if (this.socket?.connected) {
        console.log('Socket already connected');
        return;
      }

      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (!token || !userData) {
        console.log('No auth token found, skipping socket connection');
        return;
      }

      const user = JSON.parse(userData);
      
      this.socket = io(API_BASE_URL, {
        transports: ['websocket'],
        timeout: 20000,
      });

      this.setupEventListeners();

      // Authenticate after connection
      this.socket.on('connect', () => {
        console.log('Socket connected, authenticating...');
        this.socket?.emit('authenticate', {
          userId: user.uid,
          token: token.replace('Bearer ', '')
        });
      });

    } catch (error) {
      console.error('Error connecting to socket:', error);
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('authenticated', (data) => {
      console.log('Socket authenticated:', data);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('auth_error', (error) => {
      console.error('Socket authentication error:', error);
      this.disconnect();
    });

    this.socket.on('event_broadcast', (data) => {
      console.log('Received event broadcast:', data);
      this.handleEventBroadcast(data);
    });

    this.socket.on('event_update', (data) => {
      console.log('Received event update:', data);
      this.handleEventUpdate(data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      
      // Auto-reconnect for certain disconnect reasons
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.attemptReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.attemptReconnect();
    });
  }

  private handleEventBroadcast(data: any): void {
    // Handle new event broadcasts
    switch (data.type) {
      case 'new_event':
        this.showEventNotification(data.event, 'New event available!');
        break;
      default:
        console.log('Unknown broadcast type:', data.type);
    }
  }

  private handleEventUpdate(data: any): void {
    // Handle event updates for registered events
    switch (data.type) {
      case 'event_update':
        this.showEventNotification(data.event, 'Event updated');
        break;
      case 'event_cancelled':
        this.showEventNotification(data.event, 'Event cancelled');
        break;
    }
  }

  private showEventNotification(event: any, title: string): void {
    // Implement local notification display
    // You can use react-native-push-notification or similar
    console.log(`Notification: ${title} - ${event.title}`);
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  async updatePreferences(preferences: any): Promise<void> {
    if (this.socket?.connected) {
      this.socket.emit('update_preferences', preferences);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}

export const socketService = new SocketService();
```

### 2. Update App.tsx to Initialize Socket

```typescript
// Add to src/App.tsx
import { socketService } from './services/socketService';

// In your main App component, add:
useEffect(() => {
  // Initialize socket connection when app starts
  const initializeSocket = async () => {
    try {
      await socketService.connect();
    } catch (error) {
      console.error('Failed to initialize socket:', error);
    }
  };

  initializeSocket();

  return () => {
    socketService.disconnect();
  };
}, []);
```

### 3. Key Frontend Screens

#### Events Discovery Screen
**File**: `src/screens/events/EventDiscoveryScreen.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { authenticatedFetchWithRefresh, ENDPOINTS } from '../../utils/api';

interface Event {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  location: {
    venue: string;
    city: string;
  };
  category: string;
  eventType: 'free' | 'paid';
  ticketPrice: number;
  currentAttendees: number;
  maxAttendees: number;
  organizerInfo: {
    name: string;
    company: string;
  };
}

const EventDiscoveryScreen = ({ navigation }: any) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'business', label: 'Business' },
    { id: 'networking', label: 'Networking' },
    { id: 'tech', label: 'Technology' },
    { id: 'social', label: 'Social' },
    { id: 'education', label: 'Education' }
  ];

  useEffect(() => {
    loadEvents();
  }, [selectedCategory]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      
      let url = '/events/public?limit=20';
      if (selectedCategory !== 'all') {
        url += `&category=${selectedCategory}`;
      }

      const response = await authenticatedFetchWithRefresh(url, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.data.events);
      } else {
        Alert.alert('Error', 'Failed to load events');
      }
    } catch (error) {
      console.error('Error loading events:', error);
      Alert.alert('Error', 'Failed to load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadEvents();
      return;
    }

    try {
      setLoading(true);
      
      let url = `/events/search?q=${encodeURIComponent(searchQuery)}`;
      if (selectedCategory !== 'all') {
        url += `&category=${selectedCategory}`;
      }

      const response = await authenticatedFetchWithRefresh(url, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.data.events);
      }
    } catch (error) {
      console.error('Error searching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderEventCard = ({ item }: { item: Event }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
    >
      <View style={styles.eventHeader}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <View style={styles.eventTypeContainer}>
          <Text style={[
            styles.eventType,
            { color: item.eventType === 'free' ? COLORS.success : COLORS.primary }
          ]}>
            {item.eventType === 'free' ? 'FREE' : `$${item.ticketPrice}`}
          </Text>
        </View>
      </View>
      
      <Text style={styles.eventDescription} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.eventDetails}>
        <View style={styles.eventDetail}>
          <MaterialIcons name="event" size={16} color={COLORS.gray} />
          <Text style={styles.eventDetailText}>
            {new Date(item.eventDate).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.eventDetail}>
          <MaterialIcons name="location-on" size={16} color={COLORS.gray} />
          <Text style={styles.eventDetailText}>
            {item.location.venue}, {item.location.city}
          </Text>
        </View>
        
        <View style={styles.eventDetail}>
          <MaterialIcons name="people" size={16} color={COLORS.gray} />
          <Text style={styles.eventDetailText}>
            {item.currentAttendees}
            {item.maxAttendees > 0 ? `/${item.maxAttendees}` : ''} attendees
          </Text>
        </View>
      </View>
      
      <View style={styles.eventFooter}>
        <Text style={styles.organizerText}>
          by {item.organizerInfo.name}
          {item.organizerInfo.company && ` • ${item.organizerInfo.company}`}
        </Text>
        <View style={styles.categoryTag}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover Events</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateEvent')}
          style={styles.createButton}
        >
          <MaterialIcons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              loadEvents();
            }}>
              <MaterialIcons name="clear" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryItem,
                selectedCategory === item.id && styles.selectedCategory
              ]}
              onPress={() => setSelectedCategory(item.id)}
            >
              <Text style={[
                styles.categoryLabel,
                selectedCategory === item.id && styles.selectedCategoryLabel
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
        />
      </View>

      {/* Events List */}
      <FlatList
        data={events}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.eventsList}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          loadEvents();
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="event" size={64} color={COLORS.lightGray} />
              <Text style={styles.emptyText}>No events found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Try a different search term' : 'Be the first to create an event!'}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: COLORS.dark,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
  },
  selectedCategory: {
    backgroundColor: COLORS.primary,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark,
  },
  selectedCategoryLabel: {
    color: COLORS.white,
  },
  eventsList: {
    padding: 20,
  },
  eventCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginRight: 12,
  },
  eventTypeContainer: {
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventType: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  eventDescription: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 12,
    lineHeight: 20,
  },
  eventDetails: {
    marginBottom: 12,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventDetailText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 6,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  organizerText: {
    fontSize: 12,
    color: COLORS.gray,
    flex: 1,
  },
  categoryTag: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.gray,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default EventDiscoveryScreen;
```

### 4. Update API Utils

**File**: `src/utils/api.ts` (additions)

```typescript
// Add these endpoints to your existing ENDPOINTS object
export const ENDPOINTS = {
  // ... existing endpoints ...
  
  // Events endpoints
  GET_EVENTS: '/events/public',
  SEARCH_EVENTS: '/events/search',
  CREATE_EVENT: '/events',
  GET_EVENT_BY_ID: '/events',
  UPDATE_EVENT: '/events',
  DELETE_EVENT: '/events',
  PUBLISH_EVENT: '/events',
  REGISTER_FOR_EVENT: '/events',
  GET_USER_EVENTS: '/user/events',
  GET_USER_REGISTRATIONS: '/user/registrations',
  
  // User preferences
  UPDATE_EVENT_PREFERENCES: '/user/event-preferences',
  GET_EVENT_PREFERENCES: '/user/event-preferences',
};
```

## Server Integration

### Update server.js to include event routes

```javascript
// Add to backend/server.js
const eventRoutes = require('./routes/eventRoutes');

// Add after existing routes
app.use('/', eventRoutes);
```

## Implementation Timeline

### Phase 1: Core Infrastructure (Week 1)
- [ ] Database schema design and creation
- [ ] WebSocket setup with Socket.io
- [ ] Basic event controller (CRUD operations)
- [ ] Event routes setup
- [ ] User preferences system

### Phase 2: Real-time Broadcasting (Week 2)
- [ ] Socket.io service implementation
- [ ] Event broadcasting system
- [ ] User notification preferences
- [ ] Frontend socket service
- [ ] Basic event screens

### Phase 3: Event Management (Week 3)
- [ ] Event registration system
- [ ] Event search functionality
- [ ] Image upload for events
- [ ] Event categories and filtering
- [ ] User event dashboard

### Phase 4: Enhanced Features (Week 4)
- [ ] Payment integration for paid events
- [ ] Ticket generation system
- [ ] Event analytics
- [ ] Advanced search and filters
- [ ] Testing and optimization

## Technical Considerations

### Performance Optimizations
1. **Database Indexing**: Create compound indexes for efficient queries
2. **Pagination**: Implement cursor-based pagination for large event lists
3. **Caching**: Cache popular events and search results
4. **Image Optimization**: Compress and resize event images

### Security Measures
1. **Input Validation**: Validate all event data on backend
2. **Rate Limiting**: Prevent spam event creation
3. **Content Moderation**: Basic event content filtering
4. **Payment Security**: Secure Paystack integration

### Scalability Considerations
1. **WebSocket Scaling**: Use Redis adapter for multiple server instances
2. **Database Sharding**: Plan for horizontal scaling if needed
3. **CDN Integration**: Serve event images via CDN
4. **Search Optimization**: Consider Algolia for advanced search

This implementation provides a robust foundation for the Events feature with real-time broadcasting capabilities using WebSockets, comprehensive CRUD operations, and user preference management.
