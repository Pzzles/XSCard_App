const { db } = require('../firebase.js');
const QRCode = require('qrcode');

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
        console.error('Error fetching cards:', error);
        res.status(500).send({ 
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
};

exports.getCardById = async (req, res) => {
    const { id } = req.params;
    console.log('Fetching card with ID:', id);
    try {
        const cardRef = db.collection('cards').doc(id);
        const doc = await cardRef.get();
        
        if (!doc.exists) {
            return res.status(404).send({ message: 'Card not found' });
        }
        
        res.status(200).send({
            id: doc.id,
            ...doc.data()
        });
    } catch (error) {
        console.error('Error fetching card:', error);
        res.status(500).send({ 
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
};

exports.addCard = async (req, res) => {
    const { Company, Email, PhoneNumber, UserId, socialLinks, title } = req.body;
    
    const requiredFields = ['Company', 'Email', 'PhoneNumber', 'UserId', 'title'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
        return res.status(400).send({ 
            message: 'Missing required fields', 
            missingFields 
        });
    }

    try {
        const cardData = {
            Company,
            Email,
            PhoneNumber,
            UserId: db.doc(`users/${UserId}`),
            socialLinks: socialLinks || [],
            title,
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('cards').add(cardData);
        
        res.status(201).send({ 
            message: 'Card added successfully',
            cardId: docRef.id,
            cardData
        });
    } catch (error) {
        console.error('Error adding card:', error);
        res.status(500).send({ 
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
};

exports.updateCard = async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    
    if (Object.keys(updateData).length === 0) {
        return res.status(400).send({ message: 'Update data is required' });
    }

    try {
        const cardRef = db.collection('cards').doc(id);
        const doc = await cardRef.get();

        if (!doc.exists) {
            return res.status(404).send({ message: 'Card not found' });
        }

        await cardRef.update(updateData);
        res.status(200).send({ 
            message: 'Card updated successfully',
            updatedFields: Object.keys(updateData)
        });
    } catch (error) {
        console.error('Error updating card:', error);
        res.status(500).send({ 
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
};

exports.deleteCard = async (req, res) => {
    const { id } = req.params;
    
    try {
        const cardRef = db.collection('cards').doc(id);
        const doc = await cardRef.get();
        
        if (!doc.exists) {
            return res.status(404).send({ message: 'Card not found' });
        }

        await cardRef.delete();
        res.status(200).send({ 
            message: 'Card deleted successfully',
            deletedCardId: id
        });
    } catch (error) {
        console.error('Delete card error:', error);
        res.status(500).send({ 
            message: 'Failed to delete card',
            error: error.message 
        });
    }
};

exports.generateQR = async (req, res) => {
    const { userId } = req.params;
    console.log('Generating QR code for user ID:', userId);
    
    try {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            console.log('User not found:', userId);
            return res.status(404).send({ message: 'User not found' });
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
        console.error('Error generating QR code:', error);
        res.status(500).send({ 
            message: 'Failed to generate QR code',
            error: error.message 
        });
    }
};

exports.updateCardColor = async (req, res) => {
    const { id } = req.params;
    const { color } = req.body;
    
    if (!color) {
        return res.status(400).send({ message: 'Color is required' });
    }

    try {
        const cardRef = db.collection('cards').doc(id);
        const doc = await cardRef.get();

        if (!doc.exists) {
            return res.status(404).send({ message: 'Card not found' });
        }

        await cardRef.update({
            colorScheme: color
        });

        res.status(200).send({ 
            message: 'Card color updated successfully',
            color
        });
    } catch (error) {
        console.error('Error updating card color:', error);
        res.status(500).send({ 
            message: 'Failed to update card color',
            error: error.message 
        });
    }
};
