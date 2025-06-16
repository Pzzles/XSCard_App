/**
 * XS Card Backend Server
 */

process.removeAllListeners('warning');

require('dotenv').config();
const express = require('express');
const path = require('path');
const https = require('https');
const { db, admin, storage, bucket } = require('./firebase.js');
const { sendMailWithStatus } = require('./public/Utils/emailService');
const { handleSingleUpload } = require('./middleware/fileUpload');
const app = express();
const port = 8383;

// Add CORS middleware to allow loading Firebase Storage images
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Allow requests from any origin
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Import routes
const userRoutes = require('./routes/userRoutes');
const cardRoutes = require('./routes/cardRoutes');
const contactRoutes = require('./routes/contactRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes'); // Add subscription routes
const apkRoutes = require('./routes/apkRoutes'); // Add APK routes

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Public routes - must be before authentication middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', paymentRoutes); // Add this line before protected routes
app.use('/', subscriptionRoutes); // Add subscription routes
app.use('/', apkRoutes); // Add APK routes for public download

app.get('/saveContact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'saveContact.html'));
});

// Add the AddContact endpoint directly to server.js
// This bypasses any router or authentication middleware issues
app.post('/AddContact', async (req, res) => {
    const { userId, contactInfo } = req.body;
    
    // Detailed logging
    console.log('Add Contact called - Public endpoint in server.js');
    console.log('Raw request body:', JSON.stringify(req.body, null, 2));
    
    if (!userId || !contactInfo) {
        return res.status(400).send({ 
            success: false,
            message: 'User ID and contact info are required'
        });
    }

    try {
        // Get user's plan information
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        if (!userData) {
            return res.status(404).send({ message: 'User not found' });
        }

        const contactRef = db.collection('contacts').doc(userId);
        const doc = await contactRef.get();

        let currentContacts = [];
        if (doc.exists) {
            currentContacts = doc.data().contactList || [];
        }

        // Free plan contact limit
        const FREE_PLAN_CONTACT_LIMIT = 3;

        // Check if free user has reached contact limit
        if (userData.plan === 'free' && currentContacts.length >= FREE_PLAN_CONTACT_LIMIT) {
            console.log(`Contact limit reached for free user ${userId}. Current contacts: ${currentContacts.length}`);
            return res.status(403).send({
                message: 'Contact limit reached',
                error: 'FREE_PLAN_LIMIT_REACHED',
                currentContacts: currentContacts.length,
                limit: FREE_PLAN_CONTACT_LIMIT
            });
        }

        const newContact = {
            ...contactInfo,
            email: contactInfo.email || '', // Add email field with fallback
            createdAt: admin.firestore.Timestamp.now()
        };

        currentContacts.push(newContact);

        await contactRef.set({
            userId: db.doc(`users/${userId}`),
            contactList: currentContacts
        }, { merge: true });
        
        // Send email notification if user has email
        if (userData.email) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: userData.email,
                subject: 'Someone Saved Your Contact Information',
                html: `
                    <h2>New Contact Added</h2>
                    <p><strong>${contactInfo.name} ${contactInfo.surname}</strong> recently received your XS Card and has sent you their details:</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
                        <p><strong>Contact Details:</strong></p>                        <ul style="list-style: none; padding-left: 0;">
                            <li><strong>Name:</strong> ${contactInfo.name}</li>
                            <li><strong>Surname:</strong> ${contactInfo.surname}</li>
                            <li><strong>Phone Number:</strong> ${contactInfo.phone || 'Not provided'}</li>
                            <li><strong>Email:</strong> ${contactInfo.email || 'Not provided'}</li>
                            ${contactInfo.company ? `<li><strong>Company:</strong> ${contactInfo.company}</li>` : ''}
                            <li><strong>How You Met:</strong> ${contactInfo.howWeMet || 'Not provided'}</li>
                        </ul>
                    </div>
                    <p style="color: #666; font-size: 12px;">This is an automated notification from your XS Card application.</p>
                    ${userData.plan === 'free' ? 
                        `<p style="color: #ff4b6e;">You have ${FREE_PLAN_CONTACT_LIMIT - currentContacts.length} contacts remaining in your free plan.</p>` 
                        : ''}
                `
            };

            try {
                const mailResult = await sendMailWithStatus(mailOptions);
                if (!mailResult.success) {
                    console.error('Failed to send email notification:', mailResult.error);
                }
            } catch (emailError) {
                console.error('Email sending error:', emailError);
                // Continue execution even if email fails
            }
        }
        
        res.status(201).send({ 
            success: true,
            message: 'Contact added successfully',
            contactList: currentContacts.map(contact => ({
                ...contact,
                createdAt: contact.createdAt ? contact.createdAt.toDate().toISOString() : new Date().toISOString()
            })),
            remainingContacts: userData.plan === 'free' ? 
                FREE_PLAN_CONTACT_LIMIT - currentContacts.length : 
                'unlimited'
        });
    } catch (error) {
        console.error('Error adding contact:', error);
        res.status(500).send({ 
            success: false,
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
});

// Add new contact saving endpoint
app.post('/saveContact', async (req, res) => {
    const { userId, contactInfo } = req.body;
    
    if (!userId || !contactInfo) {
        return res.status(400).send({ message: 'User ID and contact info are required' });
    }

    try {
        // Save contact to database
        const contactsRef = db.collection('contacts').doc(userId);
        const contactsDoc = await contactsRef.get();

        let contactList = contactsDoc.exists ? (contactsDoc.data().contactList || []) : [];
        if (!Array.isArray(contactList)) contactList = [];

        // Add new contact with Firestore Timestamp
        contactList.push({
            name: contactInfo.name,
            surname: contactInfo.surname,
            phone: contactInfo.phone,
            howWeMet: contactInfo.howWeMet,
            createdAt: admin.firestore.Timestamp.now()
        });

        await contactsRef.set({
            contactList: contactList
        }, { merge: true });

        // Send email notification
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        if (userData && userData.email) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: userData.email,
                subject: 'Someone Saved Your Contact Information',
                html: `
                    <h2>New Contact Added</h2>
                    <p><strong>${contactInfo.name} ${contactInfo.surname}</strong> recently received your XS Card and has sent you their details:</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
                        <p><strong>Contact Details:</strong></p>
                        <ul style="list-style: none; padding-left: 0;">
                            <li><strong>Name:</strong> ${contactInfo.name}</li>
                            <li><strong>Surname:</strong> ${contactInfo.surname}</li>
                            <li><strong>Phone Number:</strong> ${contactInfo.phone}</li>
                            <li><strong>How You Met:</strong> ${contactInfo.howWeMet}</li>
                        </ul>
                    </div>
                    <p style="color: #666; font-size: 12px;">This is an automated notification from your XS Card application.</p>
                `
            };

            const mailResult = await sendMailWithStatus(mailOptions);
            console.log('Email sending result:', mailResult);

            if (!mailResult.success) {
                console.error('Failed to send email:', mailResult.error);
            }
        }

        // Send success response
        res.status(200).send({ 
            success: true,
            message: 'Contact saved successfully',
            contact: contactList[contactList.length - 1],
            emailSent: userData?.email ? true : false
        });

    } catch (error) {
        console.error('Error saving contact:', error);
        res.status(500).send({ 
            success: false,
            message: 'Failed to save contact',
            error: error.message 
        });
    }
});

// Modified public endpoint to get specific card by userId and cardIndex
app.get('/public/cards/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const cardIndex = parseInt(req.query.cardIndex) || 0;
        console.log(`Fetching public card for user ${userId}, card index ${cardIndex}`);

        const cardRef = db.collection('cards').doc(userId);
        const doc = await cardRef.get();
        
        if (!doc.exists) {
            console.log(`User ${userId} not found`);
            return res.status(404).send({ message: 'User not found' });
        }

        const userData = doc.data();
        if (!userData.cards || !userData.cards[cardIndex]) {
            console.log(`Card index ${cardIndex} not found for user ${userId}`);
            return res.status(404).send({ message: 'Card not found' });
        }

        // Get the specific card and add user ID
        const card = {
            id: userId,
            ...userData.cards[cardIndex]
        };

        // Log image URLs for debugging
        console.log('Card data being sent to client:');
        console.log('- Profile Image:', card.profileImage);
        console.log('- Company Logo:', card.companyLogo);

        res.status(200).send(card);
    } catch (error) {
        console.error('Error fetching public card:', error);
        res.status(500).send({ 
            message: 'Error fetching card', 
            error: error.message 
        });
    }
});

// Add a route to handle query form submissions
app.post('/submit-query', async (req, res) => {
  try {
    console.log('Received query form submission:', req.body);
    
    const { name, email, message, to } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields (name, email, message)',
      });
    }
    
    const mailOptions = {
      from: process.env.EMAIL_USER, // Use system email as from address
      replyTo: email, // Set reply-to as the user's email address
      to: to || 'xscard@xspark.co.za', // Use provided destination or default
      subject: `New Contact Query from ${name}`,
      html: `
        <h2>New Query from XS Card Website</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        </div>
        <p style="color: #666; font-size: 12px;">This message was sent from the XS Card contact form.</p>
      `
    };

    const result = await sendMailWithStatus(mailOptions);
    console.log('Query email send attempt completed:', result);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Your message has been sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send your message',
        details: result
      });
    }
  } catch (error) {
    console.error('Query submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process your message',
      error: error.message
    });
  }
});

// Add scan tracking endpoint
app.post('/track-scan', async (req, res) => {
    const { userId, cardIndex = 0, scanType = 'save' } = req.body;
    
    console.log('Track scan called:', { userId, cardIndex, scanType });
    
    // Validate required parameters
    if (!userId) {
        return res.status(400).send({ 
            success: false,
            message: 'User ID is required'
        });
    }

    // Validate cardIndex is a number
    const parsedCardIndex = parseInt(cardIndex);
    if (isNaN(parsedCardIndex) || parsedCardIndex < 0) {
        return res.status(400).send({ 
            success: false,
            message: 'Valid card index is required'
        });
    }

    try {
        // Get user's cards
        const cardRef = db.collection('cards').doc(userId);
        const cardDoc = await cardRef.get();

        if (!cardDoc.exists) {
            return res.status(404).send({ 
                success: false,
                message: 'User cards not found' 
            });
        }

        const cardsData = cardDoc.data();
        if (!cardsData.cards || !Array.isArray(cardsData.cards)) {
            return res.status(404).send({ 
                success: false,
                message: 'No cards found for user' 
            });
        }

        // Check if cardIndex is valid
        if (parsedCardIndex >= cardsData.cards.length) {
            return res.status(404).send({ 
                success: false,
                message: 'Card index out of range' 
            });
        }

        // Update the cards array
        const updatedCards = [...cardsData.cards];
        
        // Initialize scans field if it doesn't exist, then increment
        if (!updatedCards[parsedCardIndex].scans) {
            updatedCards[parsedCardIndex].scans = 0;
        }
        updatedCards[parsedCardIndex].scans += 1;

        // Save back to database
        await cardRef.update({
            cards: updatedCards
        });

        console.log(`Scan tracked for user ${userId}, card ${parsedCardIndex}. New count: ${updatedCards[parsedCardIndex].scans}`);

        res.status(200).send({ 
            success: true,
            message: 'Scan tracked successfully',
            cardIndex: parsedCardIndex,
            newScanCount: updatedCards[parsedCardIndex].scans,
            scanType: scanType
        });

    } catch (error) {
        console.error('Error tracking scan:', error);
        res.status(500).send({ 
            success: false,
            message: 'Failed to track scan',
            error: error.message 
        });
    }
});

// Data migration endpoint - run once to initialize scans field for existing cards
app.post('/migrate-scans', async (req, res) => {
    try {
        console.log('Starting scans migration for existing cards...');
        
        const cardsRef = db.collection('cards');
        const snapshot = await cardsRef.get();
        
        if (snapshot.empty) {
            return res.status(200).send({
                success: true,
                message: 'No cards found to migrate'
            });
        }

        let migratedUsers = 0;
        let migratedCards = 0;
        const batch = db.batch();

        snapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.cards && Array.isArray(userData.cards)) {
                let needsUpdate = false;
                const updatedCards = userData.cards.map(card => {
                    if (card.scans === undefined || card.scans === null) {
                        needsUpdate = true;
                        migratedCards++;
                        return {
                            ...card,
                            scans: 0
                        };
                    }
                    return card;
                });

                if (needsUpdate) {
                    batch.update(doc.ref, { cards: updatedCards });
                    migratedUsers++;
                }
            }
        });

        // Commit all updates
        await batch.commit();

        console.log(`Migration completed: ${migratedUsers} users, ${migratedCards} cards updated`);

        res.status(200).send({
            success: true,
            message: 'Migration completed successfully',
            stats: {
                usersUpdated: migratedUsers,
                cardsUpdated: migratedCards,
                totalUsersScanned: snapshot.size
            }
        });

    } catch (error) {
        console.error('Error during migration:', error);
        res.status(500).send({
            success: false,
            message: 'Migration failed',
            error: error.message
        });
    }
});

// Test endpoint to verify scan tracking (development only)
app.get('/test-scan-tracking/:userId/:cardIndex?', async (req, res) => {
    const { userId } = req.params;
    const cardIndex = parseInt(req.params.cardIndex) || 0;
    
    try {
        // Get current card data
        const cardRef = db.collection('cards').doc(userId);
        const doc = await cardRef.get();
        
        if (!doc.exists) {
            return res.status(404).send({ message: 'User not found' });
        }
        
        const cardsData = doc.data();
        if (!cardsData.cards || cardIndex >= cardsData.cards.length) {
            return res.status(404).send({ message: 'Card not found' });
        }
        
        const card = cardsData.cards[cardIndex];
        const totalScans = cardsData.cards.reduce((sum, c) => sum + (c.scans || 0), 0);
        
        res.status(200).send({
            success: true,
            userId: userId,
            cardIndex: cardIndex,
            currentScans: card.scans || 0,
            totalScans: totalScans,
            cardInfo: {
                name: `${card.name} ${card.surname}`,
                company: card.company
            }
        });
        
    } catch (error) {
        console.error('Error in test endpoint:', error);
        res.status(500).send({ 
            success: false, 
            error: error.message 
        });
    }
});

// Protected routes - after public routes
app.use('/', userRoutes);
app.use('/', cardRoutes);
app.use('/', contactRoutes);
app.use('/', meetingRoutes);
app.use('/', paymentRoutes);

// Modify the user creation route to handle file upload
app.post('/api/users', handleSingleUpload('profileImage'), (req, res, next) => {
  if (req.file && req.file.firebaseUrl) {
    req.body.profileImage = req.file.firebaseUrl;
  }
  next();
});

// Example usage in a route:
app.post('/send-email', async (req, res) => {
  try {
    console.log('Received email request:', req.body);
    
    if (!req.body.to || !req.body.subject) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields (to, subject)',
      });
    }

    const mailOptions = {
      to: req.body.to,
      subject: req.body.subject,
      text: req.body.text || '',
      html: req.body.html || ''
    };

    const result = await sendMailWithStatus(mailOptions);
    console.log('Email send attempt completed:', result);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Email sent successfully',
        details: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        details: result
      });
    }
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({
      success: false,
      message: 'Email sending failed',
      error: {
        message: error.message,
        code: error.code,
        command: error.command
      }
    });
  }
});

