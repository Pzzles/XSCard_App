const express = require('express');
const router = express.Router();
const { 
    initializeTrialSubscription, 
    handleTrialCallback,
    handleSubscriptionWebhook,  // Add the new webhook handler
    getSubscriptionPlans,
    getSubscriptionStatus
} = require('../controllers/subscriptionController');
const { authenticateUser } = require('../middleware/auth');

// Public routes - no authentication needed
router.get('/subscription/trial/callback', handleTrialCallback);
router.post('/subscription/webhook', handleSubscriptionWebhook);  // Update to use the proper webhook handler

// Protected routes - authentication required
router.post('/subscription/trial/initialize', authenticateUser, initializeTrialSubscription);
router.get('/subscription/plans', authenticateUser, getSubscriptionPlans);
router.get('/subscription/status', authenticateUser, getSubscriptionStatus);

module.exports = router;
