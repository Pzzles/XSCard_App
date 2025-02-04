const { db } = require('../firebase.js');
const axios = require('axios');
const config = require('../config/config');

const PASSCREATOR_API_KEY = 'bsZ6=JCt!b-Y-k%S%eY2NUAcLo4eZSwkEs9xTsA2!-4N1GNltyH.!aXjCe/_WBAbu.s_Qws&hDek8dyL';
const PASSCREATOR_BASE_URL = 'https://app.passcreator.com';
const TEMPLATE_ID = '2e06f305-b6b6-46c1-a300-4ebbe49862c3';

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
            profileImage: req.files?.profileImage ? `/profiles/${req.files.profileImage[0].filename}` : null,
            companyLogo: req.files?.companyLogo ? `/profiles/${req.files.companyLogo[0].filename}` : null,
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
    try {
        let updateData = {};

        // Handle file upload if present
        if (req.file) {
            updateData.profileImage = `/profiles/${req.file.filename}`;
        } 
        // Handle JSON data if present
        else if (Object.keys(req.body).length > 0) {
            updateData = req.body;
        }

        // Check if there's any data to update
        if (Object.keys(updateData).length === 0) {
            return res.status(400).send({ 
                message: 'No update data provided'
            });
        }

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

exports.updateProfileImage = async (req, res) => {
    const { id } = req.params;
    
    try {
      if (!req.file) {
        return res.status(400).send({ message: 'No image file provided' });
      }
  
      const userRef = db.collection('users').doc(id);
      const doc = await userRef.get();
  
      if (!doc.exists) {
        return res.status(404).send({ message: 'User not found' });
      }
  
      const profileImage = `/profiles/${req.file.filename}`;
      await userRef.update({ profileImage });
  
      // Get updated user data
      const updatedDoc = await userRef.get();
      const userData = {
        id: updatedDoc.id,
        ...updatedDoc.data()
      };
  
      res.status(200).send(userData);
    } catch (error) {
      console.error('Error updating profile image:', error);
      res.status(500).send({
        message: 'Failed to update profile image',
        error: error.message
      });
    }
  };

exports.updateUserColor = async (req, res) => {
    const { id } = req.params;
    const { color } = req.body;
    
    if (!color) {
        return res.status(400).send({ message: 'Color is required' });
    }

    try {
        const userRef = db.collection('users').doc(id);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).send({ message: 'User not found' });
        }

        await userRef.update({
            colorScheme: color
        });

        const updatedDoc = await userRef.get();
        const userData = {
            id: updatedDoc.id,
            ...updatedDoc.data()
        };

        res.status(200).send({ 
            message: 'User color updated successfully',
            user: userData
        });
    } catch (error) {
        console.error('Error updating user color:', error);
        res.status(500).send({ 
            message: 'Failed to update user color',
            error: error.message 
        });
    }
};

exports.addToWallet = async (req, res) => {
    const { id } = req.params;

    try {
        const userRef = db.collection('users').doc(id);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).send({ message: 'User not found' });
        }

        const userData = userDoc.data();
        
        // Create full URLs for images using PASSCREATOR_PUBLIC_URL
        const thumbnailUrl = userData.profileImage ? `${config.PASSCREATOR_PUBLIC_URL}${userData.profileImage}` : null;
        const logoUrl = userData.companyLogo ? `${config.PASSCREATOR_PUBLIC_URL}${userData.companyLogo}` : null;

        const passData = {
            name: `${userData.name} ${userData.surname}`,
            company: userData.company,
            jobTitle: userData.occupation,
            urlToThumbnail: thumbnailUrl,
            urlToLogo: logoUrl,
            barcodeValue: `${config.PASSCREATOR_PUBLIC_URL}/saveContact.html?userId=${id}`
        };

        // Call Passcreator API
        const response = await axios.post(`${PASSCREATOR_BASE_URL}/api/pass?passtemplate=${TEMPLATE_ID}&zapierStyle=true`, passData, {
            headers: {
                'Authorization': PASSCREATOR_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        // Send back all relevant URLs
        res.status(200).send({
            message: 'Wallet pass created successfully',
            passUri: response.data.uri,
            passFileUrl: response.data.linkToPassFile,
            passPageUrl: response.data.linkToPassPage,
            identifier: response.data.identifier
        });

    } catch (error) {
        console.error('Error creating wallet pass:', error);
        res.status(500).send({
            message: 'Failed to create wallet pass',
            error: error.message
        });
    }
};
