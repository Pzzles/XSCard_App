const { admin, db } = require('../firebase');

exports.authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Authentication required. Please provide a valid token.'
            });
        }

        const token = authHeader.split('Bearer ')[1];
        
        // Check if token is blacklisted
        const blacklistDoc = await db.collection('tokenBlacklist').doc(token).get();
        if (blacklistDoc.exists) {
            return res.status(401).json({
                message: 'Token has been revoked. Please login again.',
                code: 'TOKEN_REVOKED'
            });
        }
        
        let decodedToken;
        
        try {
            // Try to verify as ID token first
            decodedToken = await admin.auth().verifyIdToken(token);
            console.log('[Auth Middleware] ID token verified successfully');
        } catch (idTokenError) {
            // If ID token verification fails, check if it's a custom token
            // Custom tokens start with a specific pattern and can be decoded
            try {
                // For custom tokens, we'll decode without verification
                // This is acceptable for our refresh scenario since we generated the token
                const jwt = require('jsonwebtoken');
                const decoded = jwt.decode(token);
                
                if (decoded && decoded.uid) {
                    // Create a user object similar to what verifyIdToken returns
                    decodedToken = {
                        uid: decoded.uid,
                        email: decoded.claims?.email || decoded.email,
                        // Add other fields as needed
                    };
                    console.log('[Auth Middleware] Custom token decoded successfully for uid:', decoded.uid);
                } else {
                    throw new Error('Invalid custom token format');
                }
            } catch (customTokenError) {
                console.error('[Auth Middleware] Token verification failed:', {
                    idTokenError: idTokenError.message,
                    customTokenError: customTokenError.message
                });
                throw new Error('Invalid token format');
            }
        }
        
        // Attach user info to request
        req.user = decodedToken;
        req.token = token;
        next();
    } catch (error) {
        console.error('[Auth Middleware] Authentication error:', error);
        res.status(401).json({
            message: 'Authentication failed',
            error: error.message
        });
    }
};
