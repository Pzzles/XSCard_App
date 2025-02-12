// Silence the punycode deprecation warning
process.removeAllListeners('warning');

require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const nodemailer = require('nodemailer');
const app = express();
const port = 8383;

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST_XSPARK,
  port: parseInt(process.env.EMAIL_SMTP_PORT_XSPARK),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER_XSPARK,
    pass: process.env.EMAIL_PASSWORD_XSPARK
  },
  debug: true, // Show debug output
  logger: true // Log information into console
});

// Test connection on startup
const testConnection = async () => {
  try {
    console.log('Testing email configuration...');
    console.log('Host:', process.env.EMAIL_HOST_XSPARK);
    console.log('Port:', process.env.EMAIL_SMTP_PORT_XSPARK);
    console.log('Using sender: xscard@xspark.co.za');
    
    const verify = await transporter.verify();
    console.log('SMTP Connection Test:', verify ? 'SUCCESS' : 'FAILED');
  } catch (error) {
    console.error('Email Configuration Error:');
    console.error('Name:', error.name);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    if (error.code) console.error('Error Code:', error.code);
    if (error.command) console.error('Failed Command:', error.command);
  }
};

// Call test connection on startup
testConnection();

// Verify email configuration on startup
transporter.verify(function(error, success) {
  if (error) {
    console.error('Email server connection error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Add event listeners for email status
transporter.on('token', info => {
  console.log('New OAuth2 access token generated:', info);
});

transporter.on('error', err => {
  console.error('Email transport error:', err);
});

// Enhance the transporter.sendMail with status tracking
const sendMailWithStatus = async (mailOptions) => {
  try {
    // Force the from address to always be XS Card
    mailOptions.from = {
      name: 'XS Card',
      address: 'xscard@xspark.co.za' // Hardcode this to ensure consistency
    };

    console.log('\n=== Starting Email Send Attempt ===');
    console.log('From:', mailOptions.from);
    console.log('To:', mailOptions.to);
    console.log('Subject:', mailOptions.subject);

    const trackingId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    mailOptions.messageId = trackingId;

    console.log(`[${trackingId}] Initiating email send...`);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('\n=== Email Send Result ===');
    console.log('Full Response:', JSON.stringify(info, null, 2));
    
    // Log detailed delivery information
    console.log(`[${trackingId}] ✓ Email Status:`);
    console.log(`  → Accepted by server: ${info.accepted.join(', ') || 'none'}`);
    console.log(`  → Rejected addresses: ${info.rejected.join(', ') || 'none'}`);
    console.log(`  → Response: ${info.response}`);
    console.log(`  → Message ID: ${info.messageId}`);

    // Monitor delivery status if available
    if (info.envelope) {
      console.log(`  → Envelope from: ${info.envelope.from}`);
      console.log(`  → Envelope to: ${info.envelope.to.join(', ')}`);
    }

    return {
      success: true,
      trackingId: trackingId,
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('\n=== Email Send Error ===');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    console.error('Error Command:', error.command);
    console.error('Stack Trace:', error.stack);

    const errorId = `error_${Date.now()}`;
    console.error(`[${errorId}] ✗ Email Delivery Failed:`);
    console.error(`  → Error Code: ${error.code || 'N/A'}`);
    console.error(`  → Error Message: ${error.message}`);
    console.error(`  → Recipients: ${mailOptions.to}`);
    console.error(`  → Subject: ${mailOptions.subject}`);

    return {
      success: false,
      errorId: errorId,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
      recipients: mailOptions.to
    };
  }
};

// Export both the transporter and the enhanced sendMail function
exports.transporter = transporter;
exports.sendMailWithStatus = sendMailWithStatus;

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
