const { db } = require('../firebase');

/**
 * Event Broadcasting Service - Safe WebSocket Integration
 * 
 * This service provides a non-invasive way to add real-time broadcasting
 * to existing event operations without risking existing functionality.
 * 
 * Key Safety Features:
 * - Never throws errors that could break HTTP responses
 * - Gracefully handles WebSocket service unavailability  
 * - Async/non-blocking broadcasts
 * - User preference filtering with safe fallbacks
 */
class EventBroadcastService {
    
    static broadcastFailureCount = 0;
    static MAX_FAILURES = 5;
    static CIRCUIT_BREAKER_RESET_TIME = 5 * 60 * 1000; // 5 minutes
    static lastFailureTime = null;

    /**
     * Safely broadcast new event to all relevant users
     * @param {Object} eventData - Event data to broadcast
     * @returns {Promise<boolean>} Success status (never throws)
     */
    static async broadcastNewEvent(eventData) {
        try {
            // Circuit breaker check
            if (this.isCircuitBreakerOpen()) {
                console.log('[EventBroadcast] Circuit breaker open, skipping broadcast');
                return false;
            }

            // Check if WebSocket service is available
            if (!global.socketService) {
                console.log('[EventBroadcast] WebSocket service not available, skipping broadcast');
                return false;
            }

            // Check if anyone is connected
            const connectedUsers = global.socketService.getConnectedUsersCount();
            if (connectedUsers === 0) {
                console.log('[EventBroadcast] No users connected, skipping broadcast');
                return true; // Not a failure, just no audience
            }

            console.log(`[EventBroadcast] Broadcasting new event "${eventData.title}" to ${connectedUsers} connected users`);

            // Broadcast with user preference filtering
            await this.broadcastWithPreferences('new_event', eventData);

            // Reset failure count on success
            this.broadcastFailureCount = 0;
            this.lastFailureTime = null;

            return true;

        } catch (error) {
            return this.handleBroadcastError('broadcastNewEvent', error);
        }
    }

    /**
     * Safely broadcast event update to relevant users
     * @param {Object} eventData - Updated event data
     * @param {string} updateType - Type of update (event_update, event_cancelled, etc.)
     * @returns {Promise<boolean>} Success status (never throws)
     */
    static async broadcastEventUpdate(eventData, updateType = 'event_update') {
        try {
            // Circuit breaker check
            if (this.isCircuitBreakerOpen()) {
                console.log('[EventBroadcast] Circuit breaker open, skipping update broadcast');
                return false;
            }

            // Check WebSocket service availability
            if (!global.socketService) {
                console.log('[EventBroadcast] WebSocket service not available, skipping update broadcast');
                return false;
            }

            const connectedUsers = global.socketService.getConnectedUsersCount();
            if (connectedUsers === 0) {
                console.log('[EventBroadcast] No users connected, skipping update broadcast');
                return true;
            }

            console.log(`[EventBroadcast] Broadcasting ${updateType} for event "${eventData.title}" to ${connectedUsers} connected users`);

            // For updates, we might want to notify only registered users
            if (updateType === 'event_update' || updateType === 'event_cancelled') {
                await this.broadcastToRegisteredUsers(updateType, eventData);
            } else {
                await this.broadcastWithPreferences(updateType, eventData);
            }

            // Reset failure count on success
            this.broadcastFailureCount = 0;
            this.lastFailureTime = null;

            return true;

        } catch (error) {
            return this.handleBroadcastError('broadcastEventUpdate', error);
        }
    }

    /**
     * Broadcast event registration updates
     * @param {Object} eventData - Event data
     * @param {Object} registrationData - Registration data
     * @returns {Promise<boolean>} Success status
     */
    static async broadcastRegistrationUpdate(eventData, registrationData) {
        try {
            if (!global.socketService || this.isCircuitBreakerOpen()) {
                return false;
            }

            // Notify event organizer
            const organizerId = eventData.organizerId;
            if (global.socketService.isUserConnected(organizerId)) {
                global.socketService.sendToUser(organizerId, 'new_registration', {
                    type: 'new_registration',
                    event: eventData,
                    registration: registrationData,
                    timestamp: new Date().toISOString()
                });
                
                console.log(`[EventBroadcast] Notified organizer ${organizerId} of new registration`);
            }

            return true;

        } catch (error) {
            return this.handleBroadcastError('broadcastRegistrationUpdate', error);
        }
    }

