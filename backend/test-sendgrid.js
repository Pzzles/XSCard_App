/**
 * SendGrid API Key Test Script
 * Run this to test your SendGrid API key before adding it to production
 * 
 * Usage: 
 * 1. Set your API key: SENDGRID_API_KEY=your-key-here node test-sendgrid.js
 * 2. Or add it to .env file and run: node test-sendgrid.js
 */

require('dotenv').config();
const sgMail = require('@sendgrid/mail');

async function testSendGrid() {
  console.log('🧪 Testing SendGrid Configuration...\n');
  
  // Check if API key is provided
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey || apiKey === 'YOUR_SENDGRID_API_KEY') {
    console.log('❌ No SendGrid API key found!');
    console.log('Please set SENDGRID_API_KEY environment variable\n');
    console.log('Options:');
    console.log('1. Add to .env file: SENDGRID_API_KEY=your-actual-key');
    console.log('2. Run with: SENDGRID_API_KEY=your-key node test-sendgrid.js');
    return;
  }
  
  console.log('✅ API Key found:', apiKey.substring(0, 15) + '...');
  
  try {
    // Set the API key
    sgMail.setApiKey(apiKey);
    console.log('✅ SendGrid client initialized\n');
    
    // Test email configuration
    const testEmail = {
      to: 'tshehlap@gmail.com' || 'xscard@xspark.co.za', // Send to yourself
      from: {
        email: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || 'xscard@xspark.co.za',
        name: process.env.EMAIL_FROM_NAME || 'XSCard Test'
      },
      subject: 'SendGrid Test Email - ' + new Date().toISOString(),
      text: 'This is a test email sent via SendGrid API to verify the configuration is working.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF4B6E;">SendGrid Test Email</h2>
          <p>✅ <strong>Success!</strong> Your SendGrid API key is working correctly.</p>
          <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
          <p><strong>From:</strong> XSCard Email Service</p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            This is a test email. You can now use SendGrid for your production email delivery.
          </p>
        </div>
      `
    };
    
    console.log('📧 Sending test email...');
    console.log('To:', testEmail.to);
    console.log('From:', testEmail.from.email);
    console.log('Subject:', testEmail.subject);
    
    // Send the test email
    const result = await sgMail.send(testEmail);
    
    console.log('\n✅ Test email sent successfully!');
    console.log('Response status:', result[0].statusCode);
    console.log('Message ID:', result[0].headers['x-message-id']);
    
    console.log('\n🎉 SendGrid is ready for production!');
    console.log('\n📋 Next steps:');
    console.log('1. Add SENDGRID_API_KEY to your Render.com environment variables');
    console.log('2. Set EMAIL_SERVICE=sendgrid in Render.com (optional - it will fallback automatically)');
    console.log('3. Deploy your updated code');
    
  } catch (error) {
    console.log('\n❌ SendGrid test failed!');
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.body || 'No response body'
    });
    
    // Log the full error response for debugging
    if (error.response?.body?.errors) {
      console.log('\nDetailed errors:');
      error.response.body.errors.forEach((err, index) => {
        console.log(`${index + 1}. ${err.message || err.field || JSON.stringify(err)}`);
      });
    }
    
    // Common error solutions
    console.log('\n🔧 Common solutions:');
    if (error.code === 401) {
      console.log('- Check your API key is correct');
      console.log('- Ensure API key has "Mail Send" permissions');
    }
    if (error.code === 403) {
      console.log('- Verify your SendGrid account is activated');
      console.log('- Check if domain verification is required');
    }
    if (error.message.includes('from')) {
      console.log('- Verify the "from" email address is authorized in SendGrid');
      console.log('- Add your domain to SendGrid or use a verified sender');
    }
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error.message);
  process.exit(1);
});

// Run the test
testSendGrid().catch(console.error);