const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

router.get('/Contacts', contactController.getAllContacts);
router.get('/Contacts/:id', contactController.getContactById);
router.post('/AddContact', contactController.addContact);
router.patch('/Contacts/:id', contactController.updateContact);
router.delete('/Contacts/:id', contactController.deleteContact);
router.delete('/Contacts/:id/contact/:index', contactController.deleteContactFromList);
router.post('/saveContactInfo', contactController.saveContactInfo);

module.exports = router;
