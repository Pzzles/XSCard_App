const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');
const { authenticateUser } = require('../middleware/auth');

router.use(authenticateUser);

// Place the invite endpoint BEFORE the generic /meetings endpoint to ensure it gets matched first
router.post('/meetings/invite', meetingController.sendMeetingInvite);

// Regular meeting endpoints
router.get('/meetings/:userId', meetingController.getAllMeetings);
router.post('/meetings', meetingController.createMeeting);
router.patch('/meetings/:userId/:meetingIndex', meetingController.updateMeeting);
router.delete('/meetings/:userId/:meetingIndex', meetingController.deleteMeeting);

module.exports = router;