    /**
     * Broadcast with user preference filtering
     * @private
     */
    static async broadcastWithPreferences(eventType, eventData) {
        // For Phase 2A, broadcast to all connected users
        // Phase 2B will add preference filtering
        
        const broadcastData = {
            type: eventType,
            event: {
                id: eventData.id,
                title: eventData.title,
                description: eventData.description,
                category: eventData.category,
                eventDate: eventData.eventDate,
                location: eventData.location,
                organizerInfo: eventData.organizerInfo,
                eventType: eventData.eventType,
                ticketPrice: eventData.ticketPrice
            },
            timestamp: new Date().toISOString()
        };

        await global.socketService.broadcastToAll(eventType, broadcastData);
    }

    /**
     * Broadcast to users registered for specific event
     * @private
     */
    static async broadcastToRegisteredUsers(eventType, eventData) {
        try {
            // Get registered users for this event
            const registrationsSnapshot = await db.collection('event_registrations')
                .where('eventId', '==', eventData.id)
                .where('status', '==', 'registered')
                .get();

            const registeredUserIds = [];
            registrationsSnapshot.forEach(doc => {
                registeredUserIds.push(doc.data().userId);
            });

            console.log(`[EventBroadcast] Notifying ${registeredUserIds.length} registered users about ${eventType}`);

            if (registeredUserIds.length > 0) {
                // Send to each registered user if they're connected
                const broadcastData = {
                    type: eventType,
                    event: eventData,
                    timestamp: new Date().toISOString()
                };

                registeredUserIds.forEach(userId => {
                    if (global.socketService.isUserConnected(userId)) {
                        global.socketService.sendToUser(userId, eventType, broadcastData);
                    }
                });
            } else {
                // No registered users, broadcast to all connected users instead
                console.log(`[EventBroadcast] No registered users found, broadcasting ${eventType} to all connected users`);
                await this.broadcastWithPreferences(eventType, eventData);
            }

        } catch (error) {
            console.warn('[EventBroadcast] Error getting registered users:', error.message);
            // Fallback to general broadcast
            await this.broadcastWithPreferences(eventType, eventData);
        }
    }

    /**
     * Check if circuit breaker is open
     * @private
     */
    static isCircuitBreakerOpen() {
        // Reset circuit breaker after timeout
        if (this.lastFailureTime && Date.now() - this.lastFailureTime > this.CIRCUIT_BREAKER_RESET_TIME) {
            console.log('[EventBroadcast] Circuit breaker reset after timeout');
            this.broadcastFailureCount = 0;
            this.lastFailureTime = null;
            return false;
        }

        return this.broadcastFailureCount >= this.MAX_FAILURES;
    }

    /**
     * Handle broadcast errors safely
     * @private
     */
    static handleBroadcastError(operation, error) {
        this.broadcastFailureCount++;
        this.lastFailureTime = Date.now();

        console.warn(`[EventBroadcast] ${operation} failed (${this.broadcastFailureCount}/${this.MAX_FAILURES}):`, error.message);

        if (this.broadcastFailureCount >= this.MAX_FAILURES) {
            console.error('[EventBroadcast] Circuit breaker opened due to repeated failures');
        }

        // NEVER throw - this must not break HTTP responses
        return false;
    }

    /**
     * Get broadcasting service status
     * @returns {Object} Status information
     */
    static getStatus() {
        return {
            serviceName: 'EventBroadcastService',
            available: !!global.socketService,
            connectedUsers: global.socketService?.getConnectedUsersCount() || 0,
            circuitBreakerOpen: this.isCircuitBreakerOpen(),
            failureCount: this.broadcastFailureCount,
            lastFailureTime: this.lastFailureTime
        };
    }

    /**
     * Reset circuit breaker manually (for admin/debugging)
     */
    static resetCircuitBreaker() {
        this.broadcastFailureCount = 0;
        this.lastFailureTime = null;
        console.log('[EventBroadcast] Circuit breaker manually reset');
    }
}

module.exports = EventBroadcastService; 