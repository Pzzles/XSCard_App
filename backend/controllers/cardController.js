const { db, admin } = require('../firebase.js');
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Shared error response helper
const sendError = (res, status, message, error = null) => {
    console.error(`${message}:`, error);
    res.status(status).send({ 
        message,
        ...(error && { error: error.message })
    });
};

// Shared validation helper
const validateUserAccess = async (userId, userUid) => {
    if (userUid !== userId) {
        throw new Error('Unauthorized access');
    }
};

exports.getAllCards = async (req, res) => {
    try {
        console.log('Fetching all cards...');
        const cardsRef = db.collection('cards');
        const snapshot = await cardsRef.get();
        
        if (snapshot.empty) {
            console.log('No cards found in collection');
            return res.status(404).send({ message: 'No cards found' });
        }

        const cards = [];
        snapshot.forEach(doc => {
            cards.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`Found ${cards.length} cards`);
        res.status(200).send(cards);
    } catch (error) {
        sendError(res, 500, 'Error fetching cards', error);
    }
};

exports.getCardById = async (req, res) => {
    const { id } = req.params;
    
    try {
        // Validates that requesting user matches the requested userId
        await validateUserAccess(id, req.user.uid);

        const cardRef = db.collection('cards').doc(id);
        const doc = await cardRef.get();
        
        if (!doc.exists || !doc.data().cards) {
            return sendError(res, 404, 'No cards found for this user');
        }
        
        res.status(200).send(doc.data().cards);
    } catch (error) {
        sendError(res, error.message === 'Unauthorized access' ? 403 : 500, 
            'Failed to fetch card data', error);
    }
};

exports.addCard = async (req, res) => {
    const { 
        company, 
        email, 
        phone, 
        title, 
        name,
        surname,
        colorScheme,
        socials 
    } = req.body;
    
    const userId = req.user.uid; // Get the current user's UID from the auth middleware
    
    const requiredFields = ['company', 'email', 'phone', 'title'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
        return res.status(400).send({ 
            message: 'Missing required fields', 
            missingFields 
        });
    }

    try {
        const cardRef = db.collection('cards').doc(userId);
        const cardDoc = await cardRef.get();

        const newCard = {
            company,
            email,
            phone,
            occupation: title,
            name: name || '',
            surname: surname || '',
            socials: socials || {},
            colorScheme: colorScheme || '#E9C46A', // Use provided color or default
            createdAt: new Date().toISOString(),
            profileImage: null,
            companyLogo: null
        };

        if (cardDoc.exists) {
            await cardRef.update({
                cards: admin.firestore.FieldValue.arrayUnion(newCard)
            });
        } else {
            await cardRef.set({
                cards: [newCard]
            });
        }
        
        res.status(201).send({ 
            message: 'Card added successfully',
            cardData: newCard
        });
    } catch (error) {
        sendError(res, 500, 'Error adding card', error);
    }
};

// Update the updateCard function to handle both JSON and multipart/form-data
exports.updateCard = async (req, res) => {
    const { id: userId } = req.params;
    const { cardIndex = 0 } = req.query;

    try {
        const cardRef = db.collection('cards').doc(userId);
        const doc = await cardRef.get();

        if (!doc.exists) {
            return res.status(404).send({ message: 'User cards not found' });
        }

        const cardsData = doc.data();
        if (!cardsData.cards || !cardsData.cards[cardIndex]) {
            return res.status(404).send({ message: 'Card not found at specified index' });
        }

        let updateData = {};

        // Handle file upload
        if (req.file) {
            const filePath = `/profiles/${req.file.filename}`; // Changed from /uploads/ to /profiles/
            if (req.body.imageType === 'profileImage') {
                updateData.profileImage = filePath;
            } else if (req.body.imageType === 'companyLogo') {
                updateData.companyLogo = filePath;
            }
        } else if (req.body) {
            // If no file but has body data, it's a regular update
            updateData = JSON.parse(JSON.stringify(req.body));
        }

        // Update the specific card in the array
        const updatedCards = [...cardsData.cards];
        updatedCards[cardIndex] = {
            ...updatedCards[cardIndex],
            ...updateData
        };

        // Update the document
        await cardRef.update({
            cards: updatedCards
        });

        res.status(200).send({ 
            message: 'Card updated successfully',
            updatedCard: updatedCards[cardIndex]
        });
    } catch (error) {
        console.error('Update card error:', error);
        res.status(500).send({
            message: 'Failed to update card',
            error: error.message
        });
    }
};

exports.deleteCard = async (req, res) => {
    const { id: userId } = req.params;
    const { cardIndex } = req.query;
    
    if (!cardIndex && cardIndex !== 0) {
        return res.status(400).send({ message: 'Card index is required' });
    }

    try {
        const cardRef = db.collection('cards').doc(userId);
        const doc = await cardRef.get();
        
        if (!doc.exists) {
            return res.status(404).send({ message: 'User cards not found' });
        }

        const cardsData = doc.data();
        if (!cardsData.cards || !cardsData.cards[cardIndex]) {
            return res.status(404).send({ message: 'Card not found at specified index' });
        }

        // Remove the card at the specified index
        const updatedCards = cardsData.cards.filter((_, index) => index !== parseInt(cardIndex));

        // Update the document with the modified array
        await cardRef.update({
            cards: updatedCards
        });

        res.status(200).send({ 
            message: 'Card deleted successfully',
            deletedCardIndex: cardIndex
        });
    } catch (error) {
        sendError(res, 500, 'Failed to delete card', error);
    }
};

exports.generateQR = async (req, res) => {
    const { userId } = req.params;
    
    try {
        await validateUserAccess(userId, req.user.uid);

        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            return sendError(res, 404, 'User not found');
        }

        const redirectUrl = `${req.protocol}://${req.get('host')}/saveContact?userId=${userId}`;
        const qrCodeBuffer = await QRCode.toBuffer(redirectUrl, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 300
        });

        res.setHeader('Content-Type', 'image/png');
        res.status(200).send(qrCodeBuffer);
    } catch (error) {
        sendError(res, error.message === 'Unauthorized access' ? 403 : 500, 
            'Failed to generate QR code', error);
    }
};

exports.updateCardColor = async (req, res) => {
    const { id: userId } = req.params;
    const { cardIndex } = req.query;
    const { color } = req.body;
    
    if (!cardIndex && cardIndex !== 0) {
        return res.status(400).send({ message: 'Card index is required' });
    }

    if (!color) {
        return res.status(400).send({ message: 'Color is required' });
    }

    try {
        const cardRef = db.collection('cards').doc(userId);
        const doc = await cardRef.get();

        if (!doc.exists) {
            return res.status(404).send({ message: 'User cards not found' });
        }

        const cardsData = doc.data();
        if (!cardsData.cards || !cardsData.cards[cardIndex]) {
            return res.status(404).send({ message: 'Card not found at specified index' });
        }

        // Update the color of the specific card
        const updatedCards = [...cardsData.cards];
        updatedCards[cardIndex] = {
            ...updatedCards[cardIndex],
            colorScheme: color
        };

        // Update the document with the modified array
        await cardRef.update({
            cards: updatedCards
        });

        res.status(200).send({ 
            message: 'Card color updated successfully',
            color,
            cardIndex: cardIndex
        });
    } catch (error) {
        sendError(res, 500, 'Failed to update card color', error);
    }
};
