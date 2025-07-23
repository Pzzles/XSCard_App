require('dotenv').config();
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail'); // Add this line to import SendGrid
const { db } = require('../../firebase.js');

// Set SendGrid API key if available
if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'YOUR_SENDGRID_API_KEY') {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Email service configuration
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'smtp'; // Add 'EMAIL_SERVICE=sendgrid' to .env to use SendGrid

// Create email transport configuration with XSpark settings
const createTransporter = () => {
  console.log('Creating email transporter with:', {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_SMTP_PORT),
    user: process.env.EMAIL_USER
  });
  
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_SMTP_PORT),
    secure: true, // Use SSL/TTLS for port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false, // Accept self-signed certificates
    },
    debug: true, // Enable debug logging
    // Add timeout configuration
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,  // 10 seconds
    socketTimeout: 15000,    // 15 seconds
  });
};

// Create initial transporter instance
let transporter = createTransporter();

// Enhanced connection test with detailed logging and graceful fallback
const verifyTransporter = () => {
  return new Promise((resolve) => {
    // If using SendGrid, no verification needed
    if (EMAIL_SERVICE === 'sendgrid') {
      console.log('Using SendGrid as email service - no SMTP verification needed');
      return resolve(true);
    }
    
    // SMTP verification
    transporter.verify((error, success) => {
      if (error) {
        console.error('Email server verification error:', {
          message: error.message,
          code: error.code,
          command: error.command,
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_SMTP_PORT
        });
        resolve(false);
      } else {
        console.log('Email server connection verified successfully');
        resolve(true);
      }
    });
  });
};

// Call verify but don't wait for it - this allows the app to start even if email is down
verifyTransporter().then(isVerified => {
  if (!isVerified && EMAIL_SERVICE !== 'sendgrid') {
    console.log('Email service may not be available but application will continue');
  }
});

// Enhance the transporter.sendMail with status tracking, retries and better error handling
const sendMailWithStatus = async (mailOptions) => {
  try {
    // Make sure from address is properly set
    if (!mailOptions.from || typeof mailOptions.from === 'string') {
      mailOptions.from = {
        name: process.env.EMAIL_FROM_NAME || 'XS Card',
        address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER
      };
    }
    
    console.log(`Sending email to: ${mailOptions.to} using ${EMAIL_SERVICE}`);
    console.log('Email subject:', mailOptions.subject);
    
    // Try SendGrid if configured
    if (EMAIL_SERVICE === 'sendgrid') {
      return await sendWithSendGrid(mailOptions);
    }
    
    // Otherwise proceed with SMTP
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent to:', mailOptions.to);
      console.log('Message ID:', info.messageId);

      return {
        success: true,
        accepted: info.accepted,
        rejected: info.rejected,
        messageId: info.messageId
      };
    } catch (transportError) {
      // If SMTP fails and SendGrid is configured, try SendGrid as fallback
      if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'YOUR_SENDGRID_API_KEY') {
        console.log('SMTP failed, trying SendGrid as fallback...');
        return await sendWithSendGrid(mailOptions);
      }
      
      // If we get a connection error, try to recreate the transporter once
      if (transportError.code === 'ETIMEDOUT' || 
          transportError.code === 'ECONNREFUSED' || 
          transportError.code === 'ECONNRESET') {
        
        console.log('Reconnecting to email server after connection error...');
        // Create a fresh transporter instance
        transporter = createTransporter();
        
        // Try one more time with the fresh connection
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent after reconnection to:', mailOptions.to);
        console.log('Message ID:', info.messageId);

        return {
          success: true,
          accepted: info.accepted,
          rejected: info.rejected,
          messageId: info.messageId,
          reconnected: true
        };
      }
      
      // If it's not a connection error, or the retry failed, throw the original error
      throw transportError;
    }

  } catch (error) {
    console.error('Email send failed:', error.message);
    // More detailed error logging
    console.error('Email error details:', {
      to: mailOptions.to,
      subject: mailOptions.subject,
      errorName: error.name,
      errorCode: error.code,
      errorCommand: error.command
    });
    
    return {
      success: false,
      error: error.message,
      errorCode: error.code || 'UNKNOWN'
    };
  }
};

// Helper function to send email using SendGrid
const sendWithSendGrid = async (mailOptions) => {
  try {
    if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === 'YOUR_SENDGRID_API_KEY') {
      throw new Error('SendGrid API key not configured');
    }
    
    // Convert from nodemailer format to SendGrid format
    const msg = {
      to: mailOptions.to,
      from: typeof mailOptions.from === 'object' 
        ? { email: mailOptions.from.address, name: mailOptions.from.name }
        : mailOptions.from,
      subject: mailOptions.subject,
      text: mailOptions.text || '',
      html: mailOptions.html || ''
    };
    
    const result = await sgMail.send(msg);
    console.log('Email sent via SendGrid to:', mailOptions.to);
    
    return {
      success: true,
      accepted: [mailOptions.to],
      rejected: [],
      messageId: result?.[0]?.messageId || 'unknown',
      provider: 'sendgrid'
    };
  } catch (error) {
    console.error('SendGrid email error:', error);
    
    // Try SMTP as fallback if SendGrid fails
    if (EMAIL_SERVICE === 'sendgrid') {
      console.log('SendGrid failed, trying SMTP as fallback...');
      try {
        const info = await transporter.sendMail(mailOptions);
        return {
          success: true,
          accepted: info.accepted,
          rejected: info.rejected,
          messageId: info.messageId,
          provider: 'smtp-fallback'
        };
      } catch (smtpError) {
        console.error('SMTP fallback also failed:', smtpError.message);
        throw error; // Throw original SendGrid error
      }
    } else {
      throw error;
    }
  }
};

// Bulk registration email function - sends individual emails to each attendee
const sendBulkRegistrationEmail = async (userId, bulkRegistrationId, eventData, tickets) => {
  try {
    console.log(`Sending individual emails for bulk registration ${bulkRegistrationId} to ${tickets.length} attendees`);
    
    const emailResults = [];
    
    // Send individual email to each attendee
    for (const ticket of tickets) {
      try {
        const attendeeEmail = ticket.attendeeEmail;
        const attendeeName = ticket.attendeeName;
        
        if (!attendeeEmail) {
          console.error(`No email found for attendee: ${attendeeName}`);
          emailResults.push({ 
            attendee: attendeeName, 
            success: false, 
            error: 'No email address' 
          });
          continue;
        }

        // Create individual email content for this attendee
        const emailContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
              <h1 style="color: #333; margin: 0;">Event Registration Confirmation</h1>
            </div>
            
            <div style="padding: 20px;">
              <h2 style="color: #333;">Hello ${attendeeName}!</h2>
              <p>You have been successfully registered for the following event:</p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #FF4B6E; margin-top: 0;">${eventData.title}</h3>
                <p><strong>Date:</strong> ${eventData.eventDate ? new Date(eventData.eventDate).toLocaleDateString() : 'Date TBD'}</p>
                <p><strong>Time:</strong> ${eventData.time || 'Time TBD'}</p>
                <p><strong>Location:</strong> ${eventData.location?.venue || 'Location TBD'}</p>
                ${eventData.location?.address ? `<p><strong>Address:</strong> ${eventData.location.address}, ${eventData.location.city}</p>` : ''}
              </div>
              
              <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #4CAF50; margin-top: 0;">Your Ticket Details</h3>
                <p><strong>Ticket ID:</strong> ${ticket.id}</p>
                <p><strong>Attendee:</strong> ${attendeeName}</p>
                <p><strong>Email:</strong> ${attendeeEmail}</p>
                ${ticket.attendeePhone ? `<p><strong>Phone:</strong> ${ticket.attendeePhone}</p>` : ''}
                <p><strong>Status:</strong> Confirmed</p>
              </div>
              
              <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #856404; margin-top: 0;">Important Information</h3>
                <ul style="color: #856404;">
                  <li>Please bring this confirmation email to the event</li>
                  <li>Your unique ticket ID will be used for check-in</li>
                  <li>If you have any questions, please contact the event organizer</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="font-size: 14px; color: #666;">
                  This is an automated email. Please do not reply to this message.
                </p>
              </div>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p>&copy; ${new Date().getFullYear()} XSCard. All Rights Reserved.</p>
            </div>
          </div>
        `;

        const mailOptions = {
          from: `"XSCard Events" <${process.env.EMAIL_USER}>`,
          to: attendeeEmail,
          subject: `Event Registration Confirmation - ${eventData.title}`,
          html: emailContent
        };

        // Send email to this attendee
        const result = await sendMailWithStatus(mailOptions);
        
        if (result.success) {
          console.log(`✅ Registration email sent successfully to ${attendeeName} (${attendeeEmail})`);
          emailResults.push({ 
            attendee: attendeeName, 
            email: attendeeEmail,
            success: true 
          });
        } else {
          console.error(`❌ Failed to send email to ${attendeeName} (${attendeeEmail}):`, result.error);
          emailResults.push({ 
            attendee: attendeeName, 
            email: attendeeEmail,
            success: false, 
            error: result.error 
          });
        }

      } catch (attendeeError) {
        console.error(`Error sending email to ${ticket.attendeeName}:`, attendeeError);
        emailResults.push({ 
          attendee: ticket.attendeeName, 
          email: ticket.attendeeEmail,
          success: false, 
          error: attendeeError.message 
        });
      }
    }

    // Log summary
    const successCount = emailResults.filter(r => r.success).length;
    const failureCount = emailResults.filter(r => !r.success).length;
    
    console.log(`📧 Bulk registration email summary: ${successCount} sent, ${failureCount} failed out of ${tickets.length} total`);
    
    return { 
      success: successCount > 0, 
      results: emailResults,
      successCount,
      failureCount,
      totalCount: tickets.length
    };

  } catch (error) {
    console.error('Error in sendBulkRegistrationEmail:', error);
    return { 
      success: false, 
      error: error.message,
      results: []
    };
  }
};

module.exports = {
  transporter,
  sendMailWithStatus,
  verifyTransporter,
  sendBulkRegistrationEmail
};
