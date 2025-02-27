process.removeAllListeners('warning');

require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { db, admin } = require('./firebase.js');
const { sendMailWithStatus } = require('./public/Utils/emailService');
const app = express();
const port = 8383;

// Import routes
const userRoutes = require('./routes/userRoutes');
const cardRoutes = require('./routes/cardRoutes');
const contactRoutes = require('./routes/contactRoutes');
const meetingRoutes = require('./routes/meetingRoutes');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const profilesDir = path.join(__dirname, 'public', 'profiles');
    
    // Create profiles directory if it doesn't exist
    if (!fs.existsSync(profilesDir)) {
      fs.mkdirSync(profilesDir, { recursive: true });
    }
    
    cb(null, profilesDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Public routes - must be before authentication middleware
app.use(express.static(path.join(__dirname, 'public')));

app.get('/saveContact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'saveContact.html'));
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
                from: process.env.EMAIL_USER_XSPARK,
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

        const cardRef = db.collection('cards').doc(userId);
        const doc = await cardRef.get();
        
        if (!doc.exists) {
            return res.status(404).send({ message: 'User not found' });
        }

        const userData = doc.data();
        if (!userData.cards || !userData.cards[cardIndex]) {
            return res.status(404).send({ message: 'Card not found' });
        }

        // Return the specific card with user ID included
        const card = {
            id: userId,
            ...userData.cards[cardIndex]
        };

        res.status(200).send(card);
    } catch (error) {
        console.error('Error fetching public card:', error);
        res.status(500).send({ 
            message: 'Error fetching card', 
            error: error.message 
        });
    }
});

// Protected routes - after public routes
app.use('/', userRoutes);
app.use('/', cardRoutes);
app.use('/', contactRoutes);
app.use('/', meetingRoutes);

// Modify the user creation route to handle file upload
app.post('/api/users', upload.single('profileImage'), (req, res, next) => {
  if (req.file) {
    req.body.profileImage = `/profiles/${req.file.filename}`;
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
