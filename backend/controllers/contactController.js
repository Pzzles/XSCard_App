const { db } = require('../firebase.js');
const { transporter } = require('../server.js');

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
        
        res.status(200).send({
            id: doc.id,
            ...doc.data()
        });
    } catch (error) {
        console.error('Error fetching contact:', error);
        res.status(500).send({ 
            message: 'Internal Server Error', 
            error: error.message 
        });
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
        const contactData = {
            userId: db.doc(`users/${userId}`),
            contactsList: [{
                ...contactInfo,
                createdAt: new Date().toISOString()
            }]
        };

        const docRef = await db.collection('contacts').add(contactData);
        
        res.status(201).send({ 
            message: 'Contact list created successfully',
            contactId: docRef.id,
            contactData
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
        // Save contact to database
        const contactsRef = db.collection('contacts').doc(userId);
        const contactsDoc = await contactsRef.get();

        let existingContacts = contactsDoc.exists ? contactsDoc.data().contactsList : [];
        if (!Array.isArray(existingContacts)) existingContacts = [];

        existingContacts.push({
            name: contactInfo.name,
            surname: contactInfo.surname,
            number: contactInfo.phone,
            howWeMet: contactInfo.howWeMet,
            createdAt: new Date().toISOString()
        });

        await contactsRef.set({
            userId: db.doc(`users/${userId}`),
            contactsList: existingContacts
        }, { merge: true });

        // Send email notification with form data
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        if (userData && userData.email) {
            const mailOptions = {
                from: 'tshehlap@gmail.com',
                to: userData.email,
                subject: 'Someone Saved Your Contact Information',
                html: `
                    <h2>New Contact Added</h2>
                    <p> <strong>${contactInfo.name} ${contactInfo.surname}</strong> recently received your XS Card and has sent you their details:</p>
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

            await transporter.sendMail(mailOptions);
        }

        res.status(200).send({ message: 'Contact saved successfully and email notification sent' });
    } catch (error) {
        console.error('Error saving contact:', error);
        res.status(500).send({ 
            message: 'Failed to save contact or send email',
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

    if (isNaN(contactIndex)) {
        return res.status(400).send({ message: 'Invalid contact index' });
    }

    try {
        const contactRef = db.collection('contacts').doc(id);
        const doc = await contactRef.get();
        
        if (!doc.exists) {
            return res.status(404).send({ message: 'Contact list not found' });
        }

        const currentContacts = doc.data().contactsList || [];
        
        if (contactIndex < 0 || contactIndex >= currentContacts.length) {
            return res.status(400).send({ message: 'Contact index out of range' });
        }

        currentContacts.splice(contactIndex, 1);

        await contactRef.update({
            contactsList: currentContacts
        });

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
