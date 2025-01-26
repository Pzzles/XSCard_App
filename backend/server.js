// Silence the punycode deprecation warning
process.removeAllListeners('warning');

const express = require('express');
const path = require('path');
const app = express();
const port = 8383;

// Import routes
const userRoutes = require('./routes/userRoutes');
const cardRoutes = require('./routes/cardRoutes');
const contactRoutes = require('./routes/contactRoutes');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Use routes
app.use('/', userRoutes);
app.use('/', cardRoutes);
app.use('/', contactRoutes);

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