const { FieldValue } = require('firebase-admin/firestore');
const QRCode = require('qrcode');
const { db } = require('../firebase.js');

const getUsers = async (req, res) => {
    try {
        const usersRef = db.collection('clients').doc('app-users');
        const doc = await usersRef.get();
        if (!doc.exists) {
            return res.status(404).send({ message: 'No users found' });
        }
        res.status(200).send(doc.data());
    } catch (error) {
        res.status(500).send({ message: 'Internal Server Error', error });
    }
};

const getUser = async (req, res) => {
    const { name } = req.params;
    try {
        const usersRef = db.collection('clients').doc('app-users');
        const doc = await usersRef.get();
        if (!doc.exists || !doc.data()[name]) {
            return res.status(404).send({ message: 'User not found' });
        }
        res.status(200).send({ [name]: doc.data()[name] });
    } catch (error) {
        res.status(500).send({ message: 'Internal Server Error', error });
    }
};

const addUser = async (req, res) => {
    const { name, status } = req.body;
    if (!name || !status) {
        return res.status(400).send({ message: 'Name and status are required' });
    }
    try {
        const usersRef = db.collection('clients').doc('app-users');
        await usersRef.set({ [name]: status }, { merge: true });
        res.status(201).send({ message: 'User added successfully' });
    } catch (error) {
        res.status(500).send({ message: 'Internal Server Error', error });
    }
};

const updateUser = async (req, res) => {
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
};

const deleteUser = async (req, res) => {
    const { name } = req.params;
    try {
        const usersRef = db.collection('clients').doc('app-users');
        await usersRef.update({ [name]: FieldValue.delete() });
        res.status(200).send({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).send({ message: 'Internal Server Error', error });
    }
};

module.exports = {
    getUsers,
    getUser,
    addUser,
    updateUser,
    deleteUser
};