const { db, admin } = require('../firebase.js');
const axios = require('axios');
const config = require('../config/config');
const { sendMailWithStatus } = require('../public/Utils/emailService');
require('dotenv').config();
const { AUTH_ENDPOINTS, EMAIL_TEMPLATES, AUTH_CONSTANTS } = require('../constants/auth');
const { formatDate } = require('../utils/dateFormatter');

const sendVerificationEmail = async (userData, req) => {
    const now = Date.now();
    const lastSent = userData.lastVerificationEmailSent || 0;
    
    if (now - lastSent < AUTH_CONSTANTS.VERIFICATION_EMAIL_COOLDOWN) {
        const minutesLeft = Math.ceil((AUTH_CONSTANTS.VERIFICATION_EMAIL_COOLDOWN - (now - lastSent)) / 60000);
        throw new Error(`Please wait ${minutesLeft} minutes before requesting another verification email`);
    }

    const verificationToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const verificationLink = `${req.protocol}://${req.get('host')}/verify-email?token=${verificationToken}&uid=${userData.uid}`;
    
    await userData.ref.update({ 
        verificationToken,
        lastVerificationEmailSent: now
    });

    await sendMailWithStatus({
        to: userData.email,
        subject: EMAIL_TEMPLATES.verification.subject,
        html: EMAIL_TEMPLATES.verification.getHtml(userData.name, verificationLink)
    });

    return verificationToken;
};

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
            return res.status(404).send({ message: 'User is not found'});
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
    const { 
        name, surname, email, password, status = 'active' 
    } = req.body;
    
    try {
        console.log('Starting user creation process for:', email);
        
        // Create user in Firebase Auth
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            emailVerified: false
        });
        console.log('Firebase Auth user created with UID:', userRecord.uid);

        const verificationToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        
        // Data for users collection - only include essential fields
        const userData = {
            uid: userRecord.uid,
            name,
            surname,
            email,
            status,
            plan: 'free', // Default plan
            createdAt: admin.firestore.Timestamp.now(), // Changed to Firestore Timestamp
            isEmailVerified: false,
            verificationToken
        };

        const responseData = {
            ...userData,
            createdAt: formatDate(userData.createdAt) // Format for display
        };

        // Store user data in Firestore
        console.log('Storing user data in Firestore, document ID:', userRecord.uid);
        await db.collection('users').doc(userRecord.uid).set(userData);
        console.log('User data stored successfully in Firestore');

        // Send verification email
        const verificationLink = `${req.protocol}://${req.get('host')}/verify-email?token=${verificationToken}&uid=${userRecord.uid}`;
        
        await sendMailWithStatus({
            to: email,
            subject: 'Verify your XS Card email address',
            html: `
                <h1>Welcome to XS Card!</h1>
                <p>Hello ${name},</p>
                <p>Please click the link below to verify your email address:</p>
                <a href="${verificationLink}">Verify Email</a>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't create this account, please ignore this email.</p>
            `
        });
        console.log('Verification email sent to:', email);
        
        res.status(201).send({ 
            message: 'User added successfully. Please check your email to verify your account.',
            userId: userRecord.uid,
            userData: {
                ...responseData,
                verificationToken: undefined // Don't send token in response
            }
        });
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).send({ message: 'Internal Server Error', error: error.message });
    }
};

exports.verifyEmail = async (req, res) => {
    const { token, uid } = req.query;

    try {
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            // Redirect to the HTML page with user-not-found status
            return res.redirect('/templates/emailVerified.html?status=user-not-found');
        }

        const userData = userDoc.data();

        if (userData.verificationToken !== token) {
            // Redirect to the HTML page with error status
            return res.redirect('/templates/emailVerified.html?status=error');
        }

        if (userData.isEmailVerified) {
            // Redirect to the HTML page with already-verified status
            return res.redirect('/templates/emailVerified.html?status=already-verified');
        }

        // Update Firestore
        await userRef.update({
            isEmailVerified: true,
            verificationToken: admin.firestore.FieldValue.delete()
        });

        // Update Firebase Auth
        await admin.auth().updateUser(uid, {
            emailVerified: true
        });

        // Redirect to the HTML page with success status
        res.redirect('/templates/emailVerified.html?status=success');
    } catch (error) {
        console.error('Verification error:', error);
        // Redirect to the HTML page with error status and message
        res.redirect(`/templates/emailVerified.html?status=error&message=${encodeURIComponent(error.message)}`);
    }
};

