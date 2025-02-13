// Silence the punycode deprecation warning
process.removeAllListeners('warning');

require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { sendMailWithStatus } = require('./public/Utils/emailService');
const app = express();
const port = 8383;

// Import routes
const userRoutes = require('./routes/userRoutes');
const cardRoutes = require('./routes/cardRoutes');
const contactRoutes = require('./routes/contactRoutes');

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

// Use routes
app.use('/', userRoutes);
app.use('/', cardRoutes);
app.use('/', contactRoutes);

// Modify the user creation route to handle file upload
app.post('/api/users', upload.single('profileImage'), (req, res, next) => {
  if (req.file) {
    req.body.profileImage = `/profiles/${req.file.filename}`;
  }
  next();
});

// Handle saveContact page route
app.get('/saveContact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'saveContact.html'));
});

// Handle howWeMet field
app.post('/saveContact', (req, res) => {
    const { howWeMet } = req.body;
    // Process the howWeMet field as needed
    res.send({ message: 'Contact saved successfully', howWeMet });
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
