const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const { authenticateUser } = require('../middleware/auth');

// Apply authentication middleware to all card routes
router.use(authenticateUser);

// Group routes by resource
// Card operations
router.get('/Cards/:id', cardController.getCardById);
router.post('/AddCard', cardController.addCard);
router.patch('/Cards/:id', cardController.updateCard);
router.delete('/Cards/:id', cardController.deleteCard);

// Card customization
router.patch('/Cards/:id/color', cardController.updateCardColor);

// QR code generation
router.get('/generateQR/:userId', cardController.generateQR);

// Remove getAllCards if not being used in the frontend
// router.get('/Cards', cardController.getAllCards);

module.exports = router;
