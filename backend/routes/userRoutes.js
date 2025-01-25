const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/Users', userController.getAllUsers);
router.get('/Users/:id', userController.getUserById);
router.post('/AddUser', userController.addUser);
router.patch('/Users/:name', userController.updateUserStatus);
router.delete('/Users/:id', userController.deleteUser);
router.post('/SignIn', userController.signIn);

module.exports = router;
