const EventBroadcastService = require('../services/eventBroadcastService');

/**
 * Event Broadcasting Middleware - Non-Invasive WebSocket Integration
 * 
 * This middleware provides a safe way to add real-time broadcasting
 * to existing event endpoints without modifying controllers or risking
 * existing HTTP API functionality.
 * 
 * Key Features:
 * - Broadcasts AFTER successful HTTP response 
 * - Never affects HTTP response timing or content
 * - Gracefully handles WebSocket failures
 * - Easy to enable/disable for rollback
 */
class EventBroadcastMiddleware {

    /**
     * Add broadcasting after successful event creation
     * @param {Object} req - Express request
     * @param {Object} res - Express response  
     * @param {Function} next - Express next function
     */
    static broadcastAfterEventCreation(req, res, next) {
        // Store original res.json method
        const originalJson = res.json.bind(res);
        
        // Override res.json to add broadcasting after response
        res.json = function(data) {
            // Send the original HTTP response first
            originalJson(data);
            
            // Only broadcast if response was successful and contains event data
            if (res.statusCode === 201 && data.success && data.event) {
                // Broadcast asynchronously without blocking or waiting
                setImmediate(async () => {
                    try {
                        await EventBroadcastService.broadcastNewEvent(data.event);
                    } catch (error) {
                        // Log but never throw - HTTP response already sent
                        console.warn('[EventBroadcastMiddleware] Event creation broadcast failed:', error.message);
                    }
                });
            }
        };
        
        next();
    }

    /**
     * Add broadcasting after successful event publishing
     */
    static broadcastAfterEventPublishing(req, res, next) {
        const originalJson = res.json.bind(res);
        
        res.json = function(data) {
            originalJson(data);
            
            if (res.statusCode === 200 && data.success && data.event) {
                setImmediate(async () => {
                    try {
                        // Publishing is when an event becomes available to the public
                        await EventBroadcastService.broadcastNewEvent(data.event);
                    } catch (error) {
                        console.warn('[EventBroadcastMiddleware] Event publishing broadcast failed:', error.message);
                    }
                });
            }
        };
        
        next();
    }

    /**
     * Add broadcasting after successful event registration
     */
    static broadcastAfterRegistration(req, res, next) {
        const originalJson = res.json.bind(res);
        
        res.json = function(data) {
            originalJson(data);
            
            if (res.statusCode === 201 && data.success && data.registration) {
                setImmediate(async () => {
                    try {
                        const eventId = req.params.eventId;
                        if (eventId && data.event) {
                            console.log('[EventBroadcastMiddleware] Broadcasting registration update for event:', eventId);
                            
                            // Prepare registration data for broadcasting
                            const registrationData = {
                                id: data.registration.id,
                                userId: data.registration.userId,
                                userName: data.registration.userName || 'Unknown User',
                                registeredAt: data.registration.registeredAt || new Date().toISOString(),
                                status: data.registration.status || 'registered'
                            };

                            // Use the comprehensive registration broadcasting
                            await EventBroadcastService.broadcastRegistrationUpdate(data.event, registrationData);
                        } else {
                            console.warn('[EventBroadcastMiddleware] Missing event or eventId for registration broadcast');
                        }
                    } catch (error) {
                        console.warn('[EventBroadcastMiddleware] Registration broadcast failed:', error.message);
                    }
                });
            }
        };
        
        next();
    }

    /**
     * Add broadcasting after successful event unregistration
     */
    static broadcastAfterUnregistration(req, res, next) {
        const originalJson = res.json.bind(res);
        
        res.json = function(data) {
            originalJson(data);
            
            if (res.statusCode === 200 && data.success) {
                setImmediate(async () => {
                    try {
                        const eventId = req.params.eventId;
                        if (eventId && data.event) {
                            console.log('[EventBroadcastMiddleware] Broadcasting unregistration update for event:', eventId);
                            
                            // Prepare unregistration data for broadcasting
                            const unregistrationData = {
                                userId: req.user?.uid,
                                userName: req.user?.name || 'Unknown User'
                            };

                            // Use the comprehensive unregistration broadcasting
                            await EventBroadcastService.broadcastUnregistrationUpdate(data.event, unregistrationData);
                        } else {
                            console.warn('[EventBroadcastMiddleware] Missing event or eventId for unregistration broadcast');
                        }
                    } catch (error) {
                        console.warn('[EventBroadcastMiddleware] Unregistration broadcast failed:', error.message);
                    }
                });
            }
        };
        
        next();
    }

