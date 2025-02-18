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
        if (!token) {
            return res.status(401).json({
                message: 'No token provided'
            });
        }

        // Check if token is blacklisted
        const blacklistRef = db.collection('tokenBlacklist').doc(token);
        const blacklistDoc = await blacklistRef.get();
        
        if (blacklistDoc.exists) {
            return res.status(401).json({
                message: 'Token has been revoked. Please login again.'
            });
        }

        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            req.user = decodedToken;
            req.token = token; // Store token for logout
            next();
        } catch (error) {
            return res.status(403).json({
                message: 'Invalid or expired token',
                error: error.message
            });
        }
    } catch (error) {
        res.status(500).json({
            message: 'Authentication failed',
            error: error.message
        });
    }
};
