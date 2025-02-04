// Development and production URLs
const config = {
    development: {
        PASSCREATOR_PUBLIC_URL: 'https://2969-197-185-221-152.ngrok-free.app',
    },
    production: {
        PASSCREATOR_PUBLIC_URL: 'https://your-production-url.com',
    }
};

const env = process.env.NODE_ENV || 'development';
module.exports = config[env];
