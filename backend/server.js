// const express = require('express');
// const { FieldValue } = require('firebase-admin/firestore');
// const QRCode = require('qrcode');
// const app = express();
// const port = 8383;
// const { db } = require('./firebase.js');

// app.use(express.json());

// app.get('/User', async (req, res) => {
//     try {
//         const usersRef = db.collection('clients').doc('app-users');
//         const doc = await usersRef.get();
//         if (!doc.exists) {
//             return res.status(404).send({ message: 'No users found' });
//         }
//         res.status(200).send(doc.data());
//     } catch (error) {
//         res.status(500).send({ message: 'Internal Server Error', error });
//     }
// });

// app.get('/User/:name', async (req, res) => {
//     const { name } = req.params;
//     try {
//         const usersRef = db.collection('clients').doc('app-users');
//         const doc = await usersRef.get();
//         if (!doc.exists || !doc.data()[name]) {
//             return res.status(404).send({ message: 'User not found' });
//         }
//         res.status(200).send({ [name]: doc.data()[name] });
//     } catch (error) {
//         res.status(500).send({ message: 'Internal Server Error', error });
//     }
// });

// app.post('/User', async (req, res) => {
//     const { name, status } = req.body;
//     if (!name || !status) {
//         return res.status(400).send({ message: 'Name and status are required' });
//     }
//     try {
//         const usersRef = db.collection('clients').doc('app-users');
//         await usersRef.set({ [name]: status }, { merge: true });
//         res.status(201).send({ message: 'User added successfully' });
//     } catch (error) {
//         res.status(500).send({ message: 'Internal Server Error', error });
//     }
// });

// app.patch('/User/:name', async (req, res) => {
//     const { name } = req.params;
//     const { newStatus } = req.body;
//     if (!newStatus) {
//         return res.status(400).send({ message: 'New status is required' });
//     }
//     try {
//         const usersRef = db.collection('clients').doc('app-users');
//         await usersRef.set({ [name]: newStatus }, { merge: true });
//         res.status(200).send({ message: 'User status updated successfully' });
//     } catch (error) {
//         res.status(500).send({ message: 'Internal Server Error', error });
//     }
// });

// app.delete('/User/:name', async (req, res) => {
//     const { name } = req.params;
//     try {
//         const usersRef = db.collection('clients').doc('app-users');
//         await usersRef.update({ [name]: FieldValue.delete() });
//         res.status(200).send({ message: 'User deleted successfully' });
//     } catch (error) {
//         res.status(500).send({ message: 'Internal Server Error', error });
//     }
// });

// // QR code generation endpoint
// app.post('/generateQR', async (req, res) => {
//     const { name, status } = req.body;
//     if (!name || !status) {
//         return res.status(400).send({ message: 'Name and status are required to generate QR code' });
//     }
//     try {
//         const qrData = JSON.stringify({ name, status });
//         const qrCodeBuffer = await QRCode.toBuffer(qrData);
//         res.setHeader('Content-Type', 'image/png');
//         res.status(200).send(qrCodeBuffer);
//     } catch (error) {
//         res.status(500).send({ message: 'Internal Server Error', error });
//     }
// });

// app.listen(port, () => console.log(`Server has started on port: ${port}`));

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// const express = require('express');
// const { FieldValue } = require('firebase-admin/firestore');
// const QRCode = require('qrcode');
// const app = express();
// const port = 8383;
// const { db } = require('./firebase.js');

// app.use(express.json());

// app.get('/User', async (req, res) => {
//     try {
//         const usersRef = db.collection('clients').doc('app-users');
//         const doc = await usersRef.get();
//         if (!doc.exists) {
//             return res.status(404).send({ message: 'No users found' });
//         }
//         res.status(200).send(doc.data());
//     } catch (error) {
//         res.status(500).send({ message: 'Internal Server Error', error });
//     }
// });

// app.get('/User/:name', async (req, res) => {
//     const { name } = req.params;
//     try {
//         const usersRef = db.collection('clients').doc('app-users');
//         const doc = await usersRef.get();
//         if (!doc.exists || !doc.data()[name]) {
//             return res.status(404).send({ message: 'User not found' });
//         }
//         res.status(200).send({ [name]: doc.data()[name] });
//     } catch (error) {
//         res.status(500).send({ message: 'Internal Server Error', error });
//     }
// });

// app.post('/User', async (req, res) => {
//     const { name, status } = req.body;
//     if (!name || !status) {
//         return res.status(400).send({ message: 'Name and status are required' });
//     }
//     try {
//         const usersRef = db.collection('clients').doc('app-users');
//         await usersRef.set({ [name]: status }, { merge: true });
//         res.status(201).send({ message: 'User added successfully' });
//     } catch (error) {
//         res.status(500).send({ message: 'Internal Server Error', error });
//     }
// });

// app.patch('/User/:name', async (req, res) => {
//     const { name } = req.params;
//     const { newStatus } = req.body;
//     if (!newStatus) {
//         return res.status(400).send({ message: 'New status is required' });
//     }
//     try {
//         const usersRef = db.collection('clients').doc('app-users');
//         await usersRef.set({ [name]: newStatus }, { merge: true });
//         res.status(200).send({ message: 'User status updated successfully' });
//     } catch (error) {
//         res.status(500).send({ message: 'Internal Server Error', error });
//     }
// });

// app.delete('/User/:name', async (req, res) => {
//     const { name } = req.params;
//     try {
//         const usersRef = db.collection('clients').doc('app-users');
//         await usersRef.update({ [name]: FieldValue.delete() });
//         res.status(200).send({ message: 'User deleted successfully' });
//     } catch (error) {
//         res.status(500).send({ message: 'Internal Server Error', error });
//     }
// });

// // QR code generation endpoint
// app.post('/generateQR', async (req, res) => {
//     const { name, status } = req.body;
//     if (!name || !status) {
//         return res.status(400).send({ message: 'Name and status are required to generate QR code' });
//     }
//     try {
//         const qrData = JSON.stringify({ name, status });
//         const qrCodeBuffer = await QRCode.toBuffer(qrData);
//         res.setHeader('Content-Type', 'image/png');
//         res.status(200).send(qrCodeBuffer);
//     } catch (error) {
//         res.status(500).send({ message: 'Internal Server Error', error });
//     }
// });

// app.listen(port, () => console.log(`Server has started on port: ${port}`));


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const express = require('express');
const app = express();
const port = 8383;
const userRoutes = require('./routes/userRoutes');
const cardRoutes = require('./routes/cardRoutes');

app.use(express.json());
app.use('/api', userRoutes);
app.use('/api', cardRoutes);

app.listen(port, () => console.log(`Server has started on port: ${port}`));