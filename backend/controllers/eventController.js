const { db, admin } = require('../firebase.js');
const { formatDate } = require('../utils/dateFormatter');

// Helper function for error responses (following userController pattern)
const sendError = (res, status, message, error = null) => {
  console.error(`${message}:`, error);
  res.status(status).json({ 
    success: false,
    message,
    ...(error && { error: error.message })
  });
};

// Initialize event collections if they don't exist
const initializeEventCollections = async () => {
  try {
    console.log('Initializing event collections...');
    
    // Create sample data to ensure collections exist
    const collections = [
      'events',
      'event_registrations', 
      'event_broadcasts',
      'tickets'
    ];
    
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).limit(1).get();
      if (snapshot.empty) {
        console.log(`Creating ${collectionName} collection...`);
        // Add a temporary document to create the collection
        const tempDoc = await db.collection(collectionName).add({
          _temp: true,
          createdAt: admin.firestore.Timestamp.now()
        });
        // Delete the temporary document
        await tempDoc.delete();
        console.log(`${collectionName} collection created`);
      }
    }
    
    console.log('Event collections initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing event collections:', error);
    return false;
  }
};

// Create new event
exports.createEvent = async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Initialize collections if needed
    await initializeEventCollections();
    
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

    // Get organizer info from users collection
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return sendError(res, 404, 'User not found');
    }
    
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
    if (typeof eventData.eventDate === 'string') {
      eventData.eventDate = admin.firestore.Timestamp.fromDate(new Date(eventData.eventDate));
    }
    if (eventData.endDate && typeof eventData.endDate === 'string') {
      eventData.endDate = admin.firestore.Timestamp.fromDate(new Date(eventData.endDate));
    }

    // Set default values
    eventData.category = eventData.category || 'other';
    eventData.eventType = eventData.eventType || 'free';
    eventData.ticketPrice = eventData.ticketPrice || 0;
    eventData.maxAttendees = eventData.maxAttendees || -1; // -1 for unlimited
    eventData.visibility = eventData.visibility || 'public';
    eventData.images = eventData.images || [];
    eventData.tags = eventData.tags || [];

    // Save to database
    await db.collection('events').doc(eventData.id).set(eventData);

    // Format dates for response
    const responseEvent = {
      ...eventData,
      eventDate: formatDate(eventData.eventDate),
      endDate: eventData.endDate ? formatDate(eventData.endDate) : null,
      createdAt: formatDate(eventData.createdAt)
    };

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event: responseEvent
    });

  } catch (error) {
    sendError(res, 500, 'Error creating event', error);
  }
};

// Publish event (makes it visible and ready for broadcasting)
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

    // TODO: Broadcast to connected users when socket service is available
    // if (req.app.socketService) {
    //   await req.app.socketService.broadcastNewEvent(updatedEvent);
    // }

    res.status(200).json({
      success: true,
      message: 'Event published successfully',
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
    await initializeEventCollections();
    
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
      query = query.where('eventDate', '>=', admin.firestore.Timestamp.fromDate(new Date(startDate)));
    }
    
    if (endDate) {
      query = query.where('eventDate', '<=', admin.firestore.Timestamp.fromDate(new Date(endDate)));
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
    if (!userDoc.exists) {
      return sendError(res, 404, 'User not found');
    }
    
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
      // TODO: Integrate with payment system later
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
    if (updates.eventDate && typeof updates.eventDate === 'string') {
      updates.eventDate = admin.firestore.Timestamp.fromDate(new Date(updates.eventDate));
    }
    if (updates.endDate && typeof updates.endDate === 'string') {
      updates.endDate = admin.firestore.Timestamp.fromDate(new Date(updates.endDate));
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

    // TODO: Broadcast update to registered users when socket service is available
    // if (updatedEvent.status === 'published' && req.app.socketService) {
    //   await req.app.socketService.broadcastEventUpdate(updatedEvent, 'event_update');
    // }

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

// Unregister from event
exports.unregisterFromEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.uid;

    // Find existing registration
    const registrationSnapshot = await db.collection('event_registrations')
      .where('eventId', '==', eventId)
      .where('userId', '==', userId)
      .get();

    if (registrationSnapshot.empty) {
      return sendError(res, 404, 'Registration not found');
    }

    const registrationDoc = registrationSnapshot.docs[0];
    const registrationData = registrationDoc.data();

    // Delete registration
    await registrationDoc.ref.delete();

    // Update event attendee count
    await db.collection('events').doc(eventId).update({
      currentAttendees: admin.firestore.FieldValue.increment(-1),
      attendeesList: admin.firestore.FieldValue.arrayRemove(userId)
    });

    res.status(200).json({
      success: true,
      message: 'Successfully unregistered from event'
    });

  } catch (error) {
    sendError(res, 500, 'Error unregistering from event', error);
  }
};

// Initialize database collections endpoint (for setup)
exports.initializeDatabase = async (req, res) => {
  try {
    const success = await initializeEventCollections();
    
    if (success) {
      res.status(200).json({
        success: true,
        message: 'Event database collections initialized successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to initialize some event collections'
      });
    }
  } catch (error) {
    sendError(res, 500, 'Error initializing event database', error);
  }
};

module.exports = exports; 