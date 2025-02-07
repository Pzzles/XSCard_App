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

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'tshehlap@gmail.com',
    pass: 'gyjx fwfn ybha miud'//process.env.EMAIL_PASSWORD // Make sure to set this in your environment variables
  }
});

// Export transporter for use in other files
exports.transporter = transporter;

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