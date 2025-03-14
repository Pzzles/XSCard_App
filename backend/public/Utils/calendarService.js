// Fix the import statement - ical-generator needs to be required correctly
const icalGenerator = require('ical-generator');

/**
 * Creates an ICS calendar event with proper timezone support
 * 
 * @param {Object} event - The event details
 * @param {string} event.title - Event title/summary
 * @param {string} event.description - Event description
 * @param {Date|string} event.start - Start date and time
 * @param {Date|string} event.end - End date and time
 * @param {string} event.location - Event location
 * @param {Array} event.attendees - Array of attendee objects with email and name
 * @param {Object} event.organizer - Organizer with email and name
 * @param {string} event.timezone - IANA timezone string (e.g. 'Africa/Johannesburg')
 * @returns {Promise<string>} - Promise resolving to ICS content string
 */
exports.createCalendarEvent = async ({
  title,
  description,
  start,
  end,
  location,
  attendees,
  organizer,
  timezone = 'UTC'
}) => {
  try {
    // Create a new calendar using icalGenerator.default() or icalGenerator()
    // depending on how the library is structured
    const calendar = icalGenerator.default ? 
      icalGenerator.default({
        name: 'XS Card Meeting',
        timezone: timezone
      }) : 
      icalGenerator({
        name: 'XS Card Meeting',
        timezone: timezone
      });

    // Log for debugging
    console.log('Calendar created:', !!calendar);

    const event = calendar.createEvent({
      start: new Date(start),
      end: new Date(end),
      summary: title,
      description: description || '',
      location: location || 'Online Meeting',
      organizer: {
        name: organizer?.name || 'XS Card User',
        email: organizer?.email || 'contact@xscard.com'
      }
    });

    // Log for debugging
    console.log('Event created:', !!event);

    // Add attendees
    if (Array.isArray(attendees)) {
      attendees.forEach(attendee => {
        if (attendee && attendee.email) {
          event.createAttendee({
            name: attendee.name || '',
            email: attendee.email,
            rsvp: true,
            type: 'individual',
            role: 'req-participant'
          });
        }
      });
    }

    // Return the generated calendar as string
    return calendar.toString();
  } catch (error) {
    console.error('Error creating calendar event:', error);
    
    // Return simple string as fallback when calendar generation fails
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//XS Card//Meeting//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
SUMMARY:${title || 'Meeting'}
DTSTART:${new Date(start).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/g, '')}
DTEND:${new Date(end).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/g, '')}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/g, '')}
UID:${Date.now()}@xscard.com
CREATED:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/g, '')}
DESCRIPTION:${description || ''}
LOCATION:${location || ''}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
  }
};
