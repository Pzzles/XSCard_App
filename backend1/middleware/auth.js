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
        
        // Verify the token and attach user info to request
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        req.token = token;
        next();
    } catch (error) {
        res.status(500).json({
            message: 'Authentication failed',
            error: error.message
        });
    }
};
