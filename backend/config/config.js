// Development and production URLs
const config = {
    development: {
        PASSCREATOR_PUBLIC_URL: 'https://xscard-app.onrender.com',

       // PASSCREATOR_PUBLIC_URL: 'http://192.168.0.101:8383',
    },
    production: {
        PASSCREATOR_PUBLIC_URL: 'https://your-production-url.com',
    }
};

const env = process.env.NODE_ENV || 'development';
module.exports = config[env];
