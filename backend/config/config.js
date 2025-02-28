// Development and production URLs
const config = {
    development: {
       // SUCCESS_REDIRECT_URL: 'http://localhost:8383/payment/success',
        PASSCREATOR_PUBLIC_URL: 'https://xscard-app.onrender.com',

    },
    production: {
        PASSCREATOR_PUBLIC_URL: 'https://xscard-app.onrender.com',
    }
};

const env = process.env.NODE_ENV || 'development';
module.exports = config[env];
