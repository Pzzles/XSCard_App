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
  debug: true // Enable debug logging
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

// Enhance the transporter.sendMail with status tracking
const sendMailWithStatus = async (mailOptions) => {
  try {
    mailOptions.from = {
      name: process.env.EMAIL_FROM_NAME,
      address: process.env.EMAIL_FROM_ADDRESS
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent to:', mailOptions.to);

    return {
      success: true,
      accepted: info.accepted,
      rejected: info.rejected
    };

  } catch (error) {
    console.error('Email send failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  transporter,
  sendMailWithStatus
};
