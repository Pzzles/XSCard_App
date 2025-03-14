const { db } = require('../firebase.js');
const { formatDate } = require('../utils/dateFormatter');
const { sendMailWithStatus } = require('../public/Utils/emailService');
const { createCalendarEvent } = require('../public/Utils/calendarService');

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
    const { 
        meetingWith, 
        meetingWhen,
        title,
        duration = 30,
        location = "",
        attendees = [],
        startDateTime,
        description = ''
    } = req.body;
    
    const userId = req.user.uid;

    // Support both formats (old and new)
    const meetingTitle = title || meetingWith;
    const meetingTime = startDateTime ? new Date(startDateTime) : 
                       meetingWhen ? new Date(meetingWhen) : 
                       new Date();

    if (!meetingTitle) {
        return res.status(400).send({ 
            message: 'Missing required field: title/meetingWith',
            required: ['title or meetingWith', 'startDateTime or meetingWhen']
        });
    }

    try {
        const meetingRef = db.collection('meetings').doc(userId);
        const doc = await meetingRef.get();

        // Store with all fields the UI might need later
        const newMeeting = {
            meetingWith: meetingTitle,
            title: meetingTitle,
            meetingWhen: meetingTime,
            description: description || '',
            duration: duration || 30,
            location: location || '',
            attendees: Array.isArray(attendees) ? attendees : []
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

exports.sendMeetingInvite = async (req, res) => {
    try {
        const userId = req.user.uid;
        const {
            title,
            description,
            startDateTime,
            endDateTime,
            location,
            attendees,
            organizer,
            timezone = 'UTC',
            duration = 30
        } = req.body;
        
        // Calculate endDateTime if not provided but duration is
        let endTime = endDateTime ? new Date(endDateTime) : null;
        if (!endTime && startDateTime && duration) {
            endTime = new Date(new Date(startDateTime).getTime() + (duration * 60000));
        }
        
        // Validate required fields with better error messages
        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'Meeting title is required'
            });
        }
        
        if (!startDateTime) {
            return res.status(400).json({
                success: false,
                message: 'Meeting start time is required'
            });
        }
        
        if (!endTime) {
            return res.status(400).json({
                success: false,
                message: 'Either meeting end time or duration is required'
            });
        }
        
        if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one attendee is required'
            });
        }

        // Log for debugging
        console.log('Creating meeting invite with data:', {
            title, 
            start: startDateTime, 
            end: endTime,
            attendees: attendees.map(a => ({ name: a.name, email: a.email }))
        });
        
        // Generate the calendar event with try/catch
        let calendarEvent;
        try {
            calendarEvent = await createCalendarEvent({
                title,
                description: description || '',
                start: startDateTime,
                end: endTime,
                location: location || 'Online meeting',
                attendees,
                organizer,
                timezone
            });
            console.log('Calendar event generated successfully');
        } catch (calendarError) {
            console.error('Failed to generate calendar event:', calendarError);
            // Set to null to indicate calendar generation failed
            calendarEvent = null;
        }
        
        // Send emails to all attendees
        const emailPromises = attendees.map(async (attendee) => {
            const mailOptions = {
                to: attendee.email,
                from: {
                    name: organizer?.name || 'XS Card User',
                    address: process.env.EMAIL_FROM_ADDRESS
                },
                replyTo: organizer?.email || process.env.EMAIL_FROM_ADDRESS,
                subject: `Meeting Invitation: ${title}`,
                html: `
                    <h2>Meeting Invitation from ${organizer?.name || 'XS Card User'}</h2>
                    <p><strong>Subject:</strong> ${title}</p>
                    <p><strong>When:</strong> ${new Date(startDateTime).toLocaleString(undefined, { 
                        dateStyle: 'full', 
                        timeStyle: 'short' 
                    })}</p>
                    <p><strong>Duration:</strong> ${duration} minutes</p>
                    <p><strong>Where:</strong> ${location || 'Online meeting'}</p>
                    <p><strong>Organizer:</strong> ${organizer?.name || 'XS Card User'} ${organizer?.email ? `(${organizer.email})` : ''}</p>
                    ${description ? `<p><strong>Description:</strong><br>${description.replace(/\n/g, '<br>')}</p>` : ''}
                    <p>This invitation contains a calendar attachment that you can add to your calendar application.</p>
                `
            };
            
            // Only add attachment if calendar generation succeeded
            if (calendarEvent) {
                mailOptions.attachments = [{
                    filename: 'meeting.ics',
                    content: calendarEvent,
                    contentType: 'text/calendar'
                }];
            } else {
                mailOptions.html += '<p style="color:red">Note: Calendar attachment could not be generated.</p>';
            }
            
            return sendMailWithStatus(mailOptions);
        });
        
        const emailResults = await Promise.all(emailPromises);
        
        // Save meeting to database
        const meetingRef = db.collection('meetings').doc(userId);
        const meetingDoc = await meetingRef.get();
        
        const newMeeting = {
            meetingWith: title,
            title: title,
            meetingWhen: new Date(startDateTime),
            endTime: endTime,
            description: description || '',
            location: location || 'Online Meeting',
            attendees: attendees,
            duration: duration
        };
        
        if (meetingDoc.exists) {
            await meetingRef.update({
                bookings: [...(meetingDoc.data().bookings || []), newMeeting]
            });
        } else {
            await meetingRef.set({
                bookings: [newMeeting]
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Meeting invitations sent successfully',
            calendarAttached: !!calendarEvent,
            data: {
                emailResults: emailResults.map(r => ({
                    success: r.success,
                    recipients: r.accepted
                })),
                meeting: {
                    ...newMeeting,
                    meetingWhen: formatDate(newMeeting.meetingWhen)
                }
            }
        });
    } catch (error) {
        console.error('Error sending meeting invites:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send meeting invitations',
            error: error.message
        });
    }
};
