const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authenticateUser } = require('../middleware/auth');

// Public routes (no authentication needed)
router.post('/saveContactInfo', contactController.saveContactInfo);

// Protected routes
router.use(authenticateUser);
router.get('/Contacts', contactController.getAllContacts);
router.get('/Contacts/:id', contactController.getContactById);
router.post('/AddContact', contactController.addContact);
router.patch('/Contacts/:id', contactController.updateContact);
router.delete('/Contacts/:id', contactController.deleteContact);
router.delete('/Contacts/:id/contact/:index', contactController.deleteContactFromList);

module.exports = router;
