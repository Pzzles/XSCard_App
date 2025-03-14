require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST_XSPARK,
  port: parseInt(process.env.EMAIL_SMTP_PORT_XSPARK),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER_XSPARK,
    pass: process.env.EMAIL_PASSWORD_XSPARK
  },
  tls: {
    rejectUnauthorized: false, // Accept self-signed certificates
    ciphers: 'SSLv3'
  },
  debug: true, // Enable debug logging
  // Add retry configuration
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 5
});

// Enhanced connection test with detailed logging
transporter.verify((error, success) => {
  if (error) {
    console.error('Email server verification error:', {
      message: error.message,
      code: error.code,
      command: error.command,
      host: process.env.EMAIL_HOST_XSPARK,
      port: process.env.EMAIL_SMTP_PORT_XSPARK
    });
  } else {
    console.log('Email server connection verified successfully');
  }
});

// Enhance the transporter.sendMail with status tracking and better error handling
const sendMailWithStatus = async (mailOptions) => {
  try {
    // Make sure from address is properly set
    if (!mailOptions.from || typeof mailOptions.from === 'string') {
      mailOptions.from = {
        name: mailOptions.from?.name || process.env.EMAIL_FROM_NAME || 'XS Card',
        address: mailOptions.from?.address || process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER_XSPARK
      };
    }
    
    console.log('Sending email to:', mailOptions.to);
    console.log('Email subject:', mailOptions.subject);
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent to:', mailOptions.to);
    console.log('Message ID:', info.messageId);

    return {
      success: true,
      accepted: info.accepted,
      rejected: info.rejected,
      messageId: info.messageId
    };

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

module.exports = {
  transporter,
  sendMailWithStatus
};
