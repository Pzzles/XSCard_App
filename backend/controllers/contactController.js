const { db, admin } = require('../firebase.js');
const { transporter, sendMailWithStatus } = require('../public/Utils/emailService');
const { formatDate } = require('../utils/dateFormatter');

// Add constant for free plan limit
const FREE_PLAN_CONTACT_LIMIT = 3;

exports.getAllContacts = async (req, res) => {
    try {
        console.log('Fetching all contacts...');
        const contactsRef = db.collection('contacts');
        const snapshot = await contactsRef.get();
        
        if (snapshot.empty) {
            console.log('No contacts found in collection');
            return res.status(404).send({ message: 'No contacts found' });
        }

        const contacts = [];
        snapshot.forEach(doc => {
            contacts.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`Found ${contacts.length} contacts`);
        res.status(200).send(contacts);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).send({ 
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
};

exports.getContactById = async (req, res) => {
    const { id } = req.params;
    try {
        const contactRef = db.collection('contacts').doc(id);
        const doc = await contactRef.get();
        
        if (!doc.exists) {
            return res.status(404).send({ message: 'Contact list not found' });
        }

        // Send raw data for debugging
        const data = doc.data();
        console.log('Raw contact data:', data); // Debug log

        if (data.contactList) {
            data.contactList = data.contactList.map(contact => ({
                ...contact,
                createdAt: formatDate(contact.createdAt) // Format for display
            }));
        }

        // Send the data without modification
        res.status(200).send({
            id: doc.id,
            ...data
        });
    } catch (error) {
        console.error('Error fetching contact:', error);
        res.status(500).send({ message: 'Error fetching contact', error: error.message });
    }
};

exports.addContact = async (req, res) => {
    const { userId, contactInfo } = req.body;
    
    if (!userId || !contactInfo) {
        return res.status(400).send({ 
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
            createdAt: admin.firestore.Timestamp.now()
        };

        currentContacts.push(newContact);

        await contactRef.set({
            userId: db.doc(`users/${userId}`),
            contactList: currentContacts
        }, { merge: true });
        
        res.status(201).send({ 
            message: 'Contact added successfully',
            contactList: currentContacts.map(contact => ({
                ...contact,
                createdAt: formatDate(contact.createdAt)
            })),
            remainingContacts: userData.plan === 'free' ? 
                FREE_PLAN_CONTACT_LIMIT - currentContacts.length : 
                'unlimited'
        });
    } catch (error) {
        console.error('Error adding contact:', error);
        res.status(500).send({ 
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
};

exports.saveContactInfo = async (req, res) => {
    const { userId, contactInfo } = req.body;
    
    if (!userId || !contactInfo) {
        return res.status(400).send({ message: 'User ID and contact info are required' });
    }

    try {
        // Get user's plan information
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        if (!userData) {
            return res.status(404).send({ message: 'User not found' });
        }

        // Get current contacts count
        const contactsRef = db.collection('contacts').doc(userId);
        const contactsDoc = await contactsRef.get();
        let existingContacts = contactsDoc.exists ? contactsDoc.data().contactsList : [];
        if (!Array.isArray(existingContacts)) existingContacts = [];

        // Check if free user has reached contact limit
        if (userData.plan === 'free' && existingContacts.length >= FREE_PLAN_CONTACT_LIMIT) {
            console.log(`Contact limit reached for free user ${userId}. Current contacts: ${existingContacts.length}`);
            return res.status(403).send({
                message: 'Contact limit reached',
                error: 'FREE_PLAN_LIMIT_REACHED',
                currentContacts: existingContacts.length,
                limit: FREE_PLAN_CONTACT_LIMIT
            });
        }

        // Add new contact with Firestore Timestamp
        existingContacts.push({
            name: contactInfo.name,
            surname: contactInfo.surname,
            number: contactInfo.phone,
            howWeMet: contactInfo.howWeMet,
            createdAt: admin.firestore.Timestamp.now()
        });

        await contactsRef.set({
            userId: db.doc(`users/${userId}`),
            contactsList: existingContacts
        }, { merge: true });

        // Send email notification if user has email
        if (userData.email) {
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
                    ${userData.plan === 'free' ? 
                        `<p style="color: #ff4b6e;">You have ${FREE_PLAN_CONTACT_LIMIT - existingContacts.length} contacts remaining in your free plan.</p>` 
                        : ''}
                `
            };

            const mailResult = await sendMailWithStatus(mailOptions);
            if (!mailResult.success) {
                console.error('Failed to send email notification:', mailResult.error);
            }
        }

        res.status(200).send({ 
            message: 'Contact saved successfully',
            contactsCount: existingContacts.length,
            remainingContacts: userData.plan === 'free' ? 
                FREE_PLAN_CONTACT_LIMIT - existingContacts.length : 
                'unlimited'
        });
    } catch (error) {
        console.error('Error saving contact:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving contact information',
            error: error.message
        });
    }
};

exports.updateContact = async (req, res) => {
    const { id } = req.params;
    const { contactInfo } = req.body;
    
    if (!contactInfo) {
        return res.status(400).send({ message: 'Contact info is required' });
    }

    try {
        const contactRef = db.collection('contacts').doc(id);
        const doc = await contactRef.get();

        if (!doc.exists) {
            return res.status(404).send({ message: 'Contact list not found' });
        }

        const currentContacts = doc.data().contactsList || [];
        currentContacts.push({
            ...contactInfo,
            createdAt: new Date().toISOString()
        });

        await contactRef.update({
            contactsList: currentContacts
        });

        res.status(200).send({ 
            message: 'Contact list updated successfully',
            updatedContacts: currentContacts
        });
    } catch (error) {
        console.error('Error updating contacts:', error);
        res.status(500).send({ 
            message: 'Internal Server Error', 
            error: error.message 
        });
    }
};

exports.deleteContact = async (req, res) => {
    const { id } = req.params;
    
    try {
        const contactRef = db.collection('contacts').doc(id);
        const doc = await contactRef.get();
        
        if (!doc.exists) {
            return res.status(404).send({ message: 'Contact list not found' });
        }

        await contactRef.delete();
        res.status(200).send({ 
            message: 'Contact list deleted successfully',
            deletedContactId: id
        });
    } catch (error) {
        console.error('Delete contact error:', error);
        res.status(500).send({ 
            message: 'Failed to delete contact list',
            error: error.message 
        });
    }
};

exports.deleteContactFromList = async (req, res) => {
    const { id, index } = req.params;
    const contactIndex = parseInt(index);
    
    console.log('Delete request received:', { id, index, contactIndex }); // Debug log

    try {
        const contactRef = db.collection('contacts').doc(id);
        const doc = await contactRef.get();
        
        if (!doc.exists) {
            console.log('Document not found:', id);
            return res.status(404).send({ message: 'Contact list not found' });
        }

        const data = doc.data();
        // Check if contactList exists (not contactsList)
        const currentContacts = data.contactList || [];
        
        console.log('Current contacts:', { 
            total: currentContacts.length, 
            requestedIndex: contactIndex,
            contacts: currentContacts
        });

        if (contactIndex < 0 || contactIndex >= currentContacts.length) {
            console.log('Index out of range:', { contactIndex, length: currentContacts.length });
            return res.status(400).send({ message: 'Contact index out of range' });
        }

        currentContacts.splice(contactIndex, 1);

        await contactRef.update({
            contactList: currentContacts // Note: using contactList, not contactsList
        });

        console.log('Contact deleted successfully');
        res.status(200).send({ 
            message: 'Contact deleted successfully',
            remainingContacts: currentContacts.length
        });
    } catch (error) {
        console.error('Delete contact error:', error);
        res.status(500).send({ 
            message: 'Failed to delete contact',
            error: error.message 
        });
    }
};
