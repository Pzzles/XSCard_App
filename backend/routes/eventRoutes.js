const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticateUser } = require('../middleware/auth');
const { handleMultipleUploads } = require('../middleware/fileUpload');

// Initialize database endpoint (can be called once to set up collections)
router.post('/events/initialize-db', eventController.initializeDatabase);

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

module.exports = router; 