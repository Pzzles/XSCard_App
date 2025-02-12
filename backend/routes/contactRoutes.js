const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

router.get('/Contacts', contactController.getAllContacts);
router.get('/Contacts/:id', contactController.getContactById);
router.post('/AddContact', contactController.addContact);
router.patch('/Contacts/:id', contactController.updateContact);
router.delete('/Contacts/:id', contactController.deleteContact);
router.delete('/Contacts/:id/contact/:index', contactController.deleteContactFromList);

router.post('/Contacts', async (req, res) => {
  try {
    // ...existing validation code...

    // Make sure we're using the correct sender email
    const mailOptions = {
      from: {
        name: 'XS Card',
        address: 'xscard@xspark.co.za'  // Hardcode the correct sender
      },
      to: ownerEmail,  // This should be the card owner's email
      subject: 'Someone Saved Your Contact Information',
      html: emailTemplate  // Your existing email template
    };

    const emailResult = await sendMailWithStatus(mailOptions);
    // ...rest of the route handler...

  } catch (error) {
    // ...existing error handling...
  }
});

router.post('/saveContactInfo', contactController.saveContactInfo);

module.exports = router;
