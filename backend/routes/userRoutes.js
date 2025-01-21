const express = require('express');
const { getUsers, getUser, addUser, updateUser, deleteUser } = require('../controllers/userController');
const router = express.Router();

router.get('/User', getUsers);
router.get('/User/:name', getUser);
router.post('/User', addUser);
router.patch('/User/:name', updateUser);
router.delete('/User/:name', deleteUser);

module.exports = router;