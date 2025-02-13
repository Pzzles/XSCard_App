require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST_XSPARK,
  port: parseInt(process.env.EMAIL_SMTP_PORT_XSPARK),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER_XSPARK,
    pass: process.env.EMAIL_PASSWORD_XSPARK
  }
});

// Simple connection test
transporter.verify((error, success) => {
  if (error) {
    console.error('Email server error:', error.message);
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
