// Silence the punycode deprecation warning
process.removeAllListeners('warning');

const express = require('express');
const { FieldValue } = require('firebase-admin/firestore');
const QRCode = require('qrcode');
// const admin = require('firebase-admin'); // Authentication temporarily disabled
const app = express();
const port = 8383;
const { db } = require('./firebase.js');

app.use(express.json());

/* Authentication middleware temporarily disabled
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ message: 'Authentication token required' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        return res.status(403).send({ 
            message: 'Invalid authentication credentials',
            error: error.message 
        });
    }
};
*/

app.get('/Users', async (req, res) => {
    try {
        console.log('Fetching all users...');
        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();
        
        if (snapshot.empty) {
            console.log('No users found in collection');
            return res.status(404).send({ message: 'No users found' });
        }

        const users = [];
        snapshot.forEach(doc => {
            users.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`Found ${users.length} users`);
        res.status(200).send(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send({ 
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
});

app.get('/Users/:id', async (req, res) => {
    const { id } = req.params;
    console.log('Fetching user with ID:', id);
    try {
        const userRef = db.collection('users').doc(id);
        const doc = await userRef.get();
        
        if (!doc.exists) {
            return res.status(404).send({ message: 'User is not found' });
        }
        
        res.status(200).send({
            id: doc.id,
            ...doc.data()
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).send({ 
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
});

app.post('/AddUser', async (req, res) => {
    const { name, surname, email, password, occupation, company, status } = req.body;
    
    // Validate all required fields
    const requiredFields = ['name', 'surname', 'email', 'password', 'occupation', 'company', 'status'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
        return res.status(400).send({ 
            message: 'Missing required fields', 
            missingFields 
        });
    }

    try {
        const userData = {
            name,
            surname,
            email,
            password,
            occupation,
            company,
            status,
            createdAt: new Date().toISOString()
        };

        // Add document to 'users' collection with auto-generated ID
        const docRef = await db.collection('users').add(userData);
        
        res.status(201).send({ 
            message: 'User added successfully',
            userId: docRef.id,
            userData
        });
    } catch (error) {
        res.status(500).send({ message: 'Internal Server Error', error });
    }
});

app.patch('/Users/:name', async (req, res) => {
    const { name } = req.params;
    const { newStatus } = req.body;
    if (!newStatus) {
        return res.status(400).send({ message: 'New status is required' });
    }
    try {
        const usersRef = db.collection('clients').doc('app-users');
        await usersRef.set({ [name]: newStatus }, { merge: true });
        res.status(200).send({ message: 'User status updated successfully' });
    } catch (error) {
        res.status(500).send({ message: 'Internal Server Error', error });
    }
});

app.delete('/Users/:id', async (req, res) => {
    console.log('Delete request received for ID:', req.params.id);
    const { id } = req.params;
    
    if (!id) {
        console.log('Invalid ID provided');
        return res.status(400).send({ message: 'Valid user ID is required' });
    }

    try {
        // First try to get all users to debug
        const usersCollection = db.collection('users');
        const snapshot = await usersCollection.get();
        console.log('Total documents in collection:', snapshot.size);
        
        // Now try to delete the specific document
        const userRef = usersCollection.doc(id);
        const doc = await userRef.get();
        
        console.log('Document exists?', doc.exists);
        
        if (!doc.exists) {
            console.log('Document not found with ID:', id);
            return res.status(404).send({ 
                message: 'User not found',
                providedId: id
            });
        }

        console.log('Attempting to delete document...');
        await userRef.delete();
        console.log('Document successfully deleted');
        
        res.status(200).send({ 
            message: 'User deleted successfully',
            deletedUserId: id,
            deletedData: doc.data()
        });
    } catch (error) {
        console.error('Delete operation failed:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        
        res.status(500).send({ 
            message: 'Failed to delete user',
            error: {
                code: error.code,
                message: error.message
            },
            providedId: id
        });
    }
});

app.delete('/Users/:id', async (req, res) => {
    console.log('Delete request received');
    const { id } = req.params;
    try {
        const userRef = db.collection('users').doc(id);
        const doc = await userRef.get();
        
        if (!doc.exists) {
            return res.status(404).send({ message: 'User not found' });
        }

        await userRef.delete();
        res.status(200).send({ 
            message: 'User deleted successfully',
            deletedUserId: id
        });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).send({ 
            message: 'Failed to delete user',
            error: error.message 
        });
    }
});

// Card Controller Endpoints
app.get('/Cards', async (req, res) => {
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
});

app.get('/Cards/:id', async (req, res) => {
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
});

app.post('/AddCard', async (req, res) => {
    const { CardId, Company, Email, PhoneNumber, UserId, socialLinks, title } = req.body;
    
    // Validate required fields
    const requiredFields = ['CardId', 'Company', 'Email', 'PhoneNumber', 'UserId', 'title'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
        return res.status(400).send({ 
            message: 'Missing required fields', 
            missingFields 
        });
    }

    try {
        const cardData = {
            CardId,
            Company,
            Email,
            PhoneNumber,
            UserId: db.doc(`Users/${UserId}`), // Creating a reference to the user
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
});

app.patch('/Cards/:id', async (req, res) => {
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
});

app.delete('/Cards/:id', async (req, res) => {
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
});

// QR code generation endpoint
app.post('/generateQR', async (req, res) => {
    const { name, status } = req.body;
    if (!name || !status) {
        return res.status(400).send({ message: 'Name and status are required to generate QR code' });
    }
    try {
        const qrData = JSON.stringify({ name, status });
        const qrCodeBuffer = await QRCode.toBuffer(qrData);
        res.setHeader('Content-Type', 'image/png');
        res.status(200).send(qrCodeBuffer);
    } catch (error) {
        res.status(500).send({ message: 'Internal Server Error', error });
    }
});

app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).send({
        message: 'Internal Server Error',
        error: {
            code: error.code || 500,
            message: error.message,
            details: error.details || error.toString()
        }
    });
});

app.listen(port, () => console.log(`Server has started on port: ${port}`));


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// const express = require('express');
// const app = express();
// const port = 8383;
// const userRoutes = require('./routes/userRoutes');
// const cardRoutes = require('./routes/cardRoutes');

// app.use(express.json());
// app.use('/api', userRoutes);
// app.use('/api', cardRoutes);

// app.listen(port, () => console.log(`Server has started on port: ${port}`));