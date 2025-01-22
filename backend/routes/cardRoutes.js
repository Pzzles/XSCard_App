const express = require('express');
const { generateQRCode } = require('../controllers/cardController');
const router = express.Router();

router.post('/generateQR', generateQRCode);

module.exports = router;