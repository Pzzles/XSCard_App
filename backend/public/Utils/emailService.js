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

// Bulk registration email function
const sendBulkRegistrationEmail = async (userId, bulkRegistrationId, eventData, tickets) => {
  try {
    // Get user details
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.error('User not found for bulk registration email:', userId);
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const userEmail = userData.email;

    if (!userEmail) {
      console.error('User email not found for bulk registration email:', userId);
      return { success: false, error: 'User email not found' };
    }

    // Create email content
    const ticketList = tickets.map((ticket, index) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${index + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${ticket.attendeeName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${ticket.attendeeEmail}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${ticket.id}</td>
      </tr>
    `).join('');

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">Bulk Registration Confirmation</h1>
        </div>
        
        <div style="padding: 20px;">
          <h2 style="color: #333;">Event Details</h2>
          <p><strong>Event:</strong> ${eventData.title}</p>
          <p><strong>Date:</strong> ${new Date(eventData.date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${eventData.time}</p>
          <p><strong>Location:</strong> ${eventData.location}</p>
          <p><strong>Total Tickets:</strong> ${tickets.length}</p>
          
          <h2 style="color: #333; margin-top: 30px;">Attendee Details</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">#</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Name</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Email</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Ticket ID</th>
              </tr>
            </thead>
            <tbody>
              ${ticketList}
            </tbody>
          </table>
          
          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <p style="margin: 0; color: #2d5a2d;"><strong>Important:</strong> Each attendee will receive their individual ticket via email. Please ensure all attendees check their email for their personal QR code.</p>
          </div>
          
          <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              If you have any questions about your bulk registration, please contact the event organizer or our support team.
            </p>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      to: userEmail,
      subject: `Bulk Registration Confirmation - ${eventData.title}`,
      html: emailContent
    };

    const result = await sendMailWithStatus(mailOptions);
    
    if (result.success) {
      console.log(`Bulk registration email sent successfully to ${userEmail}`);
    } else {
      console.error('Failed to send bulk registration email:', result.error);
    }

    return result;

  } catch (error) {
    console.error('Error sending bulk registration email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  transporter,
  sendMailWithStatus,
  verifyTransporter,
  sendBulkRegistrationEmail
};
