const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');
const { authenticateUser } = require('../middleware/auth');

// Apply authentication middleware to all card routes
router.use(authenticateUser);

// Protected routes
router.get('/Cards', cardController.getAllCards);
router.get('/Cards/:id', cardController.getCardById);
router.post('/AddCard', cardController.addCard);
router.patch('/Cards/:id', cardController.updateCard); // Now expects ?cardIndex=0 in query
router.patch('/Cards/:id/color', cardController.updateCardColor); // Now expects ?cardIndex=0 in query
router.delete('/Cards/:id', cardController.deleteCard); // Now expects ?cardIndex=0 in query
router.get('/generateQR/:userId', cardController.generateQR);

module.exports = router;
