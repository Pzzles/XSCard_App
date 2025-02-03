const { db } = require('../firebase.js');

exports.getAllUsers = async (req, res) => {
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
};

exports.getUserById = async (req, res) => {
    const { id } = req.params;
    try {
        const userRef = db.collection('users').doc(id);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            return res.status(404).send({ message: 'User is not found' });
        }

        const userData = {
            id: userDoc.id,
            ...userDoc.data()
        };
        
        res.status(200).send(userData);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).send({ 
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
};

exports.addUser = async (req, res) => {
    const { name, surname, email, password, occupation, company, status, phone } = req.body;
    
    const requiredFields = ['name', 'surname', 'email', 'password', 'occupation', 'company', 'status', 'phone'];
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
            phone,
            profileImage: req.file ? `/profiles/${req.file.filename}` : null,
            createdAt: new Date().toISOString()
        };

        const docRef = await db.collection('users').add(userData);
        
        res.status(201).send({ 
            message: 'User added successfully',
            userId: docRef.id,
            userData
        });
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).send({ message: 'Internal Server Error', error: error.message });
    }
};

exports.updateUserStatus = async (req, res) => {
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

exports.deleteUser = async (req, res) => {
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
};

exports.signIn = async (req, res) => {
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
};

exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
        const userRef = db.collection('users').doc(id);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).send({ message: 'User not found' });
        }

        await userRef.update(updateData);
        
        // Fetch updated user data
        const updatedDoc = await userRef.get();
        const userData = {
            id: updatedDoc.id,
            ...updatedDoc.data()
        };

        res.status(200).send({
            message: 'User updated successfully',
            user: userData
        });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).send({
            message: 'Failed to update user',
            error: error.message
        });
    }
};
