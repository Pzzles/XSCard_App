const express = require('express');
const router = express.Router();
const cardController = require('../controllers/cardController');

router.get('/Cards', cardController.getAllCards);
router.get('/Cards/:id', cardController.getCardById);
router.post('/AddCard', cardController.addCard);
router.patch('/Cards/:id', cardController.updateCard);
router.delete('/Cards/:id', cardController.deleteCard);
router.get('/generateQR/:userId', cardController.generateQR);

module.exports = router;
