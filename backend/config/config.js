// Development and production URLs
const config = {
    development: {
        PASSCREATOR_PUBLIC_URL: 'https://5e1e-197-184-170-54.ngrok-free.app',
    },
    production: {
        PASSCREATOR_PUBLIC_URL: 'https://your-production-url.com',
    }
};

const env = process.env.NODE_ENV || 'development';
module.exports = config[env];
