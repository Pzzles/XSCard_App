// Development and production URLs
const config = {
    development: {
        PASSCREATOR_PUBLIC_URL: 'https://xscard-app.onrender.com',

    },
    production: {
        PASSCREATOR_PUBLIC_URL: 'https://xscard-app.onrender.com',
    }
};

const env = process.env.NODE_ENV || 'development';
module.exports = config[env];