// Cleanup expired blacklisted tokens every 24 hours
setInterval(async () => {
    try {
        const blacklistRef = db.collection('tokenBlacklist');
        const now = new Date();
        const snapshot = await blacklistRef
            .where('expiresAt', '<=', now)
            .get();

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    } catch (error) {
        console.error('Error cleaning up token blacklist:', error);
    }
}, 10 * 60 * 1000);

// Check for expired trials every minute
const checkExpiredTrials = async () => {
    try {
        const now = new Date();
        console.log(`Checking for expired trials: ${now.toISOString()}`);
        
        // Get all trial users first, then filter in memory
        // This avoids the need for a composite index
        const trialUsersSnapshot = await db.collection('users')
            .where('subscriptionStatus', '==', 'trial')
            .get();
        
        if (trialUsersSnapshot.empty) {
            console.log('No trial users found');
            return;
        }
        
        // Filter expired trials in memory
        const expiredTrials = trialUsersSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.trialEndDate && data.trialEndDate <= now.toISOString();
        });
        
        if (expiredTrials.length === 0) {
            console.log('No expired trials found');
            return;
        }
        
        console.log(`Found ${expiredTrials.length} expired trials to process`);
        
        for (const doc of expiredTrials) {
            const userId = doc.id;
            const userData = doc.data();
            
            // Verify subscription is still valid with Paystack before converting
            let isSubscriptionValid = true;
            if (userData.subscriptionCode) {
                try {
                    // Check subscription status with Paystack
                    const subscriptionStatus = await verifySubscriptionStatus(userData.subscriptionCode);
                    isSubscriptionValid = subscriptionStatus === 'active';
                    
                    if (!isSubscriptionValid) {
                        console.log(`Subscription ${userData.subscriptionCode} is no longer valid for user ${userId}`);
                    }
                } catch (error) {
                    console.error(`Error verifying subscription for ${userId}:`, error);
                    // Continue with conversion, we'll handle errors separately
                }
            }
            
            if (isSubscriptionValid) {
                console.log(`Converting trial to active subscription for user: ${userId}`);
                
                // Update user status from trial to active
                await doc.ref.update({
                    subscriptionStatus: 'active',
                    lastUpdated: new Date().toISOString(),
                    trialEndDate: new Date().toISOString(),
                    firstBillingDate: new Date().toISOString()
                });
                
                // Also update the subscription document
                await db.collection('subscriptions').doc(userId).update({
                    status: 'active',
                    trialEndDate: new Date().toISOString(),
                    firstBillingDate: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                });
                
                console.log(`User ${userId} subscription updated from trial to active`);
            } else {
                // User cancelled during trial
                console.log(`Marking cancelled trial for user: ${userId}`);
                
                // Update user status to reflect cancellation and change plan to free
                await doc.ref.update({
                    subscriptionStatus: 'cancelled',
                    plan: 'free', // Change plan back to free when subscription is cancelled
                    lastUpdated: new Date().toISOString(),
                    trialEndDate: new Date().toISOString(),
                    cancellationDate: new Date().toISOString()
                });
                
                // Also update the subscription document
                await db.collection('subscriptions').doc(userId).update({
                    status: 'cancelled',
                    trialEndDate: new Date().toISOString(),
                    cancellationDate: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                });
                
                console.log(`User ${userId} trial marked as cancelled and plan changed to free`);
            }
        }
    } catch (error) {
        console.error('Error checking expired trials:', error);
    }
};

/**
 * Verify subscription status with Paystack
 */
const verifySubscriptionStatus = async (subscriptionCode) => {
    const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: `/subscription/${subscriptionCode}`,
        method: 'GET',
        headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.status && response.data) {
                        resolve(response.data.status);
                    } else {
                        reject(new Error('Invalid response from Paystack'));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
};

// Run the check every minute
setInterval(checkExpiredTrials, 60 * 1000);

// Error handler
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
