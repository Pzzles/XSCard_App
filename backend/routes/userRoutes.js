const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const userController = require('../controllers/userController');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const profilesDir = path.join(__dirname, '..', 'public', 'profiles');
        if (!fs.existsSync(profilesDir)) {
            fs.mkdirSync(profilesDir, { recursive: true });
        }
        cb(null, profilesDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Routes
router.post('/AddUser', upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'companyLogo', maxCount: 1 }
]), userController.addUser);
router.post('/SignIn', userController.signIn);
router.get('/Users', userController.getAllUsers);
router.get('/Users/:id', userController.getUserById);
router.patch('/UpdateUser/:id', upload.single('profileImage'), userController.updateUser);
router.delete('/Users/:id', userController.deleteUser);
router.patch('/Users/:id/profile-image', upload.single('profileImage'), userController.updateProfileImage);
router.patch('/Users/:id/color', userController.updateUserColor);

module.exports = router;
