// Silence the punycode deprecation warning
process.removeAllListeners('warning');

const express = require('express');
const { FieldValue } = require('firebase-admin/firestore');
const QRCode = require('qrcode');
const path = require('path');
// const admin = require('firebase-admin'); // Authentication temporarily disabled
const app = express();
const port = 8383;
const { db } = require('./firebase.js');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
        // Fetch user data
        const userRef = db.collection('users').doc(id);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            return res.status(404).send({ message: 'User is not found' });
        }

        // Fetch associated card data
        const cardsRef = db.collection('cards');
        const cardSnapshot = await cardsRef.where('UserId', '==', db.doc(`users/${id}`)).get();
        
        let userData = {
            id: userDoc.id,
            ...userDoc.data(),
            phoneNumber: null  // Changed from phone to phoneNumber to match card collection
        };

        // Add phone number if card exists
        if (!cardSnapshot.empty) {
            const cardData = cardSnapshot.docs[0].data();
            userData.phoneNumber = cardData.PhoneNumber;  // Using PhoneNumber from cards collection
        }
        
        res.status(200).send(userData);
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
            UserId: db.doc(`users/${UserId}`), // Creating a reference to the user
            socialLinks: socialLinks || [],
            title,
            createdAt: new Date().toISOString()
        };

        // Use UserId as the document ID
        const docRef = db.collection('cards').doc(UserId);
        await docRef.set(cardData);
        
        res.status(201).send({ 
            message: 'Card added successfully',
            cardId: UserId,
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

// Contacts Controller Endpoints
app.get('/Contacts', async (req, res) => {
    try {
        console.log('Fetching all contacts...');
        const contactsRef = db.collection('contacts');
        const snapshot = await contactsRef.get();
        
        if (snapshot.empty) {
            console.log('No contacts found in collection');
            return res.status(404).send({ message: 'No contacts found' });
        }

        const contacts = [];
        snapshot.forEach(doc => {
            contacts.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`Found ${contacts.length} contacts`);
        res.status(200).send(contacts);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).send({ 
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
});

app.get('/Contacts/:id', async (req, res) => {
    const { id } = req.params;
    console.log('Fetching contact with ID:', id);
    try {
        const contactRef = db.collection('contacts').doc(id);
        const doc = await contactRef.get();
        
        if (!doc.exists) {
            return res.status(404).send({ message: 'Contact list not found' });
        }
        
        res.status(200).send({
            id: doc.id,
            ...doc.data()
        });
    } catch (error) {
        console.error('Error fetching contact:', error);
        res.status(500).send({ 
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
});

app.post('/AddContact', async (req, res) => {
    const { userId, contactInfo } = req.body;
    
    if (!userId || !contactInfo) {
        return res.status(400).send({ 
            message: 'User ID and contact info are required'
        });
    }

    try {
        const contactData = {
            userId: db.doc(`users/${userId}`),
            contactsList: [{
                ...contactInfo,
                createdAt: new Date().toISOString()
            }]
        };

        const docRef = await db.collection('contacts').add(contactData);
        
        res.status(201).send({ 
            message: 'Contact list created successfully',
            contactId: docRef.id,
            contactData
        });
    } catch (error) {
        console.error('Error adding contact:', error);
        res.status(500).send({ 
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
});

app.patch('/Contacts/:id', async (req, res) => {
    const { id } = req.params;
    const { contactInfo } = req.body;
    
    if (!contactInfo) {
        return res.status(400).send({ message: 'Contact info is required' });
    }

    try {
        const contactRef = db.collection('contacts').doc(id);
        const doc = await contactRef.get();

        if (!doc.exists) {
            return res.status(404).send({ message: 'Contact list not found' });
        }

        const currentContacts = doc.data().contactsList || [];
        currentContacts.push({
            ...contactInfo,
            createdAt: new Date().toISOString()
        });

        await contactRef.update({
            contactsList: currentContacts
        });

        res.status(200).send({ 
            message: 'Contact list updated successfully',
            updatedContacts: currentContacts
        });
    } catch (error) {
        console.error('Error updating contacts:', error);
        res.status(500).send({ 
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
});

app.delete('/Contacts/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const contactRef = db.collection('contacts').doc(id);
        const doc = await contactRef.get();
        
        if (!doc.exists) {
            return res.status(404).send({ message: 'Contact list not found' });
        }

        await contactRef.delete();
        res.status(200).send({ 
            message: 'Contact list deleted successfully',
            deletedContactId: id
        });
    } catch (error) {
        console.error('Delete contact error:', error);
        res.status(500).send({ 
            message: 'Failed to delete contact list',
            error: error.message 
        });
    }
});

// QR code generation endpoint
app.get('/generateQR/:userId', async (req, res) => {
    const { userId } = req.params;
    console.log('Generating QR code for user ID:', userId);
    
    try {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            console.log('User not found:', userId);
            return res.status(404).send({ message: 'User not found' });
        }

        // Create QR code data with redirect URL
        const redirectUrl = `${req.protocol}://${req.get('host')}/saveContact?userId=${userId}`;
        const qrData = redirectUrl;  // Just encode the URL directly

        // Generate QR code
        console.log('Generating QR code with URL:', qrData);
        const qrCodeBuffer = await QRCode.toBuffer(qrData, {
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
});

// Add new endpoint for saving contact information
app.post('/saveContactInfo', async (req, res) => {
    const { userId, contactInfo } = req.body;
    
    if (!userId || !contactInfo) {
        return res.status(400).send({ message: 'User ID and contact info are required' });
    }

    try {
        // Get or create the contacts document for the scanned user (QR owner)
        const contactsRef = db.collection('contacts').doc(userId);
        const contactsDoc = await contactsRef.get();

        // Initialize or get existing contacts array
        let existingContacts = contactsDoc.exists ? contactsDoc.data().contactsList : [];
        if (!Array.isArray(existingContacts)) existingContacts = [];

        // Add new contact to array
        existingContacts.push({
            name: contactInfo.name,
            surname: contactInfo.surname,
            number: contactInfo.phone,
            createdAt: new Date()
        });

        // Update or create the document
        await contactsRef.set({
            userId: db.doc(`users/${userId}`),  // Reference to QR owner's user document
            contactsList: existingContacts      // Array of people who scanned the QR
        }, { merge: true });

        res.status(200).send({ message: 'Contact saved successfully' });
    } catch (error) {
        console.error('Error saving contact:', error);
        res.status(500).send({ 
            message: 'Failed to save contact',
            error: error.message 
        });
    }
});

// Add the SaveContact route
app.get('/saveContact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'saveContact.html'));
});

app.post('/SignIn', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send({ 
            message: 'Email and password are required' 
        });
    }

    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('email', '==', email).get();

        if (snapshot.empty) {
            return res.status(401).send({ message: 'Invalid credentials' });
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        if (userData.password !== password) {
            return res.status(401).send({ message: 'Invalid credentials' });
        }

        res.status(200).send({
            message: 'Sign in successful',
            user: {
                id: userDoc.id,
                name: userData.name,
                email: userData.email,
                company: userData.company
            }
        });
    } catch (error) {
        console.error('Sign in error:', error);
        res.status(500).send({ 
            message: 'Internal Server Error', 
            error: error.message 
        });
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