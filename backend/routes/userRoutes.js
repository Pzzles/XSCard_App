const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateUser } = require('../middleware/auth');
const { handleSingleUpload, handleMultipleUploads } = require('../middleware/fileUpload');

// Public routes (no authentication required)
router.post('/SignIn', userController.signIn);
router.post('/AddUser', userController.addUser);
router.post('/Users/:userId/UploadImages', 
    handleMultipleUploads([
        { name: 'profileImage', maxCount: 1 },
        { name: 'companyLogo', maxCount: 1 }
    ]), 
    userController.uploadUserImages
);
router.get('/verify-email', userController.verifyEmail);

// All routes below this middleware will require authentication
router.use(authenticateUser);

// Protected routes
router.post('/logout', userController.logout);
router.post('/resend-verification/:uid', userController.resendVerification);
router.get('/Users', userController.getAllUsers);
router.get('/Users/:id', userController.getUserById);
router.patch('/UpdateUser/:id', handleSingleUpload('profileImage'), userController.updateUser);
router.delete('/Users/:id', userController.deleteUser);
router.patch('/Users/:id/profile-image', handleSingleUpload('profileImage'), userController.updateProfileImage);
router.patch('/Users/:id/company-logo', handleSingleUpload('companyLogo'), userController.updateCompanyLogo);
router.patch('/Users/:id/color', userController.updateUserColor);
router.patch('/Users/:id/upgrade', authenticateUser, userController.upgradeToPremium);

module.exports = router;
