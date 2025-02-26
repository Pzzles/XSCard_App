const { db } = require('../firebase.js');
const { formatDate } = require('../utils/dateFormatter');

// Helper function for error responses
const sendError = (res, status, message, error = null) => {
    console.error(`${message}:`, error);
    res.status(status).send({ 
        message,
        ...(error && { error: error.message })
    });
};

exports.getAllMeetings = async (req, res) => {
    const { userId } = req.params;
    
    try {
        // Verify if the requesting user has access to this userId's meetings
        if (userId !== req.user.uid) {
            return res.status(403).json({ 
                success: false,
                message: 'Unauthorized access to this user\'s meetings',
                error: 'Authentication failed: You can only access your own meetings'
            });
        }

        const meetingRef = db.collection('meetings').doc(userId);
        const doc = await meetingRef.get();

        if (!doc.exists || !doc.data().bookings) {
            return res.status(404).json({ 
                success: false,
                message: 'No meetings found',
                details: {
                    userId: userId,
                    reason: !doc.exists ? 'User has no meetings document' : 'Bookings array is empty'
                }
            });
        }

        // Format dates in the response
        const meetings = doc.data().bookings.map(meeting => ({
            ...meeting,
            meetingWhen: formatDate(meeting.meetingWhen)
        }));

        res.status(200).json({
            success: true,
            message: 'Meetings retrieved successfully',
            data: {
                userId: userId,
                totalMeetings: meetings.length,
                meetings: meetings
            }
        });
    } catch (error) {
        sendError(res, 500, {
            success: false,
            message: 'Failed to fetch meetings',
            error: {
                type: error.name,
                description: error.message
            }
        });
    }
};

exports.createMeeting = async (req, res) => {
    const { meetingWith, meetingWhen, description } = req.body;
    const userId = req.user.uid;

    if (!meetingWith || !meetingWhen || !description) {
        return res.status(400).send({ 
            message: 'Missing required fields',
            required: ['meetingWith', 'meetingWhen', 'description']
        });
    }

    try {
        const meetingRef = db.collection('meetings').doc(userId);
        const doc = await meetingRef.get();

        // Store as Date object in Firestore
        const newMeeting = {
            meetingWith,
            meetingWhen: new Date(meetingWhen),
            description
        };

        if (doc.exists) {
            await meetingRef.update({
                bookings: [...(doc.data().bookings || []), newMeeting]
            });
        } else {
            await meetingRef.set({
                bookings: [newMeeting]
            });
        }

        // Format for response
        const responseData = {
            ...newMeeting,
            meetingWhen: formatDate(newMeeting.meetingWhen)
        };

        res.status(201).send({
            success: true,
            message: 'Meeting created successfully',
            meeting: responseData
        });
    } catch (error) {
        sendError(res, 500, 'Error creating meeting', error);
    }
};

exports.updateMeeting = async (req, res) => {
    const { userId, meetingIndex } = req.params;
    const updateData = req.body;

    try {
        // Verify if the requesting user has access to this userId's meetings
        if (userId !== req.user.uid) {
            return res.status(403).json({ 
                success: false,
                message: 'Unauthorized access to these meetings',
                error: 'Authentication failed: You can only update your own meetings'
            });
        }

        const meetingRef = db.collection('meetings').doc(userId);
        const doc = await meetingRef.get();

        if (!doc.exists || !doc.data().bookings) {
            return res.status(404).json({ 
                success: false,
                message: 'No meetings found',
                details: {
                    userId,
                    reason: !doc.exists ? 'User has no meetings document' : 'Bookings array is empty'
                }
            });
        }

        const bookings = doc.data().bookings;
        if (!bookings[meetingIndex]) {
            return res.status(404).json({ 
                success: false,
                message: 'Meeting not found',
                details: {
                    userId,
                    meetingIndex,
                    totalMeetings: bookings.length
                }
            });
        }

        // Update meeting data
        bookings[meetingIndex] = {
            ...bookings[meetingIndex],
            ...updateData,
            meetingWhen: updateData.meetingWhen ? new Date(updateData.meetingWhen) : bookings[meetingIndex].meetingWhen
        };

        await meetingRef.update({ bookings });

        // Format the date for response
        const responseData = {
            ...bookings[meetingIndex],
            meetingWhen: new Date(bookings[meetingIndex].meetingWhen)
                .toLocaleString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    timeZoneName: 'short'
                })
                .replace(',', '')
                .replace(/\s+/g, ' ')
                .replace(/(\d+:\d+)/, 'at $1')
        };

        res.status(200).json({
            success: true,
            message: 'Meeting updated successfully',
            data: {
                userId,
                meetingIndex,
                meeting: responseData
            }
        });
    } catch (error) {
        sendError(res, 500, 'Error updating meeting', error);
    }
};

exports.deleteMeeting = async (req, res) => {
    const { userId, meetingIndex } = req.params;

    try {
        // Verify if the requesting user has access
        if (userId !== req.user.uid) {
            return res.status(403).json({ 
                success: false,
                message: 'Unauthorized access to these meetings',
                error: 'Authentication failed: You can only delete your own meetings'
            });
        }

        const meetingRef = db.collection('meetings').doc(userId);
        const doc = await meetingRef.get();

        if (!doc.exists || !doc.data().bookings) {
            return res.status(404).json({
                success: false,
                message: 'No meetings found',
                details: {
                    userId,
                    reason: !doc.exists ? 'User has no meetings document' : 'Bookings array is empty'
                }
            });
        }

        const bookings = doc.data().bookings;
        if (!bookings[meetingIndex]) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found',
                details: {
                    userId,
                    meetingIndex,
                    totalMeetings: bookings.length
                }
            });
        }

        bookings.splice(meetingIndex, 1);
        await meetingRef.update({ bookings });

        res.status(200).json({
            success: true,
            message: 'Meeting deleted successfully',
            data: {
                userId,
                meetingIndex,
                remainingMeetings: bookings.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting meeting',
            error: {
                type: error.name,
                description: error.message
            }
        });
    }
};