exports.resendVerification = async (req, res) => {
    const { uid } = req.params;

    try {
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).send({ message: 'User not found' });
        }

        const userData = { ...userDoc.data(), ref: userRef, uid };

        if (userData.isEmailVerified) {
            return res.status(400).send({ message: 'Email already verified' });
        }

        try {
            await sendVerificationEmail(userData, req);
            res.status(200).send({ message: 'Verification email sent successfully' });
        } catch (error) {
            res.status(429).send({ message: error.message });
        }
    } catch (error) {
        console.error('Error resending verification:', error);
        res.status(500).send({ 
            message: 'Failed to resend verification email',
            error: error.message 
        });
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

    try {
        const ipAddress = req.ip || req.connection.remoteAddress;
        const combinedRef = db.collection('loginAttempts').doc(`${ipAddress}_${email}`);
        const ipRef = db.collection('loginAttempts').doc(ipAddress);
        
        const now = Date.now();
        const windowMs = 15 * 60 * 1000; // 15 minutes
        const maxIpEmailAttempts = 5; // 5 attempts per IP+email per 15 minutes
        const maxIpAttempts = 50; // 50 total attempts per IP per 15 minutes
        const expiresAt = new Date(now + windowMs);
        
        try {
            // Get both documents
            const [combinedDoc, ipDoc] = await Promise.all([
                combinedRef.get(),
                ipRef.get()
            ]);
            
            // Process IP+email attempts
            let ipEmailAttempts = combinedDoc.exists ? combinedDoc.data().attempts || [] : [];
            ipEmailAttempts = ipEmailAttempts.filter(timestamp => now - timestamp < windowMs);
            
            // Process IP-wide attempts
            let ipAttempts = ipDoc.exists ? ipDoc.data().attempts || [] : [];
            ipAttempts = ipAttempts.filter(timestamp => now - timestamp < windowMs);
            
            // Check IP+email limit
            if (ipEmailAttempts.length >= maxIpEmailAttempts) {
                return res.status(429).send({ 
                    message: 'Too many login attempts for this account. Please try again later.',
                    retryAfter: Math.ceil((ipEmailAttempts[0] + windowMs - now) / 1000) // seconds until retry
                });
            }
            
            // Check IP-wide limit
            if (ipAttempts.length >= maxIpAttempts) {
                return res.status(429).send({ 
                    message: 'Too many login attempts from this network. Please try again later.',
                    retryAfter: Math.ceil((ipAttempts[0] + windowMs - now) / 1000) // seconds until retry
                });
            }
            
            // Record this attempt in both places
            ipEmailAttempts.push(now);
            ipAttempts.push(now);
            
            await Promise.all([
                combinedRef.set({ 
                    attempts: ipEmailAttempts,
                    email,
                    expiresAt
                }),
                ipRef.set({ 
                    attempts: ipAttempts,
                    expiresAt
                })
            ]);
            
            const response = await axios.post(AUTH_ENDPOINTS.signIn, {
                email,
                password,
                returnSecureToken: true
            });
            
            // If login successful, clear only the IP+email record, not the IP-wide record
            await combinedRef.delete();

            const { idToken, localId } = response.data;
            const userDoc = await db.collection('users').doc(localId).get();
            
            if (!userDoc.exists) {
                return res.status(404).send({ message: 'User not found' });
            }

            const userData = userDoc.data();

            if (!userData.isEmailVerified) {
                return res.status(403).send({
                    message: 'Email not verified. Please verify your email or request a new verification email.',
                    needsVerification: true,
                    uid: localId
                });
            }

            res.status(200).send({
                message: 'Sign in successful',
                token: idToken,
                user: {
                    uid: localId,
                    ...userData
                }
            });
        } catch (error) {
            console.error('Sign in error:', error.response?.data || error);
            res.status(401).send({ 
                message: 'Invalid credentials',
                error: error.response?.data || error.message
            });
        }
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
        if (req.file && req.file.firebaseUrl) {
            updateData.profileImage = req.file.firebaseUrl;
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
  
      // Use Firebase Storage URL instead of local path
      const profileImage = req.file.firebaseUrl;
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

exports.updateCompanyLogo = async (req, res) => {
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

        // Use Firebase Storage URL instead of local path
        const companyLogo = req.file.firebaseUrl;
        await userRef.update({ companyLogo });

        const updatedDoc = await userRef.get();
        const userData = {
            id: updatedDoc.id,
            ...updatedDoc.data()
        };

        res.status(200).send(userData);
    } catch (error) {
        console.error('Error updating company logo:', error);
        res.status(500).send({
            message: 'Failed to update company logo',
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

exports.logout = async (req, res) => {
    try {
        const uid = req.user.uid;
        const token = req.token;
        
        // Add token to blacklist with expiry
        await db.collection('tokenBlacklist').doc(token).set({
            uid: uid,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
        });

        // Revoke refresh tokens
        await admin.auth().revokeRefreshTokens(uid);
        
        res.status(200).send({ 
            success: true,
            message: 'Logged out successfully',
            data: {
                uid: uid,
                timestamp: Date.now(),
                sessionEnded: true,
                tokenRevoked: true
            },
            meta: {
                serverTime: new Date().toISOString(),
                tokenStatus: 'revoked'
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).send({
            success: false,
            message: 'Failed to logout',
            error: {
                code: error.code || 'UNKNOWN_ERROR',
                message: error.message,
                timestamp: Date.now()
            }
        });
    }
};

exports.upgradeToPremium = async (req, res) => {
    const { id } = req.params;
    try {
        const userRef = db.collection('users').doc(id);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).send({ message: 'User not found' });
        }

        // Update user to premium
        await userRef.update({
            plan: 'premium',
            status: 'active',
            trialStartDate: admin.firestore.Timestamp.now()
        });

        const updatedDoc = await userRef.get();
        const userData = {
            id: updatedDoc.id,
            ...updatedDoc.data()
        };

        res.status(200).send({
            message: 'User upgraded to premium successfully',
            user: userData
        });
    } catch (error) {
        console.error('Error upgrading user:', error);
        res.status(500).send({
            message: 'Failed to upgrade user',
            error: error.message
        });
    }
};

// Update the uploadUserImages function to create the card as well
exports.uploadUserImages = async (req, res) => {
    // Extract userId from all possible sources for consistency with middleware
    const userId = req.params.userId || req.params.id || req.body.userId || req.body.uid || req.query.userId;
    
    console.log('uploadUserImages called with userId:', userId);
    console.log('Request parameters:', req.params);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request body values:', req.body);
    
    if (!userId) {
        return res.status(400).send({ 
            message: 'User ID is required', 
            params: req.params,
            body: Object.keys(req.body),
            query: req.query
        });
    }
    
    try {
        // Verify the user exists
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
            return res.status(404).send({ message: 'User not found' });
        }
        
        const userData = userDoc.data();
        console.log('Retrieved user data:', userData.name, userData.surname, userData.email);
        
        // Extract additional fields from the request
        const { phone, occupation, company } = req.body;
        console.log('Profile completion data:', { phone, occupation, company });
        
        // Update user with additional profile information
        await userRef.update({
            phone: phone ?? '',
            occupation: occupation ?? '',
            company: company ?? ''
        });
        console.log('Updated user profile with additional information');
        
        // Create a new card for the user - ensure all required fields have values
        const cardData = {
            cards: [{
                name: userData.name ?? '',
                surname: userData.surname ?? '',
                email: userData.email ?? '',
                phone: phone ?? '',
                occupation: occupation ?? '',
                company: company ?? '',
                profileImage: req.firebaseStorageUrls?.profileImage ?? null,
                companyLogo: req.firebaseStorageUrls?.companyLogo ?? null,
                socials: {},
                colorScheme: '#1B2B5B', // Default color
                createdAt: admin.firestore.Timestamp.now() // Changed to Firestore Timestamp
            }]
        };
        console.log('Creating card with data:', JSON.stringify(cardData.cards[0], null, 2));
        
        // Store card data in Firestore
        await db.collection('cards').doc(userId).set(cardData);
        console.log('Card created successfully for user:', userId);
        
        res.status(200).send({
            message: 'Card created successfully with images',
            profileImage: cardData.cards[0].profileImage,
            companyLogo: cardData.cards[0].companyLogo
        });
    } catch (error) {
        console.error('Error creating card with images:', error);
        res.status(500).send({ message: 'Failed to create card', error: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).send({ message: 'Email is required' });
    }

    try {
        // Check if user exists in Firestore
        const usersRef = db.collection('users');
        const userQuery = await usersRef.where('email', '==', email).get();
        
        if (userQuery.empty) {
            // Don't reveal if email exists or not for security
            return res.status(200).send({ 
                message: 'If an account with that email exists, we have sent a password reset link.'
            });
        }

        const userDoc = userQuery.docs[0];
        const userData = userDoc.data();
        const userId = userDoc.id;

        // Debug: Log user data to see what fields are available
        console.log('User data for password reset:', {
            name: userData.name,
            surname: userData.surname,
            email: userData.email,
            allFields: Object.keys(userData)
        });

        // Generate reset token
        const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const resetExpiry = Date.now() + 60 * 60 * 1000; // 1 hour

        // Store reset token in user document
        await userDoc.ref.update({
            passwordResetToken: resetToken,
            passwordResetExpiry: resetExpiry
        });

        // Send reset email - handle cases where name might be undefined
        const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}&uid=${userId}`;
        const userName = userData.name || userData.surname || 'User';
        
        await sendMailWithStatus({
            to: email,
            subject: 'XS Card - Password Reset Request',
            html: `
                <h1>Password Reset Request</h1>
                <p>Hello ${userName},</p>
                <p>You requested to reset your password for your XS Card account.</p>
                <p>Click the link below to reset your password:</p>
                <a href="${resetLink}" style="background-color: #1E1B4B; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this reset, please ignore this email and your password will remain unchanged.</p>
                <p>For security reasons, please do not share this link with anyone.</p>
            `
        });

        res.status(200).send({ 
            message: 'If an account with that email exists, we have sent a password reset link.'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).send({ 
            message: 'Internal server error',
            error: error.message 
        });
    }
};

exports.resetPassword = async (req, res) => {
    const { token, uid, newPassword } = req.body;

    if (!token || !uid || !newPassword) {
        return res.status(400).send({ message: 'Token, user ID, and new password are required' });
    }

    // Validate password strength
    if (newPassword.length < 8) {
        return res.status(400).send({ message: 'Password must be at least 8 characters long' });
    }

    // Additional password validation
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
    
    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
        return res.status(400).send({ 
            message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)' 
        });
    }

    try {
        // Get user document
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).send({ message: 'Invalid reset link' });
        }

        const userData = userDoc.data();

        // Check if token is valid and not expired
        if (!userData.passwordResetToken || userData.passwordResetToken !== token) {
            return res.status(400).send({ message: 'Invalid or expired reset token' });
        }

        if (!userData.passwordResetExpiry || Date.now() > userData.passwordResetExpiry) {
            return res.status(400).send({ message: 'Reset token has expired' });
        }

        // Update password in Firebase Auth
        await admin.auth().updateUser(uid, {
            password: newPassword
        });

        // Clear reset token from user document
        await userRef.update({
            passwordResetToken: admin.firestore.FieldValue.delete(),
            passwordResetExpiry: admin.firestore.FieldValue.delete()
        });

        // Send confirmation email
        await sendMailWithStatus({
            to: userData.email,
            subject: 'XS Card - Password Successfully Reset',
            html: `
                <h1>Password Reset Successful</h1>
                <p>Hello ${userData.name || userData.surname || 'User'},</p>
                <p>Your password has been successfully reset.</p>
                <p>If you didn't make this change, please contact us immediately.</p>
                <p>For security, please sign in with your new password.</p>
            `
        });

        res.status(200).send({ 
            message: 'Password reset successful. You can now sign in with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).send({ 
            message: 'Failed to reset password',
            error: error.message 
        });
    }
};

// Add new function to get user info for reset page
exports.getResetUserInfo = async (req, res) => {
    const { token, uid } = req.query;

    if (!token || !uid) {
        return res.status(400).send({ message: 'Token and user ID are required' });
    }

    try {
        // Get user document
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).send({ message: 'Invalid reset link' });
        }

        const userData = userDoc.data();

        // Check if token is valid and not expired
        if (!userData.passwordResetToken || userData.passwordResetToken !== token) {
            return res.status(400).send({ message: 'Invalid or expired reset token' });
        }

        if (!userData.passwordResetExpiry || Date.now() > userData.passwordResetExpiry) {
            return res.status(400).send({ message: 'Reset token has expired' });
        }

        // Return only safe user info for display
        res.status(200).send({ 
            email: userData.email,
            name: userData.name || userData.surname || 'User'
        });

    } catch (error) {
        console.error('Get reset user info error:', error);
        res.status(500).send({ 
            message: 'Failed to get user information',
            error: error.message 
        });
    }
};