    /**
     * Middleware to store event data in res.locals for broadcasting
     * This is a helper middleware to capture event data before response
     */
    static captureEventData(req, res, next) {
        // Store original methods
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);
        
        // Override to capture event data
        res.json = function(data) {
            if (data && data.event) {
                res.locals.eventData = data.event;
            }
            return originalJson(data);
        };
        
        res.send = function(data) {
            try {
                const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
                if (parsedData && parsedData.event) {
                    res.locals.eventData = parsedData.event;
                }
            } catch (e) {
                // Ignore parsing errors, not critical
            }
            return originalSend(data);
        };
        
        next();
    }

    /**
     * Generic broadcasting middleware for any successful event operation
     * @param {string} broadcastType - Type of broadcast (new_event, event_update, etc.)
     */
    static broadcastAfterSuccess(broadcastType) {
        return (req, res, next) => {
            const originalJson = res.json.bind(res);
            
            res.json = function(data) {
                originalJson(data);
                
                // Only broadcast successful operations with event data
                if ((res.statusCode === 200 || res.statusCode === 201) && 
                    data.success) {
                    
                    // Priority: response data > controller data > middleware captured data
                    // Handle nested data structures (data.data.event for DELETE responses)
                    const eventData = data.event || data.data?.event || req.eventData || res.locals.eventData;
                    const finalBroadcastType = req.broadcastType || broadcastType;
                    
                    if (eventData) {
                        setImmediate(async () => {
                            try {
                                console.log(`[EventBroadcastMiddleware] Broadcasting ${finalBroadcastType} for event: ${eventData.title || eventData.id}`);
                                
                                switch (finalBroadcastType) {
                                    case 'new_event':
                                        await EventBroadcastService.broadcastNewEvent(eventData);
                                        break;
                                    case 'event_update':
                                        await EventBroadcastService.broadcastEventUpdate(eventData, 'event_update');
                                        break;
                                    case 'event_cancelled':
                                        await EventBroadcastService.broadcastEventUpdate(eventData, 'event_cancelled');
                                        break;
                                    default:
                                        console.log(`[EventBroadcastMiddleware] Unknown broadcast type: ${finalBroadcastType}`);
                                }
                            } catch (error) {
                                console.warn(`[EventBroadcastMiddleware] ${finalBroadcastType} broadcast failed:`, error.message);
                            }
                        });
                    } else {
                        console.log(`[EventBroadcastMiddleware] No event data found for ${finalBroadcastType} broadcast`);
                    }
                }
            };
            
            next();
        };
    }

    /**
     * Feature flag to easily enable/disable all broadcasting
     */
    static isEnabled() {
        return process.env.WEBSOCKET_BROADCASTING_ENABLED !== 'false';
    }

    /**
     * Conditional middleware wrapper - only applies if broadcasting is enabled
     * @param {Function} middlewareFunction - The middleware to conditionally apply
     */
    static conditionally(middlewareFunction) {
        return (req, res, next) => {
            if (this.isEnabled()) {
                return middlewareFunction(req, res, next);
            } else {
                console.log('[EventBroadcastMiddleware] Broadcasting disabled, skipping middleware');
                next();
            }
        };
    }

    /**
     * Get middleware status for monitoring
     */
    static getStatus() {
        return {
            enabled: this.isEnabled(),
            broadcastServiceStatus: EventBroadcastService.getStatus()
        };
    }
}

module.exports = EventBroadcastMiddleware; 